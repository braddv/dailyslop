import { type State, day, hour, isNight, weather, addEvidence, addObservation } from './state';
export const planetAngle=(s:State)=>((day(s)-1)*12+(hour(s)-22)*4+30+360)%360;
export const moonPhase=(s:State)=>(day(s)+5)%28/28;
export function observeSky(s:State,site:string,target:string):string {
 if(!isNight(s))return 'The sky is too bright. Observe between 20:00 and 05:00.';
 if(weather(s)!=='clear'){addObservation(s,`Astronomy from ${site}: ${weather(s)} prevents a reliable bearing.`);return weather(s)==='rain'?'Rain hides the sky. Try a clear night.':'Clouds prevent a reliable bearing. The conditions are recorded, but no measurement is added.';}
 const d=day(s),h=hour(s),angle=planetAngle(s),quality=s.lens&&s.arc?1:8;
 if(s.sky.some(r=>r.day===d&&r.target===target&&Math.abs(r.hour-h)<0.25))return 'You have already recorded this target at this hour. Observe on another night for independent evidence.';
 s.sky.push({time:s.minutes,day:d,hour:h,site,angle,quality,target});
 if(target==='planet'){const records=s.sky.filter(r=>r.target==='planet');addEvidence(s,'sky-first');if(records.some(r=>r.day!==d&&Math.abs(r.hour-h)<0.25))addEvidence(s,'sky-second');if(s.hypothesis){const p=s.hypothesis;const expected=(p.angle+(d-p.day)*12+360)%360;if(d>p.day&&Math.abs(h-p.hour)<0.25&&quality===1&&Math.abs(angle-expected)<1.1){addEvidence(s,'sky-confirmed');addObservation(s,`The predicted bearing ${expected.toFixed(1)}° matches the measured ${angle.toFixed(1)}° on an independent night.`);}}
 }
 return target==='planet'?`Wanderer bearing: ${angle.toFixed(1)}° ±${quality}°. ${site==='ridge'?'The ridge horizon is clear and sharply defined.':'The clearing provides a familiar reference.'} Compare observations at the same hour on separate nights.`:target==='moon'?`Moon phase: ${(moonPhase(s)*100).toFixed(0)}% through its cycle. Its bright limb and position are recorded.`:'The Swan’s five reference stars retain their relative positions. A fixed constellation supplies the frame for measuring a moving planet.';
}
export function proposeSky(s:State):string {const records=s.sky.filter(r=>r.target==='planet');for(let i=records.length-1;i>=0;i--){const last=records[i];const earlier=records.find(r=>r.day<last.day&&Math.abs(r.hour-last.hour)<0.25);if(earlier){const rate=((last.angle-earlier.angle+360)%360)/(last.day-earlier.day);if(Math.abs(rate-12)>1)return 'These observations do not yet support a stable twelve-degree advance.';s.hypothesis={angle:last.angle,day:last.day,hour:last.hour};addEvidence(s,'sky-hypothesis');return `Hypothesis: the wanderer advances 12° per night. Next-night prediction: ${((last.angle+12)%360).toFixed(1)}° at ${Math.floor(last.hour)}:${String(Math.round(last.hour%1*60)).padStart(2,'0')}. Test this with the measuring instrument on a later clear night.`;}}
 return 'You need two observations of the wanderer on different clear nights within fifteen minutes of the same hour.';}
