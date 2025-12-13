//This endpoint is used to handle the completion of a multipart upload for a nar file.
//It inserts the nar file into the database

import bodyParser from "express";
import type { Request, Response, NextFunction } from "express";
import fs from 'fs'
import {Api_key, Cache, Cache_signing_key, db, Hash, Hash_cache_link} from "@iglu-sh/common"
import {isAuthenticated} from "../../../../../../../utils/middlewares/auth.ts";
import getFileHash from "../../../../../../../utils/getFileHash.ts";
import Logger from "@iglu-sh/logger";
import type {api_key, cache, cache_signing_key_link} from "@iglu-sh/types/core/db";
export const post = [
    bodyParser.json(),
    async (req: Request, res: Response, next: NextFunction) => {
        if(req.method !== 'POST'){
            return res.status(405).json({
                error: 'Method not allowed',
            })
        }

        //Check if the user is authenticated
        const auth = await isAuthenticated(req, res, async () => {
            return true
        })
        if(!auth){
            return;
        }
        //Check if the request is an application/json request
        if(!req.headers['content-type']?.startsWith('application/json')){
            return res.status(400).json({
                error: 'Invalid content type, expected application/json',
            })
        }

        //Check if the request has a narInfoCreate object
        if(!req.body.narInfoCreate){
            Logger.debug("Missing narInfoCreate object in request body for multipart-nar completion")
            return res.status(400).json({
                error: 'Missing narInfoCreate object',
            })
        }

        //Check if the request has a parts array
        if(!req.body.parts){
            Logger.debug("Missing parts array in request body for multipart-nar completion")
            return res.status(400).json({
                error: 'Missing parts array',
            })
        }

        //Check if the request has a cache name
        if(!req.params.cache){
            Logger.debug("Missing cache name in request parameters for multipart-nar completion")
            return res.status(400).json({
                error: 'Missing cache name',
            })
        }

        //Check if the request has a uid
        if(!req.params.uid){
            Logger.debug("Missing uid in request parameters for multipart-nar completion")
            return res.status(400).json({
                error: 'Missing uid',
            })
        }

        //Check if the request uid has an associated cache object in the filesystem
        if(!fs.existsSync(`${process.env.CACHE_FILESYSTEM_DIR}/nar_files/${req.params.cache}`)){
            Logger.debug('Cache does not exist in filesystem for multipart-nar completion')
            return res.status(400).json({
                error: 'Cache does not exist',
            })
        }
        //Get the compression from the uid
        if(!req.params.uid || req.params.uid[0] !== '0' && req.params.uid[0] !== '1'){
            Logger.debug('Invalid uid, expected 0 or 1 as first character for multipart-nar completion')
            return res.status(400).json({
                error: 'Invalid uid',
            })
        }

        async function wrap() {
            // Unlinks the parts in case of an error
            function unlinkParts(compression:"xz"|"zstd"){
                for (const part of req.body.parts) {
                    fs.unlinkSync(`${process.env.CACHE_FILESYSTEM_DIR}/nar_files/${req.params.cache}/${req.params.uid}.nar.${compression}.${part.partNumber}`)
                }
            }
            let cacheObject:null|cache = null
            let publicSigningKeys:null|Array<cache_signing_key_link> = null
            try{
                // req.params.cache is defined here as it is checked above
                cacheObject = await new Cache(db.StaticDatabase).getByName(req.params.cache!)
                publicSigningKeys = await new Cache_signing_key(db.StaticDatabase).getByCacheId(cacheObject.id)
            }
            catch(e){
                Logger.debug("Did not find cache by name in multipart-nar completion")
            }
            //@ts-ignore
            const compression = req.params.uid[0] === '0' ? 'xz' : 'zstd'
            if (!cacheObject || !publicSigningKeys || publicSigningKeys.length === 0) {
                // Unlink the parts
                unlinkParts(compression)
                return res.status(404).json({
                    error: "Cache not found or no public signing keys available",
                });
            }

            //Check if the request has a valid narInfoCreate object
            if (!req.body.narInfoCreate.cDeriver
                || !req.body.narInfoCreate.cFileHash
                || !req.body.narInfoCreate.cFileSize
                || !req.body.narInfoCreate.cNarHash
                || !req.body.narInfoCreate.cNarSize
                || !req.body.narInfoCreate.cReferences
                || !req.body.narInfoCreate.cStoreHash
                || !req.body.narInfoCreate.cStoreSuffix
            ) {
                Logger.debug('Invalid narInfoCreate object in request body for multipart-nar completion')
                return res.status(400).json({
                    error: 'Invalid narInfoCreate object',
                })
            }

            //Check if the request has a valid parts array
            if (!Array.isArray(req.body.parts)) {
                Logger.debug('Invalid parts array in request body for multipart-nar completion')
                return res.status(400).json({
                    error: 'Invalid parts array',
                })
            }
            //Now try to combine the parts of the upload into a single archive file
            //Check if the request has a valid parts array
            if (!Array.isArray(req.body.parts)) {
                Logger.debug('Invalid parts array in request body for multipart-nar completion')
                return res.status(400).json({
                    error: 'Invalid parts array',
                })
            }

            //Loop over the parts array and combine the file
            for (const part of req.body.parts) {
                //Check if the part has a valid eTag and partNumber
                if (!part.eTag || !part.partNumber || typeof part.partNumber !== 'number') {
                    Logger.debug('Invalid part object in parts array for multipart-nar completion')
                    return res.status(400).json({
                        error: 'Invalid part object',
                    })
                }

                const partNumber = parseInt(part.partNumber)
                if (!Number.isInteger(partNumber)) {
                    Logger.debug('Part number is not an integer in parts array for multipart-nar completion')
                    return res.status(400).json({
                        error: 'Part number is not an integer',
                    })
                }

                //Check if the part file exists
                const partFilePath = `${process.env.CACHE_FILESYSTEM_DIR}/nar_files/${req.params.cache}/${req.params.uid}.nar.${compression}.${part.partNumber}`
                if (!fs.existsSync(partFilePath)) {
                    Logger.debug(`Part file ${partFilePath} does not exist for multipart-nar completion`)
                    return res.status(400).json({
                        error: 'Part file does not exist',
                    })
                }
                //Combine the part into the final file
                const finalFilePath = `${process.env.CACHE_FILESYSTEM_DIR}/nar_files/${req.params.cache}/${req.params.uid}.nar.${compression}`
                fs.appendFileSync(finalFilePath, fs.readFileSync(partFilePath))
                //Delete the part file
                fs.unlinkSync(partFilePath)
            }

            try{
                //Verify the hash of the final file
                const finalFilePath = `${process.env.CACHE_FILESYSTEM_DIR}/nar_files/${req.params.cache}/${req.params.uid}.nar.${compression}`
                const fileHash = req.body.narInfoCreate.cFileHash;
                const actualFileHash = await getFileHash(finalFilePath);
                if (actualFileHash !== fileHash) {
                    Logger.debug(`File hash does not match for multipart-nar completion: ${actualFileHash} !== ${fileHash}`)
                    return res.status(400).json({
                        error: 'File hash does not match',
                    })
                }
            }
            catch(e){
                Logger.debug('Error verifying file hash for multipart-nar completion')
                return res.status(500).json({
                    error: 'Internal server error',
                })
            }

            //TODO: Maybe implement a check if the narInfoObject is valid by some miracle publicsigning key. The Algorithm should be Ed25519
            //However: I've spent the last 5 hours trying to verify that goddamn signature and I don't think it's possible anymore. Chatgpt says that only the .narinfo object hast to be verified (without the signature key)

            //...and insert the narinfo into the database
            try {
                // Get the API Key ID
                if(!req.headers.authorization){
                    throw new Error("Missing Authorization Header???")
                }
                let reqApiKey = req.headers.authorization.split(" ")[1]
                if(!reqApiKey){
                    throw new Error("Missing Authorization Header")
                }
                // Get the API Key that was used to upload this hash
                let apiKeyObject = await new Api_key(db.StaticDatabase).getByKey(reqApiKey)
                //await Database.createStorePath(req.params.cache, req.body, req.params.uid, compression, apiKeyID)
                let createdHash = await new Hash(db.StaticDatabase).createNewEntry({
                    id: "empty",
                    creator_api_key: apiKeyObject,
                    path: `${process.env.CACHE_FILESYSTEM_DIR}/nar_files/${req.params.cache}/${req.params.uid}.nar.${compression}`,
                    updated_at: new Date(),
                    cderiver: req.body.narInfoCreate.cDeriver,
                    cfilehash: req.body.narInfoCreate.cFileHash,
                    cfilesize: req.body.narInfoCreate.cFileSize,
                    cnarhash: req.body.narInfoCreate.cNarHash,
                    cnarsize: req.body.narInfoCreate.cNarSize,
                    creferences: req.body.narInfoCreate.cReferences,
                    csig:  req.body.narInfoCreate.cSig || null,
                    cstorehash: req.body.narInfoCreate.cStoreHash,
                    cstoresuffix: req.body.narInfoCreate.cStoreSuffix,
                    parts: req.body.parts,
                    compression: compression,
                    signed_by: publicSigningKeys[0]!
                }).then((res)=>{
                    return res.rows[0]
                })
                if(!createdHash){
                    throw new Error("Failed to create hash entry in database")
                }

                // Create the hash-cache link
                await new Hash_cache_link(db.StaticDatabase).createNewEntry({
                    cache: cacheObject,
                    hash: createdHash,
                })
            } catch (e) {
                Logger.debug(`Error creating store path ${e}`)
                return res.status(500).json({
                    error: 'Internal server error',
                })
            }
        }
        await wrap()
            .catch(e=>{
                Logger.error(`Error inserting narInfo into database: ${e}`)
                return res.status(500).json({
                    error: 'Internal server error',
                })
            })
        return res.status(200).send();
    }
]
