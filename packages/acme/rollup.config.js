/** @format */

import resolve from '@rollup/plugin-node-resolve';
import cjsLoader from '@rollup/plugin-commonjs';
import tsLoader from '@rollup/plugin-typescript';
import jsonLoader from '@rollup/plugin-json';
import dtsLoader from 'rollup-plugin-dts';
import path from 'node:path';
// @ts-check
/** @type {import('rollup').RollupOptions[]} */
const config = [
  {
    input: path.join('.', 'src', 'index.ts'),
    plugins: [
      jsonLoader(), // required by Axios, required by acme-client
      tsLoader({
        noEmitOnError: true,
        declarationDir: 'dts',
      }),
      cjsLoader({}),
      resolve({
        preferBuiltins: true,
      }),
    ],
    output: {
      sourcemap: true,
      format: 'esm',
      file: path.join('.', 'dist', 'index.js'),
    },
  },
  {
    input: path.join('.', 'dist', 'dts', 'index.d.ts'),
    plugins: [dtsLoader()],
    output: {
      format: 'esm',
      file: path.join('.', 'dist', 'index.d.ts'),
    },
  },
];
export default config;
