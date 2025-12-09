//These are migrations to run when the cache is started


import type Database from "./db.ts";
import {Logger} from "./logger.ts";

export async function migrate(db:Database){

    const caches = await db.getDirectAccess().query(`
        SELECT * FROM cache.caches
    `).then((caches) => {return caches.rows});
    const log = new Logger()
    if(!caches || caches.length == 0){
        Logger.debug('Skipping migrations because no caches in db.')
        return;
    }
    //Public Signing keys in cache to new format
    if(Object.keys(caches[0]).includes('publicsigningkeys')){
        for(const cache of caches){
           //We can expect the public signing keys to only be in the old format
            //Get all the allowed API Keys for this cache
            const keys = await db.getDirectAccess().query(`
                SELECT k.* FROM cache.keys k
                    INNER JOIN cache.cache_key ck on k.id = ck.key_id
                WHERE ck.cache_id = $1
            `, [cache.id]).then((keys) => {return keys.rows});
            Logger.debug(`Migrated ${keys.length} keys in cache ${cache.id} (${cache.name})`);

            //Move this to the new format
            const id = await db.getDirectAccess().query(`
                INSERT INTO cache.public_signing_keys (name, key, description)
                VALUES ($1, $2, $3)
                RETURNING *
            `, ["Migrated key", cache.publicsigningkeys && cache.publicsigningkeys != "" ? cache.publicsigningkeys : "", "Migrated auto-magically from an old cache format"])

            //Combine the new key with the caches and api keys
            for(const key of keys){
                await db.getDirectAccess().query(`
                    INSERT INTO cache.signing_key_cache_api_link (cache_id, key_id, signing_key_id)
                        VALUES ($1, $2, $3)
                `, [cache.id, key.id, id.rows[0].id])
            }
        }

        //Once done, remove the old format (i.e remove the column)
        await db.getDirectAccess().query(`
            ALTER TABLE cache.caches
                DROP COLUMN publicsigningkeys
        `)

        Logger.debug('Done with Migration: Public signing keys')
    }
}
