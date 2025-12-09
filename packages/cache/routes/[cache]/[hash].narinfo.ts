/*
* This file reports the narinfo of a given hash in a given cache.
* It is used by the nix client to fetch the narinfo of a store path and has to be in this format:
* ```text
* StorePath: /nix/store/<hash>-<suffix>
* URL: nar/<hash>
* Compression: <compression>
* FileHash: sha256:<filehash>
* FileSize: <filesize>
* NarHash: <narhash>
* NarSize: <narsize>
* References: <references>
* Deriver: <deriver>
* Sig: <cache name>:<sig>
* ```
* (Although the sig part can work without the cache name, it is recommended to include it)
* */

import { type NextFunction, type Request, type Response } from 'express';
import db from '../../utils/db.ts';
import Logger from "@iglu-sh/logger";
export const get = async (req: Request, res: Response, next: NextFunction) => {

    //TODO: Figure out what the nix client actually wants back from a HEAD request
    if (req.method === 'HEAD'){
        return res.status(200).send('OK');
    }
    if (req.method !== "GET"){
        return res.status(405).json({
            error: "Method not allowed",
        });
    }
    if(!req.params.cache || !req.params.hash){
        return res.status(400).json({
            error: "Missing cache name or hash",
        });
    }


    // Check if the cache is public or private
    const Database = new db();
    async function wrap(){

        const cacheID = await Database.getCacheID(req.params.cache as string);
        if (cacheID === -1) {
            return res.status(404).json({
                error: "Cache not found",
            });
        }
        const cache = await Database.getCacheInfo(cacheID);

        //TODO: Implement private caches
        if(!cache.isPublic){
            return res.status(400).json({
                error: "Cache not allowed"
            })
        }

        //Check if the requested hash is in this cache
        const storeNar = await Database.getStoreNarInfo(cacheID, req.params.hash as string);
        if(storeNar.length === 0 || !storeNar[0]){
            Logger.debug(`Store nar ${req.params.hash} not found in cache ${req.params.cache} (cache miss)`);
            const headers = new Headers()
            headers.append("content-type", "text/plain")
            return res.status(404).send("404")
        }

        //Build the nar info and send it to the client
        const narInfo = `StorePath: /nix/store/${storeNar[0].cstorehash}-${storeNar[0].cstoresuffix}
URL: nar/${storeNar[0].cstorehash}
Compression: ${storeNar[0].compression}
FileHash: sha256:${storeNar[0].cfilehash}
FileSize: ${storeNar[0].cfilesize}
NarHash: ${storeNar[0].cnarhash}
NarSize: ${storeNar[0].cnarsize}
References: ${storeNar[0].creferences.join(" ")}
Deriver: ${storeNar[0].cderiver}
Sig: ${cache.name}:${storeNar[0].csig}
`
        const headers = new Headers()
        headers.append("content-type", "text/x-nix-narinfo")
        res.setHeaders(headers)
        return res.status(200).send(narInfo)
    }
    await wrap().then(async ()=>{
        await Database.close()
    })
        .catch(e => {
            Logger.error(`Error while fetching narinfo for ${req.params.hash} in cache ${req.params.cache}: ${e}`);
            return res.status(500).json({
                error: "Internal server error",
            });
        });

}
