import path from "node:path";
import { Logger } from "@iglu-sh/shared/logger";
import { MakeRestResponse } from "@iglu-sh/shared/utils";
import { Configuration } from "@iglu-sh/shared/utils/cache";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import createRouter from "express-file-routing";
import expressWs from "express-ws";
import startup from "./lib/StartupCoordinator";

const { app } = expressWs(express());

await startup();

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

// Handles generic Errors such as JSON parser Errors.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    Logger.debug(`Caught otherwise uncaught Express error: ${err}, req URL: ${req.url}`);
    res.status(500).json(
        MakeRestResponse(500, "Internal Server Error", true, {
            error_description: "Iglu was unable to respond to your request. This one's on us.",
        }),
    );

    // We do not call next() here as this is the final res
});

Logger.debug("Startup Complete");
const { server } = Configuration.getConfig();

app.listen(server.port, server.interface, () => {
    Logger.debug(`Listening on ${server.interface}:${server.port}`);
});
