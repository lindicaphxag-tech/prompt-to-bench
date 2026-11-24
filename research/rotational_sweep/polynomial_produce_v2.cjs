function polynomialProduceV2(control,ee,{budget=511,maxDepth=24}={}){
 const n=control[0].length-1;
 if(![1,2,3].includes(n)||control.length!==4||typeof ee!=="boolean"||control.some(p=>p.length!==n+1||p.some(v=>v.length!==3||v.some(x=>typeof x!=="bigint"))))throw Error("invalid polynomial motion");
 const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),scale=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0n),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const choose=(n,k)=>{let c=1n;for(let j=1;j<=k;j++)c=c*BigInt(n-j+1)/BigInt(j);return c};
 const rel=(a,b)=>a.map((x,i)=>sub(x,b[i])),relative=ee?[rel(control[0],control[2]),rel(control[0],control[3]),rel(control[1],control[2]),rel(control[1],control[3])]:[rel(control[0],control[1]),rel(control[0],control[2]),rel(control[0],control[3])];
 const strict=a=>a.every(x=>x>0n)||a.every(x=>x<0n),nonneg=a=>a.every(x=>x>=0n);
 const conv=(a,b,op,zero,plus)=>{const out=Array.from({length:a.length+b.length-1},zero);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)out[i+j]=plus(out[i+j],op(a[i],b[j]));return out};
 const cp=(a,b)=>conv(a,b,cross,()=>[0n,0n,0n],add),dp=(a,b)=>conv(a,b,dot,()=>0n,(x,y)=>x+y);
 function split(p){let cur=p.slice(),l=[scale(cur[0],1n<<BigInt(n))],r=[scale(cur[n],1n<<BigInt(n))];for(let i=1;i<=n;i++){cur=cur.slice(0,-1).map((x,j)=>add(x,cur[j+1]));const s=1n<<BigInt(n-i);l.push(scale(cur[0],s));r.unshift(scale(cur.at(-1),s))}return [l,r]}
 const stack=[[relative,""]],leaves=[];let nodes=0,unresolved=0;
 while(stack.length&&nodes<budget){const [p,path]=stack.pop();nodes++;const all=p.flat();let axis=-1;for(let j=0;j<3;j++)if(strict(all.map(x=>x[j]))){axis=j;break}
 if(axis>=0){leaves.push({path,kind:"axis",axis});continue}
 const r=p[0].map((x,i)=>scale(x,choose(n,i))),e=rel(p[1],p[0]).map((x,i)=>scale(x,choose(n,i))),f=rel(p[2],p[0]).map((x,i)=>scale(x,choose(n,i))),normal=cp(e,f),C=dp(r,normal);
 if(strict(C)){leaves.push({path,kind:"plane"});continue}
 const v=r.map(x=>scale(x,-1n)),D=dp(normal,normal),U=dp(cp(v,f),normal),V=dp(cp(e,v),normal);
 if(D.every(x=>x>0n)){
 const bounds=[U,V,...(ee?[D.map((x,i)=>x-U[i]),D.map((x,i)=>x-V[i])]:[D.map((x,i)=>x-U[i]-V[i])])];
 const index=bounds.findIndex(a=>a.every(x=>x<0n));if(index>=0){leaves.push({path,kind:"outside",index});continue}
 }
 if(C[0]*C.at(-1)<=0n&&D.every(x=>x>0n)&&nonneg(U)&&nonneg(V)&&D.every((x,i)=>ee?x>=U[i]&&x>=V[i]:x>=U[i]+V[i]))return {status:"COLLISION",witness:{path,kind:"bracket"},nodes};
 if(path.length>=maxDepth){unresolved++;continue}
 const parts=p.map(split);stack.push([parts.map(x=>x[1]),path+"1"],[parts.map(x=>x[0]),path+"0"]);
 }
 return stack.length||unresolved?{status:"UNKNOWN",nodes}:{status:"SAFE",leaves,nodes};
}
module.exports={polynomialProduceV2};
