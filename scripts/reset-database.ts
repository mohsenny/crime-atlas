import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "prisma", "crime-atlas.db");

async function main() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  await fs.rm(DB_PATH, { force: true });

  const schemaSql = execFileSync(
    "npx",
    ["prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  execFileSync("/usr/bin/sqlite3", [DB_PATH], {
    cwd: ROOT,
    input: schemaSql,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });

  console.log(`Reset SQLite database at ${path.relative(ROOT, DB_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
