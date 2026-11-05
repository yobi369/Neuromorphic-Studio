"""Export official neuromorphic datasets through pinned Tonic adapters to canonical event CSV."""
import argparse, csv, hashlib, json
from pathlib import Path
import tonic

DATASETS = {
 "nmnist": (tonic.datasets.NMNIST, 34, 34, "N-MNIST", "https://www.garrickorchard.com/datasets/n-mnist"),
 "dvs_gesture": (tonic.datasets.DVSGesture, 128, 128, "IBM DVS Gesture", "https://research.ibm.com/haifa/dept/imt/ics/dvs_gesture.php"),
 "shd": (tonic.datasets.SHD, 700, 1, "Spiking Heidelberg Digits", "https://zenkelab.org/resources/spiking-heidelberg-datasets-shd/"),
}
def sha256(path):
 h=hashlib.sha256()
 with open(path,"rb") as f:
  for block in iter(lambda:f.read(1024*1024),b""): h.update(block)
 return h.hexdigest()
def split_hash(ids):
 return hashlib.sha256("\n".join(sorted(ids)).encode()).hexdigest()
def main():
 p=argparse.ArgumentParser()
 p.add_argument("dataset",choices=sorted(DATASETS))
 p.add_argument("--root",required=True,help="Directory used by Tonic to cache/download the upstream dataset")
 p.add_argument("--split",choices=["train","test"],required=True)
 p.add_argument("--output",required=True,help="Canonical CSV output path")
 p.add_argument("--license",required=True,help="License/terms checked by the researcher against the upstream dataset")
 p.add_argument("--seed",type=int,default=20261103)
 p.add_argument("--max-samples",type=int,default=0,help="Optional smoke subset; zero exports the complete selected split")
 args=p.parse_args()
 cls,width,height,name,source=DATASETS[args.dataset]
 ds=cls(save_to=args.root,train=(args.split=="train"))
 count=len(ds) if args.max_samples<=0 else min(len(ds),args.max_samples)
 out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
 ids=[];event_count=0
 with out.open("w",newline="",encoding="utf-8") as f:
  writer=csv.writer(f);writer.writerow(["sample_id","label","split","timestamp_us","x","y","polarity"])
  for index in range(count):
   events,label=ds[index]
   names=getattr(getattr(events,"dtype",None),"names",None)
   if not names: raise ValueError(f"Unsupported Tonic event structure for {args.dataset}: {getattr(events,'dtype',None)}")
   fields=set(names)
   t_name="t" if "t" in fields else "timestamp"
   x_name="x" if "x" in fields else "unit"
   y_name="y" if "y" in fields else None
   p_name="p" if "p" in fields else None
   if t_name not in fields or x_name not in fields: raise ValueError(f"Missing time or channel field: {names}")
   sample_id=f"{args.dataset}-{args.split}-{index:08d}";ids.append(sample_id)
   # Tonic exposes vision event timestamps in microseconds. SHD adapter converts seconds to microseconds.
   ordered=events
   if len(events)>1:
    ordered=events[events[t_name].argsort(kind="stable")]
   for ev in ordered:
    x=int(ev[x_name]);y=int(ev[y_name]) if y_name else 0
    raw_p=int(ev[p_name]) if p_name else 1
    polarity=1 if raw_p>0 else -1
    timestamp=int(ev[t_name])
    if timestamp<0 or x<0 or x>=width or y<0 or y>=height: raise ValueError(f"Out-of-range event in {sample_id}")
    writer.writerow([sample_id,str(int(label)),args.split,timestamp,x,y,polarity]);event_count+=1
 manifest={
  "name":name,"version":"upstream release via Tonic 1.6.0","source":source,"license":args.license,
  "sha256":sha256(out),"split":args.split,"splitHash":split_hash(ids),
  "preprocessing":"Tonic upstream loader; stable timestamp sort; polarity mapped to -1/+1; no additional denoising, cropping or temporal binning",
  "adapterNote":"Tonic DVSGesture is a preprocessed dataset variant: original multi-label recordings are segmented into samples and timestamp precision is reduced to milliseconds. Tonic timestamps are represented in microseconds; do not infer finer precision than the upstream data provides." if args.dataset=="dvs_gesture" else "No additional dataset-specific transform is applied by this exporter.",
  "seed":args.seed,"sampleCount":len(ids),"eventCount":event_count,
  "sensor":{"width":width,"height":height},"loader":{"library":"tonic","version":tonic.__version__},
  "subset":args.max_samples>0
 }
 manifest_path=out.with_suffix(out.suffix+".manifest.json")
 manifest_path.write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
 print(json.dumps({"csv":str(out),"manifest":str(manifest_path),"samples":len(ids),"events":event_count,"sha256":manifest["sha256"],"splitHash":manifest["splitHash"],"subset":manifest["subset"]},indent=2))
if __name__=="__main__": main()
