import type {Request, Response} from 'express'
import z from "zod";
import MakeRestResponse from "../../../../shared/utils/rest/MakeResponse";
import Tenants from "../../../../shared/db/DAO/tenants";
import Derivation_tenant_link from "../../../../shared/db/DAO/derivation_tenant_link";
import IPFiltering from "../../../../shared/utils/rest/IPFiltering";
import { Filesystem } from '../../../../shared/files/Filesystem';
import Requests from '../../../../shared/db/DAO/request';
import Logger from '@/logger';

const param_schema = z.object({
    tenant: z.string(),
    derivation: z.string()
})

export const get = [
    IPFiltering(),
    async (req:Request, res:Response)=>{
        const validated_schema = param_schema.safeParse(req.params) 
        if(!validated_schema.success){
            return res.status(400).json(MakeRestResponse(
                400,
                'Malformed Query',
                true,
                {
                    'error_description': 'Your request was malformed'
                }
            ))
        }

        const params = validated_schema.data
        const tenant_list = await new Tenants().getByName(params.tenant)
        if(!tenant_list[0] || tenant_list.length !== 1){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    'error_description': 'The requested tenant does not exist'
                }
            ))
        }
        const tenant = tenant_list[0]

        // Check if the requested store hash is in this tenant 
        const links_in_cache = await new Derivation_tenant_link().getByNixStoreHashes([params.derivation], tenant.id)
        if(links_in_cache.length !== 1 || !links_in_cache[0]){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    'error_description': 'Your hash is in another castle.'
                }
            ))
        }
        
        // Get a path from the filesystem
        const link =  await new Filesystem().getLink(links_in_cache[0])
        if(link === null){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    'error_description': 'Your hash is in another castle.'
                }
            ))
        }
        Logger.debug(`Sending derivation ${links_in_cache[0].derivations_id.cstorehash} to client`)

        // Return the path as file
        await new Requests().insert({
            id: 'n/a',
            derivations_tenants_links: links_in_cache[0].id,
            direction: 'outbound',
            date: Date.now().toString(),
            url: `/${links_in_cache[0].tenants_id.name}/nar/${links_in_cache[0].derivations_id.cstorehash}`
        })
        return res.status(200).sendFile(link)
    }
    
]
