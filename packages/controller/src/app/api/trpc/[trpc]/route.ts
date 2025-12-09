// controller/src/app/api/trpc/%5Btrpc%5D/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import Logger from "@iglu-sh/logger";

const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*", // replace "*" with your origin in production
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true" // enable if you need cookies
};

const createContext = async (req: NextRequest) => {
    return createTRPCContext({
        headers: req.headers,
    });
};

const handler = async (req: NextRequest) => {
    Logger.logRequest(req.url, req.method || "UNKNOWN");

    if (req.method === "OPTIONS") {
        return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    }

    // call tRPC handler
    const trpcResp = (await fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: () => createContext(req),
        onError:
            env.NODE_ENV === "development"
                ? ({ path, error }) => {
                    console.error(
                        `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
                    );
                }
                : undefined,
    }));

    // read body and clone headers, then attach CORS headers
    const body = await trpcResp.text();
    const headers = new Headers(trpcResp.headers);
    Object.entries(CORS_HEADERS).forEach(([key, value]) => headers.set(key, value));
    headers.delete("transfer-encoding");

    return new NextResponse(body, { status: trpcResp.status, headers });
};

export { handler as GET, handler as POST, handler as OPTIONS };