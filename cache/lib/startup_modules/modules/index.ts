import type { StartupModule } from "../Module";
import { configuration } from "./configuration.module";
import { database_setup_module } from "./database_setup.module";
import { declarative_api_keys } from "./declarative_api_keys.module";
import { declarative_deployment_key_module } from "./declarative_deployment_key.module";
import { declarative_execution } from "./declarative_execution.module";
import { declarative_keypairs_module } from "./declarative_keypairs.module";
import { declarative_signing_key_module } from "./declarative_signing_keys.module";
import { declarative_tenant_module } from "./declarative_tenant.module";
import { declarative_version_module } from "./declarative_version.module";
import { encryption_module } from "./encryption.module";
import { environment } from "./environment.module";
import { filesystem_module } from "./filesystem.module";
import { filesystem_cleanup } from "./filesystem_cleanup.module";
import { hashing } from "./hashing.module";
import { logger_module } from "./logger.module";
import { orphan_derivation_cleanup } from "./orphan_derivation_cleanup.module";
import { postgres_migrations_module } from "./postgres_migrations.module";
import { skywalking_setup } from "./skywalking.module";
import { sqlite_migrations_module } from "./sqlite_migrations.module";
import { updater_module } from "./updater.module";
import { version_constants } from "./version_constants.module";

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
    declarative_signing_key_module,
    declarative_keypairs_module,
    declarative_deployment_key_module,
    skywalking_setup,
    declarative_execution,
    version_constants,
    orphan_derivation_cleanup,
    filesystem_module,
    filesystem_cleanup,
    hashing,
];
