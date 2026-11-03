import type {EventRecord} from "./dataset";
export interface EventFilterResult {retained:EventRecord[];rejected:EventRecord[];}
/** Background activity filter: retain an event only when an 8-neighbour pixel fired within the time window. */
export function filterBackgroundActivity(events:EventRecord[],timeWindowUs:number,width:number,height:number):EventFilterResult{
 if(!Number.isSafeInteger(timeWindowUs)||timeWindowUs<1)throw new Error("timeWindowUs must be a positive safe integer");
 if(!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1)throw new Error("sensor dimensions must be positive integers");
 const lastTime=new Map<string,number>(),retained:EventRecord[]=[],rejected:EventRecord[]=[];
 for(const event of events){
  if(event.x<0||event.x>=width||event.y<0||event.y>=height)throw new Error("event outside sensor bounds");
  const sampleKey=event.split+":"+event.sampleId,pixelKey=sampleKey+":"+(event.y*width+event.x);
  let supported=false;
  for(let dy=-1;dy<=1&&!supported;dy++)for(let dx=-1;dx<=1&&!supported;dx++){
   if(dx===0&&dy===0)continue;const x=event.x+dx,y=event.y+dy;if(x<0||x>=width||y<0||y>=height)continue;
   const t=lastTime.get(sampleKey+":"+(y*width+x));if(t!==undefined&&event.timestampUs>=t&&event.timestampUs-t<=timeWindowUs)supported=true;
  }
  lastTime.set(pixelKey,event.timestampUs);
  (supported?retained:rejected).push(event);
 }
 return {retained,rejected};
}
