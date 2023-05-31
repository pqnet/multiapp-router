/** @format */

import { build_standalone } from './rollup.config.js';

build_standalone().catch((err) => {
  console.error(err);
});
