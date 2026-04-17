import type { Request, Response } from "express";
import bodyParser from "express";
import z from "zod";
import Derivations from "../../../../../../../../shared/db/DAO/derivation";
import Derivation_tenant_link from "../../../../../../../../shared/db/DAO/derivation_tenant_link";
import Signing_Keys from "../../../../../../../../shared/db/DAO/signing_keys";
import Tenants from "../../../../../../../../shared/db/DAO/tenants";
import Uploads from "../../../../../../../../shared/db/DAO/uploads";
import { Filesystem } from "../../../../../../../../shared/files/Filesystem";
import Authentication from "../../../../../../../../shared/utils/rest/Authentication";
import IPFiltering from "../../../../../../../../shared/utils/rest/IPFiltering";
import MakeRestResponse from "../../../../../../../../shared/utils/rest/MakeResponse";
import Logger from "@/logger";
import Requests from "../../../../../../../../shared/db/DAO/request";

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
                    error_description: "The provided request body is not valid",
                }),
            );
        }
        const body = verified_body.data;
        const upload = await new Uploads().getById(verified_params.data.uid);
        if (upload === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_description: "The provided upload ID is either invalid or does not exist",
                }),
            );
        }

        // Combine the files:
        await new Filesystem().combine(
            upload.tenants_id.id,
            upload.id,
            body.narInfoCreate.cFileHash,
            `${body.narInfoCreate.cStoreHash}-${body.narInfoCreate.cStoreSuffix}.${upload.compression}`,
            body.parts,
        );

        const signing_key = await new Signing_Keys().getByApiKeyId(upload.signed_by.id);
        if (signing_key === null) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_description: "The provided upload ID is either invalid or does not exist",
                }),
            );
        }
        const tenants = await new Tenants().getByName(verified_params.data.tenant);
        if (!tenants[0]) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_description: "This tenant does not exist",
                }),
            );
        }
        try{
            const derivation = await new Derivations().insert({
                id: "n/a",
                cderiver: body.narInfoCreate.cDeriver,
                cfilehash: body.narInfoCreate.cFileHash,
                cfilesize: body.narInfoCreate.cFileSize,
                cnarhash: body.narInfoCreate.cNarHash,
                cnarsize: body.narInfoCreate.cNarSize.toString(),
                creferences: JSON.stringify(body.narInfoCreate.cReferences),
                csig: body.narInfoCreate.cSig,
                cstorehash: body.narInfoCreate.cStoreHash,
                cstoresuffix: body.narInfoCreate.cStoreSuffix,
                compression: upload.compression,
                signing_keys_id: signing_key,
                parts: JSON.stringify(body.parts),
            });

            const derivation_tenant_link = await new Derivation_tenant_link().insert({
                id: "n/a",
                derivations_id: derivation,
                tenants_id: tenants[0],
            });

            await new Requests().insert({
                id: 'n/a',
                derivations_tenants_links: derivation_tenant_link.id,
                direction: 'inbound',
                date: Date.now().toString(),
                url: `/api/v1/cache/${derivation_tenant_link.tenants_id.name}/multipart-nar/${upload.id}/complete`
            })

            await new Uploads().delete(upload)
        }
        catch(e){
            Logger.error(`Failed to create derivation: ${e}`)
            return res.status(500).json(MakeRestResponse(
                500,
                'Internal Server Error',
                true,
                {
                    'error_description': 'Iglu was not able to finish your upload. Please try again.'
                }
            ))
        }

        return res.status(200).send();
    },
];
