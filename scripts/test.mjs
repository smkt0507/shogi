import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { withCompiledLibrary } from "./compile-lib.mjs";

withCompiledLibrary((output) => {
  const tests = fs
    .readdirSync("tests")
    .filter((file) => file.endsWith(".test.mjs"))
    .map((file) => `tests/${file}`);
  const result = spawnSync(process.execPath, ["--test", ...tests], {
    stdio: "inherit",
    env: { ...process.env, SHOGI_TEST_LIB_DIR: output },
  });
  process.exitCode = result.status ?? 1;
});
