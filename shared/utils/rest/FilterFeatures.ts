import type { NextFunction, Request, Response } from "express";
import Logger from "@/logger";
import { Configuration } from "../cache/Configuration";
import MakeRestResponse from "./MakeResponse";

type feature_flags = "deployment";
export default (feature_flag: feature_flags) =>
    //biome-ignore lint/correctness/noUnusedFunctionParameters: Will be used in the future
    async (req: Request, res: Response, next: NextFunction) => {
        if (
            feature_flag === "deployment" &&
            !Configuration.getConfig().deployments.enable_deployments
        ) {
            Logger.debug("[FilterFeatures] Blocking Route due to: Deployments not enabled");
            return res.status(503).json(
                MakeRestResponse(503, "Service not enabled", true, {
                    error_details:
                        "This feature is not enabled. Enable it by setting enable_deployments = true in your config.toml",
                }),
            );
        }

        next();
    };

/**
 * @description Filters websockets based on if the features are enabled or not in the config
 * @param {feature_flags} feature_flag The flag to determine
 * @returns {boolean} Wether the deployment should be blocked or not
 * */
export function FilterFeaturesWebSocket(feature_flag: feature_flags): boolean {
    if (
        feature_flag === "deployment" &&
        !Configuration.getConfig().deployments.enable_deployments
    ) {
        Logger.debug("[FilterFeatures] Blocking Route due to: Deployments not enabled");
        return true;
    }

    return false;
}
