/** @format */

// @ts-check
/**
 * @typedef {import('./dist/conf').Configuration} Configuration
 */
/**@type {Configuration} */
const conf = {
  port: 8000,
  authProviders: {
    default: {
      type: 'basic',
      realm: 'Test auth',
      users: [
        {
          username: 'pq',
          pwhash:
            '$pbkdf2-sha512$i=200000$+B8oG5v3aMoEyxpad4r06dBGCP8+m0TCZ8DXudk1/J5FP/TS/NLurRlfnYSSC0V52HCYYfx3oYiu0dkg/+KHtA$/fTHYvk5OyR5T6A7HTz0VwfEtro3AySaOOEbKFB0rZsbDooPxyUHiJ/dHJxmojXakaCpOFToJltkSwZX9VgA4A',
        },
      ],
    },
  },
  vhosts: [
    {
      listener: { host: 'ai.local.bartoloni.cloud' },
      authentication: { provider: 'default' },
      target: {
        type: 'http',
        base: 'http://localhost:8080',
      },
    },
  ],
};
export default conf;
if (import.meta.filename === process.argv[1]) {
  console.log(JSON.stringify(conf));
}
