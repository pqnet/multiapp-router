/** @format */

import fastifyBasicAuth from '@fastify/basic-auth';
import { AuthProvider } from './conf.js';
import { verifyHash } from './password.js';

import { FastifyPluginAsync, FastifyPluginOptions } from 'fastify';

interface BasicAuthPluginConf extends FastifyPluginOptions {
  providerConf: AuthProvider;
  validUsers?: string[];
}
export const BasicAuthPlugin: FastifyPluginAsync<BasicAuthPluginConf> = async (
  instance,
  opts,
) => {
  const conf = opts.providerConf;
  const opts2: fastifyBasicAuth.FastifyBasicAuthOptions &
    Partial<BasicAuthPluginConf> = {
    ...opts,
    async validate(username, password, req, reply) {
      const user = conf.users.find((u) => u.username === username);
      if (user === undefined) {
        await new Promise((res) => setTimeout(res, 3000));
        throw new Error('Authentication failed');
      }
      if (!(await verifyHash(password, user.pwhash))) {
        throw new Error('Authentication failed');
      }
      if (opts.validUsers && !opts.validUsers.includes(username)) {
        throw new Error('unauthorized');
      }
    },
    authenticate: { realm: opts.providerConf.realm },
  };
  delete opts2.providerConf;
  delete opts2.validUsers;
  await instance.register(fastifyBasicAuth, opts2);
  instance.addHook('preHandler', instance.auth([instance.basicAuth]));
};
(BasicAuthPlugin as any)[Symbol.for('skip-override')] = true;
