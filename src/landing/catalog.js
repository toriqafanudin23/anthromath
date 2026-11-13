// Daftar simulasi di katalog. Menambah simulasi baru = menambah satu objek di SIMS
// (dan satu entri di vite.config.js). `subject` otomatis muncul sebagai filter.
export const SIMS = [
  {
    id: 'kuadrat',
    href: './kuadrat/',
    title: 'Fungsi Kuadrat',
    subject: 'Matematika',
    level: 'SMP–SMA',
    desc: 'Ubah a, b, c, titik puncak, atau akar, lalu amati parabolanya. Tiga bentuk fungsi, titik bisa digeser langsung di grafik.',
    tags: ['Parabola', 'Titik puncak', 'Akar', 'Diskriminan'],
  },
  {
    id: 'transformasi',
    href: './transformasi/',
    title: 'Transformasi Geometri',
    subject: 'Matematika',
    level: 'SMP–SMA',
    desc: 'Buat titik dan bangun datar, lalu lakukan translasi, refleksi, rotasi, dan dilatasi dengan animasi serta jejak.',
    tags: ['Translasi', 'Refleksi', 'Rotasi', 'Dilatasi'],
  },
]
