import type { StartupModule } from "../Module";
import { configuration } from "./configuration.module";
import { database_setup_module } from "./database_setup.module";
import { declarative_tenants_module } from "./declarative_tenants.module";
import { declarative_version } from "./declarative_version.module";
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
    declarative_version,
    declarative_tenants_module,
];
