import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription, DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import Link from "next/link";

export default function JsonView({data}:{data: object}){
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="secondary">View as JSON</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        JSON View
                    </DialogTitle>
                    <DialogDescription>
                        This is your Builder config represented as JSON. You can copy this data for backup or transfer purposes. <br />
                        Alternatively, you can use this to test your Builder image locally by passing the JSON data to the Builder CLI. <br />
                        This data is compliant with the <Link className="text-primary" href={`https://github.com/iglu-sh/types/blob/main/core/db.d.ts#L211`}>combinedBuilder</Link> type, which is the schema used for builds!
                    </DialogDescription>
                </DialogHeader>
                <div className="max-w-full overflow-x-auto">
                    <pre className="max-h-[50vh] overflow-y-auto p-4 max-w-full rounded-md">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
                <DialogFooter className="w-full">
                    <DialogClose asChild className="w-full">
                        <Button>Done</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        )
}