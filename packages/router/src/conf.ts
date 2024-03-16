/** @format */

export interface VHost {
  listener: VHostListener;
  target: VHostTarget;
  authentication?: {
    provider: string;
    allowedUsers?: string[];
  };
}

export interface VHostListener {
  host: string;
  prefix?: string;
  stripPrefix?: boolean;
}

export type VHostTarget =
  | {
      type: 'http' | 'https' | 'http2' | 'https2';
      base: string;
    }
  | {
      type: 'file';
      base: string;
    }
  | {
      type: 'process';
      cmd: string;
      workdir?: string;
    };
export type AuthProvider = {
  type: 'basic';
  realm: string;
  users: string | Array<{ username: string; pwhash: string }>;
};

export interface Configuration {
  authProviders?: Record<string, AuthProvider>;
  vhosts: VHost[];
  tlsCertificates: (TlsCertificate|TlsLoader)[];
  port: number;
}

export type TlsLoader = (domains: string[]) => Promise<TlsCertificate[]>;
export interface TlsCertificate {
  cert: string;
  key: string;
  chain: string;
}
