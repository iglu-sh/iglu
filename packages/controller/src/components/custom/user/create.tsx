'use client'
import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Switch} from "@/components/ui/switch";
import {useEffect, useState} from "react";
import {useSession} from "next-auth/react";
import {CopyIcon, LoaderCircle} from "lucide-react";
import {api} from "@/trpc/react";
import {toast} from "sonner";
import {Toaster} from "@/components/ui/sonner";

export default function CreateUser({finishCallback}:{finishCallback?: ()=>void}) {
    const [user, setUser] = useState({
        name: '',
        email: '',
        isAdmin: false,
    })
    const [password, setPassword] = useState<null | string>( null);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const auth = useSession()
    const [isError, setIsError] = useState(false);
    const createUser = api.admin.addUser.useMutation({
        onSuccess: (data) => {
            if(!data.success){
                toast.error("A User with this Username or Email already exists. Please try again.");
                setLoading(false);
                return;
            }
            setPassword(data.user.password);
            setLoading(false);
            if(finishCallback){
                finishCallback();
            }
        },
        onError: (error) => {
            setLoading(false);
            setIsError(true);
            console.error("Error creating user:", error);
        }
    })
    useEffect(() => {
        if (isError) {
            toast.error("User creation failed. Please try again.");
            setIsError(false);
        }
    }, [isError]);
    useEffect(()=>{
        if(!open){
            setUser({
                name: '',
                email: '',
                isAdmin: false
            })
            setPassword(null)
            setLoading(false)
        }
    }, [open])
    if (!auth.data || !auth.data.user || !auth.data.user.session_user.is_admin) {
        // If the user is not authenticated or not an admin, do not render the component
        return null;
    }
    function mutateUser(){
        setLoading(true);
        if(!user.name || !user.email){
            toast.error("Please enter a valid name");
            setLoading(false);
            return;
        }
        if(user.name.length <= 1){
            toast.error("Please enter a valid name with more than 1 character");
            setLoading(false);
            return;
        }
        if(!user.email.includes('@') || !user.email.includes('.')){
            toast.error("Please enter a valid email address");
            setLoading(false);
            return;
        }
        createUser.mutate({
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin
        });
    }
    return(
        <Dialog onOpenChange={()=>setOpen(!open)} open={open}>
            <DialogTrigger asChild><Button>Create User</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a new User</DialogTitle>
                    <DialogDescription>
                        Create a new user to manage caches and other resources in Iglu.
                    </DialogDescription>
                </DialogHeader>
                {
                    password ? (
                        <div className="flex flex-row items-center justify-center font-mono p-5 border-accent border-2 rounded-lg bg-secondary">
                            {password}
                            <Button variant="ghost" onClick={()=>{
                                navigator.clipboard.writeText(password || '').catch(() => {
                                    toast.error("Failed to copy password to clipboard");
                                });
                                toast.success("Password copied to clipboard");
                            }}>
                                <CopyIcon />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="username" className="text-sm font-medium">Username *</label>
                                <Input placeholder="Username" onChange={(val)=>{
                                    setUser({...user, name: val.target.value})}
                                } />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label htmlFor="username" className="text-sm font-medium">Email *</label>
                                <Input placeholder="example@example.com" type="email"
                                       onChange={(val)=>{
                                           setUser({...user, email: val.target.value})
                                       }}
                                />
                            </div>
                            <div className="flex flex-row justify-between items-center gap-2">
                                <label htmlFor="username" className="text-sm font-medium">Make User Admin?</label>
                                <Switch defaultChecked={false} onCheckedChange={(val)=>{
                                    setUser({...user, isAdmin: val})
                                }}/>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                A password will be generated for the user and that password has to be reset by the user upon first login. <br/>
                                You will see that password here once, so make sure to copy it and send it to the user.
                            </div>
                        </div>
                    )
                }
                {
                    password ? (
                        <DialogClose asChild>
                            <Button>Done</Button>
                        </DialogClose>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <DialogClose asChild>
                                <Button variant="secondary">Cancel</Button>
                            </DialogClose>
                            <Button onClick={()=>{mutateUser()}} disabled={loading}>{
                                loading ? <LoaderCircle className="animate-spin" /> : 'Create User'
                            }</Button>
                        </div>
                    )
                }
            </DialogContent>
            <Toaster richColors={true} />
        </Dialog>
    )
}