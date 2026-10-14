import { Logger } from "../../logger";

/**
 * @description Converts a given IP Address to an integer
 * @param {string} ip_address - The IP address that should be converted
 * @returns {number}
 * */
export function convert_IP_to_number(ip_address: string): number {
    const packets = ip_address.split(".");
    if (packets.length !== 4) {
        Logger.error(
            "validation_error(utils::ip::convert_IP_to_number): Did not receive valid IP (does not have 4 number packets)",
        );
        throw new Error(
            "validation_error(utils::ip::convert_IP_to_number): Did not receive valid IP (does not have 4 number packets)",
        );
    }
    let complete_binary = "";
    for (const num_packet of packets) {
        const value = Number(num_packet);
        if (!/^\d{1,3}$/.test(num_packet) || value > 255) {
            Logger.error(
                "validation_error(utils::ip::convert_IP_to_number): Did not receive valid IP (packet not numeric or out of range 0-255)",
            );
            throw new Error(
                "validation_error(utils::ip::convert_IP_to_number): Did not receive valid IP (packet not numeric or out of range 0-255)",
            );
        }
        complete_binary += intToBinary(value, 8);
    }
    return binToInteger(complete_binary);
}

/**
 * @description Converts a given positive integer to a zero-padded binary string
 * @param {number} num The number to convert
 * @param {number} width The minimum number of bits (left-padded with zeros)
 * @returns {string} The number as binary
 * */
function intToBinary(num: number, width: number = 8): string {
    return (num >>> 0).toString(2).padStart(width, "0");
}

/**
 * @description Converts a given binary to a number
 * @param {string} bin The binary to convert
 * @returns {number}
 * */
function binToInteger(bin: string): number {
    return parseInt(bin, 2);
}

/**
 * @description Converts a given, valid CIDR range to a start and end value
 * @param {string} range - The CIDR range
 * @returns {"range_start": number, "range_end': number}
 * @throws In case of an invalid IP address or prefix
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

    const prefix_length = Number(prefix);
    if (!/^\d{1,2}$/.test(prefix) || prefix_length > 32) {
        Logger.error(
            "validation_error(utils::ip::cidr_to_range) Did not receive valid CIDR range (prefix must be an integer between 0 and 32)",
        );
        throw new Error(
            "validation_error(utils::ip::cidr_to_range) Did not receive valid CIDR range (prefix must be an integer between 0 and 32)",
        );
    }

    // Full 32-bit binary representation of the IP
    const ip_binary = intToBinary(convert_IP_to_number(ip), 32);
    const network_bits = ip_binary.slice(0, prefix_length);
    const host_bit_count = 32 - prefix_length;

    return {
        range_start: binToInteger(network_bits + "0".repeat(host_bit_count)),
        range_end: binToInteger(network_bits + "1".repeat(host_bit_count)),
    };
}
