import {
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    type ListObjectsV2CommandInput,
    S3Client,
    UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Derivation_tenant_link, Tenants, Uploads } from "../db";
import { Logger } from "../logger";
import type { derivation_tenant_link } from "../types";
import { Configuration } from "../utils/cache";
import StorageProvider from "./StorageProvider";
export type part = {
    eTag: string;
    partNumber: number;
};
export class S3 extends StorageProvider {
    private static client: S3Client | undefined;
    private static bucket: string;
    public override init(): void {
        const conf = Configuration.getConfig();
        if (conf.storage.storage_type !== "s3") {
            throw new Error(
                "bug(shared::files::S3::init): S3 is not selected as the storage backend in your config but it got loaded by the filesystem provider, this is a bug please report this to https://github.com/iglu-sh/iglu",
            );
        }
        if (!conf.storage.s3) {
            throw new Error(
                "panic(shared::files::S3::init): S3 is selected as the storage backend, however you have not defined the s3 section in your config. Please refer to the docs for more information",
            );
        }

        S3.client = new S3Client({
            region: conf.storage.s3.region,
            credentials: {
                accessKeyId: conf.storage.s3.access_key_id,
                secretAccessKey: conf.storage.s3.secret_access_key,
            },
            forcePathStyle: conf.storage.s3.forcePathStyle,
            endpoint: conf.storage.s3.endpoint,
            requestChecksumCalculation: conf.storage.s3.request_checksum_calculation,
            responseChecksumValidation: conf.storage.s3.response_checksum_validation,
        });
        S3.bucket = conf.storage.s3.bucket;
    }

    /**
     * @description Generates an S3 Upload ID for a given iglu upload id
     * @param {string} tenant The tenant this upload is referring to
     * @param {string} upload_id The upload_id this upload is referring to
     * @returns {Promise<string>} The upload ID
     * @throws {Error} If S3 is unable to return an Upload ID
     * */
    public static async getUploadID(tenant: string, upload_id: string): Promise<string> {
        if (!S3.client) {
            throw new Error(
                "panic(shared::files::S3::getUploadID): Unable to getAll before S3 client is initialized",
            );
        }
        const cmd = new CreateMultipartUploadCommand({
            Bucket: S3.bucket,
            Key: `uploads/${tenant}/${upload_id}`,
        });

        const cmd_return = await S3.client.send(cmd);
        if (!cmd_return.UploadId) {
            Logger.error(
                "panic(shared::files::S3::getUploadURL): Unable to get upload ID for Multipart Upload",
            );
            throw new Error(
                "panic(shared::files::S3::getUploadURL): Unable to get upload ID for Multipart Upload",
            );
        }

        return cmd_return.UploadId;
    }

    /**
     * @description Gets a presigned Upload URL for a client to upload to
     * @param {string} s3_upload_id The S3 Upload ID (returned by calling S3.getUploadID)
     * @param {number} part_number The part of the upload
     * @param {string} upload_id The Upload id of the Upload Table
     * @param {string} tenant The tenant to upload to
     * @returns {Promise<string>} The URL (expires in 900 seconds)
     * @throws {Error}
     * */
    public static async getUploadURL(
        tenant: string,
        upload_id: string,
        s3_upload_id: string,
        part_number: number,
        md5: string,
    ): Promise<string> {
        if (!S3.client) {
            throw new Error(
                "panic(shared::files::S3::getUploadID): Unable to getUploadURL before S3 client is initialized",
            );
        }
        const cmd = new UploadPartCommand({
            Bucket: S3.bucket,
            Key: `uploads/${tenant}/${upload_id}`,
            UploadId: s3_upload_id.trim(),
            PartNumber: part_number,
            ChecksumMD5: md5,
        });

        return getSignedUrl(S3.client, cmd, { expiresIn: 900 });
    }

    /**
     * @description Gets a presigned DOWNLOAD URL for a client to upload to, if you want to get an upload url instead, call getUploadURL
     * @param {string} tenant The ID of the Tenant (not the name)
     * @param {string} derivation_id The ID of the Derivation
     * @returns {Promise<string>} The URL (expires in 3600 seconds aka 1 Hour)
     * @throws {Error}
     * */
    public static async getDownloadURL(tenant: string, derivation_id: string): Promise<string> {
        if (!S3.client) {
            throw new Error(
                "panic(shared::files::S3::getDownloadURL): Unable to get a download URL before S3 client is initialized",
            );
        }

        const derivation_tenant_link = await new Derivation_tenant_link().getByDerivationID(
            derivation_id,
            tenant,
        );
        if (!derivation_tenant_link) {
            throw new Error(
                "warn(shared::files::S3::getDownloadURL): Unable to generate download URL: Derivation Tenant link not found",
            );
        }

        const cmd = new GetObjectCommand({
            Bucket: S3.bucket,
            Key: `${derivation_tenant_link.tenants_id.id}/${derivation_tenant_link.derivations_id.cstorehash}-${derivation_tenant_link.derivations_id.cstoresuffix}.${derivation_tenant_link.derivations_id.compression}`,
        });

        return getSignedUrl(S3.client, cmd, { expiresIn: 3600 });
    }

    /**
     * @description Combines a given upload into a fully functional nix store derivation in the storage backend
     * @param {string} upload_id The **iglu** Upload ID
     * @param {string} hash The hash of the file that was just uploaded
     * @param {string} name The name of the file
     * @param {Array<part>} parts An array of eTag and partNumbers for the S3 Client to use
     * @returns {Promise<void>}
     * @throws {Error} On Write error OR if hash validation fails
     * */
    public override async combine(
        tenant: string,
        upload_id: string,
        hash: string,
        name: string,
        parts: Array<part>,
    ): Promise<void> {
        if (!S3.client) {
            throw new Error(
                "panic(shared::files::S3::combine): Unable to completeMultipartUpload before S3 client is initialized",
            );
        }
        const upload = await new Uploads().getById(upload_id);
        if (!upload) {
            throw new Error(
                `panic(shared::files::S3::combine): Unable to completeMultipartUpload as Upload with Iglu Upload ID: ${upload_id} was not found`,
            );
        }
        if (!upload.s3_id) {
            throw new Error(
                "bug(shared::files::S3::combine): Combine called on an upload that does not have an S3 ID associated with it",
            );
        }
        const cmd = new CompleteMultipartUploadCommand({
            Bucket: S3.bucket,
            Key: `uploads/${tenant}/${upload_id}`,
            UploadId: upload.s3_id,
            MultipartUpload: {
                Parts: parts.map(({ partNumber, eTag }) => ({
                    PartNumber: partNumber,
                    ETag: eTag,
                })),
            },
        });
        await S3.client.send(cmd);

        const copy_cmd = new CopyObjectCommand({
            Bucket: S3.bucket,
            CopySource: `${S3.bucket}/uploads/${upload.tenants_id.id}/${upload.id}`,
            Key: `${upload.tenants_id.id}/${name}`,
            MetadataDirective: "REPLACE",
            Metadata: { SHA256: hash },
        });
        await S3.client.send(copy_cmd);

        const delete_command = new DeleteObjectCommand({
            Bucket: S3.bucket,
            Key: `uploads/${upload.tenants_id.id}/${upload.id}`,
        });

        await S3.client.send(delete_command);
    }

    public override async getLink(item: derivation_tenant_link): Promise<string | null> {
        try {
            return S3.getDownloadURL(item.tenants_id.id, item.derivations_id.id);
        } catch (_e) {
            return null;
        }
    }

    /**
     * @description Gets the contents of a file and returns that
     * @param {string} name
     * @param {string} tenant
     * @returns {Promise<Buffer | null>} File Contents or null if file wasn't found
     * */
    public override async get(name: string, tenant: string): Promise<Buffer | null> {
        if (!S3.client) {
            throw new Error(
                "panic(shared::files::S3::get): Unable to get a file before S3 client is initialized",
            );
        }
        const cmd = new GetObjectCommand({
            Bucket: S3.bucket,
            Key: `${tenant}/${name}`,
        });
        const file = await S3.client.send(cmd);
        if (!file.Body) {
            return null;
        }

        return Buffer.from(await file.Body.transformToByteArray());
    }

    /**
     * @description Gets all files in the given tenant folder
     * @returns {Promise<Array<string|null>>}
     * */
    public override async getAll(tenant: string): Promise<Array<string> | null> {
        if (!S3.client) {
            throw new Error(
                "panic(shared::files::S3::getAll): Unable to getall Files before S3 client is initialized",
            );
        }

        let continuationToken: string | undefined;
        const files: string[] = [];

        do {
            const input: ListObjectsV2CommandInput = {
                Bucket: S3.bucket,
                Prefix: tenant,
                ContinuationToken: continuationToken,
                Delimiter: "/",
            };

            const response = await S3.client.send(new ListObjectsV2Command(input));

            for (const obj of response.Contents ?? []) {
                if (obj.Key && obj.Key !== tenant) {
                    files.push(obj.Key);
                }
            }
            for (const obj of response.CommonPrefixes ?? []) {
                if (obj.Prefix && obj.Prefix !== tenant) {
                    files.push(obj.Prefix);
                }
            }

            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        } while (continuationToken);

        return files;
    }

    /**
     * @description Deletes a given file
     * @param {string} tenant The tenant ID
     * @param {string} name The name of the file to delete
     * @returns {Promise<void>}
     * @throws {Error}
     * */
    public override async delete(tenant: string, name: string): Promise<void> {
        if (!S3.client) {
            throw new Error(
                "panic(shared::files::S3::delete): Cannot delete before S3 client is initialized",
            );
        }
        const cmd = new DeleteObjectCommand({
            Bucket: S3.bucket,
            Key: `${tenant}/${name}`,
        });
        await S3.client.send(cmd);
    }

    /**
     * @description Creates a tenant directory
     * @param {string} tenant
     * @returns {Promise<void>}
     * */
    public override async createTenant(tenant: string): Promise<void> {
        Logger.debug(`Skipping S3 tenant creation for ${tenant}, reason: Not necessary for S3`);
        //NOOP as S3 creates keys without us having to create directories seperately
    }

    /**
     * @description Stores a file
     * @returns {Promise<void>}
     * @throws {Error} If the file could not be stored
     * */
    public override async store(tenant: string, name: string, data: Buffer): Promise<void> {
        Logger.error(
            `bug(shared::files::S3::store): Store called on the S3 provider. For storing files using the S3 provider, use the multipart upload flow (Params: ${tenant}, ${name}, ${data.length})`,
        );
        throw new Error(
            "bug(shared::files::S3::store): Store called on the S3 provider. For storing files using the S3 provider, use the multipart upload flow",
        );
    }

    /**
     * @description Clean the tenant directories, i.e remove all .part files and files of derivations no longer in the derivation_tenant_link table (should be called on cache startup)
     * @returns {Promise<void>}
     * */
    public override async clean(): Promise<void> {
        if (!S3.client) {
            throw new Error(
                "panic(shared::files::S3::clean): clean called before S3 client initialized",
            );
        }
        const all_uploads = await new Uploads().getAll();
        for (const upload of all_uploads) {
            Logger.debug(`Deleting files associated with interupted Upload ID ${upload.id}`);
            const cmd = new DeleteObjectCommand({
                Bucket: S3.bucket,
                Key: `uploads/${upload.tenants_id.id}/${upload.id}`,
            });
            try {
                await S3.client.send(cmd);
                await new Uploads().delete(upload);
            } catch (e) {
                Logger.error(`Error while cleaning: ${e}`);
            }
        }

        // Fetch all tenants and all keys that are available in S3 so we only have to do this once
        const all_tenants = await new Tenants().getAll();
        const all_keys: Array<string> = [];
        for (const tenant of all_tenants) {
            const result = await this.getAll(`${tenant.id}/`);
            if (!result) continue;
            all_keys.push(...result);
        }

        // Delete all derivation_tenant_links that do not have files associated with them
        const all_derivation_tenant_links = await new Derivation_tenant_link().getAll();
        for (const link of all_derivation_tenant_links) {
            const key = `${link.tenants_id.id}/${link.derivations_id.cstorehash}-${link.derivations_id.cstoresuffix}.${link.derivations_id.compression}`;
            if (!all_keys.includes(key)) {
                Logger.debug(
                    `Did not find key: ${key} but derivation_tenant_link exists... deleting derivation_tenant_link`,
                );
                await new Derivation_tenant_link().delete(link);
            }
        }
        for (const key of all_keys) {
            if (key.endsWith("/")) continue;
            // Try to determine which link this key would be associated to
            const cstorehash = key.split("/")[1]?.split(".")[0]?.split("-")[0];
            const tenant = key.split("/")[0];
            if (!cstorehash || !tenant) {
                Logger.debug(
                    `Unable to determine either cstorehash or tenant, skipping key: ${key} (found cstorehash: ${cstorehash} and tenant: ${tenant})`,
                );
                continue;
            }
            const link = await new Derivation_tenant_link().getByNixStoreHashes(
                [cstorehash],
                tenant,
            );
            if (!link[0]) {
                Logger.debug(
                    `Found key in S3 that does not have a derivation tenant link associated, deleting...`,
                );
                const cmd = new DeleteObjectCommand({
                    Bucket: S3.bucket,
                    Key: key,
                });
                await S3.client.send(cmd);
            }
        }

        // We also need to make sure we do not have any "orphaned" files or tenant directories for tenants that do no longer exist
        const all_tenants_in_s3 = await this.getAll("");
        if (!all_tenants_in_s3) {
            Logger.debug(`Did not find any tenants in S3, continuing with cleanup`);
            return;
        }
        for (const tenant_in_s3 of all_tenants_in_s3) {
            // If this is true, then the tenant was not found and needs to be nuked from S3
            if (all_tenants.filter((x) => x.id === tenant_in_s3.replaceAll("/", "")).length === 0) {
                Logger.debug(
                    `Tenant ${tenant_in_s3.replaceAll("/", "")} does not exist but has directory associated with it, deleting the directory`,
                );
                const all_files_for_this_tenant = await this.getAll(tenant_in_s3);
                if (!all_files_for_this_tenant) continue;
                for (const file of all_files_for_this_tenant) {
                    const cmd = new DeleteObjectCommand({
                        Bucket: S3.bucket,
                        Key: file,
                    });
                    await S3.client.send(cmd);
                }
            }
        }
    }
}
