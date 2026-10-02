import { Kelas, Mapel, User, Ekskul, AbsensiRecord, PraktikKerjaIndustriItem, JadwalPelajaran } from '../types';

/**
 * Filter kelas / rombel yang relevan dengan mata pelajaran yang dipilih.
 * - Mapel Kejuruan Farmasi -> Kelas Farmasi & Kesehatan
 * - Mapel Kejuruan Asisten Keperawatan -> Kelas Keperawatan & Kesehatan
 * - Mapel Kejuruan Tata Kecantikan & Spa -> Kelas Tata Kecantikan
 * - Mapel Kejuruan Perhotelan -> Kelas Perhotelan
 * - Mapel Muatan Umum (PJOK, Agama, PPKn, dll.) -> Semua Rombel
 */
export function getMatchingClassesForMapel(mapel: Mapel | undefined, allKelas: Kelas[]): Kelas[] {
  if (!mapel || !allKelas || allKelas.length === 0) {
    return allKelas || [];
  }

  const jur = (mapel.jurusan || '').toLowerCase();
  const nama = (mapel.namaMapel || '').toLowerCase();
  const kode = (mapel.kode || '').toLowerCase();
  const kelompok = (mapel.kelompok || '').toLowerCase();

  // 1. Kejuruan: Farmasi
  if (
    jur.includes('farmasi') ||
    nama.includes('farmasi') ||
    nama.includes('farmako') ||
    nama.includes('resep') ||
    kode.startsWith('far')
  ) {
    const matched = allKelas.filter(k => {
      const kj = (k.jurusan || '').toLowerCase();
      const kn = (k.namaKelas || '').toLowerCase();
      return kj.includes('farmasi') || kj.includes('kesehatan') || kn.includes('farmasi') || kn.includes('kesehatan');
    });
    return matched.length > 0 ? matched : allKelas;
  }

  // 2. Kejuruan: Asisten Keperawatan
  if (
    jur.includes('keperawatan') ||
    nama.includes('keperawatan') ||
    nama.includes('kdm') ||
    nama.includes('tindakan keperawatan') ||
    kode.startsWith('kep')
  ) {
    const matched = allKelas.filter(k => {
      const kj = (k.jurusan || '').toLowerCase();
      const kn = (k.namaKelas || '').toLowerCase();
      return kj.includes('keperawatan') || kj.includes('kesehatan') || kn.includes('keperawatan') || kn.includes('kesehatan');
    });
    return matched.length > 0 ? matched : allKelas;
  }

  // 3. Kejuruan: Tata Kecantikan & Spa
  if (
    jur.includes('cantik') ||
    jur.includes('spa') ||
    nama.includes('cantik') ||
    nama.includes('spa') ||
    nama.includes('kulit') ||
    nama.includes('rambut') ||
    kode.startsWith('kec')
  ) {
    const matched = allKelas.filter(k => {
      const kj = (k.jurusan || '').toLowerCase();
      const kn = (k.namaKelas || '').toLowerCase();
      return kj.includes('cantik') || kj.includes('spa') || kn.includes('kecantikan') || kn.includes('spa');
    });
    return matched.length > 0 ? matched : allKelas;
  }

  // 4. Kejuruan: Perhotelan
  if (
    jur.includes('hotel') ||
    nama.includes('hotel') ||
    nama.includes('hospitality') ||
    nama.includes('housekeeping') ||
    nama.includes('front office') ||
    kode.startsWith('htl')
  ) {
    const matched = allKelas.filter(k => {
      const kj = (k.jurusan || '').toLowerCase();
      const kn = (k.namaKelas || '').toLowerCase();
      return kj.includes('hotel') || kn.includes('perhotelan');
    });
    return matched.length > 0 ? matched : allKelas;
  }

  // 5. Muatan Umum (PJOK, PAI, PPKn, Bahasa Indonesia, Matematika, dll.)
  // Berlaku untuk semua rombel
  return allKelas;
}

// Helper to check if a class or student is in Kelas XI or XII (Fase F)
export const isClassXIorXII = (tingkatOrKelas?: string, secondCheck?: string): boolean => {
  const combined = `${tingkatOrKelas || ''} ${secondCheck || ''}`.toUpperCase();
  return /\bXII\b|\bXI\b|XII-|XI-|-XII|-XI|KELAS\s*XII|KELAS\s*XI|\b11\b|\b12\b/.test(combined);
};

/**
  * Dapatkan data praktik kerja industri (PKL/Prakerin) standar berdasarkan jurusan siswa
  */
export function getDefaultPrakerinForMajor(
  jurusan?: string, 
  namaKelas?: string
): PraktikKerjaIndustriItem[] {
  const jur = `${jurusan || ''} ${namaKelas || ''}`.toLowerCase();
  if (jur.includes('farmasi')) {
    return [
      {
        nomor: 1,
        mitra: 'Apotek Kimia Farma Parung Panjang',
        lamanya: '3 Bulan (90 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 92)'
      },
      {
        nomor: 2,
        mitra: 'Instalasi Farmasi RSUD Leuwiliang',
        lamanya: '3 Bulan (90 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 90)'
      }
    ];
  }
  if (jur.includes('keperawatan') || jur.includes('kesehatan')) {
    return [
      {
        nomor: 1,
        mitra: 'Puskesmas Parung Panjang',
        lamanya: '3 Bulan (90 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 91)'
      },
      {
        nomor: 2,
        mitra: 'Klinik Pratama Rawat Inap BPM',
        lamanya: '3 Bulan (90 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 89)'
      }
    ];
  }
  if (jur.includes('cantik') || jur.includes('spa')) {
    return [
      {
        nomor: 1,
        mitra: 'Martha Tilaar Salon & Day Spa Serpong',
        lamanya: '6 Bulan (180 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 93)'
      }
    ];
  }
  if (jur.includes('hotel')) {
    return [
      {
        nomor: 1,
        mitra: 'Grand Serpong Hotel & Convention',
        lamanya: '6 Bulan (180 Hari)',
        keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 91)'
      }
    ];
  }
  return [
    {
      nomor: 1,
      mitra: 'Instansi / Dunia Usaha & Industri Mitra Terpadu',
      lamanya: '3 Bulan (90 Hari)',
      keterangan: 'Kompeten / Sangat Memuaskan (Nilai: 90)'
    }
  ];
}

/**
 * Cek apakah user adalah Super Administrator
 */
export function isUserAdmin(user: User | null): boolean {
  return Boolean(user && user.role === 'admin');
}

/**
 * Dapatkan daftar kelas yang secara sah dibina oleh user sebagai Wali Kelas
 */
export function getWalasAssignedClasses(user: User | null, kelasList: Kelas[] = []): Kelas[] {
  if (!user) return [];
  if (user.role === 'admin') return kelasList;

  // Jika user BUKAN walas (role !== 'walas' dan isWalas !== true), DIJAMIN BUKAN WALAS
  if (user.role !== 'walas' && !user.isWalas) {
    return [];
  }

  // Jika user secara eksplisit ditandai bukan walas
  if (user.isWalas === false) {
    return [];
  }

  const userNama = (user.nama || '').trim().toLowerCase();
  const userNip = (user.nipOrNis || '').trim().toLowerCase();
  const userId = (user.id || '').trim().toLowerCase();

  return kelasList.filter(k => {
    const kWalasId = (k.idWalas || '').trim().toLowerCase();
    const kWalasNama = (k.namaWalas || '').trim().toLowerCase();

    // Rombel tanpa walas tidak boleh cocok
    if (!kWalasId && !kWalasNama) return false;

    const matchId = kWalasId && (kWalasId === userId || (userNip && kWalasId === userNip));
    const matchNama = kWalasNama && userNama && (
      kWalasNama === userNama ||
      kWalasNama.includes(userNama) ||
      userNama.includes(kWalasNama)
    );
    const matchExplicitId = Boolean(
      user.walasKelasId && (k.id === user.walasKelasId || user.walasKelasId.includes(k.id))
    );
    const matchExplicitIds = Boolean(
      user.walasKelasIds && user.walasKelasIds.includes(k.id)
    );
    const matchKelasWali = Boolean(
      user.kelasWali && (user.kelasWali.includes(k.id) || user.kelasWali.includes(k.namaKelas))
    );

    return matchId || matchNama || matchExplicitId || matchExplicitIds || matchKelasWali;
  });
}

/**
 * Cek apakah user adalah Wali Kelas yang sah
 * (Hanya true jika menjabat sebagai wali kelas dari salah satu kelas atau memiliki status walas resmi)
 */
export function isUserWalas(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'walas' && !user.isWalas) return false;
  if (user.isWalas === false) return false;
  if (user.role === 'walas') return true;
  
  const assigned = getWalasAssignedClasses(user, kelasList);
  return assigned.length > 0;
}

/**
 * Dapatkan daftar ekstrakurikuler yang secara sah dibina oleh user sebagai Pembina
 * Mendukung pembina murni maupun guru/walas yang merangkap jabatan sebagai pembina ekskul
 */
export function getPembinaAssignedEkskuls(user: User | null, ekskulList: Ekskul[] = []): Ekskul[] {
  if (!user) return [];
  if (user.role === 'admin') return ekskulList;

  const userNama = (user.nama || '').trim().toLowerCase();
  const userUsername = (user.username || '').trim().toLowerCase();
  const userId = (user.id || '').trim().toLowerCase();
  const userNip = (user.nipOrNis || '').trim().toLowerCase();
  const ekskulDibina = (user.ekskulDibina || []).map(id => id.trim().toLowerCase());

  return ekskulList.filter(e => {
    const eId = (e.id || '').trim().toLowerCase();
    const eNama = (e.nama || '').trim().toLowerCase();
    const idPembina = (e.idPembina || '').trim().toLowerCase();
    const pembina = (e.pembina || '').trim().toLowerCase();

    // 1. Match by direct idPembina ID or NIP
    if (idPembina && (idPembina === userId || (userNip && idPembina === userNip))) {
      return true;
    }

    // 2. Match by user.ekskulDibina list
    if (ekskulDibina.length > 0) {
      if (ekskulDibina.includes(eId) || ekskulDibina.includes(eNama)) {
        return true;
      }
    }

    // 3. Match by teacher's full name or username
    if (pembina) {
      const matchNama = userNama && (
        pembina === userNama ||
        pembina.includes(userNama) || 
        userNama.includes(pembina)
      );
      const matchUsername = userUsername && pembina.includes(userUsername);
      if (matchNama || matchUsername) return true;
    }

    return false;
  });
}

/**
 * Cek apakah user adalah Pembina Ekstrakurikuler yang sah
 * (Bisa berstatus Pembina Saja, atau Merangkap Guru + Pembina, atau Walas + Pembina)
 */
export function isUserPembina(user: User | null, ekskulList: Ekskul[] = []): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'pembina_ekskul') return true;
  if (user.isPembinaEkskul) return true;
  return getPembinaAssignedEkskuls(user, ekskulList).length > 0;
}

/**
 * Cek apakah user adalah "Guru Biasa" (Guru pengampu mapel yang tidak menjabat walas dan bukan pembina)
 */
export function isGuruBiasa(user: User | null, kelasList: Kelas[] = [], ekskulList: Ekskul[] = []): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'siswa' || user.role === 'calon_siswa') return false;
  const walas = isUserWalas(user, kelasList);
  const pembina = isUserPembina(user, ekskulList);
  return !walas && !pembina;
}

/**
 * Cek apakah user adalah Guru Biasa atau Pembina Biasa
 * (yaitu Guru atau Pembina yang BUKAN Wali Kelas dan BUKAN Administrator)
 * User dengan status ini HANYA berhak mengakses dan mencetak nilai/leger mata pelajaran yang diampunya sendiri secara pribadi.
 */
export function isGuruOrPembinaBiasa(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return false;
  const walas = isUserWalas(user, kelasList);
  return !walas;
}

/**
 * Dapatkan daftar mata pelajaran yang secara sah diampu oleh Guru / Pembina tertentu.
 * Jika Admin: mengembalikan seluruh mata pelajaran.
 * Jika Walas: mengembalikan seluruh mata pelajaran (karena walas berhak melihat/mengelola nilai rombelnya).
 * Jika Guru / Pembina biasa: HANYA mengembalikan mata pelajaran yang diampunya sendiri secara sah.
 */
export function getTeacherAssignedMapels(
  teacher: User | null,
  mapelList: Mapel[] = [],
  jadwalList: JadwalPelajaran[] = []
): Mapel[] {
  if (!teacher) return [];
  if (isUserAdmin(teacher)) return mapelList;

  const teacherMapelStrings = new Set<string>();
  (teacher.mapelDiampu || []).forEach(m => {
    if (m && typeof m === 'string') {
      teacherMapelStrings.add(m.trim().toLowerCase());
    }
  });
  if (teacher.mapel) teacherMapelStrings.add(teacher.mapel.trim().toLowerCase());
  if (teacher.mataPelajaran) teacherMapelStrings.add(teacher.mataPelajaran.trim().toLowerCase());

  const teacherName = (teacher.nama || '').trim().toLowerCase();
  const teacherId = (teacher.id || '').trim().toLowerCase();
  const teacherNip = (teacher.nipOrNis || teacher.idGuru || '').trim().toLowerCase();

  const matched: Mapel[] = [];
  const addedIds = new Set<string>();

  mapelList.forEach(m => {
    const mId = (m.id || '').toLowerCase();
    const mKode = (m.kode || '').toLowerCase();
    const mNama = (m.namaMapel || '').toLowerCase();
    const mGuru = (m.guruPengampu || '').toLowerCase();
    const mIdGuru = (m.idGuru || '').toLowerCase();

    let isMatch = false;

    // Direct match with IDs, codes, names in mapelDiampu / mapel
    if (teacherMapelStrings.has(mId) || teacherMapelStrings.has(mKode) || teacherMapelStrings.has(mNama)) {
      isMatch = true;
    }

    // Substring match
    if (!isMatch) {
      for (const str of teacherMapelStrings) {
        if (str.length > 2 && (mNama.includes(str) || str.includes(mNama))) {
          isMatch = true;
          break;
        }
      }
    }

    // Teacher name in mapel
    if (!isMatch && mGuru && teacherName) {
      if (mGuru === teacherName || mGuru.includes(teacherName) || teacherName.includes(mGuru)) {
        isMatch = true;
      }
    }

    // Teacher ID in mapel
    if (!isMatch && mIdGuru) {
      if (mIdGuru === teacherId || (teacherNip && mIdGuru === teacherNip)) {
        isMatch = true;
      }
    }

    if (isMatch && !addedIds.has(m.id)) {
      matched.push(m);
      addedIds.add(m.id);
    }
  });

  // Also check in Jadwal Pelajaran where this teacher is assigned
  jadwalList.forEach(j => {
    const jGuruId = (j.idGuru || '').toLowerCase();
    const jGuruName = (j.namaGuru || '').toLowerCase();
    const isThisTeacher = (teacherId && jGuruId === teacherId) ||
      (teacherNip && jGuruId === teacherNip) ||
      (teacherName && (jGuruName === teacherName || jGuruName.includes(teacherName) || teacherName.includes(jGuruName)));

    if (isThisTeacher && j.idMapel) {
      const found = mapelList.find(m => m.id === j.idMapel || m.kode === j.idMapel || m.namaMapel.toLowerCase() === (j.namaMapel || '').toLowerCase());
      if (found && !addedIds.has(found.id)) {
        matched.push(found);
        addedIds.add(found.id);
      }
    }
  });

  return matched;
}

/**
 * Dapatkan daftar kelas yang secara sah diajar oleh Guru tertentu
 */
export function getTeacherAssignedClasses(
  teacher: User | null,
  kelasList: Kelas[] = [],
  teacherMapels: Mapel[] = [],
  jadwalList: JadwalPelajaran[] = []
): Kelas[] {
  if (!teacher) return [];
  if (isUserAdmin(teacher)) return kelasList;

  const matchedClassIds = new Set<string>();
  const teacherId = (teacher.id || '').toLowerCase();
  const teacherNip = (teacher.nipOrNis || teacher.idGuru || '').toLowerCase();
  const teacherName = (teacher.nama || '').toLowerCase();
  const teacherMapelIds = new Set(teacherMapels.map(m => m.id));

  // 1. Dari jadwal pelajaran
  jadwalList.forEach(j => {
    const jGuruId = (j.idGuru || '').toLowerCase();
    const jGuruName = (j.namaGuru || '').toLowerCase();
    const isThisTeacher = (teacherId && jGuruId === teacherId) ||
      (teacherNip && jGuruId === teacherNip) ||
      (teacherName && (jGuruName === teacherName || jGuruName.includes(teacherName) || teacherName.includes(jGuruName)));

    if (isThisTeacher || (j.idMapel && teacherMapelIds.has(j.idMapel))) {
      if (j.idKelas) matchedClassIds.add(j.idKelas);
      const foundK = kelasList.find(k => k.namaKelas === j.namaKelas);
      if (foundK) matchedClassIds.add(foundK.id);
    }
  });

  // 2. Dari kecocokan tingkat & jurusan mapel yang diampu
  if (matchedClassIds.size === 0 && teacherMapels.length > 0) {
    teacherMapels.forEach(m => {
      kelasList.forEach(k => {
        const matchTingkat = !m.tingkat || m.tingkat === 'Semua Tingkat' || m.tingkat === k.tingkat;
        const matchJurusan = !m.jurusan || m.jurusan === 'Semua Jurusan' || m.jurusan === 'Umum' ||
          k.jurusan.toLowerCase().includes(m.jurusan.toLowerCase()) ||
          m.jurusan.toLowerCase().includes(k.jurusan.toLowerCase());
        if (matchTingkat && matchJurusan) {
          matchedClassIds.add(k.id);
        }
      });
    });
  }

  const result = kelasList.filter(k => matchedClassIds.has(k.id));
  return result.length > 0 ? result : kelasList;
}

/**
 * Cek apakah user berhak mengakses nilai ekstrakurikuler
 * Sesuai aturan:
 * - Admin: Penuh
 * - Wali Kelas: Akses nilai ekskul siswa kelas binaannya
 * - Pembina: Hanya input nilai ekskul cabang yang dibinanya
 * - Guru Biasa: TIDAK BISA AKSES
 */
export function canAccessNilaiEkskul(user: User | null, ekskulList: Ekskul[] = [], kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  if (isUserWalas(user, kelasList)) return true;
  if (isUserPembina(user, ekskulList)) return true;
  return false;
}

/**
 * Cek apakah user berhak mencetak kartu tanda pelajar rombel
 * (Hanya untuk Admin dan Wali Kelas)
 */
export function canPrintKartuRombel(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  return isUserWalas(user, kelasList);
}

/**
 * Cek apakah user berhak mengakses & mencetak Raport Resmi
 * Sesuai aturan:
 * - Walas: Akses rapot kelas binaannya
 * - Admin: Akses seluruh rapot
 * - Guru Biasa: TIDAK BISA AKSES
 * - Pembina: TIDAK BISA AKSES
 */
export function canAccessCetakRaport(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  return isUserWalas(user, kelasList);
}

/**
 * Cek apakah user berhak mengakses Leger Keseluruhan Kelas
 * Sesuai aturan:
 * - Walas: Akses leger keseluruhan rombel yang diampu
 * - Admin: Akses seluruh rombel
 * - Guru Biasa: TIDAK BISA AKSES (hanya leger mapel diampu)
 * - Pembina: TIDAK BISA AKSES
 */
export function canAccessLegerKeseluruhan(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  return isUserWalas(user, kelasList);
}

/**
 * Cek apakah user berhak mengakses menu Kenaikan Kelas & Kelulusan
 * Sesuai aturan:
 * - Walas: Akses kenaikan kelas & kelulusan rombel yang diampu
 * - Admin: Akses seluruh rombel
 * - Guru Biasa: TIDAK BISA AKSES
 * - Pembina: TIDAK BISA AKSES
 */
export function canAccessKenaikanKelas(user: User | null, kelasList: Kelas[] = []): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;
  return isUserWalas(user, kelasList);
}

/**
 * Cek apakah user berhak mengedit paket ujian & butir soal
 * Sesuai aturan:
 * - Admin: Berhak mengedit seluruh paket ujian & butir soal di sekolah
 * - Guru Mapel yang bersangkutan: Berhak mengedit paket ujian yang dibuatnya atau mapel yang diampunya
 * - Siswa / calon siswa / lainnya: TIDAK BISA AKSES
 */
export function canUserEditExam(user: User | null, exam: { idGuru?: string; namaGuru?: string; idMapel?: string; kodeMapel?: string; namaMapel?: string }, mapelList: Mapel[] = []): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'guru' && user.role !== 'walas') return false;

  // 1. Cek jika guru adalah pembuat paket ujian
  if (exam.idGuru && (exam.idGuru === user.id || (user.nipOrNis && exam.idGuru === user.nipOrNis))) {
    return true;
  }

  // 2. Cek jika nama pembuat cocok
  const uNama = (user.nama || '').trim().toLowerCase();
  const eNamaGuru = (exam.namaGuru || '').trim().toLowerCase();
  if (uNama && eNamaGuru && (uNama === eNamaGuru || uNama.includes(eNamaGuru) || eNamaGuru.includes(uNama))) {
    return true;
  }

  // 3. Cek apakah mapel ujian termasuk mapel yang diampu oleh guru
  const examMapelId = (exam.idMapel || '').toLowerCase();
  const examMapelKode = (exam.kodeMapel || '').toLowerCase();
  const examMapelNama = (exam.namaMapel || '').toLowerCase();

  if (user.mapelDiampu && user.mapelDiampu.length > 0) {
    const isDiampu = user.mapelDiampu.some(m => {
      const val = (m || '').trim().toLowerCase();
      if (!val) return false;
      return (
        val === examMapelId ||
        val === examMapelKode ||
        val === examMapelNama ||
        examMapelNama.includes(val) ||
        val.includes(examMapelNama) ||
        (val.includes('jasmani') && examMapelNama.includes('jasmani')) ||
        (val.includes('pjok') && (examMapelNama.includes('jasmani') || examMapelKode.includes('pjok'))) ||
        (val.includes('agama') && (examMapelNama.includes('agama') || examMapelKode.includes('pai'))) ||
        (val.includes('farmasi') && examMapelNama.includes('farmasi')) ||
        (val.includes('keperawatan') && examMapelNama.includes('keperawatan')) ||
        (val.includes('kecantikan') && examMapelNama.includes('kecantikan')) ||
        (val.includes('perhotelan') && examMapelNama.includes('perhotelan'))
      );
    });
    if (isDiampu) return true;
  }

  // 4. Guru spesifik berdasarkan nama/username (e.g. Pak Pika -> PJOK)
  const uUser = (user.username || '').toLowerCase();
  if ((uNama.includes('pika') || uUser.includes('pika')) && (examMapelNama.includes('jasmani') || examMapelNama.includes('pjok') || examMapelKode.includes('pjok'))) {
    return true;
  }

  return false;
}

/**
 * Filter mata pelajaran yang relevan dengan kelas / rombel tertentu
 * (Menyaring mapel kejuruan dan muatan umum sesuai jenjang kelas & jurusan)
 */
/**
 * Filter mata pelajaran yang relevan dengan kelas tertentu berdasarkan tingkat (X, XI, XII) dan jurusan.
 * Memastikan kode mapel yang muncul di Leger per kelas adalah yang diampu oleh kelas itu sendiri.
 */
export function getMatchingMapelForKelas(
  kelas: Kelas | undefined, 
  allMapel: Mapel[],
  classStudents?: User[]
): Mapel[] {
  if (!kelas || !allMapel || allMapel.length === 0) return allMapel || [];

  const kNama = (kelas.namaKelas || '').toLowerCase();
  const kJur = (kelas.jurusan || '').toLowerCase();
  const kTingkat = (kelas.tingkat || '').toUpperCase() || 
    (kNama.includes('xii') ? 'XII' : kNama.includes('xi') ? 'XI' : kNama.includes('x') ? 'X' : '');

  // Determine active religions in this class
  const classReligions = new Set<string>();
  if (classStudents && classStudents.length > 0) {
    classStudents.forEach(s => {
      const ag = ((s as any).agama || 'Islam').toLowerCase();
      classReligions.add(ag);
    });
  } else {
    // Default to Islam
    classReligions.add('islam');
  }

  const matched = allMapel.filter(m => {
    // 1. Cek tingkat kelas (X, XI, XII) jika mapel memiliki tingkat atau kode berakhiran tingkat
    const mTingkat = (m.tingkat || '').toUpperCase();
    const mKode = (m.kode || '').toUpperCase();
    
    // Check tingkat from code if m.tingkat is missing or 'SEMUA'
    let effectiveMTingkat = mTingkat;
    if (!effectiveMTingkat || effectiveMTingkat === 'SEMUA') {
      if (mKode.endsWith('-X') || mKode.includes('-X-') || mKode.endsWith(' X')) effectiveMTingkat = 'X';
      else if (mKode.endsWith('-XI') || mKode.includes('-XI-') || mKode.endsWith(' XI')) effectiveMTingkat = 'XI';
      else if (mKode.endsWith('-XII') || mKode.includes('-XII-') || mKode.endsWith(' XII')) effectiveMTingkat = 'XII';
    }

    if (effectiveMTingkat && effectiveMTingkat !== 'SEMUA' && kTingkat && effectiveMTingkat !== kTingkat) {
      return false;
    }

    const mJur = (m.jurusan || '').toLowerCase();
    const mNama = (m.namaMapel || '').toLowerCase();

    // 2. Filter mapel Agama: hanya tampilkan agama yang dianut siswa di kelas ini
    if (mNama.includes('pendidikan agama') || mNama.includes('budi pekerti') || mNama.includes('kepercayaan terhadap tuhan')) {
      if (mNama.includes('islam') || mKode.startsWith('PAI')) {
        return classReligions.has('islam');
      }
      if (mNama.includes('kristen') || mKode.includes('KRIS')) {
        return classReligions.has('kristen') || classReligions.has('protestan');
      }
      if (mNama.includes('katolik') || mNama.includes('katholik') || mKode.includes('KAT')) {
        return classReligions.has('katolik') || classReligions.has('katholik');
      }
      if (mNama.includes('hindu') || mKode.includes('PAH')) {
        return classReligions.has('hindu');
      }
      if (mNama.includes('buddha') || mKode.includes('PAB')) {
        return classReligions.has('buddha');
      }
      if (mNama.includes('konghucu') || mKode.includes('KONG')) {
        return classReligions.has('konghucu');
      }
      if (mNama.includes('kepercayaan') || mKode.includes('YME')) {
        return false;
      }
    }

    // 3. Filter Seni Pilihan (Kurikulum Merdeka SMK memilih Seni Rupa / Musik, hilangkan opsi yang tidak dipakai)
    if (mNama.startsWith('seni ') || mNama.includes('seni teater') || mNama.includes('seni tari') || mNama.includes('seni musik')) {
      if (mNama.includes('teater') || mNama.includes('tari')) {
        return false;
      }
    }

    // 4. Filter duplikasi PPKN vs PPAN: Kurikulum Merdeka menggunakan Pendidikan Pancasila (PPAN)
    if (mKode.startsWith('PPKN-') && allMapel.some(item => item.kode === `PPAN-${kTingkat}`)) {
      return false;
    }

    // 5. Mapel Umum berlaku untuk semua rombel
    if (!m.jurusan || mJur === 'semua' || mJur === 'semua jurusan' || mJur.includes('umum')) {
      return true;
    }

    // 6. Mapel Kejuruan: Farmasi
    if (kJur.includes('farmasi') || kNama.includes('farmasi')) {
      return (mJur.includes('farmasi') || mNama.includes('farmasi') || mNama.includes('farmako') || mNama.includes('resep')) &&
             !mJur.includes('keperawatan') && !mJur.includes('cantik') && !mJur.includes('hotel');
    }

    // 7. Mapel Kejuruan: Asisten Keperawatan
    if (kJur.includes('keperawatan') || kNama.includes('keperawatan')) {
      return (mJur.includes('keperawatan') || mNama.includes('keperawatan') || mNama.includes('kdm') || mNama.includes('tindakan keperawatan')) &&
             !mJur.includes('farmasi') && !mJur.includes('cantik') && !mJur.includes('hotel');
    }

    // 8. Mapel Kejuruan: Tata Kecantikan & Spa
    if (kJur.includes('cantik') || kJur.includes('spa') || kNama.includes('cantik') || kNama.includes('spa')) {
      return (mJur.includes('cantik') || mJur.includes('spa') || mNama.includes('cantik') || mNama.includes('spa') || mNama.includes('kulit') || mNama.includes('rambut')) &&
             !mJur.includes('farmasi') && !mJur.includes('keperawatan') && !mJur.includes('hotel');
    }

    // 9. Mapel Kejuruan: Perhotelan
    if (kJur.includes('hotel') || kNama.includes('hotel')) {
      return (mJur.includes('hotel') || mNama.includes('hotel') || mNama.includes('hospitality') || mNama.includes('housekeeping') || mNama.includes('front office')) &&
             !mJur.includes('farmasi') && !mJur.includes('keperawatan') && !mJur.includes('cantik');
    }

    // 10. Mapel Rombel X Kesehatan Terpadu (Fase E): mencakup Dasar Teknologi Farmasi & Dasar Layanan Kesehatan
    if (kJur.includes('kesehatan') || kNama.includes('kesehatan')) {
      if (mJur.includes('farmasi') || mJur.includes('keperawatan') || mJur.includes('kesehatan')) {
        return !mJur.includes('cantik') && !mJur.includes('hotel');
      }
      return false;
    }

    // Default kejuruan yang cocok
    return mJur === kJur;
  });

  return matched.length > 0 ? matched : allMapel;
}

/**
 * Robust matching between an attendance record and a student user account.
 * Accounts for NIPD (with or without dots), NISN, userId, ID suffix, username, and normalized student name.
 */
export function isRecordForStudent(
  record: AbsensiRecord | null | undefined, 
  student: User | null | undefined
): boolean {
  if (!record || !student) return false;
  
  // 1. Direct ID match or record ID containing student ID
  if (record.userId && student.id && record.userId === student.id) return true;
  if (record.id && student.id && record.id.endsWith(`-${student.id}`)) return true;
  
  // 2. NIPD match (exact and dotless e.g. "24.25.10.001" vs "242510001")
  const studentNipd = (student.nipd || student.nipOrNis || '').trim();
  const recNipd = (record.nipd || '').trim();
  if (recNipd && studentNipd) {
    if (recNipd === studentNipd) return true;
    if (recNipd.replace(/\./g, '') === studentNipd.replace(/\./g, '')) return true;
    if (recNipd.toLowerCase() === studentNipd.toLowerCase()) return true;
  }
  // Match NIPD against student username (e.g. username is 242510001 or 24.25.10.001)
  if (recNipd && student.username) {
    const sUser = student.username.trim();
    if (recNipd === sUser || recNipd.replace(/\./g, '') === sUser.replace(/\./g, '')) return true;
  }
  
  // 3. NISN match
  const studentNisn = (student.nisn || student.username || '').trim();
  const recNisn = (record.nisn || '').trim();
  if (recNisn && studentNisn) {
    if (recNisn === studentNisn) return true;
    if (recNisn.toLowerCase() === studentNisn.toLowerCase()) return true;
  }
  if (student.nipOrNis && recNisn && recNisn === student.nipOrNis) return true;
  if (student.nisn && recNipd && recNipd === student.nisn) return true;
  if (studentNipd && recNisn && recNisn === studentNipd) return true;
  
  // 4. Normalized Name match (case-insensitive & stripped of punctuation/accents)
  const recNama = (record.namaSiswa || (record as any).nama || '').trim().toLowerCase();
  const studNama = (student.nama || '').trim().toLowerCase();
  if (recNama && studNama) {
    if (recNama === studNama) return true;
    const strippedRec = recNama.replace(/[^a-z0-9]/g, '');
    const strippedStud = studNama.replace(/[^a-z0-9]/g, '');
    if (strippedRec && strippedStud && strippedRec === strippedStud) return true;
    // Handle partial match for long Indonesian compound names
    if (strippedRec.length > 5 && strippedStud.length > 5) {
      if (strippedRec.includes(strippedStud) || strippedStud.includes(strippedRec)) return true;
    }
  }
  
  return false;
}

/**
 * Clean and normalize scanned QR Code text from camera or barcode scanner.
 */
export function cleanScannedQrString(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();
  // Strip URL query parameters if full URL was scanned
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const url = new URL(str);
      const q = url.searchParams.get('id') || url.searchParams.get('nipd') || url.searchParams.get('nisn') || url.pathname.split('/').pop();
      if (q) str = q;
    } catch {}
  }
  // If formatted like BPM-SISWA|24.25.10.001|...
  if (str.includes('|')) {
    const parts = str.split('|');
    if (parts[0] === 'BPM-SISWA' && parts[1]) {
      str = parts[1];
    } else if (parts[0] === 'BPM-ABSEN') {
      // Daily QR code: keep intact or token
      return str;
    }
  }
  str = str.replace(/^(BPM-SISWA:|NIPD:|NISN:|ID:)/i, '').trim();
  return str;
}

/**
 * Normalizes class names by stripping "Kelas " prefix, collapsing whitespace, and converting to lowercase.
 */
export function normalizeKelas(k: string | undefined | null): string {
  if (!k) return '';
  return String(k).replace(/^Kelas\s+/i, '').trim().toLowerCase();
}

/**
 * Checks if two class names match, robust against "Kelas " prefix, casing, hyphens, and whitespace differences.
 */
export function isSameKelas(k1: string | undefined | null, k2: string | undefined | null): boolean {
  if (!k1 || !k2) return false;
  const n1 = normalizeKelas(k1);
  const n2 = normalizeKelas(k2);
  if (n1 === n2) return true;
  const c1 = n1.replace(/[^a-z0-9]/g, '');
  const c2 = n2.replace(/[^a-z0-9]/g, '');
  return c1.length > 0 && c1 === c2;
}

/**
 * Returns the current date in YYYY-MM-DD format based on Indonesia (Asia/Jakarta / WIB) timezone,
 * with graceful fallback to user's local calendar day.
 * NEVER uses UTC toISOString() which lags behind by 1 day during Indonesian school morning hours!
 */
export function getLocalDateString(d: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
  } catch (_) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Returns current local time in HH:mm or HH:mm:ss format in WIB (Asia/Jakarta).
 */
export function getLocalTimeString(d: Date = new Date(), withSeconds: boolean = false): string {
  try {
    const parts = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined,
      hour12: false
    }).format(d);
    return parts.replace(/\./g, ':');
  } catch (_) {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return withSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
  }
}

/**
 * Helper to determine whether a teacher/walas has official PNS/P3K NIP or uses "ID Guru".
 * In rapot: use "NIP. [nip]" if PNS/P3K, otherwise use "ID Guru: [idGuru]".
 */
export function getTeacherIdLabel(user: User | null | undefined): { label: string; value: string; isPns: boolean } {
  if (!user) return { label: 'ID Guru', value: '-', isPns: false };

  const status = (user.statusKepegawaian || '').toUpperCase();
  const isPnsStatus = user.isPns === true || status === 'PNS' || status.includes('P3K') || status.includes('PPPK');
  const hasOfficialNip = Boolean(user.nip && user.nip.trim().length >= 10);

  if (isPnsStatus || hasOfficialNip) {
    const val = user.nip || user.nipOrNis || '-';
    return { label: 'NIP', value: val, isPns: true };
  }

  // Non-PNS (Yayasan, GTY, GTT, Honorer, etc.) -> Use Id Guru
  const val = user.idGuru || user.nipOrNis || user.username || user.id || '-';
  return { label: 'ID Guru', value: val, isPns: false };
}

/**
 * Helper to determine whether Kepala Sekolah has official PNS/P3K NIP or uses "ID Guru".
 * In rapot: use "NIP. [nip]" if PNS/P3K, otherwise use "ID Guru: [idGuru]".
 */
export function getKepsekIdLabel(schoolInfo: any | null | undefined): { label: string; value: string; isPns: boolean } {
  if (!schoolInfo) return { label: 'ID Guru', value: '-', isPns: false };

  const status = (schoolInfo.statusPnsKepsek || '').toUpperCase();
  const isPnsStatus = schoolInfo.isPnsKepsek === true || status === 'PNS' || status.includes('P3K') || status.includes('PPPK');
  
  if (isPnsStatus) {
    return { label: 'NIP', value: schoolInfo.nipKepalaSekolah || '-', isPns: true };
  }

  // Non-PNS -> Use ID Guru
  const val = schoolInfo.idGuruKepalaSekolah || schoolInfo.nipKepalaSekolah || 'Bapuma-Kepsek';
  return { label: 'ID Guru', value: val, isPns: false };
}

/**
 * Returns string signature label for teacher in rapot/leger (e.g. "NIP. 1985..." if PNS/P3K or "Id Guru. Bapuma-...")
 */
export function formatTeacherIdentifier(user?: any | null): string {
  if (!user) return 'Id Guru. -';
  const { label, value } = getTeacherIdLabel(user);
  return `${label}. ${value}`;
}

/**
 * Returns string signature label for Kepala Sekolah in rapot/leger (e.g. "NIP. 1975..." if PNS/P3K or "Id Guru. Bapuma-...")
 */
export function formatKepsekIdentifier(schoolInfo?: any | null): string {
  if (!schoolInfo) return 'Id Guru. -';
  const { label, value } = getKepsekIdLabel(schoolInfo);
  return `${label}. ${value}`;
}

/**
 * Mengkategorikan dan menentukan prioritas urutan Mata Pelajaran sesuai
 * Peraturan Resmi Kurikulum Merdeka SMK (Kepmendikbudristek No. 262/M/2022 & Permendikbudristek No. 12 Tahun 2024):
 *
 * A. KELOMPOK MATA PELAJARAN UMUM (Kelompok A):
 *    1. Pendidikan Agama dan Budi Pekerti
 *    2. Pendidikan Pancasila (PPKn / PPAN)
 *    3. Bahasa Indonesia
 *    4. Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)
 *    5. Sejarah
 *    6. Seni Budaya (Seni Rupa, Seni Musik, Seni Teater, Seni Tari)
 *    7. Muatan Lokal (Bahasa Daerah / Bahasa Sunda, Potensi Daerah)
 *
 * B. KELOMPOK MATA PELAJARAN KEJURUAN (Kelompok B):
 *    (Pada SMK, Matematika & Bahasa Inggris secara resmi dialokasikan pada Kelompok Kejuruan)
 *    1. Matematika (Umum / Terapan)
 *    2. Bahasa Inggris
 *    3. Informatika
 *    4. Projek IPAS (Ilmu Pengetahuan Alam dan Sosial)
 *    5. Dasar-Dasar Program Keahlian (Kelas X) / Konsentrasi Keahlian (Kelas XI & XII)
 *       (Teknologi Farmasi, Layanan Kesehatan, KDM, Tindakan Keperawatan, Tata Kecantikan, Perhotelan, dll)
 *    6. Projek Kreatif dan Kewirausahaan (PKK)
 *    7. Praktik Kerja Lapangan (PKL)
 *    8. Mata Pelajaran Pilihan (Bahasa Asing Pilihan seperti Jepang, Arab, Mandarin, Jerman, dll)
 *    9. Muatan Lokal Kejuruan
 */
export function getMapelRaportCategory(mapel: any): {
  group: 'A' | 'B';
  groupName: string;
  priority: number;
} {
  if (!mapel) {
    return { group: 'B', groupName: 'Kelompok Mata Pelajaran Kejuruan', priority: 99 };
  }

  const rawNama = (mapel.namaMapel || mapel.nama || mapel.mapelNama || '').toLowerCase().trim();
  const rawKode = (mapel.kode || mapel.mapelKode || mapel.mapelId || '').toUpperCase().trim();
  const rawKelompok = (mapel.kelompok || '').toLowerCase().trim();

  // -------------------------------------------------------------
  // KELOMPOK A: MATA PELAJARAN UMUM
  // -------------------------------------------------------------

  // 1. Pendidikan Agama dan Budi Pekerti
  if (
    rawNama.includes('pendidikan agama') ||
    rawNama.includes('budi pekerti') ||
    rawNama.includes('kepercayaan terhadap tuhan') ||
    rawKode.startsWith('PAI') ||
    rawKode.startsWith('PAK') ||
    rawKode.startsWith('PAH') ||
    rawKode.startsWith('PAB')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 1 };
  }

  // 2. Pendidikan Pancasila (PPKn / PPAN)
  if (
    rawNama.includes('pancasila') ||
    rawNama.includes('kewarganegaraan') ||
    rawKode.startsWith('PPAN') ||
    rawKode.startsWith('PPKN')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 2 };
  }

  // 3. Bahasa Indonesia (bukan Bahasa Inggris)
  if (
    (rawNama.includes('bahasa indonesia') || rawKode.startsWith('BIND') || rawKode === 'BI') &&
    !rawNama.includes('inggris')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 3 };
  }

  // 4. Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)
  if (
    rawNama.includes('jasmani') ||
    rawNama.includes('olahraga') ||
    rawNama.includes('pjok') ||
    rawKode.startsWith('PJOK')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 4 };
  }

  // 5. Sejarah
  if (
    rawNama.includes('sejarah') ||
    rawKode.startsWith('SEJ')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 5 };
  }

  // 6. Seni Budaya (Seni Musik, Seni Rupa, Seni Teater, Seni Tari)
  if (
    rawNama.includes('seni ') ||
    rawNama.includes('seni budaya') ||
    rawNama.includes('seni musik') ||
    rawNama.includes('seni rupa') ||
    rawNama.includes('seni tari') ||
    rawNama.includes('seni teater') ||
    rawKode.startsWith('SB-') ||
    rawKode.startsWith('SM-') ||
    rawKode.startsWith('SR-') ||
    rawKode.startsWith('STR-') ||
    rawKode.startsWith('ST-')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 6 };
  }

  // 7. Muatan Lokal (Bahasa Daerah / Bahasa Sunda, Potensi Daerah)
  if (
    rawNama.includes('muatan lokal') ||
    rawNama.includes('mulok') ||
    rawNama.includes('bahasa daerah') ||
    rawNama.includes('sunda') ||
    rawNama.includes('potensi daerah') ||
    rawKode.startsWith('ML-')
  ) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 7 };
  }

  // -------------------------------------------------------------
  // KELOMPOK B: MATA PELAJARAN KEJURUAN (SMK)
  // (Menurut Kepmendikbudristek No 262/M/2022 & Permendikbudristek No 12 Tahun 2024)
  // -------------------------------------------------------------

  // B1. Matematika (pada SMK ditempatkan pada Kelompok Kejuruan urutan pertama)
  if (
    rawNama.includes('matematika') ||
    rawKode.startsWith('MTK') ||
    rawKode === 'MAT'
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 10 };
  }

  // B2. Bahasa Inggris (pada SMK ditempatkan pada Kelompok Kejuruan urutan kedua)
  if (
    rawNama.includes('bahasa inggris') ||
    rawNama.includes('english') ||
    rawKode.startsWith('BING') ||
    rawKode === 'ENG'
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 11 };
  }

  // B3. Informatika
  if (
    rawNama.includes('informatika') ||
    rawNama.includes('teknologi informasi') ||
    rawNama.includes('tik') ||
    rawKode.startsWith('INF') ||
    rawKode.startsWith('TIK')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 12 };
  }

  // B4. Projek IPAS (Ilmu Pengetahuan Alam dan Sosial)
  if (
    rawNama.includes('ipas') ||
    rawNama.includes('ilmu pengetahuan alam dan sosial') ||
    rawKode.startsWith('IPAS')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 13 };
  }

  // B6. Produk / Projek Kreatif dan Kewirausahaan (PKK)
  if (
    rawNama.includes('kewirausahaan') ||
    rawNama.includes('kreatif') ||
    rawNama.includes('pkk') ||
    rawKode.startsWith('PKK')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 20 };
  }

  // B7. Praktik Kerja Lapangan (PKL) / Praktik Kerja Industri (Prakerin)
  if (
    rawNama.includes('praktik kerja') ||
    rawNama.includes('pkl') ||
    rawNama.includes('prakerin') ||
    rawKode.startsWith('PKL')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 21 };
  }

  // B8. Mata Pelajaran Pilihan (Bahasa Asing Pilihan seperti Bahasa Arab, Jepang, Mandarin, Jerman, Korea, Perancis, dll.)
  if (
    rawNama.includes('bahasa jepang') ||
    rawNama.includes('bahasa arab') ||
    rawNama.includes('bahasa mandarin') ||
    rawNama.includes('bahasa jerman') ||
    rawNama.includes('bahasa korea') ||
    rawNama.includes('bahasa perancis') ||
    rawNama.includes('bahasa cina') ||
    rawNama.includes('bahasa belanda') ||
    rawKode.startsWith('BJPN') ||
    rawKode.startsWith('BARAB') ||
    rawKode.startsWith('BMND') ||
    rawKode.startsWith('BJRM') ||
    rawKode.startsWith('BKOR') ||
    rawKode.startsWith('BPRC') ||
    rawKode.startsWith('BCIN') ||
    rawKode.startsWith('BBLD') ||
    rawNama.includes('pilihan')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 25 };
  }

  // B5. Dasar-Dasar Program Keahlian / Konsentrasi Keahlian (Farmasi, Keperawatan, Tata Kecantikan, Perhotelan, dll)
  if (
    rawKelompok.includes('kejuruan') ||
    rawKelompok.includes('kompetensi keahlian') ||
    rawKelompok.includes('c3') ||
    rawKelompok.includes('c2') ||
    rawNama.includes('dasar') ||
    rawNama.includes('farmasi') ||
    rawNama.includes('obat') ||
    rawNama.includes('sediaan') ||
    rawNama.includes('keperawatan') ||
    rawNama.includes('kesehatan') ||
    rawNama.includes('kdm') ||
    rawNama.includes('penyakit') ||
    rawNama.includes('kecantikan') ||
    rawNama.includes('kulit') ||
    rawNama.includes('rambut') ||
    rawNama.includes('perhotelan') ||
    rawNama.includes('hotel') ||
    rawNama.includes('hospitality') ||
    rawKode.startsWith('FAR') ||
    rawKode.startsWith('KEP') ||
    rawKode.startsWith('DDTF') ||
    rawKode.startsWith('DDLK')
  ) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 15 };
  }

  // Layanan Tambahan (BP/BK, Bimbingan Konseling)
  if (rawNama.includes('bimbingan') || rawNama.includes('konseling') || rawKode.startsWith('BK')) {
    return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 30 };
  }

  // Fallback berdasarkan kelompok
  if (rawKelompok.includes('umum') || rawKelompok.includes('nasional') || rawKelompok.includes('kewilayahan')) {
    return { group: 'A', groupName: 'A. Kelompok Mata Pelajaran Umum', priority: 8 };
  }

  return { group: 'B', groupName: 'B. Kelompok Mata Pelajaran Kejuruan', priority: 16 };
}

/**
 * Mengurutkan Mata Pelajaran persis sesuai Peraturan Kurikulum Merdeka SMK:
 * Kelompok Umum (A.1 s/d A.7) disusul Kelompok Kejuruan (B.1 s/d B.9).
 */
export function sortMapelForRaport<T extends Record<string, any>>(
  mapels: T[]
): T[] {
  if (!Array.isArray(mapels)) return [];

  return [...mapels].sort((a, b) => {
    const cat = getMapelRaportCategory(a);
    const catB = getMapelRaportCategory(b);

    // 1. Urutkan berdasarkan Kelompok A (Umum) dulu, baru Kelompok B (Kejuruan)
    if (cat.group !== catB.group) {
      return cat.group === 'A' ? -1 : 1;
    }

    // 2. Urutkan berdasarkan prioritas regulasi resmi di dalam kelompok
    if (cat.priority !== catB.priority) {
      return cat.priority - catB.priority;
    }

    // 3. Jika sama-sama sub-kejuruan atau pilihan, urutkan nama secara alfabetis
    const nameA = a.namaMapel || a.nama || a.mapelNama || '';
    const nameB = b.namaMapel || b.nama || b.mapelNama || '';
    return nameA.localeCompare(nameB);
  });
}

export interface RaportSubjectGroup<T> {
  groupKey: 'A' | 'B';
  groupName: string;
  mapels: T[];
}

/**
 * Memisahkan dan mengelompokkan Mata Pelajaran menjadi Kelompok A (Umum)
 * dan Kelompok B (Kejuruan) yang masing-masing sudah diurutkan sesuai regulasi.
 */
export function getRaportMapelGroups<T extends Record<string, any>>(
  mapels: T[]
): RaportSubjectGroup<T>[] {
  const sorted = sortMapelForRaport(mapels);

  const umumMapels: T[] = [];
  const kejuruanMapels: T[] = [];

  sorted.forEach(m => {
    const cat = getMapelRaportCategory(m);
    if (cat.group === 'A') {
      umumMapels.push(m);
    } else {
      kejuruanMapels.push(m);
    }
  });

  const groups: RaportSubjectGroup<T>[] = [];
  if (umumMapels.length > 0) {
    groups.push({
      groupKey: 'A',
      groupName: 'A. Kelompok Mata Pelajaran Umum',
      mapels: umumMapels,
    });
  }
  if (kejuruanMapels.length > 0) {
    groups.push({
      groupKey: 'B',
      groupName: 'B. Kelompok Mata Pelajaran Kejuruan',
      mapels: kejuruanMapels,
    });
  }

  return groups;
}

/**
 * Sorts Mata Pelajaran based on statutory curriculum regulations and tingkat
 */
export function sortMapelByKelas(mapels: any[]): any[] {
  if (!Array.isArray(mapels)) return [];
  return sortMapelForRaport(mapels);
}



