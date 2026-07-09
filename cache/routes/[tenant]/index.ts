import { Signing_Keys, Tenants } from "@iglu-sh/shared/db";
import { FilterFeatures, IPFiltering, MakeRestResponse } from "@iglu-sh/shared/utils";
import type { Request, Response } from "express";
import { Configuration } from "@/shared/utils/cache";

// biome-ignore lint/complexity/noStaticOnlyClass: Need to share this text between instances, it's for nothing more than that
class HTMLStorage {
    private static html_content: string | undefined;
    public static async getHTMLContent() {
        if (!HTMLStorage.html_content) {
            const file = Bun.file("routes/[tenant]/info.html");
            HTMLStorage.html_content = await file.text();
        }
        return HTMLStorage.html_content;
    }
}
export const get = [
    FilterFeatures("info"),
    IPFiltering(),
    async (req: Request, res: Response) => {
        const tenant_name = req.params.tenant;
        if (!tenant_name || typeof tenant_name !== "string") {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The tenant requested does not exist",
                }),
            );
        }
        const tenant_list = await new Tenants().getByName(tenant_name);
        if (!tenant_list[0] || tenant_list.length !== 1) {
            return res.status(404).json(
                MakeRestResponse(404, "Not found", true, {
                    error_details: "The tenant requested does not exist",
                }),
            );
        }
        const all_public_signing_keys = await new Signing_Keys().getByTenant(tenant_list[0].id);
        const headers = new Headers();
        headers.set("content-type", "text/html");
        res.setHeaders(headers);
        let html_text = await HTMLStorage.getHTMLContent();
        html_text = html_text.replaceAll("iglu_{{CACHE_NAME}}", tenant_list[0].name);
        html_text = html_text.replaceAll("iglu_{{GITHUB_USER}}", tenant_list[0].github_username);
        html_text = html_text.replaceAll("iglu_{{IS_PUBLIC}}", tenant_list[0].is_public.toString());
        html_text = html_text.replaceAll(
            "iglu_{{PREFERRED_COMPRESSION_METHOD}}",
            tenant_list[0].preferred_compression_method,
        );
        html_text = html_text.replaceAll("iglu_{{PRIORITY}}", tenant_list[0].priority.toString());
        html_text = html_text.replaceAll(
            "iglu_{{PUBLIC_KEYS}}",
            all_public_signing_keys.length === 0
                ? "No Signing Keys Configured!"
                : all_public_signing_keys
                      .map((key) => {
                          return `<li>${tenant_list[0]?.name}:${key.key}</li>`;
                      })
                      .join("\n"),
        );
        html_text = html_text.replaceAll(
            "iglu_{{CACHE_DOMAIN}}",
            Configuration.getConfig().server.hostname,
        );
        html_text = html_text.replaceAll(
            "iglu_{{PUBLIC_KEYS_UNFORMATTED}}",
            all_public_signing_keys
                .map((key) => {
                    return `"${tenant_list[0]?.name}:${key.key}"`;
                })
                .join("\n"),
        );
        html_text = html_text.replaceAll("iglu_{{TENANT_STATUS}}", () => {
            if (all_public_signing_keys.length === 0) {
                return `PARTIALLY operational (no signing key configured, upload one using cachix generate-keypair ${tenant_list[0]?.name})`;
            }
            return "FULLY operational";
        });
        res.status(200).send(html_text);
    },
];
