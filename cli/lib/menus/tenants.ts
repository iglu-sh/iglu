import { isCancel, log, select } from "@clack/prompts";
import Client from "@/shared/utils/iglu_client_utils/Client";
import Auth from "@/shared/utils/iglu_client_utils/keys/auth";
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
        }
    }
}
