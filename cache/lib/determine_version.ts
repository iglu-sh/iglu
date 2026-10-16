import { Logger } from "@iglu-sh/shared/logger";
import { z } from "zod";

const expected_github_return_schema = z.array(
    z.object({
        name: z.string(),
        zipball_url: z.string(),
        tarball_url: z.string(),
        commit: z.object({
            sha: z.string(),
            url: z.string(),
        }),
        node_id: z.string(),
    }),
);

/**
 * @description Determines the current version of the running iglu cache and checks it against the
 * @returns {Promise<void>}
 * */
export default async function determine_version(): Promise<void> {
    const fetch_options: RequestInit = {
        method: "GET",
    };
    const package_json = require("../package.json");
    const versions = await fetch(
        `https://api.github.com/repos/iglu-sh/iglu/tags`,
        fetch_options,
    ).catch((_err) => {
        Logger.debug(`Unable to fetch`);
        return null;
    });
    if (!versions || !versions.ok) {
        Logger.warn(
            "Unable to check latest version, please check manually if you're still on the latest iglu version",
        );
        return;
    }
    const github_response = await versions.json();
    const parsed_github_response = expected_github_return_schema.safeParse(github_response);

    if (!parsed_github_response.success) {
        Logger.warn(
            "Unable to check latest version, please check manually if you're still on the latest iglu version",
        );
        return;
    }

    const current_version = parsed_github_response.data[0];
    if (!current_version) {
        Logger.warn(
            "Unable to check latest version, please check manually if you're still on the latest iglu version",
        );
        return;
    }

    if (current_version.name.replace("v", "") !== package_json.version) {
        Logger.info(`** NEW VERSION AVAILABLE **`);
        Logger.info(`You're on version: ${package_json.version}`);
        Logger.info(`Latest version: ${current_version.name.replace("v", "")}`);
        Logger.info(`See the update guide over at: https://docs.iglu.sh/update_guide`);
    } else {
        Logger.info(`You have the latest Version of Iglu!`);
    }
}
