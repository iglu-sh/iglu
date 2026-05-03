export type nix_system_string =
    // Linux
    | "aarch64-linux"
    | "armv5tel-linux"
    | "armv6l-linux"
    | "armv7a-linux"
    | "armv7l-linux"
    | "i686-linux"
    | "loongarch64-linux"
    | "m68k-linux"
    | "microblaze-linux"
    | "microblazeel-linux"
    | "mips-linux"
    | "mips64-linux"
    | "mips64el-linux"
    | "mipsel-linux"
    | "powerpc64-linux"
    | "powerpc64le-linux"
    | "riscv32-linux"
    | "riscv64-linux"
    | "s390-linux"
    | "s390x-linux"
    | "x86_64-linux"
    // Darwin (macOS)
    | "aarch64-darwin"
    | "x86_64-darwin"
    // FreeBSD
    | "aarch64-freebsd"
    | "i686-freebsd"
    | "x86_64-freebsd"
    // OpenBSD
    | "aarch64-openbsd"
    | "i686-openbsd"
    | "x86_64-openbsd"
    // NetBSD
    | "aarch64-netbsd"
    | "armv6l-netbsd"
    | "armv7l-netbsd"
    | "i686-netbsd"
    | "mipsel-netbsd"
    | "powerpc-netbsd"
    | "riscv32-netbsd"
    | "riscv64-netbsd"
    | "x86_64-netbsd"
    // Windows (MinGW / Cygwin)
    | "i686-cygwin"
    | "x86_64-cygwin"
    | "i686-windows"
    | "x86_64-windows"
    // WASI
    | "wasm32-wasi"
    | "wasm64-wasi"
    // Redox
    | "x86_64-redox"
    // Genode
    | "aarch64-genode"
    | "i686-genode"
    | "x86_64-genode"
    // Others / embedded
    | "aarch64-none"
    | "arm-none"
    | "armv6l-none"
    | "avr-none"
    | "i686-none"
    | "msp430-none"
    | "or1k-none"
    | "m68k-none"
    | "powerpc-none"
    | "powerpcle-none"
    | "riscv32-none"
    | "riscv64-none"
    | "s390-none"
    | "s390x-none"
    | "vc4-none"
    | "x86_64-none"
    // GHCJS
    | "javascript-ghcjs";

export type deploy_json = {
    agents: {
        [key: string]: string;
    };
    rollbackScript?: {
        [key: string | nix_system_string]: string;
    };
};
