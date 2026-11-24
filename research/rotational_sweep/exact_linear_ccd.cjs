// Exact rational linear CCD negative filter, not a full collision solver.
// Input: one or more original Sample-Queries CSV paths (edge-edge or vertex-face in path).
// SAFE: exact BigInt certificate; UNKNOWN: no certificate within budget. No rotation support.
const fs=require('node:fs');
function benchmark(data){
  const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,k)=>a.map(x=>x*k);
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0n);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const det=(a,b,c)=>dot(a,cross(b,c));
  function gcd(a,b){if(a<0n)a=-a;if(b<0n)b=-b;while(b){const r=a%b;a=b;b=r}return a}
  function parse(input){
    const rows=input.trim().split(/\r?\n/).filter(x=>x.trim()).map(x=>x.split(",").map(y=>BigInt(y.trim())));
    if(rows.length%8||rows.some(r=>r.length!==7||[1,3,5].some(i=>r[i]<=0n)))throw Error("invalid CSV");
    const out=[];
    for(let i=0;i<rows.length;i+=8){
      const rs=rows.slice(i,i+8);let den=1n;for(const r of rs)for(const j of [1,3,5])den=den/gcd(den,r[j])*r[j];
      if(!rs.every(r=>r[6]===rs[0][6])||![0n,1n].includes(rs[0][6]))throw Error("label mismatch");
      out.push({points:rs.map(r=>[0,2,4].map(j=>r[j]*(den/r[j+1]))),truth:rs[0][6]===1n});
    }return out;
  }
  const strict=arr=>arr.every(x=>x>0n)||arr.every(x=>x<0n);
  function rel(p,ee){return ee?[sub(p[0],p[2]),sub(p[0],p[3]),sub(p[1],p[2]),sub(p[1],p[3])]:[sub(p[0],p[1]),sub(p[0],p[2]),sub(p[0],p[3])]}
  function vectors(p,ee){return ee?[sub(p[2],p[0]),sub(p[1],p[0]),sub(p[3],p[2])]:[sub(p[0],p[1]),sub(p[2],p[1]),sub(p[3],p[1])]}
  function coplanarity(a,b,ee){
    const x=vectors(a,ee),y=vectors(b,ee),c=[0n,0n,0n,0n];
    for(let i=0;i<8;i++){const k=((i&1)?1:0)+((i&2)?1:0)+((i&4)?1:0);c[k]+=det(i&1?y[0]:x[0],i&2?y[1]:x[1],i&4?y[2]:x[2])}
    return strict(c);
  }
  function separating(p){
    const sep=n=>strict(p.map(x=>dot(n,x)));
    for(const a of p)if(sep(a))return true;
    for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
      const d=sub(p[j],p[i]);
      if(sep(cross(d,cross(p[i],d))))return true;
      for(let k=j+1;k<p.length;k++)if(sep(cross(d,sub(p[k],p[i]))))return true;
    }return false;
  }
  function certify(points,ee,mode,budget=255,maxDepth=32){
    const stack=[[points.slice(0,4),points.slice(4),0]];let nodes=0;
    const counts={aabb:0,coplanar:0,hull:0};
    while(stack.length){
      if(nodes>=budget)return {safe:false,nodes,counts};
      const [a,b,d]=stack.pop();nodes++;const p=[...rel(a,ee),...rel(b,ee)];
      if([0,1,2].some(j=>strict(p.map(x=>x[j])))){counts.aabb++;continue}
      if(mode!=="aabb"&&coplanarity(a,b,ee)){counts.coplanar++;continue}
      if(mode==="full"&&separating(p)){counts.hull++;continue}
      if(d>=maxDepth)return {safe:false,nodes,counts};
      const mid=a.map((x,i)=>add(x,b[i]));
      stack.push([mid,b.map(x=>mul(x,2n)),d+1],[a.map(x=>mul(x,2n)),mid,d+1]);
    }return {safe:true,nodes,counts};
  }
  const result=[];
  for(const f of data){
    const qs=parse(f.content),ee=f.path.includes("edge-edge");
    const rec={path:f.path,sha:f.sha,queries:qs.length,colliding:qs.filter(x=>x.truth).length,methods:{}};
    for(const mode of ["aabb","bernstein","full"]){
      const t=Date.now();let safe=0,unsafeSafe=0,negative=0,nodes=0,counts={aabb:0,coplanar:0,hull:0};
      for(const q of qs){const s=certify(q.points,ee,mode);safe+=+s.safe;unsafeSafe+=+(s.safe&&q.truth);negative+=+(!q.truth&&s.safe);nodes+=s.nodes;for(const k of Object.keys(counts))counts[k]+=s.counts[k]}
      rec.methods[mode]={safe,unsafeSafe,negativeCertified:negative,nodes,counts,elapsedMs:Date.now()-t};
    }result.push(rec);
  }
  return result;
}
console.log(JSON.stringify(benchmark(process.argv.slice(2).map(path=>({path,content:fs.readFileSync(path,'utf8')}))),null,2));
