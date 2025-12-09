import {
    AlertDialog, AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogTrigger,
    AlertDialogAction
} from "@/components/ui/alert-dialog";
import {Button} from "@/components/ui/button";
import {useState} from "react";
import {api} from "@/trpc/react";
import {toast} from "sonner";
import {LoaderCircle} from "lucide-react";
import {useRouter} from "next/navigation";

export default function DeleteBuilder({builderID}:{builderID:number}){
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const mutation = api.builder.deleteBuilder.useMutation({
        onSuccess: (result) => {
            toast.success("Builder deleted successfully");
            router.push("/app/builders")
        },
        onError: (error) => {
            toast.error(`Error deleting builder: ${error.message}`);
            setLoading(false);
            setOpen(false)
        }
    })
    function handleDeleteBuilder(){
        setLoading(true)
        toast.info("Deleting builder...")
        mutation.mutate({id: builderID})
    }
    return(
        <AlertDialog open={open}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" onClick={()=>setOpen(true)}>
                    Delete Builder
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the builder and all its logs, however the actual build artifacts will remain intact.
                </AlertDialogDescription>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={()=>setOpen(false)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button variant="destructive" onClick={()=>{handleDeleteBuilder()}}
                            disabled={loading}
                        >
                            {
                                loading ? <LoaderCircle /> : "Delete Builder"
                            }
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}