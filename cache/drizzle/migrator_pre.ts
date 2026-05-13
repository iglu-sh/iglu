import {load_config} from "../lib/load_config"
import {writeFileSync} from "node:fs"
const config = await load_config('./cache/config.toml')


const file_content = `
DB_HOST=${config.database.host}
DB_USER=${config.database.user}
DB_PASSWORD=${config.database.password}
DB_TYPE=${config.database.database_type}
DB_FILE_LOCATION=${config.database.database_file_location}
DB_PORT=${config.database.port}
DB_NAME=${config.database.name}
`

writeFileSync('./.env', file_content)
