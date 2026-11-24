// Witness-producing extension of exactContact; rational point or isolated algebraic root.
function polynomialWitness(points,ee,{limit=20000}={}){
  let proof=null;let work=0;const tick=()=>{if(++work>limit)throw Error("root budget")};
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
    const accept=t=>{if(!at(t))return false;proof={kind:"rational",time:t.map(String)};return true};
    if(accept(left)||accept(right))return true;
    const nonzero=eq.filter(p=>!zero(p));
    let p=nonzero.length?nonzero.reduce(pgcd):ineq.filter(([q])=>q.length>1).reduce((a,[q])=>primitive(mul(a,q)),[1n]);
    if(p.length<=1)return !nonzero.length&&accept(midpoint(left,right));
    const r=roots(p);
    if(!nonzero.length){
      if(!r.intervals.length&&accept(midpoint(left,right)))return true;
      for(let [a,b] of r.intervals){
        while(a[0]===0n||b[0]===b[1]){
          tick();const m=midpoint(a,b);
          if(value(r.p,m)===0n){if(accept(m)||accept(midpoint(a,m))||accept(midpoint(m,b)))return true;break}
          if(count(r.s,a,m)===1){if(accept(m))return true;b=m}else{if(accept(m))return true;a=m}
        }
        if(accept(a)||accept(b))return true;
      }
    }
    for(const [a,b] of r.intervals){
      if(ineq.every(([q,strict])=>{const v=rootSign(r.p,r.s,q,a,b);return strict?v>0:v>=0})){
        proof={kind:"root",polynomial:r.p.map(String),left:a.map(String),right:b.map(String)};return true
      }
    }
    return false;
  }

  const va=(a,b)=>a.map((x,i)=>sub(x,b[i]));
  const cross=(a,b)=>[sub(mul(a[1],b[2]),mul(a[2],b[1])),sub(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[0],b[1]),mul(a[1],b[0]))];
  const dot=(a,b)=>a.reduce((s,x,i)=>add(s,mul(x,b[i])),[0n]);
  const n=points[0].length-1;
  if(![1,2,3].includes(n)||points.length!==4||typeof ee!=="boolean"||points.some(a=>a.length!==n+1||a.some(v=>v.length!==3||v.some(x=>typeof x!=="bigint"))))throw Error("invalid polynomial motion");
  const choose=(n,k)=>{let c=1n;for(let j=1;j<=k;j++)c=c*BigInt(n-j+1)/BigInt(j);return c};
  const q=points.map(a=>[0,1,2].map(j=>{let cur=a.map(v=>v[j]),out=[];for(let k=0;k<=n;k++){out.push(choose(n,k)*cur[0]);cur=cur.slice(0,-1).map((x,i)=>cur[i+1]-x)}return trim(out)}));
  const p=ee?[va(q[0],q[2]),va(q[0],q[3]),va(q[1],q[2]),va(q[1],q[3])]:[va(q[0],q[1]),va(q[0],q[2]),va(q[0],q[3])];
  try{
    // Origin in convex hull of the relative points. At every t the VF
    // triangle and EE parallelogram have affine dimension <=2.
    for(let i=0;i<p.length;i++)if(feasible(p[i],[]))return {status:"COLLISION",work,witness:{...proof,subset:[i]}};
    for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
      if(feasible(cross(p[i],p[j]),[[neg(dot(p[i],p[j])),false]]))return {status:"COLLISION",work,witness:{...proof,subset:[i,j]}};
      for(let k=j+1;k<p.length;k++){
        const e=va(p[j],p[i]),f=va(p[k],p[i]),v=p[i].map(neg),n=cross(e,f),D=dot(n,n),U=dot(cross(v,f),n),V=dot(cross(e,v),n);
        if(feasible([dot(v,n)],[[D,true],[U,false],[V,false],[sub(sub(D,U),V),false]]))return {status:"COLLISION",work,witness:{...proof,subset:[i,j,k]}};
      }
    }return {status:"SAFE",work};
  }catch(e){if(e.message==="root budget")return {status:"UNKNOWN",work};throw e}
}

module.exports={polynomialWitness};
