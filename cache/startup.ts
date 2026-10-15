import "dotenv/config";
import { deepStrictEqual } from "node:assert";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import {
    Api_keys,
    Api_keys_tenants_link,
    Deployment_keys,
    delete_orphan_derivations,
    Tenants,
} from "@iglu-sh/shared/db";
import { Keypairs } from "@iglu-sh/shared/db/DAO/keypairs";
import { create_keypair } from "@iglu-sh/shared/db/utils/create_keypair";
import { Filesystem } from "@iglu-sh/shared/files";
import type { AvailablePrefixColors } from "@iglu-sh/shared/logger";
import { Logger } from "@iglu-sh/shared/logger";
import type { tenant } from "@iglu-sh/shared/types";
import { create_api_key, hashApiKey, parseDuration } from "@iglu-sh/shared/utils";
import { Configuration, migrate } from "@iglu-sh/shared/utils/cache";
import determine_version from "./lib/determine_version";
import { load_config } from "./lib/load_config";

/*
 * This function runs the startup routine for the cache. It checks the environment variables and creates Database Configuration. It also initizializes the logger.
 * */
export default async function startup() {
    Logger.debug("Loading config");

    /*
     * PWD Setup
     * */
    if (!process.env.IGLU_CWD) {
        process.env.IGLU_CWD = process.cwd();
    }

    let config = await load_config();
    Logger.debug("Config loaded");

    /*
     * Initializing the logger
     * */
    Logger.setJsonLogging(config.logger.logging_format === "json");
    Logger.setShouldLogRequests(config.logger.should_log_requests);
    if (config.logger.logging_prefix) {
        Logger.setPrefix(
            config.logger.logging_prefix,
            config.logger.logging_prefix_color
                ? (config.logger.logging_prefix_color.toUpperCase() as AvailablePrefixColors)
                : undefined,
        );
    }
    Logger.setLogLevel(
        config.logger.log_level.toUpperCase() as "DEBUG" | "INFO" | "WARN" | "ERROR",
    );
    Logger.info("Logger initialized!");

    await determine_version();

    if (config.server.trusted_proxies.length === 0 && config.server.use_reverse_proxy) {
        Logger.error(
            "You have not provided any trusted proxies. The cache will fall back to pure TCP remote addresses. Set one as soon as possible, or set use_reverse_proxy to false",
        );
    }

    /*
     * DB Setup
     * */
    process.env.DB_TYPE = config.database.database_type;
    if (config.database.database_type === "sqlite") {
        process.env.DB_FILE_NAME = config.database.database_file_location;
    }
    await migrate(resolve("./drizzle"));

    /*
     * Hashing Setup
     * */
    process.env.API_KEY_HASH_SALT = config.server.hashing_secret;
    if (config.server.hashing_secret_file !== undefined) {
        const path = config.server.hashing_secret_file;
        const file = Bun.file(path);
        process.env.API_KEY_HASH_SALT = await file.text();
    }
    deepStrictEqual(typeof process.env.API_KEY_HASH_SALT, "string");

    /*
     * Encryption Setup
     * */
    const file = Bun.file(config.server.encryption.secret_file);
    let encryption_value: string | undefined;
    if (!(await file.exists())) {
        const key = randomBytes(32);
        encryption_value = key.toBase64();
        await file.write(encryption_value);
    }
    encryption_value = encryption_value ?? (await file.text());
    const key = Buffer.from(encryption_value, "base64");
    if (key.length !== 32) {
        Logger.error(
            "The provided encryption key does not decode to 32 bytes exactly. Please change your key to decode to the expected value, or remove the secrets file entirely (if this is your first installation) and let iglu generate a secret for you.",
        );
        process.exit(1);
    }
    config.server.encryption.secret = encryption_value;
    Configuration.setConfig(config);

    Logger.debug(`Reloading config due to: Encryption value changed`);
    config = Configuration.getConfig();

    /*
     * Env setup
     * */
    process.env.HOSTNAME = config.server.hostname;
    process.env.INTERFACE = config.server.interface;
    process.env.PORT = config.server.port.toString();
    process.env.STORAGE_TYPE = config.storage.storage_type;
    process.env.FILESYSTEM_DIRECTORY = config.storage.binary_storage_directory;

    /*
     * Filesytem setup
     * */
    new Filesystem();
    /*
     * Tenants setup
     * */
    Logger.debug("Setting up Tenants");
    //Regardless if the user has requested to create tenants from their config, we need to update existing ones to match the current server config
    Logger.debug("Checking for changed server environment variables and correcting");
    const tenants = new Tenants();
    const all_tenants = await tenants.getAll();
    for (const tenant of all_tenants) {
        const new_tenant = tenant;
        let change = false;
        if (tenant.uri !== `${config.server.hostname}/${tenant.name}`) {
            new_tenant.uri = `${config.server.hostname}/${tenant.name}`;
            change = true;
        }
        if (change) {
            tenants.update(new_tenant);
        }
    }

    if (config.tenants.create_tenants_from_config) {
        Logger.debug("User requested to define caches via config, setting them up");
        // If the user defines their caches via the config, we need to set them up
        for (const requested_tenant of config.tenants.definitions) {
            // Check if the cache is already in the all_tenants object and we only need to change it
            const already_exists = all_tenants.filter(
                (item) => item.name === requested_tenant.name,
            )[0];
            if (already_exists) {
                Logger.debug("Updating existing tenant, defined in configuration");
                const ttl = parseDuration(requested_tenant.ttl);
                const tenant = await tenants.update({
                    ...already_exists,
                    github_username: requested_tenant.github_username,
                    is_public: requested_tenant.is_public,
                    preferred_compression_method: requested_tenant.preferred_compression_method,
                    uri: `${config.server.hostname}/${requested_tenant.name}`,
                    priority: requested_tenant.priority,
                    ttl: ttl,
                    signing_method: requested_tenant.signing_method,
                });

                if (already_exists.signing_method !== requested_tenant.signing_method) {
                    // Revert back to client side signing by removing the keypair
                    if (requested_tenant.signing_method === "client") {
                        const keypair = await new Keypairs().getByTenant(already_exists.id);
                        if (keypair) {
                            await new Keypairs().delete(keypair);
                        }
                    }
                    // Run the whole keypair creation routine
                    else if (requested_tenant.signing_method === "server") {
                        await create_keypair(already_exists.id);
                    }
                }

                const api_key_id = requested_tenant.api_key_id;
                // If the key is set to generated, we can assume that a key was already generated and we do not create a new one for it
                if (api_key_id !== "generated") {
                    // First, check if the api_key exists
                    const api_key = await new Api_keys().getById(api_key_id);
                    if (api_key === null) {
                        Logger.error(
                            `panic(cache::startup): No API Key found with ID ${api_key_id} which is set for tenant ${requested_tenant.name} defined in config.toml`,
                        );
                        throw new Error(
                            `panic(cache::startup): No API Key found with ID ${api_key_id} which is set for tenant ${requested_tenant.name} defined in config.toml`,
                        );
                    }

                    // Check if the link exists
                    const link_exists = await new Api_keys_tenants_link().getByTenantAndKey(
                        api_key_id,
                        tenant.id,
                    );

                    if (link_exists === null || link_exists.length === 0) {
                        Logger.info(`Connecting API Key ${api_key_id} to tenant ${tenant.id}`);
                        await new Api_keys_tenants_link().insert({
                            id: "n/a",
                            tenants_id: tenant,
                            api_keys_id: {
                                id: api_key_id,
                                hash: "n/a",
                                name: "n/a",
                            },
                        });
                    }
                }
            }
            // If the cache does not exist, we create it
            else {
                let api_key_id = requested_tenant.api_key_id;
                Logger.info(`Creating defined tenant ${requested_tenant.name}`);
                const ttl = parseDuration(requested_tenant.ttl);
                const tenant_to_create: tenant = {
                    id: "n/a",
                    github_username: requested_tenant.github_username,
                    is_public: requested_tenant.is_public,
                    name: requested_tenant.name,
                    permission: "Read",
                    preferred_compression_method: requested_tenant.preferred_compression_method,
                    uri: `${config.server.hostname}/${requested_tenant.name}`,
                    priority: requested_tenant.priority,
                    ttl: ttl,
                    signing_method: requested_tenant.signing_method,
                };
                if (api_key_id === "generated") {
                    // Create a new one
                    const key = await create_api_key("Generated Key from Config");
                    api_key_id = key.api_key_object.id;
                    Logger.info(
                        `Created API key for cache: ${requested_tenant.name}; Key: ${key.raw}`,
                    );
                    Logger.warn(
                        "Keep in mind that you will need to upload a signing key using cachix before you can push to your cache though!",
                    );
                }

                // Insert the tenant
                const created_tenant = await tenants.insert(tenant_to_create);

                // If the cache is supposed to use server signed derivations, we need to create a keypair for it:
                if (requested_tenant.signing_method === "server") {
                    await create_keypair(created_tenant.id);
                }

                // Check if the API Key is already linked to the tenant
                // This is necessary because a key can either be generated (new) or not generated (old) and while the new one obviously isn't linked yet, the old one may also not be
                const all_tenants_for_key = await new Api_keys_tenants_link().getByApiKey(
                    api_key_id,
                );

                // If this is true then the api key is not linked to the tenant
                if (
                    all_tenants_for_key.filter((link_entry) => {
                        return link_entry.tenants_id.id === created_tenant.id;
                    }).length === 0
                ) {
                    Logger.debug(`Linking key ${api_key_id} to tenant: ${created_tenant.id}`);
                    await new Api_keys_tenants_link().insert({
                        id: "n/a",
                        tenants_id: created_tenant,
                        api_keys_id: {
                            id: api_key_id,
                            name: "n/a",
                            hash: "n/a",
                        },
                    });
                } else {
                    Logger.debug(
                        `Key with ID: ${api_key_id} is already linked to cache with id ${created_tenant.id}`,
                    );
                }
            }
        }
    }

    /*
     * Setup the deployment keys specified
     * */
    if (config.deployments.create_deployments_from_config) {
        for (const deployment_key of config.deployments.definitions) {
            const tenant_referred_to = await new Tenants().getByName(deployment_key.tenant_name);
            if (tenant_referred_to.length === 0 || !tenant_referred_to[0]) {
                Logger.error(
                    `There's an error in your config: The tenant with name '${deployment_key.tenant_name}' cannot be used to link deployment keys because it does not exist.`,
                );
                continue;
            }

            const tenant = tenant_referred_to[0];

            const key_in_db = await new Deployment_keys().getByNameAndTenant(
                deployment_key.name,
                tenant.id,
            );

            if (key_in_db.length > 0) {
                Logger.debug(
                    `Key with name ${deployment_key.name} and tenant name: ${deployment_key.tenant_name} is already defined in the database, skipping...`,
                );
                continue;
            }
            const key_to_hash = Bun.randomUUIDv7();

            await new Deployment_keys().insert({
                id: "n/a",
                hash: hashApiKey(key_to_hash),
                tenants_id: tenant,
                type: deployment_key.type,
                expires_at:
                    deployment_key.expires_at === "-1" ? -1 : Date.parse(deployment_key.expires_at),
                created_at: 0,
                name: deployment_key.name,
            });

            Logger.warn(
                `Deployment key created (type: ${deployment_key.type}, name: ${deployment_key.name}): ${key_to_hash} keep track of it as this will be the last time you'll see it`,
            );
        }
    }

    /*
     * Derivations cleanup
     * */
    await delete_orphan_derivations();

    /*
     * Filesystem cleanup
     * */
    await new Filesystem().clean();
}
