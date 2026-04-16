import Logger from "@/logger";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import createRouter from "express-file-routing";
import Startup from "./startup";
const app = express();

await Startup();

//Log all responses
app.use((req: Request, res: Response, next: NextFunction) => {
    Logger.logRequest(req.url, req.method);
    res.on("finish", () => {
        Logger.logResponse(req.url, req.method, res.statusCode);
    });
    next();
});

await createRouter(app, {
    directory: path.join(__dirname, "routes"),
    additionalMethods: ["ws"],
});

app.use((req: Request, res: Response) => {
    Logger.logRequest(`[CATCHALL] ${req.url}`, req.method);
    res.status(404).send("This endpoint does not exist");
});

Logger.debug("Startup Complete");
app.listen(3000, "0.0.0.0", () => {
    Logger.debug("Running on 3000");
});
