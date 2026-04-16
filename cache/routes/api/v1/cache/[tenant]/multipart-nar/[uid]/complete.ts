import Authentication from "../../../../../../../../shared/utils/rest/Authentication";
import bodyParser from 'express'
import type {Request, Response} from 'express'
import z from "zod";
import MakeRestResponse from "../../../../../../../../shared/utils/rest/MakeResponse";
import Uploads from "../../../../../../../../shared/db/DAO/uploads";
import Derivations from "../../../../../../../../shared/db/DAO/derivation";
import Signing_Keys from "../../../../../../../../shared/db/DAO/signing_keys";
import Tenants from "../../../../../../../../shared/db/DAO/tenants";
import Derivation_tenant_link from "../../../../../../../../shared/db/DAO/derivation_tenant_link";
import { Filesystem } from "../../../../../../../../shared/files/Filesystem";

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
        cStoreSuffix: z.string()
    }),
    parts: z.array(z.object({
        eTag: z.string(),
        partNumber: z.number()
    }))
})
const params_schema = z.object({
    tenant: z.string(),
    uid: z.string()
})

export const post = [
    Authentication(),
    bodyParser.json(),
    async (req:Request, res:Response) => {
        const verified_params = params_schema.safeParse(req.params)
        const verified_body = body_schema.safeParse(req.body)
        if(!verified_body.success || !verified_params.success){
            return res.status(400).json(MakeRestResponse(
                400,
                'Malformed Body',
                true,
                {
                    'error_description': 'The provided request body is not valid'
                }
            ))
        }
        const body = verified_body.data
        const upload = await new Uploads().getById(verified_params.data.uid)
        if(upload === null){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    'error_description': 'The provided upload ID is either invalid or does not exist'
                }
            ))
        }

        // Combine the files:
        await new Filesystem().combine(
            upload.tenants_id.id,
            upload.id,
            body.narInfoCreate.cFileHash,
            `${body.narInfoCreate.cStoreHash}-${body.narInfoCreate.cStoreSuffix}.${upload.compression}`,
            body.parts
        )

        const signing_key = await new Signing_Keys().getByApiKeyId(upload.signed_by.id)
        if(signing_key === null){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    'error_description': 'The provided upload ID is either invalid or does not exist'
                }
            ))
        }
        const tenants = await new Tenants().getByName(verified_params.data.tenant)
        if(!tenants[0]){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    'error_description': 'This tenant does not exist'
                }
            ))
        }
        const derivation = await new Derivations().insert({
            id: 'n/a',
            cderiver: body.narInfoCreate.cDeriver,
            cfilehash: body.narInfoCreate.cFileHash,
            cnarhash: body.narInfoCreate.cNarHash,
            cnarsize: body.narInfoCreate.cNarSize.toString(),
            creferences: JSON.stringify(body.narInfoCreate.cReferences),
            csig: body.narInfoCreate.cSig,
            cstorehash: body.narInfoCreate.cStoreHash,
            cstoresuffix: body.narInfoCreate.cStoreSuffix,
            compression: upload.compression,
            signing_keys_id: signing_key,
            parts: JSON.stringify(body.parts) 
        })

        await new Derivation_tenant_link().insert({
            id: 'n/a',
            derivations_id: derivation,
            tenants_id: tenants[0]
        })

        return res.status(200).send()
    }
]
