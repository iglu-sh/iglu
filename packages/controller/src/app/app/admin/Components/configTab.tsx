import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {DataTable} from "@/components/custom/DataTable";
import {configColumns} from "@/app/app/admin/Components/columns";
import Link from "next/link";

export default function ConfigTab({config}:{config:{
        server: Array<{
            envVar: string,
            value: unknown,
            description: string
        }>,
        client: Array<{
            envVar: string,
            value: unknown,
            description: string
        }>
    }}){
    return(
        <Card>
            <CardHeader>
                <CardTitle>Controller Configuration</CardTitle>
                <CardDescription>
                    Configuration options for the Iglu Controller. These are <strong>Read-Only</strong>! You have to set these as environment variables before starting the controller. <br />
                    For more information, check out our <Link href="https://docs.iglu.sh/docs/Components/Iglu%20Controller#configuration" target="_blank" rel="noreferrer" className="text-primary">documentation</Link>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full" defaultValue="server">
                    <AccordionItem value="server">
                        <AccordionTrigger className="w-full">
                            Server Environment Variables
                        </AccordionTrigger>
                        <AccordionContent className="w-full">
                            These are configuration options that normally only the server has access to.
                            <DataTable columns={configColumns} data={config.server} noPagination={true} />
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="client">
                        <AccordionTrigger className="w-full">
                            Client Environment Variables
                        </AccordionTrigger>
                        <AccordionContent className="w-full">
                            These are configuration options that are exposed to the client-side application.
                            <DataTable columns={configColumns} data={config.client} noPagination={true} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    )
}