import { useState } from "react";
import { Activity, FileCheck2, AlertTriangle } from "lucide-react";
interface Evaluation {
 metrics:{samples:number;accuracy:number;macroF1:number;meanLatencyMs:number|null;classes:string[];confusionMatrix:number[][]};
 accuracyInterval:{estimate:number;lower:number;upper:number;confidenceLevel:number;resamples:number;seed:number};
 pairedBaseline:null|{samples:number;candidateOnlyWins:number;baselineOnlyWins:number;exactMcNemarPValue:number};
 provenance:{predictionArtifactSha256:string;sourceDatasetHashVerified:boolean;warning:string};
}
export function BenchmarkEvaluator(){
 const [predictionFile,setPredictionFile]=useState("");const [baselineFile,setBaselineFile]=useState("");
 const [datasetName,setDatasetName]=useState("User-provided event dataset");const [datasetVersion,setDatasetVersion]=useState("1.0");
 const [datasetSha256,setDatasetSha256]=useState("");const [split,setSplit]=useState<"validation"|"test">("test");
 const [preprocessing,setPreprocessing]=useState("");const [seed,setSeed]=useState("20261103");
 const [modelSha256,setModelSha256]=useState("");const [codeCommit,setCodeCommit]=useState("");
 const [result,setResult]=useState<Evaluation|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const readFile=(file:File)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(new Error("Could not read selected file."));reader.readAsText(file);});
 async function evaluate(){setBusy(true);setError("");setResult(null);try{
  if(!predictionFile)throw new Error("Upload a labeled prediction CSV.");
  const manifest={datasetName,datasetVersion,datasetSha256,split,preprocessing,seed:Number(seed),modelSha256,codeCommit};
  const response=await fetch("/api/benchmarks/evaluate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csv:predictionFile,baselineCsv:baselineFile||undefined,manifest})});
  const body=await response.json();if(!response.ok)throw new Error(body.error||"Evaluation failed.");setResult(body);
 }catch(e){setError(e instanceof Error?e.message:"Evaluation failed.");}finally{setBusy(false);}}
 const hashPattern=/^[a-f0-9]{64}$/i;
 return <div className="space-y-6 pb-12">
  <header className="rounded-2xl border border-cyan-500/30 bg-slate-900/70 p-6">
   <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono"><Activity className="w-4 h-4"/> REPRODUCIBLE EVALUATION</div>
   <h2 className="text-2xl font-bold text-white mt-2">Benchmark evaluator</h2>
   <p className="text-sm text-slate-400 mt-2 max-w-3xl">Evaluate model predictions from a documented validation or test run. This tool does not invent dataset scores or claim official benchmark status. Provide hashes and configuration so another researcher can reproduce the same evaluation.</p>
  </header>
  <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
   <h3 className="font-semibold text-slate-100">Prediction artifacts</h3>
   <p className="text-xs text-slate-400">CSV columns required: sample_id,actual,predicted. Optional: latency_ms. Use one row per sample; this parser expects unquoted comma-separated fields.</p>
   <label className="block text-sm text-slate-300">Candidate predictions (CSV)<input type="file" accept=".csv,text/csv" onChange={async e=>{const f=e.target.files?.[0];if(f)setPredictionFile(await readFile(f));}} className="block w-full mt-2 text-xs text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-cyan-500 file:px-3 file:py-2 file:text-slate-950"/></label>
   <label className="block text-sm text-slate-300">Baseline predictions (optional, same sample IDs)<input type="file" accept=".csv,text/csv" onChange={async e=>{const f=e.target.files?.[0];if(f)setBaselineFile(await readFile(f));}} className="block w-full mt-2 text-xs text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white"/></label>
   <div className="text-xs text-slate-500">Candidate file: {predictionFile?String(predictionFile.split(/\r?\n/).filter(Boolean).length-1)+" rows loaded":"not selected"} · Baseline: {baselineFile?"loaded":"not selected"}</div>
  </section>
  <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
   <h3 className="font-semibold text-slate-100">Reproducibility manifest</h3>
   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <Field label="Dataset name" value={datasetName} set={setDatasetName}/>
    <Field label="Dataset version" value={datasetVersion} set={setDatasetVersion}/>
    <Field label="Dataset SHA-256" value={datasetSha256} set={setDatasetSha256} placeholder="64-character hash"/>
    <label className="text-xs text-slate-300">Evaluation split<select value={split} onChange={e=>setSplit(e.target.value as "validation"|"test")} className="mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2.5"><option value="test">Untouched test</option><option value="validation">Validation</option></select></label>
    <Field label="Preprocessing / event representation" value={preprocessing} set={setPreprocessing} placeholder="e.g. voxel grid, 10 ms bins"/>
    <Field label="Random seed" value={seed} set={setSeed}/>
    <Field label="Model artifact SHA-256" value={modelSha256} set={setModelSha256} placeholder="64-character hash"/>
    <Field label="Code commit SHA" value={codeCommit} set={setCodeCommit} placeholder="40-character Git commit"/>
   </div>
   <p className="text-xs text-amber-300">The evaluator records the dataset hash you declare but cannot verify the original dataset bytes from prediction output alone. Do not describe the dataset as independently verified unless you also validate the original event artifact.</p>
   <button disabled={busy||!predictionFile||!hashPattern.test(datasetSha256)||!hashPattern.test(modelSha256)||!/^([a-f0-9]{40}|[a-f0-9]{64})$/i.test(codeCommit)||!preprocessing.trim()} onClick={evaluate} className="rounded-lg bg-cyan-500 px-5 py-3 font-bold text-slate-950 disabled:opacity-40">{busy?"Evaluating…":"Evaluate predictions"}</button>
   {error&&<p role="alert" className="text-sm text-rose-400">{error}</p>}
  </section>
  {result&&<section className="rounded-xl border border-emerald-700/40 bg-slate-900/70 p-5 space-y-4">
   <div className="flex items-center gap-2 text-emerald-300"><FileCheck2 className="w-4 h-4"/> Evaluation completed</div>
   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
    <Metric label="Samples" value={String(result.metrics.samples)}/>
    <Metric label="Accuracy" value={(100*result.metrics.accuracy).toFixed(2)+"%"}/>
    <Metric label="Macro F1" value={result.metrics.macroF1.toFixed(4)}/>
    <Metric label="Mean latency" value={result.metrics.meanLatencyMs===null?"Not supplied":result.metrics.meanLatencyMs.toFixed(3)+" ms"}/>
    <Metric label="95% stratified bootstrap" value={(100*result.accuracyInterval.lower).toFixed(2)+"–"+(100*result.accuracyInterval.upper).toFixed(2)+"%"}/>
    {result.pairedBaseline&&<Metric label="Exact McNemar p" value={result.pairedBaseline.exactMcNemarPValue.toFixed(5)}/>}
   </div>
   {result.pairedBaseline&&<p className="text-xs text-slate-300">Candidate-only wins: {result.pairedBaseline.candidateOnlyWins} · Baseline-only wins: {result.pairedBaseline.baselineOnlyWins}. Paired comparison requires identical sample IDs and labels.</p>}
   <div className="overflow-auto"><table className="text-xs border-collapse"><thead><tr><th className="p-2 text-left">Actual / Predicted</th>{result.metrics.classes.map(c=><th key={c} className="p-2">{c}</th>)}</tr></thead><tbody>{result.metrics.confusionMatrix.map((row,i)=><tr key={result.metrics.classes[i]}><th className="p-2 text-left">{result.metrics.classes[i]}</th>{row.map((v,j)=><td key={j} className="p-2 text-center border border-slate-800">{v}</td>)}</tr>)}</tbody></table></div>
   <p className="text-xs text-amber-300"><AlertTriangle className="inline w-3 h-3 mr-1"/>{result.provenance.warning}</p>
   <p className="text-[11px] text-slate-500">Prediction artifact SHA-256: {result.provenance.predictionArtifactSha256}</p>
  </section>}
 </div>;
}
function Field({label,value,set,placeholder=""}:{label:string;value:string;set:(v:string)=>void;placeholder?:string}){return <label className="text-xs text-slate-300">{label}<input value={value} onChange={e=>set(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded bg-slate-950 border border-slate-700 p-2.5 text-slate-100"/></label>;}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><div className="text-[10px] uppercase text-slate-500">{label}</div><div className="mt-1 text-lg font-bold text-white">{value}</div></div>;}
