'use strict';
(()=>{
 const ENDPOINT='https://script.google.com/macros/s/AKfycbzrS0a36moq0fvsVzztyak14Ly1IwpZFNYeIglAW3fMzGLY5mS9q_IkMVvRxhqiHs6XnA/exec';
 const demo=new URLSearchParams(location.search).get('demo')==='1';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const FIELDS=[
  ['성별','성별을 선택해 주세요.','choice','현재 여성 신청은 마감됐어요.'],
  ['이름','이름을 알려주세요.','text','자리 배치와 신원 확인에만 사용해요.','홍길동'],
  ['출생연도','몇 년생이세요?','number','출생연도 기준 19세 이상부터 신청할 수 있어요.','예: 1998'],
  ['자기소개','간단히 소개해 주세요.','textarea','하시는 일, 성격, 이상형 등 편하게 적어주세요.','예: IT 회사에서 일하고, 산책과 대화를 좋아해요.'],
  ['연락처','어디로 안내드릴까요?','text','파티 안내를 받을 휴대폰 번호 또는 이메일을 알려주세요.','01012345678 또는 hello@example.com'],
  ['개인정보동의','신청을 위한 동의를<br>확인해 주세요.','consent','파티 신청 확인과 안내에 필요한 정보만 받아요.'],
  ['확인','신청 내용을 확인해 주세요.','review','신청 내용을 검토한 뒤 남겨주신 연락처로 안내드릴게요.']
 ];
 const KEY='chinchinso-party-'+PARTY_EVENT.id+(demo?'-demo':'');
 let answers={},cursor=0,busy=false,returnToReview=false,id=crypto.randomUUID(),completed=false;
 let view=new URLSearchParams(location.search).get('view')==='apply'?'form':'posters';
 let closedGenders=[...PARTY_EVENT.closedGenders],capabilities=null;
 try{const d=JSON.parse(sessionStorage.getItem(KEY));if(d){answers=d.answers||{};cursor=Math.max(0,Math.min(FIELDS.length-1,Number(d.cursor)||0));id=d.id||id;completed=!!d.completed;}}catch{}
 function persist(){try{sessionStorage.setItem(KEY,JSON.stringify({answers,cursor,id,completed}));}catch{}}
 function error(message){if($('error'))$('error').textContent=message;}
 function fieldError(key){const v=String(answers[key]||'').trim();if(key==='확인')return '';if(key==='개인정보동의')return answers[key]?'':'개인정보 수집·이용 동의가 필요해요.';if(!v)return '이 항목을 입력하거나 선택해주세요.';
  if(key==='성별'&&(!['남성','여성'].includes(v)||closedGenders.includes(v)))return '여성 신청은 마감됐어요. 다음 파티 소식을 확인해주세요.';
  if(key==='출생연도'&&(!/^\d{4}$/.test(v)||+v<1900||+v>new Date().getFullYear()-19))return '출생연도 4자리를 확인해주세요. 출생연도 기준 19세 이상만 신청할 수 있어요.';
  if(key==='연락처'&&!/^01[016789]\d{7,8}$/.test(v.replace(/[-\s]/g,''))&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))return '휴대폰 번호 또는 이메일 주소를 확인해주세요.';return '';
 }
 function go(index){if(busy)return;cursor=Math.max(0,Math.min(FIELDS.length-1,index));persist();render();window.scrollTo(0,0);$('questionTitle')?.focus({preventScroll:true});}
 function advance(){if(busy)return;const key=FIELDS[cursor][0],message=fieldError(key);if(message){error(message);document.querySelector('[data-key="'+key+'"]')?.setAttribute('aria-invalid','true');return;}if(key==='확인'){submit();return;}if(returnToReview){returnToReview=false;go(FIELDS.length-1);}else go(cursor+1);}
 function navigate(next){if(busy)return;view=next;const url=new URL(location.href);if(next==='form')url.searchParams.set('view','apply');else url.searchParams.delete('view');history.pushState({},'',url);render();window.scrollTo(0,0);if(next==='form'&&!demo)warmCapabilities();}
 function render(){
  document.querySelectorAll('[data-home]').forEach(a=>a.href='index.html'+(demo?'?demo=1':''));
  document.body.classList.toggle('wizard-mode',view==='form'&&!completed);
  document.body.classList.toggle('party-poster-mode',view==='posters');
  $('headerNote').textContent=PARTY_EVENT.title;
  if(demo)$('headerNote').textContent='체험 모드 · 실제로 접수되지 않아요';
  if(view==='posters'){
   $('screen').innerHTML='<a data-home class="party-back" href="index.html'+(demo?'?demo=1':'')+'">‹ 처음으로</a><h1 class="sr-only">'+esc(PARTY_EVENT.title)+' · 여성 모집 마감</h1><div class="party-posters">'+PARTY_EVENT.posters.map((p,i)=>'<img class="party-poster" src="'+esc(p.src)+'" alt="'+esc(p.alt)+'" '+(i?'loading="lazy"':'fetchpriority="high"')+'>').join('')+'</div>';
   $('nav').innerHTML='<button type="button" class="primary" id="startParty">신청하기</button>';$('startParty').onclick=()=>navigate('form');return;
  }
  if(completed){
   $('screen').innerHTML='<section class="result"><span class="result-mark" aria-hidden="true">✓</span><p class="eyebrow">'+esc(PARTY_EVENT.title)+'</p><h1>'+(demo?'신청 체험을 마쳤어요.':'파티 신청이 접수됐어요.')+'</h1><p>'+(demo?'실제 신청은 전송되지 않았어요.':'신청 내용을 확인한 뒤 남겨주신 연락처로 안내드릴게요.<br>접수만으로 참여가 확정되지는 않아요.')+'</p><p class="receipt">접수번호 '+esc(id)+'</p></section>';
   $('nav').innerHTML='<button type="button" class="primary" id="backPosters">파티 포스터 보기</button>';$('backPosters').onclick=()=>navigate('posters');return;
  }
  const [key,title,type,description,placeholder]=FIELDS[cursor];let content='';
  if(type==='choice')content='<fieldset class="field" data-field="성별"><legend class="sr-only">성별</legend><div class="choices">'+['남성','여성'].map(v=>'<label class="choice"><input type="radio" name="성별" data-key="성별" value="'+v+'" '+(answers.성별===v?'checked':'')+' '+(closedGenders.includes(v)?'disabled':'')+'><span>'+v+(closedGenders.includes(v)?'<small class="closed-badge">마감</small>':'')+'</span></label>').join('')+'</div></fieldset>';
  else if(type==='consent')content='<div class="notice"><strong>파티 신청과 안내에만 사용할게요.</strong><p>이름은 자리 배치와 신원 확인에, 연락처는 파티 안내에 사용해요.</p><p>파티 신청 정보는 풀 등록에 사용하지 않아요.</p></div><div class="field consent-group"><label class="consent-check"><input data-key="개인정보동의" type="checkbox" '+(answers.개인정보동의?'checked':'')+'><span>개인정보 수집·이용에 동의해요 <span class="required">필수</span></span></label><details><summary>수집·이용 내용 보기</summary><p>목적: 파티 참여 신청 검토, 자리 배치 및 신원 확인, 파티 정보와 승인 결과 안내</p><p>필수 항목: 성별, 이름, 출생연도, 자기소개, 연락처</p><p>처리자: 찐친소 · 보유기간: 1년<br>문의: zzinchinso.official@gmail.com</p><p>동의를 거부할 수 있으며, 동의하지 않으면 신청할 수 없어요.</p></details></div>';
  else if(type==='review')content='<section class="review-group"><h2>'+esc(PARTY_EVENT.title)+'</h2><dl class="summary">'+FIELDS.filter(f=>!['review','consent'].includes(f[2])).map(([k],i)=>'<div><dt>'+esc(k==='자기소개'?'간단한 자기소개':k)+'</dt><dd>'+esc(answers[k])+'</dd><button type="button" data-edit="'+i+'" aria-label="'+esc(k)+' 수정">수정</button></div>').join('')+'</dl></section>';
  else content='<div class="field" data-field="'+key+'"><label for="partyField">'+esc(key)+'</label>'+(type==='textarea'?'<textarea id="partyField" data-key="'+key+'" rows="4" maxlength="2000" placeholder="'+esc(placeholder)+'">'+esc(answers[key]||'')+'</textarea>':'<div class="input-wrap"><input id="partyField" data-key="'+key+'" type="'+type+'" '+(key==='출생연도'?'inputmode="numeric" min="1900" max="'+(new Date().getFullYear()-19)+'" step="1"':key==='이름'?'autocomplete="name" maxlength="100"':'maxlength="200"')+' placeholder="'+esc(placeholder)+'" value="'+esc(answers[key]||'')+'"></div>')+'</div>';
  $('screen').innerHTML='<div class="party-form-progress" role="progressbar" aria-label="파티 신청 진행" aria-valuemin="1" aria-valuemax="7" aria-valuenow="'+(cursor+1)+'"><span style="width:'+((cursor+1)/7*100)+'%"></span></div><div class="wizard-toolbar"><button type="button" class="back-button" id="previous"><span aria-hidden="true">‹</span> 이전</button><span class="question-count">'+(cursor+1)+' / '+FIELDS.length+'</span></div><form id="partyForm" class="wizard '+(type==='review'?'review-step':'')+'" novalidate><div class="question-heading"><p class="eyebrow">'+esc(PARTY_EVENT.title)+'</p><h1 id="questionTitle" tabindex="-1">'+title+'</h1><p class="question-description">'+description+'</p></div><div class="question-content">'+content+'</div><p id="error" class="error" role="alert"></p></form>';
  $('nav').innerHTML='<div class="wizard-actions"><button type="submit" form="partyForm" class="primary" id="next">'+(busy?'접수 중…':type==='review'?'신청하기':returnToReview?'수정 완료':'다음')+'</button></div>';
  $('partyForm').onsubmit=e=>{e.preventDefault();advance();};
  $('previous').onclick=()=>{if(busy)return;if(returnToReview){returnToReview=false;go(FIELDS.length-1);}else if(cursor===0)navigate('posters');else go(cursor-1);};
  document.querySelectorAll('[data-key]').forEach(el=>{el.addEventListener(el.type==='checkbox'||el.type==='radio'?'change':'input',()=>{if(busy)return;answers[el.dataset.key]=el.type==='checkbox'?el.checked:el.value;persist();error('');el.removeAttribute('aria-invalid');if(el.type==='radio')advance();});if(el.tagName==='INPUT'&&!['checkbox','radio'].includes(el.type))el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();advance();}});});
  document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>{returnToReview=true;go(Number(el.dataset.edit));});
  if(busy)document.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);
 }
 async function request(payload){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);try{const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal});if(!response.ok)throw Error('신청 서버에 연결하지 못했어요. 다시 시도해주세요.');const result=await response.json();if(result.schemaVersion!==2||!result.ok)throw Error(result.error||'접수 확인을 받지 못했어요. 다시 시도해주세요.');return result;}finally{clearTimeout(timer);}}
 async function warmCapabilities(){try{capabilities=await request({_action:'capabilities'});const state=capabilities.partyEvents?.[PARTY_EVENT.id];if(state){closedGenders=state.closedGenders||[];if(view==='form'&&cursor===0&&!busy)render();}}catch{capabilities=null;}}
 async function submit(){
  if(busy)return;const first=FIELDS.findIndex(([k])=>fieldError(k));if(first>=0){returnToReview=true;go(first);error(fieldError(FIELDS[first][0]));return;}
  busy=true;render();error('신청 내용을 저장하고 있어요.');
  try{if(!demo){const c=capabilities||await request({_action:'capabilities'});if(!c.partyApplications)throw Error('파티 신청 서버가 아직 연결되지 않았어요. 입력한 내용은 그대로 두었으니 운영자에게 문의해주세요.');const result=await request({...answers,_action:'partySubmit',행사ID:PARTY_EVENT.id,신청ID:id,개인정보동의일시:new Date().toISOString()});if(result.id!==id)throw Error('접수 확인을 받지 못했어요. 다시 시도해주세요.');}
   completed=true;persist();busy=false;render();window.scrollTo(0,0);
  }catch(e){busy=false;render();error(e.name==='AbortError'?'저장 확인이 지연되고 있어요. 입력 내용은 그대로 두었으니 다시 시도해주세요.':e instanceof TypeError?'연결하지 못했어요. 입력한 내용은 그대로 두었으니 다시 시도해주세요.':e.message);$('next').textContent='다시 신청하기';}
 }
 window.addEventListener('popstate',()=>{if(busy)return;view=new URLSearchParams(location.search).get('view')==='apply'?'form':'posters';render();});
 render();if(view==='form'&&!demo)warmCapabilities();
})();
