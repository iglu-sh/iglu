import { eq } from "drizzle-orm";
import type { deployment } from "@/db_types";
import Logger from "@/logger";
import SQLiteConnector from "../../Connectors/SQLite";
import { deployments, tenants } from "../../schema_sqlite";
import type { deployment_abstract } from "../abstracts/deployment_abstract";

export class sqlite_deployment implements deployment_abstract {
    private db = new SQLiteConnector().getDB();

    public async insert(item: deployment): Promise<deployment> {
        return await this.db.transaction(async (tx) => {
            const inserted = await tx
                .insert(deployments)
                .values({
                    ...item,
                    id: undefined,
                    tenants_id: item.tenants_id.id,
                    created_at: undefined,
                } as typeof deployments.$inferInsert)
                .returning();

            if (!inserted[0]) {
                Logger.error(
                    "panic(DAO::sqlite::deployments): Could not insert into Database: Did not get returning value from insert statement",
                );
                throw new Error(
                    "panic(DAO::sqlite::deployments): Could not insert into Database: Did not get returning value from insert statement",
                );
            }

            return await tx
                .select({
                    id: deployments.id,
                    tenants_id: tenants,
                    created_at: deployments.created_at,
                    start_time: deployments.start_time,
                    end_time: deployments.end_time,
                    closure_size: deployments.closure_size,
                    status: deployments.status,
                    deploy_json: deployments.deploy_json,
                    store_path: deployments.store_path,
                })
                .from(deployments)
                .innerJoin(tenants, eq(deployments.tenants_id, tenants.id))
                .where(eq(deployments.id, inserted[0].id))
                .then((result) => {
                    if (!result[0]) {
                        Logger.error(
                            "panic(DAO::sqlite::deployments): Could not insert into Database: Did not get returning value from insert statement",
                        );
                        throw new Error(
                            "panic(DAO::sqlite::deployments): Could not insert into Database: Did not get returning value from insert statement",
                        );
                    }
                    return result[0];
                });
        });
    }

    public async getAll(): Promise<Array<deployment>> {
        return await this.db
            .select({
                id: deployments.id,
                tenants_id: tenants,
                created_at: deployments.created_at,
                start_time: deployments.start_time,
                end_time: deployments.end_time,
                closure_size: deployments.closure_size,
                status: deployments.status,
                deploy_json: deployments.deploy_json,
                store_path: deployments.store_path,
            })
            .from(deployments)
            .innerJoin(tenants, eq(deployments.tenants_id, tenants.id));
    }

    public async getById(id: string): Promise<deployment | null> {
        return await this.db
            .select({
                id: deployments.id,
                tenants_id: tenants,
                created_at: deployments.created_at,
                start_time: deployments.start_time,
                end_time: deployments.end_time,
                closure_size: deployments.closure_size,
                status: deployments.status,
                deploy_json: deployments.deploy_json,
                store_path: deployments.store_path,
            })
            .from(deployments)
            .innerJoin(tenants, eq(deployments.tenants_id, tenants.id))
            .where(eq(deployments.id, id))
            .then((result) => {
                if (!result[0]) {
                    return null;
                }

                return result[0];
            });
    }

    public async delete(item: deployment): Promise<void> {
        await this.db.delete(deployments).where(eq(deployments.id, item.id));
    }

    public async update(item: deployment): Promise<deployment> {
        return await this.db.transaction(async (tx) => {
            const updated = await tx
                .update(deployments)
                .set({
                    id: undefined,
                    tenants_id: item.tenants_id.id,
                    created_at: item.created_at,
                    start_time: item.start_time,
                    end_time: item.end_time,
                    closure_size: item.closure_size,
                    status: item.status,
                    deploy_json: item.deploy_json,
                    store_path: item.store_path,
                })
                .returning();

            if (!updated[0]) {
                Logger.error(
                    "panic(DAO::sqlite::deployments): Could not update record: Did not get anything from update statement as returning value",
                );
                throw new Error(
                    "panic(DAO::sqlite::deployments): Could not update record: Did not get anything from update statement as returning value",
                );
            }

            return await tx
                .select({
                    id: deployments.id,
                    tenants_id: tenants,
                    created_at: deployments.created_at,
                    start_time: deployments.start_time,
                    end_time: deployments.end_time,
                    closure_size: deployments.closure_size,
                    status: deployments.status,
                    deploy_json: deployments.deploy_json,
                    store_path: deployments.store_path,
                })
                .from(deployments)
                .innerJoin(tenants, eq(deployments.tenants_id, tenants.id))
                .where(eq(deployments.id, item.id))
                .then((result) => {
                    if (!result[0]) {
                        Logger.error(
                            "panic(DAO::sqlite::deployments): Could not update record: Did not get anything from select statement",
                        );
                        throw new Error(
                            "panic(DAO::sqlite::deployments): Could not update record: Did not get anything from select statement",
                        );
                    }
                    return result[0];
                });
        });
    }
}
