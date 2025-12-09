/*
* This file downloads a Nix derivation from the cache.
* It is used by the Nix package manager to download derivations.
* */

import bodyParser, {type NextFunction, type Request, type Response} from "express";
import db from "../../../utils/db.ts";
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
        const cache = req.params.cache
        const Database = new db();

        async function wrap(){
           const cacheID = await Database.getCacheID(cache)
            if(!cacheID){
                return res.status(400).json({})
            }
            // Check if the cache is public or private
            const cacheInfo = await Database.getCacheInfo(cacheID)
            if(!cacheInfo){
                return res.status(403).json({})
            }
            if(!cacheInfo){
                return res.status(400).json({})
            }

            //Get the derivation file path
            let filePath:{id:number, cache:number, path:string} = {
                id: -1,
                cache: -1,
                path: ''
            }
            try{
                filePath = await Database.getDerivation(cacheID, nixDerivationHash)
            }
            catch(e){
                Logger.debug(`Derivation ${nixDerivationHash} not found in cache ${cacheID}`)

                return res.status(404).json({
                    error: 'Derivation not found',
                })
            }
            if(!filePath || filePath.id === -1 || filePath.cache === -1){
                Logger.debug(`Derivation ${nixDerivationHash} not found in cache ${cacheID}`)
                return res.status(404).json({
                    error: 'Derivation not found',
                })
            }
            //Load the derivation file and send it to the client
            const data = fs.existsSync(filePath.path)
            if(!data){
                return res.status(404).json({
                    error: 'Derivation not found',
                })
            }
            res.status(200).sendFile(filePath.path, (err)=>{
                if(err){
                    Logger.error(`Error while sending file: ${err}`)
                    return res.status(500).json({
                        error: 'Internal server error',
                    })
                }
            })
            await Database.logRequest(filePath.id, filePath.cache, 'outbound')
            Logger.debug(`Sent derivation ${nixDerivationHash} from cache ${cacheID} to ${req.ip}`)
            return
        }

        await wrap().then(async ()=>{
            await Database.close()
            return
        })
        .catch(async (err) => {
            Logger.error(`Error while sending file: ${err}`)
            return res.status(500).json({
                error: 'Internal server error',
            })
        })
    }
]
