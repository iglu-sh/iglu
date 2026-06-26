import StorageProvider from "./StorageProvider"
import {CompleteMultipartUploadCommand, CreateMultipartUploadCommand, S3Client, UploadPartCommand} from "@aws-sdk/client-s3"
import {getSignedUrl} from "@aws-sdk/s3-request-presigner"
import { Configuration } from "../utils/cache";
import { Logger } from "../logger";

export type part = {
    eTag: string;
    partNumber: number;
};


export class S3 extends StorageProvider {
    private static client:S3Client | undefined; 
    private static bucket:string;

    public override init(): void{
        const conf = Configuration.getConfig()
        if(conf.storage.storage_type != "S3"){
            throw new Error("bug(shared::files::S3::init): S3 is not selected as the storage backend but the init() function of it was called regardless. This is a bug.") 
        } 
        if(!conf.storage.s3){
            throw new Error("panic(shared::files::S3::init): S3 is selected as the storage backend, however you have not defined the s3 section in your config. Referr to the docs for more information")
        }
        S3.client = new S3Client({
            region: "us-east-1",
            credentials: {
                accessKeyId: conf.storage.s3.access_key_id,
                secretAccessKey: conf.storage.s3.secret_access_key
            },
            forcePathStyle: true,
            endpoint: conf.storage.s3.endpoint,
            requestChecksumCalculation: "WHEN_REQUIRED",
            responseChecksumValidation: "WHEN_REQUIRED"
        })
        S3.bucket = conf.storage.s3.bucket
    } 

    /**
    * @param {string} tenant The tenant this upload is referring to
    * @param {string} upload_id The upload_id this upload is referring to
    * @returns {Promise<string>} The Upload ID 
    * @throws {Error} If S3 is unable to return an Upload ID
    * */
    public static async getUploadID(tenant:string, upload_id:string):Promise<string>{
        if(!S3.client){
            throw new Error("panic(shared::files::S3::getUploadID): Unable to getAll before S3 client is initialized")
        }

        const cmd = new CreateMultipartUploadCommand({
            Bucket: S3.bucket,
            Key: `uploads/${tenant}/${upload_id}`
        })
        const cmd_return = await S3.client.send(cmd);
        if(!cmd_return.UploadId){
            Logger.error("panic(shared::files::S3::getUploadURL): Unable to get upload ID for Multipart Upload")
            throw new Error("panic(shared::files::S3::getUploadURL): Unable to get upload ID for Multipart Upload")
        }
        console.log('UploadId returned', cmd_return.UploadId)
        
        return cmd_return.UploadId
    }

    /**
    * @param {string} s3_upload_id The S3 Upload ID (returned by calling S3.getUploadID)
    * @param {number} part_number The part of the upload
    * @param {string} upload_id The Upload id of the Upload Table
    * @param {string} tenant The tenant to upload to
    * @returns {Promise<string>} The URL (expires in 900 seconds)
    * @throws {Error}
    * */
    public static async getUploadURL(tenant:string, upload_id: string, s3_upload_id:string, part_number: number):Promise<string>{
        if(!S3.client){
            throw new Error("panic(shared::files::S3::getUploadID): Unable to getAll before S3 client is initialized")
        }
        console.log('Upload Id passed', s3_upload_id)
        const cmd = new UploadPartCommand({
            Bucket: S3.bucket,
            Key: `uploads/${tenant}/${upload_id}`,
            UploadId: s3_upload_id.trim(),
            PartNumber: part_number
        })

        return getSignedUrl(S3.client, cmd, {expiresIn: 900})
    }

    /**
    * @param {string} s3_upload_id The S3 Upload ID (returned by calling S3.getUploadID)
    * @param {string} upload_id The Upload id of the Upload Table
    * @param {string} tenant The tenant to upload to
    * @param {part} etags The etags given by the cachix client
    * @returns {Promise<string>} The URL (expires in 900 seconds)
    * @throws {Error}
    * */
    public static async completeMultipartUpload(tenant:string, upload_id: string, s3_upload_id:string, etags:Array<part>):Promise<void>{
        if(!S3.client){
            throw new Error("panic(shared::files::S3::getUploadID): Unable to completeMultipartUpload before S3 client is initialized")
        }
        const cmd = new CompleteMultipartUploadCommand({
            Bucket: S3.bucket,
            Key: `uploads/${tenant}/${upload_id}`,
            UploadId: s3_upload_id,
            MultipartUpload: {
                Parts: etags.map(({partNumber, eTag})=>({
                    PartNumber: partNumber,
                    ETag: eTag
                }))
            }
        }) 
        await S3.client.send(cmd)
    }

    /**
     * @description Stores a given file (name and buffer) into a tenant directory (tenant). It is expected that this function also tries to call the createTenant function if required
     * @param {string} tenant
     * @param {string} name
     * @param {Buffer} data
     * @returns {Promise<void>}
     * */
    public async store(tenant: string, name: string, data: Buffer): Promise<void>{
        throw new Error("panic(shared::files::S3::init): Store called on S3 Storage.")
    };

    /**
     * @description Gets a given file (name) from a tenant directory (tenant)
     * @param {string} name
     * @param {string} tenant
     * @returns {Promise<Buffer | string>}
     * */
    public async get(tenant: string, name:string):Promise<Buffer | null>{
        /*
        const file = S3.client?.file(`${tenant}/${name}`)
        if(!file){
            return null
        }
        const arrayBuffer = await file.arrayBuffer()
        return Buffer.from(arrayBuffer)
        */
        return null
    }

    /**
     * @description Gets all files from a given tenant directory
     * @param {string} tenant
     * @returns {Promise<Array<string>>}
     * */
    public override async getAll(tenant:string): Promise<Array<string> | null>{
        /*
        if(!S3.client){
            throw new Error("panic(shared::files::S3::getAll): Unable to getAll before S3 client is initialized")
        }
        let allKeys: string[] = [];
        let continuationToken: string | undefined;

        do {
            const response = await S3.client?.list({
              prefix: tenant,
              maxKeys: 1000, // Max allowed per request
              continuationToken,
            });

            // Extract keys from the response
            const keys = response.contents?.map(obj => obj.key) || [];
            allKeys.push(...keys);

            // Prepare token for next page if truncated
            continuationToken = response.nextContinuationToken;
        } while (continuationToken);

        return allKeys;
        */
        return null
    }


    /**
     * @description Creates a tenant directory or whatever we use to store s3
     * @param {string} tenant
     * @returns {Promise<void>}
     * @throws {Error} if it could not be created
     * */
    public override async createTenant(tenant:string):Promise<void>{
        /*
        if(!S3.client){
            throw new Error("panic(shared::files::S3::createTenant): Unable to createTenant before S3 client is initialized")
        }
        
        await S3.client.write(`${tenant}/`, "");
        */
    }

    /**
     * @description Combines an upload into a single file
     * @param {string} tenant
     * @param {string} upload_id
     * @param {string} hash
     * @param {string} name
     * @param {part} parts
     * @returns {Promise<void>}
     * @throws {Error} On write error OR if hash validation fails
     * */
    public override async combine(
        tenant: string,
        upload_id: string,
        hash: string,
        name: string,
        parts: Array<part>,
    ): Promise<void>{
        if(!S3.client){
            throw new Error("panic(shared::files::S3::createTenant): Unable to combine before S3 client is initialized")
        }
        // For S3, CompleteMultipartUpload requires the s3_id which is not available through
        // the StorageProvider interface. Callers must invoke S3.completeMultipartUpload() directly.
    }
}
