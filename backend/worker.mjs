import {api} from './api.mjs';
import {ensureProfileColumns} from './profile-migration.mjs';
let schemaReady;
export default {async fetch(req,env){
 if(new URL(req.url).pathname.startsWith('/api/')){
  if(env.DB){schemaReady??=ensureProfileColumns(env.DB).catch(e=>{schemaReady=null;throw e;});await schemaReady;}
  return api(req,env);
 }
 return env.ASSETS.fetch(req);
}};
