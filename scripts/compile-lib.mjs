import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

// Compile into a temporary CommonJS directory for dependency-free Node tools.
export function withCompiledLibrary(run) {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "shogi-check-"));
  try {
    const files = fs
      .readdirSync("app/lib", { recursive: true })
      .filter((file) => file.endsWith(".ts") || file.endsWith(".json"));
    for (const file of files) {
      if (file.endsWith(".json")) {
        const target = path.join(output, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join("app/lib", file), target);
        continue;
      }
      const source = fs.readFileSync(path.join("app/lib", file), "utf8");
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true,
        },
      });
      const target = path.join(output, file.replace(/\.ts$/, ".js"));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, outputText);
    }
    return run(output);
  } finally {
    fs.rmSync(output, { recursive: true, force: true });
  }
}
