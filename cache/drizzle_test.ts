import 'dotenv/config'
import Tenants from '../shared/db/DAO/tenants';

const tenants = new Tenants()

/*
tenants.insert({
    id: '',
    github_username: 'SirBerg',
    is_public: true,
    permission: 'ReadWrite',
    name: 'default',
    preferred_compression_method: 'XZ',
    uri: '/default',
    priority: 40
})
*/

/*
await tenants.delete({
    id: '',
    github_username: 'SirBerg',
    is_public: true,
    permission: 'ReadWrite',
    name: 'default',
    preferred_compression_method: 'XZ',
    uri: '/default',
    priority: 40
})
*/
console.log(await tenants.getAll())
