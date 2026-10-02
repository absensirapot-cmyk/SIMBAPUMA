import React, { useState, useMemo } from 'react';
import { User, Kelas, Mapel, NilaiMapelSiswa, SchoolInfo, AbsensiRecord, JadwalPelajaran } from '../types';
import { KopSuratView } from './KopSuratView';
import { 
  getMatchingMapelForKelas, 
  isUserAdmin, 
  getWalasAssignedClasses,
  formatTeacherIdentifier,
  formatKepsekIdentifier,
  sortMapelByKelas,
  getTeacherAssignedMapels,
  getTeacherAssignedClasses,
  isGuruOrPembinaBiasa
} from '../utils/academicHelpers';
import { hitungNilaiAkhir } from '../data/mockAcademicData';
import { 
  Printer, 
  Download, 
  BookOpen, 
  Table, 
  Calendar, 
  Award, 
  GraduationCap, 
  Users, 
  Search, 
  Building2, 
  Layers, 
  RefreshCw, 
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Check
} from 'lucide-react';

interface CetakLegerViewProps {
  currentUser: User;
  kelasList: Kelas[];
  mapelList: Mapel[];
  usersList: User[];
  nilaiList: NilaiMapelSiswa[];
  absensiList?: AbsensiRecord[];
  schoolInfo?: SchoolInfo;
  jadwalPelajaranList?: JadwalPelajaran[];
  defaultClassId?: string;
  defaultMode?: 'per_mapel' | 'keseluruhan';
  onPullAllFromCloud?: () => Promise<any>;
}

export const CetakLegerView: React.FC<CetakLegerViewProps> = ({
  currentUser,
  kelasList,
  mapelList,
  usersList,
  nilaiList,
  absensiList = [],
  schoolInfo,
  jadwalPelajaranList = [],
  defaultClassId,
  defaultMode = 'keseluruhan',
  onPullAllFromCloud,
}) => {
  const isSuperAdmin = isUserAdmin(currentUser);
  const walasAssignedClasses = getWalasAssignedClasses(currentUser, kelasList);
  // STRICT: Hanya Super Admin atau Wali Kelas yang memiliki rombel binaan resmi yang berhak membuka Leger Keseluruhan Kelas
  const isAuthorizedKeseluruhan = isSuperAdmin || (currentUser.role === 'walas' && walasAssignedClasses.length > 0) || (currentUser.isWalas === true && walasAssignedClasses.length > 0);

  // Daftar mata pelajaran yang sah diampu oleh guru saat ini
  const teacherTaughtMapels = useMemo(() => {
    return getTeacherAssignedMapels(currentUser, mapelList, jadwalPelajaranList);
  }, [currentUser, mapelList, jadwalPelajaranList]);

  // Strict role enforcement:
  // Teachers who are only 'guru' or 'pembina' (not walas, not admin) can ONLY access 'per_mapel'
  const effectiveDefaultMode: 'keseluruhan' | 'per_mapel' = isAuthorizedKeseluruhan ? defaultMode : 'per_mapel';
  const [activeMode, setActiveMode] = useState<'keseluruhan' | 'per_mapel'>(effectiveDefaultMode);

  // Auto redirect to per_mapel if user is not authorized for whole-class collective leger
  React.useEffect(() => {
    if (!isAuthorizedKeseluruhan && activeMode !== 'per_mapel') {
      setActiveMode('per_mapel');
    }
  }, [isAuthorizedKeseluruhan, activeMode]);

  const [selectedPeriode, setSelectedPeriode] = useState<'PAS' | 'PTS' | 'PAT' | null>(null);
  const effectivePeriode: 'PAS' | 'PTS' | 'PAT' = selectedPeriode || 'PAS';
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Class filtering based on teacher role:
  // - Admin: All classes in school
  // - Walas: Classes they manage
  // - Regular Guru / Pembina: ONLY classes where their subjects or teaching schedules exist
  const availableClasses = useMemo(() => {
    if (isSuperAdmin) return kelasList;
    if (isAuthorizedKeseluruhan) return walasAssignedClasses;
    
    return getTeacherAssignedClasses(currentUser, kelasList, teacherTaughtMapels, jadwalPelajaranList);
  }, [isSuperAdmin, isAuthorizedKeseluruhan, walasAssignedClasses, currentUser, kelasList, teacherTaughtMapels, jadwalPelajaranList]);

  const [selectedKelasId, setSelectedKelasId] = useState<string>(() => {
    if (defaultClassId && availableClasses.some(k => k.id === defaultClassId)) {
      return defaultClassId;
    }
    if (walasAssignedClasses.length > 0) {
      return walasAssignedClasses[0].id;
    }
    return availableClasses[0]?.id || kelasList[0]?.id || '';
  });

  const currentKelas = useMemo(() => {
    return kelasList.find(k => k.id === selectedKelasId) || availableClasses[0] || kelasList[0];
  }, [kelasList, selectedKelasId, availableClasses]);

  const currentWalas = useMemo(() => {
    if (!currentKelas) return null;
    return usersList.find(u => 
      (u.id && u.id === currentKelas.idWalas) ||
      (currentKelas.idWalas && (u.nipOrNis === currentKelas.idWalas || u.idGuru === currentKelas.idWalas)) ||
      (currentKelas.namaWalas && u.nama && u.nama.toLowerCase() === currentKelas.namaWalas.toLowerCase())
    ) || (currentUser.role === 'walas' ? currentUser : null);
  }, [currentKelas, usersList, currentUser]);

  // Students belonging to this selected class
  const classStudents = useMemo(() => {
    return usersList
      .filter(u => {
        if (u.role !== 'siswa') return false;
        if (u.idKelas === currentKelas?.id) return true;
        if (currentKelas && (u.kelas === currentKelas.namaKelas || u.namaKelas === currentKelas.namaKelas)) return true;
        return false;
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [usersList, currentKelas]);

  // Filter students based on search keyword
  const filteredStudents = useMemo(() => {
    if (!searchKeyword.trim()) return classStudents;
    const q = searchKeyword.toLowerCase();
    return classStudents.filter(s => 
      s.nama.toLowerCase().includes(q) || 
      (s.nipd && s.nipd.includes(q)) || 
      (s.nisn && s.nisn.includes(q)) ||
      (s.nipOrNis && s.nipOrNis.includes(q))
    );
  }, [classStudents, searchKeyword]);

  // Subjects belonging STRICTLY to this class and major
  const classMapels = useMemo(() => {
    if (!currentKelas) return mapelList;
    const scheduledMapelIds = new Set<string>();
    if (jadwalPelajaranList && jadwalPelajaranList.length > 0) {
      jadwalPelajaranList.forEach(j => {
        if (j.idKelas === currentKelas.id || j.namaKelas === currentKelas.namaKelas) {
          if (j.idMapel) scheduledMapelIds.add(j.idMapel);
        }
      });
    }

    const matched = getMatchingMapelForKelas(currentKelas, mapelList, classStudents);

    const finalMapels = scheduledMapelIds.size > 0
      ? (() => {
          const scheduledMapels = mapelList.filter(m => scheduledMapelIds.has(m.id) || scheduledMapelIds.has(m.kode));
          const map = new Map<string, Mapel>();
          scheduledMapels.forEach(m => map.set(m.id, m));
          matched.forEach(m => {
            if (!map.has(m.id)) map.set(m.id, m);
          });
          return sortMapelByKelas(Array.from(map.values()));
        })()
      : sortMapelByKelas(matched);

    // If user is ONLY a teacher/pembina (not walas, not admin): filter exclusively to their taught subjects
    if (!isAuthorizedKeseluruhan) {
      const teacherMapelIds = new Set<string>(currentUser.mapelDiampu || []);
      const teacherMapelName = (currentUser.mapel || currentUser.mataPelajaran || '').toLowerCase();
      const teacherFiltered = finalMapels.filter(m => 
        teacherMapelIds.has(m.id) || 
        teacherMapelIds.has(m.kode) ||
        (teacherMapelName && m.namaMapel.toLowerCase().includes(teacherMapelName)) ||
        (m.guruPengampu && currentUser.nama && m.guruPengampu.toLowerCase().includes(currentUser.nama.toLowerCase()))
      );
      if (teacherFiltered.length > 0) return teacherFiltered;
    }

    return finalMapels;
  }, [currentKelas, mapelList, jadwalPelajaranList, classStudents, isAuthorizedKeseluruhan, currentUser]);

  // Selected subject for "per_mapel" mode
  const [selectedMapelId, setSelectedMapelId] = useState<string>(() => {
    return classMapels[0]?.id || mapelList[0]?.id || '';
  });

  // Keep selectedMapelId valid when class changes
  React.useEffect(() => {
    if (classMapels.length > 0 && !classMapels.some(m => m.id === selectedMapelId)) {
      setSelectedMapelId(classMapels[0].id);
    }
  }, [classMapels, selectedMapelId]);

  const currentMapel = useMemo(() => {
    return classMapels.find(m => m.id === selectedMapelId) || classMapels[0] || mapelList[0];
  }, [classMapels, selectedMapelId, mapelList]);

  // Teacher assigned to this subject in this class
  const assignedTeacher = useMemo(() => {
    if (!currentMapel) return null;
    const scheduled = jadwalPelajaranList.find(j => 
      (j.idKelas === currentKelas?.id || j.namaKelas === currentKelas?.namaKelas) &&
      (j.idMapel === currentMapel.id || j.namaMapel === currentMapel.namaMapel)
    );
    if (scheduled && scheduled.namaGuru) {
      return { nama: scheduled.namaGuru, nipOrNis: scheduled.idGuru || '-' };
    }
    const foundUser = usersList.find(u => 
      (u.role === 'guru' || u.role === 'walas') && 
      (u.mapelDiampu?.includes(currentMapel.id) || u.mapelDiampu?.includes(currentMapel.kode) || u.nama === currentMapel.guruPengampu)
    );
    if (foundUser) {
      return { nama: foundUser.nama, nipOrNis: foundUser.nipOrNis || '-' };
    }
    return { nama: currentMapel.guruPengampu || 'Guru Mata Pelajaran', nipOrNis: '-' };
  }, [currentMapel, currentKelas, jadwalPelajaranList, usersList]);

  // Titimangsa Configuration
  const [titimangsaTempat] = useState<string>(() => {
    try {
      return localStorage.getItem('saved_titimangsa_tempat') || schoolInfo?.raporConfig?.tempatTitimangsa || 'Parungpanjang, Bogor';
    } catch {
      return 'Parungpanjang, Bogor';
    }
  });

  const [titimangsaTanggal] = useState<string>(() => {
    try {
      return localStorage.getItem('saved_titimangsa_tanggal') || schoolInfo?.raporConfig?.tanggalTitimangsa || (
        selectedPeriode === 'PAT' ? '20 Juni 2027' : '20 Desember 2026'
      );
    } catch {
      return '20 Desember 2026';
    }
  });

  // Grade finder helper
  const findGrade = (student: User, mapel: Mapel, periode: 'PTS' | 'PAS' | 'PAT'): NilaiMapelSiswa | undefined => {
    const nipd = student.nipd || student.nipOrNis;
    return nilaiList.find(n => {
      const matchS = n.nipd === nipd || (n.nisn && n.nisn === student.nisn) || (n.namaSiswa && n.namaSiswa.toLowerCase() === student.nama.toLowerCase());
      if (!matchS) return false;
      const matchM = n.mapelId === mapel.id || (mapel.kode && n.mapelId === mapel.kode) || (n.mapelNama && n.mapelNama.toLowerCase() === mapel.namaMapel.toLowerCase());
      if (!matchM) return false;
      return n.periode === periode || (!n.periode && periode === 'PAS');
    });
  };

  // Helper for Semester text
  const semesterText = useMemo(() => {
    if (selectedPeriode === 'PAT') return 'Genap (Semester 2 / Akhir Tahun)';
    if (selectedPeriode === 'PTS') return 'Ganjil (Tengah Semester / PTS)';
    return 'Ganjil (Semester 1 / PAS)';
  }, [selectedPeriode]);

  // HANYA MUNCUL MATA PELAJARAN YANG SUDAH DIISI NILAINYA (Request Pengguna: Jika tidak diisi, tidak muncul di leger & rapot)
  const filledClassMapels = useMemo(() => {
    return classMapels.filter(m => {
      return classStudents.some(student => {
        const found = findGrade(student, m, effectivePeriode);
        return found && typeof found.nilaiAkhir === 'number' && found.nilaiAkhir > 0;
      });
    });
  }, [classMapels, classStudents, effectivePeriode, nilaiList]);

  // Compute Leger Keseluruhan Rows with Ranks & Stats
  const legerKeseluruhanRows = useMemo(() => {
    // Gunakan mapel yang sudah diisi jika ada, jika belum ada nilai sama sekali gunakan classMapels agar kolom dasar tetap tampil
    const targetMapels = filledClassMapels.length > 0 ? filledClassMapels : [];

    const rows = classStudents.map(student => {
      const nipdKey = student.nipd || student.nipOrNis;
      let total = 0;
      let count = 0;
      const scores: { [mapelId: string]: number | undefined } = {};

      targetMapels.forEach(m => {
        const found = findGrade(student, m, effectivePeriode);
        if (found && typeof found.nilaiAkhir === 'number' && found.nilaiAkhir > 0) {
          scores[m.id] = found.nilaiAkhir;
          total += found.nilaiAkhir;
          count += 1;
        } else {
          scores[m.id] = undefined;
        }
      });

      const avg = count > 0 ? Math.round((total / count) * 10) / 10 : 0;
      
      // Attendance
      const studentAbs = absensiList.filter(a => 
        a.nipd === nipdKey || a.nipd === student.nisn || (a.namaSiswa && a.namaSiswa.toLowerCase() === student.nama.toLowerCase())
      );
      const sakit = studentAbs.filter(a => a.status === 'Sakit').length;
      const izin = studentAbs.filter(a => a.status === 'Izin').length;
      const alpa = studentAbs.filter(a => a.status === 'Alpa' || a.status === 'Terlambat').length;

      // Status Kenaikan if PAT
      const kNama = (currentKelas?.namaKelas || student.kelas || '').toUpperCase();
      const isAkhir = /\bXII\b|KELAS\s*XII|\b12\b/.test(kNama) || currentKelas?.tingkat === 'XII';
      const statusKenaikan = isAkhir 
        ? 'LULUS' 
        : kNama.includes('X ') || currentKelas?.tingkat === 'X' 
          ? 'Naik ke Kelas XI' 
          : 'Naik ke Kelas XII';

      return {
        student,
        nipdKey,
        scores,
        total,
        average: avg,
        gradedCount: count,
        absensi: { sakit, izin, alpa },
        statusKenaikan,
      };
    });

    // Rank descending
    return rows.sort((a, b) => b.average - a.average);
  }, [classStudents, filledClassMapels, selectedPeriode, effectivePeriode, nilaiList, absensiList, currentKelas]);

  // Compute Leger Per-Mapel Rows with Details
  const legerPerMapelRows = useMemo(() => {
    if (!currentMapel) return [];
    return classStudents.map((student, idx) => {
      const found = findGrade(student, currentMapel, effectivePeriode);
      const computed = found ? hitungNilaiAkhir(found) : null;

      const lm1 = found?.lm1 ?? found?.tugas1;
      const lm2 = found?.lm2 ?? found?.tugas2;
      const lm3 = found?.lm3 ?? found?.tugas3;
      const lm4 = found?.lm4;
      const formatif = found?.nilaiFormatif ?? computed?.nilaiFormatif ?? 0;
      const sumatif = effectivePeriode === 'PTS' ? (found?.nilaiPts ?? 0) : effectivePeriode === 'PAT' ? (found?.nilaiPat ?? 0) : (found?.nilaiPas ?? 0);
      const nilaiAkhir = found?.nilaiAkhir ?? computed?.nilaiAkhir ?? 0;
      const predikat = found?.predikat ?? computed?.predikat ?? (nilaiAkhir >= 90 ? 'A' : nilaiAkhir >= 80 ? 'B' : nilaiAkhir >= 70 ? 'C' : nilaiAkhir > 0 ? 'D' : '-');
      const ketercapaian = found?.ketercapaian ?? computed?.ketercapaian ?? (nilaiAkhir >= 75 ? 'Tuntas' : nilaiAkhir > 0 ? 'Belum Tuntas' : '-');
      const deskripsi = found?.tpDeskripsi || found?.deskripsiTertinggi || computed?.deskripsiTertinggi || 'Menguasai capaian pembelajaran pada materi pokok dan tugas kejuruan.';

      return {
        no: idx + 1,
        student,
        nipdKey: student.nipd || student.nipOrNis,
        lm1: lm1 !== undefined ? lm1 : '-',
        lm2: lm2 !== undefined ? lm2 : '-',
        lm3: lm3 !== undefined ? lm3 : '-',
        lm4: lm4 !== undefined ? lm4 : '-',
        formatif: formatif > 0 ? formatif : '-',
        sumatif: sumatif > 0 ? sumatif : '-',
        nilaiAkhir: nilaiAkhir > 0 ? nilaiAkhir : '-',
        predikat,
        ketercapaian,
        deskripsi,
      };
    });
  }, [classStudents, currentMapel, selectedPeriode, effectivePeriode, nilaiList]);

  // Statistics for Leger Per Mapel
  const perMapelStats = useMemo(() => {
    const validScores = legerPerMapelRows
      .map(r => typeof r.nilaiAkhir === 'number' ? r.nilaiAkhir : 0)
      .filter(s => s > 0);
    const avg = validScores.length > 0 ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10 : 0;
    const max = validScores.length > 0 ? Math.max(...validScores) : 0;
    const min = validScores.length > 0 ? Math.min(...validScores) : 0;
    const tuntas = validScores.filter(s => s >= 75).length;
    const percentTuntas = validScores.length > 0 ? Math.round((tuntas / validScores.length) * 100) : 0;

    return { avg, max, min, tuntas, percentTuntas, totalSiswa: validScores.length };
  }, [legerPerMapelRows]);

  // Handle Refresh from Cloud
  const handleRefresh = async () => {
    if (!onPullAllFromCloud) return;
    setIsRefreshingCloud(true);
    try {
      await onPullAllFromCloud();
      setNotification('✅ Seluruh data nilai dan rombel berhasil disinkronkan dari Cloud Firestore!');
    } catch (e: any) {
      setNotification('Gagal memuat dari Cloud: ' + (e?.message || 'Periksa koneksi'));
    } finally {
      setIsRefreshingCloud(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Export to CSV / Excel for Per Mapel
  const handleExportPerMapelCSV = () => {
    if (!currentMapel || !currentKelas) return;
    let csv = `\uFEFFLEGER NILAI MATA PELAJARAN: ${currentMapel.namaMapel} (${currentMapel.kode})\n`;
    csv += `Kelas / Rombel: ${currentKelas.namaKelas} (${currentKelas.jurusan})\n`;
    csv += `Semester: ${semesterText} - Tahun Ajaran: ${schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}\n`;
    csv += `Guru Pengampu: ${assignedTeacher?.nama || '-'}\n\n`;
    csv += `No,NIPD / NISN,Nama Peserta Didik,JK,LM 1,LM 2,LM 3,LM 4,Rata Formatif,Nilai Sumatif (${selectedPeriode}),Nilai Akhir,Predikat,Ketuntasan,Deskripsi Capaian\n`;

    legerPerMapelRows.forEach((r) => {
      const jk = r.student.jenisKelamin === 'Perempuan' || r.student.jk === 'P' ? 'P' : 'L';
      const cleanDeskripsi = `"${(r.deskripsi || '').replace(/"/g, '""')}"`;
      const cleanNama = `"${r.student.nama.replace(/"/g, '""')}"`;
      csv += `${r.no},'${r.nipdKey},${cleanNama},${jk},${r.lm1},${r.lm2},${r.lm3},${r.lm4},${r.formatif},${r.sumatif},${r.nilaiAkhir},${r.predikat},${r.ketercapaian},${cleanDeskripsi}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Leger_Mapel_${currentMapel.kode}_${currentKelas.namaKelas}_${selectedPeriode}.csv`.replace(/\s+/g, '_');
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to CSV / Excel for Leger Keseluruhan
  const handleExportKeseluruhanCSV = () => {
    if (!currentKelas) return;
    let csv = `\uFEFFBUKU LEGER NILAI KOLEKTIF ROMBEL KELAS: ${currentKelas.namaKelas}\n`;
    csv += `Program Keahlian: ${currentKelas.jurusan}\n`;
    csv += `Wali Kelas: ${currentKelas.namaWalas || currentUser.nama}\n`;
    csv += `Semester: ${semesterText} - Tahun Ajaran: ${schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}\n\n`;

    const activeMapelsForExport = filledClassMapels.length > 0 ? filledClassMapels : classMapels;
    const mapelHeaders = activeMapelsForExport.map(m => `"${m.kode || m.namaMapel}"`).join(',');
    csv += `No,NISN,NIPD,Nama Peserta Didik,JK,${mapelHeaders},Total Nilai,Rata-Rata,Ranking,Sakit,Izin,Alpa,Status Kenaikan\n`;

    legerKeseluruhanRows.forEach((r, idx) => {
      const jk = r.student.jenisKelamin === 'Perempuan' || r.student.jk === 'P' ? 'P' : 'L';
      const cleanNama = `"${r.student.nama.replace(/"/g, '""')}"`;
      const mapelScores = activeMapelsForExport.map(m => r.scores[m.id] !== undefined ? r.scores[m.id] : '').join(',');
      csv += `${idx + 1},'${r.student.nisn || ''},'${r.nipdKey},${cleanNama},${jk},${mapelScores},${r.total},${r.average},${idx + 1},${r.absensi.sakit},${r.absensi.izin},${r.absensi.alpa},${r.statusKenaikan}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Buku_Leger_Kolektif_${currentKelas.namaKelas}_${selectedPeriode}.csv`.replace(/\s+/g, '_');
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Inline Print Styles to ensure exact borders, landscape layout, and no cut-off */}
      <style>{`
        @media print {
          @page {
            size: ${activeMode === 'keseluruhan' ? 'A4 landscape' : 'A4 portrait'};
            margin: ${activeMode === 'keseluruhan' ? '6mm 8mm 6mm 8mm' : '10mm 12mm 10mm 12mm'};
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, header, nav, aside {
            display: none !important;
          }
          .printable-document {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-border-table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .print-border-table th, 
          .print-border-table td {
            border: 1px solid #0f172a !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 shadow-sm no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TOP CONTROL PANEL (NO-PRINT) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5 no-print">
        {/* Main Title & Mode Switcher */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Printer className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {isAuthorizedKeseluruhan ? 'Pusat Cetak Buku Leger Sekolah' : 'Cetak Leger Nilai Mata Pelajaran'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                  Kurikulum Merdeka SMK
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  {currentKelas?.namaKelas} • {currentKelas?.jurusan}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAuthorizedKeseluruhan 
                  ? 'Cetak dokumen resmi Buku Leger nilai per-mata pelajaran maupun leger kolektif keseluruhan tiap wali kelas dengan daftar mapel kejuruan presisi.'
                  : 'Cetak dokumen resmi rekapitulasi leger nilai mata pelajaran yang Anda ampu untuk peserta didik.'}
              </p>
            </div>
          </div>

          {/* TWO MAIN MODES (Per Mapel & Keseluruhan Walas) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full lg:w-auto">
            {isAuthorizedKeseluruhan && (
              <button
                type="button"
                onClick={() => setActiveMode('keseluruhan')}
                className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeMode === 'keseluruhan'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>1. Leger Keseluruhan Tiap Walas</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveMode('per_mapel')}
              className={`flex-1 lg:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === 'per_mapel'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{isAuthorizedKeseluruhan ? '2. Leger Per-Mata Pelajaran' : 'Leger Nilai Mata Pelajaran Pribadi'}</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Class / Rombel Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isAuthorizedKeseluruhan ? 'Pilih Kelas / Rombel Walas:' : 'Pilih Kelas Pembelajaran:'}</span>
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
            >
              {availableClasses.map(k => (
                <option key={k.id} value={k.id}>
                  {k.namaKelas} ({k.jurusan}) {k.namaWalas ? `• Walas: ${k.namaWalas}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector (Active in Per-Mapel mode) */}
          {activeMode === 'per_mapel' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pilih Mata Pelajaran ({classMapels.length} Mapel {currentKelas?.jurusan}):</span>
              </label>
              <select
                value={selectedMapelId}
                onChange={(e) => setSelectedMapelId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs cursor-pointer"
              >
                {classMapels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.kode ? `[${m.kode}] ` : ''}{m.namaMapel}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mata Pelajaran Jurusan:</span>
              </label>
              <div className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                {classMapels.length} Mapel Sesuai {currentKelas?.jurusan}
              </div>
            </div>
          )}

          {/* Periode Selector (Pilih Manual) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Periode Asesmen (Pilih Manual):</span>
              </span>
              {!selectedPeriode && (
                <span className="text-[10px] text-amber-600 font-normal italic">
                  (Belum dipilih)
                </span>
              )}
            </label>
            <div className="inline-flex items-center w-full p-1 bg-slate-100 rounded-xl border border-slate-200">
              {(['PTS', 'PAS', 'PAT'] as const).map(p => {
                const isSelected = selectedPeriode === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPeriode(p)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {p === 'PTS' ? 'PTS (Tengah)' : p === 'PAS' ? 'PAS (Sem 1)' : 'PAT (Sem 2)'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Cari Siswa:</span>
            </label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Ketik nama atau NISN..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Info className="w-4 h-4 text-sky-500 shrink-0" />
            <span>
              {activeMode === 'keseluruhan' 
                ? `Menampilkan ${classStudents.length} peserta didik dan ${classMapels.length} mata pelajaran kelas ${currentKelas?.namaKelas}.`
                : `Menampilkan leger nilai mata pelajaran ${currentMapel?.namaMapel} untuk ${classStudents.length} siswa.`}
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onPullAllFromCloud && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshingCloud}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Muat ulang data nilai dan siswa dari cloud"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCloud ? 'animate-spin' : ''}`} />
                <span>Segarkan Data</span>
              </button>
            )}

            <button
              type="button"
              onClick={activeMode === 'keseluruhan' ? handleExportKeseluruhanCSV : handleExportPerMapelCSV}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Unduh data tabel dalam format spreadsheet Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor ke CSV / Excel</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              title="Buka dialog cetak browser (Simpan PDF / Print Kertas F4/A4)"
            >
              <Printer className="w-4 h-4" />
              <span>
                {activeMode === 'keseluruhan' 
                  ? 'Cetak Leger Keseluruhan (Landscape)' 
                  : 'Cetak Leger Mata Pelajaran (Print / PDF)'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW & PRINTABLE DOCUMENT: LEGER KESELURUHAN KELAS / WALAS (KOLEKTIF)  */}
      {/* ========================================================================= */}
      {activeMode === 'keseluruhan' && isAuthorizedKeseluruhan && (
        <div className="printable-document bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          {/* KOP SURAT RESMI SEKOLAH */}
          <KopSuratView schoolInfo={schoolInfo} />

          {/* DOKUMEN TITLE */}
          <div className="text-center space-y-1 pb-2">
            <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900 underline underline-offset-4">
              BUKU LEGER NILAI KOLEKTIF HASIL BELAJAR PESERTA DIDIK
            </h2>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              KURIKULUM MERDEKA • TAHUN AJARAN {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'}
            </div>
            <div className="text-xs font-bold text-slate-600">
              SEMESTER {semesterText.toUpperCase()}
            </div>
          </div>

          {/* IDENTITAS KELAS & WALI KELAS */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <table className="w-full">
              <tbody>
                <tr className="leading-relaxed">
                  <td className="w-36 font-semibold text-slate-600">Satuan Pendidikan</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-slate-900">{schoolInfo?.namaLengkap || schoolInfo?.nama || 'SMK Bakti Putra Mandiri'}</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Kelas / Rombel</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.namaKelas}</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Konsentrasi Keahlian</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.jurusan}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full">
              <tbody>
                <tr className="leading-relaxed">
                  <td className="w-36 font-semibold text-slate-600">Wali Kelas</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.namaWalas || currentUser.nama || '-'}</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Jumlah Siswa</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{classStudents.length} Peserta Didik</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Titimangsa Cetak</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{titimangsaTempat}, {titimangsaTanggal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABEL BUKU LEGER KESELURUHAN (SEMUA MAPEL JURUSAN INI) */}
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="print-border-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2 px-2 text-center w-8 border-r border-slate-300">No</th>
                  <th className="py-2 px-2 text-center w-24 border-r border-slate-300">NISN</th>
                  <th className="py-2 px-2 text-center w-24 border-r border-slate-300">NIPD</th>
                  <th className="py-2 px-3 border-r border-slate-300 min-w-[170px]">Nama Peserta Didik</th>
                  <th className="py-2 px-1.5 text-center w-8 border-r border-slate-300">L/P</th>

                  {/* Dynamic Subject Columns strictly for this class/major */}
                  {classMapels.map(m => (
                    <th 
                      key={m.id} 
                      className="py-2 px-1 text-center w-12 border-r border-slate-300 text-[10px] font-bold uppercase bg-slate-50"
                      title={`${m.namaMapel} (${m.kode})`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span>{m.kode || m.namaMapel.substring(0, 4)}</span>
                      </div>
                    </th>
                  ))}

                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 bg-slate-200/80 font-black text-slate-900">
                    Total
                  </th>
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 bg-indigo-50 font-black text-indigo-900">
                    Rata
                  </th>
                  <th className="py-2 px-2 text-center w-10 border-r border-slate-300 bg-amber-50 font-black text-amber-900">
                    Rank
                  </th>
                  <th className="py-2 px-1 text-center w-7 border-r border-slate-300 text-[10px] text-blue-800 font-bold">
                    S
                  </th>
                  <th className="py-2 px-1 text-center w-7 border-r border-slate-300 text-[10px] text-amber-800 font-bold">
                    I
                  </th>
                  <th className="py-2 px-1 text-center w-7 border-r border-slate-300 text-[10px] text-rose-800 font-bold">
                    A
                  </th>
                  {selectedPeriode === 'PAT' && (
                    <th className="py-2 px-2 text-center w-28 text-[10px] bg-emerald-50 text-emerald-900 font-bold">
                      Kenaikan / Status
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {legerKeseluruhanRows.map((row, idx) => {
                  const jk = row.student.jenisKelamin === 'Perempuan' || row.student.jk === 'P' ? 'P' : 'L';
                  return (
                    <tr key={row.student.id} className="hover:bg-slate-50/80 transition-colors leading-tight">
                      <td className="py-1.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200">{idx + 1}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-700 text-center border-r border-slate-200 text-[11px]">{row.student.nisn || '-'}</td>
                      <td className="py-1.5 px-2 font-mono text-slate-700 text-center border-r border-slate-200 text-[11px]">{row.nipdKey}</td>
                      <td className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200">{row.student.nama}</td>
                      <td className="py-1.5 px-1.5 text-center font-semibold text-slate-600 border-r border-slate-200 text-[11px]">{jk}</td>

                      {/* Mapel Scores */}
                      {classMapels.map(m => {
                        const val = row.scores[m.id];
                        return (
                          <td 
                            key={m.id} 
                            className="py-1.5 px-1 text-center font-mono border-r border-slate-200 text-[11px]"
                          >
                            {val !== undefined ? (
                              <span className={val < (m.kkm || 75) ? 'text-rose-600 font-bold' : 'text-slate-800 font-medium'}>
                                {val}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-1.5 px-2 text-center font-black text-slate-900 bg-slate-50 border-r border-slate-200">
                        {row.total > 0 ? row.total : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-center font-black text-indigo-700 bg-indigo-50/50 border-r border-slate-200">
                        {row.average > 0 ? row.average : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-center font-black text-amber-800 bg-amber-50/50 border-r border-slate-200">
                        {row.average > 0 ? `#${idx + 1}` : '-'}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-blue-700 border-r border-slate-200">
                        {row.absensi.sakit}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-amber-700 border-r border-slate-200">
                        {row.absensi.izin}
                      </td>
                      <td className="py-1.5 px-1 text-center font-mono font-bold text-rose-700 border-r border-slate-200">
                        {row.absensi.alpa}
                      </td>
                      {selectedPeriode === 'PAT' && (
                        <td className="py-1.5 px-2 text-center text-[10px] font-bold text-emerald-800 bg-emerald-50/40">
                          {row.statusKenaikan}
                        </td>
                      )}
                    </tr>
                  );
                })}

                {legerKeseluruhanRows.length === 0 && (
                  <tr>
                    <td colSpan={classMapels.length + 10} className="py-8 text-center text-slate-400">
                      Belum ada data peserta didik pada rombel ini.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* RATA-RATA MAPEL ROMBEL SUMMARY */}
              {legerKeseluruhanRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={5} className="py-2 px-3 text-right border-r border-slate-300 uppercase text-[11px]">
                      Rata-Rata Kelas
                    </td>
                    {classMapels.map(m => {
                      const allScores = legerKeseluruhanRows
                        .map(r => r.scores[m.id])
                        .filter((v): v is number => typeof v === 'number');
                      const avg = allScores.length > 0 ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10 : '-';
                      return (
                        <td key={m.id} className="py-2 px-1 text-center font-mono text-[11px] border-r border-slate-300">
                          {avg}
                        </td>
                      );
                    })}
                    <td colSpan={selectedPeriode === 'PAT' ? 7 : 6} className="py-2 px-2 text-center text-[10px] text-slate-500">
                      -
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* LEGENDA MATA PELAJARAN JURUSAN */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] space-y-1 text-slate-700 print-break-inside-avoid">
            <span className="font-bold text-slate-900 uppercase">Keterangan Singkatan Kode Mata Pelajaran ({currentKelas?.jurusan}):</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 pt-1">
              {classMapels.map(m => (
                <div key={m.id} className="truncate">
                  <span className="font-bold text-indigo-700">{m.kode || m.namaMapel.substring(0, 4)}</span>: {m.namaMapel}
                </div>
              ))}
            </div>
          </div>

          {/* TANDA TANGAN RESMI WALI KELAS & KEPALA SEKOLAH */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs print-break-inside-avoid">
            <div className="space-y-16">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900">Kepala SMK Bakti Putra Mandiri</p>
              </div>
              <div>
                <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                  {schoolInfo?.kepalaSekolah || 'Dr. H. Bambang Sutrisno, M.Pd.'}
                </p>
                <p className="text-[11px] text-slate-600">
                  {formatKepsekIdentifier(schoolInfo)}
                </p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="text-slate-600">{titimangsaTempat}, {titimangsaTanggal}</p>
                <p className="font-bold text-slate-900">Wali Kelas {currentKelas?.namaKelas}</p>
              </div>
              <div>
                <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                  {currentKelas?.namaWalas || currentUser.nama}
                </p>
                <p className="text-[11px] text-slate-600">
                  {formatTeacherIdentifier(currentWalas || currentUser)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW & PRINTABLE DOCUMENT: LEGER PER-MATA PELAJARAN                    */}
      {/* ========================================================================= */}
      {activeMode === 'per_mapel' && (
        <div className="printable-document bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          {/* KOP SURAT RESMI SEKOLAH */}
          <KopSuratView schoolInfo={schoolInfo} />

          {/* DOKUMEN TITLE */}
          <div className="text-center space-y-1 pb-2">
            <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900 underline underline-offset-4">
              LEGER PENILAIAN HASIL BELAJAR MATA PELAJARAN
            </h2>
            <div className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              MATA PELAJARAN: {currentMapel?.namaMapel.toUpperCase()} ({currentMapel?.kode})
            </div>
            <div className="text-xs font-bold text-slate-600">
              KURIKULUM MERDEKA • TAHUN AJARAN {schoolInfo?.tahunAjaranPembelajaran || '2026/2027'} • SEMESTER {semesterText.toUpperCase()}
            </div>
          </div>

          {/* IDENTITAS MAPEL & KELAS */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
            <table className="w-full">
              <tbody>
                <tr className="leading-relaxed">
                  <td className="w-36 font-semibold text-slate-600">Mata Pelajaran</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-slate-900">{currentMapel?.namaMapel} ({currentMapel?.kode})</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Kelas / Rombel</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.namaKelas} ({currentKelas?.jurusan})</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Guru Pengampu</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{assignedTeacher?.nama || currentMapel?.guruPengampu || '-'}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full">
              <tbody>
                <tr className="leading-relaxed">
                  <td className="w-36 font-semibold text-slate-600">KKTP / KKM</td>
                  <td className="w-3">:</td>
                  <td className="font-bold text-slate-900">{currentMapel?.kkm || 75} (Kriteria Ketercapaian)</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Wali Kelas</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{currentKelas?.namaWalas || '-'}</td>
                </tr>
                <tr className="leading-relaxed">
                  <td className="font-semibold text-slate-600">Jumlah Siswa</td>
                  <td>:</td>
                  <td className="font-bold text-slate-900">{classStudents.length} Peserta Didik</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TABEL LEGER PER MAPEL */}
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="print-border-table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-2 text-center w-8 border-r border-slate-300">No</th>
                  <th className="py-2.5 px-2.5 text-center w-28 border-r border-slate-300">NISN / NIPD</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 min-w-[170px]">Nama Peserta Didik</th>
                  <th className="py-2.5 px-1.5 text-center w-8 border-r border-slate-300">L/P</th>
                  
                  {/* Lingkup Materi Formatif */}
                  <th className="py-2 px-2 text-center w-12 border-r border-slate-300 text-[10px] bg-slate-50" title="Lingkup Materi 1">LM 1</th>
                  <th className="py-2 px-2 text-center w-12 border-r border-slate-300 text-[10px] bg-slate-50" title="Lingkup Materi 2">LM 2</th>
                  <th className="py-2 px-2 text-center w-12 border-r border-slate-300 text-[10px] bg-slate-50" title="Lingkup Materi 3">LM 3</th>
                  <th className="py-2 px-2 text-center w-12 border-r border-slate-300 text-[10px] bg-slate-50" title="Lingkup Materi 4">LM 4</th>
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 text-[10px] bg-indigo-50/60 font-bold">Rata Formatif</th>
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 text-[10px] bg-amber-50/60 font-bold">Sumatif ({selectedPeriode})</th>
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-300 text-[10px] bg-emerald-100/70 font-black text-slate-900">Nilai Akhir</th>
                  <th className="py-2 px-2 text-center w-10 border-r border-slate-300 text-[10px] font-bold">Predikat</th>
                  <th className="py-2 px-2 text-center w-18 border-r border-slate-300 text-[10px] font-bold">Ketuntasan</th>
                  <th className="py-2 px-3 border-slate-300 min-w-[200px] text-[10px]">Capaian Kompetensi / Deskripsi TP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {legerPerMapelRows.map((row) => {
                  const jk = row.student.jenisKelamin === 'Perempuan' || row.student.jk === 'P' ? 'P' : 'L';
                  const isTuntas = row.ketercapaian === 'Tuntas';

                  return (
                    <tr key={row.student.id} className="hover:bg-slate-50/80 transition-colors leading-tight">
                      <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">{row.no}</td>
                      <td className="py-2 px-2.5 font-mono text-slate-700 text-center border-r border-slate-200 text-[11px]">{row.nipdKey}</td>
                      <td className="py-2 px-3 font-bold text-slate-900 border-r border-slate-200">{row.student.nama}</td>
                      <td className="py-2 px-1.5 text-center font-semibold text-slate-600 border-r border-slate-200 text-[11px]">{jk}</td>

                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">{row.lm1}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">{row.lm2}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">{row.lm3}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-700 border-r border-slate-200">{row.lm4}</td>

                      <td className="py-2 px-2 text-center font-mono font-bold text-indigo-700 bg-indigo-50/30 border-r border-slate-200">
                        {row.formatif}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold text-amber-700 bg-amber-50/30 border-r border-slate-200">
                        {row.sumatif}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-black text-slate-900 bg-emerald-50/50 border-r border-slate-200">
                        {row.nilaiAkhir}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-slate-800 border-r border-slate-200">
                        {row.predikat}
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isTuntas ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {row.ketercapaian}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10.5px] text-slate-700 leading-snug">
                        {row.deskripsi}
                      </td>
                    </tr>
                  );
                })}

                {legerPerMapelRows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-slate-400">
                      Belum ada data peserta didik pada rombel ini.
                    </td>
                  </tr>
                )}
              </tbody>

              {/* STATISTIK NILAI MAPEL SUMMARY */}
              {legerPerMapelRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="py-2.5 px-3 text-right border-r border-slate-300 uppercase text-[11px]">
                      Statistik Nilai Kelas:
                    </td>
                    <td colSpan={4} className="py-2.5 px-2 text-center border-r border-slate-300 text-[11px] text-slate-600">
                      Tertinggi: <span className="text-emerald-700 font-black">{perMapelStats.max}</span> • Terendah: <span className="text-rose-700 font-black">{perMapelStats.min}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-300 text-[11px] text-slate-500">-</td>
                    <td className="py-2.5 px-2 text-center border-r border-slate-300 text-[11px] text-slate-500">-</td>
                    <td className="py-2.5 px-2 text-center font-black text-emerald-800 bg-emerald-100/60 border-r border-slate-300 text-xs">
                      {perMapelStats.avg}
                    </td>
                    <td colSpan={3} className="py-2.5 px-3 text-[11px] text-slate-700">
                      Ketuntasan: <span className="font-bold text-emerald-700">{perMapelStats.tuntas} / {perMapelStats.totalSiswa} Siswa ({perMapelStats.percentTuntas}%)</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* TANDA TANGAN RESMI GURU MAPEL & KEPALA SEKOLAH */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs print-break-inside-avoid">
            <div className="space-y-16">
              <div>
                <p className="text-slate-600">Mengetahui,</p>
                <p className="font-bold text-slate-900">Kepala SMK Bakti Putra Mandiri</p>
              </div>
              <div>
                <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                  {schoolInfo?.kepalaSekolah || 'Dr. H. Bambang Sutrisno, M.Pd.'}
                </p>
                <p className="text-[11px] text-slate-600">
                  {formatKepsekIdentifier(schoolInfo)}
                </p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="text-slate-600">{titimangsaTempat}, {titimangsaTanggal}</p>
                <p className="font-bold text-slate-900">Guru Pengampu Mata Pelajaran</p>
              </div>
              <div>
                <p className="font-black text-slate-900 underline underline-offset-2 uppercase">
                  {assignedTeacher?.nama || currentMapel?.guruPengampu || '-'}
                </p>
                <p className="text-[11px] text-slate-600">
                  {formatTeacherIdentifier(assignedTeacher)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
