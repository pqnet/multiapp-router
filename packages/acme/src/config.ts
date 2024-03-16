/** @format */
export interface DnsUpdater {
  supportedDomains: string[];
  setTxt(fqdn: string, value: string): Promise<void>;
}

// TODO: this should be in the config dir
interface TosConfig {
  // Declare acceptance of TOS
  acceptTos: boolean;
  // URL of the TOS being accepted
  tosUrl?: string;
}

export interface Config extends TosConfig {
  configDir: string;
  accountEmail: string;
  wildcardDomains?: string[];
  dnsUpdaters: DnsUpdater[];
}
