/** @format */
// @ts-check

import rollupConfig from './rollup.config.js';
import path from 'node:path';
import fs from 'node:fs/promises';
import child_process from 'node:child_process';
import util from 'node:util';
const exec = util.promisify(child_process.exec);

async function build_standalone() {
  const ext = path.extname(process.argv[0]);
  const outfile = path.join(
    '.',
    'node-standalone',
    'multiapp-router' + ext,
  );
  console.log(outfile);
  await fs.copyFile(process.argv[0], outfile);
  const seaConfig = {
    main: rollupConfig.output.file,
    output: path.join('.', 'node-standalone', 'sea-prep.blob'),
  };
  const seaConfigFile = path.join('.', 'node-standalone', 'sea-config.json');
  await fs.writeFile(seaConfigFile, JSON.stringify(seaConfig));
  const process1 = exec(
    [`"${process.argv[0]}"`, '--experimental-sea-config', `"${seaConfigFile}"`].join(' '),
  );
  process1.child.stdout?.pipe(process.stdout);
  process1.child.stderr?.pipe(process.stderr);
  await process1;

  const process2 = exec(
    [
      'postject',
      `"${outfile}"`,
      'NODE_SEA_BLOB',
      `"${seaConfig.output}"`,
      '--sentinel-fuse',
      'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
    ].join(' '),
  );
  process2.child.stdout?.pipe(process.stdout);
  process2.child.stderr?.pipe(process.stderr);
  await process2;
  console.log('done');
}

build_standalone().catch((err) => {
  console.error(err);
});
