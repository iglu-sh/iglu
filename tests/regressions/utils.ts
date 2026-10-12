/**
 * Helpers for the regression tests in tests/regressions.
 * These tests document the bugs listed in BUGS.md and are expected to FAIL until the bugs are fixed.
 * */
import * as fs from "node:fs";
import type { Request } from "express";
import {
    Access_Rules,
    Derivation_tenant_link,
    Derivations,
    Requests,
    Signing_Keys,
    Uploads,
} from "@/shared/db";
import { Api_keys } from "@/shared/db/DAO/api_key";
import { Api_keys_tenants_link } from "@/shared/db/DAO/api_key_tenant_link";
import { Tenants } from "@/shared/db/DAO/tenants";
import { getFileHash } from "@/shared/files";
import type {
    api_key,
    derivation,
    derivation_tenant_link,
    signing_key,
    tenant,
    upload,
} from "@/shared/types/schema";
import { hashApiKey } from "@/shared/utils/crypto/api_key_generation";
import { cidr_to_range } from "@/shared/utils/ip";

export type ed25519_keypair = {
    public_key: string; // raw 32 byte public key, base64 (the format cachix uploads)
    sign: (data: string) => Promise<string>; // returns a base64 signature
};

/**
 * @description Generates a real ed25519 keypair so that signature verification in complete.ts passes
 * */
export async function makeEd25519Keypair(): Promise<ed25519_keypair> {
    const pair = (await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
        "sign",
        "verify",
    ])) as CryptoKeyPair;
    const raw_public = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    return {
        public_key: Buffer.from(raw_public).toString("base64"),
        sign: async (data: string) => {
            const sig = await crypto.subtle.sign(
                "Ed25519",
                pair.privateKey,
                new TextEncoder().encode(data),
            );
            return Buffer.from(new Uint8Array(sig)).toString("base64");
        },
    };
}

/**
 * @description Creates a tenant with a sane default TTL (setupTenantStructure uses a TTL of 1 second, which makes TTL-sensitive tests flaky)
 * */
export async function makeTenant(overrides: Partial<tenant> = {}): Promise<tenant> {
    return await new Tenants().insert({
        id: "n/a",
        github_username: "test_user",
        name: Bun.randomUUIDv7(),
        permission: "Read",
        is_public: true,
        preferred_compression_method: "XZ",
        uri: "http://test.example.com/regression",
        priority: 1,
        ttl: 60 * 60,
        signing_method: "client",
        ...overrides,
    });
}

/**
 * @description Creates an API key linked to the given tenants, optionally with a signing key attached
 * */
export async function makeApiKey(
    tenants: Array<tenant>,
    public_signing_key?: string,
): Promise<{ api_key: api_key; auth_token: string; signing_key: signing_key | null }> {
    const auth_token = Bun.randomUUIDv7();
    const api_key = await new Api_keys().insert({
        id: "n/a",
        hash: hashApiKey(auth_token),
        name: `regression key ${auth_token}`,
    });
    for (const t of tenants) {
        await new Api_keys_tenants_link().insert({
            id: "n/a",
            api_keys_id: api_key,
            tenants_id: t,
        });
    }
    let signing_key: signing_key | null = null;
    if (public_signing_key) {
        signing_key = await new Signing_Keys().insert({
            id: "n/a",
            api_keys_id: api_key,
            key: public_signing_key,
            name: "regression signing key",
        });
    }
    return { api_key, auth_token, signing_key };
}

/**
 * @description Generates a random (but valid looking) 32 character nix store hash
 * */
export function randomStoreHash(): string {
    const alphabet = "0123456789abcdfghijklmnpqrsvwxyz";
    let out = "";
    for (let i = 0; i < 32; i++) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
}

/**
 * @description Inserts a derivation directly into the database (no file on disk)
 * */
export async function makeDerivation(store_hash = randomStoreHash()): Promise<derivation> {
    return await new Derivations().insert({
        id: "n/a",
        cderiver: "unknown-deriver",
        cfilehash: Bun.randomUUIDv7(),
        cfilesize: 100,
        cnarhash: `sha256:${Bun.randomUUIDv7()}`,
        cnarsize: "100",
        creferences: JSON.stringify([]),
        cstorehash: store_hash,
        cstoresuffix: "regression",
        compression: "xz",
        parts: JSON.stringify([]),
    });
}

/**
 * @description Links a derivation to a tenant and records an inbound request (like complete.ts does)
 * */
export async function linkDerivation(
    derivation: derivation,
    tenant: tenant,
    signing_key: signing_key,
    sig = "regression-signature",
): Promise<derivation_tenant_link> {
    const link = await new Derivation_tenant_link().insert({
        id: "n/a",
        derivations_id: derivation,
        tenants_id: tenant,
        pin: false,
        csig: sig,
        signing_keys_id: signing_key,
    });
    await new Requests().insert({
        id: "n/a",
        derivations_tenants_links: link.id,
        direction: "inbound",
        date: Date.now(),
        url: "/regression",
    });
    return link;
}

/**
 * @description Adds an access rule to a tenant
 * */
export async function addAccessRule(
    tenant: tenant,
    ip_block: string,
    action: "accept" | "drop",
    priority: number,
) {
    const { range_start, range_end } = cidr_to_range(ip_block);
    return await new Access_Rules().insert({
        id: "n/a",
        tenants_id: tenant,
        ip_block,
        start_ip: range_start,
        end_ip: range_end,
        priority,
        action,
        name: `regression ${ip_block}`,
    });
}

/**
 * @description Creates an upload plus a single part file on disk (FS storage), ready to be completed
 * */
export async function makeUploadWithPart(
    tenant: tenant,
    api_key: api_key,
    content: Buffer,
): Promise<{ upload: upload; file_hash: string; file_size: number }> {
    const upload = await new Uploads().insert({
        id: "n/a",
        tenants_id: tenant,
        signed_by: api_key,
        md5: "<none>",
        compression: "xz",
        timeout: 0,
        s3_id: null,
    });
    fs.mkdirSync("/tmp/iglu-regression", { recursive: true });
    fs.mkdirSync("/tmp/iglu", { recursive: true });
    const tmp_path = `/tmp/iglu-regression/${upload.id}.bin`;
    await Bun.write(tmp_path, content);
    const file_hash = await getFileHash(tmp_path);
    fs.copyFileSync(tmp_path, `/tmp/iglu/${upload.id}.part-1`);
    return { upload, file_hash, file_size: content.length };
}

/**
 * @description Builds a complete.ts request body for a given upload, signed with the given keypair
 * */
export async function makeCompleteBody(
    keypair: ed25519_keypair,
    store_hash: string,
    store_suffix: string,
    file_hash: string,
    file_size: number,
) {
    const nar_hash = "sha256:1b8m03r63zqhnjf7l5wnldhh7c134ap5vpj0850ymkq1iyzicy5s";
    const fingerprint = `1;/nix/store/${store_hash}-${store_suffix};${nar_hash};${file_size};`;
    return {
        narInfoCreate: {
            cDeriver: "unknown-deriver",
            cFileHash: file_hash,
            cFileSize: file_size,
            cNarHash: nar_hash,
            cNarSize: file_size,
            cReferences: [],
            cSig: await keypair.sign(fingerprint),
            cStoreHash: store_hash,
            cStoreSuffix: store_suffix,
        },
        parts: [{ eTag: "regression", partNumber: 1 }],
    };
}

/**
 * @description Default headers used by most tests
 * */
export function headers(auth_token?: string, ip = "10.0.0.1"): Request["headers"] {
    return {
        ...(auth_token ? { authorization: `Bearer ${auth_token}` } : {}),
        "x-forwarded-for": ip,
        "user-agent": "iglu-sh regression tests",
        "content-type": "application/json",
    };
}
