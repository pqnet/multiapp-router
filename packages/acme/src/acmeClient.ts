/** @format */
import path from 'node:path';
import fs from 'node:fs/promises';
import fscb from 'node:fs';
import { Client, crypto, directory } from 'acme-client';
import { readOrCreateFile } from './lib/readOrCreateFile';
import { Config } from '.';
import { verifyDomains } from './lib/verifyDomains';
import { getOrCreateCsr } from './lib/getOrCreateCsr';
import { TlsCertificate } from './plugin';

export default async function getCertificates(conf: Config, domains: string[]) {
  const certificates: TlsCertificate[] = [];
  const missingCertDomains: string[] = [];

  for (const domain of domains) {
    const { cn } = matchWildcard(domain, conf.wildcardDomains);
    // check if we have a certificate and key for this domain
    const { key, certFilename } = await getOrCreateCsr(
      conf.configDir,
      cn,
      false,
    );
    // check if certificate exists
    if (fscb.existsSync(certFilename)) {
      // check if certificate is still valid
      const chain = await fs.readFile(certFilename, { encoding: 'utf-8' });
      const cert = chain.split('\n\n', 1)[0];
      const certInfo = crypto.readCertificateInfo(cert);
      if (certInfo.notAfter > new Date()) {
        // use the existing certificate
        certificates.push({ cert, key, chain });
        continue;
      }
    }

    // request a new certificate
    missingCertDomains.push(cn);
  }
  if (missingCertDomains.length > 0) {
    const newCerts = await createOrRenewCertificates(conf, missingCertDomains);
    certificates.push(...newCerts);
  }
  return certificates;
}

const matchWildcard = (domain: string, candidates?: string[]) => {
  const wildcards = (candidates ?? []).map((w) => w.replace(/^\*?\./, ''));
  // check if we want to use a wildcard
  const identifier = wildcards.find((wildcard) => {
    // split domain into subdomain and domain parts
    const [, ...parentDomainParts] = domain
      .split('.')
      .filter((p) => p.length > 0);
    const parentDomain = parentDomainParts.join('.');
    // check if wildcard matches
    return parentDomain === wildcard;
  });
  const isWildcard = identifier !== undefined;
  const cn = isWildcard ? `*.${identifier}` : domain;
  return {
    cn,
    isWildcard,
    identifier,
  };
};

async function initAcmeClient(conf: Config) {
  const accountKey = await loadOrCreateAccountKey(conf.configDir);

  const client = new Client({
    directoryUrl: directory.letsencrypt.production,
    accountKey,
  });
  const tos = await client.getTermsOfServiceUrl();
  if (tos !== conf.tosUrl) {
    throw new Error('TOS URL mismatch for ACME provider, should be ' + tos);
  }

  await client.createAccount({
    termsOfServiceAgreed: conf.acceptTos,
    contact: [conf.accountEmail],
  });
  return client;
}

async function loadOrCreateAccountKey(configDir: string) {
  const keyFile = path.join(configDir, 'accountkey.pem');
  const key = await readOrCreateFile(keyFile, async () =>
    crypto.createPrivateEcdsaKey('P-384'),
  );
  return key;
}

async function createOrRenewCertificates(
  conf: Config,
  domains: string[],
): Promise<TlsCertificate[]> {
  const client = await initAcmeClient(conf);
  const certificates: TlsCertificate[] = [];
  for (const domain of domains) {
    const order = await client.createOrder({
      identifiers: [{ type: 'dns', value: domain }],
    });
    // const [{ challengeCompleted, authorization }] =
    await verifyDomains(client, order, conf.dnsUpdaters);
    const { csr, key, certFilename } = await getOrCreateCsr(
      conf.configDir,
      domain,
      true,
    );
    const finalizedOrder = await client.finalizeOrder(order, csr);

    const chain = await client.getCertificate(finalizedOrder);
    await fs.writeFile(certFilename, chain, {
      encoding: 'utf-8',
    });
    const cert = chain.split('\n\n', 1)[0];
    certificates.push({ cert, key, chain });
  }
  return certificates;
}
