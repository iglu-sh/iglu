import * as fs from "node:fs";
import type { derivation_tenant_link } from "@iglu-sh/shared";
import { Logger } from "@iglu-sh/shared/logger";
import { Derivation_tenant_link } from "../db/DAO/derivation_tenant_link";
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
    public override async get(name: string): Promise<Buffer | null> {
        const requested_path = `${FilesystemProvider.basepath}/${name}`;
        if (!fs.existsSync(requested_path)) {
            Logger.debug(`File at ${requested_path} does not exist`);
            return null;
        }

        const file_content = fs.readFileSync(requested_path);

        return file_content;
    }

    /**
     * @description Returns all files
     * @returns {Promise<Array<string>|null>>}
     * */
    public override async getAll(): Promise<Array<string> | null> {
        const requested_path = `${FilesystemProvider.basepath}`;
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
    public override async delete(name: string): Promise<void> {
        const requested_path = `${FilesystemProvider.basepath}/${name}`;
        if (!fs.existsSync(requested_path)) {
            Logger.debug(`File at ${requested_path} does not exist so it could not be unlinked`);
            throw new Error(
                `warn(files::FilesystemProvider): Tried to unlink a file that does not exist`,
            );
        }

        fs.unlinkSync(requested_path);
    }

    /**
     * @description Stores a file
     * @returns {Promise<void>}
     * @throws {Error} If the file could not be stored
     * */
    public override async store(name: string, data: Buffer): Promise<void> {
        const requested_path = `${FilesystemProvider.basepath}/${name}`;
        const stream = fs.createWriteStream(requested_path);
        stream.write(data);
    }

    /**
     * @description Combines an upload into a single file
     * @param {string} upload_id
     * @param {string} hash
     * @param {string} name
     * @param {Array<part>} parts
     * @returns {Promise<void>}
     * @throws {Error} On write error OR if hash validation fails
     * */
    public override async combine(
        upload_id: string,
        hash: string,
        name: string,
        parts: Array<part>,
    ): Promise<void> {
        // Fetch all files in the folder
        const all_files = await this.getAll();
        if (all_files === null) {
            throw new Error(
                "panic(files::FilesystemProvider): Could not read all files from directory and thus cannot combine requested files for given upload id",
            );
        }

        const finalFilePath = `${FilesystemProvider.basepath}/${name}`;

        if (fs.existsSync(finalFilePath)) {
            const actual_file_hash = await getFileHash(finalFilePath);
            if (actual_file_hash === hash) {
                for (const part_item of parts) {
                    fs.unlinkSync(
                        `${FilesystemProvider.basepath}/${upload_id}.part-${part_item.partNumber}`,
                    );
                }
                return;
            }
        }

        for (const part_item of parts) {
            if (
                !fs.existsSync(
                    `${FilesystemProvider.basepath}/${upload_id}.part-${part_item.partNumber}`,
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
                    `${FilesystemProvider.basepath}/${upload_id}.part-${part_item.partNumber}`,
                ),
            );
            fs.unlinkSync(
                `${FilesystemProvider.basepath}/${upload_id}.part-${part_item.partNumber}`,
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
        const path = `${FilesystemProvider.basepath}/${item.derivations_id.cstorehash}-${item.derivations_id.cstoresuffix}.${item.derivations_id.compression}`;
        if (!fs.existsSync(path)) {
            return null;
        }
        return path;
    }

    /**
     * @description Clean the directory, i.e remove all .part files and files of derivations no longer in the derivation_tenant_link table (should be called on cache startup)
     * @returns {Promise<void>}
     * */
    public override async clean(): Promise<void> {
        // Get all stored files
        const all_files = fs.readdirSync(`${FilesystemProvider.basepath}`);

        // First, check if uploads exist, and delete any files
        const all_uploads = await new Uploads().getAll();
        for (const upload of all_uploads) {
            Logger.debug(`Deleting files associated with interupted Upload ID ${upload.id}`);

            const files_matching_upload_id = all_files.filter((x) => x.includes(upload.id));

            for (const file of files_matching_upload_id) {
                fs.unlinkSync(`${FilesystemProvider.basepath}/${file}`);
            }

            new Uploads().delete(upload);
            Logger.debug(`Deleted upload ${upload.id}`);
        }

        // Check if the file exists
        const all_derivations_tenants_links = await new Derivation_tenant_link().getAll();
        for (const link of all_derivations_tenants_links) {
            const derivation_path = `${FilesystemProvider.basepath}/${link.derivations_id.cstorehash}-${link.derivations_id.cstoresuffix}.${link.derivations_id.compression}`;
            if (fs.existsSync(derivation_path)) {
                continue;
            }
            Logger.debug(
                `Did not find ${derivation_path} but it is stored as a derivation link. Deleting Derivation Link`,
            );
            await new Derivation_tenant_link().delete(link);
        }

        // We also need to make sure we do not have any "orphaned" files
        Logger.debug(`Scanning basepath to check for potentially orphaned files`);
        for (const file of all_files) {
            const link = await new Derivation_tenant_link().getByNixStoreHashes([
                file.split("-")[0] as string,
            ]);
            if (!link[0]) {
                Logger.debug(
                    `File ${file} exists in basepath but it does not have a derivation link associated, deleting the file`,
                );
                fs.unlinkSync(`${FilesystemProvider.basepath}/${file}`);
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
