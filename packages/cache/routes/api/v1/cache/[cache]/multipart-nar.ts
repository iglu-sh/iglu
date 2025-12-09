import db from "../../../../../utils/db.ts";
import bodyParser, {type Request, type Response} from "express";
import {randomUUID} from "node:crypto";
import {isAuthenticated} from "../../../../../utils/middlewares/auth.ts";

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

        const Database = new db();
        // Check if cache exists
        //@ts-ignore
        const cacheID = await Database.getCacheID(req.params.cache)
        if(req.params.cache === undefined || cacheID === -1){
            res.status(404).send('Cache Not Found');
            await Database.close()
            return;
        }
        const cacheInfo = await Database.getCacheInfo(cacheID)
        await Database.getCacheID(req.params.cache)
        if(cacheInfo.publicSigningKeys.length === 0){
            await Database.close()
            res.status(400).send(`There is no public signing key for this cache, add one by using cachix generate-keypair ${cacheInfo.name}`)
            return;
        }

        if(req.query.compression !== 'zst' && req.query.compression !== 'xz'){
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