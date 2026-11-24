// Exact dyadic interval certificate producer, no floating-point geometry.
function produce(points,ee,{budget=1023,depth=40}={}){
 const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),scale=(a,k)=>a.map(x=>x*k),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0n),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],strict=a=>a.every(x=>x>0n)||a.every(x=>x<0n);
 const rel=p=>ee?[sub(p[0],p[2]),sub(p[0],p[3]),sub(p[1],p[2]),sub(p[1],p[3])]:[sub(p[0],p[1]),sub(p[0],p[2]),sub(p[0],p[3])];
 const conv=(a,b,op,z,plus)=>{const c=Array.from({length:a.length+b.length-1},z);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)c[i+j]=plus(c[i+j],op(a[i],b[j]));return c};
 const cp=(a,b)=>conv(a,b,cross,()=>[0n,0n,0n],add),dp=(a,b)=>conv(a,b,dot,()=>0n,(x,y)=>x+y);
 function predicates(a,b){const r=[a[0],b[0]],e=[sub(a[1],a[0]),sub(b[1],b[0])],f=[sub(a[2],a[0]),sub(b[2],b[0])],n=cp(e,f),C=dp(r,n),D=dp(n,n),v=r.map(x=>scale(x,-1n)),U=dp(cp(v,f),n),V=dp(cp(e,v),n);return {C,D,U,V}}
 function pointHit(a){for(let i=0;i<a.length;i++){if(dot(a[i],a[i])===0n)return true;for(let j=i+1;j<a.length;j++){const c=cross(a[i],a[j]);if(dot(c,c)===0n&&dot(a[i],a[j])<=0n)return true;for(let k=j+1;k<a.length;k++){const e=sub(a[j],a[i]),f=sub(a[k],a[i]),v=scale(a[i],-1n),n=cross(e,f),D=dot(n,n),U=dot(cross(v,f),n),V=dot(cross(e,v),n);if(D>0n&&dot(v,n)===0n&&U>=0n&&V>=0n&&U+V<=D)return true}}}return false}
 let nodes=0;const leaves=[],stack=[[rel(points.slice(0,4)),rel(points.slice(4)),""]];
 while(stack.length&&nodes<budget){const [a,b,path]=stack.pop();nodes++;
 const all=a.concat(b);let n=null;
 for(let i=0;i<3&&!n;i++)if(strict(all.map(x=>x[i])))n=Array.from({length:3},(_,j)=>i===j?1n:0n);
 if(!n){const {C,D,U,V}=predicates(a,b);if(strict(C)){leaves.push({path,kind:"plane"});continue}
 if(pointHit(a))return {status:"COLLISION",witness:{path,kind:"endpoint",side:0},nodes};
 if(pointHit(b))return {status:"COLLISION",witness:{path,kind:"endpoint",side:1},nodes};
 if((C[0]===0n||C.at(-1)===0n||(C[0]>0n)!==(C.at(-1)>0n))&&D.every(x=>x>0n)&&U.every(x=>x>=0n)&&V.every(x=>x>=0n)&&D.every((x,i)=>ee?x>=U[i]&&x>=V[i]:x>=U[i]+V[i]))return {status:"COLLISION",witness:{path,kind:"bracket"},nodes};
 const test=x=>strict(all.map(y=>dot(x,y)));
 outer:for(let i=0;i<all.length;i++){if(test(all[i])){n=all[i];break}for(let j=i+1;j<all.length;j++){const d=sub(all[j],all[i]),q=cross(d,cross(all[i],d));if(test(q)){n=q;break outer}for(let k=j+1;k<all.length;k++){const q=cross(d,sub(all[k],all[i]));if(test(q)){n=q;break outer}}}}
 }
 if(n){leaves.push({path,kind:"separator",normal:n.map(String)});continue}
 if(path.length>=depth)return {status:"UNKNOWN",nodes};
 const m=a.map((x,i)=>add(x,b[i]));stack.push([m,b.map(x=>scale(x,2n)),path+"1"],[a.map(x=>scale(x,2n)),m,path+"0"]);
 }
 return stack.length?{status:"UNKNOWN",nodes}:{status:"SAFE",leaves,nodes};
}
module.exports={produce};
