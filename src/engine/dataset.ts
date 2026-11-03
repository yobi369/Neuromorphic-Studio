export interface EventRecord {sampleId:string;label:string;split:"train"|"validation"|"test";timestampUs:number;x:number;y:number;polarity:1|-1;}
export interface DatasetManifest {name:string;version:string;source:string;license:string;sha256:string;split:"train"|"validation"|"test";splitHash:string;preprocessing:string;seed:number;sampleCount:number;eventCount:number;}
export function parseEventCsv(csv:string,width:number,height:number):EventRecord[]{
 if(!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1)throw new Error("sensor dimensions must be positive integers");
 const lines=csv.replace(/^\uFEFF/,"").split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)throw new Error("event CSV requires header and records");
 const h=lines[0].split(",").map(x=>x.trim()),col=(k:string)=>h.indexOf(k);
 const required=["sample_id","label","split","timestamp_us","x","y","polarity"];for(const k of required)if(col(k)<0)throw new Error("missing event CSV column: "+k);
 const last=new Map<string,number>();
 return lines.slice(1).map((line,i)=>{const v=line.split(",").map(x=>x.trim());if(v.length!==h.length)throw new Error("invalid column count at event row "+(i+2));
  const sampleId=v[col("sample_id")],label=v[col("label")],split=v[col("split")] as EventRecord["split"],timestampUs=Number(v[col("timestamp_us")]),x=Number(v[col("x")]),y=Number(v[col("y")]),polarity=Number(v[col("polarity")]);
  if(!sampleId||!label||!["train","validation","test"].includes(split))throw new Error("invalid sample, label or split at row "+(i+2));
  if(!Number.isSafeInteger(timestampUs)||timestampUs<0||!Number.isInteger(x)||x<0||x>=width||!Number.isInteger(y)||y<0||y>=height||![1,-1].includes(polarity))throw new Error("invalid event coordinates/time/polarity at row "+(i+2));
  const key=split+":"+sampleId,prior=last.get(key);if(prior!==undefined&&timestampUs<prior)throw new Error("timestamps must be nondecreasing within each sample");
  last.set(key,timestampUs);return {sampleId,label,split,timestampUs,x,y,polarity:polarity as 1|-1};});
}
export function validateDatasetManifest(m:DatasetManifest,events:EventRecord[]){
 if(!m||!["train","validation","test"].includes(m.split)||!m.name?.trim()||!m.version?.trim()||!m.source?.trim()||!m.license?.trim()||!m.preprocessing?.trim())throw new Error("dataset provenance fields are required");
 if(!/^[a-f0-9]{64}$/i.test(m.sha256)||!/^[a-f0-9]{64}$/i.test(m.splitHash))throw new Error("dataset and split hashes must be SHA-256 hex digests");
 if(!Number.isInteger(m.seed)||m.seed<0||!Number.isInteger(m.sampleCount)||!Number.isInteger(m.eventCount)||m.sampleCount<1||m.eventCount<1)throw new Error("invalid dataset counts or seed");
 if(events.length!==m.eventCount)throw new Error("manifest eventCount does not match parsed events");
 const samples=new Set(events.filter(e=>e.split===m.split).map(e=>e.sampleId));if(samples.size!==m.sampleCount)throw new Error("manifest sampleCount does not match selected split");
 return {verifiedStructure:true,contentHashVerified:false,splitHashVerified:false,selectedSamples:samples.size,events:events.length,warning:"Hash values are syntax-checked only; compute and compare hashes against the original source bytes before reporting a verified dataset."};
}
export function assertNoSplitLeakage(events:EventRecord[]){
 const splits=new Map<string,Set<string>>();for(const e of events){const set=splits.get(e.sampleId)||new Set<string>();set.add(e.split);splits.set(e.sampleId,set);}
 const leaked=[...splits].filter(([,s])=>s.size>1).map(([id])=>id);if(leaked.length)throw new Error("sample leakage across dataset splits: "+leaked.slice(0,10).join(", "));
 return {samples:splits.size,leakageFree:true};
}
