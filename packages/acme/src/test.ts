/** @format */

// @ts-check
/// global console
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';
import acme, { Client, directory, crypto } from 'acme-client';

const conf: Config = {
  configDir: fileURLToPath(new URL('./conf/', import.meta.url)),
  accountEmail: '',
  dnsUpdaters: [],
};
//
import { verifyDomains } from './verify-domains';
import { Config } from '.';
import { loadOrCreateAccountKey, readOrCreateFile } from './lib/readOrCreateFile';

acme.setLogger((message) => console.log(message));


const accountKey = await loadOrCreateAccountKey(conf.configDir);

const client = new Client({
  directoryUrl: directory.letsencrypt.production,
  accountKey,
});
await client.createAccount({
  termsOfServiceAgreed: true,
  contact: [conf.accountEmail],
});

async function getOrCreateCsr(commonName: string, rotateKey = false) {
  const dirName = path.join(conf.configDir, 'certificates', commonName);
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
  const keyFilename = path.join(
    dirName,
    `key-${Number(domainConf.keySerial)}.pem`,
  );
  if (rotateKey) {
    domainConf.keySerial++;
    await fs.writeFile(confFilename, JSON.stringify(domainConf, null, '  '), {
      encoding: 'utf-8',
    });
  }
  const key = await readOrCreateFile(
    keyFilename,
    () => crypto.createPrivateEcdsaKey('P-256'),
    false,
  );
  const [, csr] = await acme.crypto.createCsr(
    { commonName, altNames: [commonName] },
    key,
  );
  return /** @type {const} */ {
    csr,
    key,
    serial: Number(domainConf.keySerial),
  };
}

async function createCertificate(cn: string) {
  const order = await client.createOrder({
    identifiers: [{ type: 'dns', value: cn }],
  });

  const verifySuccess = await verifyDomains(client, order);

  const { csr, key, serial } = await getOrCreateCsr(cn, true);

  const finalizedOrder = await client.finalizeOrder(order, csr);

  const cert = await client.getCertificate(finalizedOrder);
  await fs.writeFile(
    path.join(conf.configDir, 'certificates', cn, `cert-${serial}.pem`),
    cert,
    {
      encoding: 'utf-8',
    },
  );
}
await createCertificate('');
