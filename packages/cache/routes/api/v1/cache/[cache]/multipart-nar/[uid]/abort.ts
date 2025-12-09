//TODO: Implement (POST)

import bodyParser, {type NextFunction, type Request, type Response} from "express";

export const post = [
    bodyParser.json(),
    async (req:Request, res:Response, next:NextFunction)=>{
    }
]