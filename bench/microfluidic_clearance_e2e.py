"""End-to-end verification using the actual upstream scorer and reference stats.
Reports old/new scores; does not presuppose that a defect passes all old checks.
Run from any directory: python bench/microfluidic_clearance_e2e.py
"""
import copy
import json
from pathlib import Path
import tempfile
import yaml
from checks import evaluate
from scadreport import render, load_mesh

ROOT=Path(__file__).resolve().parent.parent
TASK='microfluidic_chip_imaging_holder'
cases=['off_axis_aperture_web','bottom_window_skin','top_window_skin','bottom_bore_skin','top_bore_skin']

def main():
    tasks=yaml.safe_load((ROOT/'bench/tasks.yaml').read_text())
    task=next(t for t in tasks if t['id']==TASK)
    ref=json.loads((ROOT/'bench/reference_stats.json').read_text())[TASK]
    old=copy.deepcopy(task)
    old['checks']=[c for c in old['checks'] if 'prism_clearance' not in c]
    records=[]
    with tempfile.TemporaryDirectory() as tmp:
        for label in ['reference']+cases:
            src=ROOT/(task['reference'] if label=='reference' else f'bench/mutants/{TASK}__{label}.scad')
            path=Path(tmp)/'render.stl'
            result=render(str(src),str(path))
            if not result['ok']: raise RuntimeError(result['messages'])
            mesh=load_mesh(str(path))
            a,b=evaluate(mesh,old,ref),evaluate(mesh,task,ref)
            expected=(label=='reference')
            records.append({'case':label,'old_pass':a['passed'],'new_pass':b['passed'],
                            'old_score':a['score'],'new_score':b['score'],
                            'old_failed':[i['check'] for i in a['items'] if not i['ok']],
                            'new_failed':[i['check'] for i in b['items'] if not i['ok']]})
            print(json.dumps(records[-1]),flush=True)
            if b['passed']!=expected: raise AssertionError(f'new score mismatch: {label}')
            if expected and not a['passed']: raise AssertionError('original reference must pass')
    print('actual old-only passes:',sum(r['old_pass'] and not r['new_pass'] for r in records))
if __name__=='__main__':main()
