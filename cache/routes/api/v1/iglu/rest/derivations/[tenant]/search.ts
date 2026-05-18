import { Derivation_tenant_link, Tenants } from '@/shared/db'
import {Authentication, FilterFeatures, IPFiltering, MakeRestResponse} from '@iglu-sh/shared/utils'
import type { Request, Response } from 'express'
import z from 'zod'


const expected_query_params = z.object({
    query: z.string()
}) 
const expected_route_params = z.object({
    tenant: z.string()
})
export const get = [
    FilterFeatures('rest'),
    IPFiltering(),
    Authentication(),
    async (req: Request, res: Response) => {
        const query_params = expected_query_params.safeParse(req.query)
        const route_params = expected_route_params.safeParse(req.params)
        if(!query_params.success || !route_params.success){
            return res.status(404).json(MakeRestResponse(
                404,
                'Invalid Params',
                true,
                {
                    error_details: "You have not provided the ?query param"
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

        const param_is_uuid = z.uuid().safeParse(query_params.data.query).success
        if(param_is_uuid){
            const derivation = await new Derivation_tenant_link().getByDerivationID(query_params.data.query, tenant_db[0].id)
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
                ...derivation,
                derivations_id: {
                    ...derivation.derivations_id,
                    signing_keys_id: {
                        ...derivation.derivations_id.signing_keys_id,
                        api_keys_id: {
                            ...derivation.derivations_id.signing_keys_id.api_keys_id,
                            hash: "<ommited>"
                        }
                    } 
                },
            }]))
        }

        const derivations = await new Derivation_tenant_link().searchByNixStoreHash(query_params.data.query, tenant_db[0].id)
        return res.status(200).json(MakeRestResponse(200, 'Found', false, derivations.map((derivation)=> {
            return {
                ...derivation,
                derivations_id: {
                    ...derivation.derivations_id,
                    signing_keys_id: {
                        ...derivation.derivations_id.signing_keys_id,
                        api_keys_id: {
                            ...derivation.derivations_id.signing_keys_id.api_keys_id,
                            hash: "<ommited>"
                        }
                    } 
                },
            }
        }))) 
    }
]
