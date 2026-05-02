/**
 * In-Memory Firestore Mock
 * Used in DEMO_MODE for local testing without GCP credentials.
 * Implements the Firestore API surface used by the app.
 */

// ─── In-Memory Data Store ──────────────────────────────────────────────────
const store = {};

function getCollection(path) {
  if (!store[path]) store[path] = {};
  return store[path];
}

function buildDocRef(collPath, docId) {
  return {
    id: docId,
    get: async () => {
      const col = getCollection(collPath);
      const data = col[docId];
      return {
        exists: !!data,
        id: docId,
        data: () => data ? { ...data } : undefined,
        ref: buildDocRef(collPath, docId),
      };
    },
    set: async (data) => {
      getCollection(collPath)[docId] = { ...data };
    },
    update: async (data) => {
      const col = getCollection(collPath);
      if (!col[docId]) col[docId] = {};
      Object.assign(col[docId], data);
    },
    delete: async () => {
      const col = getCollection(collPath);
      delete col[docId];
    },
    collection: (subName) => buildCollectionRef(`${collPath}/${docId}/${subName}`),
  };
}

function buildCollectionRef(path) {
  return {
    doc: (docId) => buildDocRef(path, docId),

    where: (field, op, value) => buildQuery(path, [{ field, op, value }]),

    orderBy: (field, direction) => buildQuery(path, [], { field, direction }),

    limit: (n) => buildQuery(path, [], null, n),

    get: async () => {
      const col = getCollection(path);
      const docs = Object.entries(col).map(([id, data]) => ({
        id,
        data: () => ({ ...data }),
        ref: buildDocRef(path, id),
      }));
      return { docs, empty: docs.length === 0, size: docs.length };
    },

    add: async (data) => {
      const id = `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      getCollection(path)[id] = { ...data };
      return buildDocRef(path, id);
    },
  };
}

function buildQuery(path, filters = [], orderByOpt = null, limitOpt = null) {
  const self = {
    _filters: filters,
    _orderBy: orderByOpt,
    _limit: limitOpt,

    where: (field, op, value) => {
      return buildQuery(path, [...filters, { field, op, value }], orderByOpt, limitOpt);
    },

    orderBy: (field, direction) => {
      return buildQuery(path, filters, { field, direction }, limitOpt);
    },

    limit: (n) => {
      return buildQuery(path, filters, orderByOpt, n);
    },

    get: async () => {
      const col = getCollection(path);
      let entries = Object.entries(col);

      // Apply filters
      for (const f of filters) {
        entries = entries.filter(([, data]) => {
          const val = data[f.field];
          switch (f.op) {
            case '==': return val === f.value;
            case '!=': return val !== f.value && val !== null && val !== undefined;
            case '<':  return val < f.value;
            case '<=': return val <= f.value;
            case '>':  return val > f.value;
            case '>=': return val >= f.value;
            default:   return true;
          }
        });
      }

      // Apply orderBy
      if (orderByOpt) {
        entries.sort(([, a], [, b]) => {
          const va = a[orderByOpt.field];
          const vb = b[orderByOpt.field];
          if (va < vb) return orderByOpt.direction === 'desc' ? 1 : -1;
          if (va > vb) return orderByOpt.direction === 'desc' ? -1 : 1;
          return 0;
        });
      }

      // Apply limit
      if (limitOpt) {
        entries = entries.slice(0, limitOpt);
      }

      const docs = entries.map(([id, data]) => ({
        id,
        data: () => ({ ...data }),
        ref: buildDocRef(path, id),
      }));

      return { docs, empty: docs.length === 0, size: docs.length };
    },
  };

  return self;
}

// ─── Mock Batch Writer ─────────────────────────────────────────────────────
function buildBatch() {
  const ops = [];
  return {
    set: (ref, data) => ops.push(() => ref.set(data)),
    update: (ref, data) => ops.push(() => ref.update(data)),
    delete: (ref) => ops.push(() => ref.delete()),
    commit: async () => {
      for (const op of ops) await op();
    },
  };
}

// ─── Mock Firestore DB ─────────────────────────────────────────────────────
const mockDb = {
  collection: (name) => buildCollectionRef(name),
  batch: () => buildBatch(),
  settings: () => {},
};

// ─── Mock FCM Messaging ────────────────────────────────────────────────────
const mockMessaging = {
  send: async (message) => {
    console.log('[DEMO FCM] Would send notification:', message.notification?.title);
    return `mock-message-id-${Date.now()}`;
  },
};

module.exports = { mockDb, mockMessaging };
