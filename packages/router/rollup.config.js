/** @format */

import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import cjsLoader from '@rollup/plugin-commonjs';
import jsonLoader from '@rollup/plugin-json';
import fs from 'fs/promises';
import path from 'node:path';
import process from 'node:process';
import child_process from 'node:child_process';
import util from 'node:util';
const exec = util.promisify(child_process.exec);
/** @type {import('rollup').RollupOptions} */
const inputOptions = {
  input: path.join('.', 'dist', 'index.js'),
  plugins: [
    jsonLoader({}),
    cjsLoader({}),
    resolve({
      preferBuiltins: true,
    }),
  ],
};
/** @type {import('rollup').OutputOptions} */
const outputOptions = {
  format: 'cjs', // commonjs
  file: path.join('.', 'node-standalone', 'bundle.cjs'),
};

export async function build_standalone() {
  const bundle = await rollup(inputOptions);
  await bundle.write(outputOptions);
  const ext = path.extname(process.argv[0]);
  const outfile = path.join(
    '.',
    'node-standalone',
    'multiapp-router' + (ext ? '.' + ext : ''),
  );
  console.log(outfile);
  await fs.copyFile(process.argv[0], outfile);
  const seaConfig = {
    main: path.join('.', 'node-standalone', 'bundle.cjs'),
    output: path.join('.', 'node-standalone', 'sea-prep.blob'),
  };
  const seaConfigFile = path.join('.', 'node-standalone', 'sea-config.json');
  await fs.writeFile(seaConfigFile, JSON.stringify(seaConfig));
  const { stdout, stderr } = await exec(
    [`"${process.argv[0]}"`, '--experimental-sea-config', `"${seaConfigFile}"`].join(' '),
  );
  console.error(stderr);
  console.log(stdout);
  const { stdout: stdout2, stderr: stderr2 } = await exec(
    [
      'postject',
      `"${outfile}"`,
      'NODE_SEA_BLOB',
      `"${seaConfig.output}"`,
      '--sentinel-fuse',
      'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    ].join(' '),
  );
  console.error(stderr2);
  console.log(stdout2);
}
export default {
  ...inputOptions,
  output: outputOptions,
};
