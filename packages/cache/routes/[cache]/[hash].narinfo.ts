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
import Logger from "@iglu-sh/logger";
import {Cache, db, Hash_cache_link} from "@iglu-sh/common"
import type {cache, hash_cache_link} from "@iglu-sh/types/core/db";
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
    async function wrap(){
        let cacheObject:cache|null = null;
        try{
            cacheObject = await new Cache(db.StaticDatabase).getByName(req.params.cache as string);
        }
        catch (e) {
            Logger.debug("Did not find cache by name in narinfo route");
        }
        if (!cacheObject) {
            return res.status(404).json({
                error: "Cache not found",
            });
        }

        //TODO: Implement private caches
        if(!cacheObject.ispublic){
            return res.status(400).json({
                error: "Cache not allowed"
            })
        }

        //Check if the requested hash is in this cache
        let storeNar:hash_cache_link|null = null
        try{
            storeNar = await new Hash_cache_link(db.StaticDatabase).getByCacheAndCStoreHash(cacheObject.id, req.params.hash as string);
        }
        catch (e) {
            Logger.debug(`Store nar not found in cache ${cacheObject.id}`);
        }
        if(!storeNar){
            const headers = new Headers()
            headers.append("content-type", "text/plain")
            return res.status(404).send("404")
        }

        //Build the nar info and send it to the client
        const narInfo = `StorePath: /nix/store/${storeNar.hash.cstorehash}-${storeNar.hash.cstoresuffix}
URL: nar/${storeNar.hash.cstorehash}
Compression: ${storeNar.hash.compression}
FileHash: sha256:${storeNar.hash.cfilehash}
FileSize: ${storeNar.hash.cfilesize}
NarHash: ${storeNar.hash.cnarhash}
NarSize: ${storeNar.hash.cnarsize}
References: ${storeNar.hash.creferences.join(" ")}
Deriver: ${storeNar.hash.cderiver}
Sig: ${cacheObject.name}:${storeNar.hash.csig}
`
        const headers = new Headers()
        headers.append("content-type", "text/x-nix-narinfo")
        res.setHeaders(headers)
        return res.status(200).send(narInfo)
    }
    await wrap()
        .catch(e => {
            Logger.error(`Error while fetching narinfo for ${req.params.hash} in cache ${req.params.cache}: ${e}`);
            return res.status(500).json({
                error: "Internal server error",
            });
        });

}
