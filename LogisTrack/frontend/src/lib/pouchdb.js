import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';

PouchDB.plugin(PouchDBFind);

export const localDB = new PouchDB('logistrack');

const remoteDB = new PouchDB('https://couchdb.ahmetcengiz.dev/trips', {
  auth: {
    username: 'logistrack',
    password: 'logistrack_pass'
  }
});

let syncHandler = null;

export function startSync() {
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

  // Global expose for debugging
  window.__pouchDB = localDB;
  window.__syncHandler = syncHandler;

  return syncHandler;
}