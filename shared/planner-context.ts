import {canonical,preferenceOf,type Profile} from './matching';

// Query ordering and freshly-created object identities do not change the analysis.
export function plannerContext(people:Profile[]){
 return JSON.stringify(people.map(p=>({id:p.id,interests:p.interests.filter(t=>t.shared).map(t=>({label:canonical(t.label),category:t.category,preference:preferenceOf(t)})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))})).sort((a,b)=>a.id.localeCompare(b.id)));
}
