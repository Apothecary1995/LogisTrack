import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';

PouchDB.plugin(PouchDBFind);

export const localDB = new PouchDB('logistrack');

const COUCHDB_URL  = import.meta.env.VITE_COUCHDB_URL  || 'https://couchdb.ahmetcengiz.dev';
const COUCHDB_USER = import.meta.env.VITE_COUCHDB_USER || 'logistrack';
const COUCHDB_PASS = import.meta.env.VITE_COUCHDB_PASS || 'logistrack_pass';

const remoteDB = new PouchDB(`${COUCHDB_URL}/trips`, {
  auth: { username: COUCHDB_USER, password: COUCHDB_PASS },
});

let syncHandler = null;

export function startSync() {
  if (syncHandler) return;

  console.log('[PouchDB] Starting sync...');

  syncHandler = localDB
    .sync(remoteDB, { live: true, retry: true })
    .on('change',  (info) => console.log('[Sync] Changed:', info))
    .on('paused',  ()     => console.log('[Sync] Paused'))
    .on('active',  ()     => console.log('[Sync] Active'))
    .on('error',   (err)  => console.error('[Sync] Error:', err));

  return syncHandler;
}

// Offline fallback 
export async function getLocalVehicles() {
  try {
    const result = await localDB.allDocs({ include_docs: true });
    return result.rows
      .map(r => r.doc)
      .filter(d => d.type === 'vehicle')
      .map(d => d.data);
  } catch {
    return [];
  }
}

export async function getLocalTrips() {
  try {
    const result = await localDB.allDocs({ include_docs: true });
    return result.rows
      .map(r => r.doc)
      .filter(d => d.type === 'trip')
      .map(d => d.data);
  } catch {
    return [];
  }
}