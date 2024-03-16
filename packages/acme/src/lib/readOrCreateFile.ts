/** @format */

import fs from 'fs/promises';
import fscb from 'node:fs';

export function readOrCreateFile(
  filename: string,
  creationCb: () => Promise<string>,
  utf: true,
): Promise<string>;
export function readOrCreateFile(
  filename: string,
  creationCb: () => Promise<Buffer>,
  utf?: false,
): Promise<string>;
export async function readOrCreateFile(
  filename: string,
  creationCb: () => Promise<string | Buffer>,
  utf?: boolean,
): Promise<string | Buffer> {
  try {
    const content = await fs.readFile(filename, {
      encoding: utf ? 'utf-8' : null,
    });
    return content;
  } catch (e) {
    if (fscb.existsSync(filename)) {
      throw e;
    }
    const content = await creationCb();
    await fs.writeFile(filename, content as string | Buffer, {
      encoding: utf ? 'utf-8' : null,
    });
    return content;
  }
}
