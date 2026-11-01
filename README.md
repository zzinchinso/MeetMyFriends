# MeetMyFriends

## Applicant history and profile management

The public page supports application history lookup with the applicant's name, mobile number, and a password set during submission. Applicants can open any matching application, edit it (the existing spreadsheet row is updated), or withdraw it (the row's status becomes `철회`). Passwords are stored as salted, iterated HMAC hashes in the `비밀번호솔트` and `비밀번호해시` columns; the raw password is not saved.

### Deploying the Apps Script update

The frontend and `server/Code.gs` must be deployed together. The repository does not contain a linked Apps Script project, so publishing the GitHub Pages files alone will not update the form backend.

1. Open the Google Sheet's linked Apps Script project and replace its code with `server/Code.gs`.
2. Run `setup()` once. Existing application rows are preserved; the two password-hash columns are added automatically.
3. In **Deploy → Manage deployments**, edit the existing web app deployment, select **New version**, and deploy so its URL stays the same.
4. Open the web app URL and confirm its JSON response includes `accountAccess: true`.
5. Publish the site changes to GitHub Pages.

Applicants who still have their previous receipt open in that browser can open **내 정보 보기** and set a password from the profile screen. An applicant without that receipt must use the account recovery channel provided by the operator; name and phone alone are not accepted as proof of ownership.


## 11/14 파티 신청

- 홈의 `11/14 빼빼로 데이 파티`에서 `party.html`로 이동합니다. 상세 화면은 제공된 포스터와 신청하기 버튼으로 구성됩니다.
- 포스터 목록은 `party-config.js`의 `PARTY_EVENT.posters`입니다. 두 번째 이미지가 준비되면 여기에 파일 경로와 설명을 추가합니다.
- 약식 신청은 성별, 이름, 출생연도, 자기소개, 연락처(휴대폰 또는 이메일), 필수 수집·이용 동의를 받습니다. 풀 등록과 별개의 신청입니다.
- 여성 마감은 현재 화면 설정과 서버 `PARTY_EVENTS` 양쪽에 적용되어 있습니다. 모집 상태를 바꿀 때 두 곳을 함께 갱신합니다.
- 서버의 `_action: partySubmit`은 같은 스프레드시트의 `파티신청` 탭을 자동으로 만듭니다. `파티신청ID`로 재시도를 중복 저장하지 않고, 풀 이전 작업에서 이 탭을 제외합니다. 참가 승인과 결제는 별도 운영 절차입니다.

### 실제 접수 연결에 필요한 배포

새 파티 저장 기능은 로컬 서버 코드에 추가된 상태입니다. 프런트엔드만 게시하면 기존 Apps Script 배포에는 파티 기능이 생기지 않습니다.

1. 기존 웹 앱의 Apps Script 편집기에서 `server/Code.gs` 전체를 반영합니다.
2. 배포 관리에서 기존 웹 앱을 새 버전으로 업데이트하여 주소를 유지합니다.
3. capabilities 응답의 `partyApplications: true`를 확인합니다.
4. 파티 제출이 `파티신청` 탭에 저장되고 기존 `신청` 탭을 건드리지 않는지 확인합니다.

기존 서버가 파티 기능을 지원하지 않으면 신청서는 성공으로 표시하지 않고 입력을 보존한 채 연결 안내를 보여줍니다. `?demo=1`은 서버로 전송하지 않습니다.

검증: `node tests/party.cjs` (Playwright 필요). 기존 풀 흐름은 `node tests/form.cjs`로 확인합니다.
