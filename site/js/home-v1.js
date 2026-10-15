/* GroundApp homepage behavior (design-v2). The breath pacer lives in pacer-v1.js.
   Motion budget (DESIGN.md): pacer + hero entrance, the pinned "how it works" phone,
   the closing rings. Nothing else on the page animates on scroll.
   Bump the filename (v2, v3) when editing: Cloudflare caches .js at the edge for 7 days. */
(function(){
'use strict';
var T0=window.__gaT0||Date.now();
var mqRM=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
function RM(){return mqRM.matches}
function $(id){return document.getElementById(id)}
function each(list,fn){Array.prototype.forEach.call(list,fn)}
var hasIO='IntersectionObserver' in window;
function watch(el,cb,opts){
  if(!el)return null;
  if(!hasIO){cb(true,null);return null}
  var o=new IntersectionObserver(function(es){es.forEach(function(e){cb(e.isIntersecting,e)})},opts||{});
  o.observe(el);return o;
}

/* ---------- storage + signup helpers (unchanged from the live site) ---------- */
function lsGet(k){try{return window.localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{window.localStorage.setItem(k,v)}catch(e){}}
var NL_KEY='ga-nl',NL_TTL=30*24*60*60*1000;
function nlRecent(){var v=parseInt(lsGet(NL_KEY),10);return !isNaN(v)&&(Date.now()-v)<NL_TTL}
function nlMark(){lsSet(NL_KEY,String(Date.now()))}
var EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var MSG={
  invalid_email:"That email doesn't look right. Check it and try again.",
  rate_limited:"Too many tries in a row. Give it a minute, then try again.",
  timeout:"That took too long. Check your connection and try again.",
  network:"We couldn't reach the server. Check your connection and try again.",
  server:"Something went wrong on our end. Please try again."
};
var OK_NEW="You're in. Check your inbox for a welcome from Collin.";
var OK_ALREADY="You're already on the list. Thanks for being here.";
function errText(code){return MSG[code]||MSG.server}
function subscribe(data){
  var ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
  var timer=setTimeout(function(){if(ctrl)ctrl.abort()},10000);
  return fetch('/api/subscribe',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(data),
    signal:ctrl?ctrl.signal:undefined
  }).then(function(res){
    return res.json().then(function(j){return j},function(){return null}).then(function(j){
      clearTimeout(timer);
      if(res.ok&&j&&j.ok===true)return j;
      var code=(j&&j.error)||(res.status===429?'rate_limited':res.status===400?'invalid_email':'server');
      return {ok:false,error:code};
    });
  },function(err){
    clearTimeout(timer);
    return {ok:false,error:(err&&err.name==='AbortError')?'timeout':'network'};
  });
}

/* ---------- nav + mobile menu ---------- */
var nav=$('nav');
function onScrollNav(){nav.classList.toggle('scrolled',window.scrollY>40)}
window.addEventListener('scroll',onScrollNav,{passive:true});onScrollNav();
var hb=$('hb'),mm=$('mm');
function menuOpen(){return mm.classList.contains('open')}
function setMenu(open,restore){
  mm.classList.toggle('open',open);
  hb.classList.toggle('x',open);
  hb.setAttribute('aria-expanded',open?'true':'false');
  hb.setAttribute('aria-label',open?'Close menu':'Open menu');
  document.body.style.overflow=open?'hidden':'';
  if(open){var f=mm.querySelector('a');if(f)f.focus()}
  else if(restore)hb.focus();
}
hb.addEventListener('click',function(){setMenu(!menuOpen(),false)});
each(mm.querySelectorAll('a'),function(a){a.addEventListener('click',function(){setMenu(false,false)})});
window.addEventListener('resize',function(){if(window.innerWidth>980&&menuOpen())setMenu(false,false)},{passive:true});

var heroEl=$('hero');

/* ---------- sticky mobile download bar ---------- */
(function(){
  var bar=$('mbar');if(!bar||!hasIO)return;
  var past=false,ctaIn=false,footIn=false;
  function upd(){bar.classList.toggle('show',past&&!ctaIn&&!footIn)}
  watch(heroEl,function(v,e){past=!v&&!!e&&e.boundingClientRect.top<0;upd()});
  watch(document.querySelector('.close'),function(v){ctaIn=v;upd()});
  watch(document.querySelector('footer'),function(v){footIn=v;upd()});
})();

/* ---------- how it works: the pinned phone shows the step in the middle of the screen ---------- */
(function(){
  var steps=document.querySelectorAll('.step'),shots=document.querySelectorAll('.phone img');
  if(!steps.length||!hasIO)return;
  function show(i){
    each(steps,function(s,k){s.classList.toggle('on',k===i)});
    each(shots,function(img,k){img.classList.toggle('on',k===i)});
  }
  var io=new IntersectionObserver(function(es){es.forEach(function(e){
    if(e.isIntersecting)show(parseInt(e.target.getAttribute('data-step'),10)||0);
  })},{rootMargin:'-45% 0px -45% 0px'});
  each(steps,function(s){io.observe(s)});
})();

/* ---------- class testimonials: four shown, the rest on request (no autoplay) ---------- */
(function(){
  var btn=$('ttMoreBtn'),more=$('ttMore');
  if(!btn||!more)return;
  btn.addEventListener('click',function(){
    more.hidden=false;btn.hidden=true;
    var first=more.querySelector('blockquote');
    if(first){first.setAttribute('tabindex','-1');first.focus({preventScroll:true})}
  });
})();

/* ---------- feelings wheel (mouse, touch and keyboard) ---------- */
(function(){
var emotions=[
  {name:'Calm',color:'#7A8B6F',secondaries:[
    {name:'Peaceful',tertiaries:['Serene','Tranquil','Still']},
    {name:'Content',tertiaries:['Satisfied','Fulfilled','Easygoing']},
    {name:'Grateful',tertiaries:['Thankful','Appreciative','Blessed']},
    {name:'Safe',tertiaries:['Secure','Protected','Grounded']}
  ]},
  {name:'Anxious',color:'#D4A574',secondaries:[
    {name:'Worried',tertiaries:['Nervous','Apprehensive','Uneasy']},
    {name:'Overwhelmed',tertiaries:['Swamped','Drowning','Overloaded']},
    {name:'Restless',tertiaries:['Fidgety','Agitated','Antsy']},
    {name:'Panicked',tertiaries:['Terrified','Frantic','Spiraling']}
  ]},
  {name:'Sad',color:'#6B5B4E',secondaries:[
    {name:'Lonely',tertiaries:['Isolated','Abandoned','Invisible']},
    {name:'Grieving',tertiaries:['Heartbroken','Mourning','Aching']},
    {name:'Disappointed',tertiaries:['Let Down','Deflated','Disheartened']},
    {name:'Hopeless',tertiaries:['Despairing','Defeated','Empty']}
  ]},
  {name:'Angry',color:'#7A3A3A',secondaries:[
    {name:'Frustrated',tertiaries:['Stuck','Blocked','Exasperated']},
    {name:'Irritated',tertiaries:['Annoyed','Prickly','Snappy']},
    {name:'Resentful',tertiaries:['Bitter','Wronged','Simmering']},
    {name:'Furious',tertiaries:['Enraged','Livid','Boiling']}
  ]},
  {name:'Energized',color:'#C4935A',secondaries:[
    {name:'Excited',tertiaries:['Thrilled','Buzzing','Electric']},
    {name:'Motivated',tertiaries:['Driven','Focused','Determined']},
    {name:'Joyful',tertiaries:['Elated','Radiant','Blissful']},
    {name:'Alive',tertiaries:['Vibrant','Awake','Present']}
  ]},
  {name:'Numb',color:'#A89585',secondaries:[
    {name:'Disconnected',tertiaries:['Detached','Spaced Out','Removed']},
    {name:'Foggy',tertiaries:['Hazy','Clouded','Unclear']},
    {name:'Exhausted',tertiaries:['Drained','Depleted','Spent']},
    {name:'Frozen',tertiaries:['Paralyzed','Locked','Shutdown']}
  ]}
];
var CX=240,CY=240,wEl=$('feelings-wheel'),wsEl=$('wsel');
if(!wEl||!wsEl)return;
var state={level:'core',coreIdx:null,secIdx:null};
var timers=[];
function later(fn,ms){timers.push(setTimeout(fn,ms))}
function clearTimers(){timers.forEach(clearTimeout);timers=[]}
function addCls(id,c){var n=$(id);if(n)n.classList.add(c)}
function d2r(d){return d*Math.PI/180}
function arcPath(r1,r2,a1,a2){
  var s1=d2r(a1),s2=d2r(a2),lg=(a2-a1>180)?1:0;
  return 'M'+(CX+r2*Math.cos(s1))+','+(CY+r2*Math.sin(s1))+
    ' A'+r2+','+r2+' 0 '+lg+' 1 '+(CX+r2*Math.cos(s2))+','+(CY+r2*Math.sin(s2))+
    ' L'+(CX+r1*Math.cos(s2))+','+(CY+r1*Math.sin(s2))+
    ' A'+r1+','+r1+' 0 '+lg+' 0 '+(CX+r1*Math.cos(s1))+','+(CY+r1*Math.sin(s1))+' Z';
}
function midPt(r,a1,a2){var m=d2r((a1+a2)/2);return{x:CX+r*Math.cos(m),y:CY+r*Math.sin(m)}}
function rgba(hex,a){return'rgba('+parseInt(hex.slice(1,3),16)+','+parseInt(hex.slice(3,5),16)+','+parseInt(hex.slice(5,7),16)+','+a+')'}
var HEART=function(){return 'M'+CX+' '+(CY+13)+' C'+CX+' '+(CY+13)+' '+(CX-15)+' '+(CY+1)+' '+(CX-15)+' '+(CY-4)+' C'+(CX-15)+' '+(CY-10)+' '+(CX-9)+' '+(CY-14)+' '+CX+' '+(CY-9)+' C'+(CX+9)+' '+(CY-14)+' '+(CX+15)+' '+(CY-10)+' '+(CX+15)+' '+(CY-4)+' C'+(CX+15)+' '+(CY+1)+' '+CX+' '+(CY+13)+' '+CX+' '+(CY+13)+' Z'};
function seg(d,fill,label,attrs){
  return '<path d="'+d+'" fill="'+fill+'" stroke="rgba(26,17,14,0.5)" stroke-width="1.5" class="seg" tabindex="0" role="button" aria-label="'+label+'" '+attrs+'/>';
}
function lbl(p,text,size,weight){return '<text x="'+p.x+'" y="'+p.y+'" class="wlbl" font-size="'+size+'" font-weight="'+weight+'" aria-hidden="true">'+text+'</text>'}

function render(focusFirst){
  clearTimers();
  var levelName=state.level==='core'?'core emotions':state.level==='secondary'?emotions[state.coreIdx].name:emotions[state.coreIdx].secondaries[state.secIdx].name;
  var s='<svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Feelings wheel: '+levelName+'">';
  s+='<defs><radialGradient id="orbg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#E8DDD0"/><stop offset="60%" stop-color="#D4A574" stop-opacity="0.6"/><stop offset="100%" stop-color="#C4935A" stop-opacity="0.3"/></radialGradient></defs>';
  var R1=68,R2=210,core,ci,sec,si;
  if(state.level==='core'){
    emotions.forEach(function(e,i){
      var a1=-90+i*60,a2=a1+60;
      s+=seg(arcPath(R1,R2,a1,a2),rgba(e.color,0.6),e.name,'data-ci="'+i+'"');
      s+=lbl(midPt((R1+R2)/2,a1,a2),e.name,18,600);
    });
  } else if(state.level==='secondary'){
    core=emotions[state.coreIdx];ci=state.coreIdx;
    core.secondaries.forEach(function(sc,j){
      var a1=-90+j*90,a2=a1+90;
      s+=seg(arcPath(R1,R2,a1,a2),rgba(core.color,(j%2===0)?0.55:0.68),sc.name,'data-ci="'+ci+'" data-si="'+j+'"');
      s+=lbl(midPt((R1+R2)/2,a1,a2),sc.name,17,500);
    });
  } else {
    core=emotions[state.coreIdx];ci=state.coreIdx;sec=core.secondaries[state.secIdx];si=state.secIdx;
    sec.tertiaries.forEach(function(ter,ti){
      var a1=-90+ti*120,a2=a1+120;
      s+=seg(arcPath(R1,R2,a1,a2),rgba(core.color,(ti%2===0)?0.5:0.65),ter,'data-ci="'+ci+'" data-si="'+si+'" data-ti="'+ti+'"');
      s+=lbl(midPt((R1+R2)/2,a1,a2),ter,18,500);
    });
  }
  s+='<g aria-hidden="true"><circle cx="'+CX+'" cy="'+CY+'" r="62" fill="url(#orbg)" class="center-orb"/>';
  s+='<circle cx="'+CX+'" cy="'+CY+'" r="57" fill="none" stroke="rgba(232,221,208,0.15)" stroke-width="1"/>';
  s+='<path d="'+HEART()+'" class="heart-icon"/></g></svg>';
  wEl.innerHTML=s;

  var pathHtml='',backBtn='';
  if(state.level==='core'){
    pathHtml='<div class="wsel-path">Tap or select an emotion to explore deeper</div>';
  } else if(state.level==='secondary'){
    pathHtml='<div class="wsel-path"><span class="wsel-em">'+emotions[state.coreIdx].name+'</span></div>';
    backBtn='<button type="button" class="wsel-back" data-go="core">&larr; Back to all emotions</button>';
  } else {
    var cn=emotions[state.coreIdx].name,sn=emotions[state.coreIdx].secondaries[state.secIdx].name;
    pathHtml='<div class="wsel-path"><span class="wsel-em">'+cn+'</span> &rsaquo; <span class="wsel-em">'+sn+'</span></div>';
    backBtn='<button type="button" class="wsel-back" data-go="sec">&larr; Back to '+cn+'</button>';
  }
  wsEl.innerHTML=pathHtml+backBtn;

  each(wEl.querySelectorAll('.seg'),function(el){
    el.addEventListener('click',function(ev){ev.stopPropagation();pick(el,false)});
    el.addEventListener('keydown',function(ev){
      if(ev.key==='Enter'||ev.key===' '||ev.key==='Spacebar'){ev.preventDefault();pick(el,true)}
    });
  });
  var bb=wsEl.querySelector('.wsel-back');
  if(bb){
    bb.addEventListener('click',function(ev){
      if(bb.getAttribute('data-go')==='core'){state.level='core';state.coreIdx=null;state.secIdx=null}
      else{state.level='secondary';state.secIdx=null}
      render(ev.detail===0);
    });
  }
  if(focusFirst){var f=wEl.querySelector('.seg');if(f&&f.focus)f.focus({preventScroll:true})}
}

function pick(el,kb){
  if(state.level==='celebrating')return;
  var d=el.dataset;
  if(state.level==='core'&&d.ci!==undefined){state.level='secondary';state.coreIdx=parseInt(d.ci,10);render(kb)}
  else if(state.level==='secondary'&&d.si!==undefined){state.level='tertiary';state.secIdx=parseInt(d.si,10);render(kb)}
  else if(state.level==='tertiary'&&d.ti!==undefined){
    var ci=state.coreIdx,si=state.secIdx,ti=parseInt(d.ti,10);
    var e=emotions[ci];
    celebrate(e.name,e.secondaries[si].name,e.secondaries[si].tertiaries[ti],e.color,kb);
  }
}

function celebrate(coreName,secName,terName,color,kb){
  clearTimers();
  state.level='celebrating';
  each(wEl.querySelectorAll('.seg'),function(s){s.classList.add('seg-fade');s.setAttribute('tabindex','-1')});
  later(function(){
    var s='<svg viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s+='<defs><radialGradient id="orbg2" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#E8DDD0"/><stop offset="40%" stop-color="'+color+'" stop-opacity="0.4"/><stop offset="100%" stop-color="'+color+'" stop-opacity="0.15"/></radialGradient></defs>';
    s+='<circle cx="'+CX+'" cy="'+CY+'" r="62" class="ripple" stroke="'+color+'" id="rp1"/>';
    s+='<circle cx="'+CX+'" cy="'+CY+'" r="62" class="ripple" stroke="'+color+'" id="rp2"/>';
    s+='<circle cx="'+CX+'" cy="'+CY+'" r="62" class="ripple" stroke="'+color+'" id="rp3"/>';
    s+='<circle cx="'+CX+'" cy="'+CY+'" r="80" fill="url(#orbg2)" class="center-orb"/>';
    s+='<circle cx="'+CX+'" cy="'+CY+'" r="75" fill="none" stroke="rgba(232,221,208,0.12)" stroke-width="1"/>';
    s+='<path d="'+HEART()+'" class="heart-icon"/></svg>';
    wEl.innerHTML=s;
    later(function(){addCls('rp1','go')},30);
    later(function(){addCls('rp2','go')},1200);
    later(function(){addCls('rp3','go')},2400);
    wsEl.innerHTML='<div class="wsel-cele">'+
      '<div class="cele-name" id="cn">'+terName+'</div>'+
      '<div class="cele-crumbs" id="cc"><span class="wsel-em">'+coreName+'</span> &rsaquo; <span class="wsel-em">'+secName+'</span> &rsaquo; <span class="wsel-em">'+terName+'</span></div>'+
      '<button type="button" class="wsel-restart" id="wr">Try again</button></div>';
    later(function(){addCls('cn','show')},400);
    later(function(){addCls('cc','show')},600);
    later(function(){addCls('wr','show')},800);
    var wr=$('wr');
    if(wr){
      wr.addEventListener('click',function(ev){state.level='core';state.coreIdx=null;state.secIdx=null;render(ev.detail===0)});
      if(kb)wr.focus({preventScroll:true});
    }
  },500);
}
render(false);
})();

/* ---------- inline newsletter ---------- */
(function(){
  var form=$('nlForm');if(!form)return;
  var nameIn=$('nlName'),emailIn=$('nlEmail'),hpIn=$('nlWebsite'),btn=$('nlBtn');
  var errEl=$('nlError'),okEl=$('nlSuccess'),note=$('nlNote'),busy=false;
  function showErr(msg){errEl.textContent=msg;emailIn.setAttribute('aria-invalid','true')}
  function clearErr(){errEl.textContent='';emailIn.removeAttribute('aria-invalid')}
  emailIn.addEventListener('input',function(){if(errEl.textContent)clearErr()});
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(busy)return;
    var email=emailIn.value.trim(),name=nameIn.value.trim();
    if(!EMAIL_RE.test(email)){showErr(MSG.invalid_email);emailIn.focus();return}
    clearErr();busy=true;btn.disabled=true;btn.textContent='Joining...';
    var data={email:email,source:'inline',website:hpIn?hpIn.value:'',t:Date.now()-T0};
    if(name)data.name=name;
    subscribe(data).then(function(j){
      busy=false;
      if(j.ok){
        nlMark();
        form.hidden=true;if(note)note.hidden=true;
        okEl.textContent=j.status==='already'?OK_ALREADY:OK_NEW;
        okEl.focus({preventScroll:true});
      } else {
        btn.disabled=false;btn.textContent='Keep Me Updated';
        showErr(errText(j.error));
      }
    });
  });
})();

/* ---------- signup card ----------
   Opens at most once per visitor, and only after real engagement:
   the visitor scrolled past 60% of the page, or finished a full cycle on the breath pacer.
   It never opens while the first screen (the hero) is on screen, while the pacer is running,
   while the inline form is in view or in use, or while the mobile menu is open.
   It is not modal: it sits in the corner, takes no focus, and Esc, Close or "No thanks" dismiss it.
   It posts to /api/subscribe exactly like the old popup (source "popup"). */
var popup=(function(){
  var card=$('nlCard'),closeBtn=$('nlClose'),noBtn=$('nlNo'),announce=$('nlAnnounce');
  var form=$('nlPopup'),emailIn=$('nlPopupEmail'),hpIn=$('nlPopupWebsite'),btn=$('nlPopupBtn');
  var errEl=$('nlPopupErr'),formWrap=$('nlPopupForm'),okEl=$('nlPopupOk'),okMsg=$('nlPopupOkMsg'),okTitle=$('nlPopupOkTitle');
  var none={isOpen:function(){return false},close:function(){}};
  if(!card||!form)return none;
  var SEEN='ga-nl-seen';
  var open=false,busy=false,engaged=false,heroOut=false,notesIn=false;
  var armed=!nlRecent()&&!lsGet(SEEN);
  function inlineActive(){var f=$('nlForm');return f&&f.contains(document.activeElement)}
  function pacerBusy(){return window.groundPacer&&window.groundPacer.isRunning()}
  function maybe(){
    if(armed&&engaged&&heroOut&&!open&&!notesIn&&!menuOpen()&&!inlineActive()&&!pacerBusy()&&!nlRecent())show();
  }
  function onScroll(){
    var max=document.documentElement.scrollHeight-window.innerHeight;
    if(max>0&&window.scrollY/max>=0.6){engaged=true;maybe()}
  }
  if(armed){
    window.addEventListener('scroll',onScroll,{passive:true});
    document.addEventListener('pacer:cycle',function(){engaged=true});
    document.addEventListener('pacer:stop',function(e){if(e.detail&&e.detail.cycles>=1){engaged=true;maybe()}});
    watch(heroEl,function(v,e){heroOut=!v&&!!e&&e.boundingClientRect.top<0;maybe()});
    watch($('notes'),function(v){notesIn=v});
  }
  function show(){
    armed=false;open=true;lsSet(SEEN,String(Date.now()));
    window.removeEventListener('scroll',onScroll);
    card.hidden=false;card.classList.add('in');
    document.body.classList.add('nl-open');
    if(announce)announce.textContent='A sign-up for breathwork notes from Collin opened at the bottom of the screen.';
  }
  function close(){
    if(!open)return;
    var hadFocus=card.contains(document.activeElement);
    open=false;card.hidden=true;card.classList.remove('in');
    document.body.classList.remove('nl-open');
    if(announce)announce.textContent='';
    if(hadFocus){var m=$('main');if(m){m.setAttribute('tabindex','-1');m.focus({preventScroll:true})}}
  }
  closeBtn.addEventListener('click',close);
  if(noBtn)noBtn.addEventListener('click',close);
  emailIn.addEventListener('input',function(){if(errEl.textContent){errEl.textContent='';emailIn.removeAttribute('aria-invalid')}});
  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(busy)return;
    var email=emailIn.value.trim();
    if(!EMAIL_RE.test(email)){errEl.textContent=MSG.invalid_email;emailIn.setAttribute('aria-invalid','true');emailIn.focus();return}
    errEl.textContent='';emailIn.removeAttribute('aria-invalid');
    busy=true;btn.disabled=true;btn.textContent='Subscribing...';
    subscribe({email:email,source:'popup',website:hpIn?hpIn.value:'',t:Date.now()-T0}).then(function(j){
      busy=false;
      if(j.ok){
        nlMark();
        okMsg.textContent=j.status==='already'?OK_ALREADY:OK_NEW;
        formWrap.hidden=true;okEl.hidden=false;
        okTitle.focus({preventScroll:true});
      } else {
        btn.disabled=false;btn.textContent='Subscribe';
        errEl.textContent=errText(j.error);emailIn.setAttribute('aria-invalid','true');
      }
    });
  });
  return {isOpen:function(){return open},close:close};
})();

/* ---------- Esc closes the signup card first, then the mobile menu ---------- */
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape'&&e.key!=='Esc')return;
  if(popup.isOpen()){e.preventDefault();popup.close();return}
  if(menuOpen()){e.preventDefault();setMenu(false,true)}
});
/* keep Tab inside the open mobile menu */
document.addEventListener('keydown',function(e){
  if(e.key!=='Tab'||!menuOpen())return;
  var f=[hb].concat(Array.prototype.slice.call(mm.querySelectorAll('a')));
  var i=f.indexOf(document.activeElement);
  if(e.shiftKey&&(i<=0)){e.preventDefault();f[f.length-1].focus()}
  else if(!e.shiftKey&&(i===-1||i===f.length-1)){e.preventDefault();f[0].focus()}
});

})();
