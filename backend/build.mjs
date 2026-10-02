import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
const result=spawnSync(process.execPath,['node_modules/expo/bin/cli','export','--platform','web','--output-dir','dist/client'],{stdio:'inherit',env:{...process.env,CI:'1',EXPO_NO_TELEMETRY:'1'}});if(result.status!==0)process.exit(result.status||1);
await fs.mkdir('dist/server',{recursive:true});await build({entryPoints:['backend/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022'});
await fs.mkdir('dist/.openai',{recursive:true});await fs.copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await fs.writeFile('dist/server/wrangler.json',JSON.stringify({name:'sai',main:'index.js',compatibility_date:'2026-05-15',compatibility_flags:['nodejs_compat'],assets:{directory:'../client',binding:'ASSETS',not_found_handling:'single-page-application'},d1_databases:[{binding:'DB',database_name:'sai-db',database_id:'00000000-0000-4000-8000-000000000000'}]},null,2));
