import jwt from "jsonwebtoken";
import {Cache, Cache_api_key_link, db} from '@iglu-sh/common'
import type {cache, cache_api_key_link} from "@iglu-sh/types/core/db";
import Logger from "@iglu-sh/logger";

export async function isAuthenticated (req: any, res: any, next: any):Promise<boolean>{
        // Check if the request has an authorization header
        const authHeader = req.headers.authorization ? req.headers.authorization : req.query.token ? `bearer ${req.query.token}` : undefined;
        console.log(authHeader)
        if(!authHeader){
            res.status(403).json({ message: 'Forbidden' });
            return false;
        }
        // Check if the authorization header is in the format "Bearer <token>"
        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(403).json({ message: 'Forbidden' });
            return false
        }

        // If everything is fine so far we can check if this api key is allowed to push this cache
        // Check if the cache exists
        const Database = db.StaticDatabase;
        const cacheDB = new Cache(Database)
        const cacheApiKeyLinkDB = new Cache_api_key_link(Database)
        //Create a wrapper function to close the database connection after returning
        async function wrap(){
            const providedCacheName = req.params.cache
            let cache:null|cache = null
            try{
                cache = await cacheDB.getByName(providedCacheName)
            }
            catch(e){
                Logger.debug("Did not find cache by name in isAuthenticated middleware")
            }
            if(!cache){
                res.status(404).json({ message: 'Cache Not Found' });
                return false
            }

            //Check if the api key is allowed to push this cache
            let keys:cache_api_key_link[] = []
            try{
                keys = await cacheApiKeyLinkDB.getByCacheId(cache.id)
            }
            catch (e) {
                Logger.debug(`No api key links found for cache id ${cache.id}`)
            }
            if(keys.length === 0){
                res.status(403).json({ message: 'Forbidden' });
                return false
            }
            let onlyHashes = keys.map((k)=>k.api_key.hash)
            /*
            * This verifies that a given string matches the hash stored in the database using the Argon2 password hashing algorithm.
            * */
            const hasher = new Bun.CryptoHasher("sha512")
            hasher.update(token)
            const hash = hasher.digest('hex')

            if(!hash || hash.length === 0 || !onlyHashes.includes(hash)){
                res.status(403).json({ message: 'Forbidden' });
                return false
            }
            return true;
        }
        return await wrap().then(async (result)=>{
            return result
        }).catch(e=>{
            res.status(500).send("Internal Server Error");
            console.error(e)
            return false
        });
    }