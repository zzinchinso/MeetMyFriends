const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=process.env.REPO_ROOT||path.resolve(__dirname,'..');
const {environment,fakeSheet}=require(root+'/tests/apps-script-fakes.cjs');
const PLACEHOLDERS={이름:'홍길동',출생연도:'예: 1997',키:'예: 165',생활권:'강남 거주 분당 출퇴근',직업:'예: 토스에서 PM으로 일하고 있어',학교:'서울대 통계학과',MBTI:'예: ENFP',취미:'예: 러닝, 카페 가기',자기소개:'예: 잘 웃고 리액션이 좋아',자산:'예: 1.5억',이상형:'예: 운동을 좋아하고 대화가 잘 통하는 사람. 비흡연이면 좋겠어요.',상대조건:'예: 비흡연, 연락이 잘 되는 사람',같은회사제외:'예: 토스 PM 직군은 피하고 싶어',추천인:'이름이나 닉네임',초대코드:'',연락처:'숫자만 입력 (- 없이)',이메일:'예: hello@example.com'};
const SAMPLE={이름:'홍길동',출생연도:'1997',키:'170',생활권:'서울 강남',직업:'토스 PM',학교:'한국대 통계학과',MBTI:'ENFP',취미:'러닝',자기소개:'경청을 잘해요',자산:'비밀',이상형:'편안하게 대화하는 사람',상대조건:'비흡연',같은회사제외:'상관없어',추천인:'다니',초대코드:'FRIEND',연락처:'01012345678',이메일:'hello@example.com'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
 try{
 for(const optional of [false,true]){
  const env=environment({sheets:[fakeSheet('설문응답',[['제출시각','성별','연령대','유입경로','만족도','유용한점','추천의향','좋았던점','개선점']])]});env.setup();
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  const errors=[],sent=[],asked=[];let failNext=false;page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://script.google.com/**',async route=>{const payload=route.request().postDataJSON();sent.push(payload);if(failNext&&payload._action==='submit'){failNext=false;return route.abort();}await route.fulfill({json:env.post(payload)});});
  await page.route('http://localhost/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html';await route.fulfill({path:root+'/'+name,contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':name.endsWith('.woff2')?'font/woff2':name.endsWith('.png')?'image/png':'text/html'});});
  await page.goto('http://localhost/index.html');await page.locator('#openPool').waitFor();
  assert.equal(await page.locator('.intro-slide').count(),3);assert.equal(await page.locator('.home-link').count(),2);assert.equal(await page.locator('footer').isVisible(),false);
  await page.evaluate(()=>document.fonts.ready);assert(await page.evaluate(()=>document.fonts.check('700 52px Pretendard')));
  if(!optional&&process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/home-mobile.png'});
  await page.getByRole('button',{name:'다음 소개',exact:true}).click();assert.equal(await page.locator('[data-intro="1"]').getAttribute('aria-current'),'true');
  await page.getByRole('button',{name:'소개 3 보기',exact:true}).click();assert.equal(await page.locator('[data-intro="2"]').getAttribute('aria-current'),'true');
  await page.getByRole('link',{name:/11\/14 빼빼로 데이 파티/}).click();await page.locator('.party-poster').waitFor();assert.equal(await page.locator('.party-poster').count(),1);assert.equal(await page.getByRole('button',{name:'신청하기',exact:true}).isEnabled(),true);
  if(!optional&&process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/party-mobile.png',fullPage:true});
  await page.getByRole('link',{name:'‹ 처음으로',exact:true}).click();await page.locator('#openPool').click();await page.locator('#questionTitle').waitFor();
  await page.locator('#previous').click();await page.locator('#openPool').waitFor();await page.locator('#openPool').click();
  assert.equal(await page.locator('[data-key=이름]').getAttribute('placeholder'),PLACEHOLDERS.이름);
  assert.equal(await page.locator('.chapter-nav button').count(),3);
  assert.equal(await page.locator('input[data-key],textarea[data-key]').count(),1);
  assert.equal(await page.locator('.incoming,.composer,.host-avatar').count(),0);
  await page.locator('#next').click();assert(await page.locator('#error-이름').textContent());
  await page.locator('[data-key=이름]').fill(SAMPLE.이름);await page.reload();assert.equal(await page.locator('[data-key=이름]').inputValue(),SAMPLE.이름);
  await page.locator('[data-key=이름]').press('Enter');await page.locator('[data-field=성별]').waitFor();
  if(!optional&&process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/mobile.png'});
  await page.locator('#previous').click();assert.equal(await page.locator('[data-key=이름]').inputValue(),SAMPLE.이름);await page.locator('#next').click();
  await page.locator('input[name=성별][value=여성]').click();await page.locator('[data-field=출생연도]').waitFor();
  await page.locator('[data-key=출생연도]').fill('2099');await page.locator('#next').click();assert(await page.locator('#error-출생연도').textContent());
  await page.reload();await page.locator('[data-field=출생연도]').waitFor();assert.equal(await page.locator('[data-key=출생연도]').inputValue(),'2099');
  asked.push('이름','성별');
  for(let guard=0;guard<40;guard++){
   if(await page.locator('.review-step').count())break;
   const field=page.locator('.question-content [data-field]').first();const key=await field.getAttribute('data-field');assert(!asked.includes(key),'question repeated: '+key);asked.push(key);
   if(key in PLACEHOLDERS)assert.equal(await page.locator('[data-key="'+key+'"]').getAttribute('placeholder'),PLACEHOLDERS[key],'original placeholder '+key);
   assert(!(await page.locator('#screen').textContent()).includes('선택하면 다음으로'));
   if(key==='연봉'||key==='자산')assert(!(await page.locator('#screen').textContent()).includes('전달'));
   if(key==='MBTI'&&!optional){await page.setViewportSize({width:1440,height:900});const skip=await page.locator('#skipQuestion').boundingBox(),next=await page.locator('#next').boundingBox(),footer=await page.locator('footer').boundingBox();assert(skip.width<112);assert(next.width<=321);assert(footer.height<105);if(process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/pc-footer.png'});await page.setViewportSize({width:390,height:844});}
   if(!optional&&await page.locator('#skipQuestion').count()){await page.locator('#skipQuestion').click();continue;}
   if(key==='사진'){
    await page.locator('#next').click();assert(await page.locator('#error-사진').textContent());
    await page.locator('#photoInput').setInputFiles([1,2,3].map(n=>({name:'p'+n+'.png',mimeType:'image/png',buffer:png})));
    await page.waitForFunction(()=>document.querySelectorAll('.photo').length===3);await page.locator('#next').click();continue;
   }
   const radio=field.locator('input[type=radio]');
   if(await radio.count()){await radio.first().click();await page.waitForFunction(k=>!document.querySelector('[data-field="'+k+'"]'),key);continue;}
   if(key==='개인정보동의'){await page.locator('#next').click();assert(await page.locator('#error-개인정보동의').textContent());await page.locator('[data-key=개인정보동의]').check();}
   else if(key==='같은회사제외'){await page.locator('#noExclusions').click();continue;}
   else{assert(SAMPLE[key]!==undefined,'missing sample '+key);await page.locator('[data-key="'+key+'"]').fill(SAMPLE[key]);}
   await page.locator('#next').click();
  }
  await page.locator('.review-step').waitFor();assert.equal(asked.length,24);assert.equal(new Set(asked).size,24);
  // Review edits return straight to the review, retaining all other answers and the photos.
  await page.getByRole('button',{name:'주로 생활하는 지역 수정',exact:true}).click();await page.locator('[data-key=생활권]').fill('서울 마포');await page.locator('#next').click();await page.locator('.review-step').waitFor();
  failNext=true;await page.locator('#next').click();await page.waitForFunction(()=>document.querySelector('#next')?.textContent==='다시 등록하기');assert((await page.locator('.summary').allTextContents()).join('').includes('서울 마포'));
  await page.locator('#next').click();await page.getByRole('heading',{name:'신청이 완료됐어요.'}).waitFor();
  const attempts=sent.filter(p=>p._action==='submit');assert.equal(attempts.length,2);assert.equal(attempts[0].신청ID,attempts[1].신청ID);assert.equal(attempts[1].사진.length,3);assert.equal(attempts[1].상대조건,'');assert(!asked.includes('상대조건'));const tab=env.tab('신청');assert(tab._data[0].includes('상대조건'));assert.equal(tab._data.at(-1)[tab._data[0].indexOf('상대조건')],'');assert.equal(attempts[1].주선자,'f');assert.equal(attempts[1].음주,'아예 안 마셔');assert.equal(attempts[1].MBTI||'',optional?'ENFP':'');
  // Existing receipt editing and cancellation.
  await page.locator('#edit').click();await page.getByRole('button',{name:'주로 생활하는 지역 수정',exact:true}).click();await page.locator('[data-key=생활권]').fill('수정 취소');await page.locator('#cancelEdit').click();assert((await page.locator('.summary').textContent()).includes('서울 마포'));
  await page.locator('#edit').click();await page.getByRole('button',{name:'주로 생활하는 지역 수정',exact:true}).click();await page.locator('[data-key=생활권]').fill('서울 성수');await page.locator('#next').click();await page.locator('#next').click();await page.getByRole('heading',{name:'신청이 완료됐어요.'}).waitFor();assert(sent.some(p=>p._action==='update'&&p.생활권==='서울 성수'));
  await page.reload();await page.getByRole('heading',{name:'신청 정보를 확인해 보세요.'}).waitFor();assert((await page.locator('.summary').textContent()).includes('서울 성수'));
  page.on('dialog',d=>d.accept());await page.locator('#withdraw').click();await page.getByRole('heading',{name:'신청이 철회됐어요.'}).waitFor();
  // Responsive and keyboard-only operation; demo never posts to the backend.
  const sentBeforeDemo=sent.length;await page.goto('http://localhost/index.html?demo=1');await page.locator('#openPool').click();await page.locator('[data-key=이름]').fill('체험');await page.locator('[data-key=이름]').press('Enter');
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow at '+width);}
  if(!optional&&process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/desktop.png'});
  await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
  if(!optional&&process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/dark.png'});
  await page.goto('http://localhost/index.html?demo=1');await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({colorScheme:'light'});await page.evaluate(()=>document.fonts.ready);if(!optional&&process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/home-desktop.png'});
  assert.equal(sent.length,sentBeforeDemo);assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: original 3-slide intro, home/pool/party navigation, original placeholders, local Pretendard logo font, compact PC footer, no repeated guidance, 3 chapters, 24 questions with merged preferences, one question per screen, choice auto-advance, optional skip/answer, Enter, previous answers, draft/cursor restore, validation, photo upload, review edit, cancel edit, failed submit with idempotent retry, actual server submit/update/status/withdraw, mobile/desktop/dark mode.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
