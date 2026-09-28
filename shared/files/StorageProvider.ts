import type { derivation_tenant_link } from "@iglu-sh/shared/types/schema";

export type part = {
    eTag: string;
    partNumber: number;
};

export default abstract class StorageProvider {
    /**
     * @description gets called the first time StorageProvider is constructed and is used to run startup functions for the filesystem
     * @returns {void}
     * */
    public abstract init(): void;

    /**
     * @description Stores a given file (name and buffer) into a directory
     * @param {string} name
     * @param {Buffer} data
     * @returns {Promise<void>}
     * */
    public abstract store(name: string, data: Buffer): Promise<void>;

    /**
     * @description Deletes a given file (name) from a directory
     * @param {string} name
     * @returns {Promise<void>}
     * */
    public abstract delete(name: string): Promise<void>;

    /**
     * @description Gets a given file (name) from a directory
     * @param {string} name
     * @returns {Promise<Buffer>}
     * */
    public abstract get(name: string): Promise<Buffer | null>;

    /**
     * @description Gets all files from a directory
     * @returns {Promise<Array<string>>}
     * */
    public abstract getAll(): Promise<Array<string> | null>;

    /**
     * @description Combines an upload into a single file
     * @param {string} upload_id
     * @param {string} hash
     * @param {string} name
     * @param {part} parts
     * @returns {Promise<void>}
     * @throws {Error} On write error OR if hash validation fails
     * */
    public abstract combine(
        upload_id: string,
        hash: string,
        name: string,
        parts: Array<part>,
    ): Promise<void>;

    /**
     * @description Gets a link for uploading to a nix client
     * @param {derivation_tenant_link} item
     * @returns {Promise<string|null>}
     * */
    public abstract getLink(item: derivation_tenant_link): Promise<string | null>;

    /**
     * @description Clean the directory, i.e remove all .part files and files of derivations no longer in the derivation_tenant_link table (should be called on cache startup)
     * @returns {Promise<void>}
     * */
    public abstract clean(): Promise<void>;
}
