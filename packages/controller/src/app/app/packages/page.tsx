"use client"
import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/custom/DataTable";
import type {pkgsInfo} from "@/types/db"
import {useEffect, useState} from "react";

export default function Packages(){
  const params = useSearchParams()
  const cacheID = params.get("cacheID");
  const [size, setSize] = useState(0)
  // Fetch the selected cache
  const cache = api.cache.getOverview.useQuery({
      cacheID: parseInt(cacheID!) // This should be replaced with the actual cache ID you want to fetch
  }, {
      // Only fetch if cacheID is valid
      enabled: cacheID !== null && cacheID !== undefined,
  }).data

  const columns = [
    {
        accessorKey: "cstoresuffix",
        header: "Package",
    },
    {
      accessorKey: "size",
      header: "Size in Byte"
    },
    {
      accessorKey: "timestamp",
      header: "Timestamp"
    }
  ]

    const pkgs = api.pkgs.getPkgsForCache.useQuery({cacheId: parseInt(cacheID!)})
    useEffect(()=>{
        if(!cache || !pkgs?.data?.rows) return
        const sizeInner = cache && pkgs ? pkgs.data.rows.reduce((prev, cur) => {
            console.log(prev + parseInt(cur.size))
            return prev + parseFloat(cur.size) / 1024 / 1024 / 1024
        }, 0) : 0
        setSize(sizeInner)
    }, [size, pkgs])

  return(
    <div className="w-full flex flex-col gap-4">
        <div className="flex flex-row justify-between items-center w-full">
            <div className="flex flex-col">
                <h1 className="text-3xl font-bold">
                    {cache ? `Package Overview for ${cache.info.name}` : "Loading Package Overview..."}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {
                        cache && pkgs ? `${cache.info.uri}/${cache.info.name} • Total Packages: ${pkgs?.data?.rows.length ?? 0}, Storage Used: ${size.toFixed(2)}GiB` : "Loading cache details..."
                    }
                </p>
            </div>
            <div className="flex flex-row gap-2">
                <Button onClick={()=>{window.location.reload()}}>
                    <RefreshCcw />
                    Refresh
                </Button>
            </div>
          </div>
            {
                pkgs.isLoading || !pkgs.data ? (<div>Loading...</div>) : (
                    <DataTable columns={columns} data={pkgs?.data?.rows as pkgsInfo[] ?? []}/>
                ) 
            }
        </div>
  )
}
