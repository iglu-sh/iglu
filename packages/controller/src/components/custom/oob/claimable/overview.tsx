import type {xTheEverythingType} from "@/types/db";

export default function Overview({cache}:{cache:xTheEverythingType}){
    const cacheSizeInBytes = cache.derivations.size ?? 0;
    // Convert bytes to gigabytes and round to two decimal places
    const cacheSizeInGB = (cacheSizeInBytes / (1024 ** 3)).toFixed(2);
    return(
        <div className="grid grid-cols-4 gap-4 mt-2">
            <div className="flex flex-col gap-2 items-center">
                <strong className="text-2xl">
                    {cache.derivations.count}
                </strong>
                <span className="text-sm text-muted-foreground">
                    Derivations
                </span>
            </div>
            <div className="flex flex-col gap-2 items-center">
                <strong className="text-2xl">
                    {cacheSizeInGB} GB
                </strong>
                <span className="text-sm text-muted-foreground">
                    Derivations Size
                </span>
            </div>
            <div className="flex flex-col gap-2 items-center">
                <strong className="text-2xl">
                    {cache.api_keys ? cache.api_keys.length : 0}
                </strong>
                <span className="text-sm text-muted-foreground">
                    API Key(s) Configured
                </span>
            </div>
            <div className="flex flex-col gap-2 items-center">
                <strong className="text-2xl">
                    {(cache.builders ?? []).length}
                </strong>
                <span className="text-sm text-muted-foreground">
                    Builders
                </span>
            </div>
        </div>
    )
}