"""Verify frozen experiment manifest artifact hashes without executing untrusted commands."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

HEX64=re.compile(r"^[a-fA-F0-9]{64}$")
def digest(path):
 h=hashlib.sha256()
 with path.open("rb") as stream:
  for block in iter(lambda:stream.read(1024*1024),b""):h.update(block)
 return h.hexdigest()
def verify(manifest_path):
 manifest_path=Path(manifest_path).resolve()
 data=json.loads(manifest_path.read_text(encoding="utf-8"))
 for key in ("experimentId","dataset","split","preprocessing","seed","model","software","sourceCommit","artifacts"):
  if key not in data:raise ValueError("missing manifest field: "+key)
 if data["split"] not in ("train","validation","test"):raise ValueError("invalid split")
 if not isinstance(data["seed"],int) or data["seed"]<0:raise ValueError("seed must be a non-negative integer")
 if not re.fullmatch(r"[a-fA-F0-9]{40}",data["sourceCommit"]):raise ValueError("sourceCommit must be a full 40-character commit SHA")
 root=manifest_path.parent.resolve();verified=[]
 for artifact in data["artifacts"]:
  rel=Path(artifact["path"])
  if rel.is_absolute():raise ValueError("artifact paths must be relative")
  path=(root/rel).resolve()
  if root not in path.parents:raise ValueError("artifact path escapes manifest directory: "+str(rel))
  expected=artifact.get("sha256","")
  if not HEX64.fullmatch(expected):raise ValueError("invalid SHA-256 for "+str(rel))
  if not path.is_file():raise FileNotFoundError(str(path))
  actual=digest(path)
  if actual.lower()!=expected.lower():raise ValueError("SHA-256 mismatch for "+str(rel))
  verified.append({"path":str(rel),"sha256":actual,"role":artifact.get("role","unspecified")})
 return {"experimentId":data["experimentId"],"sourceCommit":data["sourceCommit"],"verifiedArtifacts":verified,"artifactCount":len(verified),"note":"Artifact integrity verified. This does not execute the experiment or independently reproduce scientific results."}
def main():
 parser=argparse.ArgumentParser();parser.add_argument("manifest");args=parser.parse_args()
 try:print(json.dumps(verify(args.manifest),indent=2))
 except Exception as exc:print("Manifest verification failed:",exc,file=sys.stderr);raise SystemExit(1)
if __name__=="__main__":main()
