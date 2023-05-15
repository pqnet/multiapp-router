/** @format */

import fastifyBasicAuth from '@fastify/basic-auth';
import { AuthProvider } from './conf.js';
import { verifyHash } from './password.js';

import { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';
import { readFile, writeFile } from 'fs/promises';

const readUsers = async (filename: string) => {
  const buf = await readFile(filename, 'utf-8');
  return buf
    .split('\n')
    .map((l) => {
      const [username, pwhash] = l.split(/ (.*)/);
      return { username, pwhash };
    })
    .filter((u) => u.username && u.pwhash);
};
const saveUsers = async (
  filename: string,
  users: Array<{ username: string; pwhash: string }>,
) => {
  const buf = users.map((u) => `${u.username} ${u.pwhash}`).join('\n');
  await writeFile(filename, buf, 'utf-8');
};

interface BasicAuthPluginConf extends FastifyPluginOptions {
  providerConf: AuthProvider;
  validUsers?: string[];
}
export const BasicAuthPlugin: FastifyPluginAsync<BasicAuthPluginConf> = async (
  instance,
  opts,
) => {
  const conf = opts.providerConf;
  const usersFile = typeof conf.users === 'string' ? conf.users : undefined;
  const users = usersFile ? await readUsers(usersFile) : conf.users;
  if (
    !Array.isArray(users) ||
    !users.every(
      (u) => typeof u.username === 'string' && typeof u.pwhash === 'string',
    )
  ) {
    throw new Error('Unexpected user format');
  }
  const saveHash = usersFile
    ? async (username: string, pwhash: string) => {
        const user = users.find((u) => u.username === username);
        if (!user) {
          return;
        }
        user.pwhash = pwhash;
        await saveUsers(usersFile, users);
      }
    : undefined;
  const opts2: fastifyBasicAuth.FastifyBasicAuthOptions &
    Partial<BasicAuthPluginConf> = {
    ...opts,
    async validate(username, password, req, reply) {
      const user = users.find((u) => u.username === username);
      if (user === undefined) {
        await new Promise((res) => setTimeout(res, 3000));
        throw new Error('Authentication failed');
      }
      const newHash = await verifyHash(password, user.pwhash);
      if (!newHash) {
        throw new Error('Authentication failed');
      }
      if (typeof newHash === 'string' && saveHash) {
        await saveHash(username, newHash);
      }
      if (opts.validUsers && !opts.validUsers.includes(username)) {
        throw new Error('unauthorized');
      }
    },
    authenticate: { realm: opts.providerConf.realm },
  };
  delete opts2.providerConf;
  delete opts2.validUsers;
  delete opts2.saveHash;
  await instance.register(fastifyBasicAuth, opts2);
  instance.addHook('preHandler', instance.auth([instance.basicAuth]));
};
(BasicAuthPlugin as any)[Symbol.for('skip-override')] = true;
