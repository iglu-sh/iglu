import type { derivation_tenant_link } from "@/db_types";
import { Filesystem } from "../../files/Filesystem";
import { Derivation_tenant_link, Derivations, Requests } from "..";

export async function delete_derivation_by_link_id(link: derivation_tenant_link) {
    await new Derivations().delete(link.derivations_id);
    await new Derivation_tenant_link().delete(link);
    await new Requests().removeAllForLink(link.id);
    await new Filesystem().delete(
        `${link.derivations_id.cstorehash}-${link.derivations_id.cstoresuffix}.${link.derivations_id.compression}`,
        link.tenants_id.id,
    );
}
