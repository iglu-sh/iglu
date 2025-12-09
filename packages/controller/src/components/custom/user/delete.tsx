import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader, DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {useState} from "react";
import {api} from "@/trpc/react";
import {toast} from "sonner";
import {LoaderCircle} from "lucide-react";

export default function DeleteUser({userID}:{userID:string}){
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const deleteUser = api.user.deleteUser.useMutation(
        {
            onSuccess: (data) => {
                // Handle success (e.g., show a toast, refresh user list, etc.)
                toast.success("User deleted successfully! Refresh the user list to see the changes.");
                setOpen(false);
                setLoading(false);
            },
            onError: (error) => {
                // Handle error (e.g., show an error toast)
                toast.error("Error deleting user: " + error.message);
                setOpen(false);
                setLoading(false);
            }
        }
    )
    function handleDeleteUser(){
        setLoading(true);
        deleteUser.mutate({userID: userID});
    }
    return(
        <Dialog onOpenChange={()=>setOpen(!open)} open={open}>
            <DialogTrigger asChild>
                <Button variant="destructive">Delete User</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Are you sure?
                    </DialogTitle>
                    <DialogDescription>
                        Deleting this user is irreversible. All associated data (like API keys and signing keys) will be permanently removed. Please confirm that you want to proceed with this action.
                    </DialogDescription>
                </DialogHeader>
                <div className="w-full flex flex-row gap-2">
                    <DialogClose asChild className="w-auto">
                        <Button variant="secondary">Nope!</Button>
                    </DialogClose>
                    {
                        loading ?
                            <div className="w-full flex flex-row justify-center items-center">
                                <LoaderCircle className="animate-spin" />
                            </div>
                            :
                            <Button variant="destructive" className="w-auto" onClick={()=>{
                                handleDeleteUser()
                            }}>Delete User</Button>
                    }
                </div>
            </DialogContent>
        </Dialog>
    )
}