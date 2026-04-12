import bodyParser, { type Request, type Response } from "express";

/*
 * This endpoint accepts only GET requests from the Cachix Client
 * */

export const get = [
    bodyParser.json(),
    async (req: Request, res: Response) => {
        console.log(req);
        console.log(req.body);
    },
];
