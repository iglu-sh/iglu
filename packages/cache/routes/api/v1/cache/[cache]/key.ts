//This route adds a new private key to the cache
import bodyParser, {type NextFunction, type Request, type Response} from "express";
import {isAuthenticated} from "../../../../../utils/middlewares/auth.ts";
import Logger from "@iglu-sh/logger";
import {Api_key, Cache, Cache_signing_key, db, Public_signing_key} from "@iglu-sh/common";
import type {api_key, cache} from "@iglu-sh/types/core/db";
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
        const Database = db.StaticDatabase;
        const cacheDB = new Cache(Database)
        const publicSigningKeyDB = new Public_signing_key(Database)
        const cacheSigningKeyLink = new Cache_signing_key(Database)
        const apiKeyDB = new Api_key(Database)
        let cacheObject:cache|null = null
        let apiKeyObject:api_key|null = null
        try{
            cacheObject = await cacheDB.getByName(cacheName)
            apiKeyObject = await apiKeyDB.getByKey(req.headers.authorization.split(" ")[1] as string)
        }
        catch(e){
            Logger.debug("Did not find cache by name in key endpoint")
        }
        if(!cacheObject || !apiKeyObject){
            res.status(404).send('Cache Not Found');
            return;
        }
        const publicKey = req.body.publicKey;
        try{
            const createdPSKEntry = await publicSigningKeyDB.createNewEntry({
                id: "<empty>",
                api_key: apiKeyObject,
                name: "Key uploaded by Cachix",
                public_signing_key: publicKey,
                description: "Public signing key uploaded by Cachix via API",
                created_at: new Date(),
            })
            if(!createdPSKEntry.rows[0]){
                throw new Error('Failed to create public signing key entry');
            }
            await cacheSigningKeyLink.createNewEntry({
                cache: cacheObject,
                public_signing_key: createdPSKEntry.rows[0],
            })
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
    }
]
