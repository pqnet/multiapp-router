/** @format */

module '@phc/format' {
  export interface HashObjectBase {
    id: string;
    version?: number;
    params?: Record<string, unknown>;
    salt?: Buffer;
    hash?: Buffer;
  }
  export interface HashObjectPbkdf2Sha512 extends HashObjectBase {
    id: 'pbkdf2-sha512';
    version?: undefined;
    params: {
      i: number;
    };
    salt: Buffer;
    hash: Buffer;
  }
  export type HashObject = HashObjectPbkdf2Sha512;
  export function deserialize(hash: string): HashObjectBase;
  export function deserialize<Id extends HashObject['id']>(
    hash: `$${id}$${string}`,
  ): HashObject & { id: Id };
  export function serialize(hash: HashObjectBase): string;
  export function serialize<Id extends HashObject['id']>(
    hash: HashObject & { id: Id },
  ): `$${id}$${string}`;
}
