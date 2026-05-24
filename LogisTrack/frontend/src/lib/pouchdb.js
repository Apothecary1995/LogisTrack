let _localDB = null;
let _remoteDB = null;
let _initialized = false;

async function initPouchDB() {
  try {
    const { default: PouchDB } = await import('pouchdb-browser');
    const { default: PouchDBFind } = await import('pouchdb-find');

    PouchDB.plugin(PouchDBFind);

    _localDB = new PouchDB('logistrack');

    const COUCHDB_URL  = import.meta.env.VITE_COUCHDB_URL  || 'https://couchdb.ahmetcengiz.dev';
    const COUCHDB_USER = import.meta.env.VITE_COUCHDB_USER || 'logistrack';
    const COUCHDB_PASS = import.meta.env.VITE_COUCHDB_PASS || 'logistrack_pass';

    _remoteDB = new PouchDB(`${COUCHDB_URL}/trips`, {
      auth: { username: COUCHDB_USER, password: COUCHDB_PASS },
    });

    _initialized = true;
    console.log('[PouchDB] Initialized');
  } catch (err) {
    console.warn('[PouchDB] Init failed, offline sync disabled:', err.message);
  }
}

const initPromise = initPouchDB();

export function getLocalDB() {
  return _localDB;
}

let syncHandler = null;

export async function startSync() {
  await initPromise;
  if (!_initialized || !_localDB || !_remoteDB || syncHandler) return;

  console.log('[PouchDB] Starting sync...');
  syncHandler = _localDB
    .sync(_remoteDB, { live: true, retry: true })
    .on('change',  (info) => console.log('[Sync] Changed:', info))
    .on('paused',  ()     => console.log('[Sync] Paused'))
    .on('active',  ()     => console.log('[Sync] Active'))
    .on('error',   (err)  => console.error('[Sync] Error:', err));

  return syncHandler;
}

export async function getLocalVehicles() {
  await initPromise;
  if (!_localDB) return [];
  try {
    const result = await _localDB.allDocs({ include_docs: true });
    return result.rows
      .map(r => r.doc)
      .filter(d => d && d.type === 'vehicle')
      .map(d => d.data);
  } catch {
    return [];
  }
}

export async function getLocalTrips() {
  await initPromise;
  if (!_localDB) return [];
  try {
    const result = await _localDB.allDocs({ include_docs: true });
    return result.rows
      .map(r => r.doc)
      .filter(d => d && d.type === 'trip')
      .map(d => d.data);
  } catch {
    return [];
  }
}