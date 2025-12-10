import {db} from "./index.ts";
import Logger from "@iglu-sh/logger";

export class Setup extends db.Database{
    constructor() {
        super();
    }

    async createDatabase():Promise<void>{
        // Create Database if not exists
        await this.connect(false);
        Logger.debug("Creating Database..")
        // Load extensions
        await this.query(`
            CREATE EXTENSION IF NOT EXISTS "http";
            CREATE EXTENSION IF NOT EXISTS "pg_cron";
        `)
        Logger.debug("Extensions loaded")

        // Create the database first
        await this.query(`
            CREATE SCHEMA IF NOT EXISTS cache;
        `)
        Logger.debug("Schema created")

        // Create enums for later use
        await this.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compression_method') THEN
                    CREATE TYPE compression_method AS ENUM ('xz', 'zstd');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'arches') THEN
                    CREATE TYPE arches AS ENUM ('x86_64-linux', 'aarch64-linux' ,'armv7l' ,'i686' ,'riscv64' ,'aarch64-darwin', 'x86_64-darwin');
                END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'valid_build_states') THEN
                    CREATE TYPE valid_build_states AS ENUM ('created', 'claimed', 'starting', 'running', 'failed', 'success', 'canceled');
                END IF;
            END$$;
        `)
        Logger.debug("Enums created")


        // Now create the tables
        await this.query(`
            CREATE TABLE IF NOT EXISTS cache.cache(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                githubusername TEXT NOT NULL DEFAULT 'none',
                ispublic BOOLEAN NOT NULL DEFAULT TRUE,
                name TEXT NOT NULL,
                permission TEXT NOT NULL,
                preferredcompressionmethod compression_method NOT NULL DEFAULT 'zstd',
                uri TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 40
            );
            CREATE TABLE IF NOT EXISTS cache.user(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL,
                password TEXT NOT NULL,
                createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_login TIMESTAMPTZ NULL,
                is_admin BOOLEAN NOT NULL DEFAULT FALSE,
                is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
                show_oob BOOLEAN NOT NULL DEFAULT FALSE,
                avatar BYTEA NOT NULL DEFAULT '',
                avatar_color TEXT NOT NULL DEFAULT '#000000'
            );
            CREATE TABLE IF NOT EXISTS cache.node_config(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                version SERIAL NOT NULL,
                data JSONB NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cache.cache_config(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT NOT NULL,
                value TEXT NOT NULL
            );    
            CREATE TABLE IF NOT EXISTS cache.controller_config(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT NOT NULL,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cache.user_log(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user" uuid REFERENCES cache.user(id) ON DELETE SET NULL,
                time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                type TEXT NOT NULL,
                data JSONB NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cache.cache_user_link(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                cache uuid REFERENCES cache.cache(id) ON DELETE CASCADE,
                "user" uuid REFERENCES cache.user(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS cache.api_key(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "user" uuid REFERENCES cache.user(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                hash TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                last_used TIMESTAMPTZ NULL
            );
            CREATE TABLE IF NOT EXISTS cache.cache_api_key_link(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                cache uuid REFERENCES cache.cache(id) ON DELETE CASCADE,
                api_key uuid REFERENCES cache.api_key(id) ON DELETE CASCADE,
                UNIQUE(cache, api_key)
            );
            CREATE TABLE IF NOT EXISTS cache.public_signing_key(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                api_key uuid REFERENCES cache.api_key(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                public_signing_key TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS cache.cache_signing_key_link(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                cache uuid REFERENCES cache.cache(id) ON DELETE CASCADE,
                public_signing_key uuid REFERENCES cache.public_signing_key(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS cache.hash(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                creator_api_key uuid REFERENCES cache.api_key(id) ON DELETE CASCADE,
                path TEXT NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                cderiver TEXT NOT NULL,
                cfilehash TEXT NOT NULL,
                cfilesize BIGINT NOT NULL,
                cnarhash TEXT NOT NULL,
                cnarsize BIGINT NOT NULL,
                creferences TEXT[] NOT NULL,
                csig TEXT NOT NULL,
                cstorehash TEXT NOT NULL,
                cstoresuffix TEXT NOT NULL,
                parts JSONB[] NOT NULL,
                compression compression_method NOT NULL,
                signed_by uuid REFERENCES cache.cache_signing_key_link(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS cache.hash_request(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                hash uuid REFERENCES cache.hash(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                time TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS cache.hash_cache_link(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                hash uuid REFERENCES cache.hash(id) ON DELETE CASCADE,
                cache uuid REFERENCES cache.cache(id) ON DELETE CASCADE,
                UNIQUE(hash, cache)
            );
            CREATE TABLE IF NOT EXISTS cache.builder(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                cache uuid REFERENCES cache.cache(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT TRUE,
                trigger TEXT NOT NULL,
                cron TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                arch arches NOT NULL,
                webhookurl TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS cache.cache_builder_key(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                cache uuid REFERENCES cache.cache(id) ON DELETE CASCADE,
                signingkey uuid REFERENCES cache.public_signing_key(id) ON DELETE CASCADE,
                apikey uuid REFERENCES cache.api_key(id) ON DELETE CASCADE,
                plaintext_apikey TEXT NOT NULL,
                plaintext_signingkey TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cache.build_config(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                builder uuid REFERENCES cache.builder(id) ON DELETE CASCADE,
                cores INTEGER NOT NULL DEFAULT 1,
                maxjobs INTEGER NOT NULL DEFAULT 1,
                keep_going BOOLEAN NOT NULL DEFAULT FALSE,
                extraaargs TEXT NOT NULL DEFAULT '',
                substituters jsonb[] NOT NULL DEFAULT ARRAY[]::jsonb[],
                parallelbuilds BOOLEAN NOT NULL DEFAULT TRUE,
                command TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS cache.git_config(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                builder uuid REFERENCES cache.builder(id) ON DELETE CASCADE,
                repository TEXT NOT NULL,
                branch TEXT NOT NULL,
                gitusername TEXT NULL,
                gitkey TEXT NULL,
                requiresauth BOOLEAN NOT NULL DEFAULT FALSE,
                noclone BOOLEAN NOT NULL DEFAULT FALSE
            );
            CREATE TABLE IF NOT EXISTS cache.cachix_config(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                builder uuid REFERENCES cache.builder(id) ON DELETE CASCADE,
                target uuid REFERENCES cache.cache(id) ON DELETE CASCADE,
                cache_builder_key uuid REFERENCES cache.cache_builder_key(id) ON DELETE CASCADE,
                push BOOLEAN NOT NULL DEFAULT TRUE,
                buildoutputdir TEXT NOT NULL DEFAULT './result'
            );
            CREATE TABLE IF NOT EXISTS cache.node(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                config uuid REFERENCES cache.node_config(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                port INTEGER NOT NULL,
                version TEXT NOT NULL,
                arch arches NOT NULL,
                os TEXT NOT NULL,
                max_jobs INTEGER NOT NULL DEFAULT 1,
                auth_token TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS cache.build_log(
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                builder uuid NOT NULL REFERENCES cache.builder(id) ON DELETE CASCADE,
                node uuid NOT NULL REFERENCES cache.node(id) ON DELETE CASCADE,
                status valid_build_states NOT NULL,
                started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                ended_at TIMESTAMPTZ NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                gitcommit TEXT NOT NULL,
                duration INTERVAL NOT NULL DEFAULT '0 seconds',
                log JSONB[] NOT NULL DEFAULT ARRAY[]::JSONB[]
            )
        `)
        Logger.debug("Tables created")
        Logger.info("Database setup complete")
        //await this.disconnect()
    }
}
