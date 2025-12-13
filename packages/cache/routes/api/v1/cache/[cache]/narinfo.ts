import bodyParser, {type Request, type Response} from "express";
import {isAuthenticated} from "../../../../../utils/middlewares/auth.ts";
import {Cache, db, Hash_cache_link} from "@iglu-sh/common";
import type {cache_info} from "@iglu-sh/types";
import type {cache} from "@iglu-sh/types/core/db";
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

        if(!req.params.cache){
            res.status(404).send('Cache Not Found');
            return;
        }
        let cacheObject:null|cache = null
        try{
            cacheObject = await new Cache(db.StaticDatabase).getByName(req.params.cache);
        }
        catch(e){
            Logger.debug("Did not find cache by name in narinfo endpoint")
        }
        // Check if cache exists
        if(!cacheObject){
            res.status(404).send('Cache Not Found');
            return;
        }

        if(!Array.isArray(req.body) || req.body.map((x: any)=> typeof x === 'string').includes(false)){
            res.status(400).send('Invalid Body');
            return;
        }
        const hashesInDB = await new Hash_cache_link(db.StaticDatabase).getByCacheId(cacheObject.id).then((res)=>{
            return res.flatMap(x => x.hash.cnarhash)
        })

        //Build a new Array with the paths that are not in the database
        const pathsNotInDB = req.body.filter((x: string) => !hashesInDB.includes(x))

        return res.status(200).json(pathsNotInDB)
    }
]
