import {Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import type {xTheEverythingType} from "@/types/db";
import {useEffect, useState} from "react";
import {CircleCheck, LoaderCircle} from "lucide-react";
import {api} from "@/trpc/react";

export default function AddDialogue({claimedCaches, caches, userID}:{claimedCaches:number[], caches:xTheEverythingType[], userID:string}) {
    const [open, setOpen] = useState(false);
    const [changedCaches, setChangedCaches] = useState<number[]>([]);
    const [currentID, setCurrentID] = useState<number | null>(null);
    const changeCache = api.admin.changeAccess.useMutation()
    const removeOOB = api.admin.removeOOBFlag.useMutation()
    useEffect(()=>{
        // Only run when the dialog opens
        if(open){
            for(const cacheId of claimedCaches){
                // Set the currentID to the first cache ID
                if(currentID === null){
                    setCurrentID(cacheId);
                }

                // Find the cache in the caches array
                const cache = caches.find(c => c.cache.id === cacheId);
                // If the cache is not found, skip it
                if(!cache) continue;

                // Mutate the cache to indicate it has been changed
                changeCache.mutate({
                    type: "add",
                    resourceId:cacheId,
                    resourceType: "cache",
                    userId: userID
                })

                for(const key of cache.api_keys ?? []){
                    // Mutate the API key to indicate it has been changed
                    changeCache.mutate({
                        type: "add",
                        resourceId: key.id,
                        resourceType: "apikey",
                        userId: userID
                    })
                }
                // Check if the cache is already in the changedCaches array
                if(!changedCaches.includes(cacheId)){
                    // If not, add it to the changedCaches array
                    setChangedCaches(prev => [...prev, cacheId]);
                }
            }

            // Set the currentID to null after processing all caches
            setCurrentID(null);

            // Remove the OOB flag from the user
            removeOOB.mutate(userID)
            // Wait for a second
            setTimeout(() => {
                // Close the dialog after a short delay
                setOpen(false);
            }, 1000);
            // Redirect to the /app pages after being done
            window.location.href = "/app"
        }
    }, [open])
    return(
        <Dialog onOpenChange={()=> setOpen(!open)} open={open}>
            <DialogTrigger asChild>
                <Button>Confirm</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    Setting up
                </DialogTitle>
                <DialogDescription>
                    This will take a few seconds. Please do not close this window.
                </DialogDescription>
                <div className="flex flex-col">
                    {
                        claimedCaches.map((cacheId, index)=>{
                            const cache = caches.find(c => c.cache.id === cacheId);
                            return(
                                <div key={index} className={`w-full flex flex-row justify-between items-center ${changedCaches.includes(cacheId) ? "text-green-500" : "text-muted-foreground"} ${currentID === cacheId ? "text-blue-500" : ""}`}>
                                    Cache {cache?.cache.name ?? "Unknown"} ({cacheId}) is being set up.
                                    {
                                        currentID === cacheId ? (
                                            <LoaderCircle className="animate-spin" />
                                        ) : null
                                    }
                                    {
                                        changedCaches.includes(cacheId) ? (
                                            <CircleCheck />
                                        ) : null
                                    }
                                </div>
                            )
                        })
                    }
                </div>
            </DialogContent>
        </Dialog>
    )
}