import { homedir } from "node:os";
import { cancel, isCancel, log, select, spinner, text } from "@clack/prompts";
import type { tenant } from "@iglu-sh/shared";
import { Auth, Client } from "@iglu-sh/shared/utils/iglu_client_utils";
import { load } from "js-toml";
import { z } from "zod";

export type configuration = {
    server: {
        hostname: string;
    };
    authentication: {
        key: string;
    };
};
export class Config {
    private static conf: configuration;
    constructor(conf: configuration) {
        Config.conf = conf;
    }

    public static getConfig(): configuration {
        return Config.conf;
    }
}

export const cli_config_zod = z.object({
    server: z.object({
        hostname: z.string(),
    }),
    authentication: z.object({
        key: z.string(),
    }),
});

export async function load_config(): Promise<configuration> {
    log.info(`Loading config file from ${homedir()}/.config/iglu/iglu.toml`);
    const file = Bun.file(`${homedir}/.config/iglu/iglu.toml`);
    // If the file does not exist, we need to start asking the user for input
    if (!(await file.exists())) {
        log.info("Did not find config file.");
        const hostname = await text({
            message: "First off: Please tell me where your iglu server is located",
            placeholder: "https://iglu.example.com",
            validate(value) {
                if (!value || !z.url().safeParse(value).success) return `Please input a valid URL`;
            },
        });
        if (isCancel(hostname)) {
            cancel("Operation cancelled");
            process.exit(0);
        }

        const authtoken = await text({
            message:
                "Please give me an authtoken from your iglu server (note: This token will be stored in PLAINTEXT at ~/.config/iglu/iglu.toml)",
            placeholder: "A uuid",
            validate(value) {
                if (!value || value.length === 0) return `A value is required`;
            },
        });
        if (isCancel(authtoken)) {
            cancel("Operation cancelled");
            process.exit(0);
        }
        const s = spinner();
        s.start("I'm querying Iglu for your available tenants");
        let all_tenants: Array<tenant> | undefined;
        let key_name: string | undefined;
        try {
            const { tenants, name } = await new Auth(
                new Client({ hostname: hostname, token: authtoken }),
            ).getAllowedTenants();
            all_tenants = tenants;
            key_name = name;
        } catch (e) {
            log.error(
                `I was unable to complete my request: ${e}. Please make sure that you have a valid authtoken and that you are able to connect to the iglu server. Also check that enable_rest is set to true in your config.toml on the iglu server!`,
            );
            process.exit(0);
        }
        if (!all_tenants || !key_name) {
            log.error(
                `I was unable to complete my request: Missing tenants or name in response. Please make sure that you have a valid authtoken and that you are able to connect to the iglu server. Also check that enable_rest is set to true in your config.toml on the iglu server!`,
            );
            process.exit(0);
        }
        s.stop("Done querying Iglu!");
        log.info(`I've successfully queried the Iglu Server for your tenants. The name of the Authtoken you are currently using is: "${key_name}" and you currently have access to these tenants: 
                 ${all_tenants
                     .map((x, index) => {
                         return `${index + 1}. "${x.name}"`;
                     })
                     .join("\n")}`);

        const should_save_to_file = await select({
            message:
                "Should I safe your inputs to a file so you don't have to do this setup every time?",
            options: [
                {
                    value: "y",
                    label: "Yes",
                },
                {
                    value: "n",
                    label: "No",
                },
            ],
            initialValue: "y",
        });

        if (isCancel(should_save_to_file)) {
            cancel("Operation cancelled");
            process.exit(0);
        }

        if (!should_save_to_file || should_save_to_file === "n") {
            log.info("Alrighty, not saving to file");
            return {
                server: {
                    hostname: hostname,
                },
                authentication: {
                    key: authtoken,
                },
            };
        }

        // Safe to file and then continue with normal flow
        await file.write(`[server]
hostname = "${hostname}"
[authentication]
key = "${authtoken}"
`);
    }
    const file_contents = await file.text();
    const config = load(file_contents);
    const verified_config = cli_config_zod.safeParse(config);
    if (!verified_config.success) {
        log.error(
            "There's an error in your config, please rectify these errors manually and then try again",
        );
        log.warn("I've found these errors:");
        console.log(verified_config.error.issues);
        process.exit(1);
    }

    // Set the config for others to use
    new Config(verified_config.data);
    return verified_config.data;
}
