import Logger from "@/logger";

/**
 * @description Converts a given IP Address to an integer
 * @param {string} ip_address - The IP address that should be converted
 * @returns {number}
 * */
export function convert_IP_to_number(ip_address: string): number {
    return ip_address.split(".").reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

/**
 * @description Converts a given, valid CIDR range to a start and end value
 * @param {string} range - The CIDR range
 * @returns {"range_start": number, "range_end': number}
 * @throws In case of an invalid IP address
 * */
export function cidr_to_range(range: string): { range_start: number; range_end: number } {
    const [ip, prefix] = range.split("/");
    if (!ip || !prefix) {
        Logger.error(
            "validation_error(utils::ip::cidr_to_range) Did not receive valid CIDR range (missing IP Block or Mask block)",
        );
        throw new Error(
            "validation_error(utils::ip::cidr_to_range) Did not receive valid CIDR range (missing IP Block or Mask block)",
        );
    }
    if (ip.split(".").length !== 4) {
        Logger.error(
            "validation_error(utils::ip::cidr_to_range) Did not receive valid CIDR range (missing IP Block of Range is malformed)",
        );
        throw new Error(
            "validation_error(utils::ip::cidr_to_range) Did not receive valid CIDR range (missing IP Block of Range is malformed)",
        );
    }

    const mask = ~((1 << (32 - parseInt(prefix, 10))) - 1) >>> 0;
    const range_start = (convert_IP_to_number(ip) & mask) >>> 0;
    const range_end = (range_start | ~mask) >>> 0;
    // Special "all IPs" range
    if (range === "0.0.0.0/0") {
        return {
            range_start: 0,
            range_end: 4294967295,
        };
    }
    return { range_start, range_end };
}
