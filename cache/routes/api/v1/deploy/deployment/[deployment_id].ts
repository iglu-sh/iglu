import type { Request, Response } from "express";
import z from "zod";
import { Agents_deployments_links } from "../../../../../../shared/db/DAO/agents_deployments_links";
import Deployment_keys from "../../../../../../shared/db/DAO/deployment_keys";
import { hashApiKey } from "../../../../../../shared/utils/crypto/api_key_generation";
import MakeRestResponse from "../../../../../../shared/utils/rest/MakeResponse";

const expected_header_schema = z.object({
    authorization: z.string(),
});

const expected_params_schema = z.object({
    deployment_id: z.string(),
});
export const get = [
    async (req: Request, res: Response) => {
        const parsed_expected_header = expected_header_schema.safeParse(req.headers);
        const parsed_expected_params = expected_params_schema.safeParse(req.params);
        if (
            !parsed_expected_header.success ||
            !parsed_expected_params.success ||
            parsed_expected_header.data.authorization.split(" ").length !== 2 ||
            !parsed_expected_header.data.authorization.split(" ")[1]
        ) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details: "You are not permitted to view this deployment",
                }),
            );
        }

        const bearer_token = parsed_expected_header.data.authorization.split(" ")[1] as string;
        const token_in_db = await new Deployment_keys().getByHash(hashApiKey(bearer_token));
        if (token_in_db === null) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details: "You are not permitted to view this deployment",
                }),
            );
        }

        const deployment_in_db = await new Agents_deployments_links().getById(
            parsed_expected_params.data.deployment_id,
        );
        if (deployment_in_db === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The requested deployment cannot be found.",
                }),
            );
        }

        const return_object = {
            closureSize: deployment_in_db.closure_size,
            createdOn: new Date(deployment_in_db.started_at).toISOString(),
            finishedOn:
                deployment_in_db.finished_at === null
                    ? null
                    : new Date(deployment_in_db.finished_at).toISOString(),
            id: deployment_in_db.id,
            index: 1,
            startedOn: new Date(deployment_in_db.started_at).toISOString(),
            status: deployment_in_db.status,
            storePath: deployment_in_db.store_path,
        };
        return res.status(200).json(return_object);
        /*
         *{
    "closureSize": null,
    "createdOn": "2026-04-20T08:29:32.53608Z",
    "finishedOn": null,
    "id": "a7003da8-b666-44c6-a174-897ce052012a",
    "index": 3,
    "startedOn": null,
    "status": "Pending",
    "storePath": "/nix/store/something.nar"
}
        * */
    },
];
