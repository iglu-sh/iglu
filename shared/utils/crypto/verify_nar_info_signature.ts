import { createPrivateKey, sign } from "node:crypto";

function fromB64(s: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

// "name:base64" or bare "base64" → [name | undefined, base64]
function splitKeyed(s: string): [string | undefined, string] {
    const i = s.lastIndexOf(":");
    return i === -1 ? [undefined, s] : [s.slice(0, i), s.slice(i + 1)];
}

/**
 * @description Verifies a given derivation fingerprint
 * @param {string} fingerprint A Nix derivation Fingerprint
 * @param {string} sig The signature to verify the fingerprint against
 * @param {string} pubkey The key that signed the fingerprint
 * @returns {Promise<booelan>} True if valid, false if invalid
 * */
export default async function verify_nar_info_signature(
    fingerprint: string,
    sig: string,
    pubkey: string,
): Promise<boolean> {
    const [keyName, keyB64] = splitKeyed(pubkey);
    const [sigName, sigB64] = splitKeyed(sig);
    if (keyName && sigName && keyName !== sigName) return false;

    try {
        const key = await crypto.subtle.importKey(
            "raw",
            fromB64(keyB64),
            { name: "Ed25519" },
            false,
            ["verify"],
        );
        return crypto.subtle.verify(
            "Ed25519",
            key,
            fromB64(sigB64),
            new TextEncoder().encode(fingerprint),
        );
    } catch (_e) {
        return false;
    }
}

/**
 * @description Builds a nar's signature, given a private key and a fingerprint
 * @param {string} fingerprint The already assembled fingerprint of the nix derivation
 * @param {string} private_key A DECRYPTED ed25519 Private Key
 * @returns {string}
 * */
export function build_nar_sig(fingerprint: string, private_key: string): string {
    const raw = Buffer.from(private_key, "base64");

    const key = createPrivateKey({
        key: {
            kty: "OKP",
            crv: "Ed25519",
            d: raw.subarray(0, 32).toString("base64url"),
            x: raw.subarray(32).toString("base64url"),
        },
        format: "jwk",
    });

    return `${sign(null, Buffer.from(fingerprint), key).toString("base64")}`;
}
