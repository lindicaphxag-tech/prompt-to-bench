// Exact rational two-sided CCD: SAFE / COLLISION / UNKNOWN.
// Reproduce: node two_sided_ccd.cjs <original CSV files>
const fs=require('node:fs');
// Exact 1-D semialgebraic contact fallback; BigInt polynomial arithmetic.
// Polynomials are ascending power coefficients. Positive rescaling preserves sign.
function exactContact(points,ee,{limit=4096}={}){
  let work=0;const tick=()=>{if(++work>limit)throw Error("root budget")};
  const trim=p=>{p=p.slice();while(p.length>1&&!p.at(-1))p.pop();return p};
  const zero=p=>p.every(x=>x===0n),abs=x=>x<0n?-x:x;
  function gcd(a,b){a=abs(a);b=abs(b);while(b){[a,b]=[b,a%b]}return a}
  function primitive(p){p=trim(p);const g=p.reduce((a,b)=>gcd(a,b),0n);return g?p.map(x=>x/g):[0n]}
  const add=(a,b)=>trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]||0n)+(b[i]||0n)));
  const neg=a=>a.map(x=>-x),sub=(a,b)=>add(a,neg(b)),scale=(a,s)=>a.map(x=>x*s);
  function mul(a,b){const c=Array(a.length+b.length-1).fill(0n);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)c[i+j]+=a[i]*b[j];return trim(c)}
  function rem(a,b){a=primitive(a);b=primitive(b);if(zero(b))throw Error("zero divisor");while(!zero(a)&&a.length>=b.length){tick();const l=b.at(-1),q=a.at(-1)*(l<0n?-1n:1n);a=primitive(sub(scale(a,abs(l)),Array(a.length-b.length).fill(0n).concat(scale(b,q))))}return a}
  const deriv=p=>p.length===1?[0n]:p.slice(1).map((x,i)=>x*BigInt(i+1));
  function pgcd(a,b){while(!zero(b)){[a,b]=[b,rem(a,b)]}return primitive(a)}
  function sturm(p){const s=[primitive(p)];if(p.length===1)return s;s.push(primitive(deriv(p)));while(true){const r=neg(rem(s.at(-2),s.at(-1)));if(zero(r))break;s.push(r)}return s}
  function value(p,[n,d]){let a=p.at(-1),power=1n;for(let i=p.length-2;i>=0;i--){power*=d;a=a*n+p[i]*power}return a}
  const sign=x=>x>0n?1:x<0n?-1:0;
  const variation=(s,t)=>{let old=0,n=0;for(const p of s){const v=sign(value(p,t));if(v){if(old&&old!==v)n++;old=v}}return n};
  const count=(s,a,b)=>variation(s,a)-variation(s,b);
  function midpoint(a,b){const n=a[0]*b[1]+b[0]*a[1],d=2n*a[1]*b[1],g=gcd(n,d);return [n/g,d/g]}
  const left=[0n,1n],right=[1n,1n];
  function removeEnds(p){
    p=trim(p);while(p.length>1&&p[0]===0n)p=p.slice(1);
    while(p.length>1&&value(p,right)===0n){const q=Array(p.length-1).fill(0n);q[q.length-1]=p.at(-1);for(let i=q.length-2;i>=0;i--)q[i]=p[i+1]+q[i+1];p=trim(q)}
    return primitive(p)
  }
  function roots(p){
    p=removeEnds(p);if(p.length<=1)return {p,s:[p],intervals:[]};
    const s=sturm(p),stack=[[left,right,count(s,left,right)]],intervals=[];
    while(stack.length){tick();const [a,b,k]=stack.pop();if(!k)continue;if(k===1){intervals.push([a,b]);continue}
      let m=midpoint(a,b);while(value(p,m)===0n){tick();m=midpoint(a,m)}
      const n=count(s,a,m);if(n<0||n>k)throw Error("invalid root count");
      stack.push([m,b,k-n],[a,m,n])
    }return {p,s,intervals}
  }
  function rootSign(p,s,q,a,b){
    if(zero(q))return 0;
    const g=pgcd(p,q);if(g.length>1&&count(sturm(g),a,b)>0)return 0;
    const qs=sturm(q);
    while(true){tick();const va=value(q,a),vb=value(q,b);
      if(va&&vb&&sign(va)===sign(vb)&&count(qs,a,b)===0)return sign(va);
      const m=midpoint(a,b);if(value(p,m)===0n)return sign(value(q,m));
      if(count(s,a,m)===1)b=m;else a=m;
    }
  }
  // Test existence of t in [0,1] satisfying equations and weak/strict inequalities.
  function feasible(eq,ineq){
    if(eq.some(p=>p.length===1&&!zero(p)))return false;
    if(ineq.some(([p,strict])=>p.length===1&&(p[0]<0n||(strict&&p[0]===0n))))return false;
    const at=t=>eq.every(p=>value(p,t)===0n)&&ineq.every(([p,s])=>s?value(p,t)>0n:value(p,t)>=0n);
    if(at(left)||at(right))return true;
    const nonzero=eq.filter(p=>!zero(p));
    let p;
    if(nonzero.length)p=nonzero.reduce(pgcd);
    else p=ineq.filter(([q])=>q.length>1).reduce((a,[q])=>primitive(mul(a,q)),[1n]);
    if(p.length<=1)return !nonzero.length&&at(midpoint(left,right));
    const r=roots(p);
    if(!nonzero.length){
      // For inequalities only, signs are constant between product roots.
      // Every internal partition endpoint not a root represents its cell.
      if(!r.intervals.length&&at(midpoint(left,right)))return true;
      for(let [a,b] of r.intervals){
        // If only one root in [0,1], move endpoints off 0/1 to test
        // the open cells even when an inequality vanishes at a global end.
        while(a[0]===0n||b[0]===b[1]){
          tick();const m=midpoint(a,b);
          if(value(r.p,m)===0n){if(at(m)||at(midpoint(a,m))||at(midpoint(m,b)))return true;break}
          if(count(r.s,a,m)===1){if(at(m))return true;b=m}else{if(at(m))return true;a=m}
        }
        if(at(a)||at(b))return true;
      }
    }
    for(const [a,b] of r.intervals){
      if(ineq.every(([q,strict])=>{const v=rootSign(r.p,r.s,q,a,b);return strict?v>0:v>=0}))return true
    }
    return false;
  }
  const va=(a,b)=>a.map((x,i)=>sub(x,b[i]));
  const cross=(a,b)=>[sub(mul(a[1],b[2]),mul(a[2],b[1])),sub(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[0],b[1]),mul(a[1],b[0]))];
  const dot=(a,b)=>a.reduce((s,x,i)=>add(s,mul(x,b[i])),[0n]);
  const q=points.slice(0,4).map((a,i)=>a.map((x,j)=>trim([x,points[i+4][j]-x])));
  const p=ee?[va(q[0],q[2]),va(q[0],q[3]),va(q[1],q[2]),va(q[1],q[3])]:[va(q[0],q[1]),va(q[0],q[2]),va(q[0],q[3])];
  try{
    // Origin in convex hull of the relative points. At every t the VF
    // triangle and EE parallelogram have affine dimension <=2.
    for(const x of p)if(feasible(x,[]))return {status:"COLLISION",work};
    for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
      if(feasible(cross(p[i],p[j]),[[neg(dot(p[i],p[j])),false]]))return {status:"COLLISION",work};
      for(let k=j+1;k<p.length;k++){
        const e=va(p[j],p[i]),f=va(p[k],p[i]),v=p[i].map(neg),n=cross(e,f),D=dot(n,n),U=dot(cross(v,f),n),V=dot(cross(e,v),n);
        if(feasible([dot(v,n)],[[D,true],[U,false],[V,false],[sub(sub(D,U),V),false]]))return {status:"COLLISION",work};
      }
    }return {status:"SAFE",work};
  }catch(e){if(e.message==="root budget")return {status:"UNKNOWN",work};throw e}
}

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

  // Unnormalized Bernstein coefficient arrays: each entry multiplies
  // (1-t)^(n-k)*t^k. Product coefficients are ordinary convolutions.
  const conv=(a,b,op,zero,plus)=>{
    const c=Array.from({length:a.length+b.length-1},()=>zero());
    for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)c[i+j]=plus(c[i+j],op(a[i],b[j]));
    return c;
  };
  const crossPoly=(a,b)=>conv(a,b,cross,()=>[0n,0n,0n],add);
  const dotPoly=(a,b)=>conv(a,b,dot,()=>0n,(x,y)=>x+y);
  function positive(a,b,ee){
    const x=vectors(a,ee),y=vectors(b,ee);
    const p=[x[0],y[0]],e=[x[1],y[1]],f=[x[2],y[2]];
    const c0=det(x[0],x[1],x[2]),c1=det(y[0],y[1],y[2]);
    // An endpoint zero or sign change proves existence of a coplanarity root.
    if(c0!==0n&&c1!==0n&&((c0>0n)===(c1>0n)))return false;
    const n=crossPoly(e,f),D=dotPoly(n,n);
    if(!D.every(v=>v>0n))return false;
    const U=dotPoly(crossPoly(p,f),n),V=dotPoly(ee?crossPoly(p,e):crossPoly(e,p),n);
    if(!U.every(v=>v>=0n)||!V.every(v=>v>=0n))return false;
    return ee?D.every((v,i)=>v>=U[i]&&v>=V[i]):D.every((v,i)=>v>=U[i]+V[i]);
  }
  function classify(points,ee,mode,budget=255,maxDepth=32){
    const stack=[[points.slice(0,4),points.slice(4),0]];let nodes=0,unresolved=0,positiveTests=0,hullTests=0;
    while(stack.length&&nodes<budget){
      const [a,b,d]=stack.pop();nodes++;const p=[...rel(a,ee),...rel(b,ee)];
      if([0,1,2].some(j=>strict(p.map(x=>x[j])))||coplanarity(a,b,ee))continue;
      if(mode==="two_sided"){
        positiveTests++;if(positive(a,b,ee))return {status:"COLLISION",nodes,positiveTests,hullTests};
        // Expensive spatial separator only at selected depths; cheap predicates remain exact.
        if(d%4===0){hullTests++;if(separating(p))continue;}
      }else if(mode==="full"){hullTests++;if(separating(p))continue;}
      if(d>=maxDepth){unresolved++;continue;}
      const mid=a.map((x,i)=>add(x,b[i]));
      stack.push([mid,b.map(x=>mul(x,2n)),d+1],[a.map(x=>mul(x,2n)),mid,d+1]);
    }
    return {status:stack.length||unresolved?"UNKNOWN":"SAFE",nodes,positiveTests,hullTests};
  }
  const results=[];
  for(const f of data){
    const qs=parse(f.content),ee=f.path.includes("edge-edge");
    const rec={path:f.path,sha:f.sha,queries:qs.length,colliding:qs.filter(x=>x.truth).length,methods:{}};
    for(const mode of ["two_sided","fallback"]){
      const t=Date.now(),out={SAFE:0,COLLISION:0,UNKNOWN:0,falseSafe:0,falseCollision:0,nodes:0,positiveTests:0,hullTests:0};
      for(const q of qs){let s=classify(q.points,ee,mode==="fallback"?"two_sided":mode);if(mode==="fallback"&&s.status==="UNKNOWN"){const x=exactContact(q.points,ee);s={...s,status:x.status};out.algebraWork=(out.algebraWork||0)+x.work;out.fallbacks=(out.fallbacks||0)+1;}out[s.status]++;out.falseSafe+=+(s.status==="SAFE"&&q.truth);out.falseCollision+=+(s.status==="COLLISION"&&!q.truth);for(const k of ["nodes","positiveTests","hullTests"])out[k]+=s[k];}
      rec.methods[mode]={...out,elapsedMs:Date.now()-t};
    }results.push(rec);
  }return results;
}
if(require.main===module)console.log(JSON.stringify(benchmark(process.argv.slice(2).map(path=>({path,content:fs.readFileSync(path,'utf8')}))),null,2));
module.exports={benchmark,exactContact};
