import { intro, log, outro } from "@clack/prompts";
import { load_config } from "./lib/config";
import { menu } from "./lib/menu";

intro("Iglu CLI 🐧");
const _conf = await load_config();

log.info("The Iglu CLI is ready to go.");
await menu();

outro("Byeeee");
