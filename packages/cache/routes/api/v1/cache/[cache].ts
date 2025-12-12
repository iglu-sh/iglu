import bodyParser, { type Request, type Response } from 'express'
import {isAuthenticated} from "../../../../utils/middlewares/auth.ts";
import {Cache, Cache_signing_key, db} from "@iglu-sh/common";
import type {cache, cache_signing_key_link} from "@iglu-sh/types/core/db";
import Logger from "@iglu-sh/logger";
export const get = [
    bodyParser.json(),
    async (req: Request, res: Response) => {
        if(req.method !== 'GET'){
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

        const Database = db.StaticDatabase;
        const cacheDB = new Cache(Database)
        const cacheSigningKeyLinkDB = new Cache_signing_key(Database)
        try{
            let cacheObject:cache|null = null
            if(!req.params.cache){
                res.status(400).send('Bad Request: Missing cache parameter');
                return;
            }
            try{
                cacheObject = await cacheDB.getByName(req.params.cache)
            }
            catch(e){
                Logger.debug("Did not find cache by name in get cache info endpoint")
            }
            if(!cacheObject){
                res.status(404).send('Cache Not Found');
                return;
            }
            let pskLinks:null|cache_signing_key_link[] = null
            try{
                pskLinks = await cacheSigningKeyLinkDB.getByCacheId(cacheObject.id)
            }
            catch (e) {
                Logger.debug(`No public signing key links found for cache id ${cacheObject.id}`)
            }
            if(!pskLinks || pskLinks.length === 0){
                res.status(400).send(`There is no public signing key for this cache, add one by using cachix generate-keypair ${cacheObject.name}`)
                return
            }
            // Return in cachix expected format
            return res.status(200).json({
                githubUsername: cacheObject.githubusername,
                isPublic: cacheObject.ispublic,
                name: cacheObject.name,
                permission: cacheObject.permission,
                preferredCompressionMethod: cacheObject.preferredcompressionmethod.toUpperCase(),
                publicSigningKeys: pskLinks.flatMap(x => x.public_signing_key.public_signing_key),
                uri: cacheObject.uri,
                priority: cacheObject.priority,
            })
        }
        catch(e){
            Logger.error(`Error while getting cache info: ${e}`);
            return res.status(500).send('Internal Server Error');
        }
    }
]
