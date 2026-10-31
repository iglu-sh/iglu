import type { StartupModule } from "../Module";
import { configuration } from "./configuration.module";
import { database_setup_module } from "./database_setup.module";
import { declarative_version_module } from "./declarative_version.module";
import { declarative_api_keys } from "./declarative-api-keys.module";
import { declarative_tenant_module } from "./declarative-tenant.module";
import { encryption_module } from "./encryption.module";
import { environment } from "./environment.module";
import { logger_module } from "./logger.module";
import { postgres_migrations_module } from "./postgres_migrations.module";
import { sqlite_migrations_module } from "./sqlite_migrations.module";
import { updater_module } from "./updater.module";

export const modules: readonly StartupModule<unknown>[] = [
    configuration,
    environment,
    logger_module,
    updater_module,
    database_setup_module,
    sqlite_migrations_module,
    postgres_migrations_module,
    encryption_module,
    declarative_version_module,
    declarative_tenant_module,
    declarative_api_keys,
];
