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

  syncHandler = localDB.sync(remoteDB, {
    live: true,
    retry: true
  })
  .on('change', () => console.log('[Sync] Changed'))
  .on('paused', () => console.log('[Sync] Paused'))
  .on('active', () => console.log('[Sync] Active'))
  .on('error', (err) => console.error('[Sync] Error:', err));

  return syncHandler;
}