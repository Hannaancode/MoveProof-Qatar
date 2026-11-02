# MoveProof AI — Dataset Acquisition and Model Training Plan

Research snapshot: 2026-11-02. This document separates **verified actions** from proposed work. It is not a claim of production-ready AI performance.

## Goal

**Targeted inspector:** given an inspection item ID (e.g. Bedroom/Wardrobe) and a photograph or video clip, localize **that item first**, then identify only defects overlapping its verified region. Support uncertainty and decline to make unsupported claims.

**Whole-property inspector:** detect visible rooms/items, coverage and possible anomalies, deduplicate frame-level findings, and make a reviewable evidence-linked report. Never infer hidden or functional defects from images.

## Audited source — completed

- Coated wood original defects: `https://zenodo.org/records/15679291` (DOI `10.5281/zenodo.15679291`)
- Expected archive: `OriginalDataset.zip`, 19,217,292 bytes; publisher MD5 `df663cbf553a63e3ec5b372bc6ca3d3c`; verified downloaded archive SHA-256 `947cae8a4f20e834b8847f705495ebd4e24b5e69663f6e264af6826e931b3a9c`.
- 335 original annotated photographs; 335 corresponding valid YOLO label files; 829 bounding boxes: **hole 188, blister 190, crack 225, scratch 226**. Audit found no invalid labels.
- The 13,400 published figure includes augmentations. Do not randomly divide augmented siblings between training and test sets.
- Caveats: industrial coated wood, no property/tenancy identifiers, not representative of common residential items or undamaged scenes, commercial licence needs clarification. Research-only at this stage.

## Dataset acquisition queue

| Dataset | Role | Download status | Constraints |
| --- | --- | --- | --- |
| Coated Wood OriginalDataset | Supervised **defect box** training | Downloaded and verified on GitHub runner | Commercial use terms need review; industrial domain |
| HomeObjects-3K (2,689) | **Object box** localization (wardrobe, sofa, bed, door etc.) | Not downloaded | Object recognition only; rights of exact data/assets to verify; Ultralytics AGPL considerations |
| DefectAtlas-20 (13,233) | **Material/no-defect** examples, image-level classification | Not downloaded | No localized defect boxes; verify licence and data size |
| Internal Wall Defects (3,279) | Wall paint defects and stains | Not downloaded | Roboflow export may require user account/API access; CC BY 4.0 listed |
| miProgram UK Property Inspection (423) | Real-world evaluation context and taxonomy | Not downloaded | **Research/evaluation only**; do not train proprietary commercial detector without licence |

## Stage 1: First wood detector (research only)

1. Use original 335 images; no augmentation copies as independent examples.
2. Check labels and source hashes; apply a fixed source-image split (235 train / 50 val / 50 test). **This is not a property/physical-object-independent split**, so metrics are provisional.
3. Train a four-class pretrained compact detector using only research settings; record exact framework, weights, random seed, hyperparameters, and hardware.
4. Evaluate on the held-out 50 images: mAP50, mAP50–95, macro precision/recall, per-class metrics. Retain confusion/hard examples.
5. Save model weights and manifests separately. Never deploy into the consumer app without rights review and stronger residential validation.

**Hard limitation:** The four-class wood set alone cannot support reliable “no damage” classification, exclude other objects, or prove a whole-property inspection. A high mAP on these 50 images would *not* prove MoveProof accuracy.

## Stage 2: Reliable item-specific inspector

- Obtain clean, authorized residential photos (including undamaged items), with annotations for target object boundary and individual defects. Include hard negatives: scratched wall beside clean wardrobe, shadow, reflections, wood grain, blurry images.
- Separate object detection/segmentation, defect detection inside crop, and evidence-to-item validation. Reject findings with weak target localization or no supporting pixels.
- Split by **property and physical item**, keep families of near-duplicate frames and augmentations together.
- Measure wrong-item attribution, false positives per clean item, defect recall (especially small marks), localization IoU, uncertainty abstentions and user correction rate.

## Stage 3: Video & property-level analysis

- Preserve original media, sample scenes and keyframes, maintain object tracks and timestamps, inspect high-resolution regions only where necessary.
- For whole-property mode, report both visible observations **and gaps in coverage**; do not turn unassessed areas into “Good”.
- For paired move-in/out, match rental-period + item ID and comparable views, label findings possible new / previously visible / unable to compare. Have human confirmation before asserting change.

## Release conditions and governance

- All model assertions have item ID, region (box/mask), file ID/hash, timestamp (for video), model ID/version, uncertainty status, and user review decision.
- Never silently alter the user's recorded condition, and retain manual offline inspection.
- Production requires a secure backend, consent and retention policy, per-provider privacy review and a commercial-friendly licensing solution. Third-party model licences are separate from dataset licences.
- No production use of model based solely on the industrial wood dataset.

## Reproducibility

Repository branch: `feature/ai-item-inspection` in `Hannaancode/MoveProof-Qatar`.

Commands (on Python 3.11 with network access):

```bash
python ai/research/download_and_audit.py --download --root ai_data/wood --report-dir ai_reports
python ai/research/train_wood_detector.py --originals ai_data/wood/original --processed ai_data/wood_processed --reports ai_reports --epochs 5 --imgsz 320 --device cpu
```

The research job installs CPU PyTorch and Ultralytics YOLO (AGPL-3.0 or commercial licence, according to its publisher). **This is a temporary research baseline, not the selected future proprietary model stack.**
