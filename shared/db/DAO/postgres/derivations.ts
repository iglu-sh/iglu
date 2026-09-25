import { and, eq } from "drizzle-orm";
import Logger from "../../../logger/Logger";
import type { derivation } from "../../../types/schema";
import PostgresConnector from "../../Connectors/Postgres";
import { derivations } from "../../schema_pg";
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
        };
        const result = await this.db.transaction(async (tx) => {
            let new_derivation_id: string;

            // Check if the derivation already exists
            const results = await tx
                .select({
                    id: derivations.id,
                    cfilehash: derivations.cfilehash,
                    cnarhash: derivations.cnarhash,
                    cstorehash: derivations.cstorehash,
                })
                .from(derivations)
                .where(
                    and(
                        eq(derivations.cstorehash, item_to_insert.cstorehash),
                        eq(derivations.cnarhash, item_to_insert.cnarhash),
                        eq(derivations.cfilehash, item_to_insert.cfilehash),
                    ),
                );

            if (results[0] === undefined) {
                const new_derivation = await tx
                    .insert(derivations)
                    .values(item_to_insert)
                    .returning();

                if (new_derivation.length === 0 || !new_derivation[0]) {
                    Logger.error(
                        "Panic(DB::DAO::derivations::postgres_derivations): Could not insert into access_rules table! (Unknown Error)",
                    );
                    throw new Error(
                        "Panic(DB::DAO::derivations::postgres_derivations): Could not insert into access_rules table?",
                    );
                }

                new_derivation_id = new_derivation[0].id;
            } else {
                new_derivation_id = results[0].id;
            }

            return await tx
                .select({
                    id: derivations.id,
                    cderiver: derivations.cderiver,
                    cfilehash: derivations.cfilehash,
                    cfilesize: derivations.cfilesize,
                    cnarhash: derivations.cnarhash,
                    cnarsize: derivations.cnarsize,
                    creferences: derivations.creferences,
                    cstorehash: derivations.cstorehash,
                    cstoresuffix: derivations.cstoresuffix,
                    parts: derivations.parts,
                    compression: derivations.compression,
                })
                .from(derivations)
                .where(eq(derivations.id, new_derivation_id));
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
                cderiver: derivations.cderiver,
                cfilehash: derivations.cfilehash,
                cfilesize: derivations.cfilesize,
                cnarhash: derivations.cnarhash,
                cnarsize: derivations.cnarsize,
                creferences: derivations.creferences,
                cstorehash: derivations.cstorehash,
                cstoresuffix: derivations.cstoresuffix,
                parts: derivations.parts,
                compression: derivations.compression,
            })
            .from(derivations);
        return results.map((entry) => {
            return {
                ...entry,
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
                cderiver: derivations.cderiver,
                cfilehash: derivations.cfilehash,
                cfilesize: derivations.cfilesize,
                cnarhash: derivations.cnarhash,
                cnarsize: derivations.cnarsize,
                creferences: derivations.creferences,
                cstorehash: derivations.cstorehash,
                cstoresuffix: derivations.cstoresuffix,
                parts: derivations.parts,
                compression: derivations.compression,
            })
            .from(derivations)
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
                    cderiver: to_update.cderiver,
                    cfilehash: to_update.cfilehash,
                    cfilesize: to_update.cfilesize,
                    cnarhash: to_update.cnarhash,
                    cnarsize: to_update.cnarsize,
                    creferences: to_update.creferences,
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
                    cderiver: derivations.cderiver,
                    cfilehash: derivations.cfilehash,
                    cfilesize: derivations.cfilesize,
                    cnarhash: derivations.cnarhash,
                    cnarsize: derivations.cnarsize,
                    creferences: derivations.creferences,
                    cstorehash: derivations.cstorehash,
                    cstoresuffix: derivations.cstoresuffix,
                    parts: derivations.parts,
                    compression: derivations.compression,
                })
                .from(derivations)
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
        };
    }
}
