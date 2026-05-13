import PostgresConnector from "../../Connectors/Postgres";
import { access_rules } from "../../schema_pg";
import Logger from "@/logger";
import type { access_rules_abstract } from "../abstracts/access_rules_abstract";

export class postgres_access_rules implements access_rules_abstract {
    private db = new PostgresConnector().getDB()
    public async insert(item: access_rule): Promise<access_rule> {
        return await this.db.transaction(async (tx)=>{
            const new_rule = await tx.insert(access_rules).values({
                ...item,
                tenants_id: item.tenants_id.id,
                id: undefined
            }).returning()

            if (new_rule.length === 0 || !new_rule[0]) {
                Logger.error(
                    "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not insert into access_rules table! (Unknown Error)",
                );
                throw new Error(
                    "Panic(DB::DAO::access_rules::sqlite_access_rules): Could not insert into access_rules table?",
                );
            }
        })
    } 
}
