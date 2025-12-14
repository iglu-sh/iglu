import bodyParser, {type Request, type Response} from "express";
import {randomUUID} from "node:crypto";
import {isAuthenticated} from "../../../../../utils/middlewares/auth.ts";
import {Cache, Cache_signing_key, db} from "@iglu-sh/common";
import type {cache, cache_signing_key_link} from "@iglu-sh/types/core/db";
import Logger from "@iglu-sh/logger";

export const post = [
    bodyParser.json({limit: '50mb'}),
    async (req: Request, res: Response) => {
        if(req.method !== 'POST'){
            res.status(405).send('Method Not Allowed');
            return;
        }

        //Check if the user is authenticated
        const auth = await isAuthenticated(req, res, async () => {
            return true
        })
        if(!auth){
            return;
        }

        if(req.params.cache === undefined){
            res.status(404).send('Cache Not Found');
            return;
        }

        // Check if cache exists
        let cacheObject:null|cache = null
        let publicSigningKeys:Array<cache_signing_key_link>|null = null
        try{
            cacheObject = await new Cache(db.StaticDatabase).getByName(req.params.cache);
            publicSigningKeys = await new Cache_signing_key(db.StaticDatabase).getByCacheId(cacheObject.id)
        }
        catch(e){
            Logger.debug("Did not find cache by name or a signingkey in this cache in multipart-nar endpoint")
        }
        if(!cacheObject || !publicSigningKeys || publicSigningKeys.length === 0){
            res.status(400).send(`There is no public signing key for this cache, add one by using cachix generate-keypair ${cacheObject?.name ?? "unkown cache"}. Alternatively the cache you are trying to access does not exist.`)
            return;
        }

        if(req.query.compression !== 'zst' && req.query.compression !== 'xz'){
            Logger.debug("Invalid compression type in multipart-nar endpoint")
            return res.status(400).json({
                error: 'Invalid compression type, expected zstd or xz',
            })
        }

        //Get a random uuid for relating the store hash to the upload
        let uid:string = randomUUID()
        let chars = [...uid]
        chars[0] = req.query.compression === 'xz' ? '0' : '1'
        //We set the first char of the uid to 0 if the compression is xz and to one if it is zstd
        //This is used to determine the compression type of the nar in the upload endpoint
        uid = chars.join('')

        return res.status(200).json({
            "narId": uid,
            "uploadId": uid,
        })
    }
]
