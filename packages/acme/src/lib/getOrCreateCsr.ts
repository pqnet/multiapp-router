
import path from 'node:path';
import fs from 'node:fs/promises';
import { readOrCreateFile } from './readOrCreateFile';
import { crypto } from 'acme-client';

export async function getOrCreateCsr(configDir: string, commonName: string, rotateKey = false) {
  const dirName = path.join(configDir, 'certificates', commonName);
  await fs.mkdir(dirName, { recursive: true });
  const confFilename = path.join(dirName, 'conf.json');
  const defaultConf = {
    keySerial: 0,
  };
  const domainConf = JSON.parse(
    await readOrCreateFile(
      confFilename,
      async () => JSON.stringify(defaultConf, null, '  '),
      true,
    ),
  );
  if (
    typeof domainConf.keySerial !== 'number' ||
    !isFinite(domainConf.keySerial)
  ) {
    throw new Error('serial is not a good number');
  }
  if (rotateKey) {
    domainConf.keySerial++;
    await fs.writeFile(confFilename, JSON.stringify(domainConf, null, '  '), {
      encoding: 'utf-8',
    });
  }
  const keyFilename = path.join(
    dirName,
    `key-${Number(domainConf.keySerial)}.pem`,
  );
  const certFilename = path.join(
    dirName,
    `cert-${Number(domainConf.keySerial)}.pem`,
  );

  const key = await readOrCreateFile(
    keyFilename,
    () => crypto.createPrivateEcdsaKey('P-256'),
    false,
  );
  const [, csr] = await crypto.createCsr(
    { commonName, altNames: [commonName] },
    key,
  );

  return /** @type {const} */ {
    csr,
    certFilename,
    key,
    serial: Number(domainConf.keySerial),
  };
}
