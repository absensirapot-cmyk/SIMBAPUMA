import * as XLSX from 'xlsx';
import { JadwalPelajaran, Kelas, Mapel, User, AbsenMengajarRecord } from '../types';

/**
 * Utility untuk menyimpan workbook XLSX sebagai unduhan berkas .xlsx di browser
 */
export function saveWorkbookAsExcel(wb: XLSX.WorkBook, filename: string): void {
  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Normalizes Excel time representations into "HH:mm" (24-hour format).
 * Handles:
 * - Excel fraction of day: e.g. 0.3020833333333333 -> "07:15"
 * - Excel time with dot: e.g. "07.15" or "7.15" -> "07:15"
 * - String numbers: e.g. "0.3645833" -> "08:45"
 * - Hours with seconds: e.g. "07:15:00" -> "07:15"
 * - Single digit hour: e.g. "7:15" -> "07:15"
 * - Plain hour numbers: e.g. 7 or "7" -> "07:00"
 */
export function normalizeExcelTime(val: any, fallback: string = '07:15'): string {
  if (val === null || val === undefined || val === '') return fallback;

  if (typeof val === 'number') {
    if (val > 0 && val < 1) {
      const totalMinutes = Math.round(val * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } else if (val >= 1 && val <= 24) {
      const hours = Math.floor(val);
      const minutes = Math.round((val - hours) * 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  }

  let str = String(val).trim();
  if (!str) return fallback;

  const num = Number(str);
  if (!isNaN(num) && num > 0 && num < 1) {
    const totalMinutes = Math.round(num * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  str = str.replace(/(?:wib|wita|wit|\bpagi\b|\bsiang\b|\bsore\b)/gi, '').trim();

  if (/^\d{1,2}\.\d{2}/.test(str)) {
    str = str.replace('.', ':');
  }

  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = String(Number(match[1])).padStart(2, '0');
    const mm = String(match[2]);
    return `${hh}:${mm}`;
  }

  if (/^\d{1,2}$/.test(str)) {
    const hh = String(Number(str)).padStart(2, '0');
    return `${hh}:00`;
  }

  return str || fallback;
}

/**
 * Format string display Jam KBM: e.g. "07:15 - 08:45 WIB"
 */
export function formatDisplayJamKBM(jamMulai?: string, jamSelesai?: string): string {
  const start = normalizeExcelTime(jamMulai, '07:15');
  const end = normalizeExcelTime(jamSelesai, '08:45');
  return `${start} - ${end} WIB`;
}

/**
 * Parses time slot from row, supporting both separate columns (Jam Mulai, Jam Selesai)
 * and combined column (Jam KBM, e.g. "07:15 - 08:45" or "07.15-08.45").
 */
export function extractJadwalTimes(
  row: any[],
  colJamMulai: number,
  colJamSelesai: number,
  colJamKbm: number,
  colJP: number,
  defaultIndexStart: number = 2,
  defaultIndexEnd: number = 3
): { jamMulai: string; jamSelesai: string; jp: number } {
  let rawMulai = colJamMulai !== -1 ? row[colJamMulai] : undefined;
  let rawSelesai = colJamSelesai !== -1 ? row[colJamSelesai] : undefined;
  let rawKbm = colJamKbm !== -1 ? row[colJamKbm] : undefined;

  if (rawMulai === undefined && rawKbm !== undefined) {
    rawMulai = rawKbm;
  }
  if (rawMulai === undefined && defaultIndexStart !== -1) {
    rawMulai = row[defaultIndexStart];
  }
  if (rawSelesai === undefined && defaultIndexEnd !== -1) {
    rawSelesai = row[defaultIndexEnd];
  }

  let jamMulai = '07:15';
  let jamSelesai = '08:45';

  const rawMulaiStr = String(rawMulai || '').trim();
  const rangeDelimiters = /\s*(?:-|–|—|s\/d|s\.d|sampai|\sto\s)\s*/i;
  if (rawMulaiStr && rangeDelimiters.test(rawMulaiStr)) {
    const parts = rawMulaiStr.split(rangeDelimiters);
    if (parts.length >= 2) {
      jamMulai = normalizeExcelTime(parts[0], '07:15');
      jamSelesai = normalizeExcelTime(parts[1], '08:45');
    } else {
      jamMulai = normalizeExcelTime(rawMulai, '07:15');
      jamSelesai = normalizeExcelTime(rawSelesai, '08:45');
    }
  } else {
    jamMulai = normalizeExcelTime(rawMulai, '07:15');
    jamSelesai = normalizeExcelTime(rawSelesai, '08:45');
  }

  let jp = 2;
  if (colJP !== -1 && row[colJP] !== undefined && row[colJP] !== '') {
    const parsed = parseInt(String(row[colJP]), 10);
    if (!isNaN(parsed) && parsed > 0) {
      jp = parsed;
    }
  } else {
    try {
      const [sh, sm] = jamMulai.split(':').map(Number);
      const [eh, em] = jamSelesai.split(':').map(Number);
      const diffMins = (eh * 60 + em) - (sh * 60 + sm);
      if (diffMins > 0) {
        jp = Math.max(1, Math.round(diffMins / 45));
      }
    } catch (_) {}
  }

  return { jamMulai, jamSelesai, jp };
}

/**
 * Membaca berkas Excel (.xlsx / .xls) atau CSV dari File object
 */
export async function readSpreadsheetFile(file: File): Promise<any[][]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'xlsx' || extension === 'xls') {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    let targetSheetName = wb.SheetNames[0];
    for (const name of wb.SheetNames) {
      const lower = name.toLowerCase();
      if (lower.includes('jadwal') || lower.includes('template') || lower.includes('data')) {
        targetSheetName = name;
        break;
      }
    }
    const worksheet = wb.Sheets[targetSheetName];
    // Return as array of rows with raw: false to retain clean formatted strings
    const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', raw: false });
    return jsonData;
  } else {
    // CSV / TSV fallback
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];

    let delim = ',';
    if (lines[0].includes(';') && lines[0].split(';').length >= 2) {
      delim = ';';
    } else if (lines[0].includes('\t') && lines[0].split('\t').length >= 2) {
      delim = '\t';
    }

    return lines.map(line => {
      // Basic CSV splitter handling quotes
      const row: string[] = [];
      let inQuotes = false;
      let cur = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          row.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      row.push(cur.trim());
      return row;
    });
  }
}

// ============================================================================
// TEMPLATE BUILDERS (.XLSX)
// ============================================================================

/**
 * Template Excel Resmi untuk Jadwal Pelajaran (.xlsx)
 * Disertai kolom Jumlah Jam (JP), Hari, Kelas, Mapel, Guru, Ruangan, dan sheet petunjuk referensi
 */
export function downloadTemplateJadwalExcel(
  kelasList: Kelas[] = [],
  mapelList: Mapel[] = [],
  guruList: User[] = []
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template Data Jadwal
  const headers = [
    'Hari',
    'Nama Kelas',
    'Jam Mulai',
    'Jam Selesai',
    'Jumlah Jam (JP)',
    'Mata Pelajaran',
    'Guru Pengampu',
    'Ruangan',
  ];

  // Buat contoh data nyata sesuai master data sekolah jika ada
  const sampleRows: any[][] = [];
  const days: ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu')[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

  const sampleKelas1 = kelasList[0]?.namaKelas || 'X Farmasi 1';
  const sampleKelas2 = kelasList[1]?.namaKelas || 'XI Keperawatan 1';
  const sampleMapel1 = mapelList[0]?.namaMapel || 'Farmakologi Dasar';
  const sampleMapel2 = mapelList[1]?.namaMapel || 'Anatomi Fisiologi';
  const sampleGuru1 = guruList[0]?.nama || 'apt. Hendra Kusuma, S.Farm';
  const sampleGuru2 = guruList[1]?.nama || 'Ns. Siti Fatimah, S.Kep';

  sampleRows.push([
    'Senin',
    sampleKelas1,
    '07:15',
    '08:45',
    2,
    sampleMapel1,
    sampleGuru1,
    'Lab Farmasi 1',
  ]);
  sampleRows.push([
    'Senin',
    sampleKelas1,
    '08:45',
    '10:15',
    2,
    sampleMapel2,
    sampleGuru2,
    'Lab Farmasi 1',
  ]);
  sampleRows.push([
    'Selasa',
    sampleKelas2,
    '07:15',
    '09:30',
    3,
    sampleMapel2,
    sampleGuru2,
    'Lab Keperawatan',
  ]);
  sampleRows.push([
    'Rabu',
    sampleKelas1,
    '10:30',
    '12:00',
    2,
    'Bahasa Indonesia',
    sampleGuru1,
    'R. Teori 101',
  ]);

  const sheetData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set Column Widths
  ws['!cols'] = [
    { wch: 12 }, // Hari
    { wch: 22 }, // Nama Kelas
    { wch: 14 }, // Jam Mulai
    { wch: 14 }, // Jam Selesai
    { wch: 18 }, // Jumlah Jam (JP)
    { wch: 30 }, // Mata Pelajaran
    { wch: 32 }, // Guru Pengampu
    { wch: 20 }, // Ruangan
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Jadwal');

  // Sheet 2: Petunjuk & Referensi Master Data Sekolah
  const petunjukRows: any[][] = [
    ['PANDUAN PENGISIAN TEMPLATE JADWAL PELAJARAN (.XLSX)'],
    ['1. Kolom "Hari": Diisi salah satu: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu.'],
    ['2. Kolom "Nama Kelas": Sesuaikan dengan nama rombel di sistem (lihat daftar di bawah).'],
    ['3. Kolom "Jam Mulai" & "Jam Selesai": Format 24 jam HH:mm (contoh: 07:15, 08:45). Sistem otomatis mengenali format titik (07.15), titik dua (07:15), maupun satu kolom Jam KBM (07:15 - 08:45).'],
    ['4. Kolom "Jumlah Jam (JP)": Angka bulat jam tatap muka pelajaran (contoh: 2, 3, atau 4). Jika dikosongkan, sistem menghitung durasi otomatis dari Jam KBM.'],
    ['5. Kolom "Mata Pelajaran": Nama mapel sesuai kurikulum.'],
    ['6. Kolom "Guru Pengampu": Nama lengkap guru pengampu.'],
    ['7. Kolom "Ruangan": Nama lab praktik atau ruang kelas teori.'],
    [''],
    ['=== REFERENSI DAFTAR KELAS DI SISTEM ==='],
    ...kelasList.map(k => [`- ${k.namaKelas} (${k.jurusan})`]),
    [''],
    ['=== REFERENSI DAFTAR MATA PELAJARAN ==='],
    ...mapelList.map(m => [`- ${m.namaMapel} [Kode: ${m.kode}]`]),
    [''],
    ['=== REFERENSI DAFTAR GURU PENGAMPU ==='],
    ...guruList.filter(u => u.role === 'guru' || u.role === 'walas').map(g => [`- ${g.nama} (${g.nipOrNis || 'Guru'})`]),
  ];

  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukRows);
  wsPetunjuk['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk & Referensi');

  saveWorkbookAsExcel(wb, 'TEMPLATE_JADWAL_PELAJARAN.xlsx');
}

/**
 * Template Excel Resmi untuk Data Siswa (.xlsx)
 */
export function downloadTemplateSiswaExcel(kelasList: Kelas[] = []): void {
  const wb = XLSX.utils.book_new();

  const headers = ['NIPD', 'NISN', 'Nama Siswa', 'Kelas', 'Jenis Kelamin', 'Status Aktif'];
  const sampleKelas = kelasList[0]?.namaKelas || 'X Farmasi 1';

  const sampleRows = [
    ['2601001', '0081234567', 'Ahmad Fadillah', sampleKelas, 'Laki-laki', 'Aktif'],
    ['2601002', '0081234568', 'Siti Nur Aisyah', sampleKelas, 'Perempuan', 'Aktif'],
    ['2601003', '0081234569', 'Budi Santoso', sampleKelas, 'Laki-laki', 'Aktif'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 16 },
    { wch: 30 },
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');

  // Sheet 2: Referensi Kelas
  if (kelasList.length > 0) {
    const wsRef = XLSX.utils.aoa_to_sheet([
      ['Daftar Nama Kelas Resmi:'],
      ...kelasList.map(k => [k.namaKelas, k.jurusan]),
    ]);
    wsRef['!cols'] = [{ wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsRef, 'Daftar Kelas');
  }

  saveWorkbookAsExcel(wb, 'TEMPLATE_IMPORT_SISWA.xlsx');
}

/**
 * Template Excel Resmi untuk Tenaga Pendidik / Guru (.xlsx)
 */
export function downloadTemplateGuruExcel(mapelList: Mapel[] = []): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'NIP',
    'Nama Guru',
    'Gelar',
    'Peran',
    'Jurusan',
    'Walas Kelas',
    'No HP',
    'Email',
    'Jenis Kelamin',
  ];

  const sampleRows = [
    ['198501012010011001', 'Drs. Hendro Wibowo', 'M.Pd', 'guru', 'Umum', '', '081234567890', 'hendro@sekolah.sch.id', 'Laki-laki'],
    ['198802022014022002', 'apt. Ratna Juwita', 'S.Farm', 'walas', 'Farmasi', 'X Farmasi 1', '081298765432', 'ratna@sekolah.sch.id', 'Perempuan'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 26 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Guru');
  saveWorkbookAsExcel(wb, 'TEMPLATE_IMPORT_GURU.xlsx');
}

/**
 * Template Excel Resmi untuk Mata Pelajaran (.xlsx)
 */
export function downloadTemplateMapelExcel(): void {
  const wb = XLSX.utils.book_new();

  const headers = ['Kode Mapel', 'Nama Mata Pelajaran', 'Kelompok', 'Jurusan', 'Tingkat', 'Jam Per Minggu'];
  const sampleRows = [
    ['FAR-101', 'Dasar-dasar Kefarmasian', 'Muatan Kejuruan', 'Farmasi', 'X', 4],
    ['KEP-101', 'Kebutuhan Dasar Manusia', 'Muatan Kejuruan', 'Asisten Keperawatan', 'X', 4],
    ['IND-001', 'Bahasa Indonesia', 'Muatan Umum', 'Umum', 'Semua', 3],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 32 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Mapel');
  saveWorkbookAsExcel(wb, 'TEMPLATE_IMPORT_MAPEL.xlsx');
}

/**
 * Template Excel Resmi untuk Nilai Leger Siswa (.xlsx)
 */
export function downloadTemplateNilaiExcel(kelasList: Kelas[] = [], mapelList: Mapel[] = []): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'NIPD',
    'Nama Siswa',
    'Kelas',
    'Mata Pelajaran',
    'Periode',
    'Formatif',
    'PTS',
    'PAS/PAT',
    'Nilai Akhir',
    'Predikat',
  ];

  const sampleKelas = kelasList[0]?.namaKelas || 'X Farmasi 1';
  const sampleMapel = mapelList[0]?.namaMapel || 'Farmakologi Dasar';

  const sampleRows = [
    ['2601001', 'Ahmad Fadillah', sampleKelas, sampleMapel, 'PAS', 85, 82, 88, 85, 'A'],
    ['2601002', 'Siti Nur Aisyah', sampleKelas, sampleMapel, 'PAS', 90, 88, 92, 90, 'A'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 26 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template Nilai');
  saveWorkbookAsExcel(wb, 'TEMPLATE_IMPORT_NILAI.xlsx');
}

// ============================================================================
// EXPORT HANDLERS TO EXCEL (.XLSX)
// ============================================================================

/**
 * Ekspor Jadwal Pelajaran ke Berkas Excel (.xlsx)
 */
export function exportJadwalToExcel(jadwalList: JadwalPelajaran[], schoolName: string = 'SMK'): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Hari',
    'Nama Kelas',
    'Jam Mulai',
    'Jam Selesai',
    'Jumlah Jam (JP)',
    'Mata Pelajaran',
    'Guru Pengampu',
    'Ruangan',
    'Tahun Ajaran',
    'Semester',
  ];

  const rows = jadwalList.map(j => [
    j.hari,
    j.namaKelas,
    j.jamMulai,
    j.jamSelesai,
    j.jumlahJam || 2,
    j.namaMapel,
    j.namaGuru,
    j.ruang || '',
    j.tahunAjaran || '',
    j.semester || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 30 },
    { wch: 30 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Pelajaran');
  const dateStr = new Date().toISOString().split('T')[0];
  saveWorkbookAsExcel(wb, `JADWAL_PELAJARAN_${schoolName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

/**
 * Ekspor Rekapitulasi Absensi & Jurnal Mengajar Guru ke Berkas Excel (.xlsx)
 */
export function exportAbsenMengajarToExcel(
  records: AbsenMengajarRecord[],
  schoolName: string = 'SMK',
  periodTitle: string = ''
): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'Tanggal',
    'Hari',
    'Guru Pengampu',
    'NIP/NUPTK',
    'Kelas',
    'Mata Pelajaran',
    'Jam Ke',
    'Jumlah Jam (JP)',
    'Jam Mulai',
    'Jam Selesai',
    'Ruang',
    'Status Kehadiran',
    'Pokok Bahasan / Materi',
    'Kegiatan KBM',
    'Siswa Hadir',
    'Siswa Sakit',
    'Siswa Izin',
    'Siswa Alpa',
    'Catatan Siswa / Keterangan',
    'Pencatat Absen',
  ];

  const rows = records.map(r => {
    let jpCount = r.jumlahJam;
    if (!jpCount) {
      const match = r.jamKe.match(/(\d+)\s*JP/i);
      jpCount = match ? parseInt(match[1], 10) : 2;
    }

    return [
      r.tanggal,
      r.hari,
      r.namaGuru,
      r.nipOrNis || '-',
      r.namaKelas,
      r.namaMapel,
      r.jamKe,
      jpCount,
      r.jamMulai,
      r.jamSelesai,
      r.ruangKelas || '',
      r.statusKehadiran,
      r.materiPokok,
      r.kegiatanKBM || '',
      r.jumlahHadir ?? 0,
      r.jumlahSakit ?? 0,
      r.jumlahIzin ?? 0,
      r.jumlahAlpa ?? 0,
      r.catatanSiswa || '',
      r.recordedBy === 'admin' ? 'Administrator' : 'Mandiri Guru',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 22 },
    { wch: 35 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 26 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Absen Guru');
  const dateStr = new Date().toISOString().split('T')[0];
  const titlePart = periodTitle ? `_${periodTitle.replace(/\s+/g, '_')}` : '';
  saveWorkbookAsExcel(wb, `REKAP_ABSEN_MENGAJAR_GURU${titlePart}_${dateStr}.xlsx`);
}

/**
 * Ekspor Data Pendaftar PPDB ke Berkas Excel Biasa (.xlsx)
 */
export function exportPPDBToExcel(formulirList: any[], schoolName: string = 'SMK'): void {
  const wb = XLSX.utils.book_new();

  const headers = [
    'No Registrasi',
    'Tanggal Daftar',
    'Status Pendaftaran',
    'Status Konfirmasi',
    'Pilihan Jurusan',
    'NISN',
    'NIK Siswa',
    'No KK',
    'Nama Lengkap',
    'Nama Panggilan',
    'Jenis Kelamin',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Agama',
    'No HP/WhatsApp',
    'Email Siswa',
    'Alamat Lengkap',
    'RT',
    'RW',
    'Desa/Kelurahan',
    'Kecamatan/Kabupaten',
    'Kode Pos',
    'Asal Sekolah (SMP/MTs)',
    'Nama Ayah',
    'NIK Ayah',
    'Pekerjaan Ayah',
    'Nama Ibu',
    'NIK Ibu',
    'Pekerjaan Ibu',
    'No Telp Ortu',
    'Punya Wali',
    'Nama Wali',
    'Punya KIP/PKH',
    'Nomor Induk Siswa Resmi',
    'Kelas Diterima',
    'Catatan Admin',
  ];

  const rows = formulirList.map(f => [
    f.nomorRegistrasi || f.id,
    f.tanggalDaftar || '',
    f.statusPendaftaran || '',
    f.statusKonfirmasi || '',
    f.pilihanJurusan || '',
    f.nisn || '',
    f.nikSiswa || '',
    f.noKk || '',
    f.namaLengkap || '',
    f.namaPanggilan || '',
    f.jenisKelamin || '',
    f.tempatLahir || '',
    f.tanggalLahir || '',
    f.agama || '',
    f.noHp || f.nomorHp || '',
    f.email || f.emailSiswa || '',
    f.alamatLengkap || '',
    f.rt || '',
    f.rw || '',
    f.desa || '',
    f.kecKab || '',
    f.kodePos || '',
    f.asalSmp || f.asalSekolah || '',
    f.namaAyah || '',
    f.nikAyah || '',
    f.pekerjaanAyah || '',
    f.namaIbu || '',
    f.nikIbu || '',
    f.pekerjaanIbu || '',
    f.noTelpOrtu || '',
    f.punyaWali || 'Tidak',
    f.namaWali || '-',
    f.memilikiKipPkhBpjs || 'Tidak',
    f.nomorIndukSiswaResmi || '',
    f.kelasDiterima || '',
    f.catatanAdmin || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Pendaftar PPDB');
  const dateStr = new Date().toISOString().split('T')[0];
  saveWorkbookAsExcel(wb, `DATA_PENDAFTAR_PPDB_${schoolName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}
