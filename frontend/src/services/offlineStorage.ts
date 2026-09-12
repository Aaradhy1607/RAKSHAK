/**
 * IndexedDB Offline Storage Service for Citizen Reports & SOS Beacons
 * Enables true offline-first functionality in remote NER mountainous areas.
 */

const DB_NAME = "NER_Landslide_PWA_DB";
const DB_VERSION = 1;
const STORE_REPORTS = "offline_reports";
const STORE_SOS = "offline_sos";

export interface OfflineCitizenReport {
  id: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  accuracy_m: number;
  district: string;
  state: string;
  reporter_name: string;
  reporter_phone: string;
  createdAt: string;
  synced: boolean;
}

export interface OfflineSOS {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number;
  emergency_type: string;
  message: string;
  people_affected: number;
  contact_phone: string;
  district: string;
  state: string;
  createdAt: string;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SOS)) {
        db.createObjectStore(STORE_SOS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineReport(report: OfflineCitizenReport): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REPORTS, "readwrite");
    const store = tx.objectStore(STORE_REPORTS);
    const req = store.put(report);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getUnsyncedReports(): Promise<OfflineCitizenReport[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REPORTS, "readonly");
    const store = tx.objectStore(STORE_REPORTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as OfflineCitizenReport[]).filter(r => !r.synced);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function markReportSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REPORTS, "readwrite");
    const store = tx.objectStore(STORE_REPORTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineSOS(sos: OfflineSOS): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SOS, "readwrite");
    const store = tx.objectStore(STORE_SOS);
    const req = store.put(sos);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getUnsyncedSOS(): Promise<OfflineSOS[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SOS, "readonly");
    const store = tx.objectStore(STORE_SOS);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result as OfflineSOS[]).filter(s => !s.synced);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function markSOSSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SOS, "readwrite");
    const store = tx.objectStore(STORE_SOS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
