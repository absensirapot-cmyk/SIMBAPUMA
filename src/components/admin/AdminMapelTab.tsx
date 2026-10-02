import React, { useState, useMemo } from 'react';
import { Mapel } from '../../types';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  Layers, 
  Tag,
  RotateCcw,
  Sparkles,
  Cloud,
  CheckCircle2
} from 'lucide-react';
import { INITIAL_MAPEL } from '../../data/initialData';

interface AdminMapelTabProps {
  mapelList: Mapel[];
  onAddMapel: (mapel: Mapel) => void;
  onUpdateMapel?: (mapel: Mapel) => void;
  onDeleteMapel?: (mapelId: string) => void;
  onResetToDefaultMapel?: () => void;
  onSyncMapel?: () => void;
}

export const AdminMapelTab: React.FC<AdminMapelTabProps> = ({
  mapelList,
  onAddMapel,
  onUpdateMapel = () => {},
  onDeleteMapel = () => {},
  onResetToDefaultMapel,
  onSyncMapel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelompok, setFilterKelompok] = useState<string>('all');
  const [filterJurusan, setFilterJurusan] = useState<string>('all');
  const [filterTingkat, setFilterTingkat] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  // Set of initial mapel IDs to identify user-created ones
  const initialMapelIdSet = useMemo(() => new Set(INITIAL_MAPEL.map(m => m.id)), []);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingMapelId, setEditingMapelId] = useState<string | null>(null);
  const [deleteConfirmMapel, setDeleteConfirmMapel] = useState<Mapel | null>(null);

  // Form State
  const [formKode, setFormKode] = useState('');
  const [formNamaMapel, setFormNamaMapel] = useState('');
  const [formKelompok, setFormKelompok] = useState<'Muatan Umum' | 'Muatan Kejuruan' | 'Muatan Lokal'>('Muatan Umum');
  const [formJurusan, setFormJurusan] = useState<string>('Umum');
  const [formTingkat, setFormTingkat] = useState<string>('Semua');
  const [formJamPerMinggu, setFormJamPerMinggu] = useState<number>(3);
  const [formKeterangan, setFormKeterangan] = useState<string>('');

  const openAddModal = () => {
    setEditingMapelId(null);
    setFormKode(`MP-${Date.now().toString().slice(-4)}`);
    setFormNamaMapel('');
    setFormKelompok('Muatan Umum');
    setFormJurusan('Umum');
    setFormTingkat('Semua');
    setFormJamPerMinggu(3);
    setFormKeterangan('');
    setShowModal(true);
  };

  const openEditModal = (mapel: Mapel) => {
    setEditingMapelId(mapel.id);
    setFormKode(mapel.kode);
    setFormNamaMapel(mapel.namaMapel);
    setFormKelompok((mapel.kelompok as any) || (mapel.jurusan === 'Umum' ? 'Muatan Umum' : 'Muatan Kejuruan'));
    setFormJurusan(mapel.jurusan);
    setFormTingkat(mapel.tingkat || 'Semua');
    setFormJamPerMinggu(mapel.jamPerMinggu || 3);
    setFormKeterangan(mapel.keterangan || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaMapel.trim() || !formKode.trim()) {
      setNotification('Nama mata pelajaran dan kode wajib diisi!');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (editingMapelId) {
      const updated: Mapel = {
        id: editingMapelId,
        kode: formKode.trim(),
        namaMapel: formNamaMapel.trim(),
        kelompok: formKelompok,
        jurusan: formJurusan,
        tingkat: formTingkat,
        jamPerMinggu: formJamPerMinggu,
        keterangan: formKeterangan.trim(),
      };
      onUpdateMapel(updated);
      setNotification(`Mata pelajaran "${updated.namaMapel}" berhasil diperbarui!`);
    } else {
      const newMapel: Mapel = {
        id: `m-${Date.now()}`,
        kode: formKode.trim(),
        namaMapel: formNamaMapel.trim(),
        kelompok: formKelompok,
        jurusan: formJurusan,
        tingkat: formTingkat,
        jamPerMinggu: formJamPerMinggu,
        keterangan: formKeterangan.trim(),
      };
      onAddMapel(newMapel);
      // Auto-clear active filters so the new subject is immediately visible at the top!
      setSearchTerm('');
      setFilterKelompok('all');
      setFilterJurusan('all');
      setFilterTingkat('all');
      setNotification(`Mata pelajaran baru "${newMapel.namaMapel}" (${newMapel.kode}) berhasil disimpan dan langsung aktif di daftar paling atas!`);
    }
    setShowModal(false);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleDelete = (mapel: Mapel) => {
    setDeleteConfirmMapel(mapel);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmMapel) return;
    onDeleteMapel(deleteConfirmMapel.id);
    setNotification(`Mata pelajaran "${deleteConfirmMapel.namaMapel}" (${deleteConfirmMapel.kode}) berhasil dihapus.`);
    setDeleteConfirmMapel(null);
    setTimeout(() => setNotification(null), 3000);
  };

  // Filtered & Sorted Mapel (User-created new mapel appears prominently at the top)
  const filteredMapel = useMemo(() => {
    return mapelList
      .filter(m => {
        const matchSearch = 
          m.namaMapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.keterangan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.jurusan.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchKelompok = 
          filterKelompok === 'all' || 
          (filterKelompok === 'Umum' && (m.kelompok?.includes('Umum') || m.kelompok?.includes('Nasional') || m.kelompok?.includes('Wajib') || m.jurusan === 'Umum' || m.jurusan === 'Semua Jurusan')) ||
          (filterKelompok === 'Kejuruan' && (m.kelompok?.includes('Kejuruan') || m.kelompok?.includes('C3') || m.kelompok?.includes('Dasar') || (m.jurusan !== 'Umum' && m.jurusan !== 'Semua Jurusan'))) ||
          (filterKelompok === 'Mulok' && (m.kelompok?.toLowerCase().includes('lokal') || m.kelompok?.toLowerCase().includes('mulok') || (m.keterangan || '').toLowerCase().includes('mulok')));

        const matchJurusan = 
          filterJurusan === 'all' || 
          m.jurusan === filterJurusan ||
          (filterJurusan === 'Umum' && (m.jurusan === 'Semua Jurusan' || m.jurusan === 'Umum' || m.jurusan === 'Semua')) ||
          (filterJurusan === 'Kesehatan' && (m.jurusan === 'Kesehatan' || m.jurusan === 'Farmasi' || m.jurusan === 'Asisten Keperawatan'));

        const matchTingkat =
          filterTingkat === 'all' ||
          m.tingkat === filterTingkat ||
          m.tingkat === 'Semua' ||
          !m.tingkat;

        return matchSearch && matchKelompok && matchJurusan && matchTingkat;
      })
      .sort((a, b) => {
        const aIsNew = !initialMapelIdSet.has(a.id);
        const bIsNew = !initialMapelIdSet.has(b.id);
        if (aIsNew && !bIsNew) return -1;
        if (!aIsNew && bIsNew) return 1;
        return 0;
      });
  }, [mapelList, searchTerm, filterKelompok, filterJurusan, filterTingkat, initialMapelIdSet]);

  const countUmum = mapelList.filter(m => m.kelompok?.includes('Umum') || m.kelompok?.includes('Nasional') || m.jurusan === 'Umum' || m.jurusan === 'Semua Jurusan').length;
  const countKejuruan = mapelList.filter(m => m.kelompok?.includes('Kejuruan') || m.kelompok?.includes('C3') || (m.jurusan !== 'Umum' && m.jurusan !== 'Semua Jurusan')).length;

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* STATUS MAPEL TERBARU BANNER */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 rounded-2xl shadow-md border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
            <Check className="w-3.5 h-3.5 text-emerald-200" />
            <span>Sinkronisasi Mapel Aktif & Terintegrasi</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white">
            Struktur Mata Pelajaran Kurikulum Merdeka & DAPODIK Resmi
          </h2>
          <p className="text-xs text-emerald-100 max-w-3xl leading-relaxed">
            Semua mata pelajaran (termasuk mapel baru yang Anda tambahkan) tersimpan aman di database lokal dan Cloud Firestore: <strong>Kelompok Umum Wajib, Projek IPAS, P5, Dasar Kejuruan Kelas X, Konsentrasi Keahlian C3, Mapel Pilihan Digital Kejuruan, serta Muatan Lokal</strong>. Siap digunakan dalam pembuatan soal CAT, jadwal, dan leger nilai rapor.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onSyncMapel && (
            <button
              type="button"
              onClick={() => {
                onSyncMapel();
                setNotification('Sinkronisasi sukses! Seluruh mata pelajaran (termasuk mapel baru) telah berhasil disinkronkan dan tersimpan aman ke Cloud Firestore.');
                setTimeout(() => setNotification(null), 4500);
              }}
              className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Sinkronkan seluruh mata pelajaran termasuk mapel baru ke database dan Cloud Firestore"
            >
              <Cloud className="w-4 h-4 text-emerald-700" />
              <span>Sinkronkan Mapel Terbaru ke Cloud</span>
            </button>
          )}
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Total Mata Pelajaran</span>
          </div>
          <div className="text-2xl font-bold text-slate-900">{mapelList.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">DAPODIK SMK Terintegrasi</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Muatan Umum & Pilihan</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{countUmum}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Nasional, Kewilayahan & Mulok</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Tag className="w-4 h-4 text-purple-600" />
            <span>Muatan Kejuruan (C3)</span>
          </div>
          <div className="text-2xl font-bold text-purple-700">{countKejuruan}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Farmasi, Perawat, Kesehatan, dll</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Rata-Rata JP</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700">2-6 JP</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Jam Pelajaran per Pekan</p>
        </div>
      </div>

      {/* FILTER & ACTIONS BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode atau nama mata pelajaran..."
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
              <option value="X">Kelas X (Kurmer)</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>

            <select
              value={filterKelompok}
              onChange={(e) => setFilterKelompok(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Kelompok</option>
              <option value="Umum">Muatan Umum & Nasional</option>
              <option value="Kejuruan">Muatan Kejuruan & C3</option>
              <option value="Mulok">Muatan Lokal (Mulok)</option>
            </select>

            <select
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Semua Alokasi</option>
              <option value="Umum">Umum / Semua Jurusan</option>
              <option value="Farmasi">Farmasi</option>
              <option value="Asisten Keperawatan">Asisten Keperawatan</option>
              <option value="Kesehatan">Kesehatan</option>
              <option value="Tata Kecantikan & Spa">Tata Kecantikan & Spa</option>
              <option value="Perhotelan">Perhotelan</option>
            </select>

            {onSyncMapel && (
              <button
                type="button"
                onClick={() => {
                  onSyncMapel();
                  setNotification('Seluruh mata pelajaran resmi dan mapel baru berhasil disinkronkan ke sistem & Cloud!');
                  setTimeout(() => setNotification(null), 4000);
                }}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-emerald-200"
                title="Sinkronkan seluruh mata pelajaran ke standar DAPODIK resmi tanpa menghapus mapel baru"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Sinkronkan DAPODIK & Mapel Baru</span>
              </button>
            )}

            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Mapel Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLE DATA MAPEL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Kurikulum & Daftar Mata Pelajaran</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan {filteredMapel.length} dari {mapelList.length} mata pelajaran
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Kelompok Muatan</th>
                <th className="py-3 px-4">Alokasi Jurusan</th>
                <th className="py-3 px-4 text-center">Tingkat</th>
                <th className="py-3 px-4 text-center">Beban (JP)</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMapel.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada mata pelajaran yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredMapel.map((mapel) => {
                  const isUmum = mapel.kelompok === 'Muatan Umum' || mapel.jurusan === 'Umum' || mapel.jurusan === 'Semua';

                  return (
                    <tr key={mapel.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-900">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 text-[11px]">
                          {mapel.kode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{mapel.namaMapel}</span>
                            {!initialMapelIdSet.has(mapel.id) && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                <span>MAPEL BARU</span>
                              </span>
                            )}
                          </div>
                          {mapel.keterangan && (
                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {mapel.keterangan}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isUmum
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-purple-50 text-purple-800 border border-purple-200'
                          }`}
                        >
                          {mapel.kelompok || (isUmum ? 'Muatan Umum' : 'Muatan Kejuruan')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        {mapel.jurusan}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-slate-600">
                        {mapel.tingkat || 'Semua'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {mapel.jamPerMinggu ? `${mapel.jamPerMinggu} JP` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(mapel)}
                            title="Edit Mata Pelajaran"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(mapel)}
                            title="Hapus Mata Pelajaran"
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

      {/* MODAL FORM TAMBAH / EDIT MAPEL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingMapelId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Manual'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Konfigurasi kode, nama mapel, muatan kurikulum, dan beban jam pelajaran.
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Mapel *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="MP-01"
                    value={formKode}
                    onChange={(e) => setFormKode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelompok Kurikulum *
                  </label>
                  <select
                    value={formKelompok}
                    onChange={(e) => setFormKelompok(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Muatan Umum">Muatan Umum (Wajib Semua)</option>
                    <option value="Muatan Kejuruan">Muatan Kejuruan (Keahlian)</option>
                    <option value="Muatan Lokal">Muatan Lokal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bahasa Indonesia, Farmakologi Klinis"
                  value={formNamaMapel}
                  onChange={(e) => setFormNamaMapel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alokasi Jurusan *
                  </label>
                  <select
                    value={formJurusan}
                    onChange={(e) => setFormJurusan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Umum">Umum (Semua Jurusan)</option>
                    <option value="Farmasi">Farmasi</option>
                    <option value="Asisten Keperawatan">Asisten Keperawatan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Tata Kecantikan & Spa">Tata Kecantikan & Spa</option>
                    <option value="Perhotelan">Perhotelan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat Kelas
                  </label>
                  <select
                    value={formTingkat}
                    onChange={(e) => setFormTingkat(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Semua">Semua Tingkat (X - XII)</option>
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Beban Jam Pelajaran (JP/Minggu)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={formJamPerMinggu}
                    onChange={(e) => setFormJamPerMinggu(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Keterangan Singkat
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Teori & Praktik Lab"
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
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
                  <span>{editingMapelId ? 'Simpan Perubahan' : 'Tambahkan Mapel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS MAPEL */}
      {deleteConfirmMapel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Hapus Mata Pelajaran</h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus mata pelajaran <strong className="text-slate-900">{deleteConfirmMapel.namaMapel}</strong> ({deleteConfirmMapel.kode})?
              </p>
              <p className="text-[11px] text-rose-600 mt-2">
                Tindakan ini akan menghapus mata pelajaran ini dari daftar dan menyinkronkan perubahan ke Cloud database.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmMapel(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
