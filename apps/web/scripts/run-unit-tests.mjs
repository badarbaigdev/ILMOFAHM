/**
 * Offline-friendly unit test runner for ILM-SETUP-002.
 *
 * Vitest is preferred once the npm registry is reachable. Until then this
 * compiles TypeScript tests with the workspace TypeScript package and runs
 * them through Node's built-in test runner. Extra flags such as `--run`
 * (passed by CI) are accepted and ignored when not applicable.
 */
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, "..");
const srcRoot = join(appRoot, "src");

const passthroughArgs = process.argv
  .slice(2)
  .filter(
    (arg) => arg !== "--run" && arg !== "--watch" && arg !== "--watchAll",
  );

function walk(dir) {
  /** @type {string[]} */
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const sourceFiles = walk(srcRoot).filter((file) => {
  const ext = extname(file);
  return ext === ".ts" || ext === ".tsx";
});

const testFiles = sourceFiles.filter((file) => /\.test\.tsx?$/.test(file));

if (testFiles.length === 0) {
  console.error("No unit tests found under src/ (expected *.test.ts).");
  process.exit(1);
}

const outDir = mkdtempSync(join(tmpdir(), "ilm-unit-"));

try {
  for (const file of sourceFiles) {
    const code = readFileSync(file, "utf8");
    const emitted = ts.transpileModule(code, {
      compilerOptions: {
        // CommonJS avoids ESM extension resolution for relative imports.
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        strict: true,
      },
      fileName: file,
    });

    const rel = relative(srcRoot, file).replace(/\.tsx?$/, ".js");
    const outFile = join(outDir, rel);
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, emitted.outputText, "utf8");
  }

  const compiledTests = testFiles.map((file) =>
    join(outDir, relative(srcRoot, file).replace(/\.tsx?$/, ".js")),
  );

  const result = spawnSync(
    process.execPath,
    ["--test", ...passthroughArgs, ...compiledTests],
    {
      cwd: appRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    },
  );

  process.exit(result.status ?? 1);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
