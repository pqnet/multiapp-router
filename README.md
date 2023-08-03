# Multiapp HTTP Router

This is a simple app gateway for development purposes.
The scenario which it is designed for is to run on Windows and proxy services
on WSL/docker (a standalone Windows binary is provided so that it is possible to run in this scenario without installing NodeJS on the host machine).

It can do:
- Multiplexing HTTP requests to various backend based on host or path
- SSL termination (i.e. proxying an HTTP only backend as HTTPS) 
- HTTP2
- Basic authentication with usernames and hashed passwords
- Route level authorization

# Configuration
Provide a configuration file in the working directory where the application is launched. The file must be named `router.conf.js` or `router.conf.json` according to its format. 
The file can either be a JSON object or a ESM .js file with default export (`yaml` format planned but not yet supported).

If you use ESM keep in mind [nodejs restrictions about `import` expressions](https://nodejs.org/api/esm.html#import-specifiers).
The configuration is loaded through a data URL to allow it to work in [Node SEA](https://nodejs.org/api/single-executable-applications.html) so things such as `import.meta.url` will likely not yield the expected result.

See [configuration](packages/router/src/conf.ts) or the `conf.d.ts` file in the build output for the schema.

## VHost
A VHost is a a pair of listener/target that associates a classifier of incoming requests (listener) with a backend that handles them (target).
A listener will classify requests by hostname and the start of the pathname. These must be unique for each VHost or you will get an error at initialization.

The application will listen on a single TCP port so it won't classify incoming requests based on that.
If you need multiple ports, run multiple instances.

### Targets
VHost Targets are a specification of how the http request must be resolved. There are 3 types:
- `file`: serves statically a directory content, specified with the `base` configuration. Will render `index.html` in directory paths where it is present and provide a rough file listing in directories where it is not (see (template)[packages/router/src/template.ts])
- `http` | `https` | `http2` | `https2`: will proxy requests appending them to the provided `base` HTTP(S) URL.
  If `2` is present in the type name it will resolve the backend using HTTP/2, otherwise it will use HTTP/1.
  `http` and `https` are treated the same (whether to use SSL/TLS on the backend request depends only on the base url specification) 
  If `stripPrefix` property is present in the listener, the prefix specified in the listener will be removed from the URL otherwise it will be kept in the proxy resolution. For example, a request to `/api/myendpoint`:
  - with VHost configuration of `{ listener: { prefix: '/api', stripPrefix: true }, target: { type: 'http', base: 'https://myhost/apibase/'} }` it will be proxied to `https://myhost/apibase/myendpoint`
  - with VHost configuration of `{ listener: { prefix: '/api', stripPrefix: false }, target: { type: 'http', base: 'https://myhost/apibase/'} }` it will be proxied to `https://myhost/apibase/api/myendpoint`
- `process`: will spawn a process from the directory specified in the `cwd` parameter using the command specified in the `cmd` parameter, and proxy requests to that service using http.
  A `${PORT}` string on the command line (e.g. `{ cmd: 'node myapi.js -- --listen=http://localhost:${PORT}' }` will be replaced with a randomly generated port number and the spawned process should listen on localhost HTTP on that port.

## TLS/HTTPS/HTTP2
In the current version SSL/TLS is mandatory. A non-empty list of certificates must be provided for the router to use.

The certificate is chosen among the list of candidates using [SNI](https://en.wikipedia.org/wiki/Server_Name_Indication).
When the SNI header is not present or none of the certificate match, the first certificate in the list will be used.

The server will automatically choose between HTTP/1.1 and HTTP/2 using [ALPN](https://en.wikipedia.org/wiki/Application-Layer_Protocol_Negotiation).

Keys and certificates configuration can either be a literal certificate/key (if the string starts with `-----BEGIN CERTIFICATE-----` or `-----BEGIN PRIVATE KEY-----`) or a filename where the certificate should be loaded from.

The certificates/keys should be in PEM form.

The `chain` parameter should be a list of additional certificates that will be sent to the client to help them verify the certification chain up to a known authority.
It can be empty, for example for self signed certificates.

## Authentication
To support authentication you should provide a list of authentication providers globally and then add an `authentication` parameter to the vhost that you want to protect, with an optional list of authorized users (if the list is not present all users recognised by the provider will be authorized)

Only basic auntentication (username/password) is supported at the moment.

The `users` parameter of the authentication provider is either an array of `{ username, pwhash }` objects directly specified in the configuration file or a reference to a credential file.

The credential file format is one username/password hash pair per line, separated by space, e.g.:
```
alice $pbkdf2-sha512$i=1000$abcde$1234567890abcdef1234567890abcdef
bob $pbkdf2-sha512$i=1000$abcde$1234567890abcdef1234567890abcdef
```

Password hash must be in the PHC format.
The only supported algorithm is `pbkdf2-sha512` at the moment.
It is possible to generate a compatible hash by running the `createHash` function in the [password.ts](packages/router/src/password.ts) file, for example:
```
$ node
> const { createHash } = await import('./dist/password.js')
undefined
> await createHash('bob password')
'$pbkdf2-sha512$i=200000$69NPrvbFODAHy9gpZe833u2akwO2ji4tBuPq5oJ+oDklsKns/UXrqCKMKpUdZQDexoyQB9pNSeagp2EaF+3hdQ$md1roWZARTcxX0+4JAqkeUZcaPgozh+oiny+OxUYk+/xZcc2heM1zbn/Yg7ufL90w+dGQbi8iAKJVt5HiLiwQQ'
```
If users are specified with a file, hashes are updated automatically when the user logs in if the hash iteration of the hash in the file is less than the default hash iteration number (see [password.ts:17](packages/router/src/password.ts#L17))
