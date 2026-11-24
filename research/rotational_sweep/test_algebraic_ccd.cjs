const assert=require('node:assert/strict');
const {exactContact}=require('./algebraic_ccd.cjs');
const v=(...x)=>x.map(BigInt);
const Z=v(0,0,0), E=v(9,0,0), F=v(0,9,0);
const vf=(a,b,e0=E,e1=e0,f0=F,f1=f0)=>[a,Z,e0,f0,b,Z,e1,f1];
const ee=(a,b,c,d)=>[Z,E,a,b,Z,E,c,d];
const cases=[
['non-dyadic repeated root',vf(v(0,3,-1),v(9,3,2),v(9,0,-3),v(9,0,6)) ,false,'COLLISION'],
['irrational interior root',vf(v(0,1,1),v(2,1,1),v(4,0,0),v(4,0,4),v(0,4,0)),false,'COLLISION'],
['irrational plane root outside triangle',vf(v(0,5,1),v(2,5,1),v(4,0,0),v(4,0,4),v(0,4,0)),false,'SAFE'],
['coplanar passage',vf(v(-2,2,0),v(12,2,0)),false,'COLLISION'],
['coplanar outside',vf(v(-2,10,0),v(12,10,0)),false,'SAFE'],
['collapsed face point',vf(v(-1,0,0),v(2,0,0),Z,Z,Z),false,'COLLISION'],
['collapsed face disjoint',vf(v(-1,1,0),v(2,1,0),Z,Z,Z),false,'SAFE'],
['parallel overlapping edges',ee(v(2,0,0),v(4,0,0),v(2,0,0),v(4,0,0)),true,'COLLISION'],
['parallel separated edges',ee(v(2,1,0),v(4,1,0),v(2,1,0),v(4,1,0)),true,'SAFE'],
['non-dyadic edge crossing',ee(v(4,-1,-1),v(4,1,-1),v(4,-1,2),v(4,1,2)),true,'COLLISION'],
['point at initial endpoint',vf(Z,v(0,0,1)),false,'COLLISION'],
['point at terminal endpoint',vf(v(0,0,1),Z),false,'COLLISION'],
['vertex near miss',vf(v(-1,0,1),v(2,0,1)),false,'SAFE'],
['huge integer translated/scaled',vf(v(0,3,-1),v(9,3,2),v(9,0,-3),v(9,0,6)).map(x=>x.map(a=>a*10n**40n+10n**100n)),false,'COLLISION']
];
for(const [name,p,isEE,expected] of cases){assert.equal(exactContact(p,isEE).status,expected,name);console.log('PASS '+name);}
assert.equal(exactContact(cases[0][1],false,{limit:0}).status,'UNKNOWN');
console.log('PASS budget fail closed');
console.log('15 tests passed');
