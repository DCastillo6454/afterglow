// Adapted from Website UI/afterglow-ui.js: optional decorative cursor; native cursor stays visible.
// Preview-only demo handlers removed. Disabled for coarse pointers and reduced motion.
(() => {
const enabled=matchMedia('(pointer:fine) and (prefers-reduced-motion:no-preference)');
let spark;
function configure(){spark?.remove();spark=null;if(!enabled.matches)return;spark=document.createElement('span');spark.className='ag-cursor-spark';spark.setAttribute('aria-hidden','true');document.body.append(spark)}
configure();enabled.addEventListener('change',configure);
document.addEventListener('pointermove',e=>{if(!spark)return;spark.style.transform='translate('+ (e.clientX-15)+'px,'+(e.clientY-15)+'px)';spark.style.opacity='.65'});
document.addEventListener('pointerout',e=>{if(!e.relatedTarget&&spark)spark.style.opacity='0'});
})();
