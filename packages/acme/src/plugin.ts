/** @format */

import getCertificates from './acmeClient';
import { Config } from './config';
export interface TlsCertificate {
  cert: string;
  key: string;
  chain: string;
}

export const provideCertificates =
  (conf: Config) =>
  (domains: string[]): Promise<TlsCertificate[]> =>
    getCertificates(conf, domains);
