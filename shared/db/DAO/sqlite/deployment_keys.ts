import { and, eq } from "drizzle-orm";
import type { deployment_key } from "@/db_types";
import Logger from "@/logger";
import SQLiteConnector from "../../Connectors/SQLite";
import { deployment_keys, tenants } from "../../schema_sqlite";
import type { deployment_key_abstract } from "../abstracts/deployment_key_abstract";

export class sqlite_deployment_keys implements deployment_key_abstract {
    private db = new SQLiteConnector().getDB();
    public async insert(item: deployment_key): Promise<deployment_key> {
        const val_to_insert: typeof deployment_keys.$inferInsert = {
            ...item,
            id: undefined,
            tenants_id: item.tenants_id.id,
        };
        return await this.db.transaction(async (tx) => {
            const inserted_record = await tx
                .insert(deployment_keys)
                .values(val_to_insert)
                .returning();

            if (!inserted_record?.[0]) {
                Logger.error(
                    "panic(DAO::sqlite::deployment_keys): Could not insert into deployment_keys table: Did not get inserted record back from insert statement",
                );
                throw new Error(
                    "panic(DAO::sqlite::deployment_keys): Could not insert into deployment_keys table: Did not get inserted record back from insert statement",
                );
            }

            return await tx
                .select({
                    id: deployment_keys.id,
                    name: deployment_keys.name,
                    tenants_id: tenants,
                    type: deployment_keys.type,
                    hash: deployment_keys.hash,
                    expires_at: deployment_keys.expires_at,
                    created_at: deployment_keys.created_at,
                })
                .from(deployment_keys)
                .innerJoin(tenants, eq(deployment_keys.tenants_id, tenants.id))
                .where(eq(deployment_keys.id, inserted_record[0].id))
                .then((result) => {
                    if (!result?.[0]) {
                        Logger.error(
                            "panic(DAO::sqlite::deployment_keys): Could not insert into deployment_keys table: Did not get inserted record back from select statement",
                        );
                        throw new Error(
                            "panic(DAO::sqlite::deployment_keys): Could not insert into deployment_keys table: Did not get inserted record back from select statement",
                        );
                    }
                    return result[0];
                });
        });
    }

    public async getAll(): Promise<Array<deployment_key>> {
        return await this.db
            .select({
                id: deployment_keys.id,
                name: deployment_keys.name,
                tenants_id: tenants,
                type: deployment_keys.type,
                hash: deployment_keys.hash,
                expires_at: deployment_keys.expires_at,
                created_at: deployment_keys.created_at,
            })
            .from(deployment_keys)
            .innerJoin(tenants, eq(deployment_keys.tenants_id, tenants.id));
    }

    public async getByHash(hash: string): Promise<deployment_key | null> {
        return await this.db
            .select({
                id: deployment_keys.id,
                name: deployment_keys.name,
                tenants_id: tenants,
                type: deployment_keys.type,
                hash: deployment_keys.hash,
                expires_at: deployment_keys.expires_at,
                created_at: deployment_keys.created_at,
            })
            .from(deployment_keys)
            .innerJoin(tenants, eq(deployment_keys.tenants_id, tenants.id))
            .where(eq(deployment_keys.hash, hash))
            .then((result) => {
                if (!result[0]) {
                    return null;
                }
                return result[0];
            });
    }

    public async getById(id: string): Promise<deployment_key | null> {
        return await this.db
            .select({
                id: deployment_keys.id,
                name: deployment_keys.name,
                tenants_id: tenants,
                type: deployment_keys.type,
                hash: deployment_keys.hash,
                expires_at: deployment_keys.expires_at,
                created_at: deployment_keys.created_at,
            })
            .from(deployment_keys)
            .innerJoin(tenants, eq(deployment_keys.tenants_id, tenants.id))
            .where(eq(deployment_keys.id, id))
            .then((result) => {
                if (result.length !== 1 || !result[0]) {
                    return null;
                }

                return result[0];
            });
    }

    public async getByNameAndTenant(
        name: string,
        tenant_id: string,
    ): Promise<Array<deployment_key>> {
        return await this.db
            .select({
                id: deployment_keys.id,
                name: deployment_keys.name,
                tenants_id: tenants,
                type: deployment_keys.type,
                hash: deployment_keys.hash,
                expires_at: deployment_keys.expires_at,
                created_at: deployment_keys.created_at,
            })
            .from(deployment_keys)
            .innerJoin(tenants, eq(deployment_keys.tenants_id, tenants.id))
            .where(and(eq(deployment_keys.name, name), eq(deployment_keys.tenants_id, tenant_id)));
    }

    public async delete(item: deployment_key): Promise<void> {
        await this.db.delete(deployment_keys).where(eq(deployment_keys.id, item.id));
    }

    public async update(item: deployment_key): Promise<deployment_key> {
        return await this.db.transaction(async (tx) => {
            const updated_record = await tx
                .update(deployment_keys)
                .set({
                    ...item,
                    id: undefined,
                    tenants_id: item.tenants_id.id,
                })
                .where(eq(deployment_keys.id, item.id))
                .returning();

            if (!updated_record[0]) {
                Logger.error(
                    "panic(DAO::sqlite::deployment_keys): Could not update  deployment_keys table: Did not get returning value for update statement",
                );
                throw new Error(
                    "panic(DAO::sqlite::deployment_keys): Could not update deployment_keys table: Did not get returning value for update statement",
                );
            }

            return await tx
                .select({
                    id: deployment_keys.id,
                    name: deployment_keys.name,
                    tenants_id: tenants,
                    type: deployment_keys.type,
                    hash: deployment_keys.hash,
                    expires_at: deployment_keys.expires_at,
                    created_at: deployment_keys.created_at,
                })
                .from(deployment_keys)
                .innerJoin(tenants, eq(deployment_keys.tenants_id, tenants.id))
                .where(eq(deployment_keys.id, item.id))
                .then((result) => {
                    if (!result[0]) {
                        Logger.error(
                            "panic(DAO::sqlite::deployment_keys): Could not update  deployment_keys table: Did not get returning value for update statement",
                        );
                        throw new Error(
                            "panic(DAO::sqlite::deployment_keys): Could not update deployment_keys table: Did not get returning value for update statement",
                        );
                    }
                    return result[0];
                });
        });
    }
}
