/** @format */

import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import cjsLoader from '@rollup/plugin-commonjs';
import jsonLoader from '@rollup/plugin-json';
import path from 'node:path';
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
  file: path.join('.', 'bundle.cjs'),
};

export default {
  ...inputOptions,
  output: outputOptions,
};
