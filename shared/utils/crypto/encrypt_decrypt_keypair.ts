import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Configuration } from "../cache";

export function encrypt_key(key: string): string {
    const encryption_secret = Buffer.from(
        Configuration.getConfig().server.encryption.secret,
        "base64",
    );
    const initialization_vector = randomBytes(12);

    const cipher = createCipheriv("aes-256-gcm", encryption_secret, initialization_vector);
    const encrypted = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([initialization_vector, tag, encrypted]).toString("base64");
}

export function decrypt_key(encrypted_key: string): string {
    const encryption_secret = Buffer.from(
        Configuration.getConfig().server.encryption.secret,
        "base64",
    );
    const data = Buffer.from(encrypted_key, "base64");

    const initialization_vector = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);

    const decipher = createDecipheriv("aes-256-gcm", encryption_secret, initialization_vector);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
