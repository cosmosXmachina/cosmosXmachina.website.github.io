const DATABASE = "cosmos-creation-lab";
const STORE = "demo-state";
const KEY = "operations-hub";
const SCHEMA = 1;
const MAX_ORDERS = 50;

function validOrder(order) {
  return order && typeof order === "object" && typeof order.id === "string" && order.id.length <= 24 &&
    typeof order.customer === "string" && order.customer.length <= 120 && Number.isFinite(order.value) &&
    ["review", "packing", "blocked", "shipped"].includes(order.status) &&
    ["operations", "sales", "warehouse"].includes(order.owner) && typeof order.note === "string" && order.note.length <= 500;
}

export function validateOperationsRecord(record) {
  if (!record || record.schema !== SCHEMA || !Array.isArray(record.orders) || !record.orders.length || record.orders.length > MAX_ORDERS || !record.orders.every(validOrder)) {
    throw new Error("Stored Operations Hub state is invalid or belongs to an unsupported schema.");
  }
  return structuredClone(record.orders);
}

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB could not be opened."));
    request.onblocked = () => reject(new Error("IndexedDB upgrade is blocked."));
  });
}

function transact(mode, operation) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try { result = operation(store); } catch (error) { database.close(); reject(error); return; }
    transaction.oncomplete = () => { database.close(); resolve(result?.result); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error("IndexedDB transaction failed.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error || new Error("IndexedDB transaction was aborted.")); };
  }));
}

export async function loadOperationsState(fallback) {
  try {
    const record = await transact("readonly", (store) => store.get(KEY));
    if (!record) return { orders: structuredClone(fallback), recovered: false, persistent: true };
    return { orders: validateOperationsRecord(record), recovered: false, persistent: true };
  } catch (error) {
    await clearOperationsState().catch(() => {});
    return { orders: structuredClone(fallback), recovered: true, persistent: false, error };
  }
}

export async function saveOperationsState(orders) {
  const record = { schema: SCHEMA, updatedAt: new Date().toISOString(), orders: structuredClone(orders) };
  validateOperationsRecord(record);
  await transact("readwrite", (store) => store.put(record, KEY));
}

export function clearOperationsState() {
  return transact("readwrite", (store) => store.delete(KEY));
}

export const operationsStoreInternals = { DATABASE, KEY, SCHEMA, STORE };
