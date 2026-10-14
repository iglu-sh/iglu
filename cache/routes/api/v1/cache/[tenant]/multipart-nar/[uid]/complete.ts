import type { openapi_definiton, signing_key } from "@iglu-sh/shared";
import {
    Derivation_tenant_link,
    Derivations,
    Requests,
    Signing_Keys,
    Tenants,
    Uploads,
} from "@iglu-sh/shared/db";
import { Keypairs } from "@iglu-sh/shared/db/DAO/keypairs";
import { Filesystem } from "@iglu-sh/shared/files";
import { Logger } from "@iglu-sh/shared/logger";
import { Authentication, IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import { decrypt_key } from "@iglu-sh/shared/utils/crypto/encrypt_decrypt_keypair";
import verify_nar_info_signature, {
    build_nar_sig,
} from "@iglu-sh/shared/utils/crypto/verify_nar_info_signature";
import { error_response_schema } from "@iglu-sh/shared/utils/zod/zod_rest_schemas";
import type { Request, Response } from "express";
import bodyParser from "express";
import z from "zod";

const body_schema = z.object({
    narInfoCreate: z.object({
        cDeriver: z.string(),
        cFileHash: z.string(),
        cFileSize: z.number(),
        cNarHash: z.string(),
        cNarSize: z.number(),
        cReferences: z.array(z.string()),
        cSig: z.string(),
        cStoreHash: z.string(),
        cStoreSuffix: z.string(),
    }),
    parts: z.array(
        z.object({
            eTag: z.string(),
            partNumber: z.number(),
        }),
    ),
});
const params_schema = z.object({
    tenant: z.string(),
    uid: z.string(),
});

export const openapi: openapi_definiton = {
    meta: {
        path: "/api/v1/cache/{tenant}/multipart-nar/{uid}/complete",
        authentication_required: true,
        tags: ["api/v1/cache", "cachix"],
        feature_filtered: false,
    },
    routes: [
        {
            method: "post",
            description:
                "Finish a given upload by uploading cachix meta information about the derivation",
            summary: "Finish a given upload",
            request: {
                params: z.object({
                    tenant: z.string(),
                    uid: z.string(),
                }),
                body: {
                    description: "Meta information about the derivation",
                    required: true,
                    content: {
                        "application/json": {
                            schema: body_schema,
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Empty success response",
                    content: {},
                },
                400: {
                    description: "Returned if your body was not in the correct format",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                408: {
                    description:
                        "Returned if the upload ID you were using is no longer valid (timed out)",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                422: {
                    description: "The given upload ID was not found",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                424: {
                    description:
                        "The given nar fingerprint is invalid (i.e not signed by a recognized key)",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
                500: {
                    description: "Iglu encountered an error finishing the upload",
                    content: {
                        "application/json": {
                            schema: error_response_schema,
                        },
                    },
                },
            },
        },
    ],
};

export const post = [
    IPFiltering(),
    Authentication(),
    bodyParser.json(),
    async (req: Request, res: Response) => {
        const verified_params = params_schema.safeParse(req.params);
        const verified_body = body_schema.safeParse(req.body);
        if (!verified_body.success || !verified_params.success) {
            return res.status(400).json(
                MakeRestResponse(400, "Malformed Body", true, {
                    error_details: "The provided request body is not valid",
                }),
            );
        }
        const body = verified_body.data;
        const upload = await new Uploads().getById(verified_params.data.uid);
        if (upload === null) {
            return res.status(422).json(
                MakeRestResponse(422, "Not found", true, {
                    error_details: "The provided upload ID is either invalid or does not exist",
                }),
            );
        }

        if (upload.timeout < Date.now() / 1000) {
            await new Uploads().delete(upload);
            return res.status(408).json(
                MakeRestResponse(408, "Gone", true, {
                    error_details: "This Upload ID is no longer valid (timed out)",
                }),
            );
        }

        const tenants = await new Tenants().getByName(verified_params.data.tenant);
        if (!tenants[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "This tenant does not exist",
                }),
            );
        }

        // This variable is assigned in two ways: Either here, if this is a tenant that uses client side signing OR further down, if this cache uses server-side signing
        let signing_key = await new Signing_Keys().getByApiKeyId(upload.signed_by.id);
        if (signing_key === null && tenants[0].signing_method === "client") {
            return res.status(422).json(
                MakeRestResponse(422, "Not found", true, {
                    error_details: "The provided upload ID is either invalid or does not exist",
                }),
            );
        }

        // Verify signature of nix derivation
        // A nix derivation has to be verified in a comma seperated list of the values we get from the cachix client:
        // 1;<StorePath>;<NarHash>;<NarSize>;<References>
        //
        // The "1" is the version of the nix fingerprinting format and is hardcoded as 1 until a new version comes out
        // References must be sorted lexiconologically
        const fingerprint = `1;/nix/store/${body.narInfoCreate.cStoreHash}-${body.narInfoCreate.cStoreSuffix};${body.narInfoCreate.cNarHash};${body.narInfoCreate.cNarSize};${body.narInfoCreate.cReferences
            .sort()
            .map((x) => {
                return `/nix/store/${x}`;
            })
            .join(",")}`;
        if (tenants[0].signing_method === "client") {
            const verified = await verify_nar_info_signature(
                fingerprint,
                body.narInfoCreate.cSig,
                // here, the signing key will always be defined so we can just tell the compiler that
                (signing_key as signing_key).key,
            );

            if (!verified) {
                return res.status(424).json(
                    MakeRestResponse(424, "Invalid Signature", true, {
                        error_details:
                            "The uploaded fingerprint is not signed by the appropiate public key",
                    }),
                );
            }
        }

        try {
            const stored_derivations = await new Derivations().getByNixStoreHashes([
                body.narInfoCreate.cStoreHash,
            ]);

            const eligble_derivations = stored_derivations.filter(
                (d) => d.cfilehash === body.narInfoCreate.cFileHash,
            );
            if (eligble_derivations.length > 1) {
                Logger.error(
                    "bug(api::v1::cache::upload::complete): Unable to reliably determine which derivation should be used to link to current cache. Please report this to iglu! (Using first occurence)",
                );
            }

            let derivation = eligble_derivations[0] ?? undefined;
            let signature = body.narInfoCreate.cSig;
            if (tenants[0].signing_method === "server") {
                const keypair = await new Keypairs().getByTenant(tenants[0].id);
                if (!keypair) {
                    Logger.error(
                        "bug(complete): Unable to find server-side-signing keypair associated with tenant. This is a bug, please report it to iglu.",
                    );
                    throw new Error(
                        "bug(complete): Unable to find server-side-signing keypair associated with tenant. This is a bug, please report it to iglu.",
                    );
                }

                signature = build_nar_sig(fingerprint, decrypt_key(keypair.private_key));
                signing_key = keypair.signing_keys_id;
            }

            if (!signing_key) {
                Logger.error(
                    "bug(complete): Unable to determine signing key that signed the uploaded derivation. This is a bug, please report this.",
                );
                throw new Error(
                    "bug(complete): Unable to determine signing key that signed the uploaded derivation. This is a bug, please report this.",
                );
            }
            // In theory the second part of this if-statement is not needed but since this is a "high-risk" operation I've elected to keep it in here as a sort of "last line of defence"
            if (!derivation || derivation.cfilehash !== body.narInfoCreate.cFileHash) {
                Logger.debug(`Creating new Derivation`);
                derivation = await new Derivations()
                    .insert({
                        id: "n/a",
                        cderiver: body.narInfoCreate.cDeriver,
                        cfilehash: body.narInfoCreate.cFileHash,
                        cfilesize: body.narInfoCreate.cFileSize,
                        cnarhash: body.narInfoCreate.cNarHash,
                        cnarsize: body.narInfoCreate.cNarSize.toString(),
                        creferences: JSON.stringify(body.narInfoCreate.cReferences),
                        cstorehash: body.narInfoCreate.cStoreHash,
                        cstoresuffix: body.narInfoCreate.cStoreSuffix,
                        compression: upload.compression,
                        parts: JSON.stringify(body.parts),
                    })
                    .catch((err) => {
                        Logger.debug(
                            `Failed to create Derivation: ${err}. This is usually due to multiple pushes to the same path at once`,
                        );
                        return undefined;
                    });
                if (!derivation) {
                    return res.status(400).json(
                        MakeRestResponse(400, "Unable to create derivation", true, {
                            error_details: "Unable to create derivation, try again later.",
                        }),
                    );
                }
                // Only combine if the derivation is newly created
                try {
                    // Combine the files:
                    await new Filesystem().combine(
                        upload.id,
                        body.narInfoCreate.cFileHash,
                        `${derivation.id}`,
                        body.parts,
                    );
                } catch (e) {
                    // Clean up if the combination fails
                    await new Derivations().delete(derivation);
                    Logger.debug(`Could not combine files: ${e}`);
                    return res.status(500).json(
                        MakeRestResponse(500, "Internal Server Error", true, {
                            error_details:
                                "Iglu could not process this request, please try again later",
                        }),
                    );
                }
            } else {
                Logger.debug(`Re-Using already cached derivation with id: ${derivation.id}`);
            }

            const derivation_tenant_link = await new Derivation_tenant_link()
                .insert({
                    id: "n/a",
                    derivations_id: derivation,
                    tenants_id: tenants[0],
                    pin: false,
                    csig: signature,
                    signing_keys_id: signing_key,
                })
                .catch((_err) => {
                    Logger.debug(
                        `Could not create derivation_tenant_link. This is usually due to multiple cachix clients pushing at once. Rejecting with 400`,
                    );
                    return null;
                });
            if (derivation_tenant_link === null) {
                return res.status(400).json(
                    MakeRestResponse(400, "Unable to create derivation", true, {
                        error_details: "Unable to create derivation, try again later.",
                    }),
                );
            }

            await new Requests().insert({
                id: "n/a",
                derivations_tenants_links: derivation_tenant_link.id,
                direction: "inbound",
                date: Date.now(),
                url: `/api/v1/cache/${derivation_tenant_link.tenants_id.name}/multipart-nar/${upload.id}/complete`,
            });

            await new Uploads().delete(upload);
        } catch (e) {
            Logger.error(`Failed to create derivation: ${e}`);
            return res.status(500).json(
                MakeRestResponse(500, "Internal Server Error", true, {
                    error_details: "Iglu was not able to finish your upload. Please try again.",
                }),
            );
        }

        return res.status(200).send();
    },
];
