import { escapeHTML } from "bun";

/**
 * Takes a shallow JSON Object and escapes all keys within for display in HTML
 * @param {object} input The input object
 * @returns {object} The output object with sanitized values
 * */

// biome-ignore lint/suspicious/noExplicitAny: If the input type could be typed better I do not know how. Object does not work as the object type does not have any keys registered in it and unknown also doesn't work so I put any. Fuck you
export function escape_html(input: any): object {
    const keys_of_object = Object.keys(input);
    const return_obj = input;
    for (const key of keys_of_object) {
        if (!return_obj[key] || typeof return_obj[key] !== "string") continue;
        return_obj[key] = escapeHTML(return_obj[key]);
    }

    return return_obj;
}
