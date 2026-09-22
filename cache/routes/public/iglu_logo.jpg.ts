import { FilterFeatures } from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";

export const get = [
    FilterFeatures("info"),
    async (_req: Request, res: Response) => {
        res.status(200).sendFile(`${process.cwd()}/routes/public/iglu_logo.jpg`);
    },
];
