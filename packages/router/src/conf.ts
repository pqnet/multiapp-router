/** @format */

export interface VHost {
  listener: VHostListener;
  target: VHostTarget;
}

export interface VHostListener {
  host: string;
  prefix?: string;
  stripPrefix?: boolean;
}

export type VHostTarget = {
  type: 'http' | 'https' | 'http2' | 'https2';
  base: string;
} | {
  type: 'file';
  base: string;
} | {
  type: 'process';
  cmd: string;
}

export interface Configuration {
  vhosts: VHost[];
  tlsCertificates: TlsCertificate[];
}

export interface TlsCertificate {
  cert: string;
  key: string;
  chain: string;
}

