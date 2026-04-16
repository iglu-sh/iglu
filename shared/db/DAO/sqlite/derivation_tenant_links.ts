import type { derivation_tenant_link } from "@/db_types";
import SQLiteConnector from "../../Connectors/SQLite";
import { api_keys, derivations, derivations_tenants_links, signing_keys, tenants } from "../../schema_sqlite";
import { eq, inArray, and } from "drizzle-orm";
import Logger from "@/logger";

export default class sqlite_derivation_tenant_link {
    private db = new SQLiteConnector().getDB()


    /**
     * @description inserts a new record into the derivation_tenant_link
     * @param {derivation_tenant_link} item - The Record to insert
     * @returns {Promise<derivation_tenant_link>}
     * @throws {Error} If nothing got inserted, or more than one record was inserted 
    * */
    public async insert(item:derivation_tenant_link):Promise<derivation_tenant_link>{
        const record_to_insert: typeof derivations_tenants_links.$inferInsert = {
            id: undefined,
            tenants_id: item.tenants_id.id,
            derivations_id: item.derivations_id.id
        }
        const results = await this.db.transaction(async (tx)=>{
            const new_record = await tx.insert(derivations_tenants_links).values(record_to_insert).returning()

            if(!new_record?.[0]){
                Logger.error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not insert into derivation_tenant_link table (Did not get returning value from Statement)'
                )
                throw new Error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not insert into derivation_tenant_link table (Did not get returning value from Statement)'
                )
            }

            const records = await tx.select({
                id: derivations_tenants_links.id,
                tenants_id: tenants,
                derivations_id: derivations,
                signing_key: signing_keys,
                api_key: api_keys
            }).from(derivations_tenants_links)
            .innerJoin(derivations, eq(derivations_tenants_links.derivations_id, derivations.id))
            .innerJoin(tenants, eq(derivations_tenants_links.tenants_id, tenants.id))
            .innerJoin(signing_keys, eq(derivations.signing_keys_id, signing_keys.id))
            .innerJoin(api_keys, eq(api_keys.id, signing_keys.api_keys_id))
            .where(eq(derivations_tenants_links.id, new_record[0].id))

            // Let the rest of the function handle that
            if(!records?.[0]){
                return undefined
            }
            
            // Shift the object into the correct form
            return [{
                id: records[0].id,
                derivations_id:{
                    ...records[0].derivations_id,
                    signing_keys_id: {
                        ...records[0].signing_key,
                        api_keys_id: records[0].api_key 
                    } 
                },
                tenants_id: records[0].tenants_id
            }]
        })

        if(!results?.[0] || results.length !== 1){
                Logger.error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not insert into derivation_tenant_link table (Did not get returning value from Transaction or multiple returned)'
                )
                throw new Error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not insert into derivation_tenant_link table (Did not get returning value from Transaction or multiple returned)'
                )
        }
        return results[0] 
    }

    /**
     * @description returns **every** record in the derivations table (this table can be very long so use this with caution)
     * @returns {Promise<Array<derivation_tenant_link>>}
    * */
    public async getAll():Promise<Array<derivation_tenant_link>>{
        const records = await this.db.select({
            id: derivations_tenants_links.id,
            tenants_id: tenants,
            derivations_id: derivations,
            signing_key: signing_keys,
            api_key: api_keys
        }).from(derivations_tenants_links)
        .innerJoin(derivations, eq(derivations_tenants_links.derivations_id, derivations.id))
        .innerJoin(tenants, eq(derivations_tenants_links.tenants_id, tenants.id))
        .innerJoin(signing_keys, eq(derivations.signing_keys_id, signing_keys.id))
        .innerJoin(api_keys, eq(api_keys.id, signing_keys.api_keys_id))

        if(!records || records === null){
            return []
        }
        return records.map((db_record)=>{
            return {
                id: db_record.id,
                derivations_id: {
                    ...db_record.derivations_id,
                    signing_keys_id: {
                        ...db_record.signing_key,
                        api_keys_id: db_record.api_key
                    } 
                },
                tenants_id: db_record.tenants_id
            }
        });
    }

    /**
     * @description returns a derivation link record via given ID
     * @param {string} id - The ID of the record
     * @returns {Promise<derivation_tenant_link | null>}
     * @throws - If more than one record is returned
    * */
    public async getById(id:string):Promise<derivation_tenant_link | null>{
        const records = await this.db.select({
            id: derivations_tenants_links.id,
            tenants_id: tenants,
            derivations_id: derivations,
            signing_key: signing_keys,
            api_key: api_keys
        }).from(derivations_tenants_links)
        .innerJoin(derivations, eq(derivations_tenants_links.derivations_id, derivations.id))
        .innerJoin(tenants, eq(derivations_tenants_links.tenants_id, tenants.id))
        .innerJoin(signing_keys, eq(derivations.signing_keys_id, signing_keys.id))
        .innerJoin(api_keys, eq(api_keys.id, signing_keys.api_keys_id))
        .where(eq(derivations_tenants_links.id, id))
        if(!records[0] || !records){
            return null
        }

        if(records.length > 1){
            Logger.error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not get by ID: more than one record returned for an ID'
            )
            throw new Error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not get by ID: more than one record returned for an ID'
            )
        }

        return {
            id: records[0].id,
            tenants_id: records[0].tenants_id,
            derivations_id: {
                ...records[0].derivations_id,
                signing_keys_id: {
                    ...records[0].signing_key,
                    api_keys_id: records[0].api_key
                } 
            }
        }
    }

    /**
     * @description Returns any **nix store paths** stored in the database which were filtered by a given array
     * @param {Array<string>} paths - The Paths you want to test
     * @param {string} tenant_id - The ID of the tenant you want to check 
     * @returns {Promise<Array<derivation_tenant_link>>}
    * */
    public async getByNixStoreHashes(paths: Array<string>, tenant_id:string){
        const records = await this.db.select({
            id: derivations_tenants_links.id,
            tenants_id: tenants,
            derivations_id: derivations,
            signing_key: signing_keys,
            api_key: api_keys
        }).from(derivations_tenants_links)
        .innerJoin(derivations, eq(derivations_tenants_links.derivations_id, derivations.id))
        .innerJoin(tenants, eq(derivations_tenants_links.tenants_id, tenants.id))
        .innerJoin(signing_keys, eq(derivations.signing_keys_id, signing_keys.id))
        .innerJoin(api_keys, eq(api_keys.id, signing_keys.api_keys_id))
        .where(and(eq(tenants.id, tenant_id), inArray(derivations.cstorehash, paths)))
        return records.map((db_record)=>{
            return {
                id: db_record.id,
                derivations_id: {
                    ...db_record.derivations_id,
                    signing_keys_id: {
                        ...db_record.signing_key,
                        api_keys_id: db_record.api_key
                    } 
                },
                tenants_id: db_record.tenants_id
            }
        })
    }

    /**
     * @description Deletes a specified link record
     * @param {string} id - The ID of the record to delete
     * @returns {Promise<void>}
     * */
    public async delete(id:string):Promise<void>{
        await this.db.delete(derivations_tenants_links).where(eq(derivations_tenants_links.id, id)) 
    }

    /**
     * @description Updates a given record to a new state, ignoring nested objects (except the ID field in those)
     * @param {derivation_tenant_link} to_update - The Record to Update
     * @returns {Promise<derivation_tenant_link}
     * @throws {Error} - If nothing got updated or more than one record was updated
     * */
    public async update(to_update:derivation_tenant_link):Promise<derivation_tenant_link>{
        const results = await this.db.transaction(async (tx)=>{
            const updated_record = await tx.update(derivations_tenants_links).set({
                tenants_id: to_update.tenants_id.id,
                derivations_id: to_update.derivations_id.id
            }).returning()

            if(!updated_record?.[0]){
                Logger.error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not update record: Nothing returned from Database'
                )
                throw new Error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not update record: Nothing returned from Database'
                )
            }
            if(updated_record.length > 1){
                Logger.error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not update record: More than one record updated'
                )
                throw new Error(
                    'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not update record: More than one record updated'
                )
            }
            
            const records = await tx.select({
                id: derivations_tenants_links.id,
                tenants_id: tenants,
                derivations_id: derivations,
                signing_key: signing_keys,
                api_key: api_keys
            }).from(derivations_tenants_links)
            .innerJoin(derivations, eq(derivations_tenants_links.derivations_id, derivations.id))
            .innerJoin(tenants, eq(derivations_tenants_links.tenants_id, tenants.id))
            .innerJoin(signing_keys, eq(derivations.signing_keys_id, signing_keys.id))
            .innerJoin(api_keys, eq(api_keys.id, signing_keys.api_keys_id))
            .where(eq(derivations_tenants_links.id, updated_record[0].id))

            // Let the rest of the function handle that
            if(!records?.[0]){
                return undefined
            }
            
            // Shift the object into the correct form
            return [{
                id: records[0].id,
                derivations_id:{
                    ...records[0].derivations_id,
                    signing_keys_id: {
                        ...records[0].signing_key,
                        api_keys_id: records[0].api_key 
                    } 
                },
                tenants_id: records[0].tenants_id
            }]
        })

        if(!results?.[0]){
            Logger.error(
                'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not update record: Nothing returned from Transaction'
            )
            throw new Error(
                'Panic(DB::DAO::derivation_tenant_link::sqlite_derivation_tenant_link): Could not update record: Nothing returned from Transaction'
            )
        }

        return results[0]
    }
}
