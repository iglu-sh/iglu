/*
* This file returns the Nix cache info for a given cache.
* It has to be in this format:
* ```text
* StoreDir: /nix/store
* WantMassQuery: 1
* Priority: <priority>
* ```
* */

import db from "../../utils/db";
import type { Request, Response } from "express";
import Logger from "@iglu-sh/logger";
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

        const Database = new db();
        async function wrap(){
            const cacheID = await Database.getCacheID(cacheName);
            if(cacheID === -1){
                res.status(404).send('Cache Not Found');
                return;
            }

            const cacheInfo = await Database.getCacheInfo(cacheID);
            if(!cacheInfo){
                res.status(404).send('Cache Not Found');
                return;
            }
            if(!cacheInfo.isPublic){
                res.status(403).send('Cache Not Public');
            }

            return res.status(200).send(`
StoreDir: /nix/store
WantMassQuery: 1
Priority: ${cacheInfo.priority}
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
