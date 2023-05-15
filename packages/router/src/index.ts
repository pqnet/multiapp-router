/** @format */

import fastify, { FastifyInstance } from 'fastify';
import { tlsOptions } from './tls.js';
export type { Configuration } from './conf.js';
import { findConfig, parseConf } from './parseConf.js';
import fastifyStatic from '@fastify/static';
import fastifyConstraints from 'fastify-constraints';
import fastifyProxy from '@fastify/http-proxy';
import path from 'path';
import { VHost } from './conf.js';
import child_process from 'child_process';
import { render } from './template.js';
import { BasicAuthPlugin } from './auth.js';
import fastifyAuth from '@fastify/auth';

const conf = await parseConf(await findConfig());

// set up fastify over http2
const app = await fastify({
  http2: true,
  https: {
    ...(await tlsOptions(conf.defaultCert, conf.certificates)),
    allowHTTP1: true,
  },
  logger: true,
});
await app.register(fastifyConstraints);

const VhostPlugin = async (
  app: FastifyInstance,
  { vhost }: { vhost: VHost },
) => {
  const host = vhost.listener.host;
  switch (vhost.target.type) {
    case 'file':
      {
        const root = path.resolve(vhost.target.base);
        await app.register(fastifyStatic, {
          root,
          prefix: vhost.listener.prefix,
          prefixAvoidTrailingSlash: true,
          list: { format: 'html', names: ['/'], render },
          constraints: { host },
        });
      }
      break;
    case 'http2':
    case 'http':
    case 'https':
    case 'https2':
      {
        const baseUrl = new URL(vhost.target.base);
        await app.register(fastifyProxy, {
          upstream: vhost.target.base,
          prefix: vhost.listener.prefix,
          websocket: true,
          rewritePrefix:
            (vhost.listener.stripPrefix
              ? ''
              : (vhost.listener.prefix ?? '') + '/') +
            baseUrl.pathname.substring(1),
          constraints: { host },
          http2: vhost.target.type.includes('2'),
        });
      }
      break;
    case 'process':
      {
        const port = Math.floor(Math.random() * 1000 + 10000);
        const command = vhost.target.cmd.replace(
          /\$\{\s*port\s*\}/g,
          port.toString(10),
        );
        const child = child_process.spawn(command, {
          stdio: 'inherit',
          shell: true,
          cwd: vhost.target.workdir,
        });
        await new Promise((resolve) => {
          child.on('spawn', resolve);
        });
        await app.register(fastifyProxy, {
          upstream: `http://localhost:${port}`,
          prefix: vhost.listener.prefix,
          websocket: true,
          rewritePrefix: vhost.listener.stripPrefix
            ? ''
            : vhost.listener.prefix,
          constraints: { host },
        });
      }
      break;
  }
};
if (conf.authProviders) {
  await app.register(fastifyAuth);
}

for (const [host, vhosts] of conf.hosts) {
  for (const vhost of vhosts) {
    await app.register(async (hostApp) => {
      if (vhost.authentication?.provider) {
        const providerConf =
          conf.authProviders?.[vhost.authentication.provider];
        if (providerConf === undefined) {
          throw new Error(
            `missing auth provider ${vhost.authentication.provider}`,
          );
        }
        await hostApp.register(BasicAuthPlugin, {
          providerConf,
          validUsers: vhost.authentication?.allowedUsers,
        });
      }
      await app.register(VhostPlugin, { vhost });
    });
  }
}
app.get('/', { constraints: {} }, async (request, reply) => {
  await reply.code(404);
  return {
    message: 'Host not configured',
    hostname: request.hostname,
  };
});

app.listen({ port: conf.port, host: '0.0.0.0' }, (err, address) => {
  console.error(address, err);
});
