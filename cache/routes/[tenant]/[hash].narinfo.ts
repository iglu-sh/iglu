/*
* This file reports the narinfo of a given hash in a given cache.
* It is used by the nix client to fetch the narinfo of a store path and has to be in this format:
* ```text
* StorePath: /nix/store/<hash>-<suffix>
* URL: nar/<hash>
* Compression: <compression>
* FileHash: sha256:<filehash>
* FileSize: <filesize>
* NarHash: <narhash>
* NarSize: <narsize>
* References: <references>
* Deriver: <deriver>
* Sig: <cache name>:<sig>
* ```
* (Although the sig part can work without the cache name, it is recommended to include it)
* */

import type {Request, Response } from "express";
import z from "zod";
import MakeRestResponse from "../../../shared/utils/rest/MakeResponse";
import Tenants from "../../../shared/db/DAO/tenants";
import Derivation_tenant_link from "../../../shared/db/DAO/derivation_tenant_link";
import IPFiltering from "../../../shared/utils/rest/IPFiltering";

const param_schema = z.object({
    tenant: z.string(),
    hash: z.string()
})
export const get = [
    IPFiltering(),
    async (req:Request, res:Response)=>{
    const verified_params = param_schema.safeParse(req.params) 
    if(!verified_params.success){
        return res.status(400).json(MakeRestResponse(
            400,
            'Malformed Query',
            true,
            {
                'error_description': 'Your request was malformed'
            }
        ))
    }
    const params = verified_params.data
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
    const links_in_cache = await new Derivation_tenant_link().getByNixStoreHashes([params.hash], tenant.id)
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
    const nar = links_in_cache[0].derivations_id
    const narInfo = `StorePath: /nix/store/${nar.cstorehash}-${nar.cstoresuffix}
URL: nar/${nar.cstorehash}
Compression: ${nar.compression}
FileHash: sha256:${nar.cfilehash}
FileSize: ${nar.cfilesize}
NarHash: ${nar.cnarhash}
NarSize: ${nar.cnarsize}
References: ${JSON.parse(nar.creferences).join(" ")}
Deriver: ${nar.cderiver}
Sig: ${tenant.name}:${nar.csig}
`
    return res.status(200).send(narInfo)
}]
