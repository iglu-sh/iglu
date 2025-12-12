/*
* This file downloads a Nix derivation from the cache.
* It is used by the Nix package manager to download derivations.
* */

import bodyParser, {type NextFunction, type Request, type Response} from "express";
import {Cache, db, Hash, Hash_cache_link, Hash_request} from "@iglu-sh/common";
import type {cache, hash, hash_cache_link} from "@iglu-sh/types/core/db";
import fs from "fs";
import Logger from "@iglu-sh/logger";

export const get = [
    bodyParser.json(),
    async (req: Request, res: Response, next: NextFunction) => {
        if(req.method !== 'GET'){
            return res.status(405).json({
                error: 'Method not allowed',
            })
        }
        if(!req.params.cache || !req.params.derivation){
            return res.status(400).json({
                error: 'Missing cache name or hash',
            })
        }

        // Return the cacheInfo
        const nixDerivationHash = req.params.derivation
        const cacheName = req.params.cache
        const cacheDB = new Cache(db.StaticDatabase)
        const hashDB = new Hash(db.StaticDatabase)
        const hashCacheLinkDB = new Hash_cache_link(db.StaticDatabase)
        const hashRequestDB = new Hash_request(db.StaticDatabase)
        async function wrap(){
            let cacheObject:null|cache = null
            try{
                cacheObject = await cacheDB.getByName(cacheName)
            }
            catch(e){
                Logger.debug("Did not find cache by name in derivation endpoint")
            }
            if(!cacheObject){
                return res.status(400).json({})
            }

            //Get the derivation file path
            let hashObject:null|hash = null
            let hashCacheObject:null|hash_cache_link[] = null
            try{
                hashObject = await hashDB.getByStoreHash(nixDerivationHash)
                hashCacheObject = await hashCacheLinkDB.getByCacheAndHash(cacheObject.id, hashObject.id)
                if(!hashCacheObject || hashCacheObject.length === 0){
                    throw new Error("Hash cache link not found")
                }
            }
            catch(e){
                Logger.debug(`Derivation ${nixDerivationHash} not found in cache ${cacheObject.id}`)
                return res.status(404).json({
                    error: 'Derivation not found',
                })
            }
            if(!hashObject || !hashCacheObject[0]){
                Logger.debug(`Derivation ${nixDerivationHash} not found in cache ${cacheObject.id}`)
                return res.status(404).json({
                    error: 'Derivation not found',
                })
            }
            //Load the derivation file and send it to the client
            const data = fs.existsSync(hashObject.path)
            if(!data){
                return res.status(404).json({
                    error: 'Derivation not found',
                })
            }
            res.status(200).sendFile(hashObject.path, (err)=>{
                if(err){
                    Logger.error(`Error while sending file: ${err}`)
                    return res.status(500).json({
                        error: 'Internal server error',
                    })
                }
            })
            await hashRequestDB.createNewEntry({
                id: '<empty>',
                hash_cache_link: hashCacheObject[0],
                type: "request",
                time: new Date()
            })
            Logger.debug(`Sent derivation ${nixDerivationHash} from cache ${cacheObject.id} to ${req.ip}`)
            return
        }
        console.log("WRAP")
        await wrap().then(async ()=>{
        })
        .catch(async (err) => {
            Logger.error(`Error while sending file: ${err}`)
            return res.status(500).json({
                error: 'Internal server error',
            })
        })
    }
]
