import type { signing_key } from "@/db_types";
import { DAO } from "./DAO";
import sqlite_signing_keys from "./sqlite/signing_keys";
import Logger from "@/logger";

export default class Signing_Keys extends DAO<signing_key> {
    private type = DAO.getType();

    /**
     * @description Insert a new Signing Key into the Database
     * @param {signing_key} item
     * @returns {Promise<signing_key>}
     * */
    public override async insert(item: signing_key): Promise<signing_key> {
        let return_item: signing_key | undefined;
        if (this.type === "SQLite") {
            return_item = await new sqlite_signing_keys().insert(item);
        } else if (this.type === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }

        if (!return_item) {
            Logger.error(
                "Panic(DB::DAO::signing_keys): Signing_key insert failed (did not receive return value)",
            );
            throw new Error(
                "Panic(DB::DAO::signing_keys): Signing_key insert failed (did not receive return value)",
            );
        }

        return return_item;
    }

    /**
     * @description Gets all records out of the signing_keys table
     * @returns {Promise<Array<signing_key>>}
     * */
    public override async getAll(): Promise<Array<signing_key>> {
        let return_item: Array<signing_key> | undefined;

        if (this.type === "SQLite") {
            return_item = await new sqlite_signing_keys().getAll();
        } else if (this.type === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }

        if (!return_item) {
            Logger.error(
                "Panic(DB::DAO::signing_keys): Signing_key get_all failed (did not receive return value)",
            );
            throw new Error(
                "Panic(DB::DAO::signing_keys): Signing_key get_all failed (did not receive return value)",
            );
        }

        return return_item;
    }

    /**
     * @description Filter the signing keys table by api key
     * @param {string} key_id - The Key ID
     * @returns {Promise<signing_key|null>}
     * */
    public async getByApiKeyId(key_id: string): Promise<signing_key | null> {
        let return_item: signing_key | null = null;

        if (this.type === "SQLite") {
            return_item = await new sqlite_signing_keys().getByApiKeyId(key_id);
        }

        return return_item;
    }

    /**
     * @description Attempts to find a record in the signing_keys table with the given ID
     * @param {string} id - The ID of the record you are trying to access
     * @returns {Promise<signing_key | null>} - (null if there's no record found)
     * @throws {Error} - If there's more than one record with the given ID
     * */
    public override async getById(id: string): Promise<signing_key | null> {
        let return_item: signing_key | null = null;
        if (this.type === "SQLite") {
            return_item = await new sqlite_signing_keys().getById(id);
        } else if (this.type === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }

        return return_item;
    }

    /**
     * @description Finds all Signing Keys associated with a given Tenant ID
     * @param {string} tenant_id - The ID of the tenant
     * @returns {Promise<Array<signing_key>>}
     * */
    public async findByTenant(tenant_id: string): Promise<Array<signing_key>> {
        let return_item: Array<signing_key> = [];
        if (this.type === "SQLite") {
            return_item = await new sqlite_signing_keys().getByTenant(tenant_id);
        }

        return return_item;
    }

    /**
     * @description Deletes a signing_key. Only the ID field is respected in the given object
     * @param {signing_key} to_delete - The signing key object that contains the ID of the record to delete
     * @returns {Promise<void>}
     * */
    public override async delete(to_delete: signing_key): Promise<void> {
        if (this.type === "SQLite") {
            await new sqlite_signing_keys().delete(to_delete);
        } else if (this.type === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }
    }

    /**
     * @description Updates a given record (comparing by ID) to a new state given in the to_update object
     * @param {signing_key} to_update - The object containing the ID and the desired state of the object
     * @returns {signing_key}
     * @throws {Error}
     * */
    public override async update(to_update: signing_key): Promise<signing_key> {
        let return_item: signing_key | undefined;
        if (this.type === "SQLite") {
            return_item = await new sqlite_signing_keys().update(to_update);
        } else if (this.type === "Postgres") {
            Logger.error("Postgres Functionality has not been implemented yet!");
            throw new Error("Not implemented yet!");
        }
        if (!return_item) {
            Logger.error(
                "Panic(DB::DAO::signing_keys): Signing_key update failed (did not receive return value)",
            );
            throw new Error(
                "Panic(DB::DAO::signing_keys): Signing_key update failed (did not receive return value)",
            );
        }

        return return_item;
    }
}
