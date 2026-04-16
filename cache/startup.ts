import "dotenv/config";
import Logger from "@/logger";
import type { AvailablePrefixColors } from "@/logger";
import type { tenant } from "@/db_types";
import { load_config } from "./helpers/load_config";
import Tenants from "../shared/db/DAO/tenants";
import { create_api_key } from "../shared/utils/crypto/api_key_generation";
import { Api_keys_tenants_link } from "../shared/db/DAO/api_key_tenant_link";
import Api_keys from "../shared/db/DAO/api_key";
import { Filesystem } from "../shared/files/Filesystem";

/*
 * This function runs the startup routine for the cache. It checks the environment variables and creates Database Configuration. It also initizializes the logger.
 * */
export default async function startup() {
    Logger.debug("Loading config");
    const config = await load_config();
    Logger.debug("Config loaded");

    /*
     * Initializing the logger
     * */
    Logger.setJsonLogging(config.logger.logging_format === "json");
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

    /*
     * DB Setup
     * */
    process.env.DB_TYPE = config.database.database_type;
    if (config.database.database_type === "sqlite") {
        process.env.DB_FILE_NAME = config.database.database_file_location;
    }

    /*
     * Hashing Setup
     * */
    process.env.API_KEY_HASH_SALT = config.server.hashing_secret;

    /*
     * Env setup
     * */
    process.env.HOSTNAME = config.server.hostname;
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
                const tenant = await tenants.update({
                    ...already_exists,
                    github_username: requested_tenant.github_username,
                    is_public: requested_tenant.is_public,
                    preferred_compression_method: requested_tenant.preferred_compression_method,
                    uri: `${config.server.hostname}/${requested_tenant.name}`,
                    priority: requested_tenant.priority,
                });
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
                const tenant_to_create: tenant = {
                    id: "n/a",
                    github_username: requested_tenant.github_username,
                    is_public: requested_tenant.is_public,
                    name: requested_tenant.name,
                    permission: "Read",
                    preferred_compression_method: requested_tenant.preferred_compression_method,
                    uri: `${config.server.hostname}/${requested_tenant.name}`,
                    priority: requested_tenant.priority,
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
}
