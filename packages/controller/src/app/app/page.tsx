"use client";
import { auth } from "@/server/auth";
import {
    useRouter,
    redirect,
    useParams,
    useSearchParams,
} from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";
import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Clock,
    Database,
    Download,
    Hammer,
    HardDrive,
    Network,
    Package,
    RefreshCcw,
    SettingsIcon,
    Users,
    Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Activity from "@/components/custom/overview/activity";
import type { log } from "@/types/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function App() {
    const params = useSearchParams();
    const cacheID = params.get("cacheID");

    const router = useRouter();
    const handler = (path: string) => {
        router.push(path + "?" + params.toString());
    };

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
    const pkgs = api.pkgs.getPkgsForCache.useQuery({
        cacheId: cacheID!,
    },
        {
            // Only fetch if cacheID is valid
            enabled: cacheID !== null && cacheID !== undefined,
        },
    );

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold">
                        {cache
                            ? `Cache Overview for ${cache.cache.name}`
                            : "Loading Cache Overview..."}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        {cache && pkgs
                            ? `${cache.cache.uri}/${cache.cache.name} • Total Packages: ${pkgs.data ? pkgs.data.count : 0}, Storage Used: ${pkgs.data ? pkgs.data.total_storage_used_gb.toFixed(2): 0} GiB`
                            : "Loading cache details..."}
                    </p>
                </div>
                <div className="flex flex-row items-center gap-2">
                    <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2">
                        {cache
                            ? cache.users.map((cache_user_link) => {
                                  return (
                                      <Tooltip key={cache_user_link.user.id}>
                                          <TooltipTrigger asChild>
                                              <Avatar
                                                  key={cache_user_link.user.id}
                                              >
                                                  <AvatarImage
                                                      src={
                                                          cache_user_link.user
                                                              .avatar as string
                                                      }
                                                      alt={`@${cache_user_link.user.username}`}
                                                  />
                                                  <AvatarFallback>
                                                      {cache_user_link.user.username
                                                          .slice(0, 2)
                                                          .toUpperCase()}
                                                  </AvatarFallback>
                                              </Avatar>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                              <span>
                                                  {
                                                      cache_user_link.user
                                                          .username
                                                  }
                                              </span>
                                          </TooltipContent>
                                      </Tooltip>
                                  );
                              })
                            : null}
                    </div>{" "}
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
            <div className="grid grid-cols-2 gap-2">
                <Card className="flex flex-col gap-0">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>Total Packages</div>
                        <Package size={18} />
                    </CardHeader>
                    <CardContent>
                        <strong className="text-2xl font-bold">
                            {pkgs.data? pkgs.data.count : "Loading..."}
                        </strong>
                    </CardContent>
                </Card>
                <Card className="flex flex-col gap-0">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>Storage Used</div>
                        <HardDrive size={18} />
                    </CardHeader>
                    <CardContent>
                        <strong className="text-2xl font-bold">
                            {pkgs.data ? pkgs.data.total_storage_used_gb.toFixed(2) : "Loading..."} GiB
                        </strong>
                    </CardContent>
                </Card>
                <Card className="flex flex-col gap-0">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>Cache Hit Rate</div>
                        <Download size={18} />
                    </CardHeader>
                    <CardContent>
                        <strong className="text-2xl font-bold">
                            {cache ? cache.hashes_overview.count : "Loading..."}
                        </strong>
                    </CardContent>
                </Card>
                <Card className="flex flex-col gap-0">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>Response Time</div>
                        <Clock size={18} />
                    </CardHeader>
                    <CardContent>
                        <strong className="text-2xl font-bold">
                            {cache
                                ? cache.hashes_overview.response_time_average
                                : "Loading..."}{" "}
                            ms
                        </strong>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex flex-row items-center gap-2 text-2xl font-bold">
                        <Zap />
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                    <Button
                        onClick={() => handler("/app/settings")}
                        variant="outline"
                        className="flex h-20 flex-row items-center justify-start gap-1"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <SettingsIcon size={18} />
                                Settings
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Configure cache behavior, storage, and more.
                            </div>
                        </div>
                    </Button>
                    <Button
                        onClick={() => handler("/app/admin")}
                        variant="outline"
                        className="flex h-20 flex-row items-center justify-start gap-1"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <Users size={18} />
                                User Management
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Manage access & permissions.
                            </div>
                        </div>
                    </Button>
                    <Button
                        onClick={() => handler("/app/storage")}
                        variant="outline"
                        className="flex h-20 flex-row items-center justify-start gap-1"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <Database />
                                Storage Management
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Cleanup & optimization
                            </div>
                        </div>
                    </Button>
                    <Button
                        onClick={() => handler("/app/builders")}
                        variant="outline"
                        className="flex h-20 flex-row items-center justify-start gap-1"
                    >
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <Hammer />
                                Builders
                            </div>
                            <div className="text-muted-foreground text-sm">
                                Manage build processes and configurations.
                            </div>
                        </div>
                    </Button>
                </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-2">
                <Card>
                    <CardContent className="flex flex-col gap-4 overflow-x-auto">
                        <CardTitle>Cache Information</CardTitle>
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-row items-center gap-2">
                                <Network size={18} />
                                <strong>Endpoint</strong>{" "}
                                {cache
                                    ? `${cache.cache.uri}/${cache.cache.name}`
                                    : "Loading..."}
                            </div>
                            <div className="flex flex-row items-center gap-2">
                                <Database size={18} />
                                <strong>Compression</strong>{" "}
                                {cache
                                    ? cache.cache.preferredcompressionmethod
                                    : "Loading..."}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex flex-col gap-4">
                        <CardTitle>Recent Activity</CardTitle>
                        <div className="flex h-50 max-h-50 flex-col gap-2 overflow-y-auto">
                            {cache
                                ? cache.audit_log.map(
                                      (log: log, index: number) => {
                                          return (
                                              <Activity log={log} key={index} />
                                          );
                                      },
                                  )
                                : null}
                        </div>
                        <Button
                            variant="outline"
                            className="mt-2 w-full"
                            onClick={() => redirect("/activity")}
                        >
                            View All Activity
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
