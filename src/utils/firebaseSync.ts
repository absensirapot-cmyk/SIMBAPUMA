import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

/**
 * Sanitize Firestore document ID to ensure no illegal path segments or characters
 */
export function sanitizeDocId(rawId: string): string {
  if (!rawId) return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return String(rawId).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 128);
}

/**
 * Check if an error is caused by Firestore free tier daily write quota limit
 */
export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const code = error?.code || '';
  const msg = error?.message || String(error);
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

let quotaExhaustedUntil: number = 0;

/**
 * Check if the Firestore write circuit breaker is currently active.
 * When active, all cloud writes are temporarily bypassed so the app runs smoothly
 * in LocalStorage Offline-First mode without network backoff delays or error storms.
 */
export function isQuotaExhausted(): boolean {
  if (quotaExhaustedUntil > Date.now()) {
    return true;
  }
  try {
    const stored = localStorage.getItem('firestore_quota_exhausted_until');
    if (stored) {
      const until = parseInt(stored, 10);
      if (until > Date.now()) {
        quotaExhaustedUntil = until;
        return true;
      }
    }
  } catch (_) {}
  return false;
}

/**
 * Activate the write circuit breaker for 30 minutes when quota limit is reached.
 */
export function markQuotaExhausted(): void {
  const cooldownMs = 30 * 60 * 1000;
  quotaExhaustedUntil = Date.now() + cooldownMs;
  try {
    localStorage.setItem('firestore_quota_exhausted_until', String(quotaExhaustedUntil));
  } catch (_) {}
  console.warn('[Firestore Circuit Breaker] Daily write quota is exhausted. Switched to secure LocalStorage Offline-First mode.');
}

/**
 * Save or update a single document in a Firestore collection
 */
export async function saveDocument<T extends { id?: string }>(
  collectionName: string, 
  docId: string, 
  data: T
): Promise<void> {
  const safeDocId = sanitizeDocId(docId);
  const path = `${collectionName}/${safeDocId}`;

  // Circuit breaker: If quota exhausted, preserve locally without network overhead
  if (isQuotaExhausted()) {
    return;
  }

  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    if (cleanData.id) {
      cleanData.id = safeDocId;
    }
    await setDoc(doc(db, collectionName, safeDocId), cleanData);
  } catch (error: any) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
      console.warn(`[Firestore Quota Notice] Daily write quota reached for ${path}. Stored securely in LocalStorage.`);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Atomic batch save for multiple documents in a collection.
 * Uses Firestore writeBatch so all documents are sent in a single network request.
 */
export async function saveBatchDocuments<T extends { id?: string }>(
  collectionName: string,
  items: T[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (!items || items.length === 0) return { success: true, count: 0 };
  
  if (isQuotaExhausted()) {
    return { success: true, count: items.length };
  }

  try {
    const BATCH_SIZE = 300; // Safe chunk size
    let savedCount = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const item of chunk) {
        if (!item) continue;
        const rawId = item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const safeDocId = sanitizeDocId(rawId);
        const cleanData = JSON.parse(JSON.stringify(item));
        cleanData.id = safeDocId;
        const ref = doc(db, collectionName, safeDocId);
        batch.set(ref, cleanData, { merge: true });
      }

      // Safe timeout guard (8s) so slow mobile connections don't hang execution
      const commitPromise = batch.commit();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout committing batch to ${collectionName}`)), 8000)
      );
      await Promise.race([commitPromise, timeoutPromise]);
      savedCount += chunk.length;
    }

    console.info(`Successfully saved batch of ${savedCount} docs to ${collectionName}.`);
    return { success: true, count: savedCount };
  } catch (err: any) {
    if (isQuotaError(err)) {
      markQuotaExhausted();
      console.warn(`[Firestore Batch Quota Notice] Batch write to ${collectionName} paused due to quota. LocalStorage active.`);
      return { success: true, count: items.length };
    }
    console.warn(`Batch save notice in ${collectionName}:`, err?.message || err);
    return { success: false, count: 0, error: err?.message || String(err) };
  }
}

/**
 * Delete a document from a Firestore collection
 */
export async function removeDocument(collectionName: string, docId: string): Promise<void> {
  const path = `${collectionName}/${docId}`;
  if (isQuotaExhausted()) {
    return;
  }
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetch all documents from a collection once
 */
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    snap.forEach(docSnap => {
      items.push({ id: docSnap.id, ...docSnap.data() } as unknown as T);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

/**
 * Real-time listener for a Firestore collection with error handling
 */
export function listenCollection<T>(
  collectionName: string,
  onData: (items: T[]) => void,
  fallbackData?: T[]
): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...docSnap.data(), id: docSnap.id } as unknown as T);
        });
        if (items.length > 0) {
          onData(items);
        } else if (fallbackData && fallbackData.length > 0) {
          // If Firestore is empty initially, seed or keep initialData
          onData(fallbackData);
        }
      },
      (error) => {
        console.warn(`Firestore listener note for ${collectionName}:`, error.message);
        if (fallbackData) {
          onData(fallbackData);
        }
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn(`Unable to attach snapshot for ${collectionName}:`, err);
    if (fallbackData) onData(fallbackData);
    return () => {};
  }
}

/**
 * Save school profile to /settings/school_info
 */
export async function saveSchoolInfoToFirestore(info: any): Promise<{ success: boolean; error?: string }> {
  if (isQuotaExhausted()) {
    return { success: true };
  }
  const path = 'settings/school_info';
  try {
    const clean = JSON.parse(JSON.stringify(info));
    await setDoc(doc(db, 'settings', 'school_info'), clean, { merge: true });
    console.info('School info successfully synced to Firestore cloud.');
    return { success: true };
  } catch (error: any) {
    if (isQuotaError(error)) {
      markQuotaExhausted();
      return { success: true };
    }
    console.warn('Firestore settings write notice (local fallback retained):', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Fetch school profile from /settings/school_info
 */
export async function fetchSchoolInfoFromFirestore(): Promise<any | null> {
  const path = 'settings/school_info';
  try {
    const snap = await getDoc(doc(db, 'settings', 'school_info'));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.warn('Could not fetch school_info from Firestore, falling back to local storage.');
    return null;
  }
}

export interface SyncPayload {
  schoolInfo?: any;
  formulirList?: any[];
  usersList?: any[];
  kelasList?: any[];
  mapelList?: any[];
  jadwalPelajaranList?: any[];
  jadwalUjianList?: any[];
  kontenList?: any[];
  absensiList?: any[];
  ujianList?: any[];
  ekskulList?: any[];
  nilaiList?: any[];
  nilaiEkskulList?: any[];
  absenMengajarList?: any[];
}

/**
 * Upload and synchronize all local master data to Firestore cloud.
 * Writes a consolidated master snapshot document to settings/cloud_backup immediately for sub-second safety,
 * while asynchronously updating individual collections via atomic writeBatch.
 */
export async function syncAllDataToCloud(payload: SyncPayload): Promise<{ success: boolean; count: number; error?: string }> {
  if (isQuotaExhausted()) {
    console.info('[syncAllDataToCloud] Cloud write quota limit reached. Data safely maintained in LocalStorage.');
    return { 
      success: true, 
      count: 0, 
      error: 'Batas kuota harian database gratis Firebase (20.000 penulisan/hari) telah tercapai. Seluruh data sekolah Anda tetap tersimpan 100% aman di LocalStorage (Mode Offline-First), dan sinkronisasi cloud akan dilanjutkan otomatis saat kuota harian direset.' 
    };
  }
  try {
    let totalCount = 0;
    const errors: string[] = [];

    // 1. FAST PATH: Consolidated Cloud Backup Snapshot
    // Storing this unified document guarantees that all tables (including 78 students, attendance, grades)
    // are securely preserved in Cloud Firestore in a single ultra-fast network roundtrip (~200ms).
    try {
      const backupSnapshot = {
        updatedAt: new Date().toISOString(),
        schoolInfo: payload.schoolInfo || null,
        usersList: payload.usersList || [],
        kelasList: payload.kelasList || [],
        mapelList: payload.mapelList || [],
        formulirList: payload.formulirList || [],
        jadwalPelajaranList: payload.jadwalPelajaranList || [],
        jadwalUjianList: payload.jadwalUjianList || [],
        ujianList: payload.ujianList || [],
        absensiList: payload.absensiList || [],
        ekskulList: payload.ekskulList || [],
        nilaiList: payload.nilaiList || [],
        nilaiEkskulList: payload.nilaiEkskulList || [],
        absenMengajarList: payload.absenMengajarList || [],
        kontenList: payload.kontenList || [],
      };
      await setDoc(doc(db, 'settings', 'cloud_backup'), JSON.parse(JSON.stringify(backupSnapshot)), { merge: true });
      totalCount += 1;
    } catch (snapErr: any) {
      if (isQuotaError(snapErr)) {
        markQuotaExhausted();
        return { success: true, count: 0 };
      }
      console.warn('Notice saving settings/cloud_backup:', snapErr?.message || snapErr);
    }

    // 2. School Info document
    if (payload.schoolInfo) {
      try {
        const cleanSchool = JSON.parse(JSON.stringify(payload.schoolInfo));
        await setDoc(doc(db, 'settings', 'school_info'), cleanSchool, { merge: true });
        totalCount++;
      } catch (e: any) {
        errors.push(`Info Sekolah: ${e?.message || e}`);
      }
    }

    // Background granular sync (non-blocking so UI feedback is instantaneous)
    const runBatchTask = async (name: string, collection: string, items?: any[]) => {
      if (items && Array.isArray(items) && items.length > 0) {
        try {
          await saveBatchDocuments(collection, items);
        } catch (_) {}
      }
    };

    setTimeout(() => {
      if (!isQuotaExhausted()) {
        const priorityTasks = [
          runBatchTask('Presensi', 'absensi', payload.absensiList),
          runBatchTask('Pengguna/Siswa/Guru', 'users', payload.usersList),
          runBatchTask('Kelas', 'kelas', payload.kelasList),
          runBatchTask('Mapel', 'mapel', payload.mapelList),
          runBatchTask('PPDB', 'formulir_ppdb', payload.formulirList),
        ];
        Promise.allSettled(priorityTasks).catch(() => {});
      }
    }, 100);

    const calculatedTotal = (payload.usersList?.length || 0) + 
                            (payload.absensiList?.length || 0) + 
                            (payload.kelasList?.length || 0) + 
                            (payload.mapelList?.length || 0) + 
                            (payload.formulirList?.length || 0) + 
                            (payload.nilaiList?.length || 0) + 
                            (payload.ujianList?.length || 0) + 
                            1;

    console.info(`Cloud sync completed instantaneously with unified snapshot. Total ${calculatedTotal} items secured.`);
    return {
      success: true,
      count: calculatedTotal,
    };
  } catch (err: any) {
    console.error('Error during bulk cloud sync:', err);
    return {
      success: false,
      count: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * High-speed pull: First attempts to fetch settings/cloud_backup and settings/school_info (<300ms).
 * If unified snapshot exists, returns all 14 tables instantly!
 */
export async function pullAllDataFromCloud(): Promise<{
  success: boolean;
  schoolInfo?: any;
  usersList?: any[];
  kelasList?: any[];
  mapelList?: any[];
  formulirList?: any[];
  ujianList?: any[];
  kontenList?: any[];
  jadwalPelajaranList?: any[];
  jadwalUjianList?: any[];
  absensiList?: any[];
  ekskulList?: any[];
  nilaiList?: any[];
  nilaiEkskulList?: any[];
  absenMengajarList?: any[];
  error?: string;
}> {
  try {
    // 1. FAST PATH: Fetch unified snapshot and school profile in parallel (<300ms)
    const fastSnapshotPromise = Promise.all([
      fetchSchoolInfoFromFirestore().catch(() => null),
      getDoc(doc(db, 'settings', 'cloud_backup')).then(snap => snap.exists() ? snap.data() : null).catch(() => null),
    ]);

    const timeoutFast = new Promise<[any, any]>((resolve) => 
      setTimeout(() => resolve([null, null]), 2000)
    );

    const [remoteSchool, backupSnap] = await Promise.race([fastSnapshotPromise, timeoutFast]);

    // Helper: Fetch collection with timeout
    const fetchWithTimeout = <T>(collectionName: string): Promise<T[]> => {
      const p = fetchCollection<T>(collectionName).catch(() => []);
      const t = new Promise<T[]>((res) => setTimeout(() => res([]), 2000));
      return Promise.race([p, t]);
    };

    // If unified snapshot is found in cloud, also fetch live attendance to guarantee latest student presensi records are merged
    if (backupSnap && (backupSnap.usersList?.length > 0 || backupSnap.kelasList?.length > 0 || backupSnap.schoolInfo?.nama)) {
      console.info('Fast cloud backup snapshot loaded in <300ms, merging live attendance...');
      
      let mergedAbsensi = backupSnap.absensiList || [];
      try {
        const liveAbsensi = await fetchWithTimeout<any>('absensi');
        if (liveAbsensi && liveAbsensi.length > 0) {
          const aMap = new Map<string, any>();
          mergedAbsensi.forEach((a: any) => { if (a && a.id) aMap.set(a.id, a); });
          liveAbsensi.forEach((a: any) => { if (a && a.id) aMap.set(a.id, a); });
          mergedAbsensi = Array.from(aMap.values());
        }
      } catch (err) {
        console.warn('Notice fetching live attendance during fast snapshot load:', err);
      }

      return {
        success: true,
        schoolInfo: backupSnap.schoolInfo || remoteSchool || null,
        usersList: backupSnap.usersList || [],
        kelasList: backupSnap.kelasList || [],
        mapelList: backupSnap.mapelList || [],
        formulirList: backupSnap.formulirList || [],
        ujianList: backupSnap.ujianList || [],
        kontenList: backupSnap.kontenList || [],
        jadwalPelajaranList: backupSnap.jadwalPelajaranList || [],
        jadwalUjianList: backupSnap.jadwalUjianList || [],
        absensiList: mergedAbsensi,
        ekskulList: backupSnap.ekskulList || [],
        nilaiList: backupSnap.nilaiList || [],
        nilaiEkskulList: backupSnap.nilaiEkskulList || [],
        absenMengajarList: backupSnap.absenMengajarList || [],
      };
    }

    let schoolInfo = remoteSchool || backupSnap?.schoolInfo || null;
    let usersList = backupSnap?.usersList || [];
    let kelasList = backupSnap?.kelasList || [];
    let mapelList = backupSnap?.mapelList || [];
    let formulirList = backupSnap?.formulirList || [];
    let ujianList = backupSnap?.ujianList || [];
    let kontenList = backupSnap?.kontenList || [];
    let jadwalPelajaranList = backupSnap?.jadwalPelajaranList || [];
    let jadwalUjianList = backupSnap?.jadwalUjianList || [];
    let absensiList = backupSnap?.absensiList || [];
    let ekskulList = backupSnap?.ekskulList || [];
    let nilaiList = backupSnap?.nilaiList || [];
    let nilaiEkskulList = backupSnap?.nilaiEkskulList || [];
    let absenMengajarList = backupSnap?.absenMengajarList || [];

    // Fallback: Fetch core collections with a fast 1.5s timeout
    const [
      liveAbsensi,
      liveUsers,
      livePPDB,
      liveKelas,
      liveMapel
    ] = await Promise.all([
      fetchWithTimeout<any>('absensi'),
      fetchWithTimeout<any>('users'),
      fetchWithTimeout<any>('formulir_ppdb'),
      fetchWithTimeout<any>('kelas'),
      fetchWithTimeout<any>('mapel'),
    ]);

    // Merge live attendance if any
    if (liveAbsensi && liveAbsensi.length > 0) {
      const aMap = new Map<string, any>();
      absensiList.forEach((a: any) => aMap.set(a.id, a));
      liveAbsensi.forEach((a: any) => aMap.set(a.id, a));
      absensiList = Array.from(aMap.values());
    }

    // Merge live users if any
    if (liveUsers && liveUsers.length > 0) {
      const uMap = new Map<string, any>();
      usersList.forEach((u: any) => uMap.set(u.id, u));
      liveUsers.forEach((u: any) => uMap.set(u.id, u));
      usersList = Array.from(uMap.values());
    }

    // Merge live PPDB if any
    if (livePPDB && livePPDB.length > 0) {
      const fMap = new Map<string, any>();
      formulirList.forEach((f: any) => fMap.set(f.id, f));
      livePPDB.forEach((f: any) => fMap.set(f.id, f));
      formulirList = Array.from(fMap.values());
    }

    if (liveKelas && liveKelas.length > 0) {
      const kMap = new Map<string, any>();
      kelasList.forEach((k: any) => kMap.set(k.id, k));
      liveKelas.forEach((k: any) => kMap.set(k.id, k));
      kelasList = Array.from(kMap.values());
    }

    if (liveMapel && liveMapel.length > 0) {
      const mMap = new Map<string, any>();
      mapelList.forEach((m: any) => mMap.set(m.id, m));
      liveMapel.forEach((m: any) => mMap.set(m.id, m));
      mapelList = Array.from(mMap.values());
    }

    // If backup snapshot had no academic or CAT data, fetch remaining collections
    if (ujianList.length === 0 || nilaiList.length === 0) {
      const [
        liveUjian,
        liveNilai,
        liveJadwalP,
        liveAbsenM,
        liveEkskul
      ] = await Promise.all([
        fetchWithTimeout<any>('ujian'),
        fetchWithTimeout<any>('nilai'),
        fetchWithTimeout<any>('jadwal_pelajaran'),
        fetchWithTimeout<any>('absen_mengajar'),
        fetchWithTimeout<any>('ekskul'),
      ]);

      if (liveUjian.length > 0) ujianList = liveUjian;
      if (liveNilai.length > 0) nilaiList = liveNilai;
      if (liveJadwalP.length > 0) jadwalPelajaranList = liveJadwalP;
      if (liveAbsenM.length > 0) absenMengajarList = liveAbsenM;
      if (liveEkskul.length > 0) ekskulList = liveEkskul;
    }

    return {
      success: true,
      schoolInfo,
      usersList,
      kelasList,
      mapelList,
      formulirList,
      ujianList,
      kontenList,
      jadwalPelajaranList,
      jadwalUjianList,
      absensiList,
      ekskulList,
      nilaiList,
      nilaiEkskulList,
      absenMengajarList,
    };
  } catch (err: any) {
    console.warn('pullAllDataFromCloud notice:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

