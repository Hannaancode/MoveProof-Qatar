#!/usr/bin/env python3
"""Download and inspect original public wood-coating defect annotations.

Research-only bootstrap. Does not imply commercial licence or residential accuracy.
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import time
import urllib.request
import zipfile

URL = "https://zenodo.org/records/15679291/files/OriginalDataset.zip?download=1"
EXPECTED_MD5 = "df663cbf553a63e3ec5b372bc6ca3d3c"


def sha(path, algorithm):
    h = hashlib.new(algorithm)
    with open(path,"rb") as f:
        for part in iter(lambda:f.read(1024*1024),b""):
            h.update(part)
    return h.hexdigest()


def download_file(url, destination):
    destination.parent.mkdir(parents=True,exist_ok=True)
    if destination.exists() and sha(destination,"md5") == EXPECTED_MD5:
        print("Verified existing dataset ZIP")
        return
    for attempt in range(1,4):
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"MoveProof-Research-Baseline/0.1 (Academic evaluation)","Accept":"application/zip"})
            with urllib.request.urlopen(req,timeout=90) as response, open(destination.with_suffix('.part'),'wb') as out:
                shutil.copyfileobj(response,out)
            os.replace(destination.with_suffix('.part'),destination)
            found=sha(destination,"md5")
            if found!=EXPECTED_MD5:
                raise ValueError(f"Checksum mismatch: expected {EXPECTED_MD5}, got {found}.")
            return
        except Exception as exc:
            print(f"Download attempt {attempt}/3: {type(exc).__name__}: {exc}",file=sys.stderr)
            if destination.with_suffix('.part').exists():destination.with_suffix('.part').unlink()
            if destination.exists():destination.unlink()
            if attempt<3: time.sleep(3*attempt)
    raise RuntimeError("Cannot download original ZIP with expected checksum")


def safe_unzip(archive,destination):
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as z:
        for info in z.infolist():
            rel=Path(info.filename)
            if rel.is_absolute() or '..' in rel.parts:
                raise ValueError(f"Unsafe ZIP entry: {info.filename!r}")
            full=(destination/rel).resolve()
            if destination.resolve() not in full.parents and full!=destination.resolve():
                raise ValueError(f"Invalid ZIP path: {info.filename!r}")
            if info.file_size>300*1024*1024:
                raise ValueError(f"Large unexpected entry: {info.filename!r}")
        z.extractall(destination)


def audit(root,archive):
    image_paths=list(root.rglob('*.jpg'))+list(root.rglob('*.jpeg'))+list(root.rglob('*.png'))
    annotation_paths=[p for p in root.rglob('*.txt') if p.name.lower() not in ('classes.txt','readme.txt')]
    classfiles=list(root.rglob('classes.txt'))
    counts=Counter()
    problems=[]
    per_image=[]
    anno_by_stem=defaultdict(list)
    for lbl in annotation_paths:anno_by_stem[lbl.stem].append(lbl)
    for img in sorted(image_paths):
        candidates=anno_by_stem.get(img.stem,[])
        if len(candidates)!=1:
            problems.append({"image":str(img.relative_to(root)),"problem":f"{len(candidates)} label files with same stem"})
            if not candidates: continue
        label_file=next((v for v in candidates if v.parent.name.lower().startswith("label")),candidates[0])
        anns=[]
        try:
            for lineno, line in enumerate(label_file.read_text(encoding='utf-8-sig').splitlines(),1):
                if not line.strip():continue
                cols=line.strip().split()
                if len(cols)!=5:raise ValueError(f"Line {lineno}: {len(cols)} fields instead of YOLO class,x,y,w,h")
                cls=int(cols[0]);box=list(map(float,cols[1:]));
                if cls<0 or any(not (0<=x<=1) for x in box) or box[2]*box[3]==0:
                    raise ValueError(f"Line {lineno}: invalid class or box")
                counts[cls]+=1
                anns.append([cls]+box)
        except Exception as exc:
            problems.append({"image":str(img.relative_to(root)),"problem":str(exc)})
            continue
        per_image.append({"image":str(img.relative_to(root)),"label":str(label_file.relative_to(root)),"objects":len(anns),"classes":sorted(set(a[0] for a in anns))})
    report={
        "source":"Na Jia et al., Zenodo 15679291, OriginalDataset.zip",
        "doi":"10.5281/zenodo.15679291",
        "dataset_md5":EXPECTED_MD5,
        "dataset_sha256":sha(archive,"sha256"),
        "archive_bytes":archive.stat().st_size,
        "license_status":"Commercial use/redistribution not independently verified; research baseline only",
        "image_count":len(image_paths),"images_with_valid_label_files":len(per_image),
        "annotation_files":len(annotation_paths),
        "defect_box_counts_by_class_id":dict(sorted(counts.items())),
        "class_file_contents":{str(p.relative_to(root)):p.read_text(errors='replace')[:4000] for p in classfiles},
        "issues":problems[:100],"issue_count":len(problems),"file_manifest":per_image
    }
    return report


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--root',default='ai_data/wood')
    p.add_argument('--report-dir',default='ai_reports')
    p.add_argument('--download',action='store_true')
    a=p.parse_args()
    root=Path(a.root)
    report_dir=Path(a.report_dir)
    zip_path=root/'OriginalDataset.zip'
    if a.download:download_file(URL,zip_path)
    elif not zip_path.exists():raise FileNotFoundError("Provide ZIP or supply --download")
    if sha(zip_path,'md5')!=EXPECTED_MD5:raise ValueError('Original ZIP checksum mismatch')
    expanded=root/'original'
    safe_unzip(zip_path,expanded)
    report=audit(expanded,zip_path)
    report_dir.mkdir(parents=True,exist_ok=True)
    (report_dir/'wood_original_inventory.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    summary={k:v for k,v in report.items() if k!='file_manifest'}
    print(json.dumps(summary,indent=2))
    if report['images_with_valid_label_files']<300:raise RuntimeError('Suspiciously few valid annotated source images')
    if report['issue_count']>0:print('Warning: Dataset audit found issues; inspect before training',file=sys.stderr)

if __name__=='__main__':main()
