import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card"
import Link from "next/link"

export function NotImplemented(){
  return(
    <div className="w-full flex items-center justify-center h-screen">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl font-bold">
            NOT IMPLEMENTED YET! 
          </CardTitle>
        </CardHeader>
        <CardContent>
          This page is currently not implemented!<br/>
          Feel free to open an issue (if not already present) on our <Link className="font-bold text-primary" href="https://github.com/iglu-sh/controller/issues">GitHub</Link> Page
          <br/>
          If an issue already exists please upvote (👍) it. We will priorise the issue with the most "👍".
        </CardContent>
      </Card>
    </div>
  )
}
