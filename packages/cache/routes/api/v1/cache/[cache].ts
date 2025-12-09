import bodyParser, { type Request, type Response } from 'express'
import db from "../../../../utils/db.ts";
import {isAuthenticated} from "../../../../utils/middlewares/auth.ts";
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

        const Database = new db();

        try{
            if(req.params.cache === undefined || await Database.getCacheID(req.params.cache) === -1){
                res.status(404).send('Cache Not Found');
                return;
            }
            const cache = await Database.getCacheInfo(await Database.getCacheID(req.params.cache))
            if(cache.publicSigningKeys.length === 0){
                res.status(400).send(`There is no public signing key for this cache, add one by using cachix generate-keypair ${cache.name}`)
                return
            }
            return res.status(200).json(cache)
        }
        catch(e){
            Logger.error(`Error while getting cache info: ${e}`);
            return res.status(200).send('Internal Server Error');
        }
    }
]
