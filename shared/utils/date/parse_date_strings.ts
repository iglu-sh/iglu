type TimeUnit = "s" | "m" | "h" | "d" | "w";

const UNIT_TO_SECONDS: Record<TimeUnit, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
    w: 60 * 60 * 24 * 7,
};

export function parseDuration(input: string): number {
    const match = input.trim().match(/^(\d+(?:\.\d+)?)(s|m|h|d|w)$/);

    if (!match?.[1]) {
        throw new Error(`Invalid duration string: "${input}"`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2] as TimeUnit;

    return value * UNIT_TO_SECONDS[unit];
}
