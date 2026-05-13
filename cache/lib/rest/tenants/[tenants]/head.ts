import type { Response } from "express";

export async function head_route(res: Response): Promise<Response> {
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Date", new Date(Date.now()).toISOString());
    res.setHeaders(headers);
    return res.status(200).send();
}
