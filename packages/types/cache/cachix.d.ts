export type cache_info ={
    githubUsername: string,
    isPublic: "true" | "false",
    name: string,
    permission: string, //FIXME find out what the possible values are for this
    preferredCompressionMethod: "XZ" | "ZSDT",
    publicSigningKeys: Array<string>,
    uri: `https://${string}/${string}`,
    priority: number,
}

/*
* These two types represent the request and response body for the narinfo request cachix sends when uploading a new derivation.
* It is an array of strings that the cachix client wants to upload and is asking which of them are missing from the cache.
* */
export type upload_narinfo_request = Array<string>;
/*
* Response from the cache for the narinfo upload request.
* The cache sends back an array of strings with the paths that are missing from the cache
* */
export type upload_narinfo_response = Array<string>;
