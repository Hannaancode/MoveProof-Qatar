#!/usr/bin/env python3
"""Research baseline: 4-class coated-wood defect detector (not a MoveProof product model)."""
from __future__ import annotations
import argparse
from collections import Counter
import csv
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
import sys
import time

CLASS_NAMES = ['hole', 'blister', 'crack', 'scratch']
SPLIT_SEED = 20261102


def file_hash(path):
    h=hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()


def locate_images(extracted):
    candidates=list(extracted.rglob('classes.txt'))
    for cl in candidates:
        if cl.read_text(errors='replace').splitlines()[:4] != CLASS_NAMES:
            continue
        parent=cl.parent
        images_dir=next((p for p in parent.iterdir() if p.is_dir() and p.name.lower()=='images'),None)
        labels_dir=next((p for p in parent.iterdir() if p.is_dir() and p.name.lower()=='labels'),None)
        if images_dir and labels_dir:
            return images_dir, labels_dir
    raise ValueError('Expected images/, labels/, classes.txt with 4 original defect categories')


def verify_label(path):
    counts=Counter()
    rows=[]
    for lineno,line in enumerate(path.read_text(encoding='utf-8-sig').splitlines(),1):
        if not line.strip():continue
        p=line.strip().split()
        if len(p)!=5:raise ValueError(f'{path}: line {lineno}: expected 5 fields')
        cls=int(p[0]); xywh=list(map(float,p[1:]))
        if not (0<=cls<4 and 0<=xywh[0]<=1 and 0<=xywh[1]<=1 and 0<xywh[2]<=1 and 0<xywh[3]<=1):
            raise ValueError(f'{path}: line {lineno}: out-of-range class or box')
        counts[cls]+=1;rows.append(p)
    return counts,rows


def prepare(src,dst):
    image_dir,label_dir=locate_images(src)
    images=sorted([*image_dir.glob('*.jpg'),*image_dir.glob('*.jpeg'),*image_dir.glob('*.png')])
    if len(images)<300:raise ValueError(f'Expected ~335 originals, found {len(images)}')
    sample=[]
    all_hashes=set()
    for img in images:
        label=label_dir/(img.stem+'.txt')
        if not label.exists():raise FileNotFoundError(label)
        counts,rows=verify_label(label)
        digest=file_hash(img)
        if digest in all_hashes:raise RuntimeError(f'Exact duplicate original image detected: {img}')
        all_hashes.add(digest)
        sample.append((img,label,counts,digest))
    rng=random.Random(SPLIT_SEED)
    rng.shuffle(sample)
    n=len(sample);ntest=round(n*.15);nval=round(n*.15)
    subsets={'train':sample[:n-ntest-nval],'val':sample[n-ntest-nval:n-ntest],'test':sample[n-ntest:]}
    if dst.exists():shutil.rmtree(dst)
    manifest=[]
    for split,entries in subsets.items():
        for img,lbl,counts,digest in entries:
            new_img=dst/'images'/split/img.name
            new_lbl=dst/'labels'/split/lbl.name
            new_img.parent.mkdir(parents=True,exist_ok=True)
            new_lbl.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(img,new_img)
            shutil.copyfile(lbl,new_lbl)
            manifest.append({'image_sha256':digest,'image_name':img.name,'split':split,
                'num_boxes':sum(counts.values()),**{f'count_{c}':counts[i] for i,c in enumerate(CLASS_NAMES)}})
    # Avoid PyYAML dependency for this simple scalar/list YAML.
    yml=(f"path: {dst.resolve()}\ntrain: images/train\nval: images/val\ntest: images/test\nnames:\n" +
        ''.join(f'  {i}: {c}\n' for i,c in enumerate(CLASS_NAMES)))
    (dst/'dataset.yaml').write_text(yml,encoding='utf8')
    with (dst/'split_manifest.csv').open('w',newline='',encoding='utf8') as f:
        writer=csv.DictWriter(f,fieldnames=list(manifest[0]))
        writer.writeheader();writer.writerows(manifest)
    summary={
        'source':'Zenodo 15679291 OriginalDataset', 'seed':SPLIT_SEED,
        'method':'random split by original image only; no augmented copies; possible same-scene leakage remains',
        'classes':CLASS_NAMES,
        'images':{k:len(v) for k,v in subsets.items()},
        'boxes':{k:dict(Counter({c:sum(x[2][i] for x in v) for i,c in enumerate(CLASS_NAMES)})) for k,v in subsets.items()},
        'manifest_sha256':file_hash(dst/'split_manifest.csv'),
        'limitations':['Industrial imagery, not residential items',
                       'No independent undamaged residential negatives',
                       'No item segmentation masks or property IDs',
                       'Dataset rights not confirmed for proprietary product deployment',
                       'This split is NOT independent by surface/physical property']
    }
    (dst/'split_summary.json').write_text(json.dumps(summary,indent=2),encoding='utf8')
    return summary


def train(dataset,report_dir,epochs,device,imgsz):
    import torch
    import ultralytics
    from ultralytics import YOLO
    if not (dataset/'dataset.yaml').is_file():raise FileNotFoundError('dataset.yaml')
    print(f'PyTorch {torch.__version__}, Ultralytics {ultralytics.__version__}, device={device}',flush=True)
    project=(report_dir/'training').resolve()
    start=time.monotonic()
    model=YOLO('yolov8n.pt')
    train_result=model.train(data=str((dataset/'dataset.yaml').resolve()),epochs=epochs,imgsz=imgsz,batch=16,
         workers=2,device=device,seed=SPLIT_SEED,deterministic=True,project=str(project),name='wood_defects_baseline',
         exist_ok=True,plots=False,verbose=False,save=True,patience=epochs)
    # Use Ultralytics' actual output directory rather than guessing its location.
    # Certain hosted environments override the runs_dir setting.
    trainer=getattr(model,'trainer',None)
    savedir=Path(trainer.save_dir) if trainer is not None else (project/'wood_defects_baseline')
    best=savedir/'weights'/'best.pt'
    if not best.exists():raise FileNotFoundError(f'Training completed without best.pt at {best}')
    validator=YOLO(str(best))
    test_metrics=validator.val(data=str((dataset/'dataset.yaml').resolve()),split='test',imgsz=imgsz,
                               batch=16,workers=2,device=device,plots=False,verbose=False)
    box=test_metrics.box
    result={
        'checkpoint_sha256':file_hash(best),
        'model':'Ultralytics YOLOv8n research-only (AGPL-3.0 or enterprise license for closed-source)',
        'training_images':'See split_summary.json',
        'epochs':epochs,'imgsz':imgsz,'seed':SPLIT_SEED,'torch_version':str(torch.__version__),
        'ultralytics_version':str(ultralytics.__version__),
        'elapsed_minutes':round((time.monotonic()-start)/60,2),
        'test_metrics':{
            'mAP50':float(box.map50),'mAP50_95':float(box.map),
            'macro_precision':float(box.mp),'macro_recall':float(box.mr),
            'per_class_mAP50_95':{CLASS_NAMES[i]:float(v) for i,v in enumerate(box.maps)}
        },
        'notes':['This is a preliminary small-scale research baseline, not validated for wardrobes or houses',
            'No controlled undamaged residential images, target isolation or video processing',
            'Model source/weights licensing must be reviewed before commercial integration']
    }
    report_dir.mkdir(parents=True,exist_ok=True)
    (report_dir/'research_training_results.json').write_text(json.dumps(result,indent=2),encoding='utf8')
    shutil.copy2(best,report_dir/'research_wood_yolov8n_best.pt')
    print(json.dumps(result,indent=2),flush=True)
    return result


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--originals',default='ai_data/wood/original')
    ap.add_argument('--processed',default='ai_data/wood_processed')
    ap.add_argument('--reports',default='ai_reports')
    ap.add_argument('--epochs',type=int,default=5)
    ap.add_argument('--imgsz',type=int,default=320)
    ap.add_argument('--device',default='cpu')
    ap.add_argument('--prepare-only',action='store_true')
    a=ap.parse_args()
    summary=prepare(Path(a.originals),Path(a.processed))
    Path(a.reports).mkdir(parents=True,exist_ok=True)
    print(json.dumps(summary,indent=2),flush=True)
    shutil.copy2(Path(a.processed)/'split_summary.json',Path(a.reports)/'split_summary.json')
    shutil.copy2(Path(a.processed)/'split_manifest.csv',Path(a.reports)/'split_manifest.csv')
    if not a.prepare_only:train(Path(a.processed),Path(a.reports),a.epochs,a.device,a.imgsz)

if __name__=='__main__':main()