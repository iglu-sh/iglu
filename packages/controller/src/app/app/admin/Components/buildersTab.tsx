import type {cache, builder} from "@iglu-sh/types/core/db";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {DataTable} from "@/components/custom/DataTable";
import {buildersColumns} from "@/app/app/admin/Components/columns";

export default function BuildersTab({builders}:{builders: Array<{"cache": cache, "builders": builder[] | null}>}){
    return(
        <Card>
            <CardHeader>
                <CardTitle className="text-xl font-bold">
                    Builders
                </CardTitle>
                <CardDescription>
                    Manage and view all builders associated with caches in the system.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {
                    builders.length === 0 ? (
                        <div>
                            No builders found for any caches.
                        </div>
                    ) : (
                        builders.map((cacheBuilders)=>{
                            return(
                                <div key={cacheBuilders.cache.id}>
                                    <h2 className="text-lg font-semibold">Cache: {cacheBuilders.cache.name}</h2>
                                    <span className="text-sm text-muted-foreground">Showing Builders for cache {cacheBuilders.cache.name}. There are a total of {(cacheBuilders.builders ?? []).length} builders configured</span>
                                    <DataTable columns={buildersColumns} data={cacheBuilders.builders ?? []} noPagination={true} />
                                </div>
                            )
                        })
                    )
                }
            </CardContent>
        </Card>

    )
}