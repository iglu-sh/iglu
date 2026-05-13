import { eq } from "drizzle-orm";
import Logger from "../../../logger/Logger";
import type { derivation } from "../../../types/schema";
import PostgresConnector from "../../Connectors/Postgres";
import { api_keys, derivations, signing_keys } from "../../schema_pg";
import type { derivations_abstract } from "../abstracts/derivations_abstract";

export default class postgres_derivations implements derivations_abstract {
    db = new PostgresConnector().getDB();

    /**
     * @description Inserts a new record into the derivations table
     * @param {derivation} item The derivation to insert
     * @returns {Promise<derivation>}
     * @throws {Error} - If nothing was inserted or more than one was inserted
     * */
    public async insert(item: derivation): Promise<derivation> {
        const item_to_insert: typeof derivations.$inferInsert = {
            ...item,
            id: undefined,
            signing_keys_id: item.signing_keys_id.id,
        };
        const result = await this.db.transaction(async (tx) => {
            const new_derivation = await tx.insert(derivations).values(item_to_insert).returning();
            if (new_derivation.length === 0 || !new_derivation[0]) {
                Logger.error(
                    "Panic(DB::DAO::derivations::postgres_derivations): Could not insert into access_rules table! (Unknown Error)",
                );
                throw new Error(
                    "Panic(DB::DAO::derivations::postgres_derivations): Could not insert into access_rules table?",
                );
            }

            return await tx
                .select({
                    id: derivations.id,
                    signing_keys_id: signing_keys,
                    api_key: api_keys,
                    cderiver: derivations.cderiver,
                    cfilehash: derivations.cfilehash,
                    cfilesize: derivations.cfilesize,
                    cnarhash: derivations.cnarhash,
                    cnarsize: derivations.cnarsize,
                    creferences: derivations.creferences,
                    csig: derivations.csig,
                    cstorehash: derivations.cstorehash,
                    cstoresuffix: derivations.cstoresuffix,
                    parts: derivations.parts,
                    compression: derivations.compression,
                })
                .from(derivations)
                .innerJoin(signing_keys, eq(derivations.signing_keys_id, signing_keys.id))
                .innerJoin(api_keys, eq(api_keys.id, signing_keys.api_keys_id))
                .where(eq(derivations.id, new_derivation[0].id));
        });
        if (result.length !== 1 || !result[0]) {
            Logger.error(
                "Panic(DB::DAO::derivations::postgres_derivations): Could not insert into access_rules table! (Nothing returned from transaction)",
            );
            throw new Error(
                "Panic(DB::DAO::derivations::postgres_derivations): Could not insert into access_rules table?",
            );
        }
        return {
            ...result[0],
            signing_keys_id: {
                ...result[0].signing_keys_id,
                api_keys_id: result[0].api_key,
            },
        };
    }

    /**
     * @description Returns **every** record in the derivations table (this table can be pretty large so use this with caution)
     * @returns {Promise<Array<derivation>>}
     * */
    public async getAll(): Promise<Array<derivation>> {
        const results = await this.db
            .select({
                id: derivations.id,
                signing_keys_id: signing_keys,
                api_key: api_keys,
                cderiver: derivations.cderiver,
                cfilehash: derivations.cfilehash,
                cfilesize: derivations.cfilesize,
                cnarhash: derivations.cnarhash,
                cnarsize: derivations.cnarsize,
                creferences: derivations.creferences,
                csig: derivations.csig,
                cstorehash: derivations.cstorehash,
                cstoresuffix: derivations.cstoresuffix,
                parts: derivations.parts,
                compression: derivations.compression,
            })
            .from(derivations)
            .innerJoin(signing_keys, eq(derivations.signing_keys_id, signing_keys.id))
            .innerJoin(api_keys, eq(api_keys.id, signing_keys.api_keys_id));
        return results.map((entry) => {
            return {
                ...entry,
                signing_keys_id: {
                    ...entry.signing_keys_id,
                    api_keys_id: entry.api_key,
                },
            };
        });
    }

    /**
     * @description Returns a derivation matched  by the given ID
     * @param {string} id - The ID of the derivation
     * @returns {Promise<derivation | null>}
     * @throws {Error}
     * */
    public async getById(id: string): Promise<derivation | null> {
        const results = await this.db
            .select({
                id: derivations.id,
                signing_keys_id: signing_keys,
                api_key: api_keys,
                cderiver: derivations.cderiver,
                cfilehash: derivations.cfilehash,
                cfilesize: derivations.cfilesize,
                cnarhash: derivations.cnarhash,
                cnarsize: derivations.cnarsize,
                creferences: derivations.creferences,
                csig: derivations.csig,
                cstorehash: derivations.cstorehash,
                cstoresuffix: derivations.cstoresuffix,
                parts: derivations.parts,
                compression: derivations.compression,
            })
            .from(derivations)
            .innerJoin(signing_keys, eq(derivations.signing_keys_id, signing_keys.id))
            .innerJoin(api_keys, eq(api_keys.id, signing_keys.api_keys_id))
            .where(eq(derivations.id, id));

        if (results.length > 1) {
            Logger.error(
                "Panic(DB::DAO::derivations::postgres_derivations): Could not getByID from access_rules table! (More than 1 record returned)",
            );
            throw new Error(
                "Panic(DB::DAO::derivations::postgres_derivations): Could not getByID from access_rules table! (More than 1 record returned)",
            );
        }

        if (!results[0]) {
            return null;
        }
        return {
            ...results[0],
            signing_keys_id: {
                ...results[0].signing_keys_id,
                api_keys_id: results[0].api_key,
            },
        };
    }

    /**
     * @description deletes a record via given ID
     * @param {derivation} id - The ID of the record to delete
     * @returns {Promise<void>}
     * */
    public async delete(id: derivation): Promise<void> {
        await this.db.delete(derivations).where(eq(derivations.id, id.id));
    }

    /**
     * @description Updates a record to a new state given in the to_update param. Matched via the ID in the to_update field
     * @param {derivation} to_update
     * @returns {Promise<derivation>}
     * @throws {Error} - Incase nothing was updated or more than one record was updated
     * */
    public async update(to_update: derivation): Promise<derivation> {
        const result = await this.db.transaction(async (tx) => {
            const updated_record = await tx
                .update(derivations)
                .set({
                    signing_keys_id: to_update.signing_keys_id.id,
                    cderiver: to_update.cderiver,
                    cfilehash: to_update.cfilehash,
                    cfilesize: to_update.cfilesize,
                    cnarhash: to_update.cnarhash,
                    cnarsize: to_update.cnarsize,
                    creferences: to_update.creferences,
                    csig: to_update.csig,
                    cstorehash: to_update.cstorehash,
                    cstoresuffix: to_update.cstoresuffix,
                    parts: to_update.parts,
                    compression: to_update.compression,
                })
                .where(eq(derivations.id, to_update.id))
                .returning();

            if (updated_record.length !== 1 || !updated_record[0]) {
                Logger.error(
                    "Panic(DB::DAO::derivations::postgres_derivations): Could not upadte record in access_rules table! (Unknown Error)",
                );
                throw new Error(
                    "Panic(DB::DAO::derivations::postgres_derivations): Could not upadte record in access_rules table! (Unknown Error)",
                );
            }

            return await tx
                .select({
                    id: derivations.id,
                    signing_keys_id: signing_keys,
                    api_key: api_keys,
                    cderiver: derivations.cderiver,
                    cfilehash: derivations.cfilehash,
                    cfilesize: derivations.cfilesize,
                    cnarhash: derivations.cnarhash,
                    cnarsize: derivations.cnarsize,
                    creferences: derivations.creferences,
                    csig: derivations.csig,
                    cstorehash: derivations.cstorehash,
                    cstoresuffix: derivations.cstoresuffix,
                    parts: derivations.parts,
                    compression: derivations.compression,
                })
                .from(derivations)
                .innerJoin(signing_keys, eq(derivations.signing_keys_id, signing_keys.id))
                .innerJoin(api_keys, eq(api_keys.id, signing_keys.api_keys_id))
                .where(eq(derivations.id, updated_record[0].id));
        });

        if (result.length !== 1 || !result[0]) {
            Logger.error(
                "Panic(DB::DAO::derivations::postgres_derivations): Could not upadte record in access_rules table! (Nothing returned)",
            );
            throw new Error(
                "Panic(DB::DAO::derivations::postgres_derivations): Could not upadte record in access_rules table! (Nothing returned)",
            );
        }

        return {
            ...result[0],
            signing_keys_id: {
                ...result[0].signing_keys_id,
                api_keys_id: result[0].api_key,
            },
        };
    }
}
