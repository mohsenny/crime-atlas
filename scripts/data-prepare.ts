import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, "prisma", "crime-atlas.db");
const BACKUP_PATH = path.join(ROOT, "prisma", "crime-atlas.db.backup");

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const hadExistingDb = await fileExists(DB_PATH);

  if (hadExistingDb) {
    await fs.copyFile(DB_PATH, BACKUP_PATH);
  }

  try {
    await run("npx", ["prisma", "generate"]);
    await run("tsx", ["scripts/reset-database.ts"]);
    await run("tsx", ["scripts/prepare-data.ts"]);

    if (await fileExists(BACKUP_PATH)) {
      await fs.rm(BACKUP_PATH, { force: true });
    }
  } catch (error) {
    if (hadExistingDb && await fileExists(BACKUP_PATH)) {
      await fs.copyFile(BACKUP_PATH, DB_PATH);
      await fs.rm(BACKUP_PATH, { force: true });
      console.error("Restored previous SQLite database after failed reseed.");
    }

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
