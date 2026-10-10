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
