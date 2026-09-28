import { Filesystem } from "@iglu-sh/shared/files";
import type { derivation_tenant_link } from "../..";
import { Derivation_tenant_link, Derivations, Requests } from "..";

/**
 * @description Delete a derivation link and if possible also the derivation itself, and all its connections
 * @param {derivation_tenant_link} link The link to delete
 */
export async function delete_derivation(link: derivation_tenant_link) {
    const links = await new Derivation_tenant_link().getByNixStoreHashes([
        link.derivations_id.cstorehash,
    ]);

    const derivation = link.derivations_id;

    if (links.length === 1) {
        await new Derivations().delete(derivation);
        await new Filesystem().delete(
            `${derivation.cstorehash}-${derivation.cstoresuffix}.${derivation.compression}`,
        );
    }

    await new Derivation_tenant_link().delete(link);
    await new Requests().removeAllForLink(link.id);
}
