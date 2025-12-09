import type {xTheEverythingType} from "@/types/db";

export default function Configuration({cache}:{cache:xTheEverythingType}){
    return(
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex flex-row justify-between gap-2 items-center">
                <span>Name</span>
                <span className="p-1">{cache.cache.name}</span>
            </div>
            <div className="flex flex-row justify-between gap-2 items-center">
                <span>Compression Method</span>
                <span>{cache.cache.preferredcompressionmethod}</span>
            </div>
            <div className="flex flex-row justify-between gap-2 items-center">
                <span>Public Cache</span>
                <span>{cache.cache.ispublic.toString()}</span>
            </div>
            <div className="flex flex-row justify-between gap-2 items-center">
                <span>Github Username</span>
                <span className="p-1">{cache.cache.githubusername}</span>
            </div>
            <div className="flex flex-row justify-between gap-2 items-center">
                <span>Priority</span>
                <span className="p-1">{cache.cache.priority}</span>
            </div>
        </div>
    )
}