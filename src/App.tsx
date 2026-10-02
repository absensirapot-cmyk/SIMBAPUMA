import React, { useState, useMemo, useRef } from 'react';
import { 
  User, 
  UserRole,
  KontenWeb, 
  PaketUjian, 
  FormulirPPDB, 
  Kelas, 
  Mapel, 
  HasilUjian,
  SchoolInfo,
  JadwalPelajaran,
  JadwalUjianItem,
  AbsensiRecord,
  NilaiMapelSiswa,
  Ekskul,
  NilaiEkskulSiswa,
  AbsenMengajarRecord
} from './types';
import { 
  INITIAL_USERS, 
  INITIAL_GURU_USERS,
  INITIAL_KELAS, 
  INITIAL_MAPEL, 
  INITIAL_KONTEN_WEB, 
  INITIAL_UJIAN, 
  INITIAL_FORMULIR_PPDB, 
  INITIAL_HASIL_UJIAN,
  INITIAL_JADWAL_PELAJARAN,
  INITIAL_JADWAL_UJIAN,
  INITIAL_EKSKUL,
  INITIAL_ABSEN_MENGAJAR,
  SCHOOL_INFO 
} from './data/initialData';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './utils/storage';
import { Navbar } from './components/Navbar';
import { WebProfilView } from './components/WebProfilView';
import { PPDBView } from './components/PPDBView';
import { CATSiswaView } from './components/CATSiswaView';
import { SiswaDashboardView } from './components/SiswaDashboardView';
import { GuruDashboardView } from './components/GuruDashboardView';
import { PortalGuruGatewayView } from './components/PortalGuruGatewayView';
import { WalasDashboardView } from './components/WalasDashboardView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AbsensiBarcodeView } from './components/AbsensiBarcodeView';
import { LoginView } from './components/LoginView';
import { testConnection, logoutFirebase, db } from './firebase';
import { 
  saveDocument, 
  removeDocument, 
  saveSchoolInfoToFirestore, 
  listenCollection,
  syncAllDataToCloud,
  pullAllDataFromCloud,
  saveBatchDocuments
} from './utils/firebaseSync';
import { doc, onSnapshot } from 'firebase/firestore';
import { GENERATED_STUDENT_USERS } from './data/studentsData';
import { getGreetingAndBirthday } from './utils/greetingHelper';
import { isRecordForStudent, getLocalDateString } from './utils/academicHelpers';
import { normalizeExcelTime } from './utils/excelHelper';

export const PROTECTED_ACCOUNT_IDS = new Set<string>([
  'u-admin',
]);

export function sanitizeUserAccount(u: User): User {
  if (!u) return u;
  if (u.role === 'admin' && u.nama?.includes('BPM')) {
    u = { ...u, nama: u.nama.replace(/\s*BPM\s*/gi, ' ').trim() };
  }
  const cleanKelas = u.kelas ? u.kelas.replace(/^Kelas\s+/i, '').trim() : u.kelas;
  const cleanNamaKelas = u.namaKelas ? u.namaKelas.replace(/^Kelas\s+/i, '').trim() : u.namaKelas;
  return {
    ...u,
    kelas: cleanKelas,
    namaKelas: cleanNamaKelas,
    statusAktif: u.statusAktif !== false,
  };
}

export default function App() {
  // Global State with LocalStorage Persistence - Default to logged out when app is opened
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState<'web' | 'ppdb' | 'cat' | 'siswa' | 'guru' | 'walas' | 'admin' | 'login' | 'presensi'>('web');
  
  // Real-time Global Notification when student attendance is successfully recorded across any mode
  const [attendanceToast, setAttendanceToast] = useState<{
    id: string;
    namaSiswa: string;
    kelas: string;
    nipd?: string;
    status: string;
    waktu: string;
    metode: string;
    tanggal: string;
    keterangan?: string;
  } | null>(null);
  const attendanceToastTimerRef = useRef<any>(null);

  const triggerAttendanceSuccessToast = (record: AbsensiRecord) => {
    if (!record) return;
    const cleanKelas = (record.kelas || 'Rombel').replace(/^Kelas\s+/i, '');
    const cleanWaktu = record.waktu || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    setAttendanceToast({
      id: record.id || `toast-${Date.now()}`,
      namaSiswa: record.namaSiswa || 'Peserta Didik',
      kelas: cleanKelas,
      nipd: record.nipd || record.nisn || '',
      status: record.status || 'Hadir',
      waktu: cleanWaktu,
      metode: record.metode || 'Sistem',
      tanggal: record.tanggal || getLocalDateString(),
      keterangan: record.keterangan,
    });

    // Play pleasant two-tone audio chime (A5 -> E6)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (_) {}

    // Mobile haptic vibration feedback for smartphones
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([100, 50, 100]); } catch (_) {}
    }

    if (attendanceToastTimerRef.current) {
      clearTimeout(attendanceToastTimerRef.current);
    }
    attendanceToastTimerRef.current = setTimeout(() => {
      setAttendanceToast(null);
    }, 5000);
  };
  
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>(() => {
    try {
      const saved = localStorage.getItem('saved_school_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        const farmasi = Number(parsed.kuotaJurusan?.farmasi ?? parsed.kuotaPerJurusan?.farmasi ?? SCHOOL_INFO.kuotaJurusan?.farmasi ?? 72);
        const keperawatan = Number(parsed.kuotaJurusan?.keperawatan ?? parsed.kuotaPerJurusan?.asistenKeperawatan ?? SCHOOL_INFO.kuotaJurusan?.keperawatan ?? 72);
        const kecantikan = Number(parsed.kuotaJurusan?.kecantikan ?? parsed.kuotaPerJurusan?.tataKecantikan ?? SCHOOL_INFO.kuotaJurusan?.kecantikan ?? 36);
        const perhotelan = Number(parsed.kuotaJurusan?.perhotelan ?? parsed.kuotaPerJurusan?.perhotelan ?? SCHOOL_INFO.kuotaJurusan?.perhotelan ?? 36);
        const totalKuota = (farmasi + keperawatan + kecantikan + perhotelan) || parsed.kuotaSPMB || 216;

        const rombelFarmasi = Number(parsed.rombelJurusan?.farmasi ?? SCHOOL_INFO.rombelJurusan?.farmasi ?? 2);
        const rombelKeperawatan = Number(parsed.rombelJurusan?.keperawatan ?? SCHOOL_INFO.rombelJurusan?.keperawatan ?? 2);
        const rombelKecantikan = Number(parsed.rombelJurusan?.kecantikan ?? SCHOOL_INFO.rombelJurusan?.kecantikan ?? 1);
        const rombelPerhotelan = Number(parsed.rombelJurusan?.perhotelan ?? SCHOOL_INFO.rombelJurusan?.perhotelan ?? 1);

        const gelombangList = (parsed.gelombangList && parsed.gelombangList.length > 0)
          ? parsed.gelombangList
          : (SCHOOL_INFO.gelombangList || []);

        return {
          ...SCHOOL_INFO,
          ...parsed,
          nama: parsed.nama || SCHOOL_INFO.nama,
          namaLengkap: parsed.namaLengkap || parsed.nama || SCHOOL_INFO.namaLengkap,
          kuotaSPMB: totalKuota,
          kuotaJurusan: { farmasi, keperawatan, kecantikan, perhotelan },
          rombelJurusan: {
            farmasi: rombelFarmasi,
            keperawatan: rombelKeperawatan,
            kecantikan: rombelKecantikan,
            perhotelan: rombelPerhotelan,
          },
          gelombangList,
          kuotaPerJurusan: { farmasi, asistenKeperawatan: keperawatan, tataKecantikan: kecantikan, perhotelan },
          lokasiSekolah: {
            ...SCHOOL_INFO.lokasiSekolah,
            ...parsed.lokasiSekolah,
            latitude: Number(parsed.lokasiSekolah?.latitude ?? -6.3463444),
            longitude: Number(parsed.lokasiSekolah?.longitude ?? 106.57316),
            radiusMeters: Number(parsed.lokasiSekolah?.radiusMeters && parsed.lokasiSekolah.radiusMeters >= 200 ? parsed.lokasiSekolah.radiusMeters : 250),
            namaTempat: parsed.lokasiSekolah?.namaTempat || 'SMK Kesehatan Bakti Putra Mandiri',
            mapsUrl: (parsed.lokasiSekolah?.mapsUrl && !parsed.lokasiSekolah.mapsUrl.includes('xS33Q5kXbCk8TqVK9') && !parsed.lokasiSekolah.mapsUrl.includes('Ch6WDDFWFznWcT7E9'))
              ? parsed.lokasiSekolah.mapsUrl
              : 'https://maps.app.goo.gl/845UtAVRFmNoEVvSA',
          },
          kopSekolah: {
            ...SCHOOL_INFO.kopSekolah,
            ...parsed.kopSekolah,
            yayasan: parsed.kopSekolah?.yayasan || SCHOOL_INFO.kopSekolah?.yayasan,
            instansi: parsed.kopSekolah?.instansi || parsed.nama?.toUpperCase() || SCHOOL_INFO.kopSekolah?.instansi,
            subJudul: parsed.kopSekolah?.subJudul || SCHOOL_INFO.kopSekolah?.subJudul,
            teleponEmail: parsed.kopSekolah?.teleponEmail || SCHOOL_INFO.kopSekolah?.teleponEmail,
            garisGanda: parsed.kopSekolah?.garisGanda ?? true,
            fontFamily: parsed.kopSekolah?.fontFamily || SCHOOL_INFO.kopSekolah?.fontFamily || 'Times New Roman, Times, Georgia, serif',
            fontSizeYayasan: Number(parsed.kopSekolah?.fontSizeYayasan || 12),
            fontSizeInstansi: Number(parsed.kopSekolah?.fontSizeInstansi || 18),
            fontSizeSubJudul: Number(parsed.kopSekolah?.fontSizeSubJudul || 11),
            fontSizeTeleponEmail: Number(parsed.kopSekolah?.fontSizeTeleponEmail || 10),
            logoSize: Number(parsed.kopSekolah?.logoSize || 64),
            lineThickness: parsed.kopSekolah?.lineThickness || 'sedang',
          }
        };
      }
    } catch (_) {}
    return SCHOOL_INFO;
  });

  // Sync document title with current school name dynamically
  React.useEffect(() => {
    if (schoolInfo?.nama) {
      document.title = `${schoolInfo.nama} - Sistem Informasi Manajemen Terpadu`;
    }
  }, [schoolInfo]);
  
  // Data State with Persistent LocalStorage Synchronization
  const [kontenList, setKontenList] = useState<KontenWeb[]>(() => {
    const loaded = loadFromStorage<KontenWeb[]>(STORAGE_KEYS.KONTEN_WEB, INITIAL_KONTEN_WEB);
    const map = new Map<string, KontenWeb>();
    INITIAL_KONTEN_WEB.forEach(k => map.set(k.id, k));
    if (Array.isArray(loaded)) loaded.forEach(k => map.set(k.id, k));
    return Array.from(map.values());
  });
  const [ujianList, setUjianList] = useState<PaketUjian[]>(() => {
    const loaded = loadFromStorage<PaketUjian[]>(STORAGE_KEYS.UJIAN, INITIAL_UJIAN);
    const deletedIds = loadFromStorage<string[]>('bpm_deleted_ujian', []);
    const map = new Map<string, PaketUjian>();
    INITIAL_UJIAN.forEach(u => map.set(u.id, u));
    if (Array.isArray(loaded)) loaded.forEach(u => map.set(u.id, u));
    return Array.from(map.values()).filter(u => !deletedIds.includes(u.id) && !['ex-1', 'ex-2', 'ex-3', 'ex-4'].includes(u.id));
  });
  const [formulirList, setFormulirList] = useState<FormulirPPDB[]>(() => {
    const loaded = loadFromStorage<FormulirPPDB[]>(STORAGE_KEYS.FORMULIR_PPDB, INITIAL_FORMULIR_PPDB);
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    const map = new Map<string, FormulirPPDB>();
    INITIAL_FORMULIR_PPDB.forEach(f => {
      if (!deletedIds.includes(f.id)) {
        map.set(f.id, f);
      }
    });
    if (Array.isArray(loaded)) {
      loaded.forEach(f => {
        if (!deletedIds.includes(f.id)) {
          map.set(f.id, f);
        }
      });
    }
    return Array.from(map.values()).filter(f => !deletedIds.includes(f.id));
  });
  const [hasilList, setHasilList] = useState<HasilUjian[]>(() => {
    const loaded = loadFromStorage<HasilUjian[]>(STORAGE_KEYS.HASIL_UJIAN, INITIAL_HASIL_UJIAN);
    return (loaded || []).filter(h => !h.id.startsWith('res-'));
  });
  const [usersList, setUsersList] = useState<User[]>(() => {
    // Auto-heal protected accounts from deleted cache
    // Only auto-heal u-admin if deleted accidentally
    try {
      const delUsers = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
      if (delUsers.includes('u-admin')) {
        saveToStorage(STORAGE_KEYS.DELETED_USERS, delUsers.filter(id => id !== 'u-admin'));
      }
    } catch (_) {}

    const raw = loadFromStorage<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    const deletedUserIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []).filter(id => id !== 'u-admin');
    
    const map = new Map<string, User>();
    const initialGuruMap = new Map<string, User>(INITIAL_GURU_USERS.map(g => [g.id, g]));

    // 1. Seed INITIAL_USERS except deleted ones
    INITIAL_USERS.forEach(u => {
      if (!deletedUserIds.includes(u.id)) {
        map.set(u.id, sanitizeUserAccount(u));
      }
    });
    INITIAL_GURU_USERS.forEach(g => {
      if (!deletedUserIds.includes(g.id)) {
        map.set(g.id, sanitizeUserAccount(g));
      }
    });
    GENERATED_STUDENT_USERS.forEach(s => {
      if (!map.has(s.id) && !deletedUserIds.includes(s.id)) {
        map.set(s.id, sanitizeUserAccount(s));
      }
    });
    // 2. Overlay raw (stored users from localStorage) except deleted ones, preserving canonical teacher data
    if (Array.isArray(raw)) {
      raw.forEach(u => {
        if (!deletedUserIds.includes(u.id)) {
          const initG = initialGuruMap.get(u.id);
          if (initG) {
            map.set(u.id, sanitizeUserAccount({
              ...initG,
              ...u,
              tempatLahir: u.tempatLahir || initG.tempatLahir,
              tanggalLahir: u.tanggalLahir || initG.tanggalLahir,
              tahunMasuk: u.tahunMasuk || initG.tahunMasuk,
              idGuru: u.idGuru || initG.idGuru,
              nipOrNis: u.idGuru || u.nipOrNis || initG.nipOrNis,
            }));
          } else {
            map.set(u.id, sanitizeUserAccount(u));
          }
        }
      });
    }

    // Also seed from active PPDB forms (initial + stored) that are not deleted
    const deletedPPDBIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    const storedForms = loadFromStorage<FormulirPPDB[]>(STORAGE_KEYS.FORMULIR_PPDB, INITIAL_FORMULIR_PPDB);
    const activeFormsMap = new Map<string, FormulirPPDB>();
    INITIAL_FORMULIR_PPDB.forEach(f => {
      if (!deletedPPDBIds.includes(f.id)) activeFormsMap.set(f.id, f);
    });
    if (Array.isArray(storedForms)) {
      storedForms.forEach(f => {
        if (!deletedPPDBIds.includes(f.id)) activeFormsMap.set(f.id, f);
      });
    }
    const allForms = Array.from(activeFormsMap.values());
    allForms.forEach(f => {
      const uid = f.userId && !f.userId.startsWith('guest-') ? f.userId : `u-calon-${f.id}`;
      if (deletedUserIds.includes(uid)) return;
      const existing = map.get(uid);
      map.set(uid, {
        id: uid,
        username: f.nisn || (existing ? existing.username : f.namaLengkap.toLowerCase().replace(/\s+/g, '_')),
        nama: f.namaLengkap,
        role: 'calon_siswa',
        nipOrNis: f.nisn,
        nisn: f.nisn,
        password: existing?.password || 'ppdb',
        email: f.emailSiswa || f.email,
        telepon: f.noHp,
        jurusan: f.pilihanJurusan,
        statusAktif: true,
        jenisKelamin: f.jenisKelamin,
      });
    });

    // Obsolete dummy placeholders that should not appear
    const obsoleteDummyNames = [
      'Maya Indriani, S.Pd.',
      'Agus Setiawan, S.ST.Par.',
      'Drs. Suhendar',
      'Siti Sarah, S.Pd.',
      'Kak Asep Kurniawan',
      'Budi Santoso, S.Pd.',
      'Guru Contoh',
      'Guru Template'
    ];

    return Array.from(map.values())
      .filter(u => {
        if (u.id === 'u-admin') return true;
        if (deletedUserIds.includes(u.id)) return false;
        // Hapus akun non-eksisten Adelia Putri Safitri jika tersimpan di cache lokal
        if (u.nipOrNis === '26.27.10.001' || u.username === '26.27.10.001' || (u.nama && u.nama.toLowerCase().includes('adelia putri safitri'))) {
          return false;
        }
        // Strip obsolete dummy placeholder teachers from appearing
        if (u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.role === 'kesiswaan') {
          if (obsoleteDummyNames.includes(u.nama) || u.id.startsWith('u-guru-dummy') || u.id.startsWith('u-guru-template')) {
            return false;
          }
        }
        return true;
      })
      .map(sanitizeUserAccount);
  });
  const [kelasList, setKelasList] = useState<Kelas[]>(() => {
    const raw = loadFromStorage<Kelas[]>(STORAGE_KEYS.KELAS, INITIAL_KELAS);
    if (!raw || raw.length === 0) return INITIAL_KELAS;
    const initialMap = new Map(INITIAL_KELAS.map(k => [k.id, k]));
    return raw.map(k => {
      const init = initialMap.get(k.id);
      const nama = (init?.namaKelas || k.namaKelas || '').replace(/^Kelas\s+/i, '').trim();
      return {
        ...init,
        ...k,
        namaKelas: nama,
        idWalas: k.idWalas !== undefined ? k.idWalas : (init?.idWalas || ''),
        namaWalas: k.namaWalas !== undefined ? k.namaWalas : (init?.namaWalas || '')
      };
    });
  });
  const [mapelList, setMapelList] = useState<Mapel[]>(() => {
    const deletedMapelIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
    const stored = loadFromStorage<Mapel[]>(STORAGE_KEYS.MAPEL, []);
    const storedMap = new Map<string, Mapel>();

    // 1. Seed initial official mapels except deleted ones
    INITIAL_MAPEL.forEach(m => {
      if (!deletedMapelIds.includes(m.id)) {
        storedMap.set(m.id, m);
      }
    });
    // 2. Overlay stored mapels (user created and updated mapels take precedence)
    if (Array.isArray(stored)) {
      stored.forEach(m => {
        if (!deletedMapelIds.includes(m.id)) {
          storedMap.set(m.id, m);
        }
      });
    }
    const merged = Array.from(storedMap.values());
    try {
      localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(merged));
    } catch (_) {}
    return merged;
  });
  const [jadwalPelajaranList, setJadwalPelajaranList] = useState<JadwalPelajaran[]>(() => {
    const raw = loadFromStorage<JadwalPelajaran[]>(STORAGE_KEYS.JADWAL_PELAJARAN, INITIAL_JADWAL_PELAJARAN);
    return (raw || []).filter(j => !j.id.startsWith('jp-')).map(j => ({
      ...j,
      jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
      jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
      jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
    }));
  });
  const [jadwalUjianList, setJadwalUjianList] = useState<JadwalUjianItem[]>(() => {
    const raw = loadFromStorage<JadwalUjianItem[]>(STORAGE_KEYS.JADWAL_UJIAN, INITIAL_JADWAL_UJIAN);
    return (raw || []).filter(ju => !ju.id.startsWith('ju-'));
  });
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>(() => 
    loadFromStorage(STORAGE_KEYS.ABSENSI, [])
  );
  const [nilaiList, setNilaiList] = useState<NilaiMapelSiswa[]>(() => 
    loadFromStorage(STORAGE_KEYS.NILAI, [])
  );
  const [ekskulList, setEkskulList] = useState<Ekskul[]>(() => {
    const raw = loadFromStorage<Ekskul[]>(STORAGE_KEYS.EKSKUL, INITIAL_EKSKUL);
    return (raw || []).map(e => ({
      ...e,
      pembina: (e.pembina && ['Ruli, S.Pd.I', 'Fitri Apriani Setioningsih, S.Pd', 'Rahmatun Komalasari, S.Kep., Ns.', 'Drs. Suhendar', 'Siti Sarah, S.Pd.', 'Kak Asep Kurniawan', 'Budi Santoso, S.Pd.'].includes(e.pembina)) ? '-' : (e.pembina || '-')
    }));
  });
  const [nilaiEkskulList, setNilaiEkskulList] = useState<NilaiEkskulSiswa[]>(() => 
    loadFromStorage(STORAGE_KEYS.NILAI_EKSKUL, [])
  );
  const [absenMengajarList, setAbsenMengajarList] = useState<AbsenMengajarRecord[]>(() => {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
    const templateIds = ['absen-01', 'absen-02', 'absen-03', 'absen-04'];
    const loaded = loadFromStorage<AbsenMengajarRecord[]>(STORAGE_KEYS.ABSEN_MENGAJAR, []);
    return (loaded || []).filter(r => !deletedIds.includes(r.id) && !templateIds.includes(r.id));
  });

  // Auto-Persist Effects to ensure modified data is never lost on refresh or navigation
  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.USERS, usersList);
  }, [usersList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.KELAS, kelasList);
  }, [kelasList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.MAPEL, mapelList);
  }, [mapelList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.JADWAL_PELAJARAN, jadwalPelajaranList);
  }, [jadwalPelajaranList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.JADWAL_UJIAN, jadwalUjianList);
  }, [jadwalUjianList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.ABSENSI, absensiList);
  }, [absensiList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.NILAI, nilaiList);
  }, [nilaiList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.EKSKUL, ekskulList);
  }, [ekskulList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.NILAI_EKSKUL, nilaiEkskulList);
  }, [nilaiEkskulList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.ABSEN_MENGAJAR, absenMengajarList);
  }, [absenMengajarList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.FORMULIR_PPDB, formulirList);
  }, [formulirList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.HASIL_UJIAN, hasilList);
  }, [hasilList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.UJIAN, ujianList);
  }, [ujianList]);

  React.useEffect(() => {
    saveToStorage(STORAGE_KEYS.KONTEN_WEB, kontenList);
  }, [kontenList]);

  // Multi-Tab & Multi-Window Real-time Sync for Absensi
  // Ensures any attendance marked in another tab (student or admin) syncs immediately across tabs
  React.useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if ((e.key === STORAGE_KEYS.ABSENSI || e.key === 'saved_absensi_list') && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setAbsensiList(parsed);
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  // Firebase Firestore Realtime Cloud Synchronization & Connection Validation
  React.useEffect(() => {
    // 1. Connection Healthcheck
    testConnection();

    // 2. Immediate Cloud Bootstrap on Mount (Syncs with other devices: HP, PC, Tablet)
    const bootstrapCloudData = async () => {
      try {
        const stored = localStorage.getItem('saved_users_list');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((u: any) => 
              u.nipOrNis !== '26.27.10.001' && 
              u.username !== '26.27.10.001' && 
              !u.nama?.toLowerCase().includes('adelia putri safitri')
            );
            if (cleaned.length !== parsed.length) {
              localStorage.setItem('saved_users_list', JSON.stringify(cleaned));
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(cleaned));
            }
          }
        }
      } catch (_) {}

      try {
        const cloudData = await pullAllDataFromCloud();
        if (cloudData.success) {
          // If Cloud has School Profile
          if (cloudData.schoolInfo && cloudData.schoolInfo.nama) {
            setSchoolInfo(prev => {
              const merged = { ...prev, ...cloudData.schoolInfo };
              try { localStorage.setItem('saved_school_info', JSON.stringify(merged)); } catch (_) {}
              return merged;
            });
          }

          // If Cloud has Users (Teachers, Students, Walas)
          if (cloudData.usersList && cloudData.usersList.length > 0) {
            const sanitizedUsers = cloudData.usersList.map(sanitizeUserAccount);
            setUsersList(sanitizedUsers);
            try {
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitizedUsers));
              localStorage.setItem('saved_users_list', JSON.stringify(sanitizedUsers));
            } catch (_) {}
          } else {
            // Cloud has 0 users yet (e.g. freshly provisioned). Check if this device has modified users locally to auto-push:
            const localSavedUsers = localStorage.getItem('saved_users_list') || localStorage.getItem(STORAGE_KEYS.USERS);
            if (localSavedUsers) {
              try {
                const parsed = JSON.parse(localSavedUsers);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  console.info('Auto-pushing existing local user data to Cloud Firestore via writeBatch...');
                  saveBatchDocuments('users', parsed.map(sanitizeUserAccount)).catch(err => console.warn('Auto-push users batch error:', err));
                }
              } catch (_) {}
            }
          }

          // If Cloud has Kelas / Rombel
          if (cloudData.kelasList && cloudData.kelasList.length > 0) {
            const cleanClasses = cloudData.kelasList.map(k => ({
              ...k,
              namaKelas: (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim()
            }));
            setKelasList(cleanClasses);
            try {
              localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(cleanClasses));
              localStorage.setItem('saved_kelas_list', JSON.stringify(cleanClasses));
            } catch (_) {}
          } else {
            // Cloud has 0 kelas yet. Auto-push local classes if present:
            const localSavedKelas = localStorage.getItem('saved_kelas_list') || localStorage.getItem(STORAGE_KEYS.KELAS);
            if (localSavedKelas) {
              try {
                const parsedK = JSON.parse(localSavedKelas);
                if (Array.isArray(parsedK) && parsedK.length > 0) {
                  console.info('Auto-pushing existing local kelas data to Cloud Firestore via writeBatch...');
                  saveBatchDocuments('kelas', parsedK).catch(err => console.warn('Auto-push kelas batch error:', err));
                }
              } catch (_) {}
            }
          }

          // If Cloud has Mapel
          if (cloudData.mapelList && cloudData.mapelList.length > 0) {
            setMapelList(cloudData.mapelList);
            try {
              localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(cloudData.mapelList));
            } catch (_) {}
          }

          // If Cloud has PPDB Registrations
          if (cloudData.formulirList && cloudData.formulirList.length > 0) {
            const deletedPPDBIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
            const validCloudForms = cloudData.formulirList.filter(f => !deletedPPDBIds.includes(f.id));
            setFormulirList(validCloudForms);
            try {
              localStorage.setItem('saved_formulir_ppdb', JSON.stringify(validCloudForms));
              localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(validCloudForms));
            } catch (_) {}
          }

          // If Cloud has Exam Packages
          if (cloudData.ujianList && cloudData.ujianList.length > 0) {
            setUjianList(cloudData.ujianList);
          }

          // If Cloud has Jadwal
          if (cloudData.jadwalPelajaranList && cloudData.jadwalPelajaranList.length > 0) {
            setJadwalPelajaranList(cloudData.jadwalPelajaranList.map(j => ({
              ...j,
              jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
              jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
              jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
            })));
          }
          if (cloudData.jadwalUjianList && cloudData.jadwalUjianList.length > 0) {
            setJadwalUjianList(cloudData.jadwalUjianList);
          }

          // If Cloud has Ekskul
          if (cloudData.ekskulList && cloudData.ekskulList.length > 0) {
            setEkskulList(cloudData.ekskulList);
          }

          // If Cloud has Nilai Leger Mapel
          if (cloudData.nilaiList && cloudData.nilaiList.length > 0) {
            const localSavedNilai = localStorage.getItem('saved_nilai_list') || localStorage.getItem(STORAGE_KEYS.NILAI);
            const map = new Map<string, NilaiMapelSiswa>();
            if (localSavedNilai) {
              try {
                const parsedN = JSON.parse(localSavedNilai);
                if (Array.isArray(parsedN)) parsedN.forEach(n => map.set(n.id, n));
              } catch (_) {}
            }
            cloudData.nilaiList.forEach(n => map.set(n.id, n));
            const mergedGrades = Array.from(map.values());
            setNilaiList(mergedGrades);
            try {
              localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(mergedGrades));
              localStorage.setItem('saved_nilai_list', JSON.stringify(mergedGrades));
            } catch (_) {}
          } else {
            // Cloud has 0 nilai yet. Check if this device has local grades to auto-push:
            const localSavedNilai = localStorage.getItem('saved_nilai_list') || localStorage.getItem(STORAGE_KEYS.NILAI);
            if (localSavedNilai) {
              try {
                const parsedN = JSON.parse(localSavedNilai);
                if (Array.isArray(parsedN) && parsedN.length > 0) {
                  console.info('Auto-pushing existing local grades data to Cloud Firestore via writeBatch...');
                  saveBatchDocuments('nilai', parsedN).catch(err => console.warn('Auto-push nilai batch error:', err));
                }
              } catch (_) {}
            }
          }

          // If Cloud has Nilai Ekskul
          if (cloudData.nilaiEkskulList && cloudData.nilaiEkskulList.length > 0) {
            const localSavedEks = localStorage.getItem('saved_nilai_ekskul_list') || localStorage.getItem(STORAGE_KEYS.NILAI_EKSKUL);
            const mapE = new Map<string, NilaiEkskulSiswa>();
            if (localSavedEks) {
              try {
                const parsedE = JSON.parse(localSavedEks);
                if (Array.isArray(parsedE)) parsedE.forEach(e => mapE.set(e.id, e));
              } catch (_) {}
            }
            cloudData.nilaiEkskulList.forEach(e => mapE.set(e.id, e));
            const mergedEkskul = Array.from(mapE.values());
            setNilaiEkskulList(mergedEkskul);
            try {
              localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(mergedEkskul));
              localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(mergedEkskul));
            } catch (_) {}
          }

          // If Cloud has Absensi Records
          const localSavedAbsensi = localStorage.getItem('saved_absensi_list') || localStorage.getItem(STORAGE_KEYS.ABSENSI);
          let localAbsensiArr: AbsensiRecord[] = [];
          if (localSavedAbsensi) {
            try {
              const parsedA = JSON.parse(localSavedAbsensi);
              if (Array.isArray(parsedA)) localAbsensiArr = parsedA;
            } catch (_) {}
          }

          if (cloudData.absensiList && cloudData.absensiList.length > 0) {
            setAbsensiList(prev => {
              const map = new Map<string, AbsensiRecord>();
              localAbsensiArr.forEach(a => { if (a && a.id) map.set(a.id, a); });
              prev.forEach(a => { if (a && a.id) map.set(a.id, a); });
              cloudData.absensiList!.forEach(a => { if (a && a.id) map.set(a.id, a); });
              const merged = Array.from(map.values());
              try {
                localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(merged));
                localStorage.setItem('saved_absensi_list', JSON.stringify(merged));
              } catch (_) {}
              return merged;
            });

            // If this device has local attendance records that are missing in cloud, auto-push to cloud
            const cloudIds = new Set(cloudData.absensiList.map(a => a.id));
            const missingInCloud = localAbsensiArr.filter(a => a && a.id && !cloudIds.has(a.id));
            if (missingInCloud.length > 0) {
              console.info(`Auto-pushing ${missingInCloud.length} local attendance records to Cloud Firestore...`);
              saveBatchDocuments('absensi', missingInCloud).catch(err => console.warn('Auto-push absensi batch error:', err));
            }
          } else {
            // Cloud has 0 attendance records yet, but this device has local attendance:
            if (localAbsensiArr.length > 0) {
              console.info(`Cloud has 0 attendance records. Auto-pushing ${localAbsensiArr.length} local attendance records to Cloud Firestore...`);
              saveBatchDocuments('absensi', localAbsensiArr).catch(err => console.warn('Auto-push absensi batch error:', err));
            }
          }

          // If Cloud has Absen Mengajar Records
          if (cloudData.absenMengajarList && cloudData.absenMengajarList.length > 0) {
            const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
            const templateIds = ['absen-01', 'absen-02', 'absen-03', 'absen-04'];
            const valid = cloudData.absenMengajarList.filter(a => !deletedAbsenIds.includes(a.id) && !templateIds.includes(a.id));
            setAbsenMengajarList(valid);
            try {
              localStorage.setItem(STORAGE_KEYS.ABSEN_MENGAJAR, JSON.stringify(valid));
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn('Initial cloud sync notice:', err);
      }
    };

    bootstrapCloudData();

    // 3. Real-time School Info from /settings/school_info
    const unsubSchool = onSnapshot(doc(db, 'settings', 'school_info'), (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data() as Partial<SchoolInfo>;
        if (remoteData?.nama || remoteData?.gelombangSPMB || remoteData?.gelombangList) {
          setSchoolInfo(prev => {
            const merged: SchoolInfo = {
              ...prev,
              ...remoteData,
              gelombangList: (remoteData.gelombangList && remoteData.gelombangList.length > 0)
                ? remoteData.gelombangList
                : prev.gelombangList,
              gelombangSPMB: remoteData.gelombangSPMB || prev.gelombangSPMB,
              statusSPMB: remoteData.statusSPMB || prev.statusSPMB,
              kuotaSPMB: remoteData.kuotaSPMB || prev.kuotaSPMB,
              kuotaJurusan: remoteData.kuotaJurusan ? { ...prev.kuotaJurusan, ...remoteData.kuotaJurusan } : prev.kuotaJurusan,
              kopSekolah: remoteData.kopSekolah ? { ...prev.kopSekolah, ...remoteData.kopSekolah } : prev.kopSekolah,
              lokasiSekolah: remoteData.lokasiSekolah ? { ...prev.lokasiSekolah, ...remoteData.lokasiSekolah } : prev.lokasiSekolah,
            };
            try {
              localStorage.setItem('saved_school_info', JSON.stringify(merged));
            } catch (_) {}
            return merged;
          });
        }
      }
    }, (error) => {
      console.info('Firestore settings sync notice:', error.message);
    });

    // 4. Real-time Web Content / Articles
    const unsubKonten = listenCollection<KontenWeb>('konten', (items) => {
      if (items.length > 0) {
        setKontenList(prev => {
          const map = new Map<string, KontenWeb>();
          INITIAL_KONTEN_WEB.forEach(k => map.set(k.id, k));
          prev.forEach(k => map.set(k.id, k));
          items.forEach(k => map.set(k.id, k));
          return Array.from(map.values());
        });
      }
    });

    // 5. Real-time PPDB Registrations (Cross-device sync for calon siswa)
    const unsubPPDB = listenCollection<FormulirPPDB>('formulir_ppdb', (items) => {
      if (items.length > 0) {
        const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
        setFormulirList(prev => {
          const map = new Map<string, FormulirPPDB>();
          INITIAL_FORMULIR_PPDB.forEach(f => {
            if (!deletedIds.includes(f.id)) map.set(f.id, f);
          });
          prev.forEach(f => {
            if (!deletedIds.includes(f.id)) map.set(f.id, f);
          });
          items.forEach(f => {
            if (!deletedIds.includes(f.id)) map.set(f.id, f);
          });
          const result = Array.from(map.values()).filter(f => !deletedIds.includes(f.id));
          try {
            localStorage.setItem('saved_formulir_ppdb', JSON.stringify(result));
            localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(result));
          } catch (_) {}
          return result;
        });
      }
    });

    // 6. Real-time User Accounts & Student Profiles (Cross-device sync for login/accounts)
    const unsubUsers = listenCollection<User>('users', (items) => {
      if (items.length > 0) {
        const deletedUserIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []).filter(id => id !== 'u-admin');
        const templateTeacherNames = [
          'Maya Indriani, S.Pd.',
          'Agus Setiawan, S.ST.Par.',
          'Drs. Suhendar',
          'Siti Sarah, S.Pd.',
          'Kak Asep Kurniawan',
          'Budi Santoso, S.Pd.',
          'Guru Contoh',
          'Guru Template'
        ];

        setUsersList((prev) => {
          const map = new Map<string, User>();
          const initialGuruMap = new Map<string, User>(INITIAL_GURU_USERS.map(g => [g.id, g]));
          const cloudHasTeachers = items.some(u => 
            u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.role === 'kesiswaan'
          );

          // 1. Initial users as base fallback (guarantee u-admin)
          INITIAL_USERS.filter(u => u.id === 'u-admin').forEach(u => {
            map.set(u.id, sanitizeUserAccount(u));
          });

          // 2. Only if Cloud has zero teachers, use INITIAL_GURU_USERS as fallback
          if (!cloudHasTeachers) {
            INITIAL_GURU_USERS.forEach(g => {
              if (!deletedUserIds.includes(g.id)) map.set(g.id, sanitizeUserAccount(g));
            });
          }

          // 3. Official students fallback if not yet in cloud
          GENERATED_STUDENT_USERS.forEach(s => {
            if (!deletedUserIds.includes(s.id)) map.set(s.id, sanitizeUserAccount(s));
          });

          // 4. Pertahankan state lokal saat ini (agar data yang baru dipulihkan/ditambahkan seperti siswa ke-78 atau guru tidak tertimpa)
          if (Array.isArray(prev)) {
            prev.forEach(u => {
              if (!deletedUserIds.includes(u.id)) {
                map.set(u.id, sanitizeUserAccount(u));
              }
            });
          }

          // 5. Selaraskan data dari Cloud Firestore (Cloud Firestore sebagai otoritas)
          items.forEach(u => {
            if (!deletedUserIds.includes(u.id)) {
              const existing = map.get(u.id);
              const initG = initialGuruMap.get(u.id);
              const isTeacher = u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.role === 'kesiswaan' || !!initG;
              if (isTeacher) {
                map.set(u.id, sanitizeUserAccount({
                  ...(initG || {}),
                  ...(existing || {}),
                  ...u,
                  tempatLahir: u.tempatLahir || existing?.tempatLahir || initG?.tempatLahir,
                  tanggalLahir: u.tanggalLahir || existing?.tanggalLahir || initG?.tanggalLahir,
                  tahunMasuk: u.tahunMasuk || existing?.tahunMasuk || initG?.tahunMasuk,
                  idGuru: u.idGuru || existing?.idGuru || initG?.idGuru,
                  nipOrNis: u.idGuru || u.nipOrNis || existing?.idGuru || existing?.nipOrNis || initG?.nipOrNis || '',
                }));
              } else {
                map.set(u.id, sanitizeUserAccount(u));
              }
            }
          });
          
          // Also sync with active PPDB forms (so all registered applicants have active login accounts)
          const allForms = [...formulirList];
          allForms.forEach(f => {
            const uid = f.userId && !f.userId.startsWith('guest-') ? f.userId : `u-calon-${f.id}`;
            if (deletedUserIds.includes(uid)) return;
            const existing = map.get(uid);
            map.set(uid, {
              id: uid,
              username: f.nisn || (existing ? existing.username : f.namaLengkap.toLowerCase().replace(/\s+/g, '_')),
              nama: f.namaLengkap,
              role: 'calon_siswa',
              nipOrNis: f.nisn,
              nisn: f.nisn,
              password: existing?.password || 'ppdb',
              email: f.emailSiswa || f.email,
              telepon: f.noHp,
              jurusan: f.pilihanJurusan,
              statusAktif: true,
              jenisKelamin: f.jenisKelamin,
            });
          });
          const result = Array.from(map.values())
            .filter(u => {
              if (u.id === 'u-admin') return true;
              if (deletedUserIds.includes(u.id)) return false;
              // Hapus akun non-eksisten Adelia Putri Safitri jika ada di cloud
              if (u.nipOrNis === '26.27.10.001' || u.username === '26.27.10.001' || (u.nama && u.nama.toLowerCase().includes('adelia putri safitri'))) {
                return false;
              }
              if (u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul' || u.role === 'kesiswaan') {
                if (templateTeacherNames.includes(u.nama) || u.id.startsWith('u-guru-dummy') || u.id.startsWith('u-guru-template')) {
                  return false;
                }
              }
              return true;
            })
            .map(sanitizeUserAccount);
          try {
            localStorage.setItem('saved_users_list', JSON.stringify(result));
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(result));
          } catch (_) {}
          return result;
        });
      }
    });

    // 7. Real-time Kelas / Rombel
    const unsubKelas = listenCollection<Kelas>('kelas', (items) => {
      if (items.length > 0) {
        setKelasList((prev) => {
          const map = new Map<string, Kelas>();
          INITIAL_KELAS.forEach(k => map.set(k.id, { ...k, namaKelas: (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim() }));
          if (Array.isArray(prev)) prev.forEach(k => map.set(k.id, { ...k, namaKelas: (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim() }));
          // Cloud Firestore items overlay base with clean namaKelas
          items.forEach(k => {
            const cleanName = (k.namaKelas || '').replace(/^Kelas\s+/i, '').trim();
            map.set(k.id, { ...k, namaKelas: cleanName });
          });
          const result = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(result));
            localStorage.setItem('saved_kelas_list', JSON.stringify(result));
          } catch (_) {}
          return result;
        });
      }
    });

    // 8. Real-time Mata Pelajaran
    const unsubMapel = listenCollection<Mapel>('mapel', (items) => {
      if (items.length > 0) {
        const deletedMapelIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
        setMapelList((prev) => {
          const map = new Map<string, Mapel>();
          INITIAL_MAPEL.forEach(m => {
            if (!deletedMapelIds.includes(m.id)) map.set(m.id, m);
          });
          // Pertahankan mapel yang baru ditambahkan/dipulihkan dari cadangan lokal
          if (Array.isArray(prev)) {
            prev.forEach(m => {
              if (!deletedMapelIds.includes(m.id)) map.set(m.id, m);
            });
          }
          // Cloud Firestore items overlay base
          items.forEach(m => {
            if (!deletedMapelIds.includes(m.id)) map.set(m.id, m);
          });
          const result = Array.from(map.values()).filter(m => !deletedMapelIds.includes(m.id));
          try {
            localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(result));
          } catch (_) {}
          saveToStorage(STORAGE_KEYS.MAPEL, result);
          return result;
        });
      }
    });

    // 9. Real-time Attendance / Presensi Records
    const unsubAbsen = listenCollection<AbsensiRecord>('absensi', (items) => {
      if (items.length > 0) {
        setAbsensiList(prev => {
          const map = new Map<string, AbsensiRecord>();
          prev.forEach(a => map.set(a.id, a));
          items.forEach(a => map.set(a.id, a));
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(merged));
          } catch (_) {}
          return merged;
        });
      }
    });

    // 10. Real-time Exam Packages
    const unsubUjian = listenCollection<PaketUjian>('ujian', (items) => {
      if (items.length > 0) {
        const deletedIds = loadFromStorage<string[]>('bpm_deleted_ujian', []);
        setUjianList(prev => {
          const map = new Map<string, PaketUjian>();
          INITIAL_UJIAN.forEach(u => map.set(u.id, u));
          prev.forEach(u => map.set(u.id, u));
          items.forEach(u => map.set(u.id, u));
          return Array.from(map.values()).filter(u => !deletedIds.includes(u.id));
        });
      }
    });

    // 11. Real-time Ekstrakurikuler
    const unsubEkskul = listenCollection<Ekskul>('ekskul', (items) => {
      if (items.length > 0) {
        setEkskulList(() => {
          const map = new Map<string, Ekskul>();
          INITIAL_EKSKUL.forEach(e => map.set(e.id, e));
          items.forEach(e => map.set(e.id, e));
          const result = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEYS.EKSKUL, JSON.stringify(result));
          } catch (_) {}
          return result;
        });
      }
    });

    // 12. Real-time Nilai Siswa / Leger Nilai Mata Pelajaran
    const unsubNilai = listenCollection<NilaiMapelSiswa>('nilai', (items) => {
      if (items.length > 0) {
        setNilaiList(prev => {
          const keyOf = (n: NilaiMapelSiswa) => 
            `${n.nipd || n.nisn || ''}_${n.mapelId || n.mapelNama || ''}_${n.periode || 'PAS'}`.toLowerCase();
          const map = new Map<string, NilaiMapelSiswa>();
          prev.forEach(n => {
            const k = keyOf(n) || n.id;
            map.set(k, n);
          });
          items.forEach(n => {
            const k = keyOf(n) || n.id;
            map.set(k, n);
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(merged));
            localStorage.setItem('saved_nilai_list', JSON.stringify(merged));
          } catch (_) {}
          return merged;
        });
      }
    });

    // 13. Real-time Nilai Ekskul
    const unsubNilaiEkskul = listenCollection<NilaiEkskulSiswa>('nilai_ekskul', (items) => {
      if (items.length > 0) {
        setNilaiEkskulList(prev => {
          const map = new Map<string, NilaiEkskulSiswa>();
          prev.forEach(e => map.set(e.id, e));
          items.forEach(e => map.set(e.id, e));
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(merged));
            localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(merged));
          } catch (_) {}
          return merged;
        });
      }
    });

    // 14. Real-time Absen & Jurnal Mengajar Dewan Guru
    const unsubAbsenMengajar = listenCollection<AbsenMengajarRecord>('absen_mengajar', (items) => {
      const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
      const templateIds = ['absen-01', 'absen-02', 'absen-03', 'absen-04'];
      const validItems = items.filter(a => !deletedAbsenIds.includes(a.id) && !templateIds.includes(a.id));
      setAbsenMengajarList(prev => {
        const map = new Map<string, AbsenMengajarRecord>();
        prev.forEach(a => {
          if (!deletedAbsenIds.includes(a.id) && !templateIds.includes(a.id)) {
            map.set(a.id, a);
          }
        });
        validItems.forEach(a => map.set(a.id, a));
        const merged = Array.from(map.values());
        try {
          localStorage.setItem(STORAGE_KEYS.ABSEN_MENGAJAR, JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });
    });

    return () => {
      unsubSchool();
      unsubKonten();
      unsubPPDB();
      unsubUsers();
      unsubKelas();
      unsubMapel();
      unsubAbsen();
      unsubUjian();
      unsubEkskul();
      unsubNilai();
      unsubNilaiEkskul();
      unsubAbsenMengajar();
    };
  }, []);

  // Teaching Attendance (Absen & Jurnal Mengajar) Handlers with Cloud Persistence
  const handleSaveAbsenMengajar = (record: AbsenMengajarRecord) => {
    // If saving/updating, ensure it's not marked as deleted
    const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
    if (deletedAbsenIds.includes(record.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, deletedAbsenIds.filter(id => id !== record.id));
    }

    setAbsenMengajarList(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      const updated = idx >= 0 ? prev.map((r, i) => i === idx ? record : r) : [record, ...prev];
      saveToStorage(STORAGE_KEYS.ABSEN_MENGAJAR, updated);
      return updated;
    });
    saveDocument('absen_mengajar', record.id, record).catch(err => {
      console.warn('Failed to save absen_mengajar to cloud:', err);
    });
  };

  const handleDeleteAbsenMengajar = (id: string) => {
    // Record in deleted list so it will never resurrect
    const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
    if (!deletedAbsenIds.includes(id)) {
      saveToStorage(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, [...deletedAbsenIds, id]);
    }
    setAbsenMengajarList(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveToStorage(STORAGE_KEYS.ABSEN_MENGAJAR, updated);
      return updated;
    });
    removeDocument('absen_mengajar', id).catch(err => {
      console.warn('Failed to remove absen_mengajar from cloud:', err);
    });
  };

  const handleClearAllAbsenMengajar = () => {
    setAbsenMengajarList(prev => {
      const allIds = prev.map(p => p.id);
      const deletedAbsenIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, []);
      const combined = Array.from(new Set([...deletedAbsenIds, ...allIds, 'absen-01', 'absen-02', 'absen-03', 'absen-04']));
      saveToStorage(STORAGE_KEYS.DELETED_ABSEN_MENGAJAR, combined);
      allIds.forEach(id => removeDocument('absen_mengajar', id).catch(() => {}));
      ['absen-01', 'absen-02', 'absen-03', 'absen-04'].forEach(id => removeDocument('absen_mengajar', id).catch(() => {}));
      saveToStorage(STORAGE_KEYS.ABSEN_MENGAJAR, []);
      return [];
    });
  };

  // Attendance Handlers with Cloud Persistence
  const handleAddAbsensi = (record: AbsensiRecord) => {
    setAbsensiList(prev => {
      // Prevent duplicate entry for same student on the same date
      const filtered = prev.filter(a => 
        a.id !== record.id && 
        !(a.tanggal === record.tanggal && (
          (record.userId && a.userId === record.userId) ||
          (record.nipd && a.nipd === record.nipd) ||
          (record.namaSiswa && a.namaSiswa.trim().toLowerCase() === record.namaSiswa.trim().toLowerCase())
        ))
      );
      const next = [record, ...filtered];
      try {
        localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(next));
        localStorage.setItem('saved_absensi_list', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    saveDocument('absensi', record.id, record).catch(err => {
      console.warn('Sync absen cloud notice (local storage safe):', err);
    });
    triggerAttendanceSuccessToast(record);
  };

  const handleUpdateAbsensi = (record: AbsensiRecord) => {
    setAbsensiList(prev => {
      const next = prev.map(a => a.id === record.id ? record : a);
      try {
        localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(next));
        localStorage.setItem('saved_absensi_list', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    saveDocument('absensi', record.id, record).catch(err => {
      console.warn('Sync absen cloud notice (local storage safe):', err);
    });
    triggerAttendanceSuccessToast(record);
  };

  const handleDeleteAbsensi = (id: string) => {
    setAbsensiList(prev => {
      const next = prev.filter(a => a.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(next));
        localStorage.setItem('saved_absensi_list', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    removeDocument('absensi', id).catch(err => console.warn('Delete absen error:', err));
  };

  // Nilai Handlers with Cloud Persistence
  const handleSaveNilaiList = async (
    newList: NilaiMapelSiswa[],
    changedItems?: NilaiMapelSiswa[]
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    setNilaiList(newList);
    try {
      localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(newList));
      localStorage.setItem('saved_nilai_list', JSON.stringify(newList));
    } catch (_) {}

    // Instantly persist each student grade to Cloud Firestore using atomic batch write
    // Prioritize changedItems to save network bandwidth and prevent rate limiting
    try {
      const itemsToSave = (changedItems && changedItems.length > 0) ? changedItems : newList;
      const validItems = itemsToSave.filter(n => n && (n.id || n.nipd));
      if (validItems.length === 0) {
        return { success: true, count: 0 };
      }

      const batchResult = await saveBatchDocuments('nilai', validItems);
      if (!batchResult.success) {
        console.warn('Batch sync nilai warning:', batchResult.error);
      }
      return batchResult;
    } catch (err: any) {
      console.warn('Sync nilai error:', err);
      return { success: false, count: 0, error: err?.message || String(err) };
    }
  };

  // Ekskul Handlers
  const handleAddEkskul = (ekskul: Ekskul) => {
    setEkskulList(prev => [...prev, ekskul]);
    saveDocument('ekskul', ekskul.id, ekskul).catch(err => console.warn('Sync ekskul error:', err));
  };

  const handleUpdateEkskul = (ekskul: Ekskul) => {
    setEkskulList(prev => prev.map(e => e.id === ekskul.id ? ekskul : e));
    saveDocument('ekskul', ekskul.id, ekskul).catch(err => console.warn('Sync ekskul error:', err));
  };

  const handleDeleteEkskul = (ekskulId: string) => {
    setEkskulList(prev => prev.filter(e => e.id !== ekskulId));
    removeDocument('ekskul', ekskulId).catch(err => console.warn('Delete ekskul error:', err));
  };

  const handleSaveNilaiEkskul = (list: NilaiEkskulSiswa[]) => {
    setNilaiEkskulList(list);
    try {
      localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(list));
      localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(list));
    } catch (_) {}

    // Persist each student ekskul grade to Cloud Firestore
    list.forEach(ne => {
      if (ne && ne.id) {
        saveDocument('nilai_ekskul', ne.id, ne).catch(err => console.warn('Sync nilai_ekskul error:', err));
      }
    });
  };

  // Data Management Handlers with Instant Cloud Persistence
  const handleImportUsers = (newUsers: User[]) => {
    setUsersList(prev => {
      const map = new Map(prev.map(u => [u.id, u]));
      newUsers.forEach(u => map.set(u.id, sanitizeUserAccount(u)));
      const merged = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged));
        localStorage.setItem('saved_users_list', JSON.stringify(merged));
      } catch (_) {}
      saveBatchDocuments('users', merged).catch(err => console.warn('Sync import users error:', err));
      return merged;
    });
  };

  const handleImportMapel = (newMapel: Mapel[]) => {
    setMapelList(prev => {
      const map = new Map(prev.map(m => [m.id, m]));
      newMapel.forEach(m => map.set(m.id, m));
      const merged = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(merged));
      } catch (_) {}
      saveBatchDocuments('mapel', merged).catch(err => console.warn('Sync import mapel error:', err));
      return merged;
    });
  };

  const handleImportJadwal = (newJadwal: JadwalPelajaran[]) => {
    setJadwalPelajaranList(prev => {
      const map = new Map(prev.map(j => [j.id, j]));
      newJadwal.forEach(j => {
        const clean: JadwalPelajaran = {
          ...j,
          jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
          jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
          jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
        };
        map.set(j.id, clean);
      });
      const merged = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(merged));
      } catch (_) {}
      saveBatchDocuments('jadwal_pelajaran', merged).catch(err => console.warn('Sync import jadwal error:', err));
      return merged;
    });
  };

  const handleImportNilai = (newNilai: NilaiMapelSiswa[]) => {
    setNilaiList(prev => {
      const map = new Map(prev.map(n => [n.id, n]));
      newNilai.forEach(n => map.set(n.id, n));
      const merged = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(merged));
        localStorage.setItem('saved_nilai_list', JSON.stringify(merged));
      } catch (_) {}
      saveBatchDocuments('nilai', merged).catch(err => console.warn('Sync import nilai error:', err));
      return merged;
    });
  };

  const handleResetDatabase = () => {
    setUsersList(INITIAL_USERS);
    setKelasList(INITIAL_KELAS);
    setMapelList(INITIAL_MAPEL);
    setJadwalPelajaranList(INITIAL_JADWAL_PELAJARAN);
    setJadwalUjianList(INITIAL_JADWAL_UJIAN);
    setNilaiList([]);
    setAbsensiList([]);
    setFormulirList(INITIAL_FORMULIR_PPDB);
    setEkskulList(INITIAL_EKSKUL);
    setNilaiEkskulList([]);
    setAbsenMengajarList(INITIAL_ABSEN_MENGAJAR);
    try {
      localStorage.removeItem(STORAGE_KEYS.USERS);
      localStorage.removeItem(STORAGE_KEYS.KELAS);
      localStorage.removeItem(STORAGE_KEYS.MAPEL);
      localStorage.removeItem(STORAGE_KEYS.JADWAL_PELAJARAN);
      localStorage.removeItem(STORAGE_KEYS.JADWAL_UJIAN);
      localStorage.removeItem(STORAGE_KEYS.NILAI);
      localStorage.removeItem(STORAGE_KEYS.ABSENSI);
      localStorage.removeItem(STORAGE_KEYS.FORMULIR_PPDB);
      localStorage.removeItem(STORAGE_KEYS.EKSKUL);
      localStorage.removeItem(STORAGE_KEYS.NILAI_EKSKUL);
      localStorage.removeItem(STORAGE_KEYS.ABSEN_MENGAJAR);
      localStorage.removeItem(STORAGE_KEYS.KENAIKAN_KELAS_LOG);
      saveToStorage(STORAGE_KEYS.DELETED_PPDB, []);
      saveToStorage(STORAGE_KEYS.DELETED_USERS, []);
    } catch (_) {}
  };

  const handleResetNilai = () => {
    setNilaiList([]);
  };

  const handleResetAbsensi = () => {
    setAbsensiList([]);
  };

  const handleResetCalonSiswa = () => {
    // 1. Kumpulkan seluruh ID formulir aktif dan ID bawaan template
    const allFormIds = Array.from(new Set([
      ...formulirList.map(f => f.id),
      ...INITIAL_FORMULIR_PPDB.map(f => f.id)
    ]));

    const prevDeleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    const mergedDeleted = Array.from(new Set([...prevDeleted, ...allFormIds]));
    saveToStorage(STORAGE_KEYS.DELETED_PPDB, mergedDeleted);

    // 2. Kumpulkan seluruh ID akun pengguna calon siswa
    const candidateUserIds = usersList.filter(u => u.role === 'calon_siswa').map(u => u.id);
    const templateCandidateUserIds = [
      'u-calon-1',
      'u-calon-2',
      'u-calon-3',
      'u-calon-4',
      ...INITIAL_FORMULIR_PPDB.map(f => f.userId || `u-calon-${f.id}`)
    ];
    const allCandidateUserIds = Array.from(new Set([...candidateUserIds, ...templateCandidateUserIds]));
    
    const prevDeletedUsers = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    saveToStorage(STORAGE_KEYS.DELETED_USERS, Array.from(new Set([...prevDeletedUsers, ...allCandidateUserIds])));

    // 3. Kosongkan state lokal
    setFormulirList([]);
    const filteredUsers = usersList.filter(u => u.role !== 'calon_siswa');
    setUsersList(filteredUsers);

    // 4. Persistensikan ke LocalStorage
    try {
      localStorage.setItem('saved_formulir_ppdb', JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify([]));
      localStorage.setItem('saved_users_list', JSON.stringify(filteredUsers));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));
    } catch (_) {}

    // 5. Hapus dari Cloud Firestore
    allFormIds.forEach(id => removeDocument('formulir_ppdb', id));
    allCandidateUserIds.forEach(uid => removeDocument('users', uid));
  };

  const handleRestoreAllData = async (backupInput: any) => {
    let backup = backupInput?.data 
      ? backupInput.data 
      : (backupInput?.backup 
        ? backupInput.backup 
        : (backupInput?.payload 
          ? backupInput.payload 
          : (backupInput?.database ? backupInput.database : backupInput)));

    if (Array.isArray(backup)) {
      const isAttendance = backup.some((x: any) => x && (x.tanggal || x.status || x.waktu));
      if (isAttendance) {
        backup = { absensi: backup };
      } else {
        backup = { siswa: backup };
      }
    }
    if (!backup || typeof backup !== 'object') return;

    let restoredUsersList: User[] | null = null;
    let restoredMapelList: Mapel[] | null = null;
    let restoredKelasList: Kelas[] | null = null;
    let restoredJadwalPelajaranList: JadwalPelajaran[] | null = null;
    let restoredJadwalUjianList: JadwalUjianItem[] | null = null;
    let restoredNilaiList: NilaiMapelSiswa[] | null = null;
    let restoredAbsensiList: AbsensiRecord[] | null = null;
    let restoredFormulirList: FormulirPPDB[] | null = null;
    let restoredEkskulList: Ekskul[] | null = null;
    let restoredNilaiEkskulList: NilaiEkskulSiswa[] | null = null;
    let restoredUjianList: PaketUjian[] | null = null;
    let restoredSchoolInfo: SchoolInfo | null = null;

    // 1. PENGGUNA / SISWA / GURU: Mendukung backup.users, backup.usersList, dan kombinasi backup.siswa + backup.guru + backup.staf
    const userMap = new Map<string, User>();
    // Pertahankan akun Administrator utama
    const currentAdmin = usersList.find(u => u.id === 'u-admin' || u.role === 'admin') || INITIAL_USERS[0];
    if (currentAdmin) {
      userMap.set(currentAdmin.id, sanitizeUserAccount(currentAdmin));
    }

    // Smart Merge Protection: Peta data kanonikal guru resmi Bapuma (menjaga TTL, Tahun Masuk, dan Id Guru)
    const initialGuruById = new Map<string, User>(INITIAL_GURU_USERS.map(g => [g.id, g]));
    const initialGuruByNip = new Map<string, User>(INITIAL_GURU_USERS.filter(g => g.nipOrNis).map(g => [g.nipOrNis!, g]));
    const initialGuruByName = new Map<string, User>(INITIAL_GURU_USERS.map(g => [(g.nama || '').toLowerCase().replace(/[^a-z0-9]/g, ''), g]));
    const currentUsersById = new Map<string, User>(usersList.map(u => [u.id, u]));

    const preserveCanonicalData = (incoming: User): User => {
      if (!incoming) return incoming;
      const normName = (incoming.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const canonicalGuru = initialGuruById.get(incoming.id)
        || (incoming.idGuru ? INITIAL_GURU_USERS.find(g => g.idGuru === incoming.idGuru) : undefined)
        || (incoming.nipOrNis ? initialGuruByNip.get(incoming.nipOrNis) : undefined)
        || (normName ? initialGuruByName.get(normName) : undefined);

      const existingUser = currentUsersById.get(incoming.id) 
        || (normName ? Array.from(currentUsersById.values()).find(u => (u.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '') === normName) : undefined);

      const isTeacher = incoming.role === 'guru' || incoming.role === 'walas' || incoming.role === 'pembina_ekskul' || incoming.role === 'kesiswaan' || !!canonicalGuru;

      if (isTeacher) {
        return sanitizeUserAccount({
          ...(canonicalGuru || {}),
          ...incoming,
          id: incoming.id || canonicalGuru?.id || existingUser?.id || '',
          tempatLahir: incoming.tempatLahir || existingUser?.tempatLahir || canonicalGuru?.tempatLahir,
          tanggalLahir: incoming.tanggalLahir || existingUser?.tanggalLahir || canonicalGuru?.tanggalLahir,
          tahunMasuk: incoming.tahunMasuk || existingUser?.tahunMasuk || canonicalGuru?.tahunMasuk,
          idGuru: incoming.idGuru || existingUser?.idGuru || canonicalGuru?.idGuru,
          nipOrNis: incoming.idGuru || incoming.nipOrNis || existingUser?.idGuru || existingUser?.nipOrNis || canonicalGuru?.idGuru || canonicalGuru?.nipOrNis || '',
          fotoProfilUrl: incoming.fotoProfilUrl || existingUser?.fotoProfilUrl || canonicalGuru?.fotoProfilUrl,
        });
      }

      // Siswa dan akun lainnya: lindungi NIPD, TTL, foto profil jika ada
      return sanitizeUserAccount({
        ...(existingUser || {}),
        ...incoming,
        role: incoming.role || (incoming.nipd || incoming.kelas ? 'siswa' : (existingUser?.role || 'siswa')),
        nipd: incoming.nipd || existingUser?.nipd || incoming.nipOrNis,
        tempatLahir: incoming.tempatLahir || existingUser?.tempatLahir,
        tanggalLahir: incoming.tanggalLahir || existingUser?.tanggalLahir,
        fotoProfilUrl: incoming.fotoProfilUrl || existingUser?.fotoProfilUrl,
      });
    };

    // A. Masukkan dari users atau usersList atau pengguna jika ada
    const baseUsers = Array.isArray(backup.users) ? backup.users : (Array.isArray(backup.usersList) ? backup.usersList : (Array.isArray(backup.pengguna) ? backup.pengguna : []));
    baseUsers.forEach((u: User) => {
      if (!u) return;
      const safeU = preserveCanonicalData(u);
      const finalId = safeU.id || (safeU.nipOrNis ? `u-${safeU.role || 'user'}-${safeU.nipOrNis}` : `u-usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      userMap.set(finalId, { ...safeU, id: finalId });
    });

    // B. Masukkan atau timpa dari backup.siswa / backup.students / backup.dataSiswa / backup.murid
    const siswaArr = Array.isArray(backup.siswa) 
      ? backup.siswa 
      : (Array.isArray(backup.students) 
        ? backup.students 
        : (Array.isArray(backup.dataSiswa) 
          ? backup.dataSiswa 
          : (Array.isArray(backup.murid) ? backup.murid : [])));
    siswaArr.forEach((s: any) => {
      if (!s) return;
      const safeS = preserveCanonicalData({ ...s, role: 'siswa' });
      const id = safeS.id || (safeS.nipd ? `u-siswa-${safeS.nipd}` : (safeS.nipOrNis ? `u-siswa-${safeS.nipOrNis}` : `u-siswa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`));
      userMap.set(id, { ...safeS, id, role: 'siswa' });
    });

    // C. Masukkan atau timpa dari backup.guru / backup.teachers / backup.dataGuru
    const guruArr = Array.isArray(backup.guru) ? backup.guru : (Array.isArray(backup.teachers) ? backup.teachers : (Array.isArray(backup.dataGuru) ? backup.dataGuru : []));
    guruArr.forEach((g: any) => {
      if (!g) return;
      const safeG = preserveCanonicalData(g);
      const id = safeG.id || (safeG.username ? `u-guru-${safeG.username}` : (safeG.nipOrNis ? `u-guru-${safeG.nipOrNis}` : `u-guru-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`));
      userMap.set(id, { ...safeG, id });
    });

    const stafArr = Array.isArray(backup.staf) ? backup.staf : [];
    stafArr.forEach((st: any) => {
      if (!st) return;
      const safeSt = preserveCanonicalData(st);
      const id = safeSt.id || `u-staf-${safeSt.nipOrNis || Date.now()}`;
      userMap.set(id, { ...safeSt, id });
    });

    // Jamin seluruh 27 guru kanonikal tetap terdaftar utuh di userMap
    INITIAL_GURU_USERS.forEach(canonicalGuru => {
      const existing = userMap.get(canonicalGuru.id);
      if (!existing) {
        const norm = (canonicalGuru.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = Array.from(userMap.values()).find(u => (u.nama || '').toLowerCase().replace(/[^a-z0-9]/g, '') === norm);
        if (!found) {
          userMap.set(canonicalGuru.id, sanitizeUserAccount(canonicalGuru));
        }
      }
    });

    if (userMap.size > 1) {
      restoredUsersList = Array.from(userMap.values());
    }

    if (restoredUsersList && restoredUsersList.length > 0) {
      const sanitized = restoredUsersList.map(sanitizeUserAccount);
      setUsersList(sanitized);
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitized));
        localStorage.setItem('saved_users_list', JSON.stringify(sanitized));
        saveToStorage(STORAGE_KEYS.DELETED_USERS, []);
      } catch (_) {}
    }

    // 2. MATA PELAJARAN: Mendukung backup.mapelList, backup.mapel, backup.mataPelajaran, backup.subjects
    const rawMapel = backup.mapelList || backup.mapel || backup.mataPelajaran || backup.subjects;
    if (Array.isArray(rawMapel) && rawMapel.length > 0) {
      restoredMapelList = rawMapel;
      setMapelList(rawMapel);
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(rawMapel));
        saveToStorage(STORAGE_KEYS.DELETED_MAPEL, []);
      } catch (_) {}
    }

    // 3. KELAS / ROMBEL: Mendukung backup.kelasList, backup.kelas, backup.rombel, backup.classes
    const rawKelas = backup.kelasList || backup.kelas || backup.rombel || backup.classes;
    if (Array.isArray(rawKelas) && rawKelas.length > 0) {
      restoredKelasList = rawKelas;
      setKelasList(rawKelas);
      try {
        localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(rawKelas));
        localStorage.setItem('saved_kelas_list', JSON.stringify(rawKelas));
      } catch (_) {}
    }

    // 4. JADWAL PELAJARAN: Mendukung backup.jadwalPelajaranList, backup.jadwalPelajaran, backup.jadwal, backup.timetable, backup.schedule
    const rawJadwalP = backup.jadwalPelajaranList || backup.jadwalPelajaran || backup.jadwal || backup.timetable || backup.schedule;
    if (Array.isArray(rawJadwalP)) {
      restoredJadwalPelajaranList = rawJadwalP;
      setJadwalPelajaranList(rawJadwalP);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(rawJadwalP)); } catch (_) {}
    }

    // 5. JADWAL UJIAN: Mendukung backup.jadwalUjianList, backup.jadwalUjian, backup.examSchedule
    const rawJadwalU = backup.jadwalUjianList || backup.jadwalUjian || backup.examSchedule;
    if (Array.isArray(rawJadwalU)) {
      restoredJadwalUjianList = rawJadwalU;
      setJadwalUjianList(rawJadwalU);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_UJIAN, JSON.stringify(rawJadwalU)); } catch (_) {}
    }

    // 6. NILAI SISWA / LEGER: Mendukung backup.nilaiList, backup.nilai, backup.leger, backup.dataNilai, backup.grades
    const rawNilai = backup.nilaiList || backup.nilai || backup.leger || backup.dataNilai || backup.grades;
    if (Array.isArray(rawNilai)) {
      restoredNilaiList = rawNilai;
      setNilaiList(rawNilai);
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(rawNilai));
        localStorage.setItem('saved_nilai_list', JSON.stringify(rawNilai));
      } catch (_) {}
    }

    // 7. ABSENSI: Mendukung backup.absensiList, backup.absensi, backup.presensi, backup.attendance, backup.riwayatAbsensi, backup.riwayat_absensi, backup.dataAbsensi, backup.kehadiran, backup.historyAbsen, backup.rekapAbsensi
    const rawAbsensi = backup.absensiList || backup.absensi || backup.presensi || backup.attendance || backup.riwayatAbsensi || backup.riwayat_absensi || backup.dataAbsensi || backup.kehadiran || backup.dataPresensi || backup.historyAbsen || backup.rekapAbsensi || backup.attendances || backup.presensiList;
    if (Array.isArray(rawAbsensi) && rawAbsensi.length > 0) {
      const activeStudentsList = restoredUsersList || usersList;
      const cleanAbsensiList: AbsensiRecord[] = rawAbsensi.map((raw: any, idx: number) => {
        const matched = activeStudentsList.find(s => isRecordForStudent(raw, s));
        const finalUserId = raw.userId || raw.user_id || raw.idSiswa || raw.id_siswa || matched?.id || '';
        const finalNipd = raw.nipd || raw.nip || raw.nis || matched?.nipd || matched?.nipOrNis || '';
        const finalNisn = raw.nisn || matched?.nisn || matched?.username || '';
        const finalNama = raw.namaSiswa || raw.nama || raw.nama_siswa || raw.namaLengkap || matched?.nama || 'Siswa';
        const finalKelas = (raw.kelas || raw.namaKelas || raw.rombel || matched?.kelas || matched?.namaKelas || 'XII').replace(/^Kelas\s+/i, '');
        const finalTanggal = raw.tanggal || raw.date || raw.tgl || getLocalDateString();
        const finalWaktu = raw.waktu || raw.time || raw.jam || '07:00:00';
        const finalStatus = raw.status || raw.keteranganStatus || (raw.hadir ? 'Hadir' : 'Hadir');
        const finalMetode = raw.metode || raw.metodeAbsen || raw.tipe || 'Sistem';
        const finalId = raw.id || `abs-${Date.now()}-${idx}-${finalUserId || 'rec'}`;

        return {
          id: finalId,
          userId: finalUserId,
          nipd: finalNipd,
          nisn: finalNisn,
          namaSiswa: finalNama,
          kelas: finalKelas,
          tanggal: finalTanggal,
          waktu: finalWaktu,
          status: finalStatus,
          metode: finalMetode,
          keterangan: raw.keterangan || (finalStatus === 'Terlambat' ? 'Presensi Terlambat' : 'Hadir Tepat Waktu'),
          petugas: raw.petugas || 'Sistem',
          lokasi: raw.lokasi,
          fotoBukti: raw.fotoBukti,
        };
      });

      restoredAbsensiList = cleanAbsensiList;
      setAbsensiList(cleanAbsensiList);
      try { localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(cleanAbsensiList)); } catch (_) {}
    }

    // 8. PPDB / SPMB: Mendukung backup.formulirList, backup.formulirPPDB, backup.ppdb, backup.spmb, backup.calonSiswa, backup.calon_siswa
    const rawPPDB = backup.formulirList || backup.formulirPPDB || backup.ppdb || backup.spmb || backup.calonSiswa || backup.calon_siswa;
    if (Array.isArray(rawPPDB)) {
      restoredFormulirList = rawPPDB;
      setFormulirList(rawPPDB);
      try {
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(rawPPDB));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(rawPPDB));
        saveToStorage(STORAGE_KEYS.DELETED_PPDB, []);
      } catch (_) {}
    }

    // 9. EKSTRAKURIKULER: Mendukung backup.ekskulList, backup.ekskul, backup.extracurricular
    const rawEkskul = backup.ekskulList || backup.ekskul || backup.extracurricular;
    if (Array.isArray(rawEkskul)) {
      restoredEkskulList = rawEkskul;
      setEkskulList(rawEkskul);
      try { localStorage.setItem(STORAGE_KEYS.EKSKUL, JSON.stringify(rawEkskul)); } catch (_) {}
    }

    // 10. NILAI EKSTRAKURIKULER: Mendukung backup.nilaiEkskulList dan backup.nilaiEkskul
    const rawNilaiEkskul = backup.nilaiEkskulList || backup.nilaiEkskul;
    if (Array.isArray(rawNilaiEkskul)) {
      restoredNilaiEkskulList = rawNilaiEkskul;
      setNilaiEkskulList(rawNilaiEkskul);
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(rawNilaiEkskul));
        localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(rawNilaiEkskul));
      } catch (_) {}
    }

    // 11. UJIAN CAT: Mendukung backup.ujianList, backup.ujian, backup.exams, backup.paketUjian
    const rawUjian = backup.ujianList || backup.ujian || backup.exams || backup.paketUjian;
    if (Array.isArray(rawUjian)) {
      restoredUjianList = rawUjian;
      setUjianList(rawUjian);
      try {
        localStorage.setItem(STORAGE_KEYS.UJIAN, JSON.stringify(rawUjian));
        saveToStorage('bpm_deleted_ujian', []);
      } catch (_) {}
    }

    // 12. PROFIL SEKOLAH / KOP SURAT
    const rawSchool = backup.schoolInfo || backup.sekolah || backup.identitasSekolah || backupInput.schoolInfo;
    if (rawSchool && typeof rawSchool === 'object') {
      restoredSchoolInfo = rawSchool;
      setSchoolInfo(prev => ({ ...prev, ...rawSchool }));
      try { localStorage.setItem('saved_school_info', JSON.stringify(rawSchool)); } catch (_) {}
      saveSchoolInfoToFirestore(rawSchool).catch(() => {});
    }

    // 13. ABSEN & JURNAL MENGAJAR GURU: Mendukung backup.absenMengajarList, backup.absenMengajar, backup.jurnalMengajar
    const rawAbsenM = backup.absenMengajarList || backup.absenMengajar || backup.jurnalMengajar;
    let restoredAbsenMengajarList: AbsenMengajarRecord[] | null = null;
    if (Array.isArray(rawAbsenM)) {
      restoredAbsenMengajarList = rawAbsenM;
      setAbsenMengajarList(rawAbsenM);
      try { localStorage.setItem(STORAGE_KEYS.ABSEN_MENGAJAR, JSON.stringify(rawAbsenM)); } catch (_) {}
    }

    // 14. SINKRONISASI OTOMATIS KE CLOUD FIRESTORE
    // Dilakukan di latar belakang agar proses pemulihan instan dan tidak membuat antarmuka macet/lama
    try {
      console.info('Menyelaraskan data hasil pulihkan cadangan ke Cloud Firestore di latar belakang...');
      syncAllDataToCloud({
        schoolInfo: restoredSchoolInfo || schoolInfo,
        usersList: restoredUsersList || usersList,
        kelasList: restoredKelasList || kelasList,
        mapelList: restoredMapelList || mapelList,
        jadwalPelajaranList: restoredJadwalPelajaranList || jadwalPelajaranList,
        jadwalUjianList: restoredJadwalUjianList || jadwalUjianList,
        nilaiList: restoredNilaiList || nilaiList,
        absensiList: restoredAbsensiList || absensiList,
        formulirList: restoredFormulirList || formulirList,
        ekskulList: restoredEkskulList || ekskulList,
        nilaiEkskulList: restoredNilaiEkskulList || nilaiEkskulList,
        ujianList: restoredUjianList || ujianList,
        absenMengajarList: restoredAbsenMengajarList || absenMengajarList,
      }).then(res => {
        console.info('Sinkronisasi cloud paska restore selesai:', res);
      }).catch(syncErr => {
        console.warn('Sinkronisasi cloud paska restore peringatan:', syncErr);
      });
    } catch (syncErr) {
      console.warn('Sinkronisasi cloud paska restore peringatan:', syncErr);
    }
  };

  // Role switching helper
  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setActiveTab('admin');
    } else if (user.role === 'guru') {
      setActiveTab('guru');
    } else if (user.role === 'walas') {
      setActiveTab('walas');
    } else if (user.role === 'siswa') {
      setActiveTab('siswa');
    } else if (user.role === 'calon_siswa') {
      setActiveTab('ppdb');
    } else {
      setActiveTab('web');
    }
  };

  // PPDB Submission Handler with Cloud Persistence
  const handleSaveFormulir = (formulir: FormulirPPDB) => {
    // Unmark from deleted if it was deleted previously
    const currentDeletedPPDB = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    if (currentDeletedPPDB.includes(formulir.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_PPDB, currentDeletedPPDB.filter(id => id !== formulir.id));
    }

    setFormulirList(prev => {
      const idx = prev.findIndex(f => f.id === formulir.id || (f.nisn && f.nisn === formulir.nisn));
      let updated: FormulirPPDB[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...formulir };
      } else {
        updated = [formulir, ...prev];
      }
      try {
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    saveDocument('formulir_ppdb', formulir.id, formulir);

    // Auto-create / sync user account for this registrant so they can login immediately with their NISN!
    const targetUserId = formulir.userId && !formulir.userId.startsWith('guest-') ? formulir.userId : `u-calon-${formulir.id}`;
    const calonUser: User = {
      id: targetUserId,
      username: formulir.nisn || (formulir.namaLengkap ? formulir.namaLengkap.toLowerCase().replace(/\s+/g, '_') : 'calon_user'),
      nama: formulir.namaLengkap,
      role: 'calon_siswa',
      nipOrNis: formulir.nisn,
      nisn: formulir.nisn,
      password: 'ppdb',
      email: formulir.emailSiswa || formulir.email,
      telepon: formulir.noHp,
      jurusan: formulir.pilihanJurusan,
      statusAktif: true,
      jenisKelamin: formulir.jenisKelamin,
    };
    setUsersList(prev => {
      const existsIdx = prev.findIndex(u => u.id === targetUserId || (formulir.nisn && (u.username === formulir.nisn || u.nisn === formulir.nisn || u.nipOrNis === formulir.nisn)));
      let nextUsers: User[];
      if (existsIdx >= 0) {
        nextUsers = [...prev];
        nextUsers[existsIdx] = { ...nextUsers[existsIdx], ...calonUser, password: nextUsers[existsIdx].password || 'ppdb' };
      } else {
        nextUsers = [...prev, calonUser];
      }
      try {
        localStorage.setItem('saved_users_list', JSON.stringify(nextUsers));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));
      } catch (_) {}
      return nextUsers;
    });
    saveDocument('users', targetUserId, calonUser);
  };

  // Calon Siswa dynamic creation upon registering in PPDB / Login
  const handleRegisterCalonSiswa = (newCalon: User, initialPPDBData?: any) => {
    setUsersList(prev => [...prev, newCalon]);
    saveDocument('users', newCalon.id, newCalon);
    setCurrentUser(newCalon);
    
    if (initialPPDBData) {
      const newForm: FormulirPPDB = {
        id: `ppdb-${Date.now()}`,
        userId: newCalon.id,
        pilihanJurusan: (initialPPDBData.pilihanJurusan as any) || 'Farmasi',
        statusPendaftaran: 'Menunggu_Verifikasi',
        tanggalDaftar: new Date().toISOString().replace('T', ' ').substring(0, 16),
        nisn: newCalon.nipOrNis,
        nikSiswa: '3201234567890001',
        noKk: '3201234567890002',
        namaLengkap: newCalon.nama,
        namaPanggilan: newCalon.nama.split(' ')[0],
        tempatLahir: 'Bogor',
        tanggalLahir: '2009-01-01',
        jenisKelamin: 'Laki-laki',
        tinggiBadan: 160,
        beratBadan: 50,
        wargaNegara: 'WNI',
        noHp: initialPPDBData.noHpSiswa || '08123456789',
        email: `${newCalon.username}@gmail.com`,
        jumlahSaudara: 2,
        anakKe: 1,
        agama: 'Islam',
        hobi: 'Membaca',
        citaCita: 'Tenaga Kesehatan',
        prestasi: '-',
        jarakSekolah: '1-3 Km',
        transportasi: 'Motor',
        alamatLengkap: 'Jl. Sawah, Kp. Sukasari, Desa Kabasiran',
        rt: '06',
        rw: '01',
        noRumah: '12',
        kodePos: '16360',
        desa: 'Kabasiran',
        kecKab: 'Parung Panjang, Bogor',
        penyakitBerat: 'Tidak Ada',
        alergi: 'Tidak Ada',
        namaOrganisasi: 'OSIS',
        jabatanOrganisasi: 'Anggota',
        tahunLulusSd: '2020',
        tahunLulusSmp: '2026',
        asalSmp: initialPPDBData.asalSmp || 'SMP Negeri 1 Parung Panjang',
        noSeriIjazah: '-',
        namaAyah: 'Bapak Murid',
        nikAyah: '3201234567890003',
        namaIbu: 'Ibu Murid',
        nikIbu: '3201234567890004',
        noTelpOrtu: initialPPDBData.noHpSiswa || '08123456789',
        alamatOrtu: 'Jl. Sawah, Kp. Sukasari, Desa Kabasiran, Parung Panjang',
        pendidikanAyah: 'SMA / Sederajat',
        pendidikanIbu: 'SMA / Sederajat',
        pekerjaanAyah: 'Wiraswasta',
        pekerjaanIbu: 'Ibu Rumah Tangga',
        pendapatanAyah: 'Rp 3.000.000 - Rp 5.000.000',
        pendapatanIbu: '< Rp 1.000.000',
      };
      // Unmark from deleted if present
      const currentDeletedPPDB = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
      if (currentDeletedPPDB.includes(newForm.id)) {
        saveToStorage(STORAGE_KEYS.DELETED_PPDB, currentDeletedPPDB.filter(id => id !== newForm.id));
      }
      setFormulirList(prev => {
        const next = [newForm, ...prev];
        try {
          localStorage.setItem('saved_formulir_ppdb', JSON.stringify(next));
          localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(next));
        } catch (_) {}
        return next;
      });
      saveDocument('formulir_ppdb', newForm.id, newForm);
    }

    setActiveTab('ppdb');
  };

  const [loginWelcomeNotice, setLoginWelcomeNotice] = useState<{ title: string; message: string; isBirthday: boolean } | null>(null);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('active_user_session_id', user.id);
      localStorage.removeItem('is_explicitly_logged_out');
    } catch (_) {}

    // Sapaan Selamat Pagi/Siang/Sore/Petang/Malam dan Ucapan Ulang Tahun
    const { greeting, isBirthday, birthdayMessage } = getGreetingAndBirthday(user);
    setLoginWelcomeNotice({
      title: isBirthday ? `🎉 Selamat Ulang Tahun & ${greeting}!` : `${greeting}, ${user.nama}!`,
      message: isBirthday 
        ? (birthdayMessage || `Selamat Ulang Tahun, ${user.nama}! Semoga senantiasa panjang umur, sehat dan berprestasi bersama SMK Bakti Putra Mandiri.`)
        : `Selamat datang di Portal Terpadu SMK Bakti Putra Mandiri.`,
      isBirthday
    });
    setTimeout(() => setLoginWelcomeNotice(null), 6000);

    if (user.role === 'admin' || user.role === 'operator') {
      setActiveTab('admin');
    } else if (user.role === 'guru' || user.role === 'pembina_ekskul' || user.role === 'kesiswaan' || user.role === 'kepala_sekolah' || user.role === 'bendahara' || user.role === 'staf') {
      setActiveTab('guru');
    } else if (user.role === 'walas') {
      setActiveTab('walas');
    } else if (user.role === 'siswa') {
      setActiveTab('siswa');
    } else if (user.role === 'calon_siswa') {
      setActiveTab('ppdb');
    } else {
      setActiveTab('web');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    logoutFirebase();
    try {
      localStorage.removeItem('active_user_session_id');
      localStorage.removeItem('active_user_session');
      localStorage.setItem('is_explicitly_logged_out', 'true');
    } catch (_) {}
    setActiveTab('login');
  };

  // CMS Content Handlers with Cloud Persistence
  const handleSaveKonten = (konten: KontenWeb) => {
    setKontenList(prev => [konten, ...prev]);
    saveDocument('konten', konten.id, konten);
  };

  const handleDeleteKonten = (id: string) => {
    setKontenList(prev => prev.filter(k => k.id !== id));
    removeDocument('konten', id);
  };

  // CAT Exam Handlers with Cloud Persistence
  const handleSaveUjian = (ujian: PaketUjian) => {
    const deleted = loadFromStorage<string[]>('bpm_deleted_ujian', []);
    if (deleted.includes(ujian.id)) {
      saveToStorage('bpm_deleted_ujian', deleted.filter(id => id !== ujian.id));
    }
    setUjianList(prev => {
      const idx = prev.findIndex(u => u.id === ujian.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = ujian;
        return copy;
      }
      return [ujian, ...prev];
    });
    saveDocument('ujian', ujian.id, ujian);
  };

  const handleDeleteUjian = (ujianId: string) => {
    const deleted = loadFromStorage<string[]>('bpm_deleted_ujian', []);
    if (!deleted.includes(ujianId)) {
      saveToStorage('bpm_deleted_ujian', [...deleted, ujianId]);
    }
    setUjianList(prev => prev.filter(u => u.id !== ujianId));
    removeDocument('ujian', ujianId);
  };

  const handleFinishUjian = (hasil: HasilUjian) => {
    setHasilList(prev => [hasil, ...prev]);
    saveDocument('hasil_ujian', hasil.id, hasil);
  };

  // PPDB Admin Status Update with Cloud Persistence
  const handleUpdatePPDBStatus = (
    formId: string, 
    status: FormulirPPDB['statusPendaftaran'], 
    catatan?: string
  ) => {
    setFormulirList(prev => prev.map(f => {
      if (f.id === formId) {
        const isVerifiedOrAccepted = status === 'Terverifikasi' || status === 'Diterima';
        const updated = {
          ...f,
          statusPendaftaran: status,
          tanggalVerifikasi: isVerifiedOrAccepted ? (f.tanggalVerifikasi || new Date().toISOString().substring(0, 10)) : f.tanggalVerifikasi,
          emailNotifikasiTerkirim: isVerifiedOrAccepted ? true : f.emailNotifikasiTerkirim,
          emailNotifikasiWaktu: isVerifiedOrAccepted ? new Date().toISOString().replace('T', ' ').substring(0, 16) : f.emailNotifikasiWaktu,
          catatanAdmin: catatan || f.catatanAdmin,
        };
        saveDocument('formulir_ppdb', formId, updated);
        return updated;
      }
      return f;
    }));
  };

  // Calon Siswa Comprehensive Update (from Admin or Self-Service)
  const handleUpdateCalonSiswa = (updatedForm: FormulirPPDB) => {
    setFormulirList(prev => {
      const idx = prev.findIndex(f => f.id === updatedForm.id || (f.nisn && f.nisn === updatedForm.nisn));
      let nextList: FormulirPPDB[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = { ...nextList[idx], ...updatedForm };
      } else {
        nextList = [updatedForm, ...prev];
      }
      try {
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(nextList));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(nextList));
      } catch (_) {}
      return nextList;
    });
    saveDocument('formulir_ppdb', updatedForm.id, updatedForm);

    // Synchronize linked user profile if exists
    setUsersList(prev => {
      const targetIdx = prev.findIndex(u =>
        (updatedForm.userId && u.id === updatedForm.userId) ||
        (updatedForm.nisn && (u.username === updatedForm.nisn || u.nipOrNis === updatedForm.nisn))
      );
      if (targetIdx >= 0) {
        const copy = [...prev];
        copy[targetIdx] = {
          ...copy[targetIdx],
          nama: updatedForm.namaLengkap,
          nipOrNis: updatedForm.nisn,
          username: updatedForm.nisn || copy[targetIdx].username,
        };
        saveDocument('users', copy[targetIdx].id, copy[targetIdx]);
        try {
          localStorage.setItem('saved_users_list', JSON.stringify(copy));
        } catch (_) {}
        return copy;
      }
      return prev;
    });

    // If current logged-in user is this student, also update currentUser
    if (currentUser && (
      (updatedForm.userId && currentUser.id === updatedForm.userId) ||
      (updatedForm.nisn && (currentUser.username === updatedForm.nisn || currentUser.nipOrNis === updatedForm.nisn))
    )) {
      setCurrentUser(prev => prev ? ({
        ...prev,
        nama: updatedForm.namaLengkap,
        nipOrNis: updatedForm.nisn,
      }) : null);
    }
  };

  // Master Data Add & Update Handlers
  const handleAddUser = (user: User) => {
    // If re-adding or adding a teacher, ensure it is not blocked by deleted list
    const deletedUserIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    if (deletedUserIds.includes(user.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_USERS, deletedUserIds.filter(id => id !== user.id));
    }
    setUsersList(prev => {
      const sanitized = sanitizeUserAccount(user);
      const nextList = [sanitized, ...prev.filter(u => u.id !== user.id)];
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextList));
        localStorage.setItem('saved_users_list', JSON.stringify(nextList));
      } catch (_) {}
      saveDocument('users', user.id, sanitized).catch(err => console.warn('Save user sync error:', err));
      return nextList;
    });
  };

  const handleUpdateUser = (updatedUser: User) => {
    const sanitized = sanitizeUserAccount(updatedUser);
    setUsersList(prev => {
      const idx = prev.findIndex(u => 
        u.id === sanitized.id || 
        (u.nipOrNis && sanitized.nipOrNis && u.nipOrNis === sanitized.nipOrNis)
      );
      let nextList: User[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = sanitized;
      } else {
        nextList = [sanitized, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextList));
        localStorage.setItem('saved_users_list', JSON.stringify(nextList));
      } catch (_) {}
      saveDocument('users', sanitized.id, sanitized).catch(err => console.warn('Update user sync error:', err));
      return nextList;
    });

    // Cross-synchronize kelasList when a teacher account is updated
    if (sanitized.role === 'guru' || sanitized.role === 'walas' || sanitized.role === 'staf' || sanitized.role === 'pembina_ekskul' || sanitized.role === 'kesiswaan') {
      setKelasList(prevKelas => {
        let changed = false;
        const assignedIds = (sanitized.walasKelasIds && Array.isArray(sanitized.walasKelasIds) && sanitized.walasKelasIds.length > 0)
          ? sanitized.walasKelasIds
          : (sanitized.walasKelasId ? [sanitized.walasKelasId] : (sanitized.idKelas ? [sanitized.idKelas] : []));
        const isWaliTeacher = Boolean((sanitized.role === 'walas' || sanitized.isWalas) && assignedIds.length > 0);

        const nextKelas = prevKelas.map(k => {
          const isAssignedNow = isWaliTeacher && assignedIds.includes(k.id);
          const wasAssigned = 
            k.idWalas === sanitized.id ||
            (sanitized.nipOrNis && k.idWalas === sanitized.nipOrNis) ||
            (k.namaWalas && sanitized.nama && k.namaWalas.trim().toLowerCase() === sanitized.nama.trim().toLowerCase());

          if (isAssignedNow) {
            if (k.idWalas !== sanitized.id || k.namaWalas !== sanitized.nama) {
              changed = true;
              return { ...k, idWalas: sanitized.id, namaWalas: sanitized.nama };
            }
          } else if (wasAssigned && (!isWaliTeacher || !assignedIds.includes(k.id))) {
            changed = true;
            return { ...k, idWalas: '', namaWalas: '' };
          }
          return k;
        });

        if (changed) {
          try {
            localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(nextKelas));
            localStorage.setItem('saved_kelas_list', JSON.stringify(nextKelas));
          } catch (_) {}
          nextKelas.forEach(k => saveDocument('kelas', k.id, k).catch(err => console.warn('Sync kelas error:', err)));
          return nextKelas;
        }
        return prevKelas;
      });
    }

    if (currentUser && (currentUser.id === updatedUser.id || currentUser.username === updatedUser.username)) {
      setCurrentUser(sanitized);
    }
  };

  const handleSaveUsersList = (newUsers: User[]) => {
    const sanitized = newUsers.map(sanitizeUserAccount);
    setUsersList(sanitized);
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitized));
      localStorage.setItem('saved_users_list', JSON.stringify(sanitized));
    } catch (_) {}
    saveBatchDocuments('users', sanitized).catch(err => console.warn('Sync user error:', err));
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === 'u-admin') return;
    const deletedUserIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    if (!deletedUserIds.includes(userId)) {
      saveToStorage(STORAGE_KEYS.DELETED_USERS, [...deletedUserIds, userId]);
    }
    setUsersList(prev => {
      const nextList = prev.filter(u => u.id !== userId);
      try {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextList));
        localStorage.setItem('saved_users_list', JSON.stringify(nextList));
      } catch (_) {}
      removeDocument('users', userId).catch(err => console.warn('Delete user error:', err));
      return nextList;
    });
  };

  const handleAddMapel = (mapel: Mapel) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
    if (deleted.includes(mapel.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_MAPEL, deleted.filter(id => id !== mapel.id));
    }
    setMapelList(prev => {
      const next = [mapel, ...prev.filter(m => m.id !== mapel.id)];
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(next));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.MAPEL, next);
      return next;
    });
    saveDocument('mapel', mapel.id, mapel).catch(err => console.warn('Add mapel sync error:', err));
  };

  const handleUpdateMapel = (mapel: Mapel) => {
    setMapelList(prev => {
      const next = prev.map(m => m.id === mapel.id ? mapel : m);
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(next));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.MAPEL, next);
      return next;
    });
    saveDocument('mapel', mapel.id, mapel).catch(err => console.warn('Update mapel sync error:', err));
  };

  const handleDeleteMapel = (mapelId: string) => {
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
    if (!deleted.includes(mapelId)) {
      saveToStorage(STORAGE_KEYS.DELETED_MAPEL, [...deleted, mapelId]);
    }
    setMapelList(prev => {
      const next = prev.filter(m => m.id !== mapelId);
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(next));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.MAPEL, next);
      return next;
    });
    removeDocument('mapel', mapelId).catch(err => console.warn('Delete mapel sync error:', err));
  };

  const handleSyncMapel = () => {
    // True Synchronization:
    // 1. Keep ALL current mapels (including all custom and user added mapels)
    // 2. Merge in any missing standard DAPODIK subjects from INITIAL_MAPEL (except deleted ones)
    // 3. Save to localStorage
    // 4. Save all to Firestore cloud
    const deleted = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_MAPEL, []);
    setMapelList(prev => {
      const map = new Map<string, Mapel>();
      INITIAL_MAPEL.forEach(m => {
        if (!deleted.includes(m.id)) map.set(m.id, m);
      });
      prev.forEach(m => {
        if (!deleted.includes(m.id)) map.set(m.id, m);
      }); // user mapels take precedence and are strictly preserved!
      const merged = Array.from(map.values());
      try {
        localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(merged));
      } catch (_) {}
      saveToStorage(STORAGE_KEYS.MAPEL, merged);
      merged.forEach(m => saveDocument('mapel', m.id, m).catch(err => console.warn('Sync mapel error:', err)));
      return merged;
    });
  };

  const handleResetToDefaultMapel = () => {
    // Safely sync without wiping user created mapels
    handleSyncMapel();
  };

  const handleAddKelas = (kelas: Kelas) => {
    setKelasList(prev => [...prev, kelas]);
    saveDocument('kelas', kelas.id, kelas).catch(err => console.warn('Add kelas sync error:', err));
  };

  const handleUpdateKelas = (kelas: Kelas) => {
    setKelasList(prev => {
      const nextList = prev.map(k => k.id === kelas.id ? kelas : k);
      try {
        localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(nextList));
        localStorage.setItem('saved_kelas_list', JSON.stringify(nextList));
      } catch (_) {}
      saveDocument('kelas', kelas.id, kelas).catch(err => console.warn('Update kelas sync error:', err));
      return nextList;
    });

    // Cross-sync teachers who hold walas
    setUsersList(prevUsers => {
      let changed = false;
      const nextUsers = prevUsers.map(u => {
        if (u.role === 'siswa' || u.role === 'calon_siswa' || u.role === 'admin') return u;
        const isAssigned = (kelas.idWalas && (kelas.idWalas === u.id || (u.nipOrNis && kelas.idWalas === u.nipOrNis))) ||
          (kelas.namaWalas && u.nama && kelas.namaWalas.trim().toLowerCase() === u.nama.trim().toLowerCase());
        const hadClass = (u.walasKelasIds || []).includes(kelas.id) || u.walasKelasId === kelas.id;
        
        if (isAssigned && !hadClass) {
          changed = true;
          const nextIds = [...(u.walasKelasIds || []).filter(id => id !== kelas.id), kelas.id];
          return {
            ...u,
            isWalas: true,
            role: 'walas' as UserRole,
            walasKelasId: nextIds[0],
            walasKelasIds: nextIds,
            walasNamaKelas: kelas.namaKelas,
            jabatanTambahan: u.jabatanTambahan ? (u.jabatanTambahan.includes('Guru Wali') ? u.jabatanTambahan : `${u.jabatanTambahan}, Guru Wali`) : 'Guru Wali'
          };
        } else if (!isAssigned && hadClass) {
          changed = true;
          const nextIds = (u.walasKelasIds || []).filter(id => id !== kelas.id);
          const stillWalas = nextIds.length > 0;
          return {
            ...u,
            isWalas: stillWalas,
            role: (stillWalas ? 'walas' : (u.role === 'walas' ? 'guru' : u.role)) as UserRole,
            walasKelasId: stillWalas ? nextIds[0] : undefined,
            walasKelasIds: nextIds,
            walasNamaKelas: stillWalas ? u.walasNamaKelas : undefined,
            jabatanTambahan: stillWalas
              ? u.jabatanTambahan
              : (u.jabatanTambahan ? u.jabatanTambahan.replace(/guru wali|wali kelas/gi, '').replace(/^,\s*|,\s*$/g, '').trim() || undefined : undefined)
          };
        }
        return u;
      });

      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(nextUsers));
          localStorage.setItem('saved_users_list', JSON.stringify(nextUsers));
        } catch (_) {}
        nextUsers.forEach(u => saveDocument('users', u.id, u).catch(err => console.warn('Sync user error:', err)));
        return nextUsers;
      }
      return prevUsers;
    });
  };

  const handleDeleteKelas = (kelasId: string) => {
    setKelasList(prev => prev.filter(k => k.id !== kelasId));
    removeDocument('kelas', kelasId);
  };

  // Jadwal Pelajaran Handlers with Automatic Cloud Sync
  const handleSaveJadwalPelajaran = (jadwal: JadwalPelajaran) => {
    const cleanJadwal: JadwalPelajaran = {
      ...jadwal,
      jamMulai: normalizeExcelTime(jadwal.jamMulai, '07:15'),
      jamSelesai: normalizeExcelTime(jadwal.jamSelesai, '08:45'),
      jamKe: jadwal.jamKe || `${jadwal.jumlahJam || 2} JP`,
    };
    setJadwalPelajaranList(prev => {
      const idx = prev.findIndex(j => j.id === cleanJadwal.id);
      let nextList: JadwalPelajaran[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = cleanJadwal;
      } else {
        nextList = [cleanJadwal, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(nextList));
      } catch (_) {}
      saveDocument('jadwal_pelajaran', cleanJadwal.id, cleanJadwal).catch(err => console.warn('Save jadwal sync error:', err));
      return nextList;
    });
  };

  const handleDeleteJadwalPelajaran = (id: string) => {
    setJadwalPelajaranList(prev => {
      const nextList = prev.filter(j => j.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(nextList));
      } catch (_) {}
      removeDocument('jadwal_pelajaran', id).catch(err => console.warn('Delete jadwal sync error:', err));
      return nextList;
    });
  };

  // Jadwal Ujian Handlers with Automatic Cloud Sync
  const handleSaveJadwalUjian = (jadwal: JadwalUjianItem) => {
    setJadwalUjianList(prev => {
      const idx = prev.findIndex(j => j.id === jadwal.id);
      let nextList: JadwalUjianItem[];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = jadwal;
      } else {
        nextList = [jadwal, ...prev];
      }
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_UJIAN, JSON.stringify(nextList));
      } catch (_) {}
      saveDocument('jadwal_ujian', jadwal.id, jadwal).catch(err => console.warn('Save jadwal ujian sync error:', err));
      return nextList;
    });
  };

  const handleDeleteJadwalUjian = (id: string) => {
    setJadwalUjianList(prev => {
      const nextList = prev.filter(j => j.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.JADWAL_UJIAN, JSON.stringify(nextList));
      } catch (_) {}
      removeDocument('jadwal_ujian', id).catch(err => console.warn('Delete jadwal ujian sync error:', err));
      return nextList;
    });
  };

  // Identitas Sekolah & Tahun Ajaran Update
  const handleUpdateSchoolInfo = (newInfo: SchoolInfo) => {
    const cleanNama = newInfo.nama?.trim() || 'SMK';
    const cleanNamaLengkap = newInfo.namaLengkap?.trim() || cleanNama;

    const farmasi = Number(newInfo.kuotaJurusan?.farmasi ?? newInfo.kuotaPerJurusan?.farmasi ?? 72);
    const keperawatan = Number(newInfo.kuotaJurusan?.keperawatan ?? newInfo.kuotaPerJurusan?.asistenKeperawatan ?? 72);
    const kecantikan = Number(newInfo.kuotaJurusan?.kecantikan ?? newInfo.kuotaPerJurusan?.tataKecantikan ?? 36);
    const perhotelan = Number(newInfo.kuotaJurusan?.perhotelan ?? newInfo.kuotaPerJurusan?.perhotelan ?? 36);
    const totalKuota = (farmasi + keperawatan + kecantikan + perhotelan) || newInfo.kuotaSPMB || 216;

    const rombelFarmasi = Number(newInfo.rombelJurusan?.farmasi ?? 2);
    const rombelKeperawatan = Number(newInfo.rombelJurusan?.keperawatan ?? 2);
    const rombelKecantikan = Number(newInfo.rombelJurusan?.kecantikan ?? 1);
    const rombelPerhotelan = Number(newInfo.rombelJurusan?.perhotelan ?? 1);

    const gelombangList = (newInfo.gelombangList && newInfo.gelombangList.length > 0)
      ? newInfo.gelombangList
      : (schoolInfo.gelombangList || []);

    const cleanYayasan = newInfo.kopSekolah?.yayasan?.trim() || 'YAYASAN PENDIDIKAN';
    const cleanInstansi = newInfo.kopSekolah?.instansi?.trim() || cleanNama.toUpperCase();
    const cleanSubJudul = newInfo.kopSekolah?.subJudul?.trim() || 'KOMPETENSI KEAHLIAN VOKASI & KEJURUAN TERPADU';
    const cleanTeleponEmail = newInfo.kopSekolah?.teleponEmail?.trim() || `${newInfo.alamatLengkap || newInfo.alamat} | Telp: ${newInfo.telepon}`;

    const normalized: SchoolInfo = {
      ...newInfo,
      nama: cleanNama,
      namaLengkap: cleanNamaLengkap,
      kuotaSPMB: totalKuota,
      kuotaJurusan: {
        farmasi,
        keperawatan,
        kecantikan,
        perhotelan,
      },
      rombelJurusan: {
        farmasi: rombelFarmasi,
        keperawatan: rombelKeperawatan,
        kecantikan: rombelKecantikan,
        perhotelan: rombelPerhotelan,
      },
      gelombangList,
      kuotaPerJurusan: {
        farmasi,
        asistenKeperawatan: keperawatan,
        tataKecantikan: kecantikan,
        perhotelan,
      },
      kopSekolah: {
        ...newInfo.kopSekolah,
        yayasan: cleanYayasan,
        instansi: cleanInstansi,
        subJudul: cleanSubJudul,
        teleponEmail: cleanTeleponEmail,
        garisGanda: newInfo.kopSekolah?.garisGanda ?? true,
        fontFamily: newInfo.kopSekolah?.fontFamily || 'Times New Roman, Times, Georgia, serif',
        fontSizeYayasan: Number(newInfo.kopSekolah?.fontSizeYayasan || 12),
        fontSizeInstansi: Number(newInfo.kopSekolah?.fontSizeInstansi || 18),
        fontSizeSubJudul: Number(newInfo.kopSekolah?.fontSizeSubJudul || 11),
        fontSizeTeleponEmail: Number(newInfo.kopSekolah?.fontSizeTeleponEmail || 10),
        logoSize: Number(newInfo.kopSekolah?.logoSize || 64),
        lineThickness: newInfo.kopSekolah?.lineThickness || 'sedang',
      }
    };
    setSchoolInfo(normalized);
    saveSchoolInfoToFirestore(normalized);
    try {
      localStorage.setItem('saved_school_info', JSON.stringify(normalized));
    } catch (_) {}
  };

  // Konfirmasi Siswa Baru SPMB
  const handleConfirmNewStudent = (
    formId: string, 
    nomorIndukSiswaResmi: string, 
    kelasDiterima: string, 
    catatan?: string
  ) => {
    let updatedFormObj: FormulirPPDB | undefined;
    setFormulirList(prev => prev.map(f => {
      if (f.id === formId) {
        const updated: FormulirPPDB = {
          ...f,
          statusPendaftaran: 'Diterima' as const,
          statusKonfirmasi: 'Diterima' as const,
          nomorIndukSiswaResmi,
          kelasDiterima,
          tanggalVerifikasi: f.tanggalVerifikasi || new Date().toISOString().substring(0, 10),
          emailNotifikasiTerkirim: true,
          emailNotifikasiWaktu: new Date().toISOString().replace('T', ' ').substring(0, 16),
          catatanAdmin: catatan || f.catatanAdmin,
        };
        updatedFormObj = updated;
        return updated;
      }
      return f;
    }));

    if (updatedFormObj) {
      saveDocument('formulir_ppdb', formId, updatedFormObj);
    }

    const targetForm = updatedFormObj || formulirList.find(f => f.id === formId);
    if (targetForm) {
      setUsersList(prev => {
        const existingIdx = prev.findIndex(u => u.nipOrNis === targetForm.nisn || u.id === targetForm.userId);
        let updatedUser: User;
        if (existingIdx >= 0) {
          const updated = [...prev];
          updatedUser = {
            ...updated[existingIdx],
            role: 'siswa',
            nipOrNis: nomorIndukSiswaResmi || targetForm.nisn,
            kelas: kelasDiterima,
            nama: targetForm.namaLengkap,
          };
          updated[existingIdx] = updatedUser;
          saveDocument('users', updatedUser.id, updatedUser);
          return updated;
        } else {
          updatedUser = {
            id: `u-siswa-${Date.now()}`,
            username: nomorIndukSiswaResmi || targetForm.nisn,
            nama: targetForm.namaLengkap,
            role: 'siswa',
            nipOrNis: nomorIndukSiswaResmi || targetForm.nisn,
            kelas: kelasDiterima,
            password: 'siswa',
          };
          saveDocument('users', updatedUser.id, updatedUser);
          return [...prev, updatedUser];
        }
      });
    }
  };

  // Hapus Calon Siswa Baru SPMB
  const handleDeleteCalonSiswa = (formId: string, userId?: string) => {
    const targetForm = formulirList.find(f => f.id === formId);
    const targetNisn = targetForm?.nisn;
    const targetUserId = userId || targetForm?.userId;

    // 1. Simpan formId ke daftar terhapus (bpm_deleted_ppdb) secara permanen
    const currentDeletedPPDB = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_PPDB, []);
    if (!currentDeletedPPDB.includes(formId)) {
      const nextDeleted = [...currentDeletedPPDB, formId];
      saveToStorage(STORAGE_KEYS.DELETED_PPDB, nextDeleted);
    }

    setFormulirList(prev => {
      const updated = prev.filter(f => f.id !== formId);
      try {
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
    removeDocument('formulir_ppdb', formId);

    // 2. Kumpulkan dan simpan ID akun calon siswa ke daftar DELETED_USERS
    const usersToDelete: string[] = [];
    if (targetUserId) usersToDelete.push(targetUserId);
    if (targetForm) {
      usersToDelete.push(`u-calon-${targetForm.id}`);
      if (targetForm.id.startsWith('ppdb-')) {
        const num = targetForm.id.replace('ppdb-', '');
        usersToDelete.push(`u-calon-${num}`);
      }
    }
    const currentDeletedUsers = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USERS, []);
    const updatedDeletedUsers = Array.from(new Set([...currentDeletedUsers, ...usersToDelete]));
    saveToStorage(STORAGE_KEYS.DELETED_USERS, updatedDeletedUsers);

    if (targetUserId) {
      removeDocument('users', targetUserId);
    }
    usersToDelete.forEach(uid => {
      removeDocument('users', uid);
    });

    setUsersList(prev => {
      const updated = prev.filter(u => {
        if (targetUserId && u.id === targetUserId) return false;
        if (usersToDelete.includes(u.id)) return false;
        if (targetNisn && (u.username === targetNisn || u.nipOrNis === targetNisn)) return false;
        if (targetForm?.namaLengkap && u.nama && u.nama.toLowerCase() === targetForm.namaLengkap.toLowerCase() && u.role === 'calon_siswa') return false;
        return true;
      });
      try {
        localStorage.setItem('saved_users_list', JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Manual Trigger to Push Everything to Cloud Database (Cross-device sync for HP, PC, Tablet)
  const handleSyncAllToCloud = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    return await syncAllDataToCloud({
      schoolInfo,
      formulirList,
      usersList,
      kelasList,
      mapelList,
      kontenList,
      jadwalPelajaranList,
      jadwalUjianList,
      ujianList,
      absensiList,
      ekskulList,
      nilaiList,
      nilaiEkskulList,
      absenMengajarList,
    });
  };

  // Manual Trigger to Force Pull Everything from Cloud Database (Cross-device refresh for HP, PC, Tablet)
  const handlePullAllFromCloud = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    const res = await pullAllDataFromCloud();
    if (!res.success) {
      return { success: false, count: 0, error: res.error };
    }
    let count = 0;
    if (res.schoolInfo && res.schoolInfo.nama) {
      setSchoolInfo(res.schoolInfo);
      try { localStorage.setItem('saved_school_info', JSON.stringify(res.schoolInfo)); } catch (_) {}
      count++;
    }
    if (res.usersList && res.usersList.length > 0) {
      setUsersList((prev) => {
        const map = new Map<string, User>();
        if (Array.isArray(prev)) {
          prev.forEach(u => map.set(u.id, sanitizeUserAccount(u)));
        }
        res.usersList!.forEach((u: User) => map.set(u.id, sanitizeUserAccount(u)));
        const sanitized = Array.from(map.values()).map(sanitizeUserAccount);
        try {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sanitized));
          localStorage.setItem('saved_users_list', JSON.stringify(sanitized));
          saveToStorage(STORAGE_KEYS.DELETED_USERS, []);
        } catch (_) {}
        return sanitized;
      });
      count += res.usersList.length;
    }
    if (res.kelasList && res.kelasList.length > 0) {
      setKelasList((prev) => {
        const map = new Map<string, Kelas>();
        if (Array.isArray(prev)) {
          prev.forEach(k => map.set(k.id, k));
        }
        res.kelasList!.forEach((k: Kelas) => map.set(k.id, k));
        const merged = Array.from(map.values());
        try {
          localStorage.setItem(STORAGE_KEYS.KELAS, JSON.stringify(merged));
          localStorage.setItem('saved_kelas_list', JSON.stringify(merged));
        } catch (_) {}
        return merged;
      });
      count += res.kelasList.length;
    }
    if (res.mapelList && res.mapelList.length > 0) {
      setMapelList((prev) => {
        const map = new Map<string, Mapel>();
        if (Array.isArray(prev)) {
          prev.forEach(m => map.set(m.id, m));
        }
        res.mapelList!.forEach((m: Mapel) => map.set(m.id, m));
        const merged = Array.from(map.values());
        try { 
          localStorage.setItem(STORAGE_KEYS.MAPEL, JSON.stringify(merged));
          saveToStorage(STORAGE_KEYS.DELETED_MAPEL, []);
        } catch (_) {}
        return merged;
      });
      count += res.mapelList.length;
    }
    if (res.formulirList && res.formulirList.length > 0) {
      setFormulirList(res.formulirList);
      try { 
        localStorage.setItem('saved_formulir_ppdb', JSON.stringify(res.formulirList));
        localStorage.setItem(STORAGE_KEYS.FORMULIR_PPDB, JSON.stringify(res.formulirList));
        saveToStorage(STORAGE_KEYS.DELETED_PPDB, []);
      } catch (_) {}
      count += res.formulirList.length;
    }
    if (res.ujianList && res.ujianList.length > 0) {
      setUjianList(res.ujianList);
      try { 
        localStorage.setItem(STORAGE_KEYS.UJIAN, JSON.stringify(res.ujianList));
        saveToStorage('bpm_deleted_ujian', []);
      } catch (_) {}
      count += res.ujianList.length;
    }
    if (res.kontenList && res.kontenList.length > 0) {
      setKontenList(res.kontenList);
      try { localStorage.setItem(STORAGE_KEYS.KONTEN_WEB, JSON.stringify(res.kontenList)); } catch (_) {}
      count += res.kontenList.length;
    }
    if (res.jadwalPelajaranList && res.jadwalPelajaranList.length > 0) {
      const cleanJadwal = res.jadwalPelajaranList.map(j => ({
        ...j,
        jamMulai: normalizeExcelTime(j.jamMulai, '07:15'),
        jamSelesai: normalizeExcelTime(j.jamSelesai, '08:45'),
        jamKe: j.jamKe || `${j.jumlahJam || 2} JP`,
      }));
      setJadwalPelajaranList(cleanJadwal);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_PELAJARAN, JSON.stringify(cleanJadwal)); } catch (_) {}
      count += cleanJadwal.length;
    }
    if (res.jadwalUjianList && res.jadwalUjianList.length > 0) {
      setJadwalUjianList(res.jadwalUjianList);
      try { localStorage.setItem(STORAGE_KEYS.JADWAL_UJIAN, JSON.stringify(res.jadwalUjianList)); } catch (_) {}
      count += res.jadwalUjianList.length;
    }
    if (res.absensiList && res.absensiList.length > 0) {
      setAbsensiList(res.absensiList);
      try { localStorage.setItem(STORAGE_KEYS.ABSENSI, JSON.stringify(res.absensiList)); } catch (_) {}
      count += res.absensiList.length;
    }
    if (res.ekskulList && res.ekskulList.length > 0) {
      setEkskulList(res.ekskulList);
      try { localStorage.setItem(STORAGE_KEYS.EKSKUL, JSON.stringify(res.ekskulList)); } catch (_) {}
      count += res.ekskulList.length;
    }
    if (res.nilaiList && res.nilaiList.length > 0) {
      setNilaiList(res.nilaiList);
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI, JSON.stringify(res.nilaiList));
        localStorage.setItem('saved_nilai_list', JSON.stringify(res.nilaiList));
      } catch (_) {}
      count += res.nilaiList.length;
    }
    if (res.nilaiEkskulList && res.nilaiEkskulList.length > 0) {
      setNilaiEkskulList(res.nilaiEkskulList);
      try {
        localStorage.setItem(STORAGE_KEYS.NILAI_EKSKUL, JSON.stringify(res.nilaiEkskulList));
        localStorage.setItem('saved_nilai_ekskul_list', JSON.stringify(res.nilaiEkskulList));
      } catch (_) {}
      count += res.nilaiEkskulList.length;
    }
    if (res.absenMengajarList && res.absenMengajarList.length > 0) {
      setAbsenMengajarList(res.absenMengajarList);
      try {
        localStorage.setItem(STORAGE_KEYS.ABSEN_MENGAJAR, JSON.stringify(res.absenMengajarList));
      } catch (_) {}
      count += res.absenMengajarList.length;
    }

    // Jika cloud masih kosong tapi perangkat ini memiliki data lokal aktif, otomatis dorong ke cloud (maksimum 1x per sesi)
    const alreadyPushedThisSession = sessionStorage.getItem('has_pushed_initial_cloud') === 'true';
    if (!alreadyPushedThisSession && count === 0 && (usersList.length > 0 || mapelList.length > 0)) {
      sessionStorage.setItem('has_pushed_initial_cloud', 'true');
      console.info('Cloud Firestore kosong, melakukan inisialisasi dorong data master lokal ke cloud...');
      syncAllDataToCloud({
        schoolInfo,
        formulirList,
        usersList,
        kelasList,
        mapelList,
        kontenList,
        jadwalPelajaranList,
        jadwalUjianList,
        ujianList,
        absensiList,
        ekskulList,
        nilaiList,
        nilaiEkskulList,
        absenMengajarList,
      }).catch(err => console.warn('Inisialisasi cloud sync warning:', err));
    }

    return { success: true, count };
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 selection:bg-teal-500 selection:text-white">
      {/* Dynamic Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        availableUsers={usersList}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        schoolInfo={schoolInfo}
        kelasList={kelasList}
        onPullAllFromCloud={handlePullAllFromCloud}
      />

      {/* Floating Welcome & Birthday Notification */}
      {loginWelcomeNotice && (
        <div className={`fixed top-16 right-4 z-50 max-w-md p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-top duration-300 ${
          loginWelcomeNotice.isBirthday 
            ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 text-white border-pink-400 ring-4 ring-pink-300/40' 
            : 'bg-slate-900 text-white border-slate-700 shadow-slate-950/40'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-extrabold text-sm flex items-center gap-1.5">
                {loginWelcomeNotice.isBirthday && <span className="text-base">🎂</span>}
                <span>{loginWelcomeNotice.title}</span>
              </div>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                {loginWelcomeNotice.message}
              </p>
            </div>
            <button
              onClick={() => setLoginWelcomeNotice(null)}
              className="text-white/80 hover:text-white text-xs p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Dynamic Viewport */}
      <main className="flex-1">
        {/* 0. Halaman Login Pengguna Terpadu */}
        {activeTab === 'login' && (
          <LoginView
            availableUsers={usersList}
            formulirList={formulirList}
            currentUser={currentUser}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
            onNavigateToWeb={() => setActiveTab('web')}
            onRegisterCalonSiswa={handleRegisterCalonSiswa}
            schoolInfo={schoolInfo}
          />
        )}

        {/* 1. Web Portal & CMS Display */}
        {activeTab === 'web' && (
          <WebProfilView
            kontenList={kontenList}
            formulirList={formulirList}
            onNavigateToPPDB={() => setActiveTab('ppdb')}
            onNavigateToCAT={() => setActiveTab('cat')}
            onNavigateToLogin={() => setActiveTab('login')}
            onNavigateToGuru={() => setActiveTab('guru')}
            schoolInfo={schoolInfo}
          />
        )}

        {/* 2. SPMB Online */}
        {activeTab === 'ppdb' && (
          <PPDBView
            currentUser={currentUser}
            formulirList={formulirList}
            schoolInfo={schoolInfo}
            onSaveFormulir={handleSaveFormulir}
            onRegisterCalonSiswa={handleRegisterCalonSiswa}
          />
        )}

        {/* 3. Computer Assisted Test (CAT CBT: Siswa Mengikuti Ujian, Guru & Admin Membuat & Mengelola Ujian) */}
        {activeTab === 'cat' && (
          <CATSiswaView
            currentUser={currentUser}
            ujianList={ujianList}
            onFinishUjian={handleFinishUjian}
            schoolInfo={schoolInfo}
            kelasList={kelasList}
            mapelList={mapelList}
            hasilList={hasilList}
            onSaveUjian={handleSaveUjian}
            onDeleteUjian={handleDeleteUjian}
          />
        )}

        {/* 4. Ruang Khusus Siswa (Absensi Mandiri & Profil/Akun) */}
        {activeTab === 'siswa' && currentUser && (
          <SiswaDashboardView
            currentUser={currentUser}
            ujianList={ujianList}
            hasilList={hasilList}
            jadwalPelajaranList={jadwalPelajaranList}
            absensiList={absensiList}
            nilaiList={nilaiList}
            kelasList={kelasList}
            mapelList={mapelList}
            schoolInfo={schoolInfo}
            onNavigateToCAT={() => setActiveTab('cat')}
            onUpdateProfile={handleUpdateUser}
            onAddAbsensi={handleAddAbsensi}
            onUpdateAbsensi={handleUpdateAbsensi}
            onDeleteAbsensi={handleDeleteAbsensi}
            allUsersList={usersList}
            onLogout={handleLogout}
            formulirList={formulirList}
            onNavigateToPPDB={() => setActiveTab('ppdb')}
          />
        )}

        {/* 5. Panel Portal Guru & Absen Mengajar */}
        {activeTab === 'guru' && (
          currentUser && (currentUser.role === 'guru' || currentUser.role === 'walas' || currentUser.role === 'admin') ? (
            <GuruDashboardView
              currentUser={currentUser}
              ujianList={ujianList}
              kelasList={kelasList}
              mapelList={mapelList}
              hasilList={hasilList}
              schoolInfo={schoolInfo}
              usersList={usersList}
              absensiList={absensiList}
              nilaiList={nilaiList}
              ekskulList={ekskulList}
              nilaiEkskulList={nilaiEkskulList}
              jadwalPelajaranList={jadwalPelajaranList}
              absenMengajarList={absenMengajarList}
              onSaveNilaiEkskul={handleSaveNilaiEkskul}
              onSaveUjian={handleSaveUjian}
              onDeleteUjian={handleDeleteUjian}
              onAddAbsensi={handleAddAbsensi}
              onUpdateAbsensi={handleUpdateAbsensi}
              onDeleteAbsensi={handleDeleteAbsensi}
              onSaveNilaiList={handleSaveNilaiList}
              onSaveAbsenMengajar={handleSaveAbsenMengajar}
              onDeleteAbsenMengajar={handleDeleteAbsenMengajar}
              onUpdateProfile={handleUpdateUser}
              onPullAllFromCloud={handlePullAllFromCloud}
            />
          ) : (
            <PortalGuruGatewayView
              teachersList={usersList.filter(u => u.role === 'guru' || u.role === 'walas' || u.role === 'pembina_ekskul')}
              onSelectTeacher={(teacher) => {
                handleLoginSuccess(teacher);
                setActiveTab('guru');
              }}
              currentUser={currentUser}
              schoolInfo={schoolInfo}
              onNavigateToWeb={() => setActiveTab('web')}
            />
          )
        )}

        {/* 6. Leger Nilai Komprehensif Wali Kelas & Admin */}
        {activeTab === 'walas' && currentUser && (
          <WalasDashboardView
            currentUser={currentUser}
            kelasList={kelasList}
            mapelList={mapelList}
            hasilList={hasilList}
            ujianList={ujianList}
            usersList={usersList}
            absensiList={absensiList}
            nilaiList={nilaiList}
            schoolInfo={schoolInfo}
            ekskulList={ekskulList}
            nilaiEkskulList={nilaiEkskulList}
            jadwalPelajaranList={jadwalPelajaranList}
            onSaveNilaiEkskul={handleSaveNilaiEkskul}
            onAddAbsensi={handleAddAbsensi}
            onUpdateAbsensi={handleUpdateAbsensi}
            onDeleteAbsensi={handleDeleteAbsensi}
            onSaveNilaiList={handleSaveNilaiList}
            onUpdateProfile={handleUpdateUser}
            onUpdateSchoolInfo={handleUpdateSchoolInfo}
            onSaveUsersList={handleSaveUsersList}
            onNavigateToGuru={() => setActiveTab('guru')}
            onPullAllFromCloud={handlePullAllFromCloud}
          />
        )}

        {/* 7. Pusat Kendali Super Admin */}
        {activeTab === 'admin' && currentUser && (
          <AdminDashboardView
            currentUser={currentUser}
            ujianList={ujianList}
            kontenList={kontenList}
            formulirList={formulirList}
            usersList={usersList}
            kelasList={kelasList}
            mapelList={mapelList}
            hasilList={hasilList}
            schoolInfo={schoolInfo}
            ekskulList={ekskulList}
            nilaiEkskulList={nilaiEkskulList}
            absensiList={absensiList}
            nilaiList={nilaiList}
            onAddAbsensi={handleAddAbsensi}
            onUpdateAbsensi={handleUpdateAbsensi}
            onDeleteAbsensi={handleDeleteAbsensi}
            onSaveKonten={handleSaveKonten}
            onDeleteKonten={handleDeleteKonten}
            onUpdatePPDBStatus={handleUpdatePPDBStatus}
            onUpdateSchoolInfo={handleUpdateSchoolInfo}
            onConfirmNewStudent={handleConfirmNewStudent}
            onDeleteCalonSiswa={handleDeleteCalonSiswa}
            onUpdateCalonSiswa={handleUpdateCalonSiswa}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onAddMapel={handleAddMapel}
            onUpdateMapel={handleUpdateMapel}
            onDeleteMapel={handleDeleteMapel}
            onAddKelas={handleAddKelas}
            onUpdateKelas={handleUpdateKelas}
            onDeleteKelas={handleDeleteKelas}
            jadwalPelajaranList={jadwalPelajaranList}
            onSaveJadwalPelajaran={handleSaveJadwalPelajaran}
            onDeleteJadwalPelajaran={handleDeleteJadwalPelajaran}
            jadwalUjianList={jadwalUjianList}
            onSaveJadwalUjian={handleSaveJadwalUjian}
            onDeleteJadwalUjian={handleDeleteJadwalUjian}
            onAddEkskul={handleAddEkskul}
            onUpdateEkskul={handleUpdateEkskul}
            onDeleteEkskul={handleDeleteEkskul}
            onSaveNilaiEkskul={handleSaveNilaiEkskul}
            onImportUsers={handleImportUsers}
            onImportMapel={handleImportMapel}
            onImportJadwal={handleImportJadwal}
            onImportNilai={handleImportNilai}
            onResetDatabase={handleResetDatabase}
            onResetNilai={handleResetNilai}
            onResetAbsensi={handleResetAbsensi}
            onResetCalonSiswa={handleResetCalonSiswa}
            onRestoreAllData={handleRestoreAllData}
            onSaveNilaiList={handleSaveNilaiList}
            onSaveUsersList={handleSaveUsersList}
            onSaveUjian={handleSaveUjian}
            onDeleteUjian={handleDeleteUjian}
            onSyncAllToCloud={handleSyncAllToCloud}
            onPullAllFromCloud={handlePullAllFromCloud}
            onResetToDefaultMapel={handleResetToDefaultMapel}
            onSyncMapel={handleSyncMapel}
            absenMengajarList={absenMengajarList}
            onSaveAbsenMengajar={handleSaveAbsenMengajar}
            onDeleteAbsenMengajar={handleDeleteAbsenMengajar}
            onClearAllAbsenMengajar={handleClearAllAbsenMengajar}
          />
        )}

        {/* GLOBAL TOAST NOTIFIKASI PRESENSI BERHASIL TERCATAT (RESPONSIF HP & DESKTOP) */}
        {attendanceToast && (
          <div className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-4 shadow-2xl border-2 border-emerald-400/90 backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-700/50 pb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black tracking-wide uppercase text-emerald-300">
                    Presensi Berhasil Direkam!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttendanceToast(null)}
                  className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                  title="Tutup Notifikasi"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-3 pt-0.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center font-black text-lg shrink-0 shadow-inner">
                  {attendanceToast.namaSiswa.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-extrabold text-white truncate leading-tight">
                    {attendanceToast.namaSiswa}
                  </h4>
                  <p className="text-[11px] text-emerald-200 truncate mt-0.5">
                    Kelas: <span className="font-bold text-white">{attendanceToast.kelas}</span>
                    {attendanceToast.nipd && ` • NIPD: ${attendanceToast.nipd}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      attendanceToast.status === 'Hadir' ? 'bg-emerald-400 text-slate-950 font-black' :
                      attendanceToast.status === 'Terlambat' ? 'bg-amber-400 text-slate-950 font-black' :
                      attendanceToast.status === 'Sakit' ? 'bg-blue-400 text-slate-950 font-black' :
                      attendanceToast.status === 'Izin' ? 'bg-indigo-400 text-slate-950 font-black' :
                      'bg-rose-400 text-slate-950 font-black'
                    }`}>
                      ● {attendanceToast.status}
                    </span>
                    <span className="text-[10px] text-slate-300 font-mono">
                      {attendanceToast.waktu} WIB
                    </span>
                    <span className="text-[10px] text-emerald-300/90 truncate max-w-[150px]">
                      via {attendanceToast.metode}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. Presensi Barcode & QR Code Siswa Per Kelas (Sejajar Menu Utama di Samping Leger Nilai) */}
        {activeTab === 'presensi' && currentUser && (
          currentUser.role === 'admin' || 
          currentUser.role === 'walas' || 
          currentUser.role === 'guru' || 
          currentUser.role === 'staf' ||
          currentUser.isKetuaKelas || 
          (currentUser.jabatanKelas && currentUser.jabatanKelas !== 'Anggota')
        ) && (
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
            <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <AbsensiBarcodeView
                currentUser={currentUser}
                absensiList={absensiList}
                onAddAbsensi={handleAddAbsensi}
                onUpdateAbsensi={handleUpdateAbsensi}
                onDeleteAbsensi={handleDeleteAbsensi}
                kelasList={kelasList}
                allUsersList={usersList}
                schoolInfo={schoolInfo}
              />
            </div>
          </div>
        )}

        {/* Guard for Protected Tabs when Session Cleared (Logged Out) */}
        {!currentUser && ['walas', 'admin', 'siswa', 'presensi'].includes(activeTab) && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm max-w-md space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl font-black">
                🔒
              </div>
              <h3 className="font-bold text-slate-900 text-base">Sesi Telah Berakhir</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Anda telah keluar dari sistem secara penuh. Silakan login kembali dengan akun Anda untuk mengakses fitur ini.
              </p>
              <button
                onClick={() => setActiveTab('login')}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                Menuju Halaman Login
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
