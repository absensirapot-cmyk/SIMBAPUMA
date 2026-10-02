import React, { useState } from 'react';
import { Kelas, User } from '../../types';
import { 
  GraduationCap, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users, 
  School, 
  Check, 
  X, 
  Building, 
  Layers
} from 'lucide-react';

interface AdminKelasTabProps {
  kelasList: Kelas[];
  usersList: User[];
  onAddKelas: (kelas: Kelas) => void;
  onUpdateKelas: (kelas: Kelas) => void;
  onDeleteKelas: (kelasId: string) => void;
}

export const AdminKelasTab: React.FC<AdminKelasTabProps> = ({
  kelasList,
  usersList,
  onAddKelas,
  onUpdateKelas,
  onDeleteKelas,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTingkat, setFilterTingkat] = useState<string>('all');
  const [filterJurusan, setFilterJurusan] = useState<string>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingKelasId, setEditingKelasId] = useState<string | null>(null);

  // Form State
  const [formTingkat, setFormTingkat] = useState<'X' | 'XI' | 'XII'>('X');
  const [formJurusan, setFormJurusan] = useState<'Farmasi' | 'Asisten Keperawatan' | 'Kesehatan' | 'Tata Kecantikan & Spa' | 'Perhotelan'>('Farmasi');
  const [formNamaKelas, setFormNamaKelas] = useState('');
  const [formIdWalas, setFormIdWalas] = useState('');
  const [formRuang, setFormRuang] = useState('Gedung A - R. 101');
  const [formKapasitas, setFormKapasitas] = useState(36);
  const [formTahunAjaran, setFormTahunAjaran] = useState('2026/2027');

  const teachersList = usersList.filter(u => u.role === 'guru' || u.role === 'walas');

  const getTeacherClassesText = (teacherId: string) => {
    const holding = kelasList.filter(k => (k.idWalas === teacherId) && k.id !== editingKelasId);
    if (holding.length > 0) {
      return ` [Wali Kelas: ${holding.map(k => k.namaKelas).join(', ')}]`;
    }
    return '';
  };

  const openAddModal = () => {
    setEditingKelasId(null);
    setFormTingkat('X');
    setFormJurusan('Farmasi');
    setFormNamaKelas('X Farmasi 3');
    setFormIdWalas(teachersList[0]?.id || '');
    setFormRuang('Gedung A - R. 103');
    setFormKapasitas(36);
    setFormTahunAjaran('2026/2027');
    setShowModal(true);
  };

  const openEditModal = (kelas: Kelas) => {
    setEditingKelasId(kelas.id);
    setFormTingkat(kelas.tingkat || 'X');
    setFormJurusan(kelas.jurusan as any || 'Farmasi');
    setFormNamaKelas(kelas.namaKelas);
    setFormIdWalas(kelas.idWalas || teachersList[0]?.id || '');
    setFormRuang(kelas.ruang || 'Ruang 101');
    setFormKapasitas(kelas.kapasitas || 36);
    setFormTahunAjaran(kelas.tahunAjaran || '2026/2027');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedWalas = teachersList.find(t => t.id === formIdWalas);
    const walasName = selectedWalas ? selectedWalas.nama : 'Belum Ditentukan';

    if (editingKelasId) {
      const updated: Kelas = {
        id: editingKelasId,
        namaKelas: formNamaKelas,
        tingkat: formTingkat,
        jurusan: formJurusan,
        idWalas: formIdWalas,
        namaWalas: walasName,
        ruang: formRuang,
        kapasitas: formKapasitas,
        tahunAjaran: formTahunAjaran,
      };
      onUpdateKelas(updated);
    } else {
      const newKelas: Kelas = {
        id: `k-${Date.now()}`,
        namaKelas: formNamaKelas,
        tingkat: formTingkat,
        jurusan: formJurusan,
        idWalas: formIdWalas,
        namaWalas: walasName,
        ruang: formRuang,
        kapasitas: formKapasitas,
        tahunAjaran: formTahunAjaran,
      };
      onAddKelas(newKelas);
    }
    setShowModal(false);
  };

  const handleDelete = (kelas: Kelas) => {
    if (confirm(`Apakah Anda yakin ingin menghapus rombel kelas "${kelas.namaKelas}"?`)) {
      onDeleteKelas(kelas.id);
    }
  };

  // Filtered List
  const filteredKelas = kelasList.filter(k => {
    const matchSearch = 
      k.namaKelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.namaWalas.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (k.ruang || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchTingkat = filterTingkat === 'all' || k.tingkat === filterTingkat;
    const matchJurusan = filterJurusan === 'all' || k.jurusan === filterJurusan;
    return matchSearch && matchTingkat && matchJurusan;
  });

  // Calculate Student Counts per Class
  const getStudentCount = (namaKelas: string) => {
    return usersList.filter(u => u.role === 'siswa' && (u.namaKelas === namaKelas || u.kelas === namaKelas)).length;
  };

  const totalSiswaRombel = kelasList.reduce((acc, k) => acc + getStudentCount(k.namaKelas), 0);
  const totalKapasitas = kelasList.reduce((acc, k) => acc + (k.kapasitas || 36), 0);

  return (
    <div className="space-y-6">
      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <School className="w-4 h-4 text-amber-600" />
            <span>Total Rombel Kelas</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{kelasList.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Seluruh tingkatan X - XII</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Siswa Terdaftar</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700">{totalSiswaRombel}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Terdistribusi di rombel</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Total Kapasitas</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{totalKapasitas}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Kursi belajar tersedia</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Jurusan Kejuruan</span>
          </div>
          <div className="text-2xl font-bold text-purple-700">4</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Farmasi, Kep, Kc, Htl</p>
        </div>
      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari rombel kelas, wali kelas, atau gedung ruangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Tingkat</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>

            <select
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Kejuruan</option>
              <option value="Farmasi">Farmasi</option>
              <option value="Asisten Keperawatan">Asisten Keperawatan</option>
              <option value="Kesehatan">Kesehatan</option>
              <option value="Tata Kecantikan & Spa">Tata Kecantikan & Spa</option>
              <option value="Perhotelan">Perhotelan</option>
            </select>

            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rombel Kelas</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLE DATA KELAS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Daftar Rombongan Belajar (Rombel)</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan {filteredKelas.length} dari {kelasList.length} kelas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Rombel</th>
                <th className="py-3 px-4">Tingkat & Jurusan</th>
                <th className="py-3 px-4">Wali Kelas</th>
                <th className="py-3 px-4">Ruang Kelas</th>
                <th className="py-3 px-4 text-center">Kapasitas & Siswa</th>
                <th className="py-3 px-4 text-center">Tahun Ajaran</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKelas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada rombel kelas yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredKelas.map((kelas) => {
                  const studentCount = getStudentCount(kelas.namaKelas);
                  const kapasitas = kelas.kapasitas || 36;
                  const percentFilled = Math.min(100, Math.round((studentCount / kapasitas) * 100));

                  return (
                    <tr key={kelas.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 font-bold text-[11px] flex items-center justify-center border border-amber-200">
                          {kelas.tingkat || 'X'}
                        </span>
                        <span>{kelas.namaKelas}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-800">{kelas.jurusan}</span>
                          <span className="text-[10px] text-slate-400">Tingkat {kelas.tingkat || 'X'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {kelas.namaWalas.charAt(0)}
                          </div>
                          <span className="font-medium text-slate-700">{kelas.namaWalas}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium">
                          {kelas.ruang || 'R. Teori'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-center gap-1 w-28 mx-auto">
                          <div className="flex items-center justify-between w-full text-[11px]">
                            <span className="font-bold text-slate-800">{studentCount} Siswa</span>
                            <span className="text-slate-400">/ {kapasitas}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                percentFilled > 90 ? 'bg-rose-500' : percentFilled > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentFilled}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                        {kelas.tahunAjaran || '2026/2027'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(kelas)}
                            title="Edit Rombel Kelas"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(kelas)}
                            title="Hapus Rombel Kelas"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL FORM KELAS */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingKelasId ? 'Edit Rombongan Belajar' : 'Tambah Rombongan Belajar Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur nama kelas, jurusan, wali kelas pendamping, dan daya tampung ruangan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kelas *
                  </label>
                  <select
                    value={formTingkat}
                    onChange={(e) => setFormTingkat(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="X">Kelas X (Sepuluh)</option>
                    <option value="XI">Kelas XI (Sebelas)</option>
                    <option value="XII">Kelas XII (Dua Belas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Program Kejuruan *
                  </label>
                  <select
                    value={formJurusan}
                    onChange={(e) => setFormJurusan(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Farmasi">Farmasi</option>
                    <option value="Asisten Keperawatan">Asisten Keperawatan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Tata Kecantikan & Spa">Tata Kecantikan & Spa</option>
                    <option value="Perhotelan">Perhotelan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Resmi Rombel *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X Kesehatan, XI Asisten Keperawatan 1"
                  value={formNamaKelas}
                  onChange={(e) => setFormNamaKelas(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Wali Kelas Pendamping *
                  </label>
                  <span className="text-[10px] text-amber-600 font-medium">Guru dapat memegang 2 kelas walas</span>
                </div>
                <select
                  required
                  value={formIdWalas}
                  onChange={(e) => setFormIdWalas(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">-- Pilih Guru Sebagai Wali Kelas --</option>
                  {teachersList.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nama} ({teacher.jurusan || 'Guru'}){getTeacherClassesText(teacher.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ruangan Kelas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Gedung A - R. 101"
                    value={formRuang}
                    onChange={(e) => setFormRuang(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daya Tampung Kapasitas Siswa
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={50}
                    value={formKapasitas}
                    onChange={(e) => setFormKapasitas(parseInt(e.target.value) || 36)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  placeholder="2026/2027"
                  value={formTahunAjaran}
                  onChange={(e) => setFormTahunAjaran(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingKelasId ? 'Simpan Perubahan' : 'Tambahkan Rombel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
