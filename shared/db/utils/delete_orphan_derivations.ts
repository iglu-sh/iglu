import { Filesystem } from "../../files/Filesystem";
import { Derivation_tenant_link, Derivations } from "..";

// Should be called at startup

/**
 * @description Delete every derivation without a link to a tenant
 */
export async function delete_orphan_derivations() {
    const all_derivations = await new Derivations().getAll();
    const all_links = await new Derivation_tenant_link().getAll();

    for (const derivation of all_derivations) {
        const index = all_links.findIndex((link) => link.derivations_id.id === derivation.id);

        if (index >= 0) {
            continue;
        }
        await new Derivations().delete(derivation);
        await new Filesystem().delete(
            `${derivation.cstorehash}-${derivation.cstoresuffix}.${derivation.compression}`,
        );
    }
}
