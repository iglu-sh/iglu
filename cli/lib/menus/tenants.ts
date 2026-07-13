import { isCancel, log, select, spinner, text } from "@clack/prompts";
import type { tenant } from "@iglu-sh/shared";
import { Auth, Client, Tenant } from "@iglu-sh/shared/utils/iglu_client_utils";
import { parseDuration, tenant_schema } from "@/shared/utils";
import { Config } from "../config";

export default async function tenant_menu() {
    log.info("Tenant Menu");
    let exit = false;
    const client = new Client({
        hostname: Config.getConfig().server.hostname,
        token: Config.getConfig().authentication.key,
    });
    while (!exit) {
        const tenants = await new Auth(client).getAllowedTenants().then((res) => res.tenants);
        log.info(`You are currently able to change settings for these tenants:
${tenants
    .map((x, index) => {
        return `${index + 1}: "${x.name}"`;
    })
    .join("\n")}`);
        const action = await select({
            message: "Choose what action you would like to take",
            options: [
                {
                    value: "e",
                    label: "Edit - Edit a Tenant's attributes, such as name, ttl, etc.",
                },
                {
                    value: "v",
                    label: "View - View the details of a Tenant such as which public signing keys are registered, the amount of data used by the tenant and more",
                },
                {
                    value: "d",
                    label: "Delete - Delete a Tenant",
                },
                {
                    value: "l",
                    label: "Go Back to the Main Menu",
                },
            ],
        });
        if (isCancel(action) || action === "l") {
            exit = true;
            continue;
        }

        switch (action) {
            case "e": {
                await edit(tenants);
                break;
            }
        }
    }
}

async function edit(tenants: Array<tenant>) {
    let exit = false;
    while (!exit) {
        const action = await select({
            message: "Which tenant would you like to edit?",
            options: [
                ...tenants.map((x, index) => {
                    return {
                        value: index.toString(),
                        label: x.name,
                    };
                }),
                {
                    value: "l",
                    label: "Go Back to the Tenant Menu",
                },
            ],
        });

        if (isCancel(action) || action === "l") {
            exit = true;
            continue;
        }

        const selected_tenant_index = parseInt(action, 10);
        if (Number.isNaN(selected_tenant_index)) {
            log.error("Whoops I couldn't parse that option, please try again");
            exit = true;
            continue;
        }

        const selected_tenant = tenants[selected_tenant_index];
        if (!selected_tenant) {
            log.error("Whoops I couldn't parse that option, please try again");
            exit = true;
            continue;
        }

        let new_tenant_state = selected_tenant;
        let exit_edit = false;
        while (!exit_edit) {
            // Show a div between old and new state
            log.info(`The current configuration of tenant "${selected_tenant.name}" is: 
${Object.keys(selected_tenant)
    .map((key, index) => {
        const key_value = Object.values(selected_tenant)[index];
        const key_value_in_new_state = Object.values(new_tenant_state)[index];
        return `${key}: ${key_value} -> ${key_value === key_value_in_new_state ? "Not changed" : key_value_in_new_state}`;
    })
    .join("\n")}`);
            log.info(`REMINDER: Your changes won't be saved until you COMMIT them`);
            const edit_action = await select({
                message: "What would you like to edit?",
                options: [
                    {
                        value: "name",
                        label: "Edit name",
                    },
                    {
                        value: "ttl",
                        label: "Edit Time to live",
                    },
                    {
                        value: "is_public",
                        label: "Edit wether or not this tenant is public",
                    },
                    {
                        value: "github_username",
                        label: "Edit the github username registered",
                    },
                    {
                        value: "preferred_compression_method",
                        label: "Edit the preferred compression method",
                    },
                    {
                        value: "priority",
                        label: "Edit the priority of this tenant",
                    },
                    {
                        value: "commit",
                        label: "COMMIT these changes",
                    },
                    {
                        value: "rollback",
                        label: "ROLLBACK the changes you've made",
                    },
                ],
            });
            if (isCancel(edit_action) || edit_action === "rollback") {
                log.info("Rolling back changes made");
                exit_edit = true;
                continue;
            }
            if (edit_action === "commit") {
                log.info("Commiting");
                exit_edit = true;
                // Commit changes to the tenant
                const s = spinner();
                s.start("Updating Tenant...");
                await new Tenant(
                    new Client({
                        hostname: Config.getConfig().server.hostname,
                        token: Config.getConfig().authentication.key,
                    }),
                )
                    .update(new_tenant_state, selected_tenant.name)
                    .catch((e) => {
                        log.error(
                            `Unable to update your tenant, your changes were probably not commited. The error was: ${e}`,
                        );
                    })
                    .then(() => {
                        s.stop();
                        log.success("Tenant has been updated successfully!");
                        exit = true;
                    })
                    .finally(() => {
                        s.stop();
                    });
                continue;
            }
            let new_value: string | boolean | symbol | number;
            switch (edit_action) {
                case "name": {
                    new_value = await text({
                        message:
                            "Input a new name for the tenant, keep in mind this must be unique across your entire server!",
                        validate(value) {
                            if (!value || value.length === 0) return `You must define a value`;
                        },
                    });
                    break;
                }
                case "ttl": {
                    new_value = await text({
                        message: "Input a new ttl for the tenant",
                        placeholder: "1w, 5d, 10m, 1s, etc.",
                        validate(value) {
                            if (!value || value.length === 0) return `You must define a value`;
                            if (Number.isNaN(parseDuration(value))) return `Invalid Value`;
                            new_value = parseDuration(value);
                        },
                    });
                    if (isCancel(new_value)) break;
                    new_value = parseDuration(new_value);
                    break;
                }
                case "is_public": {
                    log.warn(
                        "IMPORTANT: Changes to this value only affect what a nix client can see NOT which IPs can access your tenant. To change who can access your Tenant you should look at Access Rules.",
                    );
                    new_value = await select({
                        message: "Set a new value for is_public",
                        options: [
                            {
                                value: true,
                                label: "True",
                            },
                            {
                                value: false,
                                label: "False",
                            },
                        ],
                    });
                    break;
                }
                case "priority": {
                    new_value = await text({
                        message: "Enter a new priority value",
                        placeholder: new_tenant_state.priority.toString(),
                        validate(value) {
                            if (!value || value.length === 0) return `You must define a value`;
                            if (Number.isNaN(parseInt(value, 10))) return `Invalid Value`;
                        },
                    });
                    if (isCancel(new_value)) break;
                    new_value = parseInt(new_value, 10);
                    break;
                }
                case "github_username": {
                    new_value = await text({
                        message: "Enter a new github username",
                        placeholder: new_tenant_state.github_username,
                        validate(value) {
                            if (!value || value.length === 0) return `You must define a value`;
                        },
                    });
                    break;
                }
                case "preferred_compression_method": {
                    new_value = await select({
                        message: "Select a new preferred compression method",
                        options: [
                            {
                                value: "xz",
                                label: "XZ",
                            },
                            {
                                value: "zstd",
                                label: "ZSTD",
                            },
                        ],
                    });
                    break;
                }
            }
            if (isCancel(new_value)) {
                log.info("Context canceled");
                continue;
            }
            const tmp_tenant = JSON.parse(JSON.stringify(new_tenant_state));
            tmp_tenant[edit_action] = new_value;
            const parsed = tenant_schema.safeParse(tmp_tenant);
            if (!parsed.success) {
                log.error(
                    "There was an error validating your new value. They will not take effect.",
                );
                continue;
            }
            new_tenant_state = parsed.data;
        }
    }
}
