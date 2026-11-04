/** Material effects share one throttled loop per scene and respect browser motion/lifecycle settings. */
export class MaterialMotion {
  private frame=0;
  private lastFrame=-Infinity;
  private active=false;
  private suspended=false;
  private preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  constructor(private update:(seconds:number)=>void,private paint:()=>void){
    document.addEventListener('visibilitychange',this.sync);
    this.preference.addEventListener('change',this.sync);
    window.addEventListener('pagehide',()=>{this.suspended=true;this.sync();});
    window.addEventListener('pageshow',()=>{this.suspended=false;this.sync();});
  }
  refresh(){this.active=true;this.sync();}
  private sync=()=>{
    cancelAnimationFrame(this.frame);this.frame=0;
    if(!this.active||document.hidden||this.suspended)return;
    this.update(this.preference.matches?0:performance.now()/1000);this.paint();
    if(!this.preference.matches)this.frame=requestAnimationFrame(this.animate);
  };
  private animate=(time:number)=>{
    this.frame=0;
    if(document.hidden||this.suspended||this.preference.matches)return;
    if(time-this.lastFrame>=1000/30){this.lastFrame=time;this.update(time/1000);this.paint();}
    this.frame=requestAnimationFrame(this.animate);
  };
}
