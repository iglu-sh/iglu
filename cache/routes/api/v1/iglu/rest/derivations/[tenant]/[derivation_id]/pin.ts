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
    async (req:Request, res: Response) => {
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
            await new Derivation_tenant_link().update({
                ...derivation,
                pin: !derivation.pin 
            })
            return res.status(200).json(MakeRestResponse(
                200,
                'Success',
                false,
                {
                    information: !derivation.pin ? 'Derivation pinned successfully' : 'Derivation unpinned successfully'
                }
            ))
        }
        catch(e){
            return res.status(500).json(MakeRestResponse(500, 'Internal Server Error', true, {
                error_details: 'Iglu was unable to handle your request. Please try again!'
            }))
        }
    }
]
