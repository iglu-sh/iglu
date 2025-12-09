import type {partsInfo} from "./apiTypes.ts";

export type cache = {
    id: number;
    githubUsername: string;
    isPublic: boolean;
    name: string;
    permission: string;
    preferredCompressionMethod: string;
    publicSigningKeys: Array<string>;
    uri: string;
    priority: number;
}
export interface cacheWithKeys extends cache {
    allowedKeys: Array<string>;
}
export type storeNarInfo = {
    id: number;
    path: string,
    cache: number,
    updatedAt: Date,
    cderiver:string,
    cstorehash: string,
    cstoresuffix: string,
    cfilehash: string,
    cfilesize: number,
    cnarhash: string,
    cnarsize: number,
    creferences: Array<string>,
    csig: string,
    parts: Array<partsInfo>,
    compression: 'xz' | 'zstd',
}