import {api} from './api.mjs';
export default {async fetch(req,env){if(new URL(req.url).pathname.startsWith('/api/'))return api(req,env);return env.ASSETS.fetch(req);}};
