import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const KEY_RE = /^[0-9a-f-]{36}\.[a-z0-9]{1,8}$/;

function rootDir(): string {
  return path.resolve(process.cwd(), process.env.STORAGE_DIR || "./storage");
}

export async function saveFile(buffer: Buffer, extension: string): Promise<string> {
  const ext = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const key = `${randomUUID()}.${ext}`;
  const dir = rootDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, key), buffer);
  return key;
}

export async function readFile(key: string): Promise<Buffer | null> {
  if (!KEY_RE.test(key)) return null;
  try {
    return await fs.readFile(path.join(rootDir(), key));
  } catch {
    return null;
  }
}

export async function deleteFile(key: string): Promise<void> {
  if (!KEY_RE.test(key)) return;
  await fs.rm(path.join(rootDir(), key), { force: true });
}
