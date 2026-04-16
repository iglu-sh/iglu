import StorageProvider, { type part } from "./StorageProvider";
import FilesystemProvider from "./FilesystemProvider";

export class Filesystem{
    private static provider: StorageProvider 
    
    public constructor(){
        if(!Filesystem.provider){
            if(Filesystem.getType() === 'fs'){
                Filesystem.provider = new FilesystemProvider()           
                Filesystem.provider.init()
            }
            else{
                throw new Error('panic(files::StorageProvider) No valid Storage type in process environment')
            }

        }
    }

    /**
     * @description returns the currently selected filesystem type
     * @returns {'fs'}
    * */
    public static getType():'fs'{
        return process.env.STORAGE_TYPE as 'fs'
    }

    /**
     * @description Returns the currently selected provider
     * @returns {StorageProvider}
    * */
    public static getProvider():StorageProvider{
        return Filesystem.provider
    }

    /**
     * @description Stores a given file (name and buffer) into a tenant directory (tenant)
     * @param {string} tenant
     * @param {string} name
     * @param {Buffer} data
     * @returns {Promise<void>}
    * */
    public async store(tenant:string, name:string, data:Buffer):Promise<void>{
        Filesystem.getProvider().store(tenant, name, data)
    }

    /**
     * @description Deletes a given file (name) from a tenant directory (tenant)
     * @param {string} name
     * @param {string} tenant
     * @returns {Promise<void>}
    * */
    public async delete(name:string, tenant:string):Promise<void>{
        Filesystem.getProvider().delete(tenant, name)
    }

    /**
     * @description Gets a given file (name) from a tenant directory (tenant)
     * @param {string} name
     * @param {string} tenant
     * @returns {Promise<Buffer|null>}
     * */
    public async get(name:string, tenant:string):Promise<Buffer|null>{
        return Filesystem.getProvider().get(name, tenant)
    }

    /**
     * @description Gets all files from a given tenant directory
     * @param {string} tenant
     * @returns {Promise<Array<string>>}
    * */
    public async getAll(tenant:string):Promise<Array<string>|null>{
        return Filesystem.getProvider().getAll(tenant)
    }

    /**
     * @description Creates a tenant directory or whatever we use to store s3
     * @param {string} tenant
     * @returns {Promise<void>}
     * @throws {Error} if it could not be created
     * */
    public async createTenant(tenant:string):Promise<void>{
        await Filesystem.getProvider().createTenant(tenant)
    }

    /**
    * @description Combines an upload into a single file
    * @param {string} tenant
    * @param {string} upload_id
    * @param {string} hash
    * @param {string} name
    * @param {Array<part>} parts
    * @returns {Promise<void>}
    * @throws {Error} On write error OR if hash validation fails 
    * */
    public async combine(tenant:string, upload_id:string, hash:string, name:string, parts:Array<part>):Promise<void>{
        await Filesystem.getProvider().combine(tenant, upload_id, hash, name, parts)
    }
}

