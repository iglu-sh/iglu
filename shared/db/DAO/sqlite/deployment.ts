import { count, eq } from "drizzle-orm";
import type { deployment } from "../../../types/schema";
import Logger from "../../../logger/Logger";
import SQLiteConnector from "../../Connectors/SQLite";
import { deployment_keys, deployments, tenants } from "../../schema_sqlite";
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
                    key_used: item.key_used.id,
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
                    status: deployments.status,
                    deploy_json: deployments.deploy_json,
                    key_used: deployment_keys,
                    deployment_index: deployments.deployment_index,
                })
                .from(deployments)
                .innerJoin(tenants, eq(deployments.tenants_id, tenants.id))
                .innerJoin(deployment_keys, eq(deployments.key_used, deployment_keys.id))
                .where(eq(deployments.id, inserted[0].id))
                .then((res) => {
                    if (!res[0]) {
                        Logger.error(
                            "Panic(DB::DAO::sqlite::deployments): Did not receive inserted item from Database",
                        );
                        throw new Error(
                            "Panic(DB::DAO::sqlite::deployments): Did not receive inserted item from Database",
                        );
                    }
                    return {
                        ...res[0],
                        key_used: {
                            ...res[0].key_used,
                            tenants_id: res[0].tenants_id,
                        },
                    };
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
                status: deployments.status,
                deploy_json: deployments.deploy_json,
                key_used: deployment_keys,
                deployment_index: deployments.deployment_index,
            })
            .from(deployments)
            .innerJoin(tenants, eq(deployments.tenants_id, tenants.id))
            .innerJoin(deployment_keys, eq(deployments.key_used, deployment_keys.id))
            .then((res) => {
                return res.map((element) => {
                    return {
                        ...element,
                        key_used: {
                            ...element.key_used,
                            tenants_id: element.tenants_id,
                        },
                    };
                });
            });
    }

    public async getById(id: string): Promise<deployment | null> {
        return await this.db
            .select({
                id: deployments.id,
                tenants_id: tenants,
                created_at: deployments.created_at,
                start_time: deployments.start_time,
                end_time: deployments.end_time,
                status: deployments.status,
                deploy_json: deployments.deploy_json,
                key_used: deployment_keys,
                deployment_index: deployments.deployment_index,
            })
            .from(deployments)
            .innerJoin(tenants, eq(deployments.tenants_id, tenants.id))
            .innerJoin(deployment_keys, eq(deployments.key_used, deployment_keys.id))
            .where(eq(deployments.id, id))
            .then((res) => {
                if (!res[0]) {
                    return null;
                }
                return {
                    ...res[0],
                    key_used: {
                        ...res[0].key_used,
                        tenants_id: res[0].tenants_id,
                    },
                };
            });
    }

    public async getIndexForTenantDeployment(tenant_id: string): Promise<number> {
        return await this.db
            .select({ count: count() })
            .from(deployments)
            .where(eq(deployments.tenants_id, tenant_id))
            .then((res) => {
                if (!res[0]) {
                    return 0;
                }
                return res[0].count;
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
                    status: item.status,
                    deploy_json: item.deploy_json,
                    deployment_index: item.deployment_index,
                    key_used: item.key_used.id,
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
                    status: deployments.status,
                    deploy_json: deployments.deploy_json,
                    key_used: deployment_keys,
                    deployment_index: deployments.deployment_index,
                })
                .from(deployments)
                .innerJoin(tenants, eq(deployments.tenants_id, tenants.id))
                .innerJoin(deployment_keys, eq(deployments.key_used, deployment_keys.id))
                .where(eq(deployments.id, updated[0].id))
                .then((res) => {
                    if (!res[0]) {
                        Logger.error(
                            "panic(DAO::sqlite::deployments): Could not update record: Did not get anything from select statement",
                        );
                        throw new Error(
                            "panic(DAO::sqlite::deployments): Could not update record: Did not get anything from select statement",
                        );
                    }
                    return {
                        ...res[0],
                        key_used: {
                            ...res[0].key_used,
                            tenants_id: res[0].tenants_id,
                        },
                    };
                });
        });
    }
}
