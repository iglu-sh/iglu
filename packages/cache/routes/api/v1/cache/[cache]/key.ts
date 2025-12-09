//This route adds a new private key to the cache
import bodyParser, {type NextFunction, type Request, type Response} from "express";
import {isAuthenticated} from "../../../../../utils/middlewares/auth.ts";
import db from "../../../../../utils/db.ts";
import Logger from "@iglu-sh/logger";
export const post = [
    bodyParser.json(),
    async (req: Request, res: Response, next: NextFunction) => {
        if(req.method !== 'POST'){
            res.status(405).send('Method Not Allowed');
            return;
        }

        const cacheName = req.params.cache as string;
        if(!cacheName){
            return res.status(400).json({
                error: 'Missing cache name',
            })
        }
        //Check if the request is authenticated
        const auth = await isAuthenticated(req, res, next)
        if(!auth || !req.headers.authorization){
            return;
        }

        //Check if the request has a publicKey
        if(!req.body.publicKey){
            Logger.debug('Missing publicKey object')
            return res.status(400).json({
                error: 'Missing publicKey object',
            })
        }

        //Insert the public key into the database
        const Database = new db();
        const cacheID = await Database.getCacheID(cacheName);
        if(cacheID === -1){
            res.status(404).send('Cache Not Found');
            await Database.close()
            return;
        }
        const publicKey = req.body.publicKey;
        try{
            await Database.appendPublicKey(cacheID, publicKey, req.headers.authorization.split(" ")[1] as string);
            res.status(200).json({
                message: 'Public key added successfully',
            })
        }
        catch(e){
            Logger.error(`Error adding public key: ${e}`);
            res.status(500).json({
                error: 'Internal Server Error',
            })
        }

        await Database.close()
    }
]
