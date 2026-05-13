import * as fs from "node:fs";
import type { derivation_tenant_link } from "@/db_types";
import Logger from "@/logger";
import { Derivation_tenant_link } from "../db/DAO/derivation_tenant_link";
import { Tenants } from "../db/DAO/tenants";
import { Uploads } from "../db/DAO/uploads";
import StorageProvider, { type part } from "./StorageProvider";

export class FilesystemProvider extends StorageProvider {
    /**
     * @description Initializes the FilesystemProvider
     * @returns {void}
     * @throws {Error} If there's no valid basepath
     * */
    private static basepath = process.env.FILESYSTEM_DIRECTORY as string;
    public override init(): void {
        if (!FilesystemProvider.basepath) {
            if (!process.env.FILESYSTEM_DIRECTORY) {
                throw new Error(
                    "panic(files::FilesystemProvider) No valid Filesystem directory given in process environment",
                );
            }
            FilesystemProvider.basepath = process.env.FILESYSTEM_DIRECTORY;
        }
        if (!fs.existsSync(FilesystemProvider.basepath)) {
            Logger.debug(
                `Filesystem basepath does not exist, creating it at ${FilesystemProvider.basepath}`,
            );
            fs.mkdirSync(FilesystemProvider.basepath, {
                recursive: true,
            });
        }
    }

    /**
     * @description Get the contents of a file
     * @returns {Promise<Buffer|null>}
     * @throws {Error} - If the given file does not exist
     * */
    public override async get(name: string, tenant: string): Promise<Buffer | null> {
        const requested_path = `${FilesystemProvider.basepath}/${tenant}/${name}`;
        if (!fs.existsSync(requested_path)) {
            Logger.debug(`File at ${requested_path} does not exist`);
            return null;
        }

        const file_content = fs.readFileSync(requested_path);

        return file_content;
    }

    /**
     * @description Returns all files in the given tenant folder
     * @returns {Promise<Array<string>|null>>}
     * */
    public override async getAll(tenant: string): Promise<Array<string> | null> {
        const requested_path = `${FilesystemProvider.basepath}/${tenant}`;
        if (!fs.existsSync(requested_path)) {
            Logger.debug(`Folder at ${requested_path} does not exist`);
            return null;
        }

        const folder_contents = fs.readdirSync(requested_path);
        return folder_contents;
    }

    /**
     * @description Deletes a given file
     * @returns {Promise<void>}
     * @throws {Error}
     * */
    public override async delete(tenant: string, name: string): Promise<void> {
        const requested_path = `${FilesystemProvider.basepath}/${tenant}/${name}`;
        if (!fs.existsSync(requested_path)) {
            Logger.debug(`File at ${requested_path} does not exist so it could not be unlinked`);
            throw new Error(
                `warn(files::FilesystemProvider): Tried to unlink a file that does not exist`,
            );
        }

        fs.unlinkSync(requested_path);
    }

    /**
     * @description Creates a tenant directory
     * @param {string} tenant
     * @returns {Promise<void>}
     * @throws {Error} If the directory already exists or couldn't otherwise be created
     * */
    public override async createTenant(tenant: string): Promise<void> {
        const requested_path = `${FilesystemProvider.basepath}/${tenant}`;
        if (fs.existsSync(requested_path)) {
            Logger.debug(
                `Tenant directory: ${requested_path} already exists and it was tried to create that again`,
            );
            throw new Error(
                `warn(files::FilesystemProvider): Tried to create a directory which already exists`,
            );
        }

        fs.mkdirSync(requested_path);
    }

    /**
     * @description Stores a file
     * @returns {Promise<void>}
     * @throws {Error} If the file could not be stored
     * */
    public override async store(tenant: string, name: string, data: Buffer): Promise<void> {
        const requested_path = `${FilesystemProvider.basepath}/${tenant}/${name}`;
        if (!fs.existsSync(`${FilesystemProvider.basepath}/${tenant}`)) {
            Logger.debug(`Could not store file with requested path: ${requested_path}`);
            Logger.debug(`Creating directory for tenant and trying if that works`);
            await this.createTenant(tenant);
            // If it still does not exist here we just throw
            if (!fs.existsSync(`${FilesystemProvider.basepath}/${tenant}`)) {
                Logger.error(`Tried to create tenant directory but was not successfull`);
                throw new Error(
                    `panic(files::FilesystemProvider): Could not create tenant directory`,
                );
            }
        }
        const stream = fs.createWriteStream(requested_path);
        stream.write(data);
    }

    /**
     * @description Combines an upload into a single file
     * @param {string} tenant
     * @param {string} upload_id
     * @param {string} hash
     * @param {string} name
     * @param {Array<part>} parts
     * @returns {Promise<void>}
     * @throws {Error} On write error OR if hash validation fails
     * */
    public override async combine(
        tenant: string,
        upload_id: string,
        hash: string,
        name: string,
        parts: Array<part>,
    ): Promise<void> {
        // Fetch all files in the folder
        const all_files = await this.getAll(tenant);
        if (all_files === null) {
            throw new Error(
                "panic(files::FilesystemProvider): Could not read all files from directory and thus cannot combine requested files for given upload id",
            );
        }

        const finalFilePath = `${FilesystemProvider.basepath}/${tenant}/${name}`;
        for (const part_item of parts) {
            if (
                !fs.existsSync(
                    `${FilesystemProvider.basepath}/${tenant}/${upload_id}.part-${part_item.partNumber}`,
                )
            ) {
                Logger.error(
                    `Part file ${part_item.partNumber} for upload id ${upload_id} does not exist`,
                );
                throw new Error(
                    `panic(files::FilesystemProvider): Part file ${part_item.partNumber} for upload id ${upload_id} does not exist`,
                );
            }
            fs.appendFileSync(
                finalFilePath,
                fs.readFileSync(
                    `${FilesystemProvider.basepath}/${tenant}/${upload_id}.part-${part_item.partNumber}`,
                ),
            );
            fs.unlinkSync(
                `${FilesystemProvider.basepath}/${tenant}/${upload_id}.part-${part_item.partNumber}`,
            );
        }

        // Validate if the hash is correct
        const actual_file_hash = await getFileHash(finalFilePath);

        if (actual_file_hash !== hash) {
            fs.unlinkSync(finalFilePath);
            throw new Error(
                `panic(files::FilesystemProvider): Hash mismatch detected in file ${finalFilePath}`,
            );
        }
    }

    /**
     * @description Gets a link for uploading to a nix client
     * @param {derivation_tenant_link} item
     * @returns {Promise<string|null>}
     * */
    public override async getLink(item: derivation_tenant_link): Promise<string | null> {
        const path = `${FilesystemProvider.basepath}/${item.tenants_id.id}/${item.derivations_id.cstorehash}-${item.derivations_id.cstoresuffix}.${item.derivations_id.compression}`;
        if (!fs.existsSync(path)) {
            return null;
        }
        return path;
    }

    /**
     * @description Clean the tenant directories, i.e remove all .part files and files of derivations no longer in the derivation_tenant_link table (should be called on cache startup)
     * @returns {Promise<void>}
     * */
    public override async clean(): Promise<void> {
        // First, check if uploads exist, and delete any files
        const all_uploads = await new Uploads().getAll();
        for (const upload of all_uploads) {
            Logger.debug(`Deleting files associated with interupted Upload ID ${upload.id}`);
            if (!fs.existsSync(`${FilesystemProvider.basepath}/${upload.tenants_id.id}`)) {
                Logger.debug(
                    `Tenant dir for tenant with id ${upload.tenants_id.id} does not exist but has upload associated with it, deleting upload and continuing`,
                );
                new Uploads().delete(upload);
                continue;
            }
            const all_files_in_tenant_dir = fs.readdirSync(
                `${FilesystemProvider.basepath}/${upload.tenants_id.id}`,
            );
            const files_matching_upload_id = all_files_in_tenant_dir.filter((x) =>
                x.includes(upload.id),
            );
            for (const file of files_matching_upload_id) {
                fs.unlinkSync(`${FilesystemProvider.basepath}/${upload.tenants_id.id}/${file}`);
            }
            new Uploads().delete(upload);
            Logger.debug(`Deleted upload ${upload.id}`);
        }

        const all_tenant_links = await new Derivation_tenant_link().getAll();
        for (const link of all_tenant_links) {
            // Check if the file exists
            const derivation_path = `${FilesystemProvider.basepath}/${link.tenants_id.id}/${link.derivations_id.cstorehash}-${link.derivations_id.cstoresuffix}.${link.derivations_id.compression}`;
            if (fs.existsSync(derivation_path)) {
                continue;
            }
            Logger.debug(
                `Did not find ${derivation_path} but it is stored as a derivation link. Deleting Derivation Link`,
            );
            await new Derivation_tenant_link().delete(link);
        }

        // We also need to make sure we do not have any "orphaned" files or tenant directories for tenants that do no longer exist
        const all_tenants = await new Tenants().getAll();
        const files_in_basepath = fs.readdirSync(`${FilesystemProvider.basepath}`);
        for (const tenant_dir of files_in_basepath) {
            if (all_tenants.filter((x) => x.id === tenant_dir).length === 0) {
                Logger.debug(
                    `Tenant ${tenant_dir} does not exist but has directory associated with it, deleting the directory`,
                );
                fs.rmSync(`${FilesystemProvider.basepath}/${tenant_dir}`, {
                    recursive: true,
                    force: true,
                });
                continue;
            }
            Logger.debug(
                `Scanning directory of tenant ${tenant_dir} to check for potentially orphaned files`,
            );
            const all_files_in_tenant = fs.readdirSync(
                `${FilesystemProvider.basepath}/${tenant_dir}`,
            );
            for (const file of all_files_in_tenant) {
                const link = await new Derivation_tenant_link().getByNixStoreHashes(
                    [file.split("-")[0] as string],
                    tenant_dir,
                );
                if (!link[0]) {
                    Logger.debug(
                        `File ${file} exists in ${tenant_dir} but it does not have a derivation link associated, deleting the file`,
                    );
                    fs.unlinkSync(`${FilesystemProvider.basepath}/${tenant_dir}/${file}`);
                }
            }
        }
    }
}
export async function getFileHash(path: string): Promise<string> {
    const hasher = new Bun.CryptoHasher("sha256");
    const file = Bun.file(path);
    for await (const chunk of file.stream()) {
        hasher.update(chunk);
    }

    return hasher.digest("hex");
}
