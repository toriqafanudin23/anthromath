# Anthromath — panduan UI/UX dan fitur

Acuan untuk mengembangkan simulasi/materi lain dengan tampilan dan perilaku yang konsisten. Simulasi saat ini: **Fungsi Kuadrat** dan **Transformasi Geometri**, dipilih lewat halaman katalog. Bahasa antarmuka: Indonesia.

> Bagian di bawah ini ditulis untuk simulasi Fungsi Kuadrat (berkas di `src/kuadrat/`) dan berlaku sebagai pola untuk semua simulasi. Struktur multi-simulasi, katalog, dan simulasi Transformasi dijelaskan di bagian paling bawah.

## Teknologi

- Vite + React 18 (JSX), JSXGraph untuk papan grafik, KaTeX untuk rumus.
- Font UI: Inter Variable; judul/brand: Source Serif 4 Variable; rumus: font bawaan KaTeX (Computer Modern).
- Tanpa state manager dan tanpa library UI. Semua gaya ada di `src/styles.css` (variabel CSS di `:root`).

## Struktur berkas

| Berkas | Isi |
|---|---|
| `src/main.jsx` | Titik masuk; memuat font, `katex.min.css`, `styles.css` |
| `src/App.jsx` | Layout, state (mode, parameter, langkah, tampilan, bayangan), panel kontrol, layar penuh |
| `src/Graph.jsx` | Papan JSXGraph: kurva, titik, sumbu, grid, bayangan, drag |
| `src/GraphTools.jsx` | Toolbar mengambang di grafik + panel pengaturan tampilan |
| `src/config.js` | Konstanta bersama tanpa React: `VIEW_DEFAULTS`, `VIEW_LIMITS`, `MAX_SHADOWS`, `SHADOW_COLORS` |
| `src/share.js` | Berbagi parameter lewat tautan: `encodeState`, `decodeState` (dengan validasi), `shareUrl`, `readHash` |
| `src/Tex.jsx` | Komponen `<Tex>{'x^{2}'}</Tex>` (KaTeX, `throwOnError: false`) |
| `src/math.js` | Logika matematika murni: `derive`, `forms`, `toCanon`, `LIM`, `PARAMS`, `MODES`, `fmt`/`tx` |
| `src/styles.css` | Seluruh gaya |

Pola untuk materi baru: pisahkan **logika matematika murni** (`math.js`, tanpa React) dari **papan grafik** (`Graph.jsx`) dan **antarmuka** (`App.jsx`). `Graph.jsx` hanya menerima nilai turunan dan menggambar; perubahan dari drag dikirim balik lewat `onChange(patch)`. Area pandang (geser/zoom) dibaca dan diatur lewat ref (`getBox`/`setBox`) dan prop `initBox`, dipakai fitur berbagi.

## Prinsip UI/UX

1. **Ponsel lanskap dan layar lebar diutamakan**, portrait tetap nyaman.
   - Portrait: grafik menempel di atas (`position: sticky`), panel bergulir di bawahnya.
   - Lanskap/layar lebar (`min-aspect-ratio: 1/1` dan `min-width: 640px`): grafik di kiri, panel di kanan (maks. 420px) yang bergulir sendiri.
2. **Grafik adalah fokus.** Panel hanya memuat kontrol dan ringkasan; hal sekunder disembunyikan di pengaturan.
3. **Sederhana dan fungsional.** Hindari dekorasi dan teks penjelasan panjang di UI (cukup label, petunjuk satu baris, atau `title`); tanpa border berlebihan; warna hangat netral (`--bg #faf9f5`, aksen `--accent #c6613f`).
4. **Target sentuh ≥ 40–44px** untuk tombol, penggeser, dan tombol +/−. Toolbar grafik 36px.
5. **Setiap parameter punya tiga cara ubah**: penggeser, tombol −/+, dan drag titik langsung di grafik bila bermakna.
6. **Langkah perubahan** dipilih lewat segmented control (0.1, 0.2, 0.5, 1); drag titik ikut menyesuaikan (snap) ke kelipatan langkah.
7. **Ukuran dan tebal memakai tombol −/+**, bukan penggeser.
8. **Angka desimal memakai titik** (1.5, 3.9), bukan koma. Tampilan UI memakai `fmt` (minus `−`), LaTeX memakai `tx` (minus biasa, KaTeX yang menggambar).
9. **Rumus selalu LaTeX** lewat `<Tex>` dengan font bawaan KaTeX. Teks penjelasan tetap Inter. Jangan menulis rumus dengan font serif biasa atau huruf miring buatan sendiri.
10. **Rumus panjang tidak memecah layout**: container diberi `overflow-x: auto`, `white-space: nowrap`, scrollbar disembunyikan.
11. **Kasus khusus harus ditangani**, bukan disembunyikan: contoh `a = 0` menjadi garis lurus, dengan statistik, rumus, dan titik yang menyesuaikan serta catatan singkat.
12. **Aksesibilitas dasar**: `aria-label` pada tombol ikon, `role="switch"` + `aria-checked` pada saklar, `aria-live` pada rumus utama, fokus terlihat (`:focus-visible`), `Esc` menutup panel dan layar penuh.

## Tata letak

- **Header** (48px): kiri nama website **Anthromath** (dengan logo ✻), kanan **judul simulasi** (`h1`, mis. "Fungsi Kuadrat") dan tombol bagikan. Ganti hanya judul kanan dan `<title>` untuk materi baru.
- **Grafik** (`.graphwrap`): kartu putih, sudut 16px, `touch-action: none`. Rumus utama tepat di bawahnya.
- **Toolbar grafik** (kanan atas kartu, 4 tombol): atur ulang tampilan, buat bayangan (dengan lencana jumlah), pengaturan tampilan, layar penuh. Dibatasi 4 tombol agar muat di ponsel lanskap; tombol baru sebaiknya masuk ke panel pengaturan.
- **Panel** (`.panel`): tab bentuk, petunjuk satu baris, langkah, kontrol parameter, bayangan, sifat grafik, daftar bentuk. Lebar maks. 640px di portrait.
- **Layar penuh**: Fullscreen API bila ada, jika tidak (mis. iPhone) overlay CSS `position: fixed`. Grafik 100%, toolbar tetap ada, dan kartu mengambang di bawah berisi rumus, tab bentuk, dan tombol −/+ parameter. Rumus disembunyikan saat tinggi layar < 460px.

## Fitur yang ada

### Kontrol
- **Tiga bentuk fungsi** (tab): umum `ax² + bx + c`, puncak `a(x − h)² + k`, faktor `a(x − x₁)(x − x₂)`. Ketiganya digambar dari bentuk kanonik lewat `toCanon`; nilai awal ketiganya menghasilkan parabola yang sama.
- **Drag titik di grafik**: titik hijau `c` (bentuk umum), titik puncak (bentuk puncak), titik akar `x₁`/`x₂` (bentuk faktor). Hanya titik yang relevan dengan tab aktif yang bisa digeser.
- **Batas nilai** ada di `LIM` (mis. `a` −5…5). **`a` boleh 0**, grafik menjadi garis lurus.
- **Kembalikan nilai awal** per tab.

### Grafik
- Pan dengan seret layar (tanpa Shift), zoom dengan roda/pinch, tombol **atur ulang tampilan** mengembalikan bounding box awal.
- Kurva oranye; titik puncak (gelap), akar (biru), titik potong y (hijau); garis simetri putus-putus.
- Sumbu dibuat sendiri (`axis: false` di `initBoard`) agar bisa dihapus penuh; grid juga dihapus sepenuhnya saat dimatikan (`removeGrids`, bukan hanya transparan).

### Bayangan statis
- Tombol ikon lapisan di toolbar (juga di layar penuh) menyimpan koefisien grafik saat ini sebagai garis putus-putus berwarna yang tidak ikut berubah, dengan titik puncak kecil.
- Maks. 4 (`MAX_SHADOWS`), tiap bayangan punya warna sendiri (`SHADOW_COLORS`); kalau penuh, tombol nonaktif.
- Panel "Bayangan" hanya berisi tombol Buat/Hapus semua dan daftar rumus (hapus satu), tanpa teks penjelasan. Membuat bayangan otomatis menyalakan tampilan bayangan.

### Pengaturan tampilan (panel tersembunyi di toolbar)
- Saklar: Grid, Sumbu, Angka sumbu, Garis simetri, Titik, Nama titik, Koordinat titik, Bayangan. Angka sumbu bergantung pada Sumbu; Nama dan Koordinat titik bergantung pada Titik (otomatis nonaktif).
- Ukuran titik dan tebal grafik (tombol −/+), dan tombol kembalikan pengaturan awal.
- Semua nilai awal ada di `VIEW_DEFAULTS` (`config.js`). Panel bergulir sendiri (vertikal) bila tinggi layar kecil dan menutup saat klik di luar atau `Esc`.
- **Tidak boleh ada geser kiri-kanan.** Lebar panel `min(344px, 100vw − 90px)`, `overflow-x: hidden`; teks saklar boleh turun ke baris kedua (`white-space: normal`), bukan dipaksa satu baris. Saklar baru harus tetap muat di layar 360px.

### Berbagi parameter (guru → siswa)
- Satu-satunya tombol bagikan: ikon tiga titik terhubung di kanan atas header. Mengkliknya menyalin tautan `<halaman>#d=<kode>` dan menampilkan toast "Tautan disalin". Bila clipboard tidak tersedia, tautan ditampilkan lewat `prompt` agar bisa disalin manual. Tidak ada bagian berbagi di panel.
- Yang disimpan: mode aktif, parameter **ketiga** bentuk, langkah, pengaturan tampilan (hanya yang berbeda dari bawaan), bayangan (koefisien a, b, c; warna ditentukan ulang menurut urutan), dan area pandang grafik (hasil geser/zoom).
- Memakai **hash** (bukan query) agar tidak dikirim ke server; cocok untuk hosting statis tanpa konfigurasi.
- Kode berupa JSON ringkas berversi (`v: 1`) dalam base64url. Panjang tautan sekitar 200–400 karakter.
- Saat dibuka, halaman memulai dari state tersebut dan menampilkan catatan singkat "Dibuka dari tautan yang dibagikan" dengan tombol **Mulai dari awal** (reset semua + hapus hash). Menempel tautan lain di tab yang sama (`hashchange`) juga menerapkan state-nya.
- **Keamanan**: `decodeState` tidak pernah memercayai isi tautan. Semua nilai dibatasi ke `LIM`/`VIEW_LIMITS`, tipe diperiksa, jumlah bayangan dibatasi `MAX_SHADOWS`, area pandang diperiksa wajar; kode rusak atau versi tidak dikenal menghasilkan `null` dan simulasi memakai nilai awal.
- Bila skema state berubah secara tidak kompatibel, naikkan `VERSION` di `share.js`; tautan lama akan diabaikan dengan aman.
- Tautan hanya berguna setelah situs di-host; lewat `file://` hanya bisa dibuka di komputer yang sama.

### Ringkasan matematis
- Panel "Sifat grafik": titik puncak, sumbu simetri, nilai minimum/maksimum, arah, titik potong y, diskriminan, akar. Untuk `a = 0`: bentuk, arah, gradien, titik potong y dan x.
- Daftar ketiga bentuk dalam LaTeX, dengan `≈` bila akar dibulatkan.

## Catatan teknis dan jebakan

- **Selektor CSS jangan terlalu umum di dalam wadah berisi rumus.** KaTeX memakai banyak `<span>` bersarang yang ukurannya relatif (em); aturan seperti `.forms span { font-size: ... }` merusak ukuran pangkat/indeks. Pakai kelas atau combinator anak (`.forms li > span`), dan jangan memberi `font-size`/`color` tetap pada elemen yang membungkus `<Tex>` kecuali di wadahnya saja. Ukuran rumus diatur lewat `.katex { font-size: 1.1em }` dan penyesuaian per konteks (`.sym .katex`).
- **Rumus**: tulis sebagai string LaTeX di `math.js` (`tx` untuk angka, bukan `fmt`). Validasi string baru dengan `katex.renderToString(s, { throwOnError: true })` di Node.
- **Sumbu dan grid dibuat ulang** saat pengaturan berubah (bukan sekadar disembunyikan); bayangan juga dibuat ulang saat daftar/pengaturan berubah. Selalu bungkus pembersihan dengan `try/catch`.
- **Label titik** diubah lewat `point.label.setText(...)`, bukan `setAttribute({ name })`.
- **StrictMode** menjalankan efek dua kali di mode dev; papan JSXGraph dibuat di efek pertama dan dilepas di cleanup (`freeBoard`).
- **Pengujian**: belum ada tes otomatis. Logika murni (`math.js`, `share.js`, `config.js`) bisa diuji langsung dengan Node; sintaks JSX bisa dicek dengan `esbuild`. Tampilan dan interaksi (JSXGraph, layar penuh, ponsel) harus dicek manual di peramban.

## Token desain

```
--bg #faf9f5   --surface #fff   --sunken #f0eee6   --line #e5e2d6
--text #29261b --muted #73726c  --accent #c6613f   --accent-soft #f5e4dc
Warna grafik: kurva #c6613f, puncak #3d3929, akar #4a7ba6, titik y #5b8a5f
Bayangan: #7c8798 #a0638f #b08a2e #3b9a9f
```

Radius: kartu 14–16px, kontrol 10–12px. Toast: latar `--text`, teks putih, muncul 2,4 detik di bawah tengah. Pada tampilan gelap/tema lain, ubah lewat variabel di `:root` saja.

## Menambah materi/simulasi baru

1. Salin pola berkas di atas; buat `math.js` baru (fungsi turunan murni, batas nilai, bentuk LaTeX) dan uji dengan Node tanpa React.
2. Pakai ulang `Tex.jsx`, `GraphTools.jsx` (toolbar, pengaturan, layar penuh), dan gaya di `styles.css`; sesuaikan `VIEW_DEFAULTS` dan daftar saklar bila objeknya berbeda.
3. Di `Graph.jsx`: buat papan sekali, simpan objek di `useRef`, sinkronkan lewat `useEffect` terpisah per hal (titik, grid, sumbu, bayangan). Bungkus pembersihan objek JSXGraph dengan `try/catch` karena papan bisa sudah dilepas (StrictMode).
4. Ganti judul kanan di header dan `<title>`; brand **Anthromath** tetap.
5. **Berbagi**: sesuaikan `share.js` dengan state simulasi baru (parameter, batas dari `LIM`, daftar mode). Pertahankan pola: encode hanya nilai yang perlu, decode selalu divalidasi dan dibatasi, uji bolak-balik dan kode rusak dengan Node (tanpa React). Pastikan tombol bagikan di header, catatan "Dibuka dari tautan", dan `resetAll` tetap ada.
6. Periksa di tiga ukuran: ponsel portrait, ponsel lanskap (tinggi ±360px), dan desktop; periksa juga layar penuh, kasus nilai ekstrem/khusus, dan pembukaan lewat tautan berbagi (termasuk tautan rusak).
7. Semua teks antarmuka berbahasa Indonesia; rumus lewat `<Tex>`; desimal dengan titik.

## Perintah

```
npm install
npm run dev       # pengembangan
npm run build     # produksi ke dist/
```

## Skala grafik 1:1 (semua simulasi)

Satuan x dan y selalu sama sehingga kotak grid persegi (penting untuk geometri dan parabola yang tidak boleh melar). Saat ukuran papan berubah (layar penuh, rotasi, jendela) **panjang satuan tetap**; yang bertambah atau berkurang adalah area yang terlihat, dengan pusat dipertahankan. Jangan memakai `resizeContainer(w, h)` polos dan jangan menyalakan `resize.enabled` bawaan JSXGraph: keduanya menyesuaikan ulang area pandang dan mengubah skala. Gunakan pola `resizeContainer(w, h, true, …, true)` + `setBoundingBox` dari pusat dan `board.unitX`. Pinch tidak boleh menskala satu sumbu saja (`pinchHorizontal/Vertical: false`).

## Struktur multi-simulasi dan katalog

Satu proyek Vite dengan **satu halaman HTML per simulasi** (hosting statis, tanpa router), sehingga hash tautan bagikan `#d=…` tidak bentrok antarsimulasi.

| Jalur | Isi |
|---|---|
| `index.html` → `src/landing/` | Katalog. `catalog.js` berisi daftar simulasi, `Landing.jsx` kartu + pencarian + filter mata pelajaran |
| `kuadrat/index.html` → `src/kuadrat/` | Simulasi Fungsi Kuadrat |
| `transformasi/index.html` → `src/transformasi/` | Simulasi Transformasi Geometri |
| `grafik/index.html` → `src/grafik/` | Penggambar grafik persamaan LaTeX (mode parameter, titik penting). **Tidak ada di katalog**; entri tetap dibangun |
| `src/shared/` | `Tex.jsx`, `NumBox.jsx` (dipakai lintas simulasi) |

- Brand **Anthromath** di header setiap simulasi adalah tautan ke katalog (`../`). `vite.config.js` memakai `base: './'` agar bisa di-host di subfolder.
- **Menambah simulasi baru**: (1) buat `src/<id>/` dengan pola yang sama (logika murni, Graph, App, share, styles) dan `<id>/index.html` yang memuat `/src/<id>/main.jsx`; (2) tambahkan entri di `input` pada `vite.config.js`; (3) tambahkan satu objek di `src/landing/catalog.js` (`id, href, title, subject, level, desc, tags`) dan, bila perlu, ilustrasi di `Thumb` (`Landing.jsx`). Mata pelajaran baru otomatis menjadi filter bila ada lebih dari satu.
- Setiap simulasi punya `styles.css` sendiri; token desain sama (lihat di atas).

## Simulasi: Transformasi Geometri (`src/transformasi/`)

- **Logika murni** di `geo.js`: `applyStep(step, x, y, u)` (u 0–1 untuk animasi), `chainTo` (bayangan setelah j langkah pada kemajuan t), `rule` (aturan pemetaan LaTeX), `makeExtra` (objek JSXGraph). Empat jenis langkah: `translate {dx,dy}`, `reflect {axis,v}` (sumbu x/y, y=x, y=−x, x=h, y=k), `rotate {cx,cy,deg}` (positif = berlawanan arah jarum jam), `dilate {cx,cy,k}`.
- **State**: `geo = { pts: [{x,y}] (maks. 8), steps: [...] (maks. 6) }`, `trace`, `view`. Transformasi dirangkai berurutan; bayangan ke-j (A′, A″, …) berwarna sendiri.
- **Titik asal** bisa digeser di grafik (snap 0,5); bayangan mengikuti langsung karena koordinatnya fungsi dari titik asal. State disimpan saat lepas (`up`), bukan saat drag. **Ketuk grafik untuk titik** menambah titik (diabaikan bila digeser/ketuk di atas titik lain).
- **Animasi**: kemajuan `t` (0…jumlah langkah) di `tRef`, bukan state, agar papan tidak dibuat ulang tiap frame; `usePlayer` menggerakkan `t` lalu `board.update()`. Slider kemajuan untuk menjeda di titik mana pun. **Jejak** memakai atribut `trace` pada titik bayangan dan `clearTraces()` saat memulai ulang.
- **Layar penuh**: kartu mengambang berisi aturan tiap langkah, tombol putar, jejak, dan slider (komponen `Player`).
- **Berbagi**: `share.js` (`v: 1`) menyimpan titik, langkah, jejak, tampilan, dan area pandang; `decodeState` membatasi semua nilai dan membuang langkah tak dikenal.
- Jebakan: `makeExtra` mengembalikan fungsi pembersih yang menghapus objek berurutan terbalik dan memanggil `clearTraces()`; bungkus dengan `try/catch` (StrictMode).
