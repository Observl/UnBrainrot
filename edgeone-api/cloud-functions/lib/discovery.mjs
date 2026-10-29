const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0};
export function unseen(items,exclude=[]){const ids=new Set(exclude);return items.filter(x=>!ids.has(x.id)&&!ids.has(x.url))}
export function rotatePool(items,seed=''){return seed?[...items].sort((a,b)=>hash(seed+':'+a.id)-hash(seed+':'+b.id)):items}
