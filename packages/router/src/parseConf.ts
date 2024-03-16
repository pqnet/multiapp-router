/** @format */

import { X509Certificate } from 'crypto';
import {
  AuthProvider,
  Configuration,
  TlsCertificate,
  TlsLoader,
  VHost,
} from './conf.js';
import fs from 'node:fs/promises';
export type ParsedCert = TlsCertificate & { match(host: string): boolean };
export interface ParsedConf {
  certificates: ParsedCert[];
  defaultCert: ParsedCert;
  hosts: Map<string, VHost[]>;
  port: number;
  authProviders: Record<string, AuthProvider>;
}
const parseTlsCertificates = (tlsCertificates: TlsCertificate[]) =>
  Promise.all(
    tlsCertificates.map(async ({ cert, key, chain }) => {
      if (!cert.startsWith('-----BEGIN CERTIFICATE-----')) {
        cert = await fs.readFile(cert, 'utf8');
      }
      if (!key.startsWith('-----BEGIN PRIVATE KEY-----')) {
        key = await fs.readFile(key, 'utf8');
      }
      if (!chain.startsWith('-----BEGIN CERTIFICATE-----')) {
        chain = await fs.readFile(chain, 'utf8');
      }
      const parsedCert = new X509Certificate(cert);
      const cn =
        parsedCert.subject
          .split('\n')
          .find((l) => /^CN=/.test(l))
          ?.split('=')[1] ?? '';
      const alts = parsedCert.subjectAltName?.split(',') ?? [];
      const altDomains = alts
        .filter((a) => /^DNS:/.test(a))
        .map((a) => a.split(':')[1]);
      const altIps = alts
        .filter((a) => /^IP Address:/.test(a))
        .map((a) => a.split(':')[1]);
      const match = (host: string) =>
        host === cn || altDomains.includes(host) || altIps.includes(host);
      return { cert, key, chain, match };
    }),
  );

export async function parseConf(conf: Configuration): Promise<ParsedConf> {
  // group vhosts by listener host
  const hosts = new Map<string, VHost[]>();
  for (const vhost of conf.vhosts) {
    const { host } = vhost.listener;
    if (!hosts.has(host)) hosts.set(host, []);
    hosts.get(host)?.push(vhost);
  }
  hosts.forEach((v) => {
    // sort by prefix
    v.sort((a, b) =>
      (a.listener.prefix ?? '/').localeCompare(b.listener.prefix ?? '/'),
    );
  });

  // prepare tls router to choose certificate based on SNI
  const inlineCertificates = await parseTlsCertificates(
    conf.tlsCertificates.filter(
      (c) => typeof c !== 'function',
    ) as TlsCertificate[],
  );
  const certLoaders = conf.tlsCertificates.filter(
    (c) => typeof c === 'function',
  ) as TlsLoader[];
  const hostnames = Array.from(hosts.keys());
  const loadedCerts = (
    await Promise.all(
      certLoaders.map((l) => l(hostnames).then(parseTlsCertificates)),
    )
  ).flat();
  const certificates = [...inlineCertificates, ...loadedCerts];
  const defaultCert = certificates.find(() => true);
  if (!defaultCert) throw new Error('No default certificate');
  return {
    certificates,
    defaultCert,
    hosts,
    port: conf.port,
    authProviders: conf.authProviders ?? {},
  };
}

export async function findConfig() {
  // locate configuration file in the working directory. Candidates:
  // - router.conf.js
  // - router.conf.json
  // - router.conf.yaml
  const candidates = ['router.conf.js', 'router.conf.json', 'router.conf.yaml'];
  for (const candidate of candidates) {
    try {
      const type = candidate.split('.').pop();
      const content = await fs.readFile(candidate, 'utf8');
      if (type === 'json') return JSON.parse(content);
      if (type === 'js') {
        const url = `data:text/javascript;charset=UTF-8,${encodeURIComponent(
          content,
        )}`;
        return (await import(url)).default;
      }
    } catch (e) {
      console.warn(e);
      continue;
    }
  }
  throw new Error('no config file found');
}
