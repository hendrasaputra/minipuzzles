import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { MaterialMotion } from './material-motion';
const frames=new Map<number,FrameRequestCallback>(),events=new Map<string,()=>void>();
let nextId=0;
const preference={matches:false,addEventListener(_name:string,callback:()=>void){events.set('motion',callback);}};
beforeEach(()=>{
  frames.clear();events.clear();nextId=0;preference.matches=false;
  vi.stubGlobal('document',{hidden:false,addEventListener(name:string,callback:()=>void){events.set(name,callback);}});
  vi.stubGlobal('window',{matchMedia:()=>preference,addEventListener(name:string,callback:()=>void){events.set(name,callback);}});
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++nextId,callback);return nextId;});
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
});
afterEach(()=>vi.unstubAllGlobals());
function tick(time:number){const [id,callback]=[...frames][0];frames.delete(id);callback(time);}
describe('shared material motion',()=>{
  it('does not schedule another frame when an effect finishes inside its update',()=>{
    const motion=new MaterialMotion(time=>{if(time===1)motion.stop();},()=>{});
    motion.refresh();
    tick(1000);
    expect(frames.size).toBe(0);
    events.get('pageshow')!();
    expect(frames.size).toBe(0);
  });
  it('stays idle until needed, owns one loop and limits painting to30fps',()=>{
    const update=vi.fn(),paint=vi.fn(),motion=new MaterialMotion(update,paint);expect(frames.size).toBe(0);
    motion.refresh();motion.refresh();expect(frames.size).toBe(1);update.mockClear();paint.mockClear();
    tick(1000);tick(1016);tick(1034);expect(update.mock.calls.map(call=>call[0])).toEqual([1,1.034]);expect(paint).toHaveBeenCalledTimes(2);expect(frames.size).toBe(1);
  });
  it('stops hidden or suspended pages and resumes only one loop',()=>{
    const update=vi.fn(),motion=new MaterialMotion(update,()=>{});motion.refresh();
    (document as unknown as{hidden:boolean}).hidden=true;events.get('visibilitychange')!();expect(frames.size).toBe(0);const count=update.mock.calls.length;
    motion.refresh();expect(update).toHaveBeenCalledTimes(count);
    (document as unknown as{hidden:boolean}).hidden=false;events.get('visibilitychange')!();expect(frames.size).toBe(1);
    events.get('pagehide')!();expect(frames.size).toBe(0);events.get('pageshow')!();expect(frames.size).toBe(1);
  });
  it('shows a still frame for reduced motion and handles live preference changes',()=>{
    preference.matches=true;const update=vi.fn(),motion=new MaterialMotion(update,()=>{});motion.refresh();expect(update).toHaveBeenLastCalledWith(0);expect(frames.size).toBe(0);
    preference.matches=false;events.get('motion')!();expect(frames.size).toBe(1);
    preference.matches=true;events.get('motion')!();expect(frames.size).toBe(0);expect(update).toHaveBeenLastCalledWith(0);
  });
});
