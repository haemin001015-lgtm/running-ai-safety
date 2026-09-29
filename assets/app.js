(function(){
'use strict';
var VER='2.0.0', LS='nightwatch:v2';
var DEFAULT_URL='https://script.google.com/macros/s/AKfycbxB65kvWJOGMGFAnvXkb-L3Gc_ODYRAuGJ13b4OAHuc5GrYLpTB_wcKN7DZqOG2vO7dpQ/exec';

/* ───────── 방범코스 (매주 월·수 19:30–21:00) ───────── */
var COURSES=[
 {id:'1', nm:'방범코스 1', km:2.4,
  sub:'학운공원 → 평촌 엘프라우드A → 비산중 → 종합운동장',
  pts:[[37.399137,126.948503],[37.406414,126.943092],[37.409395,126.948254],[37.405484,126.946974]],
  marks:['학운공원','엘프라우드A','비산중','종합운동장']},
 {id:'2', nm:'방범코스 2', km:2.8,
  sub:'관양119안전센터 → 관악초 → 관악고 → 현대A → 종합운동장',
  pts:[[37.406657,126.971596],[37.407739,126.967922],[37.405721,126.957919],[37.405484,126.946974]],
  marks:['관양119안전센터','관악초','현대A','종합운동장']},
 {id:'3', nm:'방범코스 3', km:3.6,
  sub:'관양119안전센터 → 관악초 → 동편마을 → 현대A → 종합운동장 · 트랙 러닝 3km',
  pts:[[37.406657,126.971596],[37.407739,126.967922],[37.409104,126.971304],[37.405721,126.957919],[37.405484,126.946974]],
  marks:['관양119안전센터','관악초','동편마을','현대A','종합운동장']},
 {id:'etc', nm:'기타', km:0,
  sub:'정해진 코스 밖에서 발견한 위험도 기록할 수 있습니다',
  pts:[], marks:[]}
];
function courseOf(id){ for(var i=0;i<COURSES.length;i++) if(COURSES[i].id===id) return COURSES[i]; return COURSES[0]; }

/* ───────── 위험 유형 ───────── */
var TYPES=[
 {t:'소등',        area:'빛',     ic:'💡', w:3, ask:'해당 보안등의 점등 상태를 점검하고 필요한 수리를 요청드립니다.', kw:['꺼','안 켜','안켜','소등','나감','깜빡','불이 안','점등']},
 {t:'조도 부족',   area:'빛',     ic:'🌑', w:2, ask:'해당 구간의 조도를 측정하고 광원 교체를 검토해 주시기 바랍니다.', kw:['어둡','어두','캄캄','침침','희미','밝지','안 보','안보']},
 {t:'수목 가림',   area:'빛',     ic:'🌳', w:2, ask:'보안등 주변 나뭇가지 정비를 요청드립니다.', kw:['나무','나뭇','가지','수풀','가리','가려']},
 {t:'노면표시 마모',area:'건널목', ic:'🛑', w:2, ask:'횡단보도 노면표시 재도색을 요청드립니다.', kw:['도색','노면','지워','흐릿','선이 안','횡단보도 선']},
 {t:'보행신호 고장',area:'건널목', ic:'🚦', w:3, ask:'보행신호기 작동 상태 점검을 요청드립니다.', kw:['신호등','신호기','점멸','안 바뀌','신호 고장','버튼이']},
 {t:'시야 가림',   area:'건널목', ic:'🚗', w:2, ask:'횡단보도 주변 불법주정차 단속을 요청드립니다.', kw:['불법주차','주정차','주차','시야','가로막','막고 있']},
 {t:'보도 파손',   area:'보행로', ic:'🧱', w:3, ask:'보도블록 보수 및 단차 정비를 요청드립니다.', kw:['보도블록','블록','들뜨','들떠','단차','턱','파손','깨','부서','움푹','패']},
 {t:'적치물',      area:'보행로', ic:'📦', w:2, ask:'보도 적치물 정비를 요청드립니다.', kw:['적치','쌓여','내놓','짐이','자전거가','킥보드','막혀']},
 {t:'미끄럼 위험', area:'보행로', ic:'💧', w:2, ask:'물고임 해소 및 미끄럼 방지 조치를 요청드립니다.', kw:['물고임','물이 고','미끄','빗물','낙엽','결빙','얼어','빙판']},
 {t:'비상벨 고장', area:'안전시설',ic:'🔔', w:3, ask:'비상벨 작동 점검 및 수리를 요청드립니다.', kw:['비상벨','비상 벨','벨이','안심벨']},
 {t:'CCTV 사각',   area:'안전시설',ic:'📹', w:2, ask:'방범 CCTV 설치 또는 방향 조정을 검토해 주시기 바랍니다.', kw:['cctv','씨씨티비','카메라','사각지대','사각']},
 {t:'시설 파손',   area:'안전시설',ic:'🔧', w:3, ask:'파손된 시설물의 수리 및 작동 점검을 요청드립니다.', kw:['반사경','표지','훼손','망가','고장','커버','부러']},
 {t:'기타',        area:'기타',   ic:'📍', w:1, ask:'현장 확인을 요청드립니다.', kw:[]}
];
var STEPS=['발견','신고','처리','개선'];
var HOTSPOTS=(window.HOTSPOTS||[]);
function typeOf(n){ for(var i=0;i<TYPES.length;i++) if(TYPES[i].t===n) return TYPES[i]; return TYPES[TYPES.length-1]; }
function classify(m){
  var s=(m||'').toLowerCase();
  for(var i=0;i<TYPES.length;i++) for(var j=0;j<TYPES[i].kw.length;j++) if(s.indexOf(TYPES[i].kw[j])>-1) return TYPES[i];
  return TYPES[TYPES.length-1];
}

/* ───────── 상태 ───────── */
var S={ profile:null, courseId:'1', courseKm:{}, remote:{url:DEFAULT_URL, token:''},
        reports:[], team:[], patrols:[], runs:0, secs:0, km:0, run:null, lastSync:0, device:'',
        here:null, draft:{photo:null,lat:null,lon:null,acc:null}, syncing:false, retry:0 };
var $=function(id){ return document.getElementById(id); };
function esc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function uid(){ return 'r'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function dist(a1,o1,a2,o2){
  var R=6371000,t=Math.PI/180,dA=(a2-a1)*t,dO=(o2-o1)*t;
  var x=Math.sin(dA/2)*Math.sin(dA/2)+Math.cos(a1*t)*Math.cos(a2*t)*Math.sin(dO/2)*Math.sin(dO/2);
  return 2*R*Math.asin(Math.sqrt(x));
}
function kmOf(c){ var v=S.courseKm[c.id]; return (v!=null&&v!=='')? parseFloat(v) : c.km; }
function fmtDate(iso){ var d=new Date(iso); return String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0'); }
function hms(s){
  var h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60;
  return h? h+':'+String(m).padStart(2,'0')+':'+String(x).padStart(2,'0') : String(m).padStart(2,'0')+':'+String(x).padStart(2,'0');
}

/* ───────── 저장 ───────── */
function snap(){ return {v:3, profile:S.profile, courseId:S.courseId, courseKm:S.courseKm, remote:S.remote, device:S.device,
  reports:S.reports, team:S.team, patrols:S.patrols, runs:S.runs, secs:S.secs, km:S.km, run:S.run, lastSync:S.lastSync}; }
function save(){
  try{ localStorage.setItem(LS, JSON.stringify(snap())); }
  catch(e){
    var n=0; for(var i=0;i<S.reports.length&&n<5;i++) if(S.reports[i].photo){ S.reports[i].photo=null; n++; }
    try{ localStorage.setItem(LS, JSON.stringify(snap())); toast('저장 공간이 부족해 오래된 사진을 정리했습니다'); }
    catch(e2){ toast('저장 공간이 부족합니다. 기록을 내보낸 뒤 정리해 주세요'); }
  }
}
function load(){
  try{
    var o=JSON.parse(localStorage.getItem(LS)||'null'); if(!o) return false;
    S.profile=o.profile||null; S.courseId=o.courseId||'1'; S.courseKm=o.courseKm||{};
    S.remote=(o.remote&&o.remote.url)?o.remote:{url:DEFAULT_URL,token:''};
    S.device=o.device||''; S.reports=o.reports||[]; S.team=o.team||[]; S.patrols=o.patrols||[];
    S.runs=o.runs||0; S.secs=o.secs||0; S.km=o.km||0; S.run=o.run||null; S.lastSync=o.lastSync||0;
    return true;
  }catch(e){ return false; }
}

/* ───────── 팀 저장소 ───────── */
function api(action, payload){
  var url=(S.remote.url||'').trim();
  if(!url) return Promise.reject(new Error('no-url'));
  var body=JSON.stringify(Object.assign({action:action, device:S.device}, payload||{}));
  return fetch(url,{method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:body, redirect:'follow'})
    .then(function(r){ return r.text(); })
    .then(function(t){ var j; try{ j=JSON.parse(t); }catch(e){ throw new Error('bad-response'); }
      if(!j.ok) throw new Error(j.error||'server-error'); return j; });
}
function pending(){ return S.reports.filter(function(r){ return !r.synced; }); }
function pendingRuns(){ return S.patrols.filter(function(p){ return !p.synced; }); }
function toWire(r){
  return {id:r.id, at:r.at, device:S.device, name:(r.by&&r.by.name)||'', crew:(r.by&&r.by.crew)||'',
          course:r.course||'', lat:r.lat, lon:r.lon, acc:r.acc, spot:r.spot, memo:r.memo, type:r.type, st:r.st, photo:r.photo||''};
}
function fromWire(w){
  return {id:w.id, at:w.at, by:{name:w.name,crew:w.crew}, course:w.course, lat:+w.lat, lon:+w.lon, acc:+w.acc||null,
          spot:w.spot, memo:w.memo, type:w.type, st:+w.st||0, photo:'', synced:true};
}
function syncNow(manual){
  if(S.syncing) return Promise.resolve();
  if(!(S.remote.url||'').trim()){ setSync('off','이 기기에만 저장됨'); return Promise.resolve(); }
  if(!navigator.onLine){ setSync('warn', (pending().length? pending().length+'건 전송 대기 · ':'')+'오프라인'); return Promise.resolve(); }
  S.syncing=true; setSync('ok','동기화 중…');
  var runs=pendingRuns();
  return api('push',{reports:pending().map(toWire), patrols:runs.map(function(p){
      return {id:p.id, at:p.at, device:S.device, name:(S.profile&&S.profile.name)||'', crew:(S.profile&&S.profile.crew)||'',
              course:p.course, mins:Math.round(p.secs/60), km:p.km};
    })})
    .then(function(){
      S.reports.forEach(function(r){ r.synced=true; });
      S.patrols.forEach(function(p){ p.synced=true; });
      return api('pull',{});
    })
    .then(function(j){
      S.team=(j.reports||[]).map(fromWire);
      S.team.forEach(function(t){
        var mine=S.reports.filter(function(r){ return r.id===t.id; })[0];
        if(mine && t.st>mine.st) mine.st=t.st;
      });
      S.lastSync=Date.now(); S.syncing=false; S.retry=0; save();
      if(window.__nw && window.__nw.render) window.__nw.render();
      setSync('ok','동기화됨 · '+new Date(S.lastSync).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}));
      if(manual) toast('팀 저장소와 동기화했습니다');
    })
    .catch(function(e){
      S.syncing=false;
      setSync(e.message==='no-url'?'off':'warn',
        e.message==='no-url'?'이 기기에만 저장됨':(pending().length? pending().length+'건 전송 대기 · 곧 다시 시도':'연결 확인 중…'));
      if(manual) toast('동기화하지 못했습니다. 잠시 후 다시 시도합니다');
      if(!manual && e.message!=='no-url' && navigator.onLine && S.retry<3){ S.retry++; setTimeout(function(){ syncNow(); }, 4000*S.retry); }
    });
}
function setSync(kind,text){ $('syncBar').className='syncbar '+kind; $('syncTx').textContent=text; }

/* ───────── 제보 묶기 · 위험 점수 ───────── */
function allReports(){
  var seen={}, out=[];
  S.reports.concat(S.team).forEach(function(r){ if(!seen[r.id]){ seen[r.id]=1; out.push(r); } });
  return out;
}
function cluster(){
  var cs=[];
  allReports().forEach(function(r){
    if(r.lat==null||isNaN(r.lat)) return;
    for(var i=0;i<cs.length;i++) if(dist(cs[i].lat,cs[i].lon,r.lat,r.lon)<=35){ cs[i].items.push(r); return; }
    cs.push({lat:r.lat, lon:r.lon, spot:r.spot, items:[r]});
  });
  cs.forEach(function(c){
    var best=typeOf(c.items[0].type);
    c.items.forEach(function(r){ var t=typeOf(r.type); if(t.w>best.w) best=t; });
    c.type=best;
    c.st=Math.min.apply(null,c.items.map(function(r){ return r.st; }));
    c.near=null; c.nearD=1e9;
    HOTSPOTS.forEach(function(h){ var d=dist(c.lat,c.lon,h.lat,h.lon); if(d<c.nearD){ c.nearD=d; c.near=h; } });
    c.acc=c.nearD<=100;
    c.score=c.items.length*2+c.type.w+(c.acc?5:0);
  });
  cs.sort(function(a,b){ return b.score-a.score; });
  return cs;
}
function docText(c){
  var obs=c.items.map(function(r){ return '             · "'+r.memo+'" ('+fmtDate(r.at)+')'; }).join('\n');
  return '[안양시 야간 보행안전 시설 개선 요청]\n\n'
    +'○ 위    치 : '+c.spot+'\n             위도 '+c.lat.toFixed(6)+', 경도 '+c.lon.toFixed(6)+'\n'
    +'○ 위험 유형 : '+c.type.t+'\n'
    +'○ 관측 이력 : 총 '+c.items.length+'회 반복 관측\n'+obs+'\n'
    +'○ 인근 사고 이력 : '+(c.acc
        ? '교통사고 다발지역\n             \''+c.near.nm+'\'에서 '+Math.round(c.nearD)+'m 거리\n             '+c.near.year+'년 지정 · 사고 '+c.near.cnt+'건, 중상 '+c.near.inj+'명'
        : '반경 100m 내 지정 다발지역 없음')+'\n'
    +'○ 요청 사항 : '+c.type.ask+'\n'
    +'○ 데이터 근거 : 공공데이터포털\n             15105289, 15017320\n\n'
    +'청년러닝방범대 야간 정기순찰 중 확인'
    +(S.profile? '\n기록: '+S.profile.name+' ('+S.profile.crew+')':'');
}
window.__nw={S:S,TYPES:TYPES,COURSES:COURSES,STEPS:STEPS,HOTSPOTS:HOTSPOTS,VER:VER,
  cluster:cluster,classify:classify,docText:docText,api:api,syncNow:syncNow,save:save,load:load,
  typeOf:typeOf,courseOf:courseOf,kmOf:kmOf,uid:uid,dist:dist,esc:esc,fmtDate:fmtDate,hms:hms,
  $:$,setSync:setSync,allReports:allReports,pending:pending};
})();

(function(){
'use strict';
var N=window.__nw, S=N.S, $=N.$, esc=N.esc, TYPES=N.TYPES, STEPS=N.STEPS, COURSES=N.COURSES, HOTSPOTS=N.HOTSPOTS;
var tmr; window.toast=function(m){ var t=$('toast'); if(!t) return; t.textContent=m; t.classList.add('on');
  clearTimeout(tmr); tmr=setTimeout(function(){ t.classList.remove('on'); },2400); };
var toast=window.toast;
function cur(){ return N.courseOf(S.courseId); }

/* ── 코스 지도 (선택 코스 + 주변 사고다발지역 + 내 위치) ── */
function nearHot(c,m){
  if(!c.pts.length) return [];
  return HOTSPOTS.filter(function(h){
    return c.pts.some(function(p){ return N.dist(p[0],p[1],h.lat,h.lon)<=(m||500); });
  });
}
function drawCourseMap(){
  var el=$('courseMap'); if(!el) return;
  var c=cur(), W=400, H=220, pad=26;
  var pts=c.pts.slice(), hots=nearHot(c,500);
  var all=pts.concat(hots.map(function(h){ return [h.lat,h.lon]; }));
  if(S.here) all.push([S.here.lat,S.here.lon]);
  if(!all.length){ el.innerHTML='<text x="200" y="110" text-anchor="middle" fill="#6A6190" font-size="13">코스를 고르면 지도가 표시됩니다</text>'; return; }
  var la=all.map(function(p){ return p[0]; }), lo=all.map(function(p){ return p[1]; });
  var la0=Math.max.apply(null,la), la1=Math.min.apply(null,la), lo0=Math.min.apply(null,lo), lo1=Math.max.apply(null,lo);
  var dla=Math.max(la0-la1,0.004), dlo=Math.max(lo1-lo0,0.004);
  la0+=dla*0.12; la1-=dla*0.12; lo0-=dlo*0.12; lo1+=dlo*0.12;
  var px=function(v){ return pad+(v-lo0)/(lo1-lo0)*(W-2*pad); }, py=function(v){ return pad+(la0-v)/(la0-la1)*(H-2*pad); };
  var s='';
  for(var g=1;g<5;g++){ s+='<line x1="'+(g*W/5)+'" y1="0" x2="'+(g*W/5)+'" y2="'+H+'" stroke="#fff" stroke-opacity=".04"/>'; }
  hots.forEach(function(h){
    var x=px(h.lon), y=py(h.lat);
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="13" fill="#FF7B9C" fill-opacity=".14"/>'
      +'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="#FF7B9C"/>';
  });
  if(pts.length>1){
    s+='<polyline points="'+pts.map(function(p){ return px(p[1]).toFixed(1)+','+py(p[0]).toFixed(1); }).join(' ')
      +'" fill="none" stroke="#A98CFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 5"/>';
    pts.forEach(function(p,i){
      var x=px(p[1]), y=py(p[0]), last=i===pts.length-1;
      s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(i===0||last?6:4.5)+'" fill="'+(i===0?'#5FD3AC':last?'#FFC97A':'#A98CFF')+'" stroke="#120E24" stroke-width="1.5"/>';
      var nm=(c.marks&&c.marks[i])||'';
      if(nm) s+='<text x="'+x.toFixed(1)+'" y="'+(y-10).toFixed(1)+'" text-anchor="middle" fill="#C7BFE8" font-size="9" font-weight="700">'+esc(nm)+'</text>';
    });
  }
  if(S.here){
    var hx=px(S.here.lon), hy=py(S.here.lat);
    s+='<circle cx="'+hx.toFixed(1)+'" cy="'+hy.toFixed(1)+'" r="11" fill="#5FD3AC" fill-opacity=".2"/>'
      +'<circle cx="'+hx.toFixed(1)+'" cy="'+hy.toFixed(1)+'" r="5" fill="#5FD3AC" stroke="#0B0818" stroke-width="1.5"/>';
  }
  el.innerHTML=s;
}
function renderCourse(){
  var c=cur();
  $('courseChips').innerHTML=COURSES.map(function(x){
    return '<button type="button" data-c="'+x.id+'"'+(x.id===S.courseId?' class="sel"':'')+'>'+esc(x.nm)+'</button>';
  }).join('');
  Array.prototype.forEach.call($('courseChips').querySelectorAll('button'),function(b){
    b.addEventListener('click',function(){ S.courseId=b.getAttribute('data-c'); N.save(); renderCourse(); });
  });
  $('courseNm').textContent=c.nm;
  $('courseWhy').textContent=c.sub||'';
  var hots=nearHot(c,500);
  $('csDist').innerHTML=c.pts.length? N.kmOf(c).toFixed(1)+'<span style="font-size:11px">km</span>':'–';
  $('csSpots').textContent=c.pts.length? c.pts.length+'곳':'–';
  $('csRisk').textContent=c.pts.length? hots.length+'곳':'–';
  drawCourseMap();
}
function locate(cb){
  if(!navigator.geolocation){ toast('이 기기에서는 위치를 쓸 수 없습니다'); return; }
  navigator.geolocation.getCurrentPosition(function(p){
    S.here={lat:p.coords.latitude, lon:p.coords.longitude, acc:Math.round(p.coords.accuracy)};
    if(cb) cb(S.here); else { drawCourseMap(); toast('현재 위치를 표시했습니다'); }
  },function(){ toast('위치 권한을 허용해 주세요'); },{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
}
$('hereBtn').addEventListener('click',function(){ locate(); });

/* ── 위험지도 화면 ── */
function drawMap(cs){
  var el=$('map'); if(!el) return;
  var c=cur(), W=400, H=460, pad=24;
  var all=cs.map(function(x){ return [x.lat,x.lon]; }).concat(c.pts);
  HOTSPOTS.forEach(function(h){ if(!c.pts.length || nearHot(c,900).indexOf(h)>-1) all.push([h.lat,h.lon]); });
  if(!all.length){ el.innerHTML='<text x="200" y="230" text-anchor="middle" fill="#6A6190" font-size="13">제보가 쌓이면 지도가 그려집니다</text>'; return; }
  var la=all.map(function(p){ return p[0]; }), lo=all.map(function(p){ return p[1]; });
  var la0=Math.max.apply(null,la), la1=Math.min.apply(null,la), lo0=Math.min.apply(null,lo), lo1=Math.max.apply(null,lo);
  var dla=Math.max(la0-la1,0.004), dlo=Math.max(lo1-lo0,0.004);
  la0+=dla*0.1; la1-=dla*0.1; lo0-=dlo*0.1; lo1+=dlo*0.1;
  var px=function(v){ return pad+(v-lo0)/(lo1-lo0)*(W-2*pad); }, py=function(v){ return pad+(la0-v)/(la0-la1)*(H-2*pad); };
  var s='<defs><radialGradient id="gw"><stop offset="0%" stop-color="#FFD79A" stop-opacity=".45"/><stop offset="100%" stop-color="#FFD79A" stop-opacity="0"/></radialGradient></defs>';
  for(var g=1;g<6;g++){
    s+='<line x1="'+(g*W/6)+'" y1="0" x2="'+(g*W/6)+'" y2="'+H+'" stroke="#fff" stroke-opacity=".04"/>';
    s+='<line x1="0" y1="'+(g*H/6)+'" x2="'+W+'" y2="'+(g*H/6)+'" stroke="#fff" stroke-opacity=".04"/>';
  }
  if(c.pts.length>1) s+='<polyline points="'+c.pts.map(function(p){ return px(p[1]).toFixed(1)+','+py(p[0]).toFixed(1); }).join(' ')
      +'" fill="none" stroke="#A98CFF" stroke-width="2.5" stroke-opacity=".75" stroke-dasharray="7 5"/>';
  HOTSPOTS.forEach(function(h){
    var x=px(h.lon), y=py(h.lat); if(x<0||x>W||y<0||y>H) return;
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="16" fill="#FF7B9C" fill-opacity=".12"/><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="4" fill="#FF7B9C"/>'
      +'<text x="'+(x+8).toFixed(1)+'" y="'+(y-4).toFixed(1)+'" fill="#FFB8CB" font-size="8.5" font-weight="700">'+esc(h.nm)+'</text>';
  });
  cs.forEach(function(k,i){
    var x=px(k.lon), y=py(k.lat), r=6+k.items.length*1.6, done=k.st>=3;
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(r+9)+'" fill="url(#gw)" opacity="'+(done?0:.55)+'"/>'
      +'<circle class="mk" data-i="'+i+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+(done?'#5FD3AC':'#FFC97A')+'" stroke="#1B1538" stroke-width="1.5" style="cursor:pointer"/>'
      +'<text x="'+x.toFixed(1)+'" y="'+(y+3.5).toFixed(1)+'" fill="#241A08" font-size="10" font-weight="800" text-anchor="middle" pointer-events="none">'+k.items.length+'</text>';
  });
  if(S.here){ var hx=px(S.here.lon), hy=py(S.here.lat);
    if(hx>=0&&hx<=W&&hy>=0&&hy<=H) s+='<circle cx="'+hx.toFixed(1)+'" cy="'+hy.toFixed(1)+'" r="5" fill="#5FD3AC" stroke="#0B0818" stroke-width="1.5"/>'; }
  el.innerHTML=s;
  Array.prototype.forEach.call(el.querySelectorAll('.mk'),function(m){
    m.addEventListener('click',function(){ openSheet(cs[+m.getAttribute('data-i')]); });
  });
}

/* ── 전체 렌더 ── */
function render(){
  var cs=N.cluster(), mine=S.reports.slice().sort(function(a,b){ return a.at<b.at?1:-1; });
  $('crewLine').textContent=S.profile? '청년러닝방범대 · '+S.profile.crew : '청년러닝방범대';
  renderCourse();
  $('qRep').textContent=N.allReports().length;
  $('qWait').textContent=cs.filter(function(c){ return c.st<2; }).length;
  $('qFix').textContent=cs.filter(function(c){ return c.st>=3; }).length;
  $('teamScope').textContent=S.team.length? '팀 전체':'이 기기';
  $('cntMine').textContent=mine.length+'건';
  $('listMine').innerHTML= mine.length? mine.map(function(r){
      var t=N.typeOf(r.type);
      return '<button class="item" data-r="'+r.id+'"><div class="ic" style="background:var(--n1)">'+t.ic+'</div>'
        +'<div class="bd"><div class="t">'+esc(r.spot||'위치 미지정')+'</div><div class="s">'+esc(r.memo)+'</div></div>'
        +(r.synced?'':'<span class="pill q">대기</span>')+'<span class="pill p'+r.st+'">'+STEPS[r.st]+'</span></button>';
    }).join('') : '<div class="empty">아직 제보가 없습니다.<br>순찰하며 발견한 것을 남겨보세요.</div>';
  Array.prototype.forEach.call($('listMine').querySelectorAll('.item'),function(el){
    el.addEventListener('click',function(){
      var id=el.getAttribute('data-r');
      for(var i=0;i<cs.length;i++) for(var j=0;j<cs[i].items.length;j++) if(cs[i].items[j].id===id) return openSheet(cs[i]);
    });
  });
  drawMap(cs);
  $('cntMap').textContent=cs.length+'개 지점';
  $('listRank').innerHTML= cs.length? cs.map(function(c,i){
      return '<button class="item" data-i="'+i+'"><div class="ic" style="background:'+(c.acc?'var(--alertSoft)':'var(--n1)')+'">'+c.type.ic+'</div>'
        +'<div class="bd"><div class="t">'+esc(c.spot||'지점')+'</div><div class="s">'+esc(c.type.t)+' · 제보 '+c.items.length+'건'
        +(c.acc?' · 사고다발 '+Math.round(c.nearD)+'m':'')+'</div></div><span class="pill p'+c.st+'">'+STEPS[c.st]+'</span></button>';
    }).join('') : '<div class="empty">제보가 쌓이면 위험 순위가 만들어집니다.</div>';
  Array.prototype.forEach.call($('listRank').querySelectorAll('.item'),function(el){
    el.addEventListener('click',function(){ openSheet(cs[+el.getAttribute('data-i')]); });
  });
  $('volH').textContent=Math.floor(S.secs/3600)+'시간 '+Math.floor(S.secs%3600/60)+'분';
  $('mRuns').textContent=S.runs; $('mKm').textContent=S.km.toFixed(1); $('mRep').textContent=S.reports.length;
  $('mFix').textContent=cs.filter(function(c){ return c.st>=3 && c.items.some(function(r){ return S.reports.some(function(x){ return x.id===r.id; }); }); }).length;
  $('meNm').textContent=S.profile? S.profile.name:'대원';
  $('meRl').textContent=S.profile? '청년러닝방범대 · '+S.profile.crew:'청년러닝방범대';
  $('meLamp').textContent=cs.filter(function(c){ return c.st>=3; }).length+'곳이 개선됐습니다';
}
N.render=render;

/* ── 상세 시트 ── */
function openSheet(c){
  var steps=STEPS.map(function(s,i){ return '<div class="st'+(i<=c.st?' done':'')+'"><div class="bar"></div><div class="lb">'+s+'</div></div>'; }).join('');
  var next=c.st<3? '<button id="adv">'+STEPS[c.st+1]+' 단계로</button>':'<button class="gh" style="cursor:default">✓ 개선 확인 완료</button>';
  var txt=N.docText(c);
  $('sheet').innerHTML='<div class="grab"></div><h3>'+esc(c.spot||'제보 지점')+'</h3>'
    +'<p class="sub">'+c.lat.toFixed(6)+', '+c.lon.toFixed(6)+'</p><div class="steps">'+steps+'</div>'
    +'<div class="kv"><span class="k">유형</span><span class="v">'+c.type.ic+' '+c.type.t+' <span style="color:var(--fnt)">· '+c.type.area+'</span></span></div>'
    +'<div class="kv"><span class="k">반복 제보</span><span class="v">'+c.items.length+'건</span></div>'
    +'<div class="kv"><span class="k">기록한 대원</span><span class="v">'+esc(c.items.map(function(r){ return (r.by&&r.by.name)||'대원'; }).filter(function(v,i,a){ return a.indexOf(v)===i; }).join(', '))+'</span></div>'
    +'<div class="kv"><span class="k">사고이력</span><span class="v" style="color:'+(c.acc?'var(--alert)':'var(--fnt)')+'">'
      +(c.acc? esc(c.near.nm)+' '+Math.round(c.nearD)+'m · '+c.near.year+'년 사고 '+c.near.cnt+'건':'인근 없음')+'</span></div>'
    +'<div class="kv" style="border:none"><span class="k">위험 지표</span><span class="v" style="color:var(--pri);font-weight:800">'+c.score+'점</span></div>'
    +'<div class="sect-t" style="margin:14px 0 0">AI가 만든 민원 문안</div><pre class="doc">'+esc(txt)+'</pre>'
    +'<div class="sheetbtns"><button class="gh" id="cp">문안 복사</button><button class="gh" id="sh">공유</button>'
    +'<button class="gh" id="go119">안전신문고 열기</button>'+next+'</div>';
  $('sheet').classList.add('on'); $('mask').classList.add('on');
  $('cp').addEventListener('click',function(){
    (navigator.clipboard? navigator.clipboard.writeText(txt):Promise.reject()).then(function(){ toast('민원 문안을 복사했습니다'); })
      .catch(function(){ var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); toast('민원 문안을 복사했습니다'); }catch(e){ toast('복사에 실패했습니다'); } document.body.removeChild(ta); });
  });
  $('sh').addEventListener('click',function(){
    if(navigator.share) navigator.share({title:'야간 보행안전 시설 개선 요청', text:txt}).catch(function(){});
    else toast('이 기기에서는 공유를 쓸 수 없습니다');
  });
  $('go119').addEventListener('click',function(){ window.open('https://www.safetyreport.go.kr/#safereport/safereport','_blank','noopener'); });
  var ad=$('adv');
  if(ad) ad.addEventListener('click',function(){
    c.items.forEach(function(r){ if(r.st<3){ r.st++; var m=S.reports.filter(function(x){ return x.id===r.id; })[0]; if(m){ m.st=r.st; m.synced=false; } } });
    N.save(); closeSheet(); render(); N.syncNow();
    toast(c.st+1>=3? '개선을 확인했습니다. 고맙습니다':STEPS[Math.min(c.st+1,3)]+' 단계로 옮겼습니다');
  });
}
function closeSheet(){ $('sheet').classList.remove('on'); $('mask').classList.remove('on'); }
$('mask').addEventListener('click',closeSheet);

/* ── 탭 ── */
Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(b){
  b.addEventListener('click',function(){
    Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(x){ x.classList.remove('on'); });
    b.classList.add('on');
    var go=b.getAttribute('data-go');
    Array.prototype.forEach.call(document.querySelectorAll('.screen'),function(s){ s.classList.remove('on'); });
    $('sc-'+go).classList.add('on'); $('screens').scrollTop=0;
    if(go==='add' && S.draft.lat==null) grabGps();
  });
});

/* ── 제보 ── */
function renderChips(){
  $('chips').innerHTML=TYPES.map(function(t){ return '<button type="button" data-t="'+t.t+'">'+t.ic+' '+t.t+'</button>'; }).join('');
  Array.prototype.forEach.call($('chips').querySelectorAll('button'),function(b){
    b.addEventListener('click',function(){
      var was=b.classList.contains('sel');
      Array.prototype.forEach.call($('chips').querySelectorAll('button'),function(x){ x.classList.remove('sel'); });
      if(!was){ b.classList.add('sel'); S.draft.type=b.getAttribute('data-t'); } else S.draft.type=null;
      updAuto();
    });
  });
}
function updAuto(){
  var m=$('memo').value.trim(), box=$('auto');
  if(m.length<2 && !S.draft.type){ box.classList.remove('show'); return; }
  var t=S.draft.type? N.typeOf(S.draft.type):N.classify(m);
  $('autoTx').innerHTML=(S.draft.type?'선택한 유형: ':'이 메모를 ')+'<b>'+t.ic+' '+t.t+'</b>'+(S.draft.type?'':' 유형으로 분류했습니다');
  box.classList.add('show');
}
$('memo').addEventListener('input',updAuto);
function nearestSpot(lat,lon){
  var best=null, bd=1e9;
  COURSES.forEach(function(c){ (c.pts||[]).forEach(function(p,i){
    var d=N.dist(p[0],p[1],lat,lon); if(d<bd){ bd=d; best=(c.marks&&c.marks[i])||c.nm; } }); });
  return bd<=250? best : '현재 위치';
}
function grabGps(){
  $('gpsDot').className='dot2 wait'; $('gpsNm').textContent='위치 확인 중…';
  locate(function(h){
    S.draft.lat=h.lat; S.draft.lon=h.lon; S.draft.acc=h.acc;
    S.draft.spot=nearestSpot(h.lat,h.lon);
    $('gpsNm').textContent=S.draft.spot;
    $('gpsCo').textContent=h.lat.toFixed(6)+', '+h.lon.toFixed(6)+' · 오차 ±'+h.acc+'m';
    $('gpsDot').className='dot2'+(h.acc>50?' wait':'');
    drawCourseMap();
  });
}
$('gpsBtn').addEventListener('click',grabGps);
$('photoIn').addEventListener('change',function(){
  var f=this.files&&this.files[0]; if(!f) return;
  var img=new Image(), url=URL.createObjectURL(f);
  img.onload=function(){
    var k=Math.min(1,1280/Math.max(img.width,img.height));
    var cv=document.createElement('canvas'); cv.width=Math.round(img.width*k); cv.height=Math.round(img.height*k);
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    S.draft.photo=cv.toDataURL('image/jpeg',0.72); URL.revokeObjectURL(url);
    $('photoPrev').src=S.draft.photo; $('photoPrev').hidden=false; $('rmPhoto').hidden=false;
    $('phBody').hidden=true; $('photoBox').classList.add('has');
  };
  img.onerror=function(){ URL.revokeObjectURL(url); toast('사진을 읽지 못했습니다'); };
  img.src=url;
});
$('rmPhoto').addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); resetPhoto(); });
function resetPhoto(){
  S.draft.photo=null; $('photoIn').value='';
  $('photoPrev').hidden=true; $('photoPrev').removeAttribute('src'); $('rmPhoto').hidden=true;
  $('phBody').hidden=false; $('photoBox').classList.remove('has');
}
$('submitBtn').addEventListener('click',function(){
  var memo=$('memo').value.trim();
  if(!memo){ $('memo').focus(); toast('무엇이 문제인지 적어주세요'); return; }
  if(S.draft.lat==null){ grabGps(); toast('위치를 잡는 중입니다. 잠시 후 다시 눌러주세요'); return; }
  if(!S.profile){ $('onboard').classList.add('on'); return; }
  var t=S.draft.type? N.typeOf(S.draft.type):N.classify(memo);
  S.reports.push({id:N.uid(), at:new Date().toISOString(), by:{name:S.profile.name,crew:S.profile.crew},
    course:cur().nm, lat:S.draft.lat, lon:S.draft.lon, acc:S.draft.acc, spot:S.draft.spot||'현재 위치',
    memo:memo, type:t.t, st:0, photo:S.draft.photo||'', synced:false});
  $('memo').value=''; $('auto').classList.remove('show'); S.draft.type=null;
  Array.prototype.forEach.call($('chips').querySelectorAll('button'),function(x){ x.classList.remove('sel'); });
  resetPhoto(); N.save(); render(); N.syncNow();
  document.querySelector('.tab[data-go=home]').click();
  toast('제보가 등록되었습니다');
});

/* ── 순찰 (코스 거리로 적립) ── */
var tickInt=null;
function tickView(){ if(S.run) $('tv').textContent=N.hms(Math.floor((Date.now()-S.run.start)/1000)); }
function runUI(){
  var on=!!S.run;
  $('runBtn').textContent=on?'순찰 종료':'순찰 시작';
  $('runBtn').classList.toggle('stop',on);
  $('timerBox').style.display=on?'flex':'none';
  clearInterval(tickInt);
  if(on){ tickView(); tickInt=setInterval(tickView,1000); }
}
$('runBtn').addEventListener('click',function(){
  if(!S.run){ S.run={start:Date.now(), course:S.courseId}; N.save(); runUI(); toast('순찰을 시작했습니다. 조심히 다녀오세요'); return; }
  var el=Math.floor((Date.now()-S.run.start)/1000);
  if(el<60 && !confirm('1분도 지나지 않았습니다. 순찰을 종료할까요?')) return;
  var c=N.courseOf(S.run.course||S.courseId), km=c.pts.length? N.kmOf(c):0;
  S.secs+=el; S.runs++; S.km+=km;
  S.patrols.push({id:'p'+Date.now().toString(36), at:new Date().toISOString(), course:c.nm, secs:el, km:km, synced:false});
  S.run=null; N.save(); runUI(); render(); N.syncNow();
  toast('순찰 종료 · '+N.hms(el)+(km?' · '+km.toFixed(1)+'km 적립':''));
});

/* ── 온보딩 · 설정 ── */
$('obStart').addEventListener('click',function(){
  var n=$('obName').value.trim(), c=$('obCrew').value.trim()||'청년러닝방범대';
  if(!n){ $('obName').focus(); toast('이름을 입력해 주세요'); return; }
  if(!$('obAgree').checked){ toast('안내에 동의해 주세요'); return; }
  S.profile={name:n, crew:c}; if(!S.device) S.device='d'+Math.random().toString(36).slice(2,10);
  N.save(); $('onboard').classList.remove('on'); render(); N.syncNow(); toast('환영합니다, '+n+' 대원');
});
function openSettings(){
  $('stName').value=S.profile?S.profile.name:''; $('stCrew').value=S.profile?S.profile.crew:'';
  $('stKm1').value=S.courseKm['1']||''; $('stKm2').value=S.courseKm['2']||''; $('stKm3').value=S.courseKm['3']||'';
  if($('verLine')) $('verLine').textContent='버전 '+N.VER+(S.lastSync?' · 마지막 동기화 '+new Date(S.lastSync).toLocaleString('ko-KR'):'');
  $('settings').classList.add('on');
}
$('setBtn').addEventListener('click',openSettings);
$('stClose').addEventListener('click',function(){ $('settings').classList.remove('on'); });
$('stSave').addEventListener('click',function(){
  var n=$('stName').value.trim(); if(!n){ toast('이름을 입력해 주세요'); return; }
  S.profile={name:n, crew:$('stCrew').value.trim()||'청년러닝방범대'};
  ['1','2','3'].forEach(function(k){ var v=$('stKm'+k).value.trim(); if(v) S.courseKm[k]=v; else delete S.courseKm[k]; });
  if(!S.device) S.device='d'+Math.random().toString(36).slice(2,10);
  N.save(); $('settings').classList.remove('on'); render(); toast('설정을 저장했습니다');
});
function csv(){
  var rows=[['id','일시','대원','조','코스','위도','경도','정확도(m)','지점','유형','메모','상태','동기화']];
  N.allReports().forEach(function(r){
    rows.push([r.id,r.at,(r.by&&r.by.name)||'',(r.by&&r.by.crew)||'',r.course||'',r.lat,r.lon,r.acc||'',r.spot,r.type,
               (r.memo||'').replace(/"/g,'""'),STEPS[r.st],r.synced?'완료':'대기']);
  });
  rows.push([]); rows.push(['순찰기록','일시','코스','시간(분)','거리(km)']);
  S.patrols.forEach(function(p){ rows.push(['',p.at,p.course,Math.round(p.secs/60),p.km]); });
  return '﻿'+rows.map(function(r){ return r.map(function(v){ return '"'+String(v==null?'':v)+'"'; }).join(','); }).join('\n');
}
function download(){
  var b=new Blob([csv()],{type:'text/csv;charset=utf-8'}), u=URL.createObjectURL(b), a=document.createElement('a');
  a.href=u; a.download='순찰기록_'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(u); },1000); toast('CSV로 내보냈습니다');
}
$('expBtn').addEventListener('click',download); $('stExport').addEventListener('click',download);
$('stReset').addEventListener('click',function(){
  if(!confirm('이 기기에 저장된 제보·순찰 기록을 모두 지웁니다. 계속할까요?')) return;
  S.reports=[]; S.team=[]; S.patrols=[]; S.runs=0; S.secs=0; S.km=0; S.run=null; N.save(); render(); runUI(); toast('기록을 지웠습니다');
});
$('syncBtn').addEventListener('click',function(){ N.syncNow(true); });

/* ── 시작 ── */
N.load();
if(!S.device) S.device='d'+Math.random().toString(36).slice(2,10);
renderChips(); render(); runUI();
if(!S.profile) $('onboard').classList.add('on');
N.setSync('ok','동기화 준비됨');
N.syncNow();
locate(function(){ drawCourseMap(); });
window.addEventListener('online',function(){ N.syncNow(); });
window.addEventListener('offline',function(){ N.setSync('warn','오프라인 · 저장만 됩니다'); });
document.addEventListener('visibilitychange',function(){ if(!document.hidden){ tickView(); N.syncNow(); } });
if('serviceWorker' in navigator) window.addEventListener('load',function(){ navigator.serviceWorker.register('./sw.js').catch(function(){}); });
})();
