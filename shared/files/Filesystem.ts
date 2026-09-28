import type { derivation_tenant_link } from "@iglu-sh/shared/types/schema";
import { FilesystemProvider } from "./FilesystemProvider";
import { S3 } from "./S3";
import type StorageProvider from "./StorageProvider";
import type { part } from "./StorageProvider";

export class Filesystem {
    private static provider: StorageProvider;

    public constructor() {
        if (!Filesystem.provider) {
            if (Filesystem.getType() === "fs") {
                Filesystem.provider = new FilesystemProvider();
                Filesystem.provider.init();
            } else if (Filesystem.getType() === "s3") {
                Filesystem.provider = new S3();
                Filesystem.provider.init();
            } else {
                throw new Error(
                    "panic(files::StorageProvider) No valid Storage type in process environment",
                );
            }
        }
    }

    /**
     * @description returns the currently selected filesystem type
     * @returns {'fs'}
     * */
    public static getType(): "fs" | "s3" {
        return process.env.STORAGE_TYPE as "fs" | "s3";
    }

    /**
     * @description Returns the currently selected provider
     * @returns {StorageProvider}
     * */
    public static getProvider(): StorageProvider {
        return Filesystem.provider;
    }

    /**
     * @description Stores a given file (name and buffer) into a directory
     * @param {string} name
     * @param {Buffer} data
     * @returns {Promise<void>}
     * */
    public async store(name: string, data: Buffer): Promise<void> {
        Filesystem.getProvider().store(name, data);
    }

    /**
     * @description Deletes a given file (name) from a directory
     * @param {string} name
     * @returns {Promise<void>}
     * */
    public async delete(name: string): Promise<void> {
        Filesystem.getProvider().delete(name);
    }

    /**
     * @description Gets a given file (name) from a directory
     * @param {string} name
     * @returns {Promise<Buffer|null>}
     * */
    public async get(name: string): Promise<Buffer | null> {
        return Filesystem.getProvider().get(name);
    }

    /**
     * @description Gets all files from a given directory
     * @returns {Promise<Array<string>>}
     * */
    public async getAll(): Promise<Array<string> | null> {
        return Filesystem.getProvider().getAll();
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
    public async combine(
        upload_id: string,
        hash: string,
        name: string,
        parts: Array<part>,
    ): Promise<void> {
        await Filesystem.getProvider().combine(upload_id, hash, name, parts);
    }

    /**
     * @description Gets a link for uploading to a nix client
     * @param {derivation_tenant_link} item
     * @returns {Promise<string|null>}
     * */
    public async getLink(item: derivation_tenant_link): Promise<string | null> {
        return await Filesystem.getProvider().getLink(item);
    }

    /**
     * @description Cleans the filesystem of all unwanted or orphaned files
     * */
    public async clean(): Promise<void> {
        await Filesystem.getProvider().clean();
    }
}
