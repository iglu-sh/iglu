import { Api_keys, Api_keys_tenants_link } from "@iglu-sh/shared/db";
import { Logger } from "@iglu-sh/shared/logger";
import type { tenant } from "@iglu-sh/shared/types";
import { FilterFeatures, hashApiKey, MakeRestResponse } from "@iglu-sh/shared/utils";
import { json, type Request, type Response } from "express";
import z from "zod";

const expected_header_schema = z.object({
    authorization: z.string(),
});
const expected_body_schema = z.object({
    id: z.uuid(),
    name: z.string(),
    tenants: z.array(z.uuid()),
});

export const patch = [
    FilterFeatures("rest"),
    json(),
    async (req: Request, res: Response) => {
        const parsed_headers = expected_header_schema.safeParse(req.headers);
        if (!parsed_headers.success || !parsed_headers.data.authorization.split(" ")[1]) {
            return res.status(403).json(
                MakeRestResponse(403, "Access Forbidden", true, {
                    error_details:
                        "You are not allowed to access this cache (no auth header presented)",
                }),
            );
        }

        const parsed_body = expected_body_schema.safeParse(req.body);
        if (!parsed_body.success) {
            return res.status(400).json(
                MakeRestResponse(400, "Malformed Request Body", true, {
                    error_details: "Your request body was malformed!",
                }),
            );
        }

        const api_key = await new Api_keys().getByHash(
            hashApiKey(parsed_headers.data.authorization.split(" ")[1] as string),
        );
        if (api_key === null) {
            return res.status(401).json(
                MakeRestResponse(401, "Unauthorized", true, {
                    error_details:
                        "You are not allowed to access this tenant (API Key not recognized)",
                }),
            );
        }

        const subject_api_key =
            parsed_body.data.id === api_key.id
                ? api_key
                : await new Api_keys().getById(parsed_body.data.id);
        if (subject_api_key === null) {
            return res.status(401).json(
                MakeRestResponse(400, "Malformed Request", true, {
                    error_details: "The key given in your id field does not exist.",
                }),
            );
        }

        const tenants_for_key = await new Api_keys_tenants_link().getByApiKey(api_key.id);
        const tenants_allowed_as_id = tenants_for_key.map((x) => x.tenants_id.id);
        const tenants_to_modify: Array<tenant> = [];
        for (const requested_tenant of parsed_body.data.tenants) {
            const tenant_obj = tenants_for_key.filter(
                (x) => x.tenants_id.id === requested_tenant,
            )[0]?.tenants_id;
            if (!tenants_allowed_as_id.includes(requested_tenant) || !tenant_obj) {
                return res.status(401).json(
                    MakeRestResponse(401, "Unauthorized", true, {
                        error_details:
                            "You are not allowed to edit some of the caches you requested in your requested tenants key.",
                    }),
                );
            }

            tenants_to_modify.push(tenant_obj);
        }
        const tenants_for_subject = await new Api_keys_tenants_link().getByApiKey(
            subject_api_key.id,
        );
        const subject_tenants_as_strings = tenants_for_subject.map((x) => x.tenants_id.id);
        const intersect_map: Array<{
            requested: string | null;
            db: string | null;
        }> = [];
        for (const requested_tenant of parsed_body.data.tenants) {
            intersect_map.push({
                requested: requested_tenant,
                db: subject_tenants_as_strings.includes(requested_tenant) ? requested_tenant : null,
            });
        }
        for (const subject_tenant of subject_tenants_as_strings) {
            // If this is included in the request, then it is already in the intersect map and we won't need to add it again
            if (parsed_body.data.tenants.includes(subject_tenant)) continue;
            intersect_map.push({
                requested: parsed_body.data.tenants.includes(subject_tenant)
                    ? subject_tenant
                    : null,
                db: subject_tenant,
            });
        }
        try {
            for (const map_entry of intersect_map) {
                // In this case we want to delete the tenant link
                if (map_entry.requested === null) {
                    const tenant = tenants_for_subject.filter(
                        (x) => x.tenants_id.id === map_entry.db,
                    );
                    if (!tenant[0])
                        throw new Error(
                            "Cannot unlink api key from tenant: Did not find tenant in tenants_for_subject",
                        );
                    await new Api_keys_tenants_link().delete(tenant[0]);
                }

                // In this case we want to add the tenant link
                if (map_entry.db === null) {
                    const tenant = tenants_for_key.filter(
                        (x) => x.tenants_id.id === map_entry.requested,
                    );
                    if (!tenant[0])
                        throw new Error(
                            "Cannot add api key to tenant: Did not find tenant in tenants_for_key",
                        );
                    await new Api_keys_tenants_link().insert({
                        ...tenant[0],
                        api_keys_id: subject_api_key,
                        id: "n/a",
                    });
                }

                // If both are not null then we don't need to do anything because that means the key already is in there and shouldn't be modified
            }
            await new Api_keys().update({
                ...subject_api_key,
                name: parsed_body.data.name,
            });
            return res.status(200).json(
                MakeRestResponse(200, "Success", false, {
                    information: "Request completed successfully",
                }),
            );
        } catch (e) {
            Logger.debug(`Failed to modify Api key: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was unable to process your request. Please try again.",
                }),
            );
        }
    },
];
