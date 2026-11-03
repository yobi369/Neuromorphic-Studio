# Reproducible experiments and benchmark protocol

## Supported official dataset adapters

The optional Python adapter uses Tonic 1.6.0 to download/read the upstream train and test splits for N-MNIST (34×34), IBM DVS Gesture (128×128) and Spiking Heidelberg Digits (700 input channels). It exports the original event stream to a canonical CSV without denoising, cropping, temporal binning or other data transformations. Timestamps are normalized to microseconds and polarity to -1/+1. The output manifest includes the CSV SHA-256, selected-split sample-ID hash, sample/event counts, source, user-declared license, split, loader version and preprocessing declaration.

Install in an isolated Python environment:

~~~bash
python -m venv .venv
source .venv/bin/activate
python -m pip install tonic==1.6.0
python validation/official_datasets.py nmnist --root ./datasets --split train --output ./artifacts/nmnist-train.csv --license "verify upstream terms"
python validation/official_datasets.py nmnist --root ./datasets --split test --output ./artifacts/nmnist-test.csv --license "verify upstream terms"
~~~

Replace nmnist with dvs_gesture or shd. The script requires the researcher to supply the applicable license/terms after checking the upstream source. --max-samples is a smoke subset and is explicitly recorded as such; never report it as a full official benchmark. The Tonic adapter version and source links must be recorded in the paper/report. Dataset download is optional and is not run in CI because the complete datasets are large.

The canonical event CSV is:
sample_id,label,split,timestamp_us,x,y,polarity

The API /api/datasets/validate-events endpoint verifies the uploaded CSV SHA-256 and the SHA-256 of sorted sample IDs for the selected split, checks event bounds/order and rejects sample IDs appearing in multiple splits. The endpoint currently accepts CSV bodies up to 180 KB; use the Python manifest/export workflow for larger datasets and do not send large event files through the current API.

## Evaluation

/api/benchmarks/evaluate accepts candidate predictions and an optional baseline prediction CSV. Required prediction columns are sample_id,actual,predicted; latency_ms is optional. It computes accuracy, macro-F1, confusion matrix, mean supplied latency, class-stratified bootstrap confidence interval, and (when a baseline is provided) an exact paired McNemar test. Candidate and baseline must have identical unique sample IDs and labels.

Required manifest fields: dataset name/version/SHA-256, validation or test split, preprocessing, seed, model artifact SHA-256 and source-code commit SHA. The API hashes the prediction artifact. The dataset hash is recorded as declared metadata; verify the original canonical event CSV separately using /api/datasets/validate-events before claiming dataset-byte verification.

## Holdout discipline

- Use upstream train/test splits unchanged where supplied.
- Derive a validation split from training data only, using a deterministic, documented procedure. For speaker-dependent datasets, split by speaker/group rather than randomly splitting individual utterances when the scientific question requires speaker generalization.
- Never tune thresholds, hyperparameters, early stopping or model selection on the test split.
- Store exact sample IDs, split hashes, preprocessing, seed, model hash, source commit and software versions.
- Report multiple independent seeds where stochastic training is involved. Include uncertainty and the per-seed results; do not present a single run as a robust result.
- Energy and power must be measured on the named physical device with calibrated instrumentation, or labeled as estimates. Software latency is not hardware latency.

## Independent reproduction package

A reproduction package should contain:
1. This manifest and exact source commit.
2. Original dataset citation, license, upstream archive hashes and split sample IDs.
3. Environment lockfile/container digest and framework versions.
4. Model checkpoint hash, configuration, seed and preprocessing code.
5. Prediction CSVs and evaluation report.
6. A separate reproduction run performed by someone who did not author the original experiment.

A passing CI test establishes code regression evidence. It does not establish that a scientific claim has been independently reproduced.
