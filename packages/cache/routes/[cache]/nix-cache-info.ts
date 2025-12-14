/*
* This file returns the Nix cache info for a given cache.
* It has to be in this format:
* ```text
* StoreDir: /nix/store
* WantMassQuery: 1
* Priority: <priority>
* ```
* */

import type { Request, Response } from "express";
import Logger from "@iglu-sh/logger";
import {Cache, db} from "@iglu-sh/common";
import type {cache} from "@iglu-sh/types/core/db";
export const get = [
    async (req: Request, res: Response) => {
        if(req.method !== 'GET'){
            res.status(405).send('Method Not Allowed');
            return;
        }

        const cacheName = req.params.cache as string;
        if(!cacheName){
            return res.status(400).json({
                error: 'Missing cache name',
            })
        }

        async function wrap(){
            let cacheObject:cache|null = null;
            try{
                cacheObject = await new Cache(db.StaticDatabase).getByName(cacheName)
            }
            catch (e) {
                Logger.debug(`Did not find cache by name in nix-cache-info route`);
            }
            if(!cacheObject){
                res.status(404).send('Cache Not Found');
                return;
            }

            if(!cacheObject.ispublic){
                res.status(403).send('Cache Not Public');
            }

            return res.status(200).send(`
StoreDir: /nix/store
WantMassQuery: 1
Priority: ${cacheObject.priority}
`)
        }

        await wrap()
            .catch((err)=>{
                Logger.error(`Error while getting cache info ${err}`)
                res.status(500).json({
                    error: 'Internal Server Error',
                })
            })
    }
]
