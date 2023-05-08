import type { SecureServerOptions } from 'http2';
import { createSecureContext, type SecureContext } from 'tls';
// import fs from 'fs/promises';
// import { fileURLToPath } from 'node:url';
import { TlsCertificate } from './conf.js';
import { ParsedCert } from './parseConf.js';


// const keyUrl = new URL('../private/privkey.pem', import.meta.url);
// const certUrl = new URL('../private/cert.pem', import.meta.url);
// const caUrl = new URL('../private/chain.pem', import.meta.url);
// load keys from disk
export const tlsOptions = async (defaultCertificate: TlsCertificate, certificates: ParsedCert[] ): Promise<SecureServerOptions> => {
  const {key,cert, chain:ca} = defaultCertificate;
  const SNICallback =  (servername: string, cb:(err:Error| null, ctx?: SecureContext)=>void) => {
    const {key,cert, chain:ca} = certificates.find(c => c.match(servername)) ?? defaultCertificate;
    let ctx;
    try {
      ctx = createSecureContext({key, cert, ca});
    } catch (e) {
      if (e instanceof Error) {
        console.error(e);
        return cb(e);
      } else {
        console.error("Unknown error (not error class)", e);
      }
    }
    cb(null, ctx);
  };
  return { key, cert, ca, SNICallback }
};
