import {
    AlertDialog, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {useEffect, useState} from "react";
import {LoaderCircle} from "lucide-react";
import {api} from "@/trpc/react";
import {toast} from "sonner";

export default function RemoveFromCache({apiKeyId, cacheId, disabled = false, onCloseCallback = ()=>{}}:{apiKeyId: string, cacheId:string, disabled?: boolean, onCloseCallback?: ()=>void}){
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const removeApiCall = api.cache.removeKeyFromCache.useMutation(
        {
            onSuccess: ()=>{
                setLoading(false);
                toast.success("Successfully removed API Key from Cache!");
                setOpen(false);
            },
            onError: ()=>{
                setLoading(false);
                toast.error("Failed to remove API Key from Cache, please retry later!");
            }
        }
    )
    useEffect(()=>{
        if(!open){
            setLoading(false);
            onCloseCallback()
        }
    }, [open])
    function handleClick(){
        setLoading(true);
        removeApiCall.mutate({apiKeyID: apiKeyId, cacheID: cacheId});
    }
    return(
        <AlertDialog open={open} onOpenChange={()=>setOpen(!open)}>
            <AlertDialogTrigger asChild>
                <Button disabled={disabled} variant={"destructive"}>
                    Remove
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Are you sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove the API Key with ID "{apiKeyId}" from the cache with ID "{cacheId}". You can re-add it later if needed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex flex-row gap-4 w-full">
                    <AlertDialogCancel asChild>
                        <Button variant="secondary">
                            Cancel
                        </Button>
                    </AlertDialogCancel>
                    <Button variant="destructive" onClick={handleClick} disabled={loading}>
                        {loading ? <LoaderCircle className="animate-spin" /> : "Do it!" }
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}