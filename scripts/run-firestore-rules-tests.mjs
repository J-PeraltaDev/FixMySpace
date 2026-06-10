import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const firebaseCli = resolve("node_modules/firebase-tools/lib/bin/firebase.js");
const jestCommand = "node node_modules/jest/bin/jest.js --runInBand __tests__/firestore-emulator.rules.test.ts";
const result = spawnSync(
  process.execPath,
  [firebaseCli, "emulators:exec", "--project", "demo-fixmyspace", "--only", "firestore", jestCommand],
  {
    env: { ...process.env, FIREBASE_CLI_DISABLE_UPDATE_CHECK: "true" },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
