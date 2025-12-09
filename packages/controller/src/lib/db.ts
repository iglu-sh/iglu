import {Client, type QueryResult} from "pg";
import Logger from "@iglu-sh/logger";
import {createClient} from "redis";
import { env } from "@/env";
import type {
    apiKeyWithCache,
    cache, git_configs,
    keys, log,
    signing_key_cache_api_link,
    User,
    uuid,
    xTheEverythingType,
    pkgsInfo, cache_key
} from "@/types/db";
import bcrypt from "bcryptjs";
import type {cacheCreationObject} from "@/types/frontend";
import * as process from "node:process";
import type {NodeChannelMessage} from "@iglu-sh/types/controller";
import type {
    combinedBuilder,
    builder,
    buildoptions,
    cachixconfigs,
    public_signing_keys,
    builder_runs,
    dbQueueEntry, combinedSetupBuilder
} from "@iglu-sh/types/core/db";
import {sleepSync} from "bun";
import type {nodeRegistrationRequest} from "@iglu-sh/types/scheduler";
import Redis from "@/lib/redis";
interface redisCombinedBuilder extends combinedBuilder{
    cache: cache
}
export default class Database{
    private client: Client
    private timeout: NodeJS.Timeout = setTimeout(()=>{void this.wrap(this)}, 2000)

    constructor() {
        this.client = new Client({
            user: env.POSTGRES_USER,
            host: env.POSTGRES_HOST,
            database: env.POSTGRES_DB,
            password: env.POSTGRES_PASSWORD,
            port: parseInt(env.POSTGRES_PORT, 10),
        })
    }
    private async wrap(cl: Database){
        await cl.disconnect()
    }
    public async connect():Promise<void>{
        Logger.debug("Connecting to DB...");
        await this.client.connect()
        Logger.debug("Connected to DB");
    }
    private hashPW(password:string):Promise<string>{
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, 10, (err, hash) => {
                if (err || !hash) {
                    reject(err ?? new Error("Hashing failed"));
                } else {
                    resolve(hash);
                }
            });
        });
    }
    private verifyPassword(password:string, hash:string):Promise<boolean>{
        return new Promise((resolve, reject) => {
            bcrypt.compare(password, hash, (err, res) => {
                if (err || res === undefined) {
                    reject(err ?? new Error("Password verification failed"));
                } else {
                    resolve(res);
                }
            });
        });
    }
    public async setupDB():Promise<void>{
        // Sets up all the necessary tables for the application
        Logger.debug('Setting up database tables');

        // Check if cache schema exists
        let cacheExists = false;

        while (!cacheExists){
          const res = await this.query(`
            SELECT EXISTS (
               SELECT FROM information_schema.tables 
               WHERE  table_schema = 'cache'
               AND    table_name   = 'caches'
            );
          `)
          cacheExists = res.rows[0].exists
          Logger.warn("Cache does not exist! Please deploy a Cache! Waiting for Cache to be initialized...")
          if(!cacheExists){
            this.timeout.close()
            sleepSync(5000)
          }
        }
        this.timeout = setTimeout(()=>{void this.wrap(this)}, 2000)

        // Sets up the required frontend tables
        await this.query(`
            START TRANSACTION;
            CREATE TABLE IF NOT EXISTS cache.users (
                id uuid NOT NULL UNIQUE PRIMARY KEY DEFAULT gen_random_uuid(),
                username TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at timestamp NOT NULL DEFAULT now(),
                updated_at timestamp NOT NULL DEFAULT now(),
                last_login timestamp,
                is_admin BOOLEAN NOT NULL DEFAULT false,
                is_verified BOOLEAN NOT NULL DEFAULT false,
                must_change_password BOOLEAN NOT NULL DEFAULT false,
                -- determines if the oob experience should be shown to the user (i.e the setup screen)
                show_oob BOOLEAN NOT NULL DEFAULT false,
                avatar_color TEXT NOT NULL DEFAULT '#' || substring(md5(random()::text) FROM 3 FOR 6)
            );
            CREATE TABLE IF NOT EXISTS cache.builder (
                id serial NOT NULL UNIQUE primary key,
                cache_id INTEGER NOT NULL CONSTRAINT builder_cache_fk REFERENCES cache.caches,
                name TEXT NOT NULL,
                description TEXT,
                enabled bool NOT NULL,
                trigger TEXT,
                cron TEXT,
                arch TEXT NOT NULL DEFAULT 'x86_64',
                webhookURL TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS cache.git_configs (
                id serial NOT NULL UNIQUE primary key,
                builder_id INTEGER NOT NULL CONSTRAINT git_builder_fk REFERENCES cache.builder ON DELETE CASCADE,
                repository TEXT,
                branch TEXT,
                gitUsername TEXT,
                gitKey TEXT,
                requiresAuth BOOL NOT NULL,
                noClone BOOL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cache.buildOptions (
                id serial NOT NULL UNIQUE primary key,
                builder_id INTEGER NOT NULL CONSTRAINT options_build_fk REFERENCES cache.builder ON DELETE CASCADE,
                cores INTEGER,
                maxJobs INTEGER,
                keep_going BOOL,
                extraArgs TEXT,
                substituters JSONB[] NOT NULL,
                parallelBuilds BOOL NOT NULL,
                command TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cache.cachixConfigs (
                id serial NOT NULL UNIQUE primary key,
                builder_id INTEGER NOT NULL CONSTRAINT options_build_fk REFERENCES cache.builder ON DELETE CASCADE ,
                push BOOL NOT NULL,
                target INTEGER NOT NULL CONSTRAINT cachix_target_fk REFERENCES cache.caches,
                apiKey TEXT NOT NULL,
                apiKeyID INTEGER NOT NULL CONSTRAINT apiKey_fk REFERENCES cache.keys ON DELETE CASCADE,
                signingKey TEXT NOT NULL,
                signingKeyID INTEGER NOT NULL CONSTRAINT signingKey_fk REFERENCES cache.public_signing_keys ON DELETE CASCADE,
                buildOutputDir TEXT NOT NULL
            );
            create table if not exists cache.nodes
            (
                id text constraint node_pk primary key,
                node_name TEXT NOT NULL,
                node_address TEXT NOT NULL,
                node_port TEXT NOT NULL,
                node_version TEXT NOT NULL,
                node_arch TEXT NOT NULL,
                node_os TEXT NOT NULL,
                node_max_jobs INTEGER NOT NULL 
            );
            create table if not exists cache.builder_runs
            (
                id serial constraint builder_runs_pk primary key,
                builder_id int constraint builder_fk references cache.builder ON DELETE CASCADE,
                status text not null,
                started_at timestamp default now() not null,
                updated_at timestamp default now() not null,
                ended_at timestamp,
                gitCommit text not null,
                duration interval not null, -- in seconds
                log text,
                node_id TEXT NOT NULL constraint builder_run_node_fk REFERENCES cache.nodes DEFAULT 'none'
            );
            create table if not exists cache.cache_user_link
                (
                id serial constraint cache_user_link_pk primary key,
                cache_id int constraint cache_fk references cache.caches ON DELETE CASCADE,
                user_id uuid constraint user_fk references cache.users ON DELETE CASCADE
            );
            DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'level') THEN
                        CREATE TYPE cache.level AS ENUM (
                            'debug',
                            'info',
                            'warn',
                            'error',
                            'fatal'
                            );
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_type') THEN
                        CREATE TYPE cache.log_type AS ENUM (
                            'create',
                            'update',
                            'delete',
                            'read'
                        );
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_resource_type') THEN
                        CREATE TYPE cache.log_resource_type AS ENUM (
                            'cache',
                            'derivation',
                            'user',
                            'builder',
                            'signing_key',
                            'api_key'
                            );
                    END IF;
            END $$;

            CREATE TABLE IF NOT EXISTS cache.logs (
                id uuid NOT NULL DEFAULT gen_random_uuid(),
                timestamp timestamptz NOT NULL DEFAULT now(),
                cache_id bigint NOT NULL REFERENCES cache.caches(id) ON DELETE CASCADE,
                type cache.log_type NOT NULL,
                resource_type cache.log_resource_type NOT NULL,
                resource_id text NOT NULL,
                level cache.level NOT NULL,
                body jsonb NOT NULL,
                resource_name TEXT DEFAULT NULL,
                updated_by uuid NULL REFERENCES cache.users(id) ON DELETE SET NULL
            );
            
            CREATE OR REPLACE FUNCTION update_modified_at_column()
            RETURNS TRIGGER AS
                $body$
                    begin
                        new.updated_at = now();
                        return new;
                    end;
                $body$
            LANGUAGE plpgsql;

            CREATE OR REPLACE TRIGGER update_run_modified_at
            AFTER UPDATE ON cache.builder_runs
            FOR EACH ROW EXECUTE PROCEDURE update_modified_at_column();
            
            COMMIT TRANSACTION;
        `)

        // Modifies the existing cache tables to include a userID
        // User ID may be null if the cache is not owned by a user (yet)
        await this.query(`
            ALTER TABLE cache.keys ADD COLUMN IF NOT EXISTS user_id uuid NULL CONSTRAINT keys_user_fk REFERENCES cache.users(id) ON DELETE CASCADE;
        `)

        // We need to check if the dummy node is inserted, if not we need to insert it
        await this.query(`SELECT * FROM cache.nodes WHERE id = 'none'`).then(async (res)=>{
            if(res.rows.length === 0){
                await this.query(`INSERT INTO cache.nodes (id, node_name, node_address, node_port, node_version, node_arch, node_os, node_max_jobs) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, ['none', 'Not claimed yet', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown', '0'])
            }
        })

        // Check if the user table is empty, if so we create a default admin user with the password "admin" and username "admin"
        const res = await this.query('SELECT COUNT(*) FROM cache.users');
        //eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if(res.rows?.[0]?.count == 0){
        Logger.debug('No users found, creating default admin user');
          // Create a default admin user
          await this.createUser(
              "admin", // username
              "admin@admin.com", // default email
              "admin", // default password
              true, // is_admin
              true, // is_verified
              true, // must_change_password
              true // show_setup
          )
        }

        // Set up the Audit Logging
        // FIXME: This throws an error: tuple concurrently updated
        //await this.createAuditLog()
        Logger.debug('Database tables set up successfully');

        // if the DISABLE_BUILDER environment variable is set to false, we can create a cron update to check the health of the nodes
        if(!env.DISABLE_BUILDERS || env.DISABLE_BUILDERS === 'false'){
            Logger.debug('Creating cron update for builder health check');

            await this.query(`
                SELECT * FROM cron.job WHERE jobname = 'healthcheck';
            `).then(async (res)=>{
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const result:{jobid:string}[] = res.rows
                for(const row of result){
                    Logger.debug(`Unscheduling cron job with id ${row.jobid}`);
                    await this.query(`
                        SELECT cron.unschedule(${row.jobid});
                    `)
                        .catch((e)=>{
                            Logger.error(`Could not unschedule cron job with id ${row.jobid} ${e}`);
                        })
                }
            })
            // We run a cron update every 5 seconds
            await this.query(`
                SELECT cron.schedule('healthcheck','* * * * *', $$
                    SELECT * FROM http((
                       'GET',
                       '${env.NEXT_PUBLIC_URL}/api/v1/node/healthcheck',
                       ARRAY[http_header('Authorization', '${env.NODE_PSK}')],
                       NULL,
                       NULL
                    )::http_request); 
                $$);
                SELECT cron.schedule('redisTasks','* * * * *', $$
                    SELECT * FROM http((
                       'GET',
                       '${env.NEXT_PUBLIC_URL}/api/v1/tasks/redis',
                       ARRAY[http_header('Authorization', '${env.NODE_PSK}')],
                       NULL,
                       NULL
                    )::http_request); 
                $$);
            `)
        }
        // Deregister all nodes that may still be connected
        const editor = createClient({
            url: `redis://${env.REDIS_USER}:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}`
        })
        await editor.connect().catch((err:Error)=>{
            Logger.error(`Failed to connect to Redis editor: ${err.message}`);
            // TODO: Wait for Redis insted of return else the setup does not finish compleatly
            return;
        })

        // Clean all "lingering" nodes still connected
        const keys = await editor.keys('node:*:info').catch((err:Error)=>{
            Logger.error(`Failed to get keys from Redis: ${err.message}`);
            return [];
        });

        for(const key of keys){
            const id = key.split(':')[1];
            if(!id){
                continue;
            }
            Logger.info(`Deregistering node ${id} from Redis`);
            const deregisterMsg:NodeChannelMessage = {
                type: 'deregister',
                target: id,
                sender: 'controller',
                data: {}
            }
            await editor.publish('node', JSON.stringify(deregisterMsg)).catch((err:Error)=>{
                Logger.error(`Failed to publish deregister message for node ${id}: ${err.message}`);
            });

            // Remove the node from Redis
            await editor.del(key).catch((err:Error)=>{
                Logger.error(`Failed to delete key ${key} from Redis: ${err.message}`);
            });
            await editor.del(`node:${id}:current_builds`).catch((err:Error)=>{
                Logger.error(`Failed to delete current builds for node ${id} from Redis: ${err.message}`);
            })
            await editor.del(`node:${id}:queued_builds`).catch((err:Error)=>{
                Logger.error(`Failed to delete queued builds for node ${id} from Redis: ${err.message}`);
            })
        }

        // Clear all build configs from redis
        Logger.debug('Clearing all build configs from Redis');
        await editor.del('build_config_*').catch((err:Error)=>{
            Logger.error(`Failed to delete build configs from Redis: ${err.message}`);
        })

        // Query all build configs and add them to Redis
        Logger.debug('Adding all build configs to Redis');
        const buildConfigs:QueryResult<combinedSetupBuilder> = await this.query(`
            SELECT row_to_json(cb.*) as builder,
                   row_to_json(cc.*) as cachix_config,
                   row_to_json(gc.*) as git_config,
                   row_to_json(bo.*) as build_options,
                   c.uri as cache_uri
            FROM cache.builder cb
                     INNER JOIN cache.cachixconfigs cc ON cc.builder_id = cb.id
                     INNER JOIN cache.git_configs gc ON gc.builder_id = cb.id
                     INNER JOIN cache.buildoptions bo ON bo.builder_id = cb.id
                     INNER JOIN cache.caches c ON cb.cache_id = c.id
        `) as QueryResult<combinedSetupBuilder>

        for(const row of buildConfigs.rows){
            Logger.debug(`Adding build config for builder ${row.builder.id} to Redis`);
            const key = `build_config_${row.builder.id}`;
            row.cachix_config.target = row.cache_uri as unknown as number; // Not actually a number, but you know
            // Remove the cache_uri key
            delete row.cache_uri;
            await editor.json.set(key, '$', row).catch((err:Error)=>{
                Logger.error(`Failed to add build config for builder ${row.builder.id} to Redis: ${err.message}`);
            });
        }

        Logger.info(`Added ${buildConfigs.rows.length} build configs to Redis`);

        // Check if any builders are still marked as running, if so we will cancel them
        const runningBuilders:Array<builder_runs> = await this.query(`
            SELECT * FROM cache.builder_runs WHERE status != 'finished' AND status != 'failed' AND status != 'canceled';
        `)
            .then((res:QueryResult<builder_runs>)=>{
                return res.rows
            })
            .catch((err:Error)=>{
                Logger.error(`Failed to get running builders from DB: ${err.message}`);
                return [];
            })
        const redisLib = new Redis()
        try{
            await redisLib.refreshBuilders()
            for(const run of runningBuilders){
                Logger.info(`Marking builder run ${run.id} as canceled`);
                await redisLib.stopJob("canceled", run.id.toString())
            }
            Logger.info(`Cleared ${runningBuilders.length} builders that were in limbo`);
            await redisLib.quit()
        }
        catch(err){
            await redisLib.quit()
            Logger.error(`Failed to quit Redis lib: ${err}`);
        }
    }
    private async createAuditLog(){
        Logger.debug('Creating procedures for audit logging');
        await this.query(`
            START TRANSACTION;
            -- Cache Audit Logging
            CREATE OR REPLACE FUNCTION cache.cache_logging() RETURNS TRIGGER AS $$
                DECLARE cache_id bigint;
                DECLARE type cache.log_type;
                DECLARE resource_type cache.log_resource_type;
                DECLARE resource_id text;
                DECLARE level cache.level;
                DECLARE body jsonb;
                DECLARE resource_name TEXT;
                BEGIN
                     RAISE NOTICE 'cache.cache_logging() called with tg_op: %', TG_OP;
                     IF tg_op = 'DELETE' THEN
                            cache_id := OLD.id;
                            type := 'delete';
                            resource_type := 'cache';
                            resource_id := OLD.id::text;
                            level := 'info';
                            body := json_build_object('type', 'cache', 'action', 'delete', 'old', row_to_json(OLD), 'new', NULL);
                            resource_name := OLD.name;
                     ELSIF tg_op = 'UPDATE' THEN
                         cache_id := OLD.id;
                            type := 'update';
                            resource_type := 'cache';
                            resource_id := OLD.id::text;
                            level := 'info';
                            body := json_build_object('type', 'cache', 'action', 'update', 'old', row_to_json(OLD), 'new', row_to_json(NEW));
                            resource_name := OLD.name;
                     ELSEIF tg_op = 'INSERT' THEN
                         cache_id := NEW.id;
                            type := 'create';
                            resource_type := 'cache';
                            resource_id := NEW.id::text;
                            level := 'info';
                            body := json_build_object('type', 'cache', 'action', 'create', 'old', NULL, 'new', row_to_json(NEW));
                            resource_name := NEW.name;
                     END IF;
                     INSERT INTO cache.logs(cache_id, type, resource_type, resource_id, level, body, resource_name, updated_by)
                     VALUES(
                            cache_id,
                            type,
                            resource_type,
                            resource_id,
                            level,
                            body,
                            resource_name,
                            current_setting('cache.current_user', true)::uuid
                     );
                     RETURN NULL;
                end;
                $$ LANGUAGE plpgsql;
            CREATE OR REPLACE TRIGGER cache_logging_trigger
                AFTER INSERT OR UPDATE OR DELETE ON cache.caches
                FOR EACH ROW EXECUTE FUNCTION cache.cache_logging();
                
            -- Cache Key Audit Logging
            CREATE OR REPLACE FUNCTION cache.key_change() RETURNS TRIGGER AS $$
                DECLARE cache_id bigint;
                DECLARE type cache.log_type;
                DECLARE resource_type cache.log_resource_type;
                DECLARE resource_id text;
                DECLARE level cache.level;
                DECLARE body jsonb;
                DECLARE resource_name TEXT;
                BEGIN
                     IF tg_op = 'DELETE' THEN
                            cache_id := OLD.cache_id;
                            type := 'delete';
                            resource_type := 'api_key';
                            resource_id := OLD.key_id::text;
                            level := 'info';
                            body := json_build_object('type', 'api_key', 'action', 'delete', 'old', row_to_json(OLD), 'new', NULL);
                     ELSIF tg_op = 'UPDATE' THEN
                         cache_id := OLD.cache_id;
                            type := 'update';
                            resource_type := 'api_key';
                            resource_id := OLD.key_id::text;
                            level := 'info';
                            body := json_build_object('type', 'api_key', 'action', 'update', 'old', row_to_json(OLD), 'new', row_to_json(NEW));
                     ELSEIF tg_op = 'INSERT' THEN
                         cache_id := NEW.cache_id;
                            type := 'create';
                            resource_type := 'api_key';
                            resource_id := NEW.key_id::text;
                            level := 'info';
                         RAISE NOTICE 'test';
                            body := json_build_object('type', 'api_key', 'action', 'create', 'old', NULL, 'new', row_to_json(NEW));
                     END IF;
                     resource_name := (SELECT name FROM cache.keys WHERE id = resource_id::bigint LIMIT 1)::TEXT;
                     INSERT INTO cache.logs(cache_id, type, resource_type, resource_id, level, body, resource_name, updated_by)
                     VALUES(
                            cache_id::BIGINT,
                            type,
                            resource_type,
                            resource_id::TEXT,
                            level,
                            body,
                            resource_name,
                            current_setting('cache.current_user', true)::uuid
                     );
                     RETURN NULL;
                end;
                $$ LANGUAGE plpgsql;
            CREATE OR REPLACE TRIGGER cache_key_change_logging_trigger
                AFTER INSERT OR UPDATE OR DELETE ON cache.cache_key
                FOR EACH ROW EXECUTE FUNCTION cache.key_change();
                
                
            -- Public Signing Key Audit Logging
            
            CREATE OR REPLACE FUNCTION cache.public_signing_key_change() RETURNS TRIGGER AS $$
                DECLARE cache_id bigint;
                DECLARE type cache.log_type;
                DECLARE resource_type cache.log_resource_type;
                DECLARE resource_id text;
                DECLARE level cache.level;
                DECLARE body jsonb;
                DECLARE resource_name TEXT;
                BEGIN
                     IF tg_op = 'DELETE' THEN
                            cache_id := OLD.cache_id;
                            type := 'delete';
                            resource_type := 'signing_key';
                            resource_id := OLD.signing_key_id::text;
                            level := 'info';
                            body := json_build_object('type', 'signing_key', 'action', 'delete', 'old', row_to_json(OLD), 'new', NULL);
                     ELSIF tg_op = 'UPDATE' THEN
                         cache_id := OLD.cache_id;
                            type := 'update';
                            resource_type := 'signing_key';
                            resource_id := OLD.signing_key_id::text;
                            level := 'info';
                            body := json_build_object('type', 'signing_key', 'action', 'update', 'old', row_to_json(OLD), 'new', row_to_json(NEW));
                     ELSEIF tg_op = 'INSERT' THEN
                         cache_id := NEW.cache_id;
                            type := 'create';
                            resource_type := 'signing_key';
                            resource_id := NEW.signing_key_id::text;
                            level := 'info';
                            body := json_build_object('type', 'public_key', 'action', 'create', 'old', NULL, 'new', row_to_json(NEW));
                     END IF;
                     resource_name := (SELECT name FROM cache.public_signing_keys WHERE id = resource_id::bigint LIMIT 1)::TEXT;
                     INSERT INTO cache.logs(cache_id, type, resource_type, resource_id, level, body, resource_name, updated_by)
                     VALUES(
                            cache_id::BIGINT,
                            type,
                            resource_type,
                            resource_id::TEXT,
                            level,
                            body,
                            resource_name,
                            current_setting('cache.current_user', true)::uuid
                     );
                     RETURN NULL;
                end;
                $$ LANGUAGE plpgsql;
            CREATE OR REPLACE TRIGGER cache_public_signing_key_change_logging_trigger
                AFTER INSERT OR UPDATE OR DELETE ON cache.signing_key_cache_api_link
                FOR EACH ROW EXECUTE FUNCTION cache.public_signing_key_change();
                
            -- User Assignment Change Logging    
            CREATE OR REPLACE FUNCTION cache.user_assignment_change() RETURNS TRIGGER AS $$
                DECLARE cache_id bigint;
                DECLARE type cache.log_type;
                DECLARE resource_type cache.log_resource_type;
                DECLARE resource_id text;
                DECLARE level cache.level;
                DECLARE body jsonb;
                DECLARE resource_name TEXT;
                BEGIN
                     IF tg_op = 'DELETE' THEN
                            cache_id := OLD.cache_id;
                            type := 'delete';
                            resource_type := 'user';
                            resource_id := OLD.user_id::text;
                            level := 'info';
                            body := json_build_object('type', 'user', 'action', 'delete', 'old', row_to_json(OLD), 'new', NULL);
                     ELSIF tg_op = 'UPDATE' THEN
                         cache_id := OLD.cache_id;
                            type := 'update';
                            resource_type := 'user';
                            resource_id := OLD.user_id::text;
                            level := 'info';
                            body := json_build_object('type', 'user', 'action', 'update', 'old', row_to_json(OLD), 'new', row_to_json(NEW));
                     ELSEIF tg_op = 'INSERT' THEN
                         cache_id := NEW.cache_id;
                            type := 'create';
                            resource_type := 'user';
                            resource_id := NEW.user_id::text;
                            level := 'info';
                            body := json_build_object('type', 'user', 'action', 'create', 'old', NULL, 'new', row_to_json(NEW));
                     END IF;
                     resource_name := (SELECT username FROM cache.users WHERE id = resource_id::uuid LIMIT 1)::TEXT;
                     INSERT INTO cache.logs(cache_id, type, resource_type, resource_id, level, body, resource_name, updated_by)
                     VALUES(
                            cache_id::BIGINT,
                            type,
                            resource_type,
                            resource_id::TEXT,
                            level,
                            body,
                            resource_name,
                            current_setting('cache.current_user', true)::uuid
                     );
                     RETURN NULL;
                end;
                $$ LANGUAGE plpgsql;
            CREATE OR REPLACE TRIGGER cache_user_assignment_change_trigger
                AFTER INSERT OR UPDATE OR DELETE ON cache.cache_user_link
                FOR EACH ROW EXECUTE FUNCTION cache.user_assignment_change();
            COMMIT TRANSACTION;
        `)
    }
    public async query(query:string, params:Array<unknown> = [], user?:uuid){
        Logger.debug(`Executing query: ${query} with params: ${params}`);
        if(user){
            await this.client.query(
                `SELECT set_config('cache.current_user', $1, false);`
                , [user])
        }

        return await this.client.query(query, params)
    }
    public async getPkgsForCache(cacheId:number):Promise<Array<pkgsInfo>>{
      return await this.query(`
        SELECT SUM(cfilesize) AS size, cstoresuffix, MAX(updatedat) AS timestamp FROM cache.hashes
        WHERE cache = $1
        GROUP BY cstoresuffix;
        `, [cacheId]).then((res:QueryResult<pkgsInfo>)=>{
          return res;
        })
    }
    public async getAuditLogForCache(cacheId:number):Promise<Array<log>>{
        return await this.query(`
            SELECT 
                logs.id as id,
                timestamp,
                cache_id,
                type,
                resource_id,
                resource_type,
                level,
                body,
                resource_name,
                row_to_json(users.*) as updated_by
                FROM cache.logs 
                         INNER JOIN cache.users ON logs.updated_by = users.id 
                WHERE cache_id = $1 ORDER BY timestamp DESC;
        `, [cacheId]).then((res:QueryResult<log>)=>{
            return res.rows;
        })
    }
    public async getUserWithKeysAndCaches(userId: string):Promise<Array<{user:User, caches:cache[], apikeys:keys[], signingkeys:Array<{public_signing_key:public_signing_keys[], signing_key_cache_api_link:signing_key_cache_api_link[]}>}>>{
        return this.query(`
            SELECT row_to_json(u.*) AS user,
                   (SELECT json_agg(c.*) FROM cache.caches c INNER JOIN cache.cache_user_link cul ON c.id = cul.id WHERE cul.user_id = u.id GROUP BY u.id) as caches,
                   (SELECT json_build_object('public_signing_key', json_agg(psk.*), 'signing_key_cache_api_link', json_agg(skcal.*)) FROM cache.public_signing_keys psk
                      INNER JOIN cache.signing_key_cache_api_link skcal ON psk.id = skcal.signing_key_id
                      INNER JOIN cache.keys ON skcal.key_id = keys.id
                    WHERE keys.user_id = u.id
                   ) as signing_keys,
                   (SELECT json_agg(k.*) FROM cache.keys k WHERE k.user_id = u.id GROUP BY u.id) as apikeys
            FROM cache.users u
            WHERE u.id = $1;
        `, [userId]).then((res)=>{
            return res.rows as Array<{user:User, caches:cache[], apikeys:keys[], signingkeys:Array<{public_signing_key:public_signing_keys[], signing_key_cache_api_link:signing_key_cache_api_link[]}>}>;
        })
    }
    public async getUserByNameOrEmail(username:string, email:string):Promise<User | null>{
        return await this.query(`
            SELECT * FROM cache.users WHERE username = $1 OR email = $2
        `, [username, email])
            .then((res)=>{
                if(res.rows.length === 0){
                    return null;
                }
                return res.rows[0] as User;
            })
            .catch((err)=>{
                Logger.error(`Failed to get user by name ${username} ${err}`);
                return null;
            })
    }
    public async createUser(username:string, email:string, password:string, is_admin:boolean, is_verified:boolean, must_change_password:boolean, show_setup = false):Promise<User>{
        const hashedPW = await this.hashPW(password)
        return await this.query(`
            INSERT INTO cache.users (username, email, password, created_at, updated_at, last_login, is_admin, is_verified, must_change_password, show_oob)
                VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)    
            RETURNING *
        `, [
            username,
            email,
            hashedPW,
            new Date(),
            new Date(),
            null,
            is_admin,
            is_verified,
            must_change_password,
            show_setup
        ]).then((res)=>{
            if(res.rows.length === 0){
                throw new Error("Failed to create user");
            }
            return res.rows[0] as User;
        })
    }
    public async resetPassword(userID: string, password:string){
        Logger.debug(`Resetting password for user ${userID}`);
        const hashedPW = await this.hashPW(password);
        return await this.query(`
            UPDATE cache.users SET password = $1, updated_at = $2, must_change_password = false WHERE id = $3
        `, [hashedPW, new Date(), userID])
            .then((res)=>{
                if(res.rowCount === 0){
                    throw new Error("Failed to reset password");
                }
                Logger.debug(`Password for user ${userID} reset successfully`);
                return true;
            })
            .catch((err)=>{
                Logger.error(`Failed to reset password for user ${userID} ${err}`);
                throw err;
            })
    }
    public async authenticateUser(username:string, password:string):Promise<User | null>{
        Logger.info(`Authenticating user ${username}`);
        const user = await this.query(`
            SELECT * FROM cache.users WHERE username = $1 
        `, [username]).then((res)=>{
            return res.rows[0] as User;
        }).catch((err)=>{
            Logger.error(`Failed to authenticate user ${err}`);
            return null;
        })
        if(!user){
            Logger.error(`User ${username} not found`);
            return null;
        }
        Logger.info(`User ${username} found, verifying password`);
        const isValid = await this.verifyPassword(password, user.password);
        if(!isValid){
            Logger.error(`Invalid password for user ${username}`);
            return null;
        }
        Logger.info(`User ${username} authenticated successfully`);

        // Update last login time
        await this.query(`
            UPDATE cache.users SET last_login = $1 WHERE id = $2
        `, [new Date(), user.id]);
        return user;
    }
    public async disconnect():Promise<void>{
        Logger.debug("Disconnecting from DB...");
        await this.client.end().catch(err => {
            Logger.error(`Failed to disconnect from DB ${err}`);
        });
        this.timeout.close()
        Logger.debug("Disconnected from DB");
    }
    public async getUserById(userId:string):Promise<User | null>{
        Logger.debug(`Getting user ${userId}`);
        return await this.query(`
            SELECT * FROM cache.users WHERE id = $1;
        `, [userId])
            .then((res)=>{
                if(res.rows.length === 0){
                    return null;
                }
                return res.rows[0] as User;
            })
            .catch((err)=>{
                Logger.error(`Failed to get user ${userId} ${err}`);
                return null;
            })
    }
    // Mainly used for the OOB experience, and it should not be used outside of that
    // It does require a lot of ng power, so it should only be used when necessary
    public async getEverything():Promise<Array<xTheEverythingType>>{
        return await this.query(`
            SELECT row_to_json(ca.*) as cache,
                   (
                       SELECT json_agg(
                                      json_build_object(
                                              'builder', row_to_json(b.*),
                                              'options', row_to_json(bo.*),
                                              'cachix_config', row_to_json(cc.*),
                                              'git_config', row_to_json(gc.*),
                                              'runs', (
                                                  SELECT json_agg(br.*) FROM cache.builder_runs as br WHERE builder_id = b.id
                                              )
                                      )
                              )
                       FROM cache.builder as b
                                INNER JOIN cache.buildoptions as bo ON b.id = bo.builder_id
                                INNER JOIN cache.cachixconfigs as cc ON b.id = cc.builder_id
                                INNER JOIN cache.git_configs as gc ON b.id = gc.builder_id
                       GROUP BY b.cache_id
                   ) as builders,
                   (
                       SELECT json_agg(
                                      json_build_object(
                                              'key', row_to_json(psk.*),
                                              'link_record', row_to_json(skcal.*)
                                      )
                              )
                       FROM cache.public_signing_keys psk
                                INNER JOIN cache.signing_key_cache_api_link skcal ON skcal.key_id = psk.id
                       WHERE skcal.cache_id = ca.id
                       GROUP BY skcal.cache_id
                   ) as public_signing_keys,
                   (
                       SELECT json_agg(row_to_json(k.*)) FROM cache.keys k
                                                                   INNER JOIN cache.cache_key ck ON k.id = ck.key_id
                       WHERE ck.cache_id = ca.id
                       GROUP BY ck.cache_id
                   ) as api_keys,
                   (
                       SELECT json_build_object('count', count(ca.*), 'size',sum(ha.cfilesize)) FROM cache.hashes ha WHERE ha.cache = ca.id
                   ) as derivations
                   
            FROM cache.caches as ca
            GROUP BY ca.id
        `).then((res)=>{
            return res.rows as xTheEverythingType[];
        }).catch((err)=>{
            Logger.error(`Failed to get everything for admin from DB ${err}`);
            throw err;
        })
    }
    public async addUserToCache(cacheId:number, userId:string):Promise<boolean>{
        return await this.query(`
            INSERT INTO cache.cache_user_link (cache_id, user_id)
            VALUES ($1, $2)
        `, [cacheId, userId])
            .then(()=>{
                return true
            })
            .catch((err)=>{
                Logger.error(`Failed to add user ${userId} to cache ${cacheId} ${err}`);
                return false
            });
    }
    public async removeOOBFlag(userId:string):Promise<boolean>{
        return await this.query(`
            UPDATE cache.users SET show_oob = false WHERE id = $1
        `, [userId])
            .then((res)=>{
                if(res.rowCount === 0){
                    return false;
                }
                return true;
            })
            .catch((err)=>{
                Logger.error(`Failed to remove OOB flag for user ${userId} ${err}`);
                return false;
            });
    }
    public async getCachesByUserId(userId:string):Promise<Array<cache>>{
            Logger.debug(`Getting caches for user ${userId}`);
            return await this.query(`
                SELECT DISTINCT ca.* FROM cache.caches as ca
                    INNER JOIN cache.cache_user_link as cul ON ca.id = cul.cache_id
                WHERE cul.user_id = $1
                `, [userId])
                .then((res:QueryResult<cache>)=>{
                    return res.rows as Array<cache>;
                })
                .catch((err)=>{
                        Logger.error(`Failed to get caches for user ${userId} ${err}`);
                        return {rows: []}
                }) as Array<cache>;

    }
    public async getCacheById(cacheId:number):Promise<cache | null>{
        return await this.query(`SELECT * FROM cache.caches WHERE id = $1`, [cacheId]).then((res)=>{
            return res.rows.length > 0 ? res.rows[0] as cache : null;
        })
    }
    public async addUserToApiKey(apiKeyId:number, userId:string):Promise<boolean>{
        return await this.query(`
            UPDATE cache.keys SET user_id = $1 WHERE id = $2
        `, [userId, apiKeyId])
            .then(()=>{
                return true;
            })
            .catch((err)=>{
                Logger.error(`Failed to add user ${userId} to API key ${apiKeyId} ${err}`);
                return false;
            });
    }
    public async getApiKeysByUserId(userId:string):Promise<Array<apiKeyWithCache>>{
        return await this.query(`
            SELECT json_build_object('id',keys.id, 'name', keys.name, 'description', keys.description, 'created_at', keys.created_at, 'updated_at', keys.updated_at, 'user_id', keys.user_id) as key,
                   array_agg(row_to_json(ck.*)) as cacheKeyLinks, 
                   array_agg(row_to_json(ca.*)) as caches FROM cache.keys
              FULL JOIN cache.cache_key as ck ON keys.id = ck.key_id
              FULL JOIN cache.caches as ca ON ck.cache_id = ca.id
            WHERE keys.user_id = $1
            GROUP BY keys.id
        `, [userId]).then((res:QueryResult<apiKeyWithCache>)=>{
            return res.rows.map((row)=>{
                return {
                    key: row.key,
                    cachekeylinks: row.cachekeylinks.filter((link:cache_key)=>link !== null),
                    caches: row.caches.filter((cache:cache)=>cache !== null)
                } as apiKeyWithCache;
            })
        })
            .catch((err)=>{
                Logger.error(`Failed to get API keys for user ${userId} ${err}`);
                return [];
            })
    }
    public async getSigningKeysByApiKeyID(apiKeyId:number):Promise<Array<public_signing_keys>>{
        return await this.query(`
            SELECT DISTINCT psk.* FROM cache.signing_key_cache_api_link
                INNER JOIN cache.public_signing_keys psk ON signing_key_cache_api_link.signing_key_id = psk.id
            WHERE key_id = $1
        `, [apiKeyId]).then((res:QueryResult<public_signing_keys>)=>{
            return res.rows
        })
            .catch((err)=>{
                Logger.error(`Failed to get signing keys for API key ${apiKeyId} ${err}`);
                return [];
            })
    }
    public async getAllUsers():Promise<Array<User>>{
        return await this.query(`
            SELECT * FROM cache.users
        `).then((res)=>{
            return res.rows.map((row:User)=>{
                return {
                    ...row,
                    password: "", // Don't return the password hash
                }
            }) as User[];
        }).catch((err)=>{
            Logger.error(`Failed to get all users ${err}`);
            return [];
        })
    }
    public async linkApiKeyToCache(apiKeyId:number, cacheId:number):Promise<boolean>{
        await this.query(`
            INSERT INTO cache.cache_key (cache_id, key_id)
                VALUES ($1, $2)
        `, [cacheId, apiKeyId])
        // Get all the public signing keys for this API key and link them to the cache
        Logger.debug(`Linking API key ${apiKeyId} to cache ${cacheId}`);
        const signingKeys = await this.query(`
            SELECT DISTINCT signing_key_cache_api_link.signing_key_id FROM cache.signing_key_cache_api_link
        `)
            .then((res)=>{
                return res.rows as signing_key_cache_api_link[]
            })
        for(const link of signingKeys){
            await this.query(`
                INSERT INTO cache.signing_key_cache_api_link (cache_id, key_id, signing_key_id)
                    VALUES ($1, $2, $3)
            `, [cacheId, apiKeyId, link.signing_key_id])
        }
        return true
    }
    public async createCache(userID:string, cacheToCreate:cacheCreationObject):Promise<cache>{
        // Check if this cache name already exists
        await this.query(`SELECT * FROM cache.caches WHERE name = $1`, [cacheToCreate.name], userID as uuid).then((res)=>{
            if(res.rows.length > 0){
                throw new Error("Cache with this name already exists");
            }
        })

        Logger.debug(`Creating cache with name ${cacheToCreate.name} for user ${userID}`);
        // Create a new cache in the database
        await this.query(`START TRANSACTION;`)

        // Create the cache
        const cache = await this.query(`
            INSERT INTO cache.caches (githubusername, ispublic, name, permission, preferredcompressionmethod, uri)
            VALUES ('', $1, $2, $3, $4, $5)
            RETURNING *
        `, [cacheToCreate.ispublic, cacheToCreate.name, cacheToCreate.permission, cacheToCreate.preferredcompressionmethod, env.NEXT_PUBLIC_CACHE_URL!], userID as uuid)
            .then((res)=>{
                if(res.rows.length === 0){
                    throw new Error("Unknown error while creating cache");
                }
                return res.rows[0] as cache;
            })

        //Check if the creator is in the allowedUsers array, if not add them
        if(!cacheToCreate.allowedUsers || cacheToCreate.allowedUsers.length === 0){
            cacheToCreate.allowedUsers = []
            cacheToCreate.allowedUsers.push({
                id: userID,
                username: "", // Username will be filled later
                email: "", // Email will be filled later
                is_admin: false, // Default to false
                is_verified: false, // Default to false
                must_change_password: false, // Default to false
                show_oob: false, // Default to false
                avatar_color: "#000000" // Default to black
            } as User);
        }

        // Link the cache to every user that is in the allowedUsers array
        if(cacheToCreate.allowedUsers && cacheToCreate.allowedUsers.length > 0){
            for(const user of cacheToCreate.allowedUsers){
                await this.addUserToCache(cache.id, user.id);
            }
        }

        // Link every allowed api key (including the signing key) to the cache
        for(const apiKey of cacheToCreate.selectedApiKeys){
            await this.linkApiKeyToCache(apiKey.id, cache.id)
        }
        await this.query(`COMMIT TRANSACTION;`)
        return cache
    }
    public async getAuditLogByCacheId(cacheId:number):Promise<Array<log>>{
        Logger.debug(`Getting audit log by cacheId=${cacheId}`);
        return await this.query(`
            SELECT * FROM cache.logs WHERE cache_id = $1 ORDER BY timestamp DESC 
        `, [cacheId]).then((res:QueryResult<log>)=>{
            return res.rows;
        }).catch((err)=>{
            Logger.error(`Failed to get audit log for cache ${cacheId} ${err}`);
            return [];
        })
    }
    public async getBuilderForCache(cacheId:number):Promise<Array<builder>>{
        console.log("HELP ME GOD PLEASE")
        Logger.debug(`Getting builders for cacheId=${cacheId}`);
        return await this.query(`
            SELECT * FROM cache.builder WHERE cache_id = $1
        `, [cacheId]).then((res:QueryResult<builder>)=>{
            return res.rows;
        }).catch((err)=>{
            Logger.error(`Failed to get builders for cache ${cacheId} ${err}`);
            return [];
        })
    }
    public async getBuilderById(builderId:number):Promise<combinedBuilder | null>{
        return await this.query(`
            SELECT row_to_json(cb.*) as builder,
                   row_to_json(cc.*) as cachix_config,
                   row_to_json(gc.*) as git_config,
                   row_to_json(bo.*) as build_options
            FROM cache.builder cb
                     INNER JOIN cache.cachixconfigs cc ON cc.builder_id = cb.id
                     INNER JOIN cache.git_configs gc ON gc.builder_id = cb.id
                     INNER JOIN cache.buildoptions bo ON bo.builder_id = cb.id
            WHERE cb.id = $1
        `, [builderId]).then((res:QueryResult<combinedBuilder>)=>{
            if(res.rows.length === 0){
                return null;
            }
            return res.rows[0]!;
        }).catch((err)=>{
            Logger.error(`Failed to get builder by id ${builderId} ${err}`);
            return null;
        })
    }
    public async createBuilder(builder:combinedBuilder, signingkey:public_signing_keys, apikey:keys):Promise<combinedBuilder>{
        Logger.debug(`Creating builder for cache ${builder.builder.cache_id}`);

        // First, create the builder in itself
        const returnObject:combinedBuilder = builder
        await this.query(`
        INSERT INTO cache.builder (cache_id, name, description, enabled, trigger, cron, arch, webhookURL)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            builder.builder.cache_id,
            builder.builder.name,
            builder.builder.description,
            builder.builder.enabled,
            builder.builder.trigger,
            builder.builder.cron,
            builder.builder.arch,
            builder.builder.webhookurl,
        ]).then((res)=>{
            if(res.rows.length === 0){
                throw new Error("Failed to create builder");
            }
            returnObject.builder = res.rows[0] as builder;
        })

        // Then, create the git config
        await this.query(`
            INSERT INTO cache.git_configs (builder_id, repository, branch, gitUsername, gitKey, requiresAuth, noClone)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            returnObject.builder.id,
            builder.git_config.repository,
            builder.git_config.branch,
            builder.git_config.gitusername,
            builder.git_config.gitkey,
            builder.git_config.requiresauth,
            builder.git_config.noclone
        ]).then((res)=>{
            if(res.rows.length === 0){
                throw new Error("Failed to create git config");
            }
            returnObject.git_config = res.rows[0] as git_configs;
        })

        // Then, create the build options
        await this.query(`
            INSERT INTO cache.buildOptions (builder_id, cores, maxJobs, keep_going, extraArgs, substituters, parallelBuilds, command)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            returnObject.builder.id,
            builder.build_options.cores,
            builder.build_options.maxjobs,
            builder.build_options.keep_going,
            builder.build_options.extraargs,
            builder.build_options.substituters,
            false,
            builder.build_options.command
        ]).then((res)=>{
            if(res.rows.length === 0){
                throw new Error("Failed to create build options");
            }
            returnObject.build_options = res.rows[0] as buildoptions;
        })

        // Finally, create the cachix config
        await this.query(`
            INSERT INTO cache.cachixConfigs (builder_id, push, target, apiKey, apiKeyId, signingKey, signingkeyid, buildOutputDir)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            returnObject.builder.id,
            builder.cachix_config.push,
            builder.cachix_config.target,
            builder.cachix_config.apikey,
            apikey.id,
            builder.cachix_config.signingkey,
            signingkey.id,
            builder.cachix_config.buildoutpudir
        ]).then((res)=>{
            if(res.rows.length === 0){
                throw new Error("Failed to create cachix config");
            }
            returnObject.cachix_config = res.rows[0] as cachixconfigs;
        })
        return returnObject
    }
    // Function basically does the same as createBuilder, but instead it updates the existing builders
    public async updateBuilder(builder:combinedBuilder):Promise<void>{
        Logger.debug(`Creating builder for cache ${builder.builder.cache_id}`);

        // First, update the builder in itself
        await this.query(`
        UPDATE cache.builder SET 
             cache_id = $1,
             name = $2, 
             description = $3, 
             enabled = $4, 
             trigger = $5, 
             cron = $6, 
             arch = $7, 
             webhookURL = $8
            WHERE id = $9
        `, [
            builder.builder.cache_id,
            builder.builder.name,
            builder.builder.description,
            builder.builder.enabled,
            builder.builder.trigger,
            builder.builder.cron,
            builder.builder.arch,
            builder.builder.webhookurl,
            builder.builder.id
        ])

        // Then, update the git config
        await this.query(`
            UPDATE cache.git_configs SET 
                builder_id = $1, 
                repository = $2, 
                branch = $3, 
                gitUsername = $4, 
                gitKey = $5, 
                requiresAuth = $6, 
                noClone = $7
            WHERE id = $8
        `, [
            builder.builder.id,
            builder.git_config.repository,
            builder.git_config.branch,
            builder.git_config.gitusername,
            builder.git_config.gitkey,
            builder.git_config.requiresauth,
            builder.git_config.noclone,
            builder.git_config.id
        ])

        // Then, update the build options
        await this.query(`
            UPDATE cache.buildOptions SET 
                builder_id = $1, 
                 cores = $2, 
                 maxJobs = $3, 
                 keep_going = $4, 
                 extraArgs = $5, 
                 substituters = $6, 
                 parallelBuilds = $7, 
                 command = $8
            WHERE id = $9
        `, [
            builder.builder.id,
            builder.build_options.cores,
            builder.build_options.maxjobs,
            builder.build_options.keep_going,
            builder.build_options.extraargs,
            builder.build_options.substituters,
            false,
            builder.build_options.command,
            builder.build_options.id
        ])

        // Finally, update the cachix config
        await this.query(`
            UPDATE cache.cachixConfigs SET
             builder_id = $1, 
             push = $2, 
             target = $3, 
             apiKey = $4, 
             signingKey = $5, 
             buildOutputDir = $6
            WHERE id = $7
        `, [
            builder.builder.id,
            builder.cachix_config.push,
            builder.cachix_config.target,
            builder.cachix_config.apikey,
            builder.cachix_config.signingkey,
            builder.cachix_config.buildoutpudir ?? "./result",
            builder.cachix_config.id
        ])

    }

    public async appendApiKey(cache:number, key:string, name?:string):Promise<keys> {
        //Hash the key
        const hasher = new Bun.CryptoHasher("sha512");
        hasher.update(key)
        const hash = hasher.digest("hex")
        const result:QueryResult<keys> = await this.query(`
            INSERT INTO cache.keys (name, description, hash) VALUES ($1, $2, $3)
                RETURNING *;
        `, [name ?? "Starting Key", "With love from the Iglu team", hash]) as QueryResult<keys>
        if(result.rows.length ===  0 || !result.rows[0]?.id){
            throw new Error('Error whilst creating key')
        }

        const keyID = result.rows[0].id

        await this.query(`
            INSERT INTO cache.cache_key (cache_id, key_id) VALUES ($1, $2)
        `, [cache, keyID])

        return result.rows[0]
    }
    public async deleteBuilder(builderId:number):Promise<void>{
        Logger.info(`Deleting builder with ID ${builderId}`);

        await this.query(`
            START TRANSACTION;
        `)
        try{
            await this.query(`
                DELETE FROM cache.builder_runs WHERE id = $1
            `, [builderId])
            await this.query(`
                DELETE FROM cache.buildoptions WHERE id = $1
            `, [builderId])
            await this.query(`
                DELETE FROM cache.git_configs WHERE id = $1
            `, [builderId])

            // Regarding the cachixconfigs, we need to first get the api key id and signing key id to delete them as well
            const cachixConfig =  await this.query(`
                SELECT * FROM cache.cachixconfigs WHERE builder_id = $1
            `, [builderId]).then((res:QueryResult<cachixconfigs>)=>{
                if(res.rows.length === 0){
                    throw new Error("Cachix config not found for builder");
                }
                return res.rows[0]!
            })
            // Delete the linking entry first
            await this.query(`
                DELETE FROM cache.signing_key_cache_api_link
                    WHERE signing_key_id = $1
                    AND key_id = $2
            `, [cachixConfig.signingkeyid, cachixConfig.apikeyid])
            await this.query(`
                DELETE FROM cache.cache_key
                    WHERE key_id = $1
            `, [cachixConfig.apikeyid])

            // Delete the signing key and api key
            await this.query(`
                DELETE FROM cache.keys
                    WHERE id = $1
            `, [cachixConfig.apikeyid])
            await this.query(`
                DELETE FROM cache.public_signing_keys
                    WHERE id = $1
            `, [cachixConfig.signingkeyid])

            await this.query(`
                DELETE FROM cache.cachixconfigs WHERE id = $1
            `, [builderId])

            await this.query(`
                DELETE FROM cache.builder WHERE id = $1
            `, [builderId])
            await this.query(`
                COMMIT TRANSACTION;
            `)
        }
        catch(e){
            await this.query("ROLLBACK;")
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            return Promise.reject(e)
        }
        Logger.debug(`Builder with ID ${builderId} deleted successfully`);
    }
    public async appendPublicKey(id:number, key:string, apiKey:string, bypassHasher?:boolean, name?:string):Promise<public_signing_keys|void>{
        const hashedKey = new Bun.CryptoHasher("sha512")
        hashedKey.update(apiKey)
        let hash = hashedKey.digest("hex")

        //This is a workaround to be able to just pass a hash to the query later down the line
        if(bypassHasher){
            hash = apiKey
        }

        //Get the API key ID
        const keyID = await this.query(`
            SELECT * FROM cache.keys WHERE hash = $1;
        `, [hash]).then((res:QueryResult<keys>)=>{
            if(!res.rows[0] || res.rows.length === 0){
                throw new Error('API Key not found')
            }
            return res.rows[0].id
        })
        //Check if this key cache api key link already exists
        let publicKeyId;
        const isInDb = await this.query(`
                SELECT * FROM cache.signing_key_cache_api_link WHERE cache_id = $1 AND key_id = $2
            `, [id, keyID]).then((res:QueryResult<signing_key_cache_api_link>)=>{
            if(res.rows.length > 0 && res.rows[0]){
                publicKeyId = res.rows[0].signing_key_id
                return true
            }
            return false
        })

        //Depending on the result we need to either update the key or insert a new one
        if(isInDb){
            //Update the key with the id we got
            await this.query(`
                UPDATE cache.public_signing_keys SET key = $1 WHERE id = $2
            `, [key, publicKeyId])
        }
        else{
            //Insert the key into the public signing keys table
            const signingKey:QueryResult<public_signing_keys> = await this.query(`
                INSERT INTO cache.public_signing_keys (name, key, description) 
                VALUES ($1, $2, $3)
                RETURNING *
            `, [name ?? "Cachix Key", key, "Key uploaded by Cachix"]) as QueryResult<public_signing_keys>

            //Insert the key into the signing key cache api link table
            await this.query(`
                INSERT INTO cache.signing_key_cache_api_link (cache_id, key_id, signing_key_id) 
                VALUES ($1, $2, $3)
        `, [id, keyID, signingKey.rows[0]!.id])
            return signingKey.rows[0]!
        }
    }
    public async getBuilderFromWebhook(hook:string):Promise<builder | null>{
        return await this.query(`
            SELECT * FROM cache.builder WHERE webhookurl = concat('/api/v1/webhooks/builder/', $1::cstring)
        `, [hook])
            .then((res)=>{
                if(res.rows.length === 0){
                    return null
                }
                return res.rows[0] as builder;
            })
            .catch((err)=>{
                Logger.error(`Failed to get builder from webhook ${hook} ${err}`);
                return null;
            })
    }
    public async createNode(node:nodeRegistrationRequest, node_id:string):Promise<void>{
        await this.query(`INSERT INTO cache.nodes 
                          (id, node_name, node_address, node_port, node_version, node_arch, node_os, node_max_jobs)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [node_id, node.node_name, node.node_address, node.node_port, node.node_version, node.node_arch, node.node_os, node.node_max_jobs])
    }
    public async createNewBuildJob(builder_id:number){
        return await this.query(`
            INSERT INTO cache.builder_runs (builder_id, status, started_at, ended_at, gitcommit, duration, log)
            VALUES ($1, $2, $3, null, 'unknown', '0', null)
            RETURNING *
        `, [builder_id, 'created', new Date()])
            .then((res)=>{
                if(res.rows.length === 0){
                    throw new Error("Failed to create build update");
                }
                return res.rows[0] as builder_runs;
            })
    }
    public async updateJob(job_id:number, new_object:builder_runs):Promise<void>{
        try{
            await this.getJob(job_id)
        }
        catch(e){
            Logger.error(`Failed to get job with id ${job_id}`)
            Logger.debug(`${e}`)
            return
        }

        // Update the update
        await this.query(`
            UPDATE cache.builder_runs br SET
                status = $1,
                started_at = $2,
                ended_at = $3,
                gitcommit = $4,
                duration = $5,
                log = $6,
                node_id = $7
            WHERE br.id = $8
        `, [new_object.status, new_object.started_at, new_object.ended_at, new_object.gitcommit, new_object.duration, new_object.log, new_object.node_id, job_id])
    }
    public async finishJob(job_id:number){
        // Update the job in the database by calculating the interval between the start and end timestamps
        await this.query(`
            UPDATE cache.builder_runs SET
                duration = (ended_at - started_at) 
            WHERE id = $1
        `, [job_id])
    }
    public async getJob(job_id:number):Promise<builder_runs>{
        return await this.query(`
            SELECT * FROM cache.builder_runs WHERE id = $1
        `, [job_id]).then((res)=>{
            if(res.rows.length === 0 || !res.rows[0]){
                throw new Error("Job not found");
            }
            return res.rows[0] as builder_runs;
        })
    }
    public async getAllBuilders():Promise<QueryResult<redisCombinedBuilder>>{
        return await this.query(`
            SELECT row_to_json(cb.*) as builder,
                   row_to_json(cc.*) as cachix_config,
                   row_to_json(gc.*) as git_config,
                   row_to_json(bo.*) as build_options,
                   row_to_json(c) as cache
            FROM cache.builder cb
                     INNER JOIN cache.cachixconfigs cc ON cc.builder_id = cb.id
                     INNER JOIN cache.git_configs gc ON gc.builder_id = cb.id
                     INNER JOIN cache.buildoptions bo ON bo.builder_id = cb.id
                     INNER JOIN cache.caches c ON c.id = cb.cache_id
        `) as QueryResult<redisCombinedBuilder>
    }
    public async getBuildersForCache(cacheID:number):Promise<QueryResult<combinedBuilder>>{
        return await this.query(`
            SELECT row_to_json(cb.*) as builder,
                   row_to_json(cc.*) as cachix_config,
                   row_to_json(gc.*) as git_config,
                   row_to_json(bo.*) as build_options
            FROM cache.builder cb
                     INNER JOIN cache.cachixconfigs cc ON cc.builder_id = cb.id
                     INNER JOIN cache.git_configs gc ON gc.builder_id = cb.id
                     INNER JOIN cache.buildoptions bo ON bo.builder_id = cb.id
            WHERE cb.cache_id = $1 
        `, [cacheID]) as QueryResult<combinedBuilder>
    }
    public async getQueueForCache(input:number):Promise<Array<dbQueueEntry>>{
        return await this.query(`
            SELECT row_to_json(cb.*) as builder,
                   row_to_json(cc.*) as cachix_config,
                   row_to_json(gc.*) as git_config,
                   row_to_json(bo.*) as build_options,
                   json_build_object('node_info', row_to_json(nd.*), 'run', row_to_json(br.*)) as builder_run
            FROM cache.builder_runs br
                   INNER JOIN cache.builder cb ON cb.id = br.builder_id
                   INNER JOIN cache.cachixconfigs cc ON cc.builder_id = cb.id
                   INNER JOIN cache.git_configs gc ON gc.builder_id = cb.id
                   INNER JOIN cache.buildoptions bo ON bo.builder_id = cb.id
                   INNER JOIN cache.nodes nd ON br.node_id = nd.id
            WHERE cb.cache_id = $1
                AND br.status != 'success' AND br.status != 'failed' AND br.status != 'canceled'
            ORDER BY br.id DESC
        `, [input])
            .then((res)=>{
                return res.rows as Array<dbQueueEntry>
            })
            .catch((err)=>{
                Logger.error(`Failed to get queue for cache ${input} ${err}`);
                return []
            })
    }
    public async getAllRunsForCache(input:number):Promise<Array<dbQueueEntry>>{
        return await this.query(`
            SELECT row_to_json(cb.*) as builder,
                   row_to_json(cc.*) as cachix_config,
                   row_to_json(gc.*) as git_config,
                   row_to_json(bo.*) as build_options,
                   json_build_object('node_info', row_to_json(nd.*), 'run', row_to_json(br.*)) as builder_run
            FROM cache.builder_runs br
                   INNER JOIN cache.builder cb ON cb.id = br.builder_id
                   INNER JOIN cache.cachixconfigs cc ON cc.builder_id = cb.id
                   INNER JOIN cache.git_configs gc ON gc.builder_id = cb.id
                   INNER JOIN cache.buildoptions bo ON bo.builder_id = cb.id
                   INNER JOIN cache.nodes nd ON br.node_id = nd.id
            WHERE cb.cache_id = $1
            ORDER BY br.id DESC
        `, [input])
            .then((res)=>{
                return res.rows as Array<dbQueueEntry>
            })
            .catch((err)=>{
                Logger.error(`Failed to get queue for cache ${input} ${err}`);
                return []
            })
    }
    public async getJobDetails(runID:number):Promise<Array<dbQueueEntry>>{
        return await this.query(`
            SELECT row_to_json(cb.*) as builder,
                   row_to_json(cc.*) as cachix_config,
                   row_to_json(gc.*) as git_config,
                   row_to_json(bo.*) as build_options,
                   json_build_object('node_info', row_to_json(nd.*), 'run', row_to_json(br.*)) as builder_run
            FROM cache.builder_runs br
                     INNER JOIN cache.builder cb ON cb.id = br.builder_id
                     INNER JOIN cache.cachixconfigs cc ON cc.builder_id = cb.id
                     INNER JOIN cache.git_configs gc ON gc.builder_id = cb.id
                     INNER JOIN cache.buildoptions bo ON bo.builder_id = cb.id
                     INNER JOIN cache.nodes nd ON br.node_id = nd.id
            WHERE br.id = $1 
        `, [runID])
            .then((res)=>{
                return res.rows as Array<dbQueueEntry>
            })
            .catch((err)=>{
                Logger.error(`Failed to get job details for runID ${runID} ${err}`);
                return []
            })
    }

    // Admin Stuff
    public async getAllUsersWithKeysAndCaches():Promise<Array<{user:User, caches:cache[], apikeys:keys[], signingkeys:Array<{public_signing_key:public_signing_keys[], signing_key_cache_api_link:signing_key_cache_api_link[]}>}>>{
        return this.query(`
            SELECT row_to_json(u.*) AS user,
                   (SELECT json_agg(c.*) FROM cache.caches c INNER JOIN cache.cache_user_link cul ON c.id = cul.id WHERE cul.user_id = u.id GROUP BY u.id) as caches,
                   (SELECT json_build_object('public_signing_key', json_agg(psk.*), 'signing_key_cache_api_link', json_agg(skcal.*)) FROM cache.public_signing_keys psk
                      INNER JOIN cache.signing_key_cache_api_link skcal ON psk.id = skcal.signing_key_id
                      INNER JOIN cache.keys ON skcal.key_id = keys.id
                    WHERE keys.user_id = u.id
                   ) as signing_keys,
                   (SELECT json_agg(k.*) FROM cache.keys k WHERE k.user_id = u.id GROUP BY u.id) as apikeys
            FROM cache.users u;
        `).then((res)=>{
            return res.rows as Array<{user:User, caches:cache[], apikeys:keys[], signingkeys:Array<{public_signing_key:public_signing_keys[], signing_key_cache_api_link:signing_key_cache_api_link[]}>}>;
        })
    }
    public async deleteUserByID(userID:string){
        // First get the user
        const user = await this.query(`
            SELECT * FROM cache.users WHERE id = $1
        `, [userID]).then((res)=>{
            if(res.rows.length === 0){
                throw new Error("User not found");
            }
            return res.rows[0] as User;
        })
        await this.query(`START TRANSACTION`)
        // Then delete the users cache_user_link entries
        await this.query(`
            DELETE FROM cache.cache_user_link WHERE user_id = $1
        `, [userID])

        // Get the user's link entries to later be able to delete the signing keys
        const link_entries = await this.query(`SELECT * FROM cache.signing_key_cache_api_link WHERE key_id IN (SELECT id FROM cache.keys WHERE user_id = $1)`, [userID]).then((res)=>{
            return res.rows as signing_key_cache_api_link[]
        })

        // Then delete the users signing_key_cache_api_link entries
        await this.query(`
            DELETE FROM cache.signing_key_cache_api_link WHERE key_id IN (SELECT id FROM cache.keys WHERE user_id = $1)
        `, [userID])

        // Then delete the users api keys and signing keys
        await this.query(`
            DELETE FROM cache.keys WHERE user_id = $1
        `, [userID])
        for(const entry of link_entries){
            await this.query(`
                DELETE FROM cache.public_signing_keys WHERE id = $1
            `, [entry.signing_key_id])
        }

        // Finally, delete the user
        await this.query(`
            DELETE FROM cache.users WHERE id = $1
        `, [userID])

        // Commit the transaction
        await this.query(`COMMIT`)
    }

    public async getAllBuildersPerCaches():Promise<Array<{"cache":cache, "builders":builder[] | null}>>{
        return this.query(`
            SELECT row_to_json(ca.*)  as cache,
                     (SELECT json_agg(b.*) FROM cache.builder b WHERE b.cache_id = ca.id GROUP BY ca.id) as builders
            FROM cache.caches ca;
        `)
            .then((res)=> {return res.rows as Array<{"cache":cache, "builders":builder[] | null}>})
    }

    public async removePublicSigningKey(publicSigningKeyId:string):Promise<void>{
        // First, delete the cache-key-signingkey link
        await this.query(`START TRANSACTION;`)
        await this.query(`
            DELETE FROM cache.signing_key_cache_api_link WHERE signing_key_id = $1
        `, [publicSigningKeyId])
        // Delete the public signing key itself
        await this.query(`
            DELETE FROM cache.public_signing_keys WHERE id = $1
        `, [publicSigningKeyId])
        await this.query(`COMMIT;`)
    }

    public async getKeysForCache(cacheID:number):Promise<Array<{
        apikey:Omit<keys, "hash">,
        public_signing_keys:public_signing_keys[],
        user:{
            id:string,
            username:string,
            updated_at:Date,
            avatar_color:string,
            email:string,
            is_admin:boolean
        } | null
    }>>{
        return await this.query(`
            SELECT json_build_object('id', k.id, 'name', k.name, 'description', k.description, 'created_at', k.created_at, 'updated_at', k.updated_at, 'user_id', k.user_id) as apikey, json_agg(row_to_json(psk.*)) as public_signing_keys, json_build_object('id', u.id, 'username', u.username, 'updated_at', u.updated_at, 'avatar_color', u.avatar_color, 'email', u.email, 'is_admin', u.is_admin) as "user" FROM cache.keys k
                 INNER JOIN cache.cache_key ck ON ck.key_id = k.id
                 INNER JOIN cache.signing_key_cache_api_link skcal ON skcal.key_id = k.id
                 INNER JOIN cache.public_signing_keys psk ON psk.id = skcal.signing_key_id
                 FULL JOIN cache.users u ON u.id = k.user_id
            WHERE ck.cache_id = $1
            GROUP BY k.id, k.name, k.hash, k.description, k.created_at, k.updated_at, k.user_id, u.id, u.username, u.email, u.created_at, u.updated_at
            ORDER BY k.id;
        `, [cacheID]).then((res)=>{
            return res.rows
        })
    }

    /*
    * Removes the specified api key and all of its associated signing keys from the specified cache.
    * @param apiKeyID - The ID of the API key to remove.
    * @param cacheID - The ID of the cache to remove the API key from.
    * */
    public async removeKeyFromCache(apiKeyID:string, cacheID:string){
        await this.query(`START TRANSACTION`)
        // First remove all signing key links for this api key and cache
        await this.query(`
            DELETE FROM cache.cache_key WHERE key_id = $1 AND cache_id = $2
        `, [apiKeyID, cacheID])
        // Then delete all psk links associated with this api key and cache
        await this.query(`
            DELETE FROM cache.signing_key_cache_api_link WHERE key_id = $1 AND cache_id = $2
        `, [apiKeyID, cacheID])
        // Commit the transaction
        await this.query(`COMMIT`)
    }
}
