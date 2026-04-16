import { DAO } from "./DAO";
import type { tenant as tenant_item } from "@/db_types";
import SQLiteTenants from "./sqlite/tenants";
import Logger from "@/logger";
export default class Tenants extends DAO<tenant_item> {
    public override async insert(item: tenant_item): Promise<tenant_item> {
        let return_item: tenant_item | undefined ;
        if (DAO.getType() === "SQLite") {
            return_item = await new SQLiteTenants().insert(item);
        } else if (DAO.getType() === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }
        if (!return_item) {
            Logger.error(
                "Panic(DB::DAO::tenants): Tenant insert failed (did not receive return value)",
            );
            throw new Error(
                "Panic(DB::DAO::tenants): Tenant insert failed (did not receive return value)",
            );
        }
        return return_item;
    }

    public override async getAll(): Promise<Array<tenant_item>> {
        let return_items: Array<tenant_item> = [];
        if (DAO.getType() === "SQLite") {
            return_items = await new SQLiteTenants().getAll();
        } else if (DAO.getType() === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }
        return return_items;
    }

    /**
     * @description Get a tenant by name
     * @param {string} name - The name of the tenant
     * @returns {Promise<Array<tenant_item>>}
     * */
    public async getByName(name: string): Promise<Array<tenant_item>> {
        let return_items: Array<tenant_item> = [];

        if (DAO.getType() === "SQLite") {
            return_items = await new SQLiteTenants().getByName(name);
        }

        return return_items;
    }

    public override async getById(id: string): Promise<tenant_item | null> {
        let return_item: tenant_item | null = null;
        if (DAO.getType() === "SQLite") {
            return_item = await new SQLiteTenants().getById(id);
        } else if (DAO.getType() === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }

        return return_item;
    }

    public override async delete(item: tenant_item): Promise<void> {
        if (DAO.getType() === "SQLite") {
            await new SQLiteTenants().delete(item);
        } else if (DAO.getType() === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }
    }

    public override async update(item: tenant_item): Promise<tenant_item> {
        let return_item: tenant_item | null = null;
        if (DAO.getType() === "SQLite") {
            return_item = await new SQLiteTenants().update(item);
        } else if (DAO.getType() === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }

        if (!return_item) {
            Logger.error(
                "Panic(DB::DAO::tenants): Did not get an updated item in the update function.",
            );
            throw new Error(
                "Panic(DB::DAO::tenants): Did not get an updated item in the update function.",
            );
        }

        return return_item;
    }
}
