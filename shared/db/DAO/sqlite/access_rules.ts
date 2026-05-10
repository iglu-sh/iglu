import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { access_rule } from "../../../types/schema";
import Logger from "../../../logger/Logger";
import { convert_IP_to_number } from "../../../utils/ip";
import SQLiteConnector from "../../Connectors/SQLite";
import { access_rules, tenants } from "../../schema_sqlite";
import type { access_rules_abstract } from "../abstracts/access_rules_abstract";
export default class sqlite_access_rules implements access_rules_abstract {
    private db = new SQLiteConnector().getDB();

    /**
     * @description Inserts a record into the tenants table
     * @param {access_rules} item - The access rule to be inserted into the table (ID is ignore but should be in your object for API consistency in your object)
     * @returns {Promise<access_rule>} - The created rule
     * @throws {Error} - If inserting fails or nothing is returned from the database
     * */
    public async insert(item: access_rule): Promise<access_rule> {
        const result = await this.db.transaction(async (tx) => {
            const new_rule = await tx
                .insert(access_rules)
                .values({
                    ...item,
                    tenants_id: item.tenants_id.id,
                    id: undefined, // ID has to be set to undefined for automatic ID generation to work
                })
                .returning();
            if (new_rule.length === 0 || !new_rule[0]) {
                Logger.error(
                    "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not insert into access_rules table! (Unknown Error)",
                );
                throw new Error(
                    "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not insert into access_rules table?",
                );
            }

            return await tx
                .select({
                    id: access_rules.id,
                    tenants_id: tenants,
                    ip_block: access_rules.ip_block,
                    start_ip: access_rules.start_ip,
                    end_ip: access_rules.end_ip,
                    action: access_rules.action,
                    priority: access_rules.priority,
                    name: access_rules.name,
                })
                .from(access_rules)
                .innerJoin(tenants, eq(access_rules.tenants_id, tenants.id))
                .where(eq(access_rules.id, new_rule[0].id));
        });

        if (!result?.[0]) {
            Logger.error(
                "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not insert into access_rules table! (Unknown Error)",
            );
            throw new Error(
                "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not insert into access_rules table?",
            );
        }
        return result[0];
    }

    /**
     * @description Gets all records from the access_rules table
     * @returns {Promise<Array<access_rule>>}
     * */
    public async getAll(): Promise<Array<access_rule>> {
        return await this.db
            .select({
                id: access_rules.id,
                tenants_id: tenants,
                ip_block: access_rules.ip_block,
                start_ip: access_rules.start_ip,
                end_ip: access_rules.end_ip,
                action: access_rules.action,
                priority: access_rules.priority,
                name: access_rules.name,
            })
            .from(access_rules)
            .innerJoin(tenants, eq(access_rules.tenants_id, tenants.id))
            .orderBy(access_rules.priority);
    }

    /**
     * @description Attempts to find a record in the access_rules table with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<access_rule | null>}
     * @throws {Error} - If there's more than one record with the associated ID
     * */
    public async getById(id: string): Promise<access_rule | null> {
        const db_data = await this.db
            .select({
                id: access_rules.id,
                tenants_id: tenants,
                ip_block: access_rules.ip_block,
                start_ip: access_rules.start_ip,
                end_ip: access_rules.end_ip,
                action: access_rules.action,
                priority: access_rules.priority,
                name: access_rules.name,
            })
            .from(access_rules)
            .innerJoin(tenants, eq(access_rules.tenants_id, tenants.id))
            .where(eq(access_rules.id, id));

        if (db_data.length > 1) {
            Logger.error(
                "Panic(DB::DAO::access_rules::sqlite_access_rules): Got more than one returned in getByID, I do not know what to do with this",
            );
            throw new Error(
                "Panic(DB::DAO::access_rules::sqlite_access_rules): Got more than one returned in getByID, I do not know what to do with this",
            );
        }

        if (db_data.length === 0 || !db_data[0]) {
            return null;
        }

        return db_data[0];
    }

    /**
     * @description Attempts to find a matching IP rule in the Database to a given
     * @param {string} ip_address - The IP Address you want to retreive rules for
     * @param {string} tenant_id - The ID of the tenant you want to use this access rule for
     * @returns {Promise<Array<access_rule>>}
     * */
    public async getByIP(ip_address: string, tenant_id: string): Promise<Array<access_rule>> {
        const ip = convert_IP_to_number(ip_address);
        const db_data = await this.db
            .select({
                id: access_rules.id,
                tenants_id: tenants,
                ip_block: access_rules.ip_block,
                start_ip: access_rules.start_ip,
                end_ip: access_rules.end_ip,
                action: access_rules.action,
                priority: access_rules.priority,
                name: access_rules.name,
            })
            .from(access_rules)
            .innerJoin(tenants, eq(access_rules.tenants_id, tenants.id))
            .where(
                and(
                    lte(access_rules.start_ip, ip), // Checks if a given IP is in any of the blocks
                    gte(access_rules.end_ip, ip),
                    eq(access_rules.tenants_id, tenant_id),
                ),
            )
            .orderBy(asc(access_rules.priority))
            // As we only every want the one with the lowest priority anyway
            .limit(1);
        return db_data;
    }

    public async getByTenant(tenant_id: string): Promise<Array<access_rule>> {
        return await this.db
            .select({
                id: access_rules.id,
                tenants_id: tenants,
                ip_block: access_rules.ip_block,
                start_ip: access_rules.start_ip,
                end_ip: access_rules.end_ip,
                action: access_rules.action,
                priority: access_rules.priority,
                name: access_rules.name,
            })
            .from(access_rules)
            .innerJoin(tenants, eq(access_rules.tenants_id, tenants.id))
            .where(eq(access_rules.tenants_id, tenant_id))
            .orderBy(asc(access_rules.priority))
            // As we only every want the one with the lowest priority anyway
            .limit(1);
    }
    /**
     * @description Attempts to delete a record from the access_rules table
     * @param {string} id - The ID of the rule you want to delete
     * @returns {Promise<void>}
     * */
    public async delete(id: access_rule): Promise<void> {
        await this.db.delete(access_rules).where(eq(access_rules.id, id.id));
    }

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the same object
     * @param {access_rule} to_update - The new state of the DB Object
     * @returns {access_rule} - The updated rule
     * @throws {Error} - In case nothing was updated, or more than one record was updated
     */
    public async update(to_update: access_rule): Promise<access_rule> {
        const result = await this.db.transaction(async (tx) => {
            const updated_item = await tx
                .update(access_rules)
                .set({
                    tenants_id: to_update.tenants_id.id,
                    ip_block: to_update.ip_block,
                    start_ip: to_update.start_ip,
                    end_ip: to_update.end_ip,
                    action: to_update.action,
                    priority: to_update.priority,
                    name: to_update.name,
                })
                .where(eq(access_rules.id, to_update.id))
                .returning();

            if (updated_item.length !== 1 || !updated_item[0]) {
                Logger.error(
                    "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not update the access_rules table (Either more than one updated or no record updated)",
                );
                throw new Error(
                    "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not update the access_rules table (Either more than one updated or no record updated)",
                );
            }

            return await tx
                .select({
                    id: access_rules.id,
                    tenants_id: tenants,
                    ip_block: access_rules.ip_block,
                    start_ip: access_rules.start_ip,
                    end_ip: access_rules.end_ip,
                    action: access_rules.action,
                    priority: access_rules.priority,
                    name: access_rules.name,
                })
                .from(access_rules)
                .innerJoin(tenants, eq(access_rules.tenants_id, tenants.id))
                .where(eq(access_rules.id, updated_item[0].id))
                .limit(1);
        });
        if (result.length !== 1 || !result[0]) {
            Logger.error(
                "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not update the access_rules table (Did not get record back)",
            );
            throw new Error(
                "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not update the access_rules table (Did not get record back)",
            );
        }
        return result[0];
    }
}
