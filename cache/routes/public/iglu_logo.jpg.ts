import type { Request, Response } from "express";
import { FilterFeatures } from "@/shared/utils";

export const get = [
    FilterFeatures("info"),
    async (_req: Request, res: Response) => {
        res.status(200).sendFile(`${process.cwd()}/routes/public/iglu_logo.jpg`);
    },
];
