import { AbsensiRecord, NilaiMapelSiswa, RaportKurikulumMerdeka } from '../types';
import { STUDENTS_RAW_DATA } from './studentsData';

// Helper to format date YYYY-MM-DD
const today = new Date().toISOString().split('T')[0];

export const INITIAL_ABSENSI_RECORDS: AbsensiRecord[] = [
  {
    id: 'abs-001',
    nipd: '24.25.10.001',
    nisn: '0094701443',
    namaSiswa: "A'inun Latifah",
    kelas: 'Kelas XII Asisten Farmasi',
    tanggal: today,
    waktu: '06:48:22',
    status: 'Hadir',
    metode: 'Barcode Scan',
    keterangan: 'Tepat waktu - Gerbang Utama',
    petugas: 'Satpam / Petugas Piket',
  },
  {
    id: 'abs-002',
    nipd: '24.25.10.002',
    nisn: '3087159255',
    namaSiswa: 'Alin Putri Utami',
    kelas: 'Kelas XII Asisten Keperawatan',
    tanggal: today,
    waktu: '06:52:10',
    status: 'Hadir',
    metode: 'Barcode Scan',
    keterangan: 'Tepat waktu',
    petugas: 'Petugas Presensi',
  },
  {
    id: 'abs-003',
    nipd: '24.25.10.004',
    nisn: '0092132446',
    namaSiswa: 'Dewi Habsyah',
    kelas: 'Kelas XII Asisten Keperawatan',
    tanggal: today,
    waktu: '06:55:40',
    status: 'Hadir',
    metode: 'Barcode Scan',
    keterangan: 'Tepat waktu',
    petugas: 'Petugas Presensi',
  },
  {
    id: 'abs-004',
    nipd: '24.25.10.005',
    nisn: '0095314358',
    namaSiswa: 'Dinda Julliantiny Wijaya',
    kelas: 'Kelas XII Asisten Farmasi',
    tanggal: today,
    waktu: '07:08:15',
    status: 'Terlambat',
    metode: 'Barcode Scan',
    keterangan: 'Terlambat 8 menit karena kendala angkutan',
    petugas: 'Petugas Piket',
  },
  {
    id: 'abs-005',
    nipd: '24.25.10.006',
    nisn: '0154396877',
    namaSiswa: 'Dira Pratiwi',
    kelas: 'Kelas XII Asisten Keperawatan',
    tanggal: today,
    waktu: '07:00:00',
    status: 'Sakit',
    metode: 'Manual',
    keterangan: 'Surat dokter terlampir demam',
    petugas: 'Wali Kelas',
  },
  {
    id: 'abs-006',
    nipd: '24.25.10.007',
    nisn: '0081407803',
    namaSiswa: 'Dwi Sarah',
    kelas: 'Kelas XII Asisten Farmasi',
    tanggal: today,
    waktu: '06:45:00',
    status: 'Hadir',
    metode: 'Barcode Scan',
    keterangan: 'Tepat waktu',
    petugas: 'Petugas Piket',
  },
  {
    id: 'abs-007',
    nipd: '24.25.10.008',
    nisn: '3090638963',
    namaSiswa: 'Erlin',
    kelas: 'Kelas XII Asisten Keperawatan',
    tanggal: today,
    waktu: '06:50:11',
    status: 'Hadir',
    metode: 'Barcode Scan',
    keterangan: 'Tepat waktu',
    petugas: 'Petugas Presensi',
  },
  {
    id: 'abs-008',
    nipd: '24.25.10.009',
    nisn: '0099043847',
    namaSiswa: 'Hilma Aulia',
    kelas: 'Kelas XII Asisten Keperawatan',
    tanggal: today,
    waktu: '06:54:30',
    status: 'Hadir',
    metode: 'Barcode Scan',
    keterangan: 'Tepat waktu',
    petugas: 'Petugas Presensi',
  },
  {
    id: 'abs-009',
    nipd: '24.25.10.010',
    nisn: '3092699705',
    namaSiswa: "Hurul A'ini Putri",
    kelas: 'Kelas XII Asisten Farmasi',
    tanggal: today,
    waktu: '06:51:00',
    status: 'Hadir',
    metode: 'Barcode Scan',
    keterangan: 'Tepat waktu',
    petugas: 'Petugas Piket',
  },
  {
    id: 'abs-010',
    nipd: '24.25.10.012',
    nisn: '0091944364',
    namaSiswa: 'Jihan Nabila',
    kelas: 'Kelas XII Asisten Keperawatan',
    tanggal: today,
    waktu: '06:49:15',
    status: 'Hadir',
    metode: 'Barcode Scan',
    keterangan: 'Tepat waktu',
    petugas: 'Petugas Presensi',
  },
];

// Helper to compute Nilai Akhir and Capaian
export function hitungNilaiAkhir(item: Partial<NilaiMapelSiswa>): {
  nilaiFormatif: number;
  nilaiAkhir: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  ketercapaian: 'Tuntas' | 'Belum Tuntas';
  deskripsiTertinggi: string;
  deskripsiPerluBimbingan: string;
} {
  const lm1 = item.lm1 ?? item.tugas1;
  const lm2 = item.lm2 ?? item.tugas2;
  const lm3 = item.lm3 ?? item.tugas3;
  const lm4 = item.lm4;
  const ulhar1 = item.ulhar1;
  const ulhar2 = item.ulhar2;

  const validComponents = [lm1, lm2, lm3, lm4, ulhar1, ulhar2].filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const formatif = validComponents.length > 0 
    ? Math.round(validComponents.reduce((a, b) => a + b, 0) / validComponents.length)
    : 0;

  const pts = item.nilaiPts ?? 0;
  const pas = item.nilaiPas ?? 0;
  const pat = item.nilaiPat ?? 0;
  const periode = item.periode || 'PAS';

  let akhir = 0;
  if (periode === 'PTS') {
    // Penilaian Tengah Semester (Formatif + PTS)
    if (formatif > 0 && pts > 0) {
      akhir = Math.round(formatif * 0.5 + pts * 0.5);
    } else {
      akhir = pts || formatif;
    }
  } else if (periode === 'PAT') {
    // Penilaian Akhir Tahun (Formatif + PAT, hilangkan PTS)
    if (formatif > 0 && pat > 0) {
      akhir = Math.round(formatif * 0.5 + pat * 0.5);
    } else {
      akhir = pat || formatif;
    }
  } else {
    // Penilaian Akhir Semester (Formatif + PAS, hilangkan PTS)
    if (formatif > 0 && pas > 0) {
      akhir = Math.round(formatif * 0.5 + pas * 0.5);
    } else {
      akhir = pas || formatif;
    }
  }

  let predikat: 'A' | 'B' | 'C' | 'D' = 'C';
  if (akhir >= 90) predikat = 'A';
  else if (akhir >= 80) predikat = 'B';
  else if (akhir >= 70) predikat = 'C';
  else if (akhir > 0) predikat = 'D';

  const ketercapaian = akhir >= 75 ? 'Tuntas' : 'Belum Tuntas';

  const deskripsiTertinggi = akhir >= 85 
    ? 'Menunjukkan penguasaan yang sangat istimewa dalam mengaplikasikan teori kejuruan dan pemecahan kasus praktikum.'
    : akhir >= 75
    ? 'Menunjukkan pemahaman yang baik dalam menyerap materi pokok serta disiplin dalam menyelesaikan tugas terstruktur.'
    : akhir > 0
    ? 'Cukup memahami kompetensi dasar yang dipelajari, perlu peningkatan intensitas latihan.'
    : 'Belum ada penilaian terekam.';

  const deskripsiPerluBimbingan = akhir >= 85
    ? 'Pertahankan konsistensi belajar mandiri serta pengembangan wawasan literasi industri.'
    : akhir >= 75
    ? 'Perlu meningkatkan ketelitian dalam analisis formulasi sediaan dan studi kasus prosedural.'
    : akhir > 0
    ? 'Perlu bimbingan intensif dan remidial pada tujuan pembelajaran yang belum tuntas.'
    : '-';

  return {
    nilaiFormatif: formatif,
    nilaiAkhir: akhir,
    predikat,
    ketercapaian,
    deskripsiTertinggi,
    deskripsiPerluBimbingan,
  };
}

// Initial clean empty grades per user request (hilangkan data bawaan sistem untuk data guru dan nilai)
export const INITIAL_NILAI_MAPEL: NilaiMapelSiswa[] = [];

