const {chromium}=require('playwright'),assert=require('assert'),path=require('path'),crypto=require('crypto');
const root=process.env.REPO_ROOT||path.resolve(__dirname,'..');
const {environment,fakeSheet}=require(root+'/tests/apps-script-fakes.cjs');
const event='pepero-2026-11-14';
const payload=()=>({_action:'partySubmit',행사ID:event,신청ID:crypto.randomUUID(),성별:'남성',이름:'파티테스트',출생연도:'1998',자기소개:'러닝과 대화를 좋아해요.',연락처:'01012345678',개인정보동의:true});
(async()=>{
 const env=environment({sheets:[fakeSheet('설문응답',[['제출시각','성별','연령대','유입경로','만족도','유용한점','추천의향','좋았던점','개선점']])]});env.setup();
 assert(env.post({_action:'capabilities'}).partyApplications);
 for(const bad of [{성별:'여성'},{성별:'기타'},{행사ID:'unknown'},{출생연도:'2099'},{연락처:'invalid'},{자기소개:''},{개인정보동의:false},{이름:'x'.repeat(101)}])assert.equal(env.post({...payload(),...bad}).ok,false,JSON.stringify(bad));
 assert(!env.tab('파티신청'),'invalid requests must not create a party tab');
 const p=payload();p.이름='=formula';const first=env.post(p),second=env.post(p);assert(first.ok);assert.equal(second.id,first.id);assert.equal(env.tab('파티신청')._data.length,2);assert.equal(env.tab('파티신청')._data[1][4],'=formula');
 env.setup();assert.equal(env.tab('파티신청')._data.length,2,'pool setup must never migrate party records');assert.equal(env.tab('신청')._data.length,1,'party records must not enter the pool');
 const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();let sent=[],failNext=true,oldServer=false;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost/**',async r=>{const n=new URL(r.request().url()).pathname.slice(1)||'index.html';await r.fulfill({path:root+'/'+n,contentType:n.endsWith('.js')?'application/javascript':n.endsWith('.css')?'text/css':n.endsWith('.png')?'image/png':n.endsWith('.woff2')?'font/woff2':'text/html'});});
 await page.route('https://script.google.com/**',async r=>{const p=r.request().postDataJSON();sent.push(p);if(p._action==='capabilities'&&oldServer)return r.fulfill({json:{ok:true,schemaVersion:2}});if(p._action==='partySubmit'&&failNext){failNext=false;return r.abort();}await r.fulfill({json:env.post(p)});});
 await page.goto('http://localhost/index.html');await page.getByRole('link',{name:/11\/14 빼빼로 데이 파티/}).waitFor();assert((await page.locator('.party-link').textContent()).includes('여자 마감'));
 if(process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/home-party.png'});
 await page.locator('.party-link').click();await page.locator('.party-poster').waitFor();assert.equal(await page.locator('.party-poster').count(),1);assert.equal(await page.locator('.party-information,.poster-slot,.support').count(),0);assert(await page.locator('.party-poster').evaluate(img=>img.complete&&img.naturalWidth>0));
 if(process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/party-posters.png'});
 await page.locator('#startParty').click();await page.getByRole('radio',{name:/여성/}).waitFor();assert.equal(await page.getByRole('radio',{name:/여성/}).isEnabled(),false);
 if(process.env.SCREENSHOT_DIR)await page.screenshot({path:process.env.SCREENSHOT_DIR+'/party-gender.png'});
 await page.getByRole('radio',{name:'남성',exact:true}).click();await page.locator('[data-key=이름]').fill('김테스트');await page.locator('[data-key=이름]').press('Enter');
 await page.locator('[data-key=출생연도]').fill('2099');await page.locator('#next').click();assert((await page.locator('#error').textContent()).includes('출생연도'));await page.locator('[data-key=출생연도]').fill('1998');await page.locator('#next').click();
 await page.locator('[data-key=자기소개]').fill('IT 회사에서 일하고, 대화를 좋아해요.');await page.reload();assert.equal(await page.locator('[data-key=자기소개]').inputValue(),'IT 회사에서 일하고, 대화를 좋아해요.');await page.locator('#next').click();
 await page.locator('[data-key=연락처]').fill('bad');await page.locator('#next').click();assert((await page.locator('#error').textContent()).includes('연락처')||(await page.locator('#error').textContent()).includes('이메일'));await page.locator('[data-key=연락처]').fill('party@example.com');await page.locator('#next').click();
 await page.locator('#next').click();assert((await page.locator('#error').textContent()).includes('동의'));await page.locator('[data-key=개인정보동의]').check();await page.locator('#next').click();await page.locator('.review-step').waitFor();
 assert.equal(await page.locator('.summary>div').count(),5);await page.getByRole('button',{name:'이름 수정',exact:true}).click();await page.locator('[data-key=이름]').fill('김파티');await page.locator('#next').click();await page.locator('.review-step').waitFor();
 await page.locator('#next').click();await page.waitForFunction(()=>document.querySelector('#next')?.textContent==='다시 신청하기');assert((await page.locator('.summary').textContent()).includes('김파티'));
 await page.locator('#next').click();await page.getByRole('heading',{name:'파티 신청이 접수됐어요.',exact:true}).waitFor();
 const attempts=sent.filter(p=>p._action==='partySubmit');assert.equal(attempts.length,2);assert.equal(attempts[0].신청ID,attempts[1].신청ID);assert.equal(env.tab('파티신청')._data.length,3);assert.equal(env.tab('신청')._data.length,1);
 await page.reload();await page.getByRole('heading',{name:'파티 신청이 접수됐어요.',exact:true}).waitFor();
 // A legacy deployed server must never yield a false success.
 oldServer=true;await page.evaluate(()=>sessionStorage.clear());await page.goto('http://localhost/party.html?view=apply');
 await page.getByRole('radio',{name:'남성',exact:true}).click();for(const [key,value]of Object.entries({이름:'연동검증',출생연도:'1998',자기소개:'정상 입력',연락처:'01012345678'})){await page.locator('[data-key="'+key+'"]').fill(value);await page.locator('#next').click();}
 await page.locator('[data-key=개인정보동의]').check();await page.locator('#next').click();const before=sent.filter(p=>p._action==='partySubmit').length;await page.locator('#next').click();await page.getByText(/파티 신청 서버가 아직 연결되지/).waitFor();assert.equal(sent.filter(p=>p._action==='partySubmit').length,before);
 const beforeDemo=sent.length;await page.goto('http://localhost/party.html?demo=1&view=apply');await page.getByRole('radio',{name:'남성',exact:true}).click();for(const [key,value]of Object.entries({이름:'체험',출생연도:'1998',자기소개:'테스트',연락처:'01012345678'})){await page.locator('[data-key="'+key+'"]').fill(value);await page.locator('#next').click();}await page.locator('[data-key=개인정보동의]').check();await page.locator('#next').click();await page.locator('#next').click();await page.getByRole('heading',{name:'신청 체험을 마쳤어요.'}).waitFor();assert.equal(sent.length,beforeDemo);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);await context.close();
 console.log('PASS: event-specific home link, supplied poster only + CTA, female closure in UI and server, 5-field wizard, validation, resume, review edit, email/phone, consent, no false success on legacy server, separate party sheet, formula escaping, idempotent retry, pool migration isolation, demo isolation and responsive widths.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
