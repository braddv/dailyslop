import { type State, hour, addObservation, addItem } from './state';
export function advance(s:State,minutes:number){s.minutes+=minutes;for(const job of s.jobs.filter(j=>j.due<=s.minutes)){for(const p of job.products)addItem(s,p);addObservation(s,`${job.name} has finished; its materials are ready on the workbench.`);}s.jobs=s.jobs.filter(j=>j.due>s.minutes);for(const order of s.orders)if(!order.delivered&&s.minutes>=order.due)addObservation(s,`${order.name} is ready for collection from its artisan.`);}
export const tick=(s:State,delta:number)=>advance(s,delta/1000*1440/(s.settings.dayLength*60));
export function sleepUntil(s:State,target:number){let diff=(target-hour(s)+24)%24;if(diff<0.1)diff=24;advance(s,diff*60);}
