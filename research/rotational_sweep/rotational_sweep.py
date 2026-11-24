"""Budgeted continuous rotation+translation clearance of a convex probe.

Support-envelope planes enclose the entire swept set. SAFE is conditional on
valid embedded oriented mesh, fixed-axis constant angular velocity, linear
translation, and exact arithmetic. Floating-point guards are heuristic.
BLOCKED means a sampled exact pose failed a geometry test; UNKNOWN abstains.
"""
from dataclasses import dataclass
import math
import numpy as np
from scipy.spatial import ConvexHull
from convex_sweep import intersects_triangle, winding_at

@dataclass(frozen=True)
class Report:
    status: str
    nodes: int
    pose_checks: int
    certified_intervals: int
    unresolved_intervals: int
    blocked_t: float | None


def pose(p, axis, angle, start, end, t):
    parallel=(p@axis)[:,None]*axis
    u=p-parallel
    return parallel+math.cos(angle*t)*u+math.sin(angle*t)*np.cross(axis,u)+start+t*(end-start)


def support_max(p, axis, angle, start, end, normals, lo, hi):
    """Analytic max of n·p(t) over vertices and t in [lo,hi].
    Derivative roots of A*cos(w*t)+B*sin(w*t)+C*t+D are enumerated.
    For near-zero w or amplitude, endpoint values plus chord bound are used.
    """
    parallel=(p@axis)[:,None]*axis; u=p-parallel; v=np.cross(axis,u)
    A=normals@u.T; B=normals@v.T; C=normals@(end-start); D=normals@(parallel+start).T
    R=np.hypot(A,B); phi=np.arctan2(B,A)
    def val(t):return A*np.cos(angle*t)+B*np.sin(angle*t)+C[:,None]*t+D
    best=np.maximum(val(lo),val(hi))
    if abs(angle)<1e-10:
        return (best+R*(angle*(hi-lo))**2/8).max(axis=1)
    with np.errstate(divide='ignore',invalid='ignore'):
        ratio=C[:,None]/(angle*R)
    possible=(np.abs(ratio)<=1+1e-13)&(R>1e-14)
    arcs=np.arcsin(np.clip(np.nan_to_num(ratio),-1,1))
    # angle may be negative; the admissible angular interval is ordered.
    amin,amax=sorted((angle*lo,angle*hi))
    for root in (phi+arcs,phi+np.pi-arcs):
        k0=np.ceil((amin-root)/(2*np.pi)-1e-13)
        # at most one full revolution is accepted, so at most two roots here
        for k in (k0,k0+1):
            t=(root+2*np.pi*k)/angle
            ok=possible&(t>=lo-1e-12)&(t<=hi+1e-12)
            best=np.maximum(best,np.where(ok,val(np.clip(t,lo,hi)),-np.inf))
    # fallback for negligible sinusoidal amplitude, independent of root solving
    best+=np.where(R<=1e-14,R*(angle*(hi-lo))**2/8,0.)
    return best.max(axis=1)


def envelope(p,axis,angle,start,end,lo,hi,mode='support'):
    a=pose(p,axis,angle,start,end,lo);b=pose(p,axis,angle,start,end,hi)
    vertices=np.vstack((a,b))
    if mode=='support':vertices=np.vstack((vertices,pose(p,axis,angle,start,end,(lo+hi)/2)))
    hull=ConvexHull(vertices); n=hull.equations[:,:3]
    if mode=='support':s=support_max(p,axis,angle,start,end,n,lo,hi)
    elif mode=='chord':
        radius=np.max(np.linalg.norm(p-(p@axis)[:,None]*axis,axis=1))
        s=-hull.equations[:,3]+radius*np.linalg.norm(n-(n@axis)[:,None]*axis,axis=1)*(angle*(hi-lo))**2/8
    else:raise ValueError('unknown envelope')
    return np.column_stack((n,-s)), vertices[hull.vertices].mean(axis=0)


def region_clear(tri,eq,center,tol):
    # Halfspace enlargement includes the mathematical envelope. No AABB
    # broad phase that could accidentally discard an expanded-region hit.
    tr=tri-center; q=eq.copy();q[:,3]+=q[:,:3]@center
    keep=np.ones(len(tr),bool)
    for row in q:
        keep &= np.min(tr@row[:3]+row[3],axis=1)<=tol
    for t in tr[keep]:
        if intersects_triangle(t,q,tol=tol):return False
    w=winding_at(tr,np.zeros(3))
    return np.isfinite(w) and abs(w)<=1e-6


def verify(mesh,probe,axis,angle,start,end,*,budget=127,max_depth=14,mode='support',tol=1e-9):
    p,axis,start,end=map(lambda a:np.asarray(a,float),(probe,axis,start,end))
    if (p.ndim!=2 or p.shape[1]!=3 or len(p)<4 or any(x.shape!=(3,) for x in (axis,start,end))
        or not all(np.isfinite(x).all() for x in (p,axis,start,end)) or not np.isfinite(angle)
        or abs(angle)>2*np.pi or np.linalg.norm(axis)==0 or type(budget) is not int or budget<0
        or type(max_depth) is not int or max_depth<0 or mode not in ('support','chord') or not np.isfinite(tol) or tol<0):
        raise ValueError('invalid motion or budget')
    axis=axis/np.linalg.norm(axis);ConvexHull(p)
    tri=np.asarray(mesh.triangles,float)
    if not mesh.is_watertight or not mesh.is_winding_consistent or not len(tri) or not np.isfinite(tri).all():
        return Report('UNKNOWN',0,0,0,1,None)
    # Fixed motion scale guard; not a proof of roundoff enclosure.
    guard=tol+1e-12*max(1.,np.max(np.abs(tri)),np.max(np.abs(p)),np.max(np.abs(start)),np.max(np.abs(end)))
    stack=[(0.,1.,0)];nodes=poses=cert=unresolved=0;checked=set()
    while stack and nodes<budget:
        lo,hi,depth=stack.pop();nodes+=1
        eq,c=envelope(p,axis,angle,start,end,lo,hi,mode)
        if region_clear(tri,eq,c,guard):cert+=1;continue
        mid=(lo+hi)/2
        for t in (mid,lo,hi):
            if t in checked:continue
            checked.add(t);poses+=1
            vertices=pose(p,axis,angle,start,end,t);h=ConvexHull(vertices)
            if not region_clear(tri,h.equations,vertices[h.vertices].mean(axis=0),guard):
                return Report('BLOCKED',nodes,poses,cert,unresolved+len(stack)+1,t)
        if depth>=max_depth:unresolved+=1
        else:stack.extend([(mid,hi,depth+1),(lo,mid,depth+1)])
    unresolved+=len(stack)
    return Report('UNKNOWN' if unresolved else 'SAFE',nodes,poses,cert,unresolved,None)
