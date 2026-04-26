import type { Request, Response } from "express";
import bodyParser from "express";
import IPFiltering from "../../../../../shared/utils/rest/IPFiltering";
export const post = [
    IPFiltering(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        console.log(req.body);
        console.log(req.headers);
        return res.status(200).json({
            id: "apollo",
            agents: {
                izanami: {
                    id: "019d9aaf-cfe7-7000-8cd7-7d6f3e43b48e",
                    url: "http://localhost:3000/api/v1/",
                },
            },
        });
    },
];
