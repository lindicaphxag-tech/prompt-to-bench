// Independent check of convex subset feasibility at a rational time or unique algebraic root.
function verifyAlgebraic(points,ee,cert){
 try{
 if(!Array.isArray(points)||points.length!==8||points.some(x=>!Array.isArray(x)||x.length!==3||x.some(v=>typeof v!=="bigint"))||typeof ee!=="boolean"||cert.status!=="COLLISION")return false;
 const w=cert.witness;if(!w||!Array.isArray(w.subset)||w.subset.length<1||w.subset.length>3||w.subset.some((x,i)=>!Number.isInteger(x)||x<0||x>=(ee?4:3)||(i&&x<=w.subset[i-1])))return false;
 let budget=30000;const tick=()=>{if(--budget<0)throw Error("budget")};
 const abs=x=>x<0n?-x:x,igcd=(a,b)=>{a=abs(a);b=abs(b);while(b)[a,b]=[b,a%b];return a};
 const trim=p=>{let n=p.length;while(n>1&&p[n-1]===0n)n--;return p.slice(0,n)},zero=p=>p.every(x=>x===0n),prim=p=>{p=trim(p);const g=p.reduce(igcd,0n);return g?p.map(x=>x/g):[0n]};
 const add=(a,b)=>trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]??0n)+(b[i]??0n))),neg=p=>p.map(x=>-x),sub=(a,b)=>add(a,neg(b)),mul=(a,b)=>{const p=Array(a.length+b.length-1).fill(0n);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)p[i+j]+=a[i]*b[j];return trim(p)};
 // Positive scaling of a rational Euclidean remainder preserves Sturm signs.
 function rem(a,b){a=prim(a);b=prim(b);if(zero(b))throw Error("divzero");while(!zero(a)&&a.length>=b.length){tick();const k=a.length-b.length,h=b.at(-1),c=a.at(-1),s=h<0n?-1n:1n;const x=a.map(v=>v*abs(h));for(let j=0;j<b.length;j++)x[k+j]-=c*s*b[j];a=prim(x)}return a}
 function gcd(a,b){while(!zero(b)){[a,b]=[b,rem(a,b)]}return prim(a)}
 function sturm(p){p=prim(p);if(p.length===1)return [p];const s=[p,prim(p.slice(1).map((x,i)=>x*BigInt(i+1)))];while(true){const r=neg(rem(s.at(-2),s.at(-1)));if(zero(r))return s;s.push(r)}}
 function ev(p,t){const [a,b]=t;let v=0n;for(let i=0;i<p.length;i++)v+=p[i]*a**BigInt(i)*b**BigInt(p.length-i-1);return v}
 const sign=x=>x===0n?0:x>0n?1:-1,variation=(s,t)=>{const x=s.map(p=>sign(ev(p,t))).filter(Boolean);return x.slice(1).reduce((v,a,i)=>v+ +(a!==x[i]),0)},count=(s,a,b)=>variation(s,a)-variation(s,b);
 const midpoint=(a,b)=>{const x=a[0]*b[1]+a[1]*b[0],y=2n*a[1]*b[1],g=igcd(x,y);return [x/g,y/g]};
 const parse=x=>{if(typeof x!=="string"||! /^-?\d{1,4096}$/.test(x))throw Error("integer");return BigInt(x)},time=x=>{if(!Array.isArray(x)||x.length!==2)throw Error("time");const [a,b]=x.map(parse);if(b<=0n||a<0n||a>b)throw Error("domain");return [a,b]};
 const vsub=(a,b)=>a.map((v,i)=>sub(v,b[i])),cross=(a,b)=>[sub(mul(a[1],b[2]),mul(a[2],b[1])),sub(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[0],b[1]),mul(a[1],b[0]))],dot=(a,b)=>a.map((v,i)=>mul(v,b[i])).reduce(add,[0n]);
 const q=points.slice(0,4).map((p,i)=>p.map((x,j)=>trim([x,points[i+4][j]-x]))),rel=ee?[vsub(q[0],q[2]),vsub(q[0],q[3]),vsub(q[1],q[2]),vsub(q[1],q[3])]:[vsub(q[0],q[1]),vsub(q[0],q[2]),vsub(q[0],q[3])],p=w.subset.map(i=>rel[i]);
 let eq,ineq=[];
 if(p.length===1)eq=p[0];else if(p.length===2){eq=cross(p[0],p[1]);ineq=[[neg(dot(p[0],p[1])),false]]}else{const e=vsub(p[1],p[0]),f=vsub(p[2],p[0]),v=p[0].map(neg),n=cross(e,f),d=dot(n,n),u=dot(cross(v,f),n),z=dot(cross(e,v),n);eq=[dot(v,n)];ineq=[[d,true],[u,false],[z,false],[sub(sub(d,u),z),false]]}
 if(w.kind==="rational"){const t=time(w.time);return eq.every(p=>ev(p,t)===0n)&&ineq.every(([p,strict])=>strict?ev(p,t)>0n:ev(p,t)>=0n)}
 if(w.kind!=="root"||!Array.isArray(w.polynomial)||w.polynomial.length<2||w.polynomial.length>25)return false;
 const root=prim(w.polynomial.map(parse)),l=time(w.left),r=time(w.right);
 if(root.length<2||l[0]*r[1]>=r[0]*l[1]||ev(root,l)===0n||ev(root,r)===0n)return false;
 const s=sturm(root);if(count(s,l,r)!==1)return false;
 function rootSign(q){if(zero(q))return 0;const g=gcd(root,q);if(g.length>1&&count(sturm(g),l,r)===1)return 0;
 let a=l,b=r;const qs=sturm(q);while(true){tick();const u=ev(q,a),v=ev(q,b);if(u!==0n&&v!==0n&&sign(u)===sign(v)&&count(qs,a,b)===0)return sign(u);const m=midpoint(a,b);if(ev(root,m)===0n)return sign(ev(q,m));if(count(s,a,m)===1)b=m;else a=m}}
 return eq.every(p=>rootSign(p)===0)&&ineq.every(([p,strict])=>strict?rootSign(p)>0:rootSign(p)>=0);
 }catch{return false}
}
module.exports={verifyAlgebraic};
