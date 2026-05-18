import Logger from '@/logger'
import { Derivation_tenant_link, Derivations, Tenants } from '@/shared/db'
import { Filesystem } from '@/shared/files'
import {Authentication, FilterFeatures, IPFiltering, MakeRestResponse} from '@iglu-sh/shared/utils'
import type { Request, Response } from 'express'
import z from 'zod'


const expected_route_params = z.object({
    tenant: z.string(),
    derivation_id: z.uuid()
})

export const get = [
    FilterFeatures('rest'),
    IPFiltering(),
    Authentication(),
    async (req: Request, res:Response) => {
        const route_params = expected_route_params.safeParse(req.params)
        if(!route_params.success){
            return res.status(404).json(MakeRestResponse(
                404,
                'Invalid Params',
                true,
                {
                    error_details: "Your route params are not in the correct format. This endpoint does not accept cstorehashes as the derivation_id!"
                }
            ))
        }

        const tenant_db = await new Tenants().getByName(route_params.data.tenant)
        if(!tenant_db[0]){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    error_details: "The tenant requested does not exist on this server"
                }
            ))
        }

        const derivation = await new Derivation_tenant_link().getByDerivationID(route_params.data.derivation_id, tenant_db[0].id)
        if(derivation === null){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    error_details: "The derivation that was requested is not cached in this tenant."
                }
            ))
        }

        return res.status(200).json(MakeRestResponse(200, 'Found', false, [{
            ...derivation.derivations_id,
            signing_keys_id: {
                ...derivation.derivations_id.signing_keys_id,
                api_keys_id: {
                    ...derivation.derivations_id.signing_keys_id.api_keys_id,
                    hash: "<ommited>"
                }
            } 
        }]))
    }
]

export const del = [
    FilterFeatures('rest'),
    IPFiltering(),
    Authentication(),
    async (req: Request, res: Response) => {
        const route_params = expected_route_params.safeParse(req.params)
        if(!route_params.success){
            return res.status(404).json(MakeRestResponse(
                404,
                'Invalid Params',
                true,
                {
                    error_details: "Your route params are not in the correct format. This endpoint does not accept cstorehashes as the derivation_id!"
                }
            ))
        }

        const tenant_db = await new Tenants().getByName(route_params.data.tenant)
        if(!tenant_db[0]){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    error_details: "The tenant requested does not exist on this server"
                }
            ))
        }

        const derivation = await new Derivation_tenant_link().getByDerivationID(route_params.data.derivation_id, tenant_db[0].id)
        if(derivation === null){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    error_details: "The derivation that was requested is not cached in this tenant."
                }
            ))
        }

        try{
            await new Derivation_tenant_link().delete(derivation) 
            await new Derivations().delete(derivation.derivations_id)
            await new Filesystem().delete(
                `${derivation.derivations_id.cstorehash}-${derivation.derivations_id.cstoresuffix}.${derivation.derivations_id.compression}`,
                tenant_db[0].id
            )
            return res.status(201).json(MakeRestResponse(
                201,
                'Success',
                false,
                {
                    information: 'Derivation deleted successfully'
                }

            ))
        }
        catch(e){
            Logger.error(`Could not delete derivation: ${e}`)
            return res.status(500).json(MakeRestResponse(
                500,
                'Internal Server Error',
                true,
                {
                    error_details: "Iglu was unable to handle your request, try again!"
                }
            ))
        }
    }
]
