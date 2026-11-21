import { getAppReleaseInventory } from "./inventory";

process.stdout.write(JSON.stringify(getAppReleaseInventory(), null, 2) + "\n");
