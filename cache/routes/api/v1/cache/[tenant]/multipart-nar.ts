/*
*
*
* */

import Authentication from "../../../../../../shared/utils/rest/Authentication";
import bodyParser from 'express'
import type {Request, Response} from 'express'
import MakeRestResponse from "../../../../../../shared/utils/rest/MakeResponse";
import Api_keys from "../../../../../../shared/db/DAO/api_key";
import Signing_Keys from "../../../../../../shared/db/DAO/signing_keys";
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

        let upload_id = Bun.randomUUIDv7()
        // As Cachix does not provide this information after this endpoint we encode it directly into the upload id 
        const compression_in_upload = COMPRESSION === 'xz' ? 0 : 1 
        const parts = [...upload_id] 
        parts[0] = compression_in_upload.toString()
        upload_id = parts.join('')
        return res.status(200).json({
            "uploadId": upload_id,
            "narId": upload_id
        })
    }
];
