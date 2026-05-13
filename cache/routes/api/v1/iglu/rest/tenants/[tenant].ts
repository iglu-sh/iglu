import type { Request, Response } from "express";
import { head_route } from "@/cache/lib/rest/tenants/[tenants]/head";
import { Authentication, FilterFeatures, IPFiltering } from "@/shared/utils";

export const head = [
    IPFiltering(),
    Authentication(),
    FilterFeatures("rest"),
    async (_req: Request, res: Response) => {
        return await head_route(res);
    },
];
