import React, { useState, useEffect, useRef } from 'react';
import { 
  PaketUjian, 
  KontenWeb, 
  FormulirPPDB, 
  User, 
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
} from '../types';
import { 
  Building2, 
  GraduationCap, 
  Users, 
  CalendarDays, 
  KeyRound, 
  Globe2, 
  BarChart3, 
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  School,
  BookOpen,
  Award,
  Database,
  UserCheck,
  Eye,
  EyeOff,
  Save,
  FileSpreadsheet,
  Scan,
  TrendingUp,
  Download,
  Cloud,
  RefreshCw,
  Smartphone,
  Laptop,
  Printer,
  CalendarCheck
} from 'lucide-react';

import { AdminPengaturanTab } from './admin/AdminPengaturanTab';
import { AdminGuruTab } from './admin/AdminGuruTab';
import { AdminSiswaTab } from './admin/AdminSiswaTab';
import { AdminKelasTab } from './admin/AdminKelasTab';
import { AdminMapelTab } from './admin/AdminMapelTab';
import { AdminJadwalTab } from './admin/AdminJadwalTab';
import { AdminAbsenGuruJadwalView } from './admin/AdminAbsenGuruJadwalView';
import { AdminAkunTab } from './admin/AdminAkunTab';
import { AdminCmsTab } from './admin/AdminCmsTab';
import { AdminMonitoringTab } from './admin/AdminMonitoringTab';
import { AdminEkskulTab } from './admin/AdminEkskulTab';
import { AdminDataManagementTab } from './admin/AdminDataManagementTab';
import { AdminKenaikanKelasTab } from './admin/AdminKenaikanKelasTab';
import { AdminPPDBChart } from './admin/AdminPPDBChart';
import { exportPPDBToExcel } from '../utils/exportPPDB';
import { LegerMapelView } from './LegerMapelView';
import { CetakLegerView } from './CetakLegerView';
import { AbsensiBarcodeView } from './AbsensiBarcodeView';
import { GreetingBanner } from './GreetingBanner';

interface AdminDashboardViewProps {
  currentUser: User;
  schoolInfo: SchoolInfo;
  ujianList: PaketUjian[];
  kontenList: KontenWeb[];
  formulirList: FormulirPPDB[];
  usersList: User[];
  kelasList: Kelas[];
  mapelList: Mapel[];
  hasilList: HasilUjian[];
  jadwalPelajaranList?: JadwalPelajaran[];
  jadwalUjianItem?: JadwalUjianItem[];
  jadwalUjianList?: JadwalUjianItem[];
  absensiList?: AbsensiRecord[];
  onAddAbsensi?: (record: AbsensiRecord) => void;
  onUpdateAbsensi?: (record: AbsensiRecord) => void;
  onDeleteAbsensi?: (id: string) => void;
  nilaiList?: NilaiMapelSiswa[];
  ekskulList?: Ekskul[];
  nilaiEkskulList?: NilaiEkskulSiswa[];
  absenMengajarList?: AbsenMengajarRecord[];
  onSaveAbsenMengajar?: (record: AbsenMengajarRecord) => void;
  onDeleteAbsenMengajar?: (id: string) => void;
  onClearAllAbsenMengajar?: () => void;
  onUpdateSchoolInfo: (info: SchoolInfo) => void;
  onSaveKonten: (konten: KontenWeb) => void;
  onDeleteKonten: (kontenId: string) => void;
  onUpdatePPDBStatus: (formId: string, status: FormulirPPDB['statusPendaftaran'], catatan?: string) => void;
  onConfirmNewStudent: (formId: string, nomorIndukSiswaResmi: string, kelasDiterima: string, catatan?: string) => void;
  onAddUser: (user: User) => void;
  onUpdateUser?: (user: User) => void;
  onSaveUsersList?: (users: User[]) => void;
  onDeleteUser: (userId: string) => void;
  onAddMapel: (mapel: Mapel) => void;
  onUpdateMapel?: (mapel: Mapel) => void;
  onDeleteMapel?: (mapelId: string) => void;
  onAddKelas: (kelas: Kelas) => void;
  onUpdateKelas?: (kelas: Kelas) => void;
  onDeleteKelas?: (kelasId: string) => void;
  onSaveJadwalPelajaran?: (jadwal: JadwalPelajaran) => void;
  onDeleteJadwalPelajaran?: (jadwalId: string) => void;
  onSaveJadwalUjian?: (jadwal: JadwalUjianItem) => void;
  onDeleteJadwalUjian?: (jadwalId: string) => void;
  onAddEkskul?: (ekskul: Ekskul) => void;
  onUpdateEkskul?: (ekskul: Ekskul) => void;
  onDeleteEkskul?: (ekskulId: string) => void;
  onSaveNilaiEkskul?: (list: NilaiEkskulSiswa[]) => void;
  onImportUsers?: (users: User[]) => void;
  onImportMapel?: (mapel: Mapel[]) => void;
  onImportJadwal?: (jadwal: JadwalPelajaran[]) => void;
  onImportNilai?: (nilai: NilaiMapelSiswa[]) => void;
  onResetDatabase?: () => void;
  onResetNilai?: () => void;
  onResetAbsensi?: () => void;
  onResetCalonSiswa?: () => void;
  onRestoreAllData?: (data: any) => void;
  onSaveNilaiList?: (newNilaiList: NilaiMapelSiswa[]) => void;
  onDeleteCalonSiswa?: (formId: string, userId?: string) => void;
  onUpdateCalonSiswa?: (updatedForm: FormulirPPDB) => void;
  onSaveUjian?: (ujian: PaketUjian) => void;
  onDeleteUjian?: (ujianId: string) => void;
  onSyncAllToCloud?: () => Promise<{ success: boolean; count: number; error?: string }>;
  onPullAllFromCloud?: () => Promise<{ success: boolean; count: number; error?: string }>;
  onResetToDefaultMapel?: () => void;
  onSyncMapel?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  schoolInfo,
  ujianList,
  kontenList,
  formulirList,
  usersList,
  kelasList,
  mapelList,
  hasilList,
  jadwalPelajaranList = [],
  jadwalUjianList = [],
  absensiList = [],
  nilaiList = [],
  ekskulList = [],
  nilaiEkskulList = [],
  absenMengajarList = [],
  onSaveAbsenMengajar = () => {},
  onDeleteAbsenMengajar = () => {},
  onClearAllAbsenMengajar = () => {},
  onUpdateSchoolInfo,
  onSaveKonten,
  onDeleteKonten,
  onUpdatePPDBStatus,
  onConfirmNewStudent,
  onDeleteCalonSiswa,
  onUpdateCalonSiswa,
  onSyncAllToCloud,
  onPullAllFromCloud,
  onAddUser,
  onUpdateUser = () => {},
  onDeleteUser,
  onAddMapel,
  onUpdateMapel = () => {},
  onDeleteMapel = () => {},
  onAddKelas,
  onUpdateKelas = () => {},
  onDeleteKelas = () => {},
  onSaveJadwalPelajaran = () => {},
  onDeleteJadwalPelajaran = () => {},
  onSaveJadwalUjian = () => {},
  onDeleteJadwalUjian = () => {},
  onAddEkskul = () => {},
  onUpdateEkskul = () => {},
  onDeleteEkskul = () => {},
  onSaveNilaiEkskul = () => {},
  onImportUsers = () => {},
  onImportMapel = () => {},
  onImportJadwal = () => {},
  onImportNilai = () => {},
  onResetDatabase = () => {},
  onResetNilai = () => {},
  onResetAbsensi = () => {},
  onResetCalonSiswa = () => {},
  onRestoreAllData = () => {},
  onSaveNilaiList = () => {},
  onSaveUsersList,
  onAddAbsensi = () => {},
  onUpdateAbsensi = () => {},
  onDeleteAbsensi = () => {},
  onSaveUjian = () => {},
  onDeleteUjian = () => {},
  onResetToDefaultMapel,
  onSyncMapel,
}) => {
  const [activeTab, setActiveTab] = useState<
    'pengaturan' | 'profil_admin' | 'cetak_leger' | 'leger_raport' | 'presensi_barcode' | 'absen_guru_jadwal' | 'naik_kelas' | 'guru' | 'siswa' | 'kelas' | 'mapel' | 'jadwal' | 'ekskul' | 'data_management' | 'akun' | 'cms' | 'monitoring' | 'grafik_ppdb'
  >('pengaturan');

  // Admin Personal User Profile Form State
  const [adminNama, setAdminNama] = useState(currentUser.nama || 'Super Administrator');
  const [adminUsername, setAdminUsername] = useState(currentUser.username || 'admin');
  const [adminPassword, setAdminPassword] = useState(currentUser.password || 'admin123');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminNip, setAdminNip] = useState(currentUser.nipOrNis || 'ADM-2026-001');
  const [adminEmail, setAdminEmail] = useState(currentUser.email || 'admin@smkbaktiputramandiri.sch.id');
  const [adminTelepon, setAdminTelepon] = useState(currentUser.telepon || '(021) 5978-2345');
  const [adminFoto, setAdminFoto] = useState(currentUser.fotoProfilUrl || '');
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  const handleSaveAdminProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...currentUser,
      nama: adminNama.trim(),
      username: adminUsername.trim(),
      password: adminPassword.trim(),
      nipOrNis: adminNip.trim(),
      email: adminEmail.trim(),
      telepon: adminTelepon.trim(),
      fotoProfilUrl: adminFoto.trim(),
    };
    onUpdateUser(updatedUser);
    setProfileSavedNotice(true);
    setTimeout(() => setProfileSavedNotice(false), 4000);
  };

  // Derive students list for monitoring & leger
  const siswaList = usersList
    .filter(u => u.role === 'siswa')
    .map(u => ({
      id: u.id,
      nisn: u.nipOrNis,
      nama: u.nama,
      kelas: u.namaKelas || u.kelas || 'X Farmasi 1',
      jurusan: u.jurusan || 'Farmasi',
      jenisKelamin: (u.jenisKelamin as any) || 'Laki-laki',
      nomorAbsen: 1,
    }));

  const guruCount = usersList.filter(u => u.role === 'guru' || u.role === 'walas').length;
  const siswaCount = usersList.filter(u => u.role === 'siswa').length;
  const ppdbPendingCount = formulirList.filter(f => f.statusPendaftaran === 'Menunggu_Verifikasi').length;

  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  });
  const isFirstMount = useRef(true);

  // Auto-sync debounced trigger when admin modifies any data (users, mapel, kelas, jadwal, nilai, dll.)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!onSyncAllToCloud) return;

    setAutoSyncStatus('syncing');
    const timer = setTimeout(async () => {
      try {
        const res = await onSyncAllToCloud();
        if (res.success) {
          setAutoSyncStatus('synced');
          setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        } else {
          setAutoSyncStatus('idle');
        }
      } catch (_) {
        setAutoSyncStatus('idle');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    usersList,
    kelasList,
    mapelList,
    jadwalPelajaranList,
    jadwalUjianList,
    nilaiList,
    formulirList,
    schoolInfo
  ]);

  // Initial silent push on admin mount so local master data is immediately verified in Cloud Firestore
  useEffect(() => {
    let isCancelled = false;
    const runInitialSync = async () => {
      if (onSyncAllToCloud) {
        setAutoSyncStatus('syncing');
        try {
          const res = await onSyncAllToCloud();
          if (!isCancelled && res.success) {
            setAutoSyncStatus('synced');
            setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
          } else if (!isCancelled) {
            setAutoSyncStatus('idle');
          }
        } catch (_) {
          if (!isCancelled) setAutoSyncStatus('idle');
        }
      }
    };
    runInitialSync();
    return () => { isCancelled = true; };
  }, []);

  const handleManualSync = async () => {
    if (!onSyncAllToCloud) return;
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await onSyncAllToCloud();
      if (res.success) {
        setAutoSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        setSyncNotice({
          text: `Sinkronisasi berhasil! ${res.count} data dikirim ke Cloud Firestore. Data di HP & perangkat lain langsung terupdate.`,
          type: 'success',
        });
      } else {
        setSyncNotice({
          text: `Sinkronisasi belum selesai: ${res.error || 'Periksa koneksi internet'}. Data lokal tetap aman.`,
          type: 'error',
        });
      }
    } catch (e: any) {
      setSyncNotice({
        text: `Koneksi cloud bermasalah: ${e.message}`,
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 6000);
    }
  };

  const handleManualPull = async () => {
    if (!onPullAllFromCloud) return;
    setIsPulling(true);
    setSyncNotice(null);
    try {
      const res = await onPullAllFromCloud();
      if (res.success) {
        setSyncNotice({
          text: `Berhasil mengambil data terbaru dari Cloud! ${res.count} data diperbarui di perangkat ini.`,
          type: 'success',
        });
      } else {
        setSyncNotice({
          text: `Gagal mengambil data dari cloud: ${res.error || 'Silakan coba lagi'}`,
          type: 'error',
        });
      }
    } catch (e: any) {
      setSyncNotice({
        text: `Error koneksi cloud: ${e.message}`,
        type: 'error',
      });
    } finally {
      setIsPulling(false);
      setTimeout(() => setSyncNotice(null), 6000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Sapaan Waktu & Ucapan Ulang Tahun */}
      <GreetingBanner user={currentUser} />

      {/* Top Banner Overview */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PUSAT KENDALI SUPER ADMINISTRATOR</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/30">
              <span className={`w-2 h-2 rounded-full ${autoSyncStatus === 'syncing' ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'}`}></span>
              <span>
                {autoSyncStatus === 'syncing' 
                  ? 'Menyinkronkan otomatis ke Cloud...' 
                  : autoSyncStatus === 'synced' && lastSyncTime
                    ? `Sinkron Otomatis Aktif (${lastSyncTime})`
                    : 'Cloud Firestore Real-Time Aktif'}
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {schoolInfo.nama}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Sistem Informasi Manajemen Sekolah Terpadu: Sinkronisasi instan lintas perangkat (Komputer ↔ HP/Tablet).
          </p>
          
          {/* Quick Push & Pull Cloud Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            {onSyncAllToCloud && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing || isPulling}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sedang Mengunggah...' : 'Kirim Sinkron Semua ke Cloud'}</span>
              </button>
            )}

            {onPullAllFromCloud && (
              <button
                type="button"
                onClick={handleManualPull}
                disabled={isSyncing || isPulling}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                <span>{isPulling ? 'Sedang Mengambil...' : 'Tarik Data Terbaru dari Cloud'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('cetak_leger')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Cetak Leger per-mata pelajaran dan leger keseluruhan tiap walas"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Leger Rombel & Mapel</span>
            </button>

            <div className="text-[11px] text-slate-300 flex items-center gap-1.5 ml-1">
              <Laptop className="w-3.5 h-3.5 text-amber-300" />
              <span>Komputer</span>
              <span>↔</span>
              <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
              <span>HP / Tablet</span>
            </div>
          </div>

          {syncNotice && (
            <div className={`mt-2 p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
              syncNotice.type === 'success' 
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncNotice.text}</span>
            </div>
          )}
        </div>

        {/* Quick Stats Counter */}
        <div className="grid grid-cols-3 gap-3 z-10 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/10">
            <span className="block text-xl sm:text-2xl font-black text-amber-300">{guruCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-300 font-medium">Guru & Walas</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/10">
            <span className="block text-xl sm:text-2xl font-black text-emerald-300">{siswaCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-300 font-medium">Siswa Aktif</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 text-center border border-white/10">
            <span className="block text-xl sm:text-2xl font-black text-rose-300">{ppdbPendingCount}</span>
            <span className="text-[10px] sm:text-xs text-slate-300 font-medium">Verifikasi PPDB</span>
          </div>
        </div>
      </div>

      {/* Modern Multi-Row Admin Navigation Menu - Rapih & Tidak Perlu Geser/Scroll */}
      <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm space-y-3">
        {/* Baris 1: Pusat Kontrol & Data Induk Sekolah */}
        <div>
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Menu Utama, Akun & Data Induk Akademik:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('pengaturan')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'pengaturan'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>Pengaturan & KOP</span>
            </button>

            <button
              onClick={() => setActiveTab('profil_admin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'profil_admin'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4 text-blue-500" />
              <span>Profil Pengguna</span>
            </button>

            <button
              onClick={() => setActiveTab('cetak_leger')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'cetak_leger'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                  : 'text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Cetak Leger (Mapel & Walas)</span>
            </button>

            <button
              onClick={() => setActiveTab('leger_raport')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'leger_raport'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>Buku Leger & Raport Sekolah</span>
            </button>

            <button
              onClick={() => setActiveTab('presensi_barcode')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'presensi_barcode'
                  ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-200'
                  : 'text-teal-900 bg-teal-50/80 hover:bg-teal-100 border border-teal-200'
              }`}
            >
              <Scan className="w-4 h-4 text-teal-600" />
              <span>Presensi Barcode Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('absen_guru_jadwal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'absen_guru_jadwal'
                  ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-300'
                  : 'text-teal-950 bg-teal-50/90 hover:bg-teal-100 border border-teal-300'
              }`}
              title="Absen guru pengampu sesuai jadwal dan jumlah jam tatap muka tiap rombel"
            >
              <CalendarCheck className="w-4 h-4 text-teal-600" />
              <span>Absen Guru Sesuai Jadwal</span>
            </button>

            <button
              onClick={() => setActiveTab('guru')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'guru'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span>Manajemen Guru</span>
            </button>

            <button
              onClick={() => setActiveTab('siswa')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'siswa'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Manajemen Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('kelas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'kelas'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <School className="w-4 h-4 text-purple-600" />
              <span>Manajemen Kelas / Rombel</span>
            </button>

            <button
              onClick={() => setActiveTab('naik_kelas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'naik_kelas'
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                  : 'text-emerald-950 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-300'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              <span>Kenaikan Kelas & Kelulusan (Semester 2)</span>
            </button>
          </div>
        </div>

        {/* Baris 2: Kurikulum, Kesiswaan & Manajemen Sistem */}
        <div className="border-t border-slate-200/80 pt-2.5">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 px-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Kurikulum, Ekstrakurikuler, Kesiswaan & Sistem:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('mapel')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'mapel'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>Mata Pelajaran</span>
            </button>

            <button
              onClick={() => setActiveTab('jadwal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'jadwal'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-rose-500" />
              <span>Jadwal KBM & Ujian</span>
            </button>

            <button
              onClick={() => setActiveTab('ekskul')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'ekskul'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Ekstrakurikuler ({ekskulList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('akun')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'akun'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4 text-teal-600" />
              <span>Akun & Verifikasi Calon Siswa</span>
              {ppdbPendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {ppdbPendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('grafik_ppdb')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'grafik_ppdb'
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                  : 'text-amber-950 bg-amber-50/90 hover:bg-amber-100 border border-amber-300'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>Grafik Tren & Kuota PPDB</span>
            </button>

            <button
              onClick={() => setActiveTab('data_management')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'data_management'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Database className="w-4 h-4 text-slate-500" />
              <span>Backup & Impor/Ekspor</span>
            </button>

            <button
              onClick={() => setActiveTab('cms')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'cms'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Globe2 className="w-4 h-4 text-cyan-600" />
              <span>CMS Web & Galeri</span>
            </button>

            <button
              onClick={() => setActiveTab('monitoring')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'monitoring'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-violet-600" />
              <span>Monitoring KBM & CAT</span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      <div>
        {activeTab === 'pengaturan' && (
          <AdminPengaturanTab
            schoolInfo={schoolInfo}
            onUpdateSchoolInfo={onUpdateSchoolInfo}
          />
        )}

        {/* PROFIL AKUN PENGGUNA (ADMINISTRATOR) */}
        {activeTab === 'profil_admin' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl overflow-hidden border border-amber-200">
                  {adminFoto ? (
                    <img src={adminFoto} alt="Foto Profil" className="w-full h-full object-cover" />
                  ) : (
                    <span>{adminNama.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Akun Pengguna: {currentUser.role.toUpperCase()}</span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{adminNama}</h2>
                  <p className="text-xs text-slate-500">ID / NIP: {adminNip} • Username: @{adminUsername}</p>
                </div>
              </div>

              {profileSavedNotice && (
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Profil Akun Berhasil Diperbarui!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveAdminProfile} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Lengkap Pengguna <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminNama}
                    onChange={(e) => setAdminNama(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    NIP / Nomor Identitas Pegawai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminNip}
                    onChange={(e) => setAdminNip(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kata Sandi / Password Baru <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email Dinas / Resmi
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={adminTelepon}
                    onChange={(e) => setAdminTelepon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    URL Foto Profil (Opsional)
                  </label>
                  <input
                    type="text"
                    value={adminFoto}
                    onChange={(e) => setAdminFoto(e.target.value)}
                    placeholder="https://... atau biarkan kosong untuk inisial avatar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan Akun Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PUSAT CETAK LEGER RESMI SEKOLAH (SUPER ADMINISTRATOR ACCESS) */}
        {activeTab === 'cetak_leger' && (
          <CetakLegerView
            currentUser={currentUser}
            kelasList={kelasList}
            mapelList={mapelList}
            usersList={usersList}
            nilaiList={nilaiList}
            absensiList={absensiList}
            schoolInfo={schoolInfo}
            jadwalPelajaranList={jadwalPelajaranList}
            onPullAllFromCloud={onPullAllFromCloud}
          />
        )}

        {/* BUKU LEGER & RAPORT SEKOLAH (SUPER ADMINISTRATOR ACCESS) */}
        {activeTab === 'leger_raport' && (
          <LegerMapelView
            currentUser={currentUser}
            kelasList={kelasList}
            mapelList={mapelList}
            hasilList={hasilList}
            usersList={usersList}
            nilaiList={nilaiList}
            onSaveNilaiList={onSaveNilaiList}
            absensiList={absensiList}
            schoolInfo={schoolInfo}
            ekskulList={ekskulList}
            nilaiEkskulList={nilaiEkskulList}
            jadwalPelajaranList={jadwalPelajaranList}
            onUpdateSchoolInfo={onUpdateSchoolInfo}
            onPullAllFromCloud={onPullAllFromCloud}
          />
        )}

        {/* PRESENSI BARCODE PER KELAS & SCANNER MANDIRI */}
        {activeTab === 'presensi_barcode' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <AbsensiBarcodeView
              currentUser={currentUser}
              usersList={usersList}
              allUsersList={usersList}
              absensiList={absensiList || []}
              onAddAbsensi={onAddAbsensi}
              onUpdateAbsensi={onUpdateAbsensi}
              onDeleteAbsensi={onDeleteAbsensi}
              kelasList={kelasList}
              schoolInfo={schoolInfo}
            />
          </div>
        )}

        {activeTab === 'guru' && (
          <AdminGuruTab
            usersList={usersList}
            mapelList={mapelList}
            kelasList={kelasList}
            ekskulList={ekskulList}
            onAddUser={onAddUser}
            onUpdateUser={onUpdateUser}
            onDeleteUser={onDeleteUser}
            onUpdateKelas={onUpdateKelas}
            onUpdateEkskul={onUpdateEkskul}
            onSyncAllToCloud={onSyncAllToCloud}
            onPullAllFromCloud={onPullAllFromCloud}
          />
        )}

        {activeTab === 'siswa' && (
          <AdminSiswaTab
            usersList={usersList}
            kelasList={kelasList}
            schoolInfo={schoolInfo}
            onAddUser={onAddUser}
            onUpdateUser={onUpdateUser}
            onDeleteUser={onDeleteUser}
          />
        )}

        {activeTab === 'kelas' && (
          <AdminKelasTab
            kelasList={kelasList}
            usersList={usersList}
            onAddKelas={onAddKelas}
            onUpdateKelas={onUpdateKelas}
            onDeleteKelas={onDeleteKelas}
          />
        )}

        {activeTab === 'naik_kelas' && (
          <AdminKenaikanKelasTab
            usersList={usersList}
            kelasList={kelasList}
            nilaiList={nilaiList || []}
            absensiList={absensiList || []}
            schoolInfo={schoolInfo}
            onUpdateUser={onUpdateUser}
            onUpdateSchoolInfo={onUpdateSchoolInfo}
            onSaveUsersList={onSaveUsersList}
          />
        )}

        {activeTab === 'mapel' && (
          <AdminMapelTab
            mapelList={mapelList}
            onAddMapel={onAddMapel}
            onUpdateMapel={onUpdateMapel}
            onDeleteMapel={onDeleteMapel}
            onResetToDefaultMapel={onResetToDefaultMapel}
            onSyncMapel={onSyncMapel}
          />
        )}

        {activeTab === 'absen_guru_jadwal' && (
          <AdminAbsenGuruJadwalView
            currentUser={currentUser}
            jadwalPelajaranList={jadwalPelajaranList}
            absenMengajarList={absenMengajarList}
            kelasList={kelasList}
            mapelList={mapelList}
            usersList={usersList}
            schoolInfo={schoolInfo}
            onSaveAbsenMengajar={onSaveAbsenMengajar}
            onDeleteAbsenMengajar={onDeleteAbsenMengajar}
            onClearAllAbsenMengajar={onClearAllAbsenMengajar}
          />
        )}

        {activeTab === 'jadwal' && (
          <AdminJadwalTab
            schoolInfo={schoolInfo}
            kelasList={kelasList}
            mapelList={mapelList}
            usersList={usersList}
            jadwalPelajaranList={jadwalPelajaranList}
            jadwalUjianList={jadwalUjianList}
            onSaveJadwalPelajaran={onSaveJadwalPelajaran}
            onDeleteJadwalPelajaran={onDeleteJadwalPelajaran}
            onSaveJadwalUjian={onSaveJadwalUjian}
            onDeleteJadwalUjian={onDeleteJadwalUjian}
            onImportJadwal={onImportJadwal}
            onOpenAbsenGuru={() => setActiveTab('absen_guru_jadwal')}
          />
        )}

        {activeTab === 'ekskul' && (
          <AdminEkskulTab
            ekskulList={ekskulList}
            usersList={usersList}
            kelasList={kelasList}
            nilaiEkskulList={nilaiEkskulList}
            onAddEkskul={onAddEkskul}
            onUpdateEkskul={onUpdateEkskul}
            onDeleteEkskul={onDeleteEkskul}
            onSaveNilaiEkskul={onSaveNilaiEkskul}
            onUpdateUser={onUpdateUser}
          />
        )}

        {activeTab === 'data_management' && (
          <AdminDataManagementTab
            usersList={usersList}
            kelasList={kelasList}
            mapelList={mapelList}
            jadwalPelajaranList={jadwalPelajaranList || []}
            jadwalUjianList={jadwalUjianList || []}
            nilaiList={nilaiList || []}
            nilaiEkskulList={nilaiEkskulList || []}
            absensiList={absensiList || []}
            formulirList={formulirList}
            ekskulList={ekskulList || []}
            ujianList={ujianList || []}
            schoolInfo={schoolInfo}
            onImportUsers={onImportUsers}
            onImportMapel={onImportMapel}
            onImportJadwal={onImportJadwal}
            onImportNilai={onImportNilai}
            onResetDatabase={onResetDatabase}
            onResetNilai={onResetNilai}
            onResetAbsensi={onResetAbsensi}
            onResetCalonSiswa={onResetCalonSiswa}
            onRestoreAllData={onRestoreAllData}
            onSyncAllToCloud={onSyncAllToCloud}
            onPullAllFromCloud={onPullAllFromCloud}
          />
        )}

        {activeTab === 'akun' && (
          <AdminAkunTab
            usersList={usersList}
            formulirList={formulirList}
            kelasList={kelasList}
            schoolInfo={schoolInfo}
            onUpdateUser={onUpdateUser}
            onUpdatePPDBStatus={onUpdatePPDBStatus}
            onConfirmNewStudent={onConfirmNewStudent}
            onDeleteCalonSiswa={onDeleteCalonSiswa}
            onUpdateCalonSiswa={onUpdateCalonSiswa}
          />
        )}

        {activeTab === 'cms' && (
          <AdminCmsTab
            kontenList={kontenList}
            schoolInfo={schoolInfo}
            onSaveKonten={onSaveKonten}
            onDeleteKonten={onDeleteKonten}
            onUpdateSchoolInfo={onUpdateSchoolInfo}
          />
        )}

        {activeTab === 'monitoring' && (
          <AdminMonitoringTab
            ujianList={ujianList}
            siswaList={siswaList}
            kelasList={kelasList}
            mapelList={mapelList}
            currentUser={currentUser}
            usersList={usersList}
            absenMengajarList={absenMengajarList}
            jadwalPelajaranList={jadwalPelajaranList}
            schoolInfo={schoolInfo}
            absensiList={absensiList}
            onAddAbsensi={onAddAbsensi}
            onUpdateAbsensi={onUpdateAbsensi}
            onDeleteAbsensi={onDeleteAbsensi}
            onSaveUjian={onSaveUjian}
            onDeleteUjian={onDeleteUjian}
            onSaveAbsenMengajar={onSaveAbsenMengajar}
            onDeleteAbsenMengajar={onDeleteAbsenMengajar}
            onClearAllAbsenMengajar={onClearAllAbsenMengajar}
          />
        )}

        {activeTab === 'grafik_ppdb' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                    <TrendingUp className="w-6 h-6" />
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    Pusat Visualisasi Tren Pendaftar & Analisis Kuota SPMB
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                  Komponen visualisasi interaktif data real-time berbasis Recharts. Memonitor tren pendaftaran kumulatif dan harian per kejuruan serta rasio keterisian kuota siswa baru.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => exportPPDBToExcel(formulirList, schoolInfo.nama)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  title="Unduh seluruh data pendaftar calon siswa baru ke format file Microsoft Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Unduh Data PPDB (.xlsx)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-[10px] font-mono">
                    {formulirList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('akun')}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Daftar Calon Siswa & Akun</span>
                </button>
              </div>
            </div>

            <AdminPPDBChart formulirList={formulirList} schoolInfo={schoolInfo} />
          </div>
        )}
      </div>
    </div>
  );
};
