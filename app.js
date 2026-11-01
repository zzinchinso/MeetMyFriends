'use strict';
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzrS0a36moq0fvsVzztyak14Ly1IwpZFNYeIglAW3fMzGLY5mS9q_IkMVvRxhqiHs6XnA/exec';
const PRIVACY={operator:'찐친소',retention:'1년',contact:'zzinchinso.official@gmail.com'};
const demo=new URLSearchParams(location.search).get('demo')==='1';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Preserve the existing server's choice values; the new interface uses concise labels.
const INTRO_CHOICES=['응, 상대에게 먼저 물어봐도 돼','아니, 나한테 먼저 물어봐줘'];
const SECTIONS=[
 {id:'basics',title:'기본 정보',description:'어떤 분인지 알려주세요.',fields:[
 ['이름','이름','text','홍길동'],['성별','성별','choice',[['여성','여성'],['남성','남성']]],
 ['출생연도','출생연도','number','예: 1997'],['키','키','number','예: 165'],['생활권','주로 생활하는 지역','text','강남 거주 분당 출퇴근'],
 ['직업','회사와 하는 일','text','예: 토스에서 PM으로 일하고 있어'],['학교','출신 학교와 전공','text','서울대 통계학과'],['MBTI','MBTI','text','예: ENFP',true]]},
 {id:'lifestyle',title:'생활과 취향',description:'평소의 모습을 편하게 적어주세요.',fields:[
 ['취미','취미와 관심사','textarea','예: 러닝, 카페 가기'],
 ['음주','음주','choice',[['아예 안 마셔','전혀 안 마셔요'],['거의 안 마셔','거의 안 마셔요'],['가끔','가끔 마셔요'],['자주 마셔','자주 마셔요']]],
 ['흡연','흡연','choice',[['안 피워','비흡연'],['가끔','가끔 흡연'],['피워','흡연']]],
 ['종교','종교','choice',[['없어','없음'],['기독교','기독교'],['천주교','천주교'],['불교','불교'],['기타','기타']],true],
 ['자기소개','나의 매력과 장점','textarea','예: 잘 웃고 리액션이 좋아',true],
 ['연봉','연봉','choice',[['5천 미만','5천 미만'],['5–7천','5–7천'],['7–9천','7–9천'],['9천–1억','9천–1억'],['1억+','1억 이상']],true],
 ['자산','자산','text','예: 1.5억',true]]},
 {id:'preferences',title:'만나고 싶은 사람',description:'좋아하는 모습부터 꼭 맞았으면 하는 점까지.',fields:[
 ['이상형','어떤 사람을 만나고 싶으세요?','textarea','예: 운동을 좋아하고 대화가 잘 통하는 사람. 비흡연이면 좋겠어요.'],
 ['같은회사제외','소개를 피하고 싶은 회사·학교','textarea','예: 토스 PM 직군은 피하고 싶어'],
 ['추천인','추천인','text','이름이나 닉네임',true],['초대코드','초대 코드','text','',true]]},
 {id:'contact',title:'사진과 연락처',description:'접수 확인과 소개 안내에 필요한 정보예요.',fields:[
 ['연락처','휴대폰 번호','tel','숫자만 입력 (- 없이)'],['이메일','이메일','email','예: hello@example.com']]}
];
const FIELDS=SECTIONS.flatMap(s=>s.fields);

const CHAPTERS=['프로필','선호 조건','신청 확인'];
const CHAPTER_FIELDS=[
 [...SECTIONS[0].fields,...SECTIONS[1].fields],
 SECTIONS[2].fields.slice(0,2),
 [['사진','프로필 사진','photos'],...SECTIONS[3].fields,...SECTIONS[2].fields.slice(2),['프로필소개동의','소개 진행 방식','choice',INTRO_CHOICES.map((v,i)=>[v,i===0?'상대방의 의사를 먼저 확인해 주세요':'저에게 먼저 물어봐 주세요'])],['개인정보동의','개인정보 수집·이용','consent'],['확인','신청 내용 확인','review']]
];
const STEPS=CHAPTER_FIELDS.flatMap((fields,chapter)=>fields.map((field,position)=>({field,chapter,position,total:fields.length})));
const PROMPTS={
 이름:['이름을 알려주세요.','소개를 준비할 때 사용할 실명이에요.'],
 성별:['성별을 선택해 주세요.','소개를 준비할 때 참고할 정보예요.'],
 출생연도:['몇 년생이세요?','출생연도 기준 19세 이상부터 신청할 수 있어요.'],
 키:['키를 알려주세요.','cm 단위로 입력해 주세요.'],
 생활권:['주로 어디에서 지내세요?','거주지나 회사 근처 등 편하게 만날 수 있는 지역을 알려주세요.'],
 직업:['어떤 일을 하고 계세요?','회사 이름과 맡고 있는 일을 함께 적어주세요.'],
 학교:['학교와 전공을 알려주세요.','출신 학교와 전공을 함께 적어주세요.'],
 MBTI:['MBTI를 알고 계세요?','모르거나 남기고 싶지 않다면 건너뛰어도 돼요.'],
 취미:['쉬는 날에는 무엇을 하세요?','취미나 요즘 관심 있는 것을 편하게 적어주세요.'],
 음주:['술은 얼마나 드세요?','평소와 가장 가까운 답변을 골라주세요.'],
 흡연:['흡연 여부를 알려주세요.','평소와 가장 가까운 답변을 골라주세요.'],
 종교:['종교가 있으세요?','선택 항목이에요. 답하고 싶지 않다면 건너뛰세요.'],
 자기소개:['나의 매력을 알려주세요.','성격이나 장점 등 소개할 때 참고할 내용을 적어주세요.'],
 연봉:['연봉을 알려주실 수 있나요?','남기고 싶지 않다면 건너뛰어도 괜찮아요.'],
 자산:['자산을 알려주실 수 있나요?','남기고 싶지 않다면 건너뛰어도 괜찮아요.'],
 이상형:['어떤 사람을 만나고 싶으세요?','성격이나 분위기부터, 꼭 맞았으면 하는 조건까지 편하게 알려주세요.'],
 같은회사제외:['피하고 싶은 소속이 있나요?','같은 회사나 학교 등 소개가 부담스러운 곳을 알려주세요.'],
 사진:['사진을 3–5장 올려주세요.','얼굴이 잘 보이는 최근 사진과 평소 모습이면 좋아요.'],
 연락처:['연락받을 번호를 알려주세요.','소개가 가능하거나 추가 확인이 필요할 때 연락드려요.'],
 이메일:['안내받을 이메일을 알려주세요.','접수가 확인되었다는 안내를 보내드릴게요.'],
 추천인:['추천해 준 분이 있나요?','이름이나 닉네임을 알려주세요. 없다면 건너뛰어도 돼요.'],
 초대코드:['초대 코드가 있으세요?','전달받은 코드가 있다면 입력해 주세요.'],
 프로필소개동의:['잘 맞는 사람이 있다면,\n어떻게 진행할까요?','사진과 연락처는 별도 허락 없이 전달하지 않아요.'],
 개인정보동의:['마지막으로,\n동의를 확인해 주세요.','남겨주신 정보는 신청 검토와 소개 안내에 사용해요.'],
 확인:['신청 내용을 확인해 주세요.','바꾸고 싶은 항목은 수정할 수 있어요.']
};
let cursor=0,furthest=0,returnToSummary=false;

const DRAFT_KEY='chinchinso-form-v1'+(demo?'-demo':'');
let answers={연령대:'',유입경로:'',만족도:'',유용한점:'',추천의향:'',좋았던점:'',개선점:'',성별:'',주선자:'f',상대조건:''};
let photos=[],busy=false,receipt=null,view=new URLSearchParams(location.search).get('view')==='pool'?'form':'home',status='',editSnapshot=null,submissionId=crypto.randomUUID();
let capabilitiesRequest=null;
try{const d=JSON.parse(sessionStorage.getItem(DRAFT_KEY));if(d){Object.assign(answers,d.answers);submissionId=d.submissionId||submissionId;cursor=Math.max(0,Math.min(STEPS.length-1,(d.flowVersion===2?Number(d.cursor)||0:Math.max(0,(Number(d.cursor)||0)-((Number(d.cursor)||0)>=16?1:0)))));furthest=Math.max(cursor,Math.min(STEPS.length-1,(d.flowVersion===2?Number(d.furthest)||0:Math.max(0,(Number(d.furthest)||0)-((Number(d.furthest)||0)>=16?1:0)))));if(cursor>STEPS.findIndex(s=>s.field[0]==='사진'))cursor=STEPS.findIndex(s=>s.field[0]==='사진');}
 if(!demo){receipt=JSON.parse(sessionStorage.getItem('chinchinso-receipt'));if(receipt&&view==='form')view='loading';}
 // Carry text from an earlier conversation forward, without retaining host selection in the UI.
 if(!d&&!receipt){const legacy=JSON.parse(sessionStorage.getItem('chinchinso-sessions'+(demo?'-demo':'')));const draft=Object.values(legacy?.sessions||{}).sort((a,b)=>Object.keys(b.answers||{}).length-Object.keys(a.answers||{}).length)[0];if(draft)Object.assign(answers,draft.answers);}
}catch{}
mergePreference(answers);
function mergePreference(a){const detail=String(a.상대조건||[a.제외조건,a.중요조건].filter(Boolean).join(' / ')||'').trim();if(detail)a.이상형=[a.이상형,detail].filter(Boolean).join('\n');a.상대조건='';delete a.제외조건;delete a.중요조건;return a;}
function persist(){if(receipt)return;try{sessionStorage.setItem(DRAFT_KEY,JSON.stringify({flowVersion:2,answers,submissionId,cursor,furthest}));}catch{}}
function fieldHTML([key,label,type,placeholder,optional]){
 const id='field-'+key,selected=answers[key]||'';
 const hint=key==='같은회사제외'?'<p class="field-hint">남겨주신 소속은 피해서 소개할게요.</p>':'';
 const badge=optional?'<span class="optional">선택</span>':'';
 let control;
 if(type==='choice')control='<fieldset id="'+id+'" tabindex="-1"><legend>'+esc(label)+badge+'</legend><div class="choices">'+placeholder.map(([v,l],i)=>'<label class="choice'+(key==='프로필소개동의'?' intro-choice':'')+'"><input type="radio" name="'+key+'" data-key="'+key+'" value="'+esc(v)+'" '+(selected===v?'checked':'')+'><span>'+(key==='프로필소개동의'?'<span class="choice-copy"><strong>'+esc(l)+'</strong><small>'+esc(i===0?'제 취향과 관심사를 간단히 소개하고, 상대방에게 만날 의향을 먼저 확인해 주세요.':'상대방에게 제 이야기를 전하기 전에, 저에게 소개받을 의향을 먼저 확인해 주세요.')+'</small></span>':esc(l))+'</span></label>').join('')+'</div>'+(optional?'<button type="button" class="clear-choice" data-clear="'+key+'">선택 안 함</button>':'')+'</fieldset>';
 else control='<label for="'+id+'">'+esc(label)+badge+'</label>'+(type==='textarea'?'<textarea id="'+id+'" data-key="'+key+'" rows="3" maxlength="2000" placeholder="'+esc(placeholder)+'">'+esc(selected)+'</textarea>':'<div class="input-wrap"><input id="'+id+'" data-key="'+key+'" type="'+type+'" '+(type==='number'?'inputmode="numeric" min="'+(key==='키'?'100':'1900')+'" max="'+(key==='키'?'250':new Date().getFullYear()-19)+'" step="1"':'maxlength="200"')+' '+(key==='연락처'?'autocomplete="tel"':key==='이름'?'autocomplete="name"':key==='이메일'?'autocomplete="email"':key==='MBTI'?'autocapitalize="characters"':'')+' value="'+esc(selected)+'" placeholder="'+esc(placeholder)+'">'+(key==='키'?'<span class="unit">cm</span>':key==='출생연도'?'<span class="unit">년</span>':'')+'</div>');
 return '<div class="field" data-field="'+key+'">'+control+(key==='같은회사제외'?'<button type="button" class="clear-choice" id="noExclusions">피하고 싶은 곳 없어요</button>':'')+hint+'<p class="field-error" id="error-'+key+'"></p></div>';
}
function photoHTML(){return '<div class="field photo-field" data-field="사진"><div class="field-label">프로필 사진 <span class="optional">3–5장</span></div><p class="field-hint">얼굴이 잘 보이는 최근 사진과 평소 모습을 올려주세요.<br>사진은 별도 동의 없이 다른 사람에게 공개하지 않아요.</p><div id="photos" class="photos">'+photos.map((p,i)=>'<div class="photo"><img src="'+esc(p.data)+'" alt="선택한 사진 '+(i+1)+'"><button type="button" data-remove="'+i+'" aria-label="사진 '+(i+1)+' 삭제">×</button></div>').join('')+(photos.length<5?'<label class="photo-add" for="photoInput"><span aria-hidden="true">＋</span>사진 추가<small>'+photos.length+'/5</small><input id="photoInput" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>':'')+'</div><p class="field-hint">JPG · PNG · WebP / 큰 사진은 자동으로 줄여드려요.</p><p class="field-error" id="error-사진"></p></div>';}
function privacyHTML(){
 return '<div class="notice"><strong>필요한 정보만, 동의한 범위에서 사용해요.</strong><p>출생연도, 키, 생활권, 직업, 학교, MBTI, 취미, 음주, 흡연, 종교, 자기소개와 입력한 연봉·자산은 소개 진행 시 상대에게 전달될 수 있어요. 선택한 소개 방식에 따라 전달 시점을 확인해요.</p><p>사진과 연락처를 전달할 때는 별도 동의를 받아요.</p></div><div class="field consent-group" data-field="개인정보동의"><label class="consent-check"><input id="field-개인정보동의" type="checkbox" data-key="개인정보동의" '+(answers.개인정보동의?'checked':'')+'><span>개인정보 수집·이용에 동의해요 <span class="required">필수</span></span></label><details><summary>수집·이용 내용 보기</summary><p>목적: 신청 검토, 이메일 접수 확인 안내, 소개 가능 여부 확인 및 매칭·추가 확인 연락, 본인 신청 내용 확인·수정·철회</p><p>항목: 이름, 성별, 출생연도, 키, 생활권, 직업, 학교, 취미, 생활습관, 자기소개, 선호조건, 사진, 연락처, 이메일 및 선택 입력 항목</p><p>선택 항목은 비워도 신청할 수 있어요. 필수정보 수집에 동의하지 않으면 신청할 수 없어요.</p><p>처리자: '+PRIVACY.operator+' · 보유기간: '+PRIVACY.retention+'<br>문의: '+PRIVACY.contact+'</p></details><p class="field-error" id="error-개인정보동의"></p></div>';
}
function reviewHTML(){
 return CHAPTER_FIELDS.map((fields,i)=>'<section class="review-group"><h2>'+CHAPTERS[i]+'</h2><dl class="summary">'+fields.filter(f=>f[2]!=='review').map(f=>{
 const [key,label]=f;const index=STEPS.findIndex(s=>s.field[0]===key);
 let value=key==='사진'?photos.length+'장':key==='개인정보동의'?(answers[key]?'동의함':'미동의'):key==='프로필소개동의'?(answers[key]===INTRO_CHOICES[0]?'상대방의 의사 먼저 확인':'나에게 먼저 확인'):String(answers[key]||'입력 안 함');
 return '<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd><button type="button" data-edit-step="'+index+'" aria-label="'+esc(label)+' 수정">수정</button></div>';
 }).join('')+'</dl></section>').join('')+'<p class="review-note">등록만으로 만남이 확정되지는 않아요.<br>소개 가능 여부는 별도로 안내드릴게요.</p>';
}
function focusQuestion(){
 // Focus the heading after navigation without opening the mobile keyboard automatically.
 window.scrollTo({top:0,behavior:'instant'});$('questionTitle')?.focus({preventScroll:true});
}
function goTo(index){
 if(busy)return;cursor=Math.max(0,Math.min(STEPS.length-1,index));furthest=Math.max(furthest,cursor);persist();render();focusQuestion();
}
function advance(skip=false){
 if(busy)return;const [key,,, ,optional]=STEPS[cursor].field;
 if(skip&&optional){answers[key]='';persist();}
 const message=fieldError(key);
 if(message){showFieldError(key,message);const target=$('field-'+key)||$('error-'+key);target?.focus({preventScroll:true});return;}
 if(STEPS[cursor].field[2]==='review'){submit();return;}
 if(returnToSummary){returnToSummary=false;goTo(STEPS.length-1);}else goTo(cursor+1);
}
function renderWizard(){
 const s=STEPS[cursor],f=s.field,[key,label,type,,optional]=f;
 const prompt=PROMPTS[key]||[label,''];
 document.body.classList.add('wizard-mode');
 const chapters='<nav class="chapter-nav" aria-label="신청 챕터">'+CHAPTERS.map((name,i)=>{
 const first=STEPS.findIndex(s=>s.chapter===i),available=first<=furthest;
 return '<button type="button" data-chapter="'+i+'" '+(!available?'disabled':'')+' '+(i===s.chapter?'aria-current="step"':'')+' class="'+(i<s.chapter?'done':'')+'"><span class="chapter-line"></span><span class="chapter-label"><span class="chapter-index">'+(i<s.chapter?'✓':i+1)+'</span>'+name+'</span></button>';
 }).join('')+'</nav>';
 let content=type==='photos'?photoHTML():type==='consent'?privacyHTML():type==='review'?reviewHTML():fieldHTML(f);
 $('screen').innerHTML=chapters+'<div class="wizard-toolbar"><button type="button" class="back-button" id="previous" aria-label="'+(cursor===0?'처음으로':'이전 질문')+'"><span aria-hidden="true">‹</span> 이전</button><span class="question-count">'+(s.position+1)+' / '+s.total+'</span></div><form id="application" class="wizard '+(type==='review'?'review-step':'')+'" novalidate><div class="question-heading"><p class="eyebrow">'+CHAPTERS[s.chapter]+(optional?' <span class="optional">선택</span>':'')+'</p><h1 id="questionTitle" tabindex="-1">'+esc(prompt[0]).replace(/\n/g,'<br>')+'</h1><p class="question-description">'+esc(prompt[1])+'</p></div><div class="question-content">'+content+'</div><p id="error" class="error" role="alert" tabindex="-1"></p></form>';
 const last=type==='review',cta=last?(receipt||editSnapshot?'수정 내용 저장':'등록하기'):returnToSummary?'수정 완료':'다음';
 $('nav').innerHTML='<div class="wizard-actions">'+(optional?'<button type="button" class="skip-button" id="skipQuestion">건너뛰기</button>':'')+'<button type="submit" form="application" class="primary" id="next">'+(busy?'처리 중…':cta)+'</button>'+(editSnapshot?'<button type="button" class="cancel-button" id="cancelEdit">수정 취소</button>':'')+'</div>';
 $('application').onsubmit=e=>{e.preventDefault();advance();};
 $('previous').onclick=()=>{if(cursor===0&&!returnToSummary){showHome();return;}if(returnToSummary){returnToSummary=false;goTo(STEPS.length-1);}else goTo(cursor-1);};
 if($('skipQuestion'))$('skipQuestion').onclick=()=>advance(true);
 document.querySelectorAll('[data-chapter]').forEach(el=>el.onclick=()=>{returnToSummary=false;goTo(STEPS.findIndex(s=>s.chapter===Number(el.dataset.chapter)));});
 document.querySelectorAll('[data-key]').forEach(el=>{
 const update=()=>{if(busy)return;answers[el.dataset.key]=el.type==='checkbox'?el.checked:el.value;persist();clearError(el.dataset.key);if(el.type==='radio')advance();};
 el.addEventListener(el.type==='radio'||el.type==='checkbox'?'change':'input',update);
 if(el.tagName==='INPUT'&&!['radio','checkbox','file'].includes(el.type))el.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();advance();}});
 });
 document.querySelectorAll('[data-clear]').forEach(el=>el.remove());
 document.querySelectorAll('[data-edit-step]').forEach(el=>el.onclick=()=>{returnToSummary=true;goTo(Number(el.dataset.editStep));});
 document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{if(busy)return;photos.splice(Number(el.dataset.remove),1);render();});
 if($('photoInput'))$('photoInput').onchange=selectPhotos;
 if($('noExclusions'))$('noExclusions').onclick=()=>{answers.같은회사제외='상관없어';advance();};
 if($('cancelEdit'))$('cancelEdit').onclick=()=>{if(busy)return;answers={...editSnapshot.answers};photos=[...editSnapshot.photos];editSnapshot=null;returnToSummary=false;view='profile';document.body.classList.remove('wizard-mode');render();window.scrollTo(0,0);};
 updateProgress();
}


let introPage=0;
const INTRO_SLIDES=[
 ['믿을 수 있는 지인의 지인과,<br>소개팅부터 소규모 모임까지','고려대·서울대 출신의 안목으로<br>좋은 만남을 정성껏 준비해요.'],
 ['부탁하는 부담 없이,<br>지치는 만남 없이','친구에겐 말하기 눈치 보였던 조건도<br>여기선 편하게 얘기해요.'],
 ['내 취향도, 내 프라이버시도','친구의 마음으로 취향을 꼼꼼히 살펴 소개해요.<br>내 프로필은 동의 없이 전달되지 않아요.']
];
function renderHome(){
 $('screen').innerHTML='<section class="link-home" aria-label="찐친소 서비스 소개"><div class="home-mark">찐친소</div><div id="introSlides" class="intro-carousel" tabindex="0" role="region" aria-roledescription="캐러셀" aria-label="찐친소 소개">'+INTRO_SLIDES.map(([title,body],i)=>'<article class="intro-slide" aria-label="소개 '+(i+1)+' / 3"><h1>'+title+'</h1><p>'+body+'</p></article>').join('')+'</div><div class="intro-controls"><button type="button" id="introPrevious" aria-label="이전 소개">‹</button><div class="intro-dots">'+INTRO_SLIDES.map((_,i)=>'<button type="button" data-intro="'+i+'" aria-label="소개 '+(i+1)+' 보기"><span></span></button>').join('')+'</div><button type="button" id="introNext" aria-label="다음 소개">›</button></div><div class="home-links"><button type="button" class="home-link pool-link" id="openPool"><span><strong>찐친소 풀에 등록하기</strong><small>잘 맞는 인연을 소개받고, 파티 우선 신청 기회도 받아보세요.</small></span><span class="link-arrow" aria-hidden="true">↗</span></button><a class="home-link party-link" href="party.html'+(demo?'?demo=1':'')+'"><span><strong>'+esc(PARTY_EVENT.title)+'</strong><small class="party-entry-meta">2026.11.14 · 강남 · 19:30 <span class="entry-closed">여자 마감</span></small></span><span class="link-arrow" aria-hidden="true">↗</span></a></div><div class="home-secondary-links"><button type="button" class="process-link" id="processOpen">어떻게 진행되나요?</button><a class="home-contact" href="mailto:'+PRIVACY.contact+'">문의하기</a></div><dialog id="processDialog" class="process-dialog" aria-labelledby="processTitle"><button type="button" id="processClose" aria-label="닫기">×</button><h2 id="processTitle">어떻게 진행되나요?</h2><p>풀에 등록하시면 저희가 직접 잘 맞는 자리를 만들어서 추천해 드릴게요.<br>소개팅은 매칭당 2만원 (지인 추천 코드 입력시 할인), 모임은 컨셉/장소에 따라 개별 안내해 드릴 거예요.</p><section><h3>소개팅</h3><ol><li>문자로 상대 제안<br><small>간략한 프로필을 함께 보내드려요.</small></li><li>서로 만나볼 의사가 있으면 사진 교환</li><li>최종 매칭</li><li>입금</li><li>안내된 장소에서 만남</li></ol></section><section><h3>소규모 모임</h3><ol><li>이상형 및 취향에 맞는 모임 제안</li><li>참여 여부 결정</li><li>회비 입금</li><li>장소와 콘셉트에 따라 달라 개별 안내해요. <small>(약 3–4만원)</small></li><li>안내된 장소에서 모임</li></ol></section></dialog></section>';
 $('nav').innerHTML='';$('openPool').onclick=openPool;
 const track=$('introSlides');
 const update=()=>{document.querySelectorAll('[data-intro]').forEach(el=>el.setAttribute('aria-current',String(Number(el.dataset.intro)===introPage)));$('introPrevious').disabled=introPage===0;$('introNext').disabled=introPage===2;};
 const slideTo=i=>{introPage=Math.max(0,Math.min(2,i));track.scrollTo({left:track.clientWidth*introPage,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});update();};
 $('introPrevious').onclick=()=>slideTo(introPage-1);$('introNext').onclick=()=>slideTo(introPage+1);
 document.querySelectorAll('[data-intro]').forEach(el=>el.onclick=()=>slideTo(Number(el.dataset.intro)));
 track.addEventListener('scroll',()=>{if(track.clientWidth){introPage=Math.round(track.scrollLeft/track.clientWidth);update();}});
 track.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();slideTo(introPage+(e.key==='ArrowRight'?1:-1));}};
 track.scrollLeft=track.clientWidth*introPage;update();
 $('processOpen').onclick=()=>$('processDialog').showModal();$('processClose').onclick=()=>$('processDialog').close();
 $('processDialog').onclick=e=>{if(e.target===$('processDialog'))$('processDialog').close();};
}

function openPool(){
 const url=new URL(location.href);url.searchParams.set('view','pool');history.pushState({},'',url);view=receipt&&!demo?'loading':'form';render();window.scrollTo(0,0);if(view==='loading')loadReceipt();
}
function showHome(){
 if(busy)return;const url=new URL(location.href);url.searchParams.delete('view');history.pushState({},'',url);view='home';render();window.scrollTo(0,0);
}
window.addEventListener('popstate',()=>{
 if(busy)return;view=new URLSearchParams(location.search).get('view')==='pool'?(receipt&&!demo?'loading':'form'):'home';render();window.scrollTo(0,0);if(view==='loading')loadReceipt();
});

function render(){
 document.body.classList.toggle('wizard-mode',view==='form');
 document.body.classList.toggle('home-mode',view==='home');
 document.title=view==='home'?'찐친소 · 친구의 친구, 새로운 인연':'찐친소 · 간편 신청';
 document.querySelector('footer').hidden=view==='home';
 $('progressTrack').hidden=view!=='form';
 document.querySelector('.brand').href='index.html'+(demo?'?demo=1':'');
 $('headerNote').textContent=demo?'체험 모드 · 실제로 접수되지 않아요':'친구의 친구, 새로운 인연';
 if(view==='home'){renderHome();return;}
 if(view==='loading'){$('screen').innerHTML='<section class="result" role="status"><h1>신청 정보를 불러오고 있어요.</h1><p>잠시만 기다려 주세요.</p></section><p id="error" role="alert"></p>';$('nav').innerHTML='';return;}
 if(view==='complete'||view==='profile'){
 $('screen').innerHTML='<section class="result"><span class="result-mark" aria-hidden="true">✓</span><p class="eyebrow">'+(demo?'체험 완료':'신청 내역')+'</p><h1>'+(status==='철회'?'신청이 철회됐어요.':view==='profile'?'신청 정보를 확인해 보세요.':'신청이 완료됐어요.')+'</h1><p>'+(status==='철회'?'철회한 신청 내역은 아래에서 확인할 수 있어요.':'1–2일 정도 검토한 뒤 이메일로 접수 확인을 안내해요.<br>잘 맞는 인연이 있으면 별도로 연락드릴게요.')+'</p>'+(receipt?.id?'<p class="receipt">접수번호 '+esc(receipt.id)+'</p>':'')+'</section><section class="form-section summary-section"><h2>신청 내용</h2><p class="field-hint">상태: '+esc(status==='철회'?'철회':'접수 완료 · 검토 중')+'</p><dl class="summary">'+FIELDS.map(([k,l])=>'<div><dt>'+esc(l)+'</dt><dd>'+esc(answers[k]||'입력 안 함')+'</dd></div>').join('')+'<div><dt>사진</dt><dd>'+photos.length+'장</dd></div><div><dt>소개 방식</dt><dd>'+esc(answers.프로필소개동의===INTRO_CHOICES[0]?'상대방의 의사 먼저 확인':'나에게 먼저 확인')+'</dd></div></dl></section><p id="error" class="error" role="alert"></p><p class="support">문의 <a href="mailto:'+PRIVACY.contact+'">'+PRIVACY.contact+'</a></p>';
 $('nav').innerHTML=status==='철회'?'<p>철회된 신청이에요.</p>':'<button type="button" class="secondary" id="withdraw">신청 철회</button><button type="button" class="primary" id="edit">신청 정보 수정</button>';
 if($('edit'))$('edit').onclick=()=>{editSnapshot={answers:{...answers},photos:[...photos]};cursor=STEPS.length-1;returnToSummary=false;view='form';render();window.scrollTo(0,0);};
 if($('withdraw'))$('withdraw').onclick=withdraw;
 }else{renderWizard();}

 if(busy){document.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=true);$('nav').setAttribute('aria-busy','true');}else $('nav').removeAttribute('aria-busy');
}
function fieldError(key){const f=FIELDS.find(f=>f[0]===key);const value=String(answers[key]||'').trim();if(f&&!f[4]&&!value)return '이 항목을 입력하거나 선택해 주세요.';
 if(key==='출생연도'&&(!/^\d{4}$/.test(value)||+value<1900||+value>new Date().getFullYear()-19))return '출생연도 4자리를 확인해 주세요. 출생연도 기준 19세 이상만 신청할 수 있어요.';
 if(key==='키'&&(!Number.isFinite(+value)||+value<100||+value>250))return '키를 100–250cm 사이로 입력해 주세요.';
 if(key==='MBTI'&&value&&!/^[IE][NS][FT][JP]$/i.test(value))return 'MBTI 네 글자를 확인하거나 비워주세요.';
 if(key==='연락처'&&!/^01[016789]\d{7,8}$/.test(value.replace(/[-\s]/g,'')))return '휴대폰 번호를 확인해 주세요.';
 if(key==='이메일'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return '이메일 주소를 확인해 주세요.';
 if(key==='프로필소개동의'&&!INTRO_CHOICES.includes(answers[key]))return '소개 진행 방식을 선택해 주세요.';
 if(key==='개인정보동의'&&!answers[key])return '개인정보 수집·이용 동의가 필요해요.';
 if(key==='사진')return photoCountMessage();return '';}
function clearError(key){const msg=$('error-'+key);if(msg)msg.textContent='';document.querySelectorAll('[data-key="'+key+'"]').forEach(el=>el.removeAttribute('aria-invalid'));}
function showFieldError(key,message){if($('error-'+key))$('error-'+key).textContent=message;document.querySelectorAll('[data-key="'+key+'"]').forEach(el=>{el.setAttribute('aria-invalid','true');el.setAttribute('aria-describedby','error-'+key);});}
function validate(){
 const invalid=[...FIELDS.map(f=>f[0]),'사진','프로필소개동의','개인정보동의'].find(k=>fieldError(k));
 if(!invalid)return true;
 cursor=STEPS.findIndex(s=>s.field[0]===invalid);returnToSummary=true;render();showFieldError(invalid,fieldError(invalid));focusQuestion();return false;
}
function updateProgress(){
 $('progress').style.width=Math.round(cursor/(STEPS.length-1)*100)+'%';
 $('progressTrack').setAttribute('aria-valuenow',String(cursor));
 $('progressTrack').setAttribute('aria-valuemax',String(STEPS.length-1));
 $('progressTrack').setAttribute('aria-valuetext',CHAPTERS[STEPS[cursor].chapter]+' · '+(STEPS[cursor].position+1)+'/'+STEPS[cursor].total);
}
function error(message){$('error').textContent=message;}
async function selectPhotos(e){if(busy)return;const files=[...e.target.files];e.target.value='';if(!files.length)return;if(files.length+photos.length>5){showFieldError('사진','사진은 최대 5장까지 올릴 수 있어요.');return;}const y=window.scrollY;busy=true;render();const rejected=[];try{for(const file of files){const why=checkPhoto(file);if(why){rejected.push(why);continue;}try{const p=await shrinkPhoto(file);photos.push({name:file.name,...p});}catch{rejected.push('사진을 열지 못했어요. 다른 파일을 골라주세요.');}}}finally{busy=false;render();window.scrollTo(0,y);if(rejected.length)showFieldError('사진',rejected.join(' '));}}
function serverCapabilities(){if(!capabilitiesRequest)capabilitiesRequest=request({_action:'capabilities'}).catch(e=>{capabilitiesRequest=null;throw e;});return capabilitiesRequest;}
async function submit(){if(busy||!validate())return;busy=true;const y=window.scrollY;render();error('사진과 신청 정보를 저장하고 있어요. 최대 1–2분 걸릴 수 있어요.');try{
 answers.상대조건='';answers.이메일=answers.이메일.trim();answers.연령대=Math.floor((new Date().getFullYear()-Number(answers.출생연도))/10)*10+'대';answers.프로필소개동의일시=new Date().toISOString();
 if(!demo){const c=await serverCapabilities();if(!c.combinedPreferences)throw Error('변경된 선호 조건을 저장하려면 신청 서버 업데이트가 필요해요. 입력한 내용은 그대로 유지했어요.');if(!c.emailCollection||!c.profileIntroductionConsent||!c.selfIntroduction||!c.partnerCondition)throw Error('신청 연결을 확인하고 있어요. 잠시 후 다시 시도해 주세요.');
 const result=await request({...answers,신청ID:receipt?.id||submissionId,사진:photos,개인정보동의일시:new Date().toISOString(),_action:receipt?'update':'submit',_token:receipt?.token});if(!result.id||!result.token)throw Error('접수 확인을 받지 못했어요. 다시 시도해 주세요.');receipt={id:result.id,token:result.token};try{sessionStorage.setItem('chinchinso-receipt',JSON.stringify(receipt));sessionStorage.removeItem(DRAFT_KEY);sessionStorage.removeItem('chinchinso-sessions');}catch{}}
 status='pending';view='complete';editSnapshot=null;busy=false;render();window.scrollTo(0,0);
 }catch(e){busy=false;render();window.scrollTo(0,y);error(e.name==='AbortError'?'저장 확인이 지연되고 있어요. 입력 내용은 그대로 두었으니 다시 시도해 주세요.':e instanceof TypeError?'연결하지 못했어요. 입력 내용은 그대로 두었으니 다시 시도해 주세요.':e.message);$('next').textContent='다시 등록하기';}}
async function loadReceipt(){busy=true;try{const result=await request({_action:'status',신청ID:receipt.id,_token:receipt.token});if(!result.answers||!Array.isArray(result.photos))throw Error('신청 정보를 불러오지 못했어요.');Object.assign(answers,result.answers);mergePreference(answers);photos=result.photos;status=result.status;view='profile';busy=false;render();}catch(e){busy=false;$('screen').innerHTML='<section class="result"><h1>신청 정보를 불러오지 못했어요.</h1><p>연결을 확인하고 다시 시도해 주세요.</p><p id="error" class="error" role="alert"></p></section>';$('nav').innerHTML='<button class="primary" id="retry">다시 불러오기</button>';$('retry').onclick=()=>{view='loading';render();loadReceipt();};error(e.message);}}
async function withdraw(){if(busy||!window.confirm('신청을 철회할까요? 철회 후에도 신청 내역은 남아요.'))return;busy=true;render();try{if(!demo)await request({_action:'withdraw',신청ID:receipt.id,_token:receipt.token});status='철회';}catch(e){busy=false;render();error('철회하지 못했어요. '+e.message);return;}busy=false;render();window.scrollTo(0,0);}
const PHOTO_LIMIT={min:3,max:5,edge:1600,quality:0.85,bytes:4*1024*1024,types:{'image/jpeg':'JPG','image/png':'PNG','image/webp':'WebP'}};
// Mirrors server/Code.gs: JPG/PNG/WebP, 3–5 photos. No size limit for the user: anything larger than `edge` px or `bytes` is shrunk in the browser before upload (server still caps one decoded photo at 5MB). Type falls back to the extension because some Android pickers leave file.type empty.
function photoType(file){if(PHOTO_LIMIT.types[file.type])return file.type;const ext=String(file.name||'').toLowerCase().match(/\.(jpe?g|png|webp)$/);return ext?{jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[ext[1]]:'';}
function checkPhoto(file){const label=file.name?`'${file.name}'`:'이 파일';if(!photoType(file))return /heic|heif/i.test(file.type+' '+file.name)?label+'은 HEIC 형식이에요. 아이폰 카메라 설정을 호환성 우선으로 바꾸거나 JPG로 저장해서 올려주세요.':label+'은 JPG, PNG, WebP만 올릴 수 있어요.';return '';}
function photoCountMessage(){const n=photos.length;if(n<PHOTO_LIMIT.min)return `사진 ${PHOTO_LIMIT.min-n}장 더 올려주세요. (지금 ${n}장, ${PHOTO_LIMIT.min}~${PHOTO_LIMIT.max}장 필요)`;if(n>PHOTO_LIMIT.max)return `사진은 ${PHOTO_LIMIT.max}장까지만 올릴 수 있어요. ${n-PHOTO_LIMIT.max}장 지워주세요.`;return '';}
async function loadBitmap(file){if(typeof createImageBitmap==='function'){try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch{}}const url=URL.createObjectURL(file);try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url;});}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}}
// Returns {type,data}. Small photos pass through untouched; large ones are downscaled to PHOTO_LIMIT.edge and re-encoded as JPEG under PHOTO_LIMIT.bytes.
async function shrinkPhoto(file){const type=photoType(file);const bitmap=await loadBitmap(file);const w=bitmap.naturalWidth||bitmap.width,h=bitmap.naturalHeight||bitmap.height;if(!w||!h)throw Error('decode');const readOriginal=()=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve('data:'+type+';base64,'+String(r.result).split(',')[1]);r.onerror=()=>reject(Error('read'));r.readAsDataURL(file);});if(file.size<=PHOTO_LIMIT.bytes&&Math.max(w,h)<=PHOTO_LIMIT.edge)return {type,data:await readOriginal()};const scale=Math.min(1,PHOTO_LIMIT.edge/Math.max(w,h));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);g.drawImage(bitmap,0,0,canvas.width,canvas.height);if(bitmap.close)bitmap.close();let data='';for(const q of [PHOTO_LIMIT.quality,0.75,0.65,0.55,0.45]){data=canvas.toDataURL('image/jpeg',q);if(data.length*0.75<=PHOTO_LIMIT.bytes)break;}return {type:'image/jpeg',data};}

async function request(payload){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),60000);try{const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal});if([401,403,404,410].includes(response.status))throw Error('신청 접수 연결에 문제가 있어요. '+PRIVACY.contact+'으로 문의해주세요.');if(!response.ok)throw Error('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');let result;try{result=await response.json();}catch{throw Error('저장 확인을 받지 못했어요. 잠시 후 다시 시도해 주세요.');}if(result.schemaVersion!==2||!result.ok)throw Error(result.error||'신청 연결을 확인할 수 없어요. 운영자에게 문의해 주세요.');return result;}finally{clearTimeout(timeout);}}

function fitKeyboard(){
 const viewport=window.visualViewport;
 const typing=document.activeElement?.matches('input:not([type=radio]):not([type=checkbox]):not([type=file]),textarea');
 const open=viewport&&viewport.scale===1&&typing&&window.innerHeight-viewport.height>120;
 document.body.classList.toggle('keyboard-open',!!open);
 if(open)document.documentElement.style.setProperty('--keyboard-bottom',(viewport.offsetTop+viewport.height+window.scrollY)+'px');
}
window.visualViewport?.addEventListener('resize',fitKeyboard);
window.visualViewport?.addEventListener('scroll',fitKeyboard);
document.addEventListener('focusin',fitKeyboard);
document.addEventListener('focusout',()=>requestAnimationFrame(fitKeyboard));
render();if(view==='loading')loadReceipt();
