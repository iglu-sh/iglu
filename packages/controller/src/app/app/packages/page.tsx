//TODO: Fix pagination WITHOUT LOADING EVERY SINGLE ENTRY AT ONCE

"use client";
import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/custom/DataTable";
import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { hash } from "@iglu-sh/types";

export default function Packages() {
    const params = useSearchParams();
    const cacheID = params.get("cacheID");
    const [size, setSize] = useState(50);
    const [offset, setOffset] = useState(0);
    const [hashes, setHashes] = useState<hash[]>([]);
    const [tableIsLoading, setTableIsLoading] = useState<boolean>(true);

    // Fetch the selected cache
    const cache = api.cache.getOverview.useQuery(
        {
            cacheID: cacheID!,
        },
        {
            // Only fetch if cacheID is valid
            enabled: cacheID !== null && cacheID !== undefined,
        },
    ).data;
    const pkgs = api.pkgs.getPkgsByCacheId.useQuery({
        cacheId: cacheID!,
        limit: size,
        offset: offset,
    });
    const columns: ColumnDef<hash>[] = [
        {
            accessorKey: "cstoresuffix",
            header: "Package",
        },
        {
            accessorKey: "size",
            header: "Size in Byte",
        },
        {
            accessorKey: "timestamp",
            header: "Timestamp",
        },
    ];
    useEffect(() => {
        console.log(`Size: ${size}, Offset: ${offset}`);
        setTableIsLoading(true);
    }, [size, offset]);
    useEffect(() => {
        if (!pkgs.data) return;
        setHashes(pkgs.data);
        setTableIsLoading(false);
    }, [pkgs.data]);

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold">
                        {cache
                            ? `Package Overview for ${cache.cache.name}`
                            : "Loading Package Overview..."}
                    </h1>
                </div>
                <div className="flex flex-row gap-2">
                    <Button
                        onClick={() => {
                            window.location.reload();
                        }}
                    >
                        <RefreshCcw />
                        Refresh
                    </Button>
                </div>
            </div>
            <DataTable
                columns={columns}
                data={hashes}
                sizeChangeCallback={(newSize: number) => {
                    setSize(newSize * 2);
                }}
                offsetChangeCallback={(newOffset: number) => {
                    setOffset(newOffset * size);
                }}
                showLoading={tableIsLoading}
            />
        </div>
    );
}
