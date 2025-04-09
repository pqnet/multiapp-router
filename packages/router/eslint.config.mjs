/** @format */

import tseslint from 'typescript-eslint';
import base from '../../eslint.config.mjs';
export default tseslint.config(base, {
  ignores: ['dist/**', 'node_modules/**', 'router.conf.js'],
});
