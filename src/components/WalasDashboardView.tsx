import React, { useState } from 'react';
import { User, Kelas, Mapel, HasilUjian, PaketUjian, AbsensiRecord, NilaiMapelSiswa, SchoolInfo, Ekskul, NilaiEkskulSiswa, JadwalPelajaran } from '../types';
import { LegerMapelView } from './LegerMapelView';
import { CetakLegerView } from './CetakLegerView';
import { AbsensiBarcodeView } from './AbsensiBarcodeView';
import { NilaiEkskulView } from './NilaiEkskulView';
import { AdminKenaikanKelasTab } from './admin/AdminKenaikanKelasTab';
import { KartuPelajarModal } from './KartuPelajarModal';
import { GreetingBanner } from './GreetingBanner';
import { isUserAdmin, isUserWalas, getWalasAssignedClasses, isSameKelas } from '../utils/academicHelpers';
import { 
  Award, 
  Printer, 
  Download, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Scan, 
  FileText, 
  Camera, 
  Edit3, 
  Lock,
  Search,
  UserCheck,
  GraduationCap,
  IdCard
} from 'lucide-react';

interface WalasDashboardViewProps {
  currentUser: User;
  kelasList: Kelas[];
  mapelList: Mapel[];
  hasilList: HasilUjian[];
  ujianList: PaketUjian[];
  usersList?: User[];
  absensiList?: AbsensiRecord[];
  nilaiList?: NilaiMapelSiswa[];
  schoolInfo?: SchoolInfo;
  ekskulList?: Ekskul[];
  nilaiEkskulList?: NilaiEkskulSiswa[];
  jadwalPelajaranList?: JadwalPelajaran[];
  onSaveNilaiEkskul?: (list: NilaiEkskulSiswa[]) => void;
  onAddAbsensi?: (record: AbsensiRecord) => void;
  onUpdateAbsensi?: (record: AbsensiRecord) => void;
  onDeleteAbsensi?: (id: string) => void;
  onSaveNilaiList?: (newNilaiList: NilaiMapelSiswa[]) => void;
  onUpdateProfile?: (user: User) => void;
  onUpdateSchoolInfo?: (info: SchoolInfo) => void;
  onSaveUsersList?: (users: User[]) => void;
  onNavigateToGuru?: () => void;
  onPullAllFromCloud?: () => Promise<any>;
}

export const WalasDashboardView: React.FC<WalasDashboardViewProps> = ({
  currentUser,
  kelasList,
  mapelList,
  hasilList,
  ujianList,
  usersList = [],
  absensiList = [],
  nilaiList = [],
  schoolInfo,
  ekskulList = [],
  nilaiEkskulList = [],
  jadwalPelajaranList = [],
  onSaveNilaiEkskul = () => {},
  onAddAbsensi = () => {},
  onUpdateAbsensi = () => {},
  onDeleteAbsensi = () => {},
  onSaveNilaiList = () => {},
  onUpdateProfile = () => {},
  onUpdateSchoolInfo = () => {},
  onSaveUsersList = () => {},
  onNavigateToGuru,
  onPullAllFromCloud,
}) => {
  const isSuperAdmin = isUserAdmin(currentUser);
  const walasAssignedClasses = getWalasAssignedClasses(currentUser, kelasList);
  const isWalas = isSuperAdmin || walasAssignedClasses.length > 0;

  // Strict RBAC Guard: If user is not admin and not walas, prevent unauthorized access
  if (!isWalas) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900">Hak Akses Terbatas (Wali Kelas)</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Halaman ini khusus diperuntukkan bagi <strong>Wali Kelas</strong> dan <strong>Administrator</strong> untuk mengelola Leger Keseluruhan Rombel, Raport Siswa, Nilai Ekstrakurikuler, dan Kenaikan Kelas.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-left space-y-1 max-w-lg mx-auto">
          <p className="font-bold text-slate-800">Status Akun Anda:</p>
          <p>Nama: <strong>{currentUser.nama}</strong> ({currentUser.nipOrNis || currentUser.username})</p>
          <p>Peran: <strong>Guru Mata Pelajaran</strong> (bukan Wali Kelas aktif)</p>
          <p className="text-slate-500 pt-1">
            Sebagai Guru Mata Pelajaran, Anda dapat menginput nilai dan memantau presensi mata pelajaran yang Anda ampu melalui menu <strong>Panel Guru</strong>.
          </p>
        </div>
        {onNavigateToGuru && (
          <button
            type="button"
            onClick={onNavigateToGuru}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            <span>Buka Panel Guru Saya</span>
          </button>
        )}
      </div>
    );
  }

  const availableClasses = isSuperAdmin ? kelasList : walasAssignedClasses;

  const [selectedClassId, setSelectedClassId] = useState<string>(
    availableClasses[0]?.id || kelasList[0]?.id || ''
  );

  const [activeSubTab, setActiveSubTab] = useState<'leger' | 'cetak_leger' | 'presensi' | 'ekskul' | 'raport' | 'naik_kelas' | 'profil'>('leger');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
  const [singlePrintSiswa, setSinglePrintSiswa] = useState<User | null>(null);

  // Profile Edit State
  const [editNama, setEditNama] = useState(currentUser.nama);
  const [editGelar, setEditGelar] = useState(currentUser.gelar || '');
  const [editTelepon, setEditTelepon] = useState(currentUser.telepon || '');
  const [editEmail, setEditEmail] = useState(currentUser.email || '');
  const [editPassword, setEditPassword] = useState(currentUser.password || 'guru123');
  const [editFotoUrl, setEditFotoUrl] = useState(currentUser.fotoProfilUrl || '');

  const activeKelas = kelasList.find(k => k.id === selectedClassId) || walasAssignedClasses[0] || kelasList[0];

  // Real students belonging to this class
  const classStudents = usersList.filter(u => {
    if (u.role !== 'siswa') return false;
    if (u.idKelas === selectedClassId) return true;
    if (activeKelas && (isSameKelas(u.kelas, activeKelas.namaKelas) || isSameKelas(u.namaKelas, activeKelas.namaKelas))) return true;
    return false;
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: User = {
      ...currentUser,
      nama: editNama,
      gelar: editGelar,
      telepon: editTelepon,
      email: editEmail,
      password: editPassword,
      fotoProfilUrl: editFotoUrl,
    };
    onUpdateProfile(updated);
    setIsEditProfileOpen(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditFotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Sapaan Waktu & Ucapan Ulang Tahun */}
      <GreetingBanner user={currentUser} />

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-1 shadow-md">
              <div className="w-full h-full rounded-xl bg-white overflow-hidden flex items-center justify-center">
                {currentUser.fotoProfilUrl ? (
                  <img src={currentUser.fotoProfilUrl} alt={currentUser.nama} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-emerald-700">{currentUser.nama.charAt(0)}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsEditProfileOpen(true)}
              className="absolute -bottom-1 -right-1 p-1.5 bg-slate-900 text-white rounded-lg shadow-md hover:bg-emerald-600"
              title="Ganti Foto"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                <Award className="w-3 h-3" />
                Wali Kelas Resmi
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium">
                {activeKelas?.namaKelas}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {currentUser.nama}
            </h1>
            <p className="text-xs text-slate-500">
              Wali Kelas {activeKelas?.namaKelas} • {classStudents.length} Siswa Terdaftar • {activeKelas?.jurusan}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {(currentUser.role === 'admin' || availableClasses.length > 1) && (
            <div className="flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200 p-1.5 rounded-xl">
              <span className="text-xs font-bold text-emerald-900 px-1.5 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                Pilih Kelas Binaan:
              </span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1 text-xs font-bold rounded-lg border border-emerald-300 bg-white shadow-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {availableClasses.map(k => (
                  <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setActiveSubTab('cetak_leger')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Buka Menu Cetak Leger Per-Mapel dan Leger Keseluruhan Rombel Ini"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Leger Rombel</span>
          </button>

          <button
            onClick={() => setIsBulkPrintOpen(true)}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Cetak Kartu Pelajar Resmi Semua Siswa di Rombel Ini (Barcode Persegi QR)"
          >
            <IdCard className="w-3.5 h-3.5" />
            <span>Cetak Kartu Pelajar Rombel</span>
          </button>

          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profil Saya</span>
          </button>
        </div>
      </div>

      {/* Walas Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'leger', label: 'Buku Leger Rombel', icon: BookOpen },
          { id: 'cetak_leger', label: 'Cetak Leger (Mapel & Keseluruhan)', icon: Printer },
          { id: 'presensi', label: 'Presensi Barcode Kelas', icon: Scan },
          { id: 'ekskul', label: 'Nilai Ekstrakurikuler Siswa', icon: Award },
          { id: 'raport', label: 'Raport Kurikulum Merdeka', icon: FileText },
          { id: 'naik_kelas', label: 'Kenaikan Kelas & Kelulusan (Semester 2)', icon: GraduationCap },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: CETAK LEGER KHUSUS ROMBEL WALAS */}
      {activeSubTab === 'cetak_leger' && (
        <CetakLegerView
          currentUser={currentUser}
          kelasList={availableClasses}
          mapelList={mapelList}
          usersList={usersList}
          nilaiList={nilaiList}
          absensiList={absensiList}
          schoolInfo={schoolInfo}
          jadwalPelajaranList={jadwalPelajaranList}
          defaultClassId={selectedClassId}
          onPullAllFromCloud={onPullAllFromCloud}
        />
      )}

      {/* TAB CONTENT: LEGER & RAPORT (Hanya kelas dan siswa yang diampu) */}
      {(activeSubTab === 'leger' || activeSubTab === 'raport') && (
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
          onPullAllFromCloud={onPullAllFromCloud}
        />
      )}

      {/* TAB CONTENT: NILAI EKSTRAKURIKULER */}
      {activeSubTab === 'ekskul' && (
        <NilaiEkskulView
          currentUser={currentUser}
          ekskulList={ekskulList}
          usersList={usersList}
          kelasList={availableClasses}
          nilaiEkskulList={nilaiEkskulList}
          onSaveNilaiEkskul={onSaveNilaiEkskul}
          onUpdateUser={onUpdateProfile}
        />
      )}

      {/* TAB CONTENT: PRESENSI BARCODE */}
      {activeSubTab === 'presensi' && (
        <AbsensiBarcodeView
          currentUser={currentUser}
          usersList={usersList}
          kelasList={availableClasses}
          absensiList={absensiList}
          onAddAbsensi={onAddAbsensi}
          onUpdateAbsensi={onUpdateAbsensi}
          onDeleteAbsensi={onDeleteAbsensi}
          schoolInfo={schoolInfo}
        />
      )}

      {/* TAB CONTENT: KENAIKAN KELAS & KELULUSAN (SEMESTER 2 / PAT) */}
      {activeSubTab === 'naik_kelas' && (
        <AdminKenaikanKelasTab
          usersList={usersList}
          kelasList={availableClasses}
          nilaiList={nilaiList}
          absensiList={absensiList}
          schoolInfo={schoolInfo || ({} as SchoolInfo)}
          onUpdateUser={onUpdateProfile}
          onUpdateSchoolInfo={onUpdateSchoolInfo}
          onSaveUsersList={onSaveUsersList}
        />
      )}

      {/* MODAL: EDIT PROFIL WALAS */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Edit Profil Wali Kelas</h3>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Foto Profil</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-xl font-bold text-emerald-700">
                    {editFotoUrl ? (
                      <img src={editFotoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      currentUser.nama.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. WhatsApp</label>
                  <input
                    type="text"
                    value={editTelepon}
                    onChange={(e) => setEditTelepon(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-medium focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Kata Sandi Baru (Password)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Ganti kata sandi..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs focus:border-emerald-500 bg-white"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CETAK KARTU PELAJAR (QR CODE PERSEGI) */}
      {(singlePrintSiswa || isBulkPrintOpen) && (
        <KartuPelajarModal
          siswa={singlePrintSiswa || classStudents[0]}
          schoolInfo={schoolInfo}
          bulkStudents={isBulkPrintOpen ? classStudents : undefined}
          onClose={() => {
            setSinglePrintSiswa(null);
            setIsBulkPrintOpen(false);
          }}
        />
      )}
    </div>
  );
};
