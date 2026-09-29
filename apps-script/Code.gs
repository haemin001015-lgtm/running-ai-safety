/**
 * 청년러닝방범대 · AI 생활안전망 팀 저장소
 * 구글 시트에 제보를 모으는 Apps Script 웹앱입니다.
 * 배포: 배포 > 새 배포 > 웹 앱 (실행: 나, 액세스: 모든 사용자)
 *
 * 앱 주소는 공개되므로 웹앱 주소도 사실상 공개입니다. 그래서:
 *  - pull 응답에는 휴대폰 뒷 4자리를 내려보내지 않고, 남의 이름은 홍*동으로 가립니다.
 *  - 이미 저장된 제보는 덮어쓰지 않습니다. 진행 단계만 앞으로 갈 수 있습니다.
 *  - 사진은 내 드라이브 비공개 폴더에 저장되고, 시트에는 링크만 남습니다.
 * 시트 원본에는 실명·뒷 4자리가 그대로 저장되니 크루장 확인에는 지장이 없습니다.
 */
var SHEET_NAME = '제보';
var RUN_SHEET  = '순찰';
var PHOTO_FOLDER_NAME = '청년러닝방범대_제보사진';   // 없으면 내 드라이브에 자동으로 만듭니다
var PHOTO_PUBLIC = false;      // true로 바꾸면 링크 아는 사람 모두 열람 (권장하지 않음)

var MAX_ROWS  = 300;           // 한 번에 받을 수 있는 행 수
var MAX_MEMO  = 1000;          // 메모 글자 수
var MAX_PHOTO = 8 * 1024 * 1024;

var HEAD = ['id','일시','대원','뒷4자리','기기','위도','경도','정확도','지점','유형','메모','상태','사진','수정시각','코스'];
var RUN_HEAD = ['id','일시','대원','뒷4자리','기기','코스','시간(분)','거리(km)','제보수','특이사항','수정시각'];

function sheet_()    { return tab_(SHEET_NAME, HEAD); }
function runSheet_() { return tab_(RUN_SHEET, RUN_HEAD); }
function tab_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  if (sh.getLastRow() === 0) { sh.appendRow(head); sh.setFrozenRows(1); }
  else if (sh.getLastColumn() < head.length) {
    sh.getRange(1, 1, 1, head.length).setValues([head]);
  }
  return sh;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() {
  return ContentService.createTextOutput('AI 생활안전망 팀 저장소가 동작 중입니다.');
}
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.action === 'ping') return out_({ ok: true, sheet: SHEET_NAME, count: Math.max(0, sheet_().getLastRow() - 1) });
    if (req.action === 'push') return out_({ ok: true, saved: push_(req.reports || []), runs: pushRuns_(req.patrols || []) });
    if (req.action === 'pull') {
      var me = req.me || {};
      return out_({ ok: true, reports: pull_(me), patrols: pullRuns_(me) });
    }
    return out_({ ok: false, error: 'unknown-action' });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

/* ── 값 정리 ── */
function str_(v, max) { var s = (v == null ? '' : String(v)); return max ? s.slice(0, max) : s.slice(0, 200); }
function num_(v) { var n = Number(v); return isFinite(n) ? n : ''; }
function coord_(v, lim) { var n = Number(v); return (isFinite(n) && Math.abs(n) <= lim) ? n : ''; }
function isMine_(name, tail, me) {
  if (!me || !me.name) return false;
  return String(name) === String(me.name) && String(tail) === String(me.tail || '');
}
/** 남의 이름은 가운데를 가립니다. 홍길동 → 홍*동, 김민 → 김*  */
function mask_(name) {
  var s = String(name || '').trim();
  if (!s) return '대원';
  if (s.length === 1) return s;
  if (s.length === 2) return s.charAt(0) + '*';
  return s.charAt(0) + new Array(s.length - 1).join('*') + s.charAt(s.length - 1);
}

/* ── 제보 저장 ── */
function push_(reports) {
  if (!reports.length) return 0;
  var rows = reports.slice(0, MAX_ROWS);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    var last = sh.getLastRow();
    var ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    var now = new Date();
    var added = 0;
    rows.forEach(function (r) {
      var id = str_(r.id, 60);
      if (!id) return;
      var i = ids.indexOf(id);

      if (i === -1) {                                   // 새 제보 — 그대로 저장
        var photo = r.photo ? savePhoto_(id, r.photo) : '';
        sh.appendRow([id, str_(r.at, 40), str_(r.name, 30), str_(r.tail, 8), str_(r.device, 40),
                      coord_(r.lat, 90), coord_(r.lon, 180), num_(r.acc),
                      str_(r.spot, 120), str_(r.type, 40), str_(r.memo, MAX_MEMO),
                      Math.min(3, Math.max(0, Number(r.st) || 0)), photo, now, str_(r.course, 40)]);
        ids.push(id); added++;
        return;
      }

      // 이미 있는 제보 — 내용은 건드리지 않습니다. 진행 단계는 앞으로만, 사진은 비어 있을 때만 채웁니다.
      var range = sh.getRange(i + 2, 1, 1, HEAD.length);
      var cur = range.getValues()[0];
      var st = Math.max(Number(cur[11]) || 0, Math.min(3, Math.max(0, Number(r.st) || 0)));
      var changed = false;
      if (st !== (Number(cur[11]) || 0)) { sh.getRange(i + 2, 12).setValue(st); changed = true; }
      if (!cur[12] && r.photo) {
        var late = savePhoto_(id, r.photo);
        if (late) { sh.getRange(i + 2, 13).setValue(late); changed = true; }
      }
      if (changed) sh.getRange(i + 2, 14).setValue(now);
    });
    return added;
  } finally { lock.releaseLock(); }
}

/* ── 순찰 기록 저장 (이미 있는 id는 건너뜀) ── */
function pushRuns_(runs) {
  if (!runs.length) return 0;
  var rows = runs.slice(0, MAX_ROWS);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = runSheet_();
    var last = sh.getLastRow();
    var ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); }) : [];
    var now = new Date(), added = 0;
    rows.forEach(function (p) {
      var id = str_(p.id, 60);
      if (!id || ids.indexOf(id) > -1) return;
      sh.appendRow([id, str_(p.at, 40), str_(p.name, 30), str_(p.tail, 8), str_(p.device, 40), str_(p.course, 40),
                    Number(p.mins) || 0, Number(p.km) || 0, Number(p.reports) || 0, str_(p.note, 200), now]);
      ids.push(id); added++;
    });
    return added;
  } finally { lock.releaseLock(); }
}

/* ── 사진: 내 드라이브 비공개 폴더에 저장하고 링크만 시트에 ── */
function photoFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PHOTO_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* 지워졌으면 새로 */ } }
  var it = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  var f = it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER_NAME);
  props.setProperty('PHOTO_FOLDER_ID', f.getId());
  return f;
}
function savePhoto_(id, dataUrl) {
  try {
    var s = String(dataUrl);
    if (s.length > MAX_PHOTO) return '';
    var m = s.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/);
    if (!m) return '';
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], id + '.jpg');
    var file = photoFolder_().createFile(blob);
    if (PHOTO_PUBLIC) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) { return ''; }
}

/* ── 내려보내기: 뒷 4자리 제외, 남의 이름은 가림 ── */
function pull_(me) {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HEAD.length).getValues();
  return vals.filter(function (v) { return v[0]; }).map(function (v) {
    var mine = isMine_(v[2], v[3], me);
    return { id: v[0], at: v[1] instanceof Date ? v[1].toISOString() : String(v[1]),
             name: mine ? v[2] : mask_(v[2]), mine: mine,
             lat: v[5], lon: v[6], acc: v[7], spot: v[8], type: v[9], memo: v[10],
             st: Number(v[11]) || 0, photo: '', course: v[14] || '' };
  });
}
function pullRuns_(me) {
  var sh = runSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, RUN_HEAD.length).getValues();
  return vals.filter(function (v) { return v[0]; }).map(function (v) {
    var mine = isMine_(v[2], v[3], me);
    return { id: v[0], at: v[1] instanceof Date ? v[1].toISOString() : String(v[1]),
             name: mine ? v[2] : mask_(v[2]), mine: mine,
             course: v[5], mins: Number(v[6]) || 0, km: Number(v[7]) || 0,
             reports: Number(v[8]) || 0, note: v[9] || '' };
  });
}
