export type CacheInfo = {
    githubUsername: string;
    isPublic: boolean;
    name: string;
    permission: string;
    preferredCompressionMethod: string;
    publicSigningKeys: string[];
    uri: string;
    priority: number;
}

export type narInfoCreate = {
    cDeriver: string,
    cFileHash: string,
    cFileSize: number,
    cNarHash: string,
    cNarSize: number,
    cReferences: Array<string>,
    cSig: null,
    cStoreHash: string,
    cStoreSuffix: string
}
export type partsInfo = {
    eTag:string,
    partNumber: number
}

export type narUploadSuccessRequestBody = {
    narInfoCreate: narInfoCreate,
    parts: Array<partsInfo>
}