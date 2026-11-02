# MoveProof AI research bootstrap

This workflow is separate from the production Android/iPhone applications. It uses the 335 **original**, real wood-coating defect images (rather than the 13,400 augmented variants). The dataset has annotated *industrial finish defects*, not residential tenants' item condition. It is a starting point for a controlled research baseline, **not a certified MoveProof detection model**.

**License caution:** The dataset page supplies free-download access and the paper says industrial/academic usage is possible, but a sufficiently explicit dataset licence for distributing derived commercial model weights is not confirmed. Do not put source data or resulting research weights into a proprietary production application without clarifying rights. Ultralytics's current YOLO tools/weights are AGPL-3.0 or commercially licensed: our commercial product requires independent licensing review before using them.

`download_and_audit.py` retrieves the original ZIP from https://zenodo.org/records/15679291, verifies the publisher MD5, extracts safely, audits annotation format, records a SHA-256 digest and counts classes. Neither original images nor user inspection media are committed to GitHub.

Model evaluation plan: isolate by original source image/property, check bounding box class correctness, train a small detector, measure mAP50-95, recall per class, false-positive rate on intact wood and scene-based non-target damage, and measure attribution leakage. *No-damage* and *item attribution* cannot be validated on the 335 positive industrial images alone, so no production claim is allowed from that dataset.
