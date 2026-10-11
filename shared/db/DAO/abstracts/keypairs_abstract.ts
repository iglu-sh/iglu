import type {keypair} from "../../../types/schema"
import type {DAO} from "../DAO"

export interface keypairs_abstract extends DAO<keypair> {
    getByTenant(id:string):Promise<keypair|null>; 
}
