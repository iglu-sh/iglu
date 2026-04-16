import type {Request, Response} from 'express'
import bodyParser from 'express'
import Authentication from '../../../../../../../shared/utils/rest/Authentication'
import z from 'zod'
import Logger from '@/logger'
import MakeRestResponse from '../../../../../../../shared/utils/rest/MakeResponse'
const request_body_schema = z.object({
    contentMD5: z.string()
})
export const post = [
    Authentication(),
    bodyParser.json(),
    async (req:Request, res:Response)=>{
        let validated_schema:{
            contentMD5:string
        }
        try{
            const schema = request_body_schema.safeParse(req.body)
            if(schema.success === false){
                throw new Error('Zod schema validation failed')
            }
            validated_schema = schema.data
        } 
        catch(e){
            Logger.debug(`Initialization of Cachix Upload failed due to: No contentMD5 key (${e})`)
            return res.status(400).json(MakeRestResponse(
                400,
                'Malformed Body',
                true,
                {
                    'error_description': 'Your Request Body was malformed'
                }
            ))
        }
        const TENANT_NAME = req.params.tenant
        const UID = req.params.uid
        if(!TENANT_NAME || !UID || typeof TENANT_NAME !== 'string' || typeof UID !== 'string'){
            return res.status(400).json(MakeRestResponse(
                400,
                'Malformed Request',
                true,
                {
                    'error_description': 'Your Request Params were malformed'
                }
            ))
        }
        return res.status(200).json({
            uploadUrl: `${process.env.HOSTNAME}/api/iglu/v1/upload/${TENANT_NAME}/${UID}?md5=${validated_schema.contentMD5}`
        })
    }
]
