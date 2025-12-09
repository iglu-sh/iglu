import bodyParser, {type Request, type Response} from "express";
import db from "../../../../../utils/db.ts";
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
        if(req.params.cache === undefined || await Database.getCacheID(req.params.cache) === -1){
            res.status(404).send('Cache Not Found');
            await Database.close()
            return;
        }

        //Validate if the body is valid (i.e it is a JSON Array of only strings)
        req.body.map((x: any) => {
            if(typeof x !== 'string'){
                res.status(400).send('Invalid Body');
                return;
            }
        })

        if(!Array.isArray(req.body) || req.body.map((x: any)=> typeof x === 'string').includes(false)){
            res.status(400).send('Invalid Body');
            return;
        }

        const pathsInDB = await Database.getAvailablePaths(req.params.cache, req.body)

        //Build a new Array with the paths that are not in the database
        const pathsNotInDB = req.body.filter((x: string) => !pathsInDB.includes(x))

        return res.status(200).json(pathsNotInDB)
    }
]
