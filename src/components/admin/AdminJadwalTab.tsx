import React, { useState } from 'react';
import { JadwalPelajaran, JadwalUjianItem, Kelas, Mapel, User, SchoolInfo } from '../../types';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  Building2, 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  Filter, 
  ShieldCheck, 
  Sparkles,
  Key,
  Check,
  FileSpreadsheet,
  Download,
  Upload,
  UserCheck
} from 'lucide-react';
import { 
  downloadTemplateJadwalExcel, 
  exportJadwalToExcel, 
  readSpreadsheetFile,
  normalizeExcelTime,
  formatDisplayJamKBM,
  extractJadwalTimes
} from '../../utils/excelHelper';

interface AdminJadwalTabProps {
  jadwalPelajaranList: JadwalPelajaran[];
  jadwalUjianList: JadwalUjianItem[];
  kelasList: Kelas[];
  mapelList: Mapel[];
  usersList: User[];
  schoolInfo: SchoolInfo;
  onSaveJadwalPelajaran: (jadwal: JadwalPelajaran) => void;
  onDeleteJadwalPelajaran: (id: string) => void;
  onSaveJadwalUjian: (jadwal: JadwalUjianItem) => void;
  onDeleteJadwalUjian: (id: string) => void;
  onImportJadwal?: (jadwal: JadwalPelajaran[]) => void;
  onOpenAbsenGuru?: () => void;
}

export const AdminJadwalTab: React.FC<AdminJadwalTabProps> = ({
  jadwalPelajaranList,
  jadwalUjianList,
  kelasList,
  mapelList,
  usersList,
  schoolInfo,
  onSaveJadwalPelajaran,
  onDeleteJadwalPelajaran,
  onSaveJadwalUjian,
  onDeleteJadwalUjian,
  onImportJadwal,
  onOpenAbsenGuru,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'pelajaran' | 'ujian'>('pelajaran');
  const [notification, setNotification] = useState<string | null>(null);

  // Filters for Jadwal Pelajaran
  const [filterHari, setFilterHari] = useState<string>('Semua');
  const [filterKelasPelajaran, setFilterKelasPelajaran] = useState<string>('Semua');

  // Filters for Jadwal Ujian
  const [filterKelasUjian, setFilterKelasUjian] = useState<string>('Semua');
  const [filterJenisUjian, setFilterJenisUjian] = useState<string>('Semua');

  // Modal Jadwal Pelajaran
  const [showPelajaranModal, setShowPelajaranModal] = useState(false);
  const [editingPelajaran, setEditingPelajaran] = useState<JadwalPelajaran | null>(null);
  const [formPelajaranHari, setFormPelajaranHari] = useState<JadwalPelajaran['hari']>('Senin');
  const [formPelajaranJamMulai, setFormPelajaranJamMulai] = useState('07:15');
  const [formPelajaranJamSelesai, setFormPelajaranJamSelesai] = useState('08:45');
  const [formPelajaranJumlahJam, setFormPelajaranJumlahJam] = useState<number>(2);
  const [formPelajaranIdKelas, setFormPelajaranIdKelas] = useState(kelasList[0]?.id || '');
  const [formPelajaranIdMapel, setFormPelajaranIdMapel] = useState(mapelList[0]?.id || '');
  const [formPelajaranIdGuru, setFormPelajaranIdGuru] = useState('');
  const [formPelajaranRuang, setFormPelajaranRuang] = useState('Lab Farmasi 1');

  // Modal Jadwal Ujian
  const [showUjianModal, setShowUjianModal] = useState(false);
  const [editingUjian, setEditingUjian] = useState<JadwalUjianItem | null>(null);
  const [formUjianNama, setFormUjianNama] = useState('');
  const [formUjianJenis, setFormUjianJenis] = useState<JadwalUjianItem['jenisUjian']>('UAS CAT');
  const [formUjianTanggal, setFormUjianTanggal] = useState('2026-06-15');
  const [formUjianJamMulai, setFormUjianJamMulai] = useState('08:00');
  const [formUjianJamSelesai, setFormUjianJamSelesai] = useState('09:30');
  const [formUjianSesi, setFormUjianSesi] = useState('Sesi 1');
  const [formUjianIdKelas, setFormUjianIdKelas] = useState(kelasList[0]?.id || '');
  const [formUjianIdMapel, setFormUjianIdMapel] = useState(mapelList[0]?.id || '');
  const [formUjianRuang, setFormUjianRuang] = useState('Lab CBT Komputer 1');
  const [formUjianPengawas, setFormUjianPengawas] = useState('');
  const [formUjianProktor, setFormUjianProktor] = useState('Tim IT BAPUMA');
  const [formUjianToken, setFormUjianToken] = useState('BAKTI26X');

  // Print Preview Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState<'pelajaran' | 'ujian'>('pelajaran');

  const teachersList = usersList.filter(u => u.role === 'guru' || u.role === 'walas');

  // Filtered lists
  const filteredPelajaran = jadwalPelajaranList.filter(j => {
    const matchHari = filterHari === 'Semua' || j.hari === filterHari;
    const matchKelas = filterKelasPelajaran === 'Semua' || j.idKelas === filterKelasPelajaran;
    return matchHari && matchKelas;
  });

  const filteredUjian = jadwalUjianList.filter(u => {
    const matchKelas = filterKelasUjian === 'Semua' || u.idKelas === filterKelasUjian;
    const matchJenis = filterJenisUjian === 'Semua' || u.jenisUjian === filterJenisUjian;
    return matchKelas && matchJenis;
  });

  // Pelajaran Handlers
  const handleOpenAddPelajaran = () => {
    setEditingPelajaran(null);
    setFormPelajaranHari('Senin');
    setFormPelajaranJamMulai('07:15');
    setFormPelajaranJamSelesai('08:45');
    setFormPelajaranJumlahJam(2);
    setFormPelajaranIdKelas(kelasList[0]?.id || '');
    setFormPelajaranIdMapel(mapelList[0]?.id || '');
    setFormPelajaranIdGuru(teachersList[0]?.id || '');
    setFormPelajaranRuang('Lab Farmasi 1');
    setShowPelajaranModal(true);
  };

  const handleOpenEditPelajaran = (j: JadwalPelajaran) => {
    setEditingPelajaran(j);
    setFormPelajaranHari(j.hari);
    setFormPelajaranJamMulai(normalizeExcelTime(j.jamMulai, '07:15'));
    setFormPelajaranJamSelesai(normalizeExcelTime(j.jamSelesai, '08:45'));
    setFormPelajaranJumlahJam(j.jumlahJam || 2);
    setFormPelajaranIdKelas(j.idKelas);
    setFormPelajaranIdMapel(j.idMapel);
    setFormPelajaranIdGuru(j.idGuru);
    setFormPelajaranRuang(j.ruang);
    setShowPelajaranModal(true);
  };

  const handleSavePelajaran = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedKelas = kelasList.find(k => k.id === formPelajaranIdKelas);
    const matchedMapel = mapelList.find(m => m.id === formPelajaranIdMapel);
    const matchedGuru = teachersList.find(g => g.id === formPelajaranIdGuru);

    const cleanJamMulai = normalizeExcelTime(formPelajaranJamMulai, '07:15');
    const cleanJamSelesai = normalizeExcelTime(formPelajaranJamSelesai, '08:45');

    const jadwalItem: JadwalPelajaran = {
      id: editingPelajaran ? editingPelajaran.id : `jp-${Date.now()}`,
      hari: formPelajaranHari,
      jamMulai: cleanJamMulai,
      jamSelesai: cleanJamSelesai,
      jumlahJam: Number(formPelajaranJumlahJam) || 2,
      jamKe: `${formPelajaranJumlahJam || 2} JP`,
      idKelas: formPelajaranIdKelas,
      namaKelas: matchedKelas?.namaKelas || 'Kelas',
      idMapel: formPelajaranIdMapel,
      namaMapel: matchedMapel?.namaMapel || 'Mapel',
      idGuru: formPelajaranIdGuru,
      namaGuru: matchedGuru?.nama || 'Guru',
      ruang: formPelajaranRuang,
      tahunAjaran: schoolInfo.tahunAjaranPembelajaran,
      semester: schoolInfo.semesterPembelajaran,
    };

    onSaveJadwalPelajaran(jadwalItem);
    setShowPelajaranModal(false);
    setNotification('Jadwal pelajaran berhasil disimpan!');
    setTimeout(() => setNotification(null), 3000);
  };

  // Import Jadwal Excel (.xlsx / .xls / .csv)
  const handleImportExcelJadwal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rawRows = await readSpreadsheetFile(file);
      if (rawRows.length <= 1) throw new Error('Berkas Excel kosong atau tidak ada data baris.');

      const headerRow = rawRows[0].map((h: any) => String(h || '').trim().toLowerCase());
      const colHari = headerRow.findIndex((h: string) => h.includes('hari'));
      const colKelas = headerRow.findIndex((h: string) => h.includes('kelas') || h.includes('rombel'));
      const colJamMulai = headerRow.findIndex((h: string) => h.includes('mulai') || h.includes('awal'));
      const colJamSelesai = headerRow.findIndex((h: string) => h.includes('selesai') || h.includes('akhir'));
      const colJamKBM = headerRow.findIndex((h: string) => 
        h.includes('jam kbm') || h.includes('waktu kbm') || h.includes('jam pelajaran') || 
        h.includes('waktu pelajaran') || h.includes('jam / waktu') || 
        (h.includes('jam') && !h.includes('jp') && !h.includes('jumlah') && !h.includes('ke'))
      );
      const colJP = headerRow.findIndex((h: string) => h.includes('jp') || h.includes('jumlah jam') || h.includes('durasi') || h.includes('jam ke'));
      const colMapel = headerRow.findIndex((h: string) => h.includes('mapel') || h.includes('mata pelajaran') || h.includes('pelajaran'));
      const colGuru = headerRow.findIndex((h: string) => h.includes('guru') || h.includes('pengampu') || h.includes('pendidik'));
      const colRuang = headerRow.findIndex((h: string) => h.includes('ruang') || h.includes('lab') || h.includes('tempat'));

      const imported: JadwalPelajaran[] = [];
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const rawHari = String(row[colHari !== -1 ? colHari : 0] || 'Senin').trim();
        const validHari: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu') =
          ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].includes(rawHari as any)
            ? (rawHari as any)
            : 'Senin';

        const namaKelas = String(row[colKelas !== -1 ? colKelas : 1] || 'X Farmasi 1').trim();
        const { jamMulai, jamSelesai, jp } = extractJadwalTimes(row, colJamMulai, colJamSelesai, colJamKBM, colJP, 2, 3);
        
        const namaMapel = String(
          (colMapel !== -1 ? row[colMapel] : null) || 
          (row.length > 5 ? row[5] : null) || 
          row[4] || 
          'Mata Pelajaran'
        ).trim();

        const namaGuru = String(
          (colGuru !== -1 ? row[colGuru] : null) || 
          (row.length > 6 ? row[6] : null) || 
          row[5] || 
          'Guru Pengampu'
        ).trim();

        const ruang = String(
          (colRuang !== -1 ? row[colRuang] : null) || 
          (row.length > 7 ? row[7] : null) || 
          row[6] || 
          'Lab Praktik'
        ).trim();

        const matchedKelas = kelasList.find(k => k.namaKelas.toLowerCase() === namaKelas.toLowerCase()) || kelasList[0];
        const matchedMapel = mapelList.find(m => m.namaMapel.toLowerCase() === namaMapel.toLowerCase());
        const matchedGuru = usersList.find(u => u.nama.toLowerCase().includes(namaGuru.toLowerCase()));

        imported.push({
          id: `jp-imp-${Date.now()}-${i}`,
          hari: validHari,
          jamMulai,
          jamSelesai,
          jumlahJam: jp,
          jamKe: `${jp} JP`,
          idKelas: matchedKelas?.id || `k-${Date.now()}`,
          namaKelas: matchedKelas?.namaKelas || namaKelas,
          idMapel: matchedMapel?.id || `m-${Date.now()}`,
          namaMapel: matchedMapel?.namaMapel || namaMapel,
          idGuru: matchedGuru?.id || `g-${Date.now()}`,
          namaGuru: matchedGuru?.nama || namaGuru,
          ruang,
          tahunAjaran: schoolInfo.tahunAjaranPembelajaran,
          semester: schoolInfo.semesterPembelajaran,
        });
      }

      if (onImportJadwal) {
        onImportJadwal(imported);
      } else {
        imported.forEach(j => onSaveJadwalPelajaran(j));
      }

      setNotification(`Sukses! Berhasil mengimpor ${imported.length} sesi jadwal pelajaran dari Excel!`);
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      alert(`Gagal membaca berkas Excel jadwal: ${err.message}`);
    }
  };

  // Ujian Handlers
  const handleOpenAddUjian = () => {
    setEditingUjian(null);
    setFormUjianNama('UAS Semester Genap CBT');
    setFormUjianJenis('UAS CAT');
    setFormUjianTanggal('2026-06-15');
    setFormUjianJamMulai('08:00');
    setFormUjianJamSelesai('09:30');
    setFormUjianSesi('Sesi 1');
    setFormUjianIdKelas(kelasList[0]?.id || '');
    setFormUjianIdMapel(mapelList[0]?.id || '');
    setFormUjianRuang('Lab CBT Komputer 1');
    setFormUjianPengawas(teachersList[0]?.nama || 'Pengawas Ruang');
    setFormUjianProktor('Tim IT BAPUMA');
    setFormUjianToken(`BAKTI${Math.floor(10 + Math.random() * 90)}X`);
    setShowUjianModal(true);
  };

  const handleOpenEditUjian = (u: JadwalUjianItem) => {
    setEditingUjian(u);
    setFormUjianNama(u.namaUjian);
    setFormUjianJenis(u.jenisUjian);
    setFormUjianTanggal(u.tanggal);
    setFormUjianJamMulai(u.jamMulai);
    setFormUjianJamSelesai(u.jamSelesai);
    setFormUjianSesi(u.sesi);
    setFormUjianIdKelas(u.idKelas);
    setFormUjianIdMapel(u.idMapel);
    setFormUjianRuang(u.ruang);
    setFormUjianPengawas(u.pengawas);
    setFormUjianProktor(u.proktor || 'Tim IT');
    setFormUjianToken(u.token || 'BPM26X');
    setShowUjianModal(true);
  };

  const handleSaveUjian = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedKelas = kelasList.find(k => k.id === formUjianIdKelas);
    const matchedMapel = mapelList.find(m => m.id === formUjianIdMapel);

    const ujianItem: JadwalUjianItem = {
      id: editingUjian ? editingUjian.id : `ju-${Date.now()}`,
      namaUjian: formUjianNama,
      jenisUjian: formUjianJenis,
      tanggal: formUjianTanggal,
      jamMulai: formUjianJamMulai,
      jamSelesai: formUjianJamSelesai,
      sesi: formUjianSesi,
      idKelas: formUjianIdKelas,
      namaKelas: matchedKelas?.namaKelas || 'Kelas',
      idMapel: formUjianIdMapel,
      namaMapel: matchedMapel?.namaMapel || 'Mapel',
      ruang: formUjianRuang,
      pengawas: formUjianPengawas,
      proktor: formUjianProktor,
      token: formUjianToken,
    };

    onSaveJadwalUjian(ujianItem);
    setShowUjianModal(false);
    setNotification('Jadwal ujian berhasil disimpan!');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TOP SUB-TAB NAV */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-2 shadow-sm justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab('pelajaran')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'pelajaran'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Jadwal Pelajaran Mingguan ({jadwalPelajaranList.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ujian')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeSubTab === 'ujian'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Jadwal Ujian CAT & UKK LSP ({jadwalUjianList.length})</span>
          </button>
        </div>

        <button
          onClick={() => {
            setPrintType(activeSubTab);
            setShowPrintModal(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Printer className="w-4 h-4 text-amber-700" />
          <span>Cetak Dokumen Resmi (KOP)</span>
        </button>
      </div>

      {/* 1. JADWAL PELAJARAN TAB */}
      {activeSubTab === 'pelajaran' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Hari:</span>
              <div className="flex items-center gap-1">
                {['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((h) => (
                  <button
                    key={h}
                    onClick={() => setFilterHari(h)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                      filterHari === h ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>

              <select
                value={filterKelasPelajaran}
                onChange={(e) => setFilterKelasPelajaran(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-white ml-2"
              >
                <option value="Semua">Semua Kelas</option>
                {kelasList.map(k => (
                  <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Unduh Template Excel (.xlsx) */}
              <button
                type="button"
                onClick={() => downloadTemplateJadwalExcel(kelasList, mapelList, teachersList)}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unduh format template jadwal pelajaran Microsoft Excel (.xlsx) bukan CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                <span>Unduh Template Excel (.xlsx)</span>
              </button>

              {/* Ekspor Excel */}
              <button
                type="button"
                onClick={() => exportJadwalToExcel(jadwalPelajaranList, schoolInfo.nama)}
                className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Ekspor seluruh jadwal pelajaran ke berkas Excel (.xlsx)"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>

              {/* Impor Excel */}
              <label className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm">
                <Upload className="w-4 h-4" />
                <span>Impor Jadwal (.xlsx)</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleImportExcelJadwal}
                />
              </label>

              {/* Tambah Jadwal Manual */}
              <button
                onClick={handleOpenAddPelajaran}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal</span>
              </button>

              {/* Shortcut Absen Guru */}
              {onOpenAbsenGuru && (
                <button
                  type="button"
                  onClick={onOpenAbsenGuru}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Buka modul absensi guru sesuai jadwal dan jumlah jam"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Absen Guru Hari Ini</span>
                </button>
              )}
            </div>
          </div>

          {/* TABLE JADWAL PELAJARAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">Hari & Jam KBM</th>
                    <th className="py-3.5 px-4 text-center">Durasi (JP)</th>
                    <th className="py-3.5 px-4">Kelas & Rombel</th>
                    <th className="py-3.5 px-4">Mata Pelajaran</th>
                    <th className="py-3.5 px-4">Guru Pengampu</th>
                    <th className="py-3.5 px-4">Ruangan / Lab Praktik</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPelajaran.map((j) => (
                    <tr key={j.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px]">
                          {j.hari}
                        </span>
                        <div className="font-mono text-slate-600 text-[11px] mt-1">
                          {formatDisplayJamKBM(j.jamMulai, j.jamSelesai)}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-extrabold text-xs">
                          {j.jumlahJam || 2} JP
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {j.namaKelas}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{j.namaMapel}</div>
                        <span className="text-[10px] text-slate-400">T.A. {j.tahunAjaran} ({j.semester})</span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-emerald-800">
                        {j.namaGuru}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] font-medium">
                          {j.ruang}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditPelajaran(j)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors cursor-pointer"
                            title="Edit Jadwal"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Hapus jadwal pelajaran ini?')) {
                                onDeleteJadwalPelajaran(j.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Jadwal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPelajaran.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        Belum ada jadwal pelajaran untuk kriteria filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. JADWAL UJIAN TAB */}
      {activeSubTab === 'ujian' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterJenisUjian}
                onChange={(e) => setFilterJenisUjian(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-white"
              >
                <option value="Semua">Semua Jenis Ujian</option>
                <option value="Ujian Tulis ASTS">Ujian Tulis ASTS</option>
                <option value="Ujian Tulis ASAS">Ujian Tulis ASAS</option>
                <option value="Ujian Tulis ASAT">Ujian Tulis ASAT</option>
                <option value="UAS CAT">UAS CAT</option>
                <option value="UTS CAT">UTS CAT</option>
                <option value="Tryout UKK">Tryout UKK</option>
                <option value="UKK LSP Kejuruan">UKK LSP Kejuruan</option>
              </select>

              <select
                value={filterKelasUjian}
                onChange={(e) => setFilterKelasUjian(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold bg-white"
              >
                <option value="Semua">Semua Kelas Peserta</option>
                {kelasList.map(k => (
                  <option key={k.id} value={k.id}>{k.namaKelas}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenAddUjian}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jadwal Ujian</span>
            </button>
          </div>

          {/* TABLE JADWAL UJIAN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">Nama Ujian & Jenis</th>
                    <th className="py-3.5 px-4">Tanggal & Waktu</th>
                    <th className="py-3.5 px-4">Kelas & Mapel</th>
                    <th className="py-3.5 px-4">Ruang CBT & Sesi</th>
                    <th className="py-3.5 px-4">Pengawas & Proktor</th>
                    <th className="py-3.5 px-4">Token CAT</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUjian.map((u) => (
                    <tr key={u.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.namaUjian}</div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 inline-block ${
                          u.jenisUjian === 'Ujian Tulis ASTS' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                          u.jenisUjian === 'Ujian Tulis ASAS' ? 'bg-sky-100 text-sky-900 border border-sky-200' :
                          u.jenisUjian === 'Ujian Tulis ASAT' ? 'bg-teal-100 text-teal-900 border border-teal-200' :
                          u.jenisUjian === 'UAS CAT' ? 'bg-blue-100 text-blue-800' :
                          u.jenisUjian === 'UTS CAT' ? 'bg-amber-100 text-amber-800' :
                          u.jenisUjian === 'UKK LSP Kejuruan' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {u.jenisUjian}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{u.tanggal}</div>
                        <div className="font-mono text-slate-500 text-[11px]">
                          {u.jamMulai} - {u.jamSelesai} WIB
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-purple-900">{u.namaKelas}</div>
                        <div className="text-slate-600 text-[11px]">{u.namaMapel}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{u.ruang}</div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                          {u.sesi}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-semibold">{u.pengawas}</div>
                        <div className="text-slate-400 text-[10px]">Proktor: {u.proktor || 'Tim IT'}</div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-300 text-amber-900 font-black tracking-wider text-xs">
                          {u.token || 'BPM26X'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditUjian(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600 transition-colors"
                            title="Edit Jadwal Ujian"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Hapus jadwal ujian ini?')) {
                                onDeleteJadwalUjian(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Jadwal Ujian"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUjian.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        Belum ada jadwal ujian yang dijadwalkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT JADWAL PELAJARAN */}
      {showPelajaranModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{editingPelajaran ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran Baru'}</span>
              </h4>
              <button
                onClick={() => setShowPelajaranModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePelajaran} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hari *
                  </label>
                  <select
                    value={formPelajaranHari}
                    onChange={(e) => setFormPelajaranHari(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Senin">Senin</option>
                    <option value="Selasa">Selasa</option>
                    <option value="Rabu">Rabu</option>
                    <option value="Kamis">Kamis</option>
                    <option value="Jumat">Jumat</option>
                    <option value="Sabtu">Sabtu</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jam Mulai *
                  </label>
                  <input
                    type="time"
                    required
                    value={formPelajaranJamMulai}
                    onChange={(e) => setFormPelajaranJamMulai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jam Selesai *
                  </label>
                  <input
                    type="time"
                    required
                    value={formPelajaranJamSelesai}
                    onChange={(e) => setFormPelajaranJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Durasi (JP) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={formPelajaranJumlahJam}
                    onChange={(e) => setFormPelajaranJumlahJam(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-purple-900"
                    placeholder="2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelas / Rombel *
                  </label>
                  <select
                    value={formPelajaranIdKelas}
                    onChange={(e) => setFormPelajaranIdKelas(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.namaKelas} ({k.jurusan})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ruang / Lab Praktik *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPelajaranRuang}
                    onChange={(e) => setFormPelajaranRuang(e.target.value)}
                    placeholder="Lab Farmasi / Lab Mini Hospital"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mata Pelajaran *
                </label>
                <select
                  value={formPelajaranIdMapel}
                  onChange={(e) => setFormPelajaranIdMapel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                >
                  {mapelList.map(m => (
                    <option key={m.id} value={m.id}>{m.namaMapel} ({m.kelompok})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Guru Pengampu *
                </label>
                <select
                  value={formPelajaranIdGuru}
                  onChange={(e) => setFormPelajaranIdGuru(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-emerald-900"
                >
                  <option value="">-- Pilih Tenaga Pendidik --</option>
                  {teachersList.map(g => (
                    <option key={g.id} value={g.id}>{g.nama} ({g.nipOrNis})</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPelajaranModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Jadwal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT JADWAL UJIAN */}
      {showUjianModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>{editingUjian ? 'Edit Jadwal Ujian' : 'Tambah Jadwal Ujian Baru'}</span>
              </h4>
              <button
                onClick={() => setShowUjianModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUjian} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Agenda Ujian *
                </label>
                <input
                  type="text"
                  required
                  value={formUjianNama}
                  onChange={(e) => setFormUjianNama(e.target.value)}
                  placeholder="Contoh: UAS Semester Genap CBT"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jenis Evaluasi Ujian *
                  </label>
                  <select
                    value={formUjianJenis}
                    onChange={(e) => setFormUjianJenis(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Ujian Tulis ASTS">Ujian Tulis ASTS (Asesmen Sumatif Tengah Semester)</option>
                    <option value="Ujian Tulis ASAS">Ujian Tulis ASAS (Asesmen Sumatif Akhir Semester)</option>
                    <option value="Ujian Tulis ASAT">Ujian Tulis ASAT (Asesmen Sumatif Akhir Tahun)</option>
                    <option value="UAS CAT">UAS CAT (Akhir Semester Online)</option>
                    <option value="UTS CAT">UTS CAT (Tengah Semester Online)</option>
                    <option value="Tryout UKK">Tryout UKK</option>
                    <option value="UKK LSP Kejuruan">UKK LSP Kejuruan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tanggal Pelaksanaan *
                  </label>
                  <input
                    type="date"
                    required
                    value={formUjianTanggal}
                    onChange={(e) => setFormUjianTanggal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jam Mulai *
                  </label>
                  <input
                    type="time"
                    required
                    value={formUjianJamMulai}
                    onChange={(e) => setFormUjianJamMulai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jam Selesai *
                  </label>
                  <input
                    type="time"
                    required
                    value={formUjianJamSelesai}
                    onChange={(e) => setFormUjianJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sesi Ujian *
                  </label>
                  <select
                    value={formUjianSesi}
                    onChange={(e) => setFormUjianSesi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="Sesi 1">Sesi 1 (Pagi)</option>
                    <option value="Sesi 2">Sesi 2 (Siang)</option>
                    <option value="Sesi 3">Sesi 3 (Sore)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kelas / Rombel Peserta *
                  </label>
                  <select
                    value={formUjianIdKelas}
                    onChange={(e) => setFormUjianIdKelas(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.namaKelas}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mata Pelajaran Diujikan *
                  </label>
                  <select
                    value={formUjianIdMapel}
                    onChange={(e) => setFormUjianIdMapel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    {mapelList.map(m => (
                      <option key={m.id} value={m.id}>{m.namaMapel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ruang CBT / Lab Komputer *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUjianRuang}
                    onChange={(e) => setFormUjianRuang(e.target.value)}
                    placeholder="Lab CBT Komputer 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Token Rilis Soal *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUjianToken}
                    onChange={(e) => setFormUjianToken(e.target.value)}
                    placeholder="BPM26X"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/50 font-mono font-bold text-amber-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pengawas Ruangan
                  </label>
                  <input
                    type="text"
                    value={formUjianPengawas}
                    onChange={(e) => setFormUjianPengawas(e.target.value)}
                    placeholder="Nama Pengawas"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Proktor Ruang / Teknisi
                  </label>
                  <input
                    type="text"
                    value={formUjianProktor}
                    onChange={(e) => setFormUjianProktor(e.target.value)}
                    placeholder="Tim IT BAPUMA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUjianModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Jadwal Ujian</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRINT RESMI DENGAN KOP SURAT */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-600" />
                <span>Pratinjau Cetak Dokumen Kedinasan Resmi</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* DOKUMEN CETAK WITH OFFICIAL KOP */}
            <div className="p-6 border border-slate-300 rounded-xl bg-white text-slate-950 space-y-4">
              {/* KOP RESMI */}
              <div className="flex items-center justify-center gap-4 pb-2 border-b-2 border-slate-900">
                <img
                  src={schoolInfo.logoUrl || '/logo_bpm.png'}
                  alt="Logo"
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=120&q=80';
                  }}
                />
                <div className="text-center flex-1">
                  <p className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                    {schoolInfo.kopSekolah?.yayasan || 'YAYASAN PENDIDIKAN BAKTI PUTRA MANDIRI'}
                  </p>
                  <h3 className="text-base font-black uppercase text-slate-950">
                    {schoolInfo.kopSekolah?.instansi || schoolInfo.nama}
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-700">
                    {schoolInfo.kopSekolah?.subJudul || 'Kompetensi: Farmasi • Asisten Keperawatan • Tata Kecantikan • Perhotelan'}
                  </p>
                  <p className="text-[9px] text-slate-500">
                    {schoolInfo.kopSekolah?.teleponEmail || schoolInfo.alamatLengkap}
                  </p>
                </div>
              </div>

              {/* JUDUL DOKUMEN */}
              <div className="text-center py-2">
                <h4 className="font-bold text-sm uppercase underline">
                  {printType === 'pelajaran'
                    ? `JADWAL PELAJARAN SEMESTER ${schoolInfo.semesterPembelajaran.toUpperCase()}`
                    : 'JADWAL PELAKSANAAN UJIAN CAT & UKK KEJURUAN'}
                </h4>
                <p className="text-[11px] text-slate-600">
                  Tahun Pelajaran {schoolInfo.tahunAjaranPembelajaran}
                </p>
              </div>

              {/* TABEL DATA PRINT */}
              <table className="w-full text-[11px] border border-slate-400 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                    <th className="border border-slate-400 p-2 text-center">No</th>
                    {printType === 'pelajaran' ? (
                      <>
                        <th className="border border-slate-400 p-2">Hari & Jam</th>
                        <th className="border border-slate-400 p-2">Kelas</th>
                        <th className="border border-slate-400 p-2">Mata Pelajaran</th>
                        <th className="border border-slate-400 p-2">Guru Pengampu</th>
                        <th className="border border-slate-400 p-2">Ruang</th>
                      </>
                    ) : (
                      <>
                        <th className="border border-slate-400 p-2">Agenda Ujian</th>
                        <th className="border border-slate-400 p-2">Tanggal & Waktu</th>
                        <th className="border border-slate-400 p-2">Kelas & Mapel</th>
                        <th className="border border-slate-400 p-2">Ruangan</th>
                        <th className="border border-slate-400 p-2">Pengawas</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {printType === 'pelajaran' ? (
                    jadwalPelajaranList.map((j, idx) => (
                      <tr key={j.id} className="border-b border-slate-300">
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2">{j.hari}, {formatDisplayJamKBM(j.jamMulai, j.jamSelesai)}</td>
                        <td className="border border-slate-300 p-2">{j.namaKelas}</td>
                        <td className="border border-slate-300 p-2">{j.namaMapel}</td>
                        <td className="border border-slate-300 p-2">{j.namaGuru}</td>
                        <td className="border border-slate-300 p-2">{j.ruang}</td>
                      </tr>
                    ))
                  ) : (
                    jadwalUjianList.map((u, idx) => (
                      <tr key={u.id} className="border-b border-slate-300">
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2">{u.namaUjian} ({u.jenisUjian})</td>
                        <td className="border border-slate-300 p-2">{u.tanggal} ({u.jamMulai}-{u.jamSelesai})</td>
                        <td className="border border-slate-300 p-2">{u.namaKelas} - {u.namaMapel}</td>
                        <td className="border border-slate-300 p-2">{u.ruang} ({u.sesi})</td>
                        <td className="border border-slate-300 p-2">{u.pengawas}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* TANDA TANGAN KEPALA SEKOLAH */}
              <div className="pt-6 flex justify-end">
                <div className="text-center text-xs space-y-12">
                  <div>
                    <p>Bogor, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-semibold">Kepala Sekolah,</p>
                  </div>
                  <div>
                    <p className="font-bold underline">{schoolInfo.kepalaSekolah}</p>
                    <p className="text-[10px] text-slate-600">NIP. {schoolInfo.nipKepalaSekolah}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
