/** @format */

import nodeCrypto from 'node:crypto';
import {
  HashObjectBase,
  HashObjectPbkdf2Sha512,
  deserialize,
  serialize,
} from '@phc/format';
import { promisify } from 'node:util';
const pbkdf2 = promisify(nodeCrypto.pbkdf2);

const creationParams: HashObjectPbkdf2Sha512 = {
  id: 'pbkdf2-sha512',
  hash: Buffer.alloc(0),
  salt: Buffer.alloc(0),
  params: { i: 200000 },
};

export async function createHash(password: string) {
  const binaryPassword = Buffer.from(password, 'utf-8');
  const hashObj = { ...creationParams };
  hashObj.salt = await promisify(nodeCrypto.randomBytes)(64);
  hashObj.hash = await pbkdf2(
    binaryPassword,
    hashObj.salt,
    hashObj.params.i,
    64,
    'sha512',
  );
  return serialize(hashObj);
}
const checkHash: (
  arg: HashObjectBase,
) => asserts arg is HashObjectPbkdf2Sha512 = (arg) => {
  if (
    !(arg.id === 'pbkdf2-sha512',
    'salt' in arg && 'params' in arg && 'i' in (arg?.params ?? {}))
  ) {
    throw new Error('Invalid hash');
  }
};
export async function verifyHash(
  password: string,
  hash: string,
): Promise<boolean> {
  const hashObj = deserialize(hash);
  switch (hashObj.id) {
    case 'pbkdf2-sha512': {
      const binaryPassword = Buffer.from(password, 'utf-8');
      checkHash(hashObj);
      const testHash = await pbkdf2(
        binaryPassword,
        hashObj.salt,
        hashObj.params.i,
        64,
        'sha512',
      );
      return !Buffer.compare(testHash, hashObj.hash);
    }
    default:
      return false;
  }
}
