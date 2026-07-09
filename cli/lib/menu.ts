import { isCancel, select } from "@clack/prompts";
import tenant_menu from "./menus/tenants";

export async function menu() {
    let exit = false;
    while (!exit) {
        const choice = await select({
            message: "Please choose what you would like to do",
            options: [
                {
                    value: "t",
                    label: "Tenants - List, Manage and Create Tenants",
                },
                {
                    value: "k",
                    label: "Keys - List, Manage and Create Keys",
                },
            ],
        });
        if (isCancel(choice)) {
            exit = true;
            continue;
        }
        if (choice === "t") {
            await tenant_menu();
        }
        if (choice === "k") {
        }
    }
}
