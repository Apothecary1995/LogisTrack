
const PouchDBLib = window.PouchDB;

if (PouchDBLib) {
  PouchDBLib.plugin(window.PouchDBFind || {});
}

export const localDB = PouchDBLib ? new PouchDBLib('logistrack') : null;

const remoteDB = PouchDBLib ? new PouchDBLib('https://couchdb.ahmetcengiz.dev/trips', {
  auth: {
    username: 'logistrack',
    password: 'logistrack_pass'
  }
}) : null;

let syncHandler = null;

export function startSync() {
  if (!localDB || !remoteDB) {
    console.error('[PouchDB] Not loaded!');
    return;
  }
  if (syncHandler) return;

  console.log('[PouchDB] Starting sync...');

  syncHandler = localDB.sync(remoteDB, {
    live: true,
    retry: true
  })
  .on('change', (info) => console.log('[Sync] Changed:', info))
  .on('paused', () => console.log('[Sync] Paused'))
  .on('active', () => console.log('[Sync] Active'))
  .on('error', (err) => console.error('[Sync] Error:', err));

  window.__pouchDB = localDB;
  window.__syncHandler = syncHandler;

  return syncHandler;
}