import { NotImplemented } from "@/components/custom/NotImplemented";

export default function Performance(){
  return(
    <>
      <div className="flex flex-row justify-betweeni items-center w-full">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">
            Performance
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Some performance information
          </p>
        </div>
      </div>
      <NotImplemented/>
    </>
  )
}
