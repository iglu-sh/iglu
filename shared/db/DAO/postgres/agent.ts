import { and, eq } from "drizzle-orm";
import Logger from "../../../logger/Logger";
import type { agent } from "../../../types/schema";
import PostgresConnector from "../../Connectors/Postgres";
import { agents, deployment_keys, tenants } from "../../schema_pg";
import type { agent_abstract } from "../abstracts/agent_abstract";

export class postgres_agent implements agent_abstract {
    private db = new PostgresConnector().getDB();

    public async insert(item: agent): Promise<agent> {
        return await this.db.transaction(async (tx) => {
            const inserted_records = await tx
                .insert(agents)
                .values({
                    ...item,
                    id: undefined,
                    tenants_id: item.tenants_id.id,
                    last_key_used: item.last_key_used.id,
                } as typeof agents.$inferInsert)
                .returning();

            if (!inserted_records[0]) {
                Logger.error(
                    "panic(DAO::DAO::agents::postgres_agents): Could not insert into agents table: Did not get returning value from insert statement",
                );
                throw new Error(
                    "panic(DAO::DAO::agents::postgres_agents): Could not insert into agents table: Did not get returning value from insert statement",
                );
            }

            return await tx
                .select({
                    id: agents.id,
                    tenants_id: tenants,
                    last_seen: agents.last_seen,
                    version: agents.version,
                    os: agents.os,
                    is_online: agents.is_online,
                    name: agents.name,
                    last_key_used: deployment_keys,
                })
                .from(agents)
                .innerJoin(tenants, eq(agents.tenants_id, tenants.id))
                .innerJoin(deployment_keys, eq(agents.last_key_used, deployment_keys.id))
                .where(eq(agents.id, inserted_records[0].id as string))
                .then((result) => {
                    if (!result[0]) {
                        Logger.error(
                            "panic(DAO::DAO::agents::postgres_agents): Could not insert into agents table: Did not get value from select statement",
                        );
                        throw new Error(
                            "panic(DAO::DAO::agents::postgres_agents): Could not insert into agents table: Did not get value from select statement",
                        );
                    }
                    return {
                        ...result[0],
                        id: result[0].id as string,
                        last_key_used: {
                            ...result[0].last_key_used,
                            tenants_id: result[0].tenants_id,
                        },
                    };
                });
        });
    }

    public async getAll(): Promise<Array<agent>> {
        return await this.db
            .select({
                id: agents.id,
                tenants_id: tenants,
                last_seen: agents.last_seen,
                version: agents.version,
                os: agents.os,
                is_online: agents.is_online,
                name: agents.name,
                last_key_used: deployment_keys,
            })
            .from(agents)
            .innerJoin(tenants, eq(agents.tenants_id, tenants.id))
            .innerJoin(deployment_keys, eq(agents.last_key_used, deployment_keys.id))
            .then((res) => {
                return res.map((element) => {
                    return {
                        ...element,
                        id: element.id as string,
                        last_key_used: {
                            ...element.last_key_used,
                            tenants_id: element.tenants_id,
                        },
                    };
                });
            });
    }

    public async getById(id: string): Promise<agent | null> {
        return await this.db
            .select({
                id: agents.id,
                tenants_id: tenants,
                last_seen: agents.last_seen,
                version: agents.version,
                os: agents.os,
                is_online: agents.is_online,
                name: agents.name,
                last_key_used: deployment_keys,
            })
            .from(agents)
            .innerJoin(tenants, eq(agents.tenants_id, tenants.id))
            .innerJoin(deployment_keys, eq(agents.last_key_used, deployment_keys.id))
            .where(eq(agents.id, id))
            .then((result) => {
                return result[0]
                    ? {
                          ...result[0],
                          id: result[0].id as string,
                          last_key_used: {
                              ...result[0].last_key_used,
                              tenants_id: result[0].tenants_id,
                          },
                      }
                    : null;
            });
    }

    public async getByNameAndTenant(agent_name: string, tenant: string): Promise<Array<agent>> {
        return await this.db
            .select({
                id: agents.id,
                tenants_id: tenants,
                last_seen: agents.last_seen,
                version: agents.version,
                os: agents.os,
                is_online: agents.is_online,
                name: agents.name,
                last_key_used: deployment_keys,
            })
            .from(agents)
            .innerJoin(tenants, eq(agents.tenants_id, tenants.id))
            .innerJoin(deployment_keys, eq(agents.last_key_used, deployment_keys.id))
            .where(and(eq(agents.name, agent_name), eq(tenants.id, tenant)))

            .then((result) => {
                return result.map((element) => {
                    return {
                        ...element,
                        id: element.id as string,
                        last_key_used: {
                            ...element.last_key_used,
                            tenants_id: element.tenants_id,
                        },
                    };
                });
            });
    }

    public async delete(item: agent): Promise<void> {
        await this.db.delete(agents).where(eq(agents.id, item.id));
    }

    public async update(item: agent): Promise<agent> {
        return await this.db.transaction(async (tx) => {
            const updated = await tx
                .update(agents)
                .set({
                    tenants_id: item.tenants_id.id,
                    last_seen: item.last_seen,
                    version: item.version,
                    os: item.os,
                    is_online: item.is_online,
                    name: item.name,
                    last_key_used: item.last_key_used.id,
                })
                .where(eq(agents.id, item.id))
                .returning();

            if (!updated[0]) {
                Logger.error(
                    "panic(DAO::DAO::agents::postgres_agents): Could not update agents table: Did not get returning value from update statement",
                );
                throw new Error(
                    "panic(DAO::DAO::agents::postgres_agents): Could not update agents table: Did not get returning value from update statement",
                );
            }

            return await tx
                .select({
                    id: agents.id,
                    tenants_id: tenants,
                    last_seen: agents.last_seen,
                    version: agents.version,
                    os: agents.os,
                    is_online: agents.is_online,
                    name: agents.name,
                    last_key_used: deployment_keys,
                })
                .from(agents)
                .innerJoin(tenants, eq(agents.tenants_id, tenants.id))
                .innerJoin(deployment_keys, eq(agents.last_key_used, deployment_keys.id))
                .where(eq(agents.id, item.id))
                .then((result) => {
                    if (!result[0]) {
                        Logger.error(
                            "panic(DAO::DAO::agents::postgres_agents): Could not update agents table: Did not get returning value from select statement",
                        );
                        throw new Error(
                            "panic(DAO::DAO::agents::postgres_agents): Could not update agents table: Did not get returning value from select statement",
                        );
                    }

                    return {
                        ...result[0],
                        id: result[0].id as string,
                        last_key_used: {
                            ...result[0].last_key_used,
                            tenants_id: result[0].tenants_id,
                        },
                    };
                });
        });
    }
}
