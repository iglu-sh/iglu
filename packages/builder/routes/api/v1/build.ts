import { Validator } from 'jsonschema'
import type ExpressWs from 'express-ws'
import Logger from '@iglu-sh/logger'

let validator = new Validator();
const bodySchema = require("../../../schemas/bodySchema.json");

// Count concurrent ws connections
let wsCount = 0;

type wsMessage = {
  msg?: string,
  jobStatus: "failed" | "success" | "starting" | "running",
  buildExitCode?: number,
  error?: string,
  stdout?: string
}

export const ws = async (ws:ExpressWs, req:object) => {
  Logger.logRequest("/api/v1/build", "WS")
  wsCount++

  if (wsCount > 1) {
    wsSend({error: "A build job is already running.", jobStatus: "running"})
    wsClose(1011)
  }


  // Send function
  function wsSend(wsMessage: wsMessage) {
    if (wsMessage.error) {
      Logger.error(wsMessage.error)
    } else if (wsMessage.msg) {
      Logger.debug(wsMessage.msg)
    }
    ws.send(JSON.stringify({...wsMessage, ...{timestamp: Date.now() as number}}))
  }

  // Close function is needed to reduce connection count if server closes connection
  function wsClose(statusCode: number) {
    wsCount--
    ws.close(statusCode)
  }


  async function start_build(job: Object) {
    // start build
    wsSend({msg: "Start Building", jobStatus: "starting"})
    Logger.info("Start Build: " + JSON.stringify(job))
    const child = Bun.spawn([Bun.main.split("/").slice(0, -1)?.join("/") + "/lib/build.py", "--json", JSON.stringify(job)])

    // parse output
    for await (const chunk of child.stdout) {
      const lines = new TextDecoder().decode(chunk).split("\n")
      for (const line of lines) {
        if (line !== "") {
          Logger.debug("[STDOUT]: " + line)
          wsSend({stdout: line, jobStatus: "running"})
        }
      }
    }

    await child.exited

    if (child.exitCode == 2) {
      wsSend({
        error: "Invalid command: '" + job.buildOptions.command + "'",
        buildExitCode: child.exitCode,
        jobStatus: "failed"
      })
      wsClose(1007)
    } else if (child.exitCode != 0) {
      wsSend({
        error: "Something went wrong while building. Builder exited with error code " + child.exitCode,
        buildExitCode: child.exitCode,
        jobStatus: "failed"
      })
      wsClose(1011)
    } else {
      wsSend({msg: "Build was successful", buildExitCode: 0, jobStatus: "success"})
      wsClose(1000)
    }
  }

  ws.on('message', function (msg: string) {
    try {
      const job = JSON.parse(msg)
      let validate = validator.validate(job, bodySchema)
      if (!validate.valid) {
        Logger.debug(`${validate.errors}`)
        wsSend({error: "JSON schema is not valid.", jobStatus: "failed"})
        wsClose(1007)
      } else {
        start_build(job)
      }
    } catch (e) {
      wsSend({error: "Not a valid JSON", jobStatus: "failed"})
      wsClose(1007)
    }
  })

  // needed to reduce connection count if client ends the connection
  ws.on('close', function () {
    wsCount--
  })
}
