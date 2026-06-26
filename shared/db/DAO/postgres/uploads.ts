import { eq } from "drizzle-orm";
import Logger from "../../../logger/Logger";
import type { upload } from "../../../types/schema";
import PostgresConnector from "../../Connectors/Postgres";
import { api_keys, tenants, uploads } from "../../schema_pg";
import type { uploads_abstract } from "../abstracts/uploads_abstract";
import { Configuration } from "@/shared/utils/cache";
import { S3 } from "@/shared/files/S3";

export class postgres_uploads implements uploads_abstract {
    private db = new PostgresConnector().getDB();
    /**
     * @description Insert a temporary upload into the uploads table and get it back
     * @param {upload} item
     * @returns {Promise<upload>}
     * @throws {Error} if nothing was inserted or more than one was inserted
     * */
    public async insert(item: upload): Promise<upload> {
        const results = await this.db.transaction(async (tx) => {
            const new_record = await tx
                .insert(uploads)
                .values({
                    tenants_id: item.tenants_id.id,
                    signed_by: item.signed_by.id,
                    md5: item.md5,
                    compression: item.compression,
                    url: item.url,
                })
                .returning();
            if (!new_record?.[0] || new_record.length !== 1) {
                Logger.error(
                    "Panic(DB::DAO::uploads::postgres_uploads): Could not insert into uploads table! (Inserted either none or more than one record)",
                );
                throw new Error(
                    "Panic(DB::DAO::uploads::postgres_uploads): Could not insert into uploads table! (Inserted either none or more than one record)",
                );
            }

            if(Configuration.getConfig().storage.storage_type === 'S3'){
                const s3_id = await S3.getUploadID(item.tenants_id.name, new_record[0].id)
                await tx.update(uploads).set({
                    s3_id: s3_id 
                }) 
                .where(eq(uploads.id, new_record[0].id))
            }

            return await tx
                .select({
                    id: uploads.id,
                    tenants_id: tenants,
                    signed_by: api_keys,
                    md5: uploads.md5,
                    compression: uploads.compression,
                    url: uploads.url,
                    timeout: uploads.timeout,
                    s3_id: uploads.s3_id
                })
                .from(uploads)
                .innerJoin(tenants, eq(tenants.id, uploads.tenants_id))
                .innerJoin(api_keys, eq(api_keys.id, uploads.signed_by))
                .where(eq(uploads.id, new_record[0].id));
        });

        if (!results[0]) {
            Logger.error(
                "Panic(DB::DAO::uploads::postgres_uploads): Could not insert into uploads table! (Got nothing from transaction)",
            );
            throw new Error(
                "Panic(DB::DAO::uploads::postgres_uploads): Could not insert into uploads table! (Got nothing from transaction)",
            );
        }

        return results[0];
    }

    /**
     * @description Get everything from the uploads table
     * @returns {Promise<Array<upload>>}
     * */
    public async getAll(): Promise<Array<upload>> {
        return await this.db
            .select({
                id: uploads.id,
                tenants_id: tenants,
                signed_by: api_keys,
                md5: uploads.md5,
                compression: uploads.compression,
                url: uploads.url,
                timeout: uploads.timeout,
                s3_id: uploads.s3_id
            })
            .from(uploads)
            .innerJoin(tenants, eq(tenants.id, uploads.tenants_id))
            .innerJoin(api_keys, eq(api_keys.id, uploads.signed_by));
    }

    /**
     * @description Gets a specific upload from the uploads table
     * @param {string} id - The ID of the upload
     * @returns {Promise<upload|null>}
     * */
    public async getById(id: string): Promise<upload | null> {
        return await this.db
            .select({
                id: uploads.id,
                tenants_id: tenants,
                signed_by: api_keys,
                md5: uploads.md5,
                compression: uploads.compression,
                url: uploads.url,
                timeout: uploads.timeout,
                s3_id: uploads.s3_id
            })
            .from(uploads)
            .innerJoin(tenants, eq(tenants.id, uploads.tenants_id))
            .innerJoin(api_keys, eq(api_keys.id, uploads.signed_by))
            .where(eq(uploads.id, id))
            .then((results) => {
                if (results.length !== 1 || !results[0]) {
                    return null;
                }
                return results[0];
            });
    }

    /**
     * @description Delete a specific record from the uploads table
     * @param {string} id - The ID of the upload
     * @returns {Promise<void>}
     * */
    public async delete(id: upload): Promise<void> {
        await this.db.delete(uploads).where(eq(uploads.id, id.id));
    }

    /**
     * @description Wipes the entire uploads table
     * @returns {Promise<void>}
     * */
    public async wipe(): Promise<void> {
        await this.db.delete(uploads);
    }

    /**
     * @description Updates an upload
     * @param {upload} item - The new record
     * @returns {Promise<upload>}
     * */
    public async update(item: upload): Promise<upload> {
        return await this.db.transaction(async (tx) => {
            const updated_rows = await tx
                .update(uploads)
                .set({
                    tenants_id: item.tenants_id.id,
                    signed_by: item.signed_by.id,
                    md5: item.md5,
                    compression: item.compression,
                    url: item.url
                })
                .where(eq(uploads.id, item.id))
                .returning();

            if (!updated_rows[0] || updated_rows.length !== 1) {
                Logger.error(
                    "Panic(DB::DAO::uploads::postgres_uploads): Could not update uploads table! (Updated either none or more than one record)",
                );
                throw new Error(
                    "Panic(DB::DAO::uploads::postgres_uploads): Could not update uploads table! (Updated either none or more than one record)",
                );
            }
            return await tx
                .select({
                    id: uploads.id,
                    tenants_id: tenants,
                    signed_by: api_keys,
                    md5: uploads.md5,
                    compression: uploads.compression,
                    url: uploads.url,
                    timeout: uploads.timeout,
                    s3_id: uploads.s3_id
                })
                .from(uploads)
                .innerJoin(tenants, eq(tenants.id, uploads.tenants_id))
                .innerJoin(api_keys, eq(api_keys.id, uploads.signed_by))
                .where(eq(uploads.id, updated_rows[0].id))
                .then((db_records) => {
                    if (!db_records[0]) {
                        Logger.error(
                            "Panic(DB::DAO::uploads::postgres_uploads): Could not update uploads table! (Updated either none or more than one record)",
                        );
                        throw new Error(
                            "Panic(DB::DAO::uploads::postgres_uploads): Could not update uploads table! (Updated either none or more than one record)",
                        );
                    }

                    return db_records[0];
                });
        });
    }
}
