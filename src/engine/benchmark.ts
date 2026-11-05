export interface LabeledPrediction { sampleId:string; actual:string; predicted:string; latencyMs?:number; }
export interface EvaluationMetrics { samples:number; accuracy:number; macroF1:number; meanLatencyMs:number|null; classes:string[]; confusionMatrix:number[][]; }
export interface BootstrapInterval { estimate:number; lower:number; upper:number; confidenceLevel:number; resamples:number; seed:number; }
export function parseLabeledCsv(csv:string):LabeledPrediction[]{
 const lines=csv.replace(/^\uFEFF/,"").split(/\r?\n/).filter(line=>line.trim().length>0);
 if(lines.length<2)throw new Error("CSV requires a header and at least one sample");
 const header=lines[0].split(",").map(v=>v.trim());const index=(name:string)=>header.indexOf(name);
 const id=index("sample_id"),actual=index("actual"),pred=index("predicted"),lat=index("latency_ms");
 if(id<0||actual<0||pred<0)throw new Error("CSV header must include sample_id,actual,predicted");
 return lines.slice(1).map((line,i)=>{const cells=line.split(",").map(v=>v.trim());if(cells.length!==header.length)throw new Error(`CSV row ${i+2} has ${cells.length} columns; expected ${header.length}`);
  const sampleId=cells[id],a=cells[actual],p=cells[pred];if(!sampleId||!a||!p)throw new Error(`CSV row ${i+2} has an empty required field`);
  const latency=lat<0||cells[lat]===""?undefined:Number(cells[lat]);if(latency!==undefined&&(!Number.isFinite(latency)||latency<0))throw new Error(`CSV row ${i+2} has invalid latency_ms`);
  return {sampleId,actual:a,predicted:p,latencyMs:latency};});
}
export function evaluatePredictions(rows:LabeledPrediction[]):EvaluationMetrics{
 if(rows.length===0)throw new Error("at least one prediction is required");
 if(new Set(rows.map(r=>r.sampleId)).size!==rows.length)throw new Error("sample_id values must be unique");
 const classes=[...new Set(rows.flatMap(r=>[r.actual,r.predicted]))].sort();const lookup=new Map(classes.map((c,i)=>[c,i]));
 const matrix=classes.map(()=>classes.map(()=>0));let correct=0;const latencies:number[]=[];
 for(const r of rows){if(!r.sampleId||!r.actual||!r.predicted)throw new Error("sampleId, actual and predicted are required");matrix[lookup.get(r.actual)!][lookup.get(r.predicted)!]++;if(r.actual===r.predicted)correct++;
  if(r.latencyMs!==undefined){if(!Number.isFinite(r.latencyMs)||r.latencyMs<0)throw new Error("latencyMs must be finite and >= 0");latencies.push(r.latencyMs);}}
 const f1=classes.map((_,i)=>{const tp=matrix[i][i],fp=matrix.reduce((s,row)=>s+row[i],0)-tp,fn=matrix[i].reduce((s,v)=>s+v,0)-tp;const precision=tp+fp?tp/(tp+fp):0,recall=tp+fn?tp/(tp+fn):0;return precision+recall?2*precision*recall/(precision+recall):0;});
 return {samples:rows.length,accuracy:correct/rows.length,macroF1:f1.reduce((a,b)=>a+b,0)/classes.length,meanLatencyMs:latencies.length?latencies.reduce((a,b)=>a+b,0)/latencies.length:null,classes,confusionMatrix:matrix};
}
function rng(seed:number){let x=seed>>>0;return ()=>{x=(1664525*x+1013904223)>>>0;return x/4294967296;};}
export function bootstrapAccuracy(rows:LabeledPrediction[],resamples=2000,confidenceLevel=.95,seed=20261103):BootstrapInterval{
 if(rows.length===0)throw new Error("at least one prediction is required");if(!Number.isInteger(resamples)||resamples<100)throw new Error("resamples must be an integer >= 100");if(confidenceLevel<=0||confidenceLevel>=1)throw new Error("confidenceLevel must be between 0 and 1");
 const random=rng(seed),values:number[]=[];for(let b=0;b<resamples;b++){let correct=0;for(let i=0;i<rows.length;i++){const r=rows[Math.floor(random()*rows.length)];if(r.actual===r.predicted)correct++;}values.push(correct/rows.length);}
 values.sort((a,b)=>a-b);const q=(p:number)=>values[Math.min(values.length-1,Math.max(0,Math.floor(p*(values.length-1))))];const estimate=rows.filter(r=>r.actual===r.predicted).length/rows.length,alpha=(1-confidenceLevel)/2;
 return {estimate,lower:q(alpha),upper:q(1-alpha),confidenceLevel,resamples,seed};
}
export function compareToBaseline(candidate:EvaluationMetrics,baseline:EvaluationMetrics){if(candidate.samples!==baseline.samples)throw new Error("candidate and baseline must use the same sample count");return {accuracyDelta:candidate.accuracy-baseline.accuracy,macroF1Delta:candidate.macroF1-baseline.macroF1,candidateAccuracy:candidate.accuracy,baselineAccuracy:baseline.accuracy};}

export function bootstrapAccuracyStratified(rows:LabeledPrediction[],resamples=2000,confidenceLevel=.95,seed=20261103):BootstrapInterval{
 if(!rows.length)throw new Error("at least one prediction is required");
 const groups=new Map<string,LabeledPrediction[]>();for(const r of rows){const g=groups.get(r.actual)||[];g.push(r);groups.set(r.actual,g);}
 if(!Number.isInteger(resamples)||resamples<100||confidenceLevel<=0||confidenceLevel>=1)throw new Error("invalid bootstrap configuration");
 const random=rng(seed),values:number[]=[];for(let b=0;b<resamples;b++){let correct=0,total=0;for(const group of groups.values())for(let i=0;i<group.length;i++){const r=group[Math.floor(random()*group.length)];if(r.actual===r.predicted)correct++;total++;}values.push(correct/total);}
 values.sort((a,b)=>a-b);const q=(p:number)=>values[Math.min(values.length-1,Math.max(0,Math.floor(p*(values.length-1))))],alpha=(1-confidenceLevel)/2;
 return {estimate:rows.filter(r=>r.actual===r.predicted).length/rows.length,lower:q(alpha),upper:q(1-alpha),confidenceLevel,resamples,seed};
}
export function comparePredictionsPaired(candidate:LabeledPrediction[],baseline:LabeledPrediction[]){
 const byId=new Map(baseline.map(r=>[r.sampleId,r]));if(byId.size!==baseline.length||new Set(candidate.map(r=>r.sampleId)).size!==candidate.length||candidate.length!==baseline.length)throw new Error("paired predictions require unique sample IDs and equal sample counts");
 let candidateOnly=0,baselineOnly=0;for(const c of candidate){const b=byId.get(c.sampleId);if(!b||b.actual!==c.actual)throw new Error("candidate and baseline must contain identical sample IDs and labels");const cCorrect=c.actual===c.predicted,bCorrect=b.actual===b.predicted;if(cCorrect&&!bCorrect)candidateOnly++;if(!cCorrect&&bCorrect)baselineOnly++;}
 const n=candidateOnly+baselineOnly;let tail=0;if(n>0){const k=Math.min(candidateOnly,baselineOnly);let probability=Math.pow(.5,n);tail=probability;for(let i=0;i<k;i++){probability*=((n-i)/(i+1));tail+=probability;}tail=Math.min(1,2*tail);}
 return {samples:candidate.length,candidateOnlyWins:candidateOnly,baselineOnlyWins:baselineOnly,exactMcNemarPValue:tail};
}
