"""Conservative floating-point clearance for a convex translational sweep.

A convex probe translates without rotation. The swept convex volume equals
conv(P + start, P + end). Reject boundary intersection, then check winding
at an interior point. Requires a valid embedded oriented closed mesh.
"""
import numpy as np
from scipy.spatial import ConvexHull


def sweep_hull(probe, start, end):
    p = np.asarray(probe, float)
    a, b = np.asarray(start, float), np.asarray(end, float)
    if (p.ndim != 2 or p.shape[1] != 3 or len(p) < 4 or a.shape != (3,)
            or b.shape != (3,) or not all(np.isfinite(v).all() for v in (p,a,b))):
        raise ValueError('invalid 3D convex probe or translation')
    vertices = np.unique(np.vstack((p+a,p+b)),axis=0)
    hull = ConvexHull(vertices)
    return vertices[hull.vertices], hull.equations


def clip_halfspace(poly, normal, offset, tol):
    d = poly @ normal + offset - tol
    out = []
    for i in range(len(poly)):
        j = (i+1)%len(poly)
        a,b = poly[i],poly[j]
        inside_a,inside_b = d[i]<=0,d[j]<=0
        if inside_a: out.append(a)
        if inside_a != inside_b:
            out.append(a+(b-a)*(d[i]/(d[i]-d[j])))
    return np.asarray(out).reshape(-1,3)


def intersects_triangle(triangle, equations, *, tol=1e-9):
    poly=np.asarray(triangle,float)
    for row in equations:
        poly=clip_halfspace(poly,row[:3],row[3],tol)
        if not len(poly): return False
    return True


def winding_at(tri, point):
    a,b,c=np.moveaxis(tri-point,1,0)
    na,nb,nc=(np.linalg.norm(x,axis=1) for x in (a,b,c))
    num=np.einsum('ij,ij->i',a,np.cross(b,c))
    den=na*nb*nc+np.einsum('ij,ij->i',a,b)*nc+np.einsum('ij,ij->i',b,c)*na+np.einsum('ij,ij->i',c,a)*nb
    return float(np.sum(2*np.arctan2(num,den))/(4*np.pi))


def clearance_sweep(mesh, probe, start, end, *, tol=1e-9):
    """Returns (clear, reason). Tolerance expands each hull halfspace.

    No continuous rotation, deformable probes, numerical certification,
    or self-intersection validation is claimed. A path is safe only if every
    straight segment's swept volume is clear; check the same probe per leg.
    """
    if not np.isfinite(tol) or tol<0: raise ValueError('invalid tolerance')
    if not mesh.is_watertight or not mesh.is_winding_consistent:
        return False,'invalid mesh'
    vertices,eq=sweep_hull(probe,start,end)
    # Normalize spatial origin for numerical stability. Broad phase using
    # separating face planes, not a naive AABB when tolerance expands hull.
    center=vertices.mean(axis=0)
    eq=eq.copy();eq[:,3]+=eq[:,:3]@center
    tri=np.asarray(mesh.triangles,float)-center
    if not len(tri) or not np.isfinite(tri).all():return False,'invalid triangles'
    keep=np.ones(len(tri),dtype=bool)
    for row in eq:
        keep &= np.min(tri@row[:3]+row[3],axis=1)<=tol
    for t in tri[keep]:
        if intersects_triangle(t,eq,tol=tol):return False,'surface intersects swept volume'
    w=winding_at(tri,np.zeros(3))
    if not np.isfinite(w) or abs(w)>1e-6:return False,'sweep interior occupied or ambiguous'
    return True,'swept volume clear'
