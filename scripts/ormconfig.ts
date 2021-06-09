import { promises as fs } from 'fs';
import { resolve as pathResolve } from 'path';
import { getArg, getSpinner, resolvePrettierrc } from './util';
import { format as prettierFormat } from 'prettier';
import { config } from 'dotenv';

const path = getArg<boolean>(['p', 'prod', 'production']) ? '/.env-prod' : '/.env';

config({ path: pathResolve(process.cwd() + path) });

const spinner = getSpinner();

async function writeOrmConfig(file: string): Promise<void> {
  spinner.start('Writing ormconfig.js');
  await fs.writeFile(pathResolve(process.cwd() + '/ormconfig.js'), file);
  spinner.stopAndPersist({ symbol: '✔', text: 'ormconfig.js created' });
}

export async function generateOrmConfig(): Promise<void> {
  const { DB_TYPEORM_CONFIG } = await import('../src/environment/database');

  const dbOptions = JSON.stringify({
    ...DB_TYPEORM_CONFIG,
    synchronize: false,
    namingStrategy: 'new NamingStrategy()',
  }).replace(`"new NamingStrategy()"`, 'new NamingStrategy()');

  let file = `const { NamingStrategy } = require('./dist/src/environment/naming.strategy');\n\nmodule.exports = ${dbOptions};`;

  const prettierrc = await resolvePrettierrc();
  file = prettierFormat(file, prettierrc);

  await writeOrmConfig(file);
}