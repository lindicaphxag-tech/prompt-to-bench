"""Continuous prism-clearance test for closed, consistently oriented meshes.
Floating-point geometric check, not an interval-arithmetic certificate.
"""
import numpy as np
from shapely.geometry import MultiPoint, Polygon


def clip(poly, z, above):
    out=[]
    for a,b in zip(poly,np.roll(poly,-1,axis=0)):
        ai=(a[2]>=z) if above else (a[2]<=z)
        bi=(b[2]>=z) if above else (b[2]<=z)
        if ai: out.append(a)
        if ai!=bi: out.append(a+(b-a)*((z-a[2])/(b[2]-a[2])))
    return np.asarray(out).reshape(-1,3)


def clearance(mesh, footprint, z0, z1):
    """Return (clear, reason) for a closed convex XY polygon extruded over z.

    Reject any mesh-boundary intersection with the prism, then determine the
    occupancy of one interior point by signed solid-angle winding. With a
    valid embedded closed oriented surface this suffices by connectedness.
    Mesh self-intersection is not independently checked. Polygon approximation
    and dimensional tolerance must be chosen by the task author in advance.
    """
    if (not np.isfinite([z0,z1]).all() or z1<=z0 or
        not isinstance(footprint,Polygon) or not footprint.is_valid or footprint.is_empty or
        not footprint.equals(footprint.convex_hull) or footprint.area<=0):
        raise ValueError('need a nonempty convex prism')
    if not mesh.is_watertight or not mesh.is_winding_consistent:
        return False,'invalid closed oriented mesh'
    tri=np.asarray(mesh.triangles,float)
    if not len(tri) or not np.isfinite(tri).all():return False,'invalid triangles'
    lo=tri.min(axis=1);hi=tri.max(axis=1);x0,y0,x1,y1=footprint.bounds
    keep=(hi[:,2]>=z0)&(lo[:,2]<=z1)&(hi[:,0]>=x0)&(lo[:,0]<=x1)&(hi[:,1]>=y0)&(lo[:,1]<=y1)
    for t in tri[keep]:
        p=clip(t,z0,True)
        if len(p):p=clip(p,z1,False)
        if len(p) and footprint.intersects(MultiPoint(p[:,:2]).convex_hull):
            return False,'surface intersects clearance prism'
    point=np.array([footprint.centroid.x,footprint.centroid.y,(z0+z1)/2])
    a,b,c=np.moveaxis(tri-point,1,0)
    na,nb,nc=(np.linalg.norm(v,axis=1) for v in (a,b,c))
    numerator=np.einsum('ij,ij->i',a,np.cross(b,c))
    denominator=na*nb*nc+np.einsum('ij,ij->i',a,b)*nc+np.einsum('ij,ij->i',b,c)*na+np.einsum('ij,ij->i',c,a)*nb
    winding=float(np.sum(2*np.arctan2(numerator,denominator))/(4*np.pi))
    if not np.isfinite(winding) or abs(winding)>1e-6:
        return False,'interior occupied or winding ambiguous'
    return True,'clearance prism empty'
