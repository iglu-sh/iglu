import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {Button} from "@/components/ui/button";
import {api} from "@/trpc/react";
import {useEffect, useState} from "react";
import type {dbQueueEntry} from "@iglu-sh/types/core/db";
import Link from "next/link";
import {toast} from "sonner";

export default function CancelRun({run}:{run: dbQueueEntry}){
    const [open, setOpen] = useState(false)
    const {mutate, error, isSuccess, isError, mutateAsync} = api.builder.cancelJob.useMutation()

    async function handleCancel(){
        toast.info(`Cancelling run ${run.builder_run.run.id}...`)
        let mutateReturn = await mutateAsync({jobID: run.builder_run.run.id})
        setOpen(false)
        if(!mutateReturn){
            toast.error(`Failed to cancel run: Unknown error`)
        }
        else{
            toast.success(`Canceled run: ${run.builder_run.run.id}`)
        }
    }
    useEffect(()=>{
        if(error){
            console.error(`Failed to cancel run: ${error.message}`)
        }
    }, [error])
    return(
        <Dialog open={open} onOpenChange={(isOpen)=>{setOpen(isOpen)}}>
            <DialogTrigger asChild><Button variant="destructive" onClick={()=>{setOpen(true)}}>Cancel Run</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will cancel the run with ID <Link className={"text-primary"} target="_blank" href={`/app/builders/runs/${run.builder_run.id}/details`}>{run.builder_run.id}</Link>.
                        <br />The current state of this build is: "<code>{run.builder_run.run.status}</code>".
                        <br />It has been running for {Math.floor((Date.now() - new Date(run.builder_run.run.started_at ?? Date.now()).getTime()) / 1000)} seconds.
                        <br />The last update to this run was at {new Date(run.builder_run.run.updated_at).toLocaleString()}.
                    </DialogDescription>
                </DialogHeader>
                <DialogClose asChild>
                    <Button variant="destructive" onClick={()=>{void handleCancel()}}>Yes, Cancel Run</Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
    )
}