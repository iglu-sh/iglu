import type { Request, Response } from "express";
import bodyParser from "express";
export const get = [
    bodyParser.json(),
    async (req: Request, res: Response) => {
        console.log(req.params, req.query);
        return res.status(200).json({});
    },
];
