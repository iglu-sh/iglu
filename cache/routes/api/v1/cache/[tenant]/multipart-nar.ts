/*
*
*
* */

import Authentication from "../../../../../../shared/utils/rest/Authentication";
import bodyParser from 'express'
import type {Request, Response} from 'express'
import MakeRestResponse from "../../../../../../shared/utils/rest/MakeResponse";
import Api_keys from "../../../../../../shared/db/DAO/api_key";
import type { upload } from "@/db_types";
import Signing_Keys from "../../../../../../shared/db/DAO/signing_keys";
import Uploads from "../../../../../../shared/db/DAO/uploads";
import Tenants from "../../../../../../shared/db/DAO/tenants";
import Logger from "@/logger";
export const post = [
    Authentication(),
    bodyParser.json(),
    async (req:Request, res:Response) => {
        const TENANT_NAME = req.params.tenant 
        const COMPRESSION = req.query.compression

        if(!TENANT_NAME || Array.isArray(TENANT_NAME)){
            return res.status(404).json(MakeRestResponse(
                404,
                'Not found',
                true,
                {
                    error_description: 'The requested Tenant was not found on this server'
                }
            ))
        }

        if(!COMPRESSION || Array.isArray(COMPRESSION) || typeof COMPRESSION !== 'string' || !['zst', 'xz'].includes(COMPRESSION)){
            return res.status(400).json(MakeRestResponse(
                400,
                'Invalid Compression Parameter',
                true,
                {
                    error_description: 'Your requested compression is unavailable or you have not provided any param of that name'
                }
            ))
        }

        // Check if there's a signing key associated with the API key that is trying to upload
        if(!req.headers.authorization){
            return res.status(403).json(MakeRestResponse(
                403,
                'Forbidden - No autorization',
                true,
                {
                    'error_description': "You do not have a authorization header set, or your Header is not in the Bearer format. This ressource is not available without one"
                }
            ))
        }

        const auth_header = req.headers.authorization.split(" ")[1]
        if(!auth_header){
            return res.status(401).json(MakeRestResponse(
                401,
                'Unauthorized',
                true,
                {
                    'error_description': "This key is not recognized"
                }
            ))
        }

        const api_key = await new Api_keys().getByHash(auth_header) 
        if(api_key === null){
            return res.status(401).json(MakeRestResponse(
                401,
                'Unauthorized',
                true,
                {
                    'error_description': "This key is not recognized"
                }
            ))
        }

        const signing_key_associated_with_api_key = await new Signing_Keys().getByApiKeyId(api_key.id)
        if(signing_key_associated_with_api_key === null){
            return res.status(400).json(MakeRestResponse(
                400,
                'No Signing Key',
                true,
                {
                    'error_description': "The API Key you are using does not have a signing key associated with it"
                }
            ))
        }
        // Get the tenant we are referring to
        const tenant = await new Tenants().getByName(TENANT_NAME)
        if(!tenant[0] || tenant.length !== 1){
            return res.status(404).json(MakeRestResponse(
                400,
                'Not found',
                true,
                {
                    'error_description': "This tenant wasn't found on this server"
                }
            ))
        }

        const compression_in_upload = COMPRESSION === 'xz' ? 'xz' : 'zstd' 
        // Insert a new upload into the uploads table
        let upload_element:upload
        try{
            upload_element = await new Uploads().insert({
                id: 'n/a',
                tenants_id: tenant[0],
                signed_by: api_key,
                md5: '<none>',
                compression: compression_in_upload
            })
        }
        catch(e){
            Logger.error(`Could not create upload: ${e}`)
            return res.status(500).json(MakeRestResponse(
                500,
                'Internal Server Error',
                true,
                {
                    'error_description': "Iglu wasn't able to handle this request. Try again later!"
                }
            ))
        }

        return res.status(200).json({
            "uploadId": upload_element.id,
            "narId": upload_element.id 
        })
    }
];
