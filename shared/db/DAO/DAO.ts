import Logger from "@/logger";

export type SupportedDatabasesString = 'SQLite' | 'Postgres'
export abstract class DAO<T>{
    private static type:SupportedDatabasesString;
    constructor(){
        if(process.env.DB_TYPE === 'sqlite'){
            DAO.type = 'SQLite'
        }
        else if(process.env.DB_TYPE === 'postgres'){
            DAO.type = 'Postgres'
        }
        else{
            Logger.error(`Either you have not set DB_TYPE to a supported value, or you haven't set it at all`)
            throw new Error(`Either you have not set DB_TYPE to a supported value, or you haven't set it at all`)
        }
        Logger.debug(`Initializing DAO with type: ${DAO.type}`)
    }

    public static getType(){
        return DAO.type;
    }
    public abstract insert(item:T):Promise<T>;
    public abstract update(item:T):Promise<T>;
    public abstract delete(item:T):Promise<void>;
    public abstract getById(id:string):Promise<T|null>;
    public abstract getAll():Promise<Array<T>>;
}
