/**
 * 청년러닝방범대 · AI 생활안전망 팀 저장소
 * 구글 시트에 제보를 모으는 Apps Script 웹앱입니다.
 * 배포: 배포 > 새 배포 > 웹 앱 (실행: 나, 액세스: 모든 사용자)
 * 앱에 이 웹앱 주소가 들어 있어, 대원은 주소만 열면 바로 기록됩니다.
 * 별도의 키는 쓰지 않습니다. 외부 장난 기록이 생기면 새 주소로 재배포해 차단하세요.
 */
var SHEET_NAME = '제보';
var PHOTO_FOLDER_ID = '';       // 사진을 드라이브에 저장하려면 폴더 ID 입력 (선택)

var HEAD = ['id','일시','대원','조','기기','위도','경도','정확도','지점','유형','메모','상태','사진','수정시각','코스'];
var RUN_SHEET = '순찰';
var RUN_HEAD = ['id','일시','대원','조','기기','코스','시간(분)','거리(km)','수정시각'];

function sheet_() { return tab_(SHEET_NAME, HEAD); }
function runSheet_() { return tab_(RUN_SHEET, RUN_HEAD); }
function tab_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  if (sh.getLastRow() === 0) { sh.appendRow(head); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < head.length) {                 // 열이 늘어난 경우 제목만 보완
    sh.getRange(1, 1, 1, head.length).setValues([head]);
  }
  return sh;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  return ContentService.createTextOutput('AI 생활안전망 팀 저장소가 동작 중입니다. 앱 설정에 이 주소를 붙여넣으세요.');
}
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.action === 'ping') return out_({ ok: true, sheet: SHEET_NAME, count: Math.max(0, sheet_().getLastRow() - 1) });
    if (req.action === 'push') return out_({ ok: true, saved: push_(req.reports || []), runs: pushRuns_(req.patrols || []) });
    if (req.action === 'pull') return out_({ ok: true, reports: pull_() });
    return out_({ ok: false, error: 'unknown-action' });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}
function push_(reports) {
  if (!reports.length) return 0;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    var last = sh.getLastRow();
    var ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    var now = new Date();
    var added = 0;
    reports.forEach(function (r) {
      var photo = r.photo ? savePhoto_(r) : '';
      var row = [r.id, r.at, r.name, r.crew, r.device, r.lat, r.lon, r.acc, r.spot, r.type, r.memo, Number(r.st) || 0, photo, now, r.course || ''];
      var i = ids.indexOf(String(r.id));
      if (i === -1) { sh.appendRow(row); ids.push(String(r.id)); added++; }
      else {
        var target = sh.getRange(i + 2, 1, 1, HEAD.length);
        var cur = target.getValues()[0];
        if (!photo) row[12] = cur[12];               // 사진은 이미 저장된 값 유지
        row[11] = Math.max(Number(cur[11]) || 0, Number(r.st) || 0); // 상태는 진행된 쪽 유지
        target.setValues([row]);
      }
    });
    return added;
  } finally { lock.releaseLock(); }
}
function pushRuns_(runs) {
  if (!runs.length) return 0;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = runSheet_();
    var last = sh.getLastRow();
    var ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    var now = new Date(), added = 0;
    runs.forEach(function (p) {
      if (ids.indexOf(String(p.id)) > -1) return;               // 이미 저장된 순찰은 건너뜀
      sh.appendRow([p.id, p.at, p.name, p.crew, p.device, p.course, Number(p.mins) || 0, Number(p.km) || 0, now]);
      ids.push(String(p.id)); added++;
    });
    return added;
  } finally { lock.releaseLock(); }
}
function savePhoto_(r) {
  if (!PHOTO_FOLDER_ID) return '';
  try {
    var m = String(r.photo).match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) return '';
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], r.id + '.jpg');
    var file = DriveApp.getFolderById(PHOTO_FOLDER_ID).createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) { return ''; }
}
function pull_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HEAD.length).getValues();
  return vals.filter(function (v) { return v[0]; }).map(function (v) {
    return { id: v[0], at: v[1] instanceof Date ? v[1].toISOString() : String(v[1]), name: v[2], crew: v[3], device: v[4],
             lat: v[5], lon: v[6], acc: v[7], spot: v[8], type: v[9], memo: v[10], st: Number(v[11]) || 0, photo: '', course: v[14] || '' };
  });
}
