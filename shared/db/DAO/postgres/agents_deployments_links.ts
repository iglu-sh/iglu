import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Logger from "../../../logger/Logger";
import type { agents_deployments_link } from "../../../types/schema";
import PostgresConnector from "../../Connectors/Postgres";
import {
    agents,
    agents_deployments_links,
    deployment_keys,
    deployments,
    tenants,
} from "../../schema_pg";
import type { agent_deployment_link_abstract } from "../abstracts/agent_deployment_link_abstract";

const agent_keys = alias(deployment_keys, "agent_keys");

export class postgres_agents_deployments_links implements agent_deployment_link_abstract {
    private db = new PostgresConnector().getDB();
    public async insert(item: agents_deployments_link): Promise<agents_deployments_link> {
        return await this.db.transaction(async (tx) => {
            const created = await tx
                .insert(agents_deployments_links)
                .values({
                    ...item,
                    id: undefined,
                    deployments_id: item.deployments_id.id,
                    agents_id: item.agents_id.id,
                })
                .returning();

            if (!created[0]) {
                Logger.error(
                    "panic(DAO::DAO::agents_deployments_links::postgres_agents_deployments_links): Could not insert into agents_deployments_links table: Did not get returning value from insert method",
                );
                throw new Error(
                    "panic(DAO::DAO::agents_deployments_links::postgres_agents_deployments_links): Could not insert into agents_deployments_links table: Did not get returning value from insert method",
                );
            }

            // I am so sorry for this - Berg
            return await tx
                .select({
                    id: agents_deployments_links.id,
                    deployments_id: deployments,
                    agents_id: agents,
                    log: agents_deployments_links.log,
                    started_at: agents_deployments_links.started_at,
                    finished_at: agents_deployments_links.finished_at,
                    store_path: agents_deployments_links.store_path,
                    closure_size: agents_deployments_links.closure_size,
                    tenant: tenants,
                    deployments_key: deployment_keys,
                    agents_key: agent_keys,
                    status: agents_deployments_links.status,
                })
                .from(agents_deployments_links)
                .innerJoin(agents, eq(agents_deployments_links.agents_id, agents.id))
                .innerJoin(deployments, eq(agents_deployments_links.deployments_id, deployments.id))
                .innerJoin(deployment_keys, eq(deployments.key_used, deployment_keys.id))
                .innerJoin(agent_keys, eq(agents.last_key_used, agent_keys.id))
                .innerJoin(tenants, eq(agents.tenants_id, tenants.id))
                .where(eq(agents_deployments_links.id, created[0].id))
                .then((result) => {
                    if (!result[0]) {
                        Logger.error(
                            "panic(DAO::DAO::agents_deployments_links::postgres_agents_deployments_links): Could not insert into agents_deployments_links table: Did not get returning value from insert method",
                        );
                        throw new Error(
                            "panic(DAO::DAO::agents_deployments_links::postgres_agents_deployments_links): Could not insert into agents_deployments_links table: Did not get returning value from insert method",
                        );
                    }
                    return {
                        id: result[0].id,
                        deployments_id: {
                            ...result[0].deployments_id,
                            tenants_id: result[0].tenant,
                            key_used: {
                                ...result[0].deployments_key,
                                tenants_id: result[0].tenant,
                            },
                        },
                        agents_id: {
                            ...result[0].agents_id,
                            id: result[0].agents_id.id as string,
                            tenants_id: result[0].tenant,
                            last_key_used: {
                                ...result[0].agents_key,
                                tenants_id: result[0].tenant,
                            },
                        },
                        log: result[0].log,
                        started_at: result[0].started_at,
                        finished_at: result[0].finished_at,
                        store_path: result[0].store_path,
                        closure_size: result[0].closure_size,
                        status: result[0].status,
                    };
                });
        });
    }

    public async getAll(): Promise<Array<agents_deployments_link>> {
        return await this.db
            .select({
                id: agents_deployments_links.id,
                deployments_id: deployments,
                agents_id: agents,
                log: agents_deployments_links.log,
                started_at: agents_deployments_links.started_at,
                finished_at: agents_deployments_links.finished_at,
                closure_size: agents_deployments_links.closure_size,
                store_path: agents_deployments_links.store_path,
                deployments_key: deployment_keys,
                agents_key: agent_keys,
                tenant: tenants,
                status: agents_deployments_links.status,
            })
            .from(agents_deployments_links)
            .innerJoin(agents, eq(agents_deployments_links.agents_id, agents.id))
            .innerJoin(deployments, eq(agents_deployments_links.deployments_id, deployments.id))
            .innerJoin(deployment_keys, eq(deployments.key_used, deployment_keys.id))
            .innerJoin(agent_keys, eq(agents.last_key_used, agent_keys.id))
            .innerJoin(tenants, eq(agents.tenants_id, tenants.id))
            .then((res) => {
                return res.map((element) => {
                    return {
                        id: element.id,
                        deployments_id: {
                            ...element.deployments_id,
                            tenants_id: element.tenant,
                            key_used: {
                                ...element.deployments_key,
                                tenants_id: element.tenant,
                            },
                        },
                        agents_id: {
                            ...element.agents_id,
                            tenants_id: element.tenant,
                            last_key_used: {
                                ...element.agents_key,
                                tenants_id: element.tenant,
                            },
                        },
                        log: element.log,
                        started_at: element.started_at,
                        finished_at: element.finished_at,
                        store_path: element.store_path,
                        closure_size: element.closure_size,
                        status: element.status,
                    };
                });
            });
    }

    public async getById(id: string): Promise<agents_deployments_link | null> {
        return await this.db
            .select({
                id: agents_deployments_links.id,
                deployments_id: deployments,
                agents_id: agents,
                log: agents_deployments_links.log,
                started_at: agents_deployments_links.started_at,
                finished_at: agents_deployments_links.finished_at,
                closure_size: agents_deployments_links.closure_size,
                store_path: agents_deployments_links.store_path,
                deployments_key: deployment_keys,
                agents_key: agent_keys,
                tenant: tenants,
                status: agents_deployments_links.status,
            })
            .from(agents_deployments_links)
            .innerJoin(agents, eq(agents_deployments_links.agents_id, agents.id))
            .innerJoin(deployments, eq(agents_deployments_links.deployments_id, deployments.id))
            .innerJoin(deployment_keys, eq(deployments.key_used, deployment_keys.id))
            .innerJoin(agent_keys, eq(agents.last_key_used, agent_keys.id))
            .innerJoin(tenants, eq(agents.tenants_id, tenants.id))
            .where(eq(agents_deployments_links.id, id))
            .then((res) => {
                if (!res[0]) {
                    return null;
                }
                const element = res[0];
                return {
                    id: element.id,
                    deployments_id: {
                        ...element.deployments_id,
                        tenants_id: element.tenant,
                        key_used: {
                            ...element.deployments_key,
                            tenants_id: element.tenant,
                        },
                    },
                    agents_id: {
                        ...element.agents_id,
                        tenants_id: element.tenant,
                        last_key_used: {
                            ...element.agents_key,
                            tenants_id: element.tenant,
                        },
                    },
                    log: element.log,
                    started_at: element.started_at,
                    finished_at: element.finished_at,
                    store_path: element.store_path,
                    closure_size: element.closure_size,
                    status: element.status,
                };
            });
    }

    public async delete(item: agents_deployments_link): Promise<void> {
        await this.db
            .delete(agents_deployments_links)
            .where(eq(agents_deployments_links.id, item.id));
    }

    public async update(item: agents_deployments_link): Promise<agents_deployments_link> {
        return await this.db.transaction(async (tx) => {
            const updated = await tx
                .update(agents_deployments_links)
                .set({
                    ...item,
                    id: undefined,
                    deployments_id: item.deployments_id.id,
                    agents_id: item.agents_id.id,
                })
                .where(eq(agents_deployments_links.id, item.id))
                .returning();

            if (!updated[0]) {
                Logger.error(
                    "panic(DAO::DAO::agents_deployments_links::postgres_agents_deployments_links): Could not update agents_deployments_links table: Did not get returning value from update method",
                );
                throw new Error(
                    "panic(DAO::DAO::agents_deployments_links::postgres_agents_deployments_links): Could not update agents_deployments_links table: Did not get returning value from update method",
                );
            }

            return await tx
                .select({
                    id: agents_deployments_links.id,
                    deployments_id: deployments,
                    agents_id: agents,
                    log: agents_deployments_links.log,
                    started_at: agents_deployments_links.started_at,
                    finished_at: agents_deployments_links.finished_at,
                    closure_size: agents_deployments_links.closure_size,
                    store_path: agents_deployments_links.store_path,
                    deployments_key: deployment_keys,
                    agents_key: agent_keys,
                    tenant: tenants,
                    status: agents_deployments_links.status,
                })
                .from(agents_deployments_links)
                .innerJoin(agents, eq(agents_deployments_links.agents_id, agents.id))
                .innerJoin(deployments, eq(agents_deployments_links.deployments_id, deployments.id))
                .innerJoin(deployment_keys, eq(deployments.key_used, deployment_keys.id))
                .innerJoin(agent_keys, eq(agents.last_key_used, agent_keys.id))
                .innerJoin(tenants, eq(agents.tenants_id, tenants.id))
                .where(eq(agents_deployments_links.id, updated[0].id))
                .then((result) => {
                    if (!result[0]) {
                        Logger.error(
                            "panic(DAO::DAO::agents_deployments_links::postgres_agents_deployments_links): Could not update agents_deployments_links table: Did not get returning value from update method",
                        );
                        throw new Error(
                            "panic(DAO::DAO::agents_deployments_links::postgres_agents_deployments_links): Could not update agents_deployments_links table: Did not get returning value from update method",
                        );
                    }
                    return {
                        id: result[0].id,
                        deployments_id: {
                            ...result[0].deployments_id,
                            tenants_id: result[0].tenant,
                            key_used: {
                                ...result[0].deployments_key,
                                tenants_id: result[0].tenant,
                            },
                        },
                        agents_id: {
                            ...result[0].agents_id,
                            tenants_id: result[0].tenant,
                            last_key_used: {
                                ...result[0].agents_key,
                                tenants_id: result[0].tenant,
                            },
                        },
                        log: result[0].log,
                        started_at: result[0].started_at,
                        finished_at: result[0].finished_at,
                        store_path: result[0].store_path,
                        closure_size: result[0].closure_size,
                        status: result[0].status,
                    };
                });
        });
    }
}
