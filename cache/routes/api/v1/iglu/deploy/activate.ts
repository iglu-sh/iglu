import type { Request, Response } from "express";
import bodyParser from "express";
export const get = [
    bodyParser.json(),
    async (req: Request, res: Response) => {
        console.log(
            "activate request params=%s query=%s",
            JSON.stringify(req.params),
            JSON.stringify(req.query),
        );
        return res.status(200).json({});
    },
];
