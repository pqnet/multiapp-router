/** @format */
import { Authorization } from 'acme-client';
import { Challenge } from 'acme-client/types/rfc8555';
import { DnsUpdater } from '../config';

export async function prepareChallengeResponse(
  authz: Authorization,
  challenge: Challenge,
  keyAuthorization: string,
  dnsUpdaters: DnsUpdater[],
) {
  switch (challenge.type) {
    case 'dns-01': {
      // find the dns updater for the domain
      const domain = authz.identifier.value;
      const updater = dnsUpdaters.find((u) =>
        u.supportedDomains.find((d) => domain.endsWith(d)),
      );
      if (!updater) {
        throw new Error(`No dns updater found that supports domain ${domain}`);
      }
      const dnsRecordName = `_acme-challenge.${domain}`;
      const recordValue = keyAuthorization;
      console.log(`Create TXT record for ${domain}`);
      console.log(
        `Set a .txt record named ${dnsRecordName} with the value of ${recordValue}`,
      );
      await updater.setTxt(dnsRecordName, recordValue);
      // TODO: should we poll for the record to be available?

      break;
    }
    default:
      throw new Error(`challenge type ${challenge.type} not supported`);
  }
}
