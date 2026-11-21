# Laporan Proyek TixWar

**Tanggal:** 21 November 2026
**Status:** Rilis awal, web dan API sudah merge ke main

---

## 1. Pendahuluan

### 1.1 Latar belakang

TixWar adalah aplikasi flash sale tiket. Gagasannya berangkat dari satu persoalan yang muncul di setiap penjualan tiket dengan permintaan tinggi, yaitu stok yang terbatas harus dibagikan secara adil ketika ribuan orang menekan tombol beli pada saat yang bersamaan. Jika stok tidak dijaga dengan benar, tiket yang sama bisa terjual dua kali, dan pembeli yang datang belakangan justru mendapat kepastian yang keliru.

Proyek ini dibangun sebagai sistem utuh, bukan sekadar halaman web. Ada aplikasi web yang dipakai pembeli, ada API yang mengatur pesanan dan pembayaran, ada worker yang menagih gateway di latar belakang, serta ada lapisan observability yang merekam apa yang terjadi di setiap tahap. Semua bagian itu dirancang supaya saling melengkapi, dan laporan ini mencatat hasil kerjanya sampai tanggal 21 November 2026.

### 1.2 Tujuan

Laporan ini disusun untuk tiga keperluan. Pertama, menjelaskan bagaimana sistem TixWar bekerja, dari arsitektur sampai alur pembelian. Kedua, mencatat fitur yang sudah selesai beserta bukti pengujiannya. Ketiga, menyampaikan secara jujur apa saja keterbatasan yang masih ada dan apa yang direncanakan sesudahnya.

Pembaca yang dituju adalah pengembang yang akan melanjutkan proyek ini, penguji yang perlu memahami perilakunya, serta siapa pun yang menilai hasil kerja tim. Karena itu laporan ini memakai istilah teknis dalam bahasa Inggris apa adanya, seperti flash sale, outbox, circuit breaker, dan idempotency key, supaya pembaca dapat mencocokkannya langsung dengan kode dan dokumentasi API.

---

## 2. Gambaran Sistem

TixWar terdiri dari dua aplikasi utama yang berjalan terpisah. Aplikasi web adalah antarmuka pembeli dan admin, dibangun dengan Vite dan React. API adalah layanan yang mengatur event, pesanan, pembayaran, tiket, dan kunci API, dibangun dengan Bun dan Express. Keduanya berkomunikasi lewat HTTP dan JSON.

Di balik API terdapat MongoDB sebagai penyimpan data utama, Redis sebagai gerbang stok atomik dan cache, serta BullMQ sebagai antrean pekerjaan latar belakang. Pembayaran tidak diproses langsung di dalam permintaan HTTP, melainkan diantrekan dan ditagih oleh worker ke sebuah mock-gateway. Tiket yang sudah lunas diterbitkan beserta kode QR, lalu disimpan sebagai objek di layanan object storage.

Data awal sistem berisi 20 event, tiga tier pada setiap event, dan 5000 user. Uang dicatat sebagai integer rupiah, dan waktu dicatat dalam format ISO 8601 UTC. Aturan ini dipakai konsisten di seluruh API supaya tidak ada tafsir ganda soal nilai dan waktu.

Sistem ini dipakai oleh tiga peran. Guest dapat menjelajah event tanpa masuk. User yang sudah masuk dapat membeli, membayar, melihat tiket, dan mengelola API key. Admin dapat memantau sistem lewat halaman debug, tetapi tidak dapat membeli tiket. Pemisahan peran ini disengaja, supaya akun admin tidak ikut berebut stok dengan pembeli.

URL publik yang sedang live adalah web di http://bore.pub:54812 dan API di http://bore.pub:50430.

---

## 3. Arsitektur

### 3.1 Arsitektur web

Aplikasi web memakai TanStack Router untuk routing dan TanStack Query untuk pengambilan data. Pilihan ini membuat status loading, cache, dan refetch ditangani secara seragam di semua halaman. Komponen antarmuka memakai Tailwind CSS v4 dan shadcn/ui, dengan tema bernama Sera dan font Plus Jakarta Sans yang di-host sendiri.

Gambar 1 menunjukkan susunan lapisan aplikasi web, dari rute dan halaman sampai ke layanan dan API.

![Arsitektur web TixWar](tixwar-web-architecture.png)

**Gambar 1.** Arsitektur aplikasi web TixWar.

Halaman utama adalah daftar event di `/events`, yang memakai infinite scroll dengan 12 event per halaman. Halaman detail event menampilkan tier dan harga, sedangkan halaman pesanan dan tiket menampilkan status yang terus diperbarui. Halaman debug hanya dapat dibuka oleh admin, dan halaman pengaturan memuat preferensi akun termasuk pemutaran ulang onboarding tour.

### 3.2 Arsitektur API

API disusun sebagai modular monolith dengan tiga proses. Proses API di `src/server.ts` melayani permintaan HTTP. Proses worker di `src/worker.ts` memproses pekerjaan pembayaran dari antrean. Proses outbox publisher di `src/outbox-publisher.ts` mengambil event dari outbox dan memasukkannya ke antrean BullMQ. Di samping ketiganya berjalan mock-gateway, yaitu layanan tiruan yang menerima tagihan pembayaran.

Gambar 2 menunjukkan susunan proses API dan layanan pendukungnya.

![Arsitektur API TixWar](tixwar-api-architecture.png)

**Gambar 2.** Arsitektur API TixWar.

MongoDB berjalan dalam mode sharded lewat mongos, dan Redis dipakai untuk dua keperluan yang berbeda. Pertama, Redis menjadi gerbang stok atomik lewat skrip Lua pada key `stock:{tierId}`. Kedua, Redis menjadi cache untuk daftar event, dengan pembedaan antara cache cold dan cache warm yang diukur pada pengujian beban. Outbox pattern dipakai supaya pencatatan pesanan dan pencatatan event terjadi dalam satu transaksi yang sama, sehingga tidak ada pesanan yang tercatat tanpa event, dan tidak ada event yang tercatat tanpa pesanan.

### 3.3 Mengapa pemisahan proses ini dipilih

Pemisahan tiga proses membuat kegagalan di satu tempat tidak langsung menjatuhkan tempat lain. Jika worker berhenti, API tetap dapat menerima pesanan dan mencatatnya ke outbox, lalu pekerjaan itu diproses setelah worker hidup kembali. Jika mock-gateway lambat, circuit breaker membatasi panggilan yang diteruskan, sehingga antrean tidak menumpuk tanpa batas. Pemisahan ini juga membuat setiap proses dapat diuji dan dijalankan sendiri, baik secara native di VM maupun di dalam container.

---

## 4. Teknologi dan Stack

### 4.1 Web

Aplikasi web memakai Vite dengan React 19 dan TypeScript strict. Routing dan pengambilan data memakai TanStack Router dan TanStack Query. Tampilan memakai Tailwind CSS v4 dan shadcn/ui, dengan Biome sebagai linter dan formatter, serta Bun sebagai runtime dan package manager. Font Plus Jakarta Sans di-host sendiri dalam bentuk variable font, sehingga tidak ada ketergantungan pada CDN font.

### 4.2 API

API memakai Bun dengan TypeScript strict dan Express 5. Basis data memakai MongoDB 7 dalam mode sharded lewat mongos. Redis 7 dipakai untuk gerbang stok atomik dan cache. BullMQ mengatur antrean pekerjaan, dan pemrosesan pembayaran berjalan secara asinkron lewat worker. Pengujian API memakai 106 unit test, dan semuanya lolos di main.

### 4.3 Observability dan pendukung

Prometheus mengumpulkan metrik, Grafana menampilkannya, Loki dan Promtail mengumpulkan log, Jaeger menerima trace lewat OTLP, mongodb-exporter mengekspor metrik basis data, dan Alertmanager mengatur peringatan. Mailpit menampung email seperti tautan reset password, sedangkan object storage memakai s3rver pada stack native di VM dan s3mock pada compose. Seluruh layanan pendukung ini dicatat pada Bab 7.

### 4.4 Spesifikasi minimum

Angka pada tabel berikut adalah perkiraan kebutuhan, bukan hasil pengukuran beban pada mesin tertentu.

| Komponen | Cara jalan | vCPU | Memori | Disk |
|---|---|---|---|---|
| API | Docker atau Podman | 4 | 8 GB | 20 GB |
| API | Native | 2 | 4 GB | 10 GB |
| Web | Semua cara jalan | 1 | 1 GB | 2 GB |

Stack lengkap pada Docker compose berisi 28 service, yaitu 25 service ditambah 3 service untuk high availability. Pada Podman jumlahnya 27 service, karena promtail tidak ikut dijalankan.

---

## 5. Fitur Utama

### 5.1 Peran dan akses

Tiga peran berlaku di seluruh sistem. Guest menjelajah event dan melihat detailnya. User yang masuk dapat membeli tiket, membayar, melihat pesanan dan tiketnya, serta mengelola API key. Admin bersifat view-only pada pesanan dan tiket, sehingga tidak ada tombol beli pada halaman detail event ketika dibuka oleh admin, dan rute pesanan serta tiket dijaga supaya admin dialihkan. Admin justru mendapat halaman debug dengan load generator, chaos injection, dan live trace feed.

### 5.2 Event dan infinite scroll

Halaman `/events` terbuka untuk publik dan memuat pencarian, filter kategori, dan pengurutan. Pencarian berjalan realtime dengan debounce 300 ms, sehingga permintaan tidak dikirim pada setiap ketikan. Pengurutan dilakukan di sisi server dengan pilihan ending, date, price-asc, dan price-desc. Daftar memakai infinite scroll dengan 12 event per halaman, dan data halaman sebelumnya dipertahankan selama refetch supaya tampilan tidak berkedip kembali ke skeleton.

### 5.3 Pesanan dan pembayaran

Pembeli membuat pesanan lewat POST `/v1/orders`. Stok dijaga oleh skrip Lua di Redis sebelum pesanan ditulis ke MongoDB, sehingga perebutan stok pada tier yang sama diputuskan secara atomik. Setelah pesanan tercatat beserta event outbox-nya, pembeli membayar lewat POST `/v1/pay`. Permintaan bayar hanya mengembalikan 202 QUEUED, dan penagihan ke gateway dilakukan oleh worker. Hasil pembayaran lalu mengubah status pesanan, dan tiket diterbitkan setelah pembayaran lunas.

Setiap mutasi pesanan dan pembayaran wajib membawa header Idempotency-Key. Kunci ini membuat pengiriman ulang yang tidak disengaja tidak menimbulkan tagihan ganda. Di sisi web, tombol bayar juga dinonaktifkan selama permintaan antre, sehingga klik ganda tidak mengirim dua permintaan.

### 5.4 Tiket dan kode QR

Setelah pesanan lunas, tiket diterbitkan beserta kode QR dan disimpan sebagai objek di layanan object storage. Halaman tiket menampilkan QR dan menyediakan tombol unduh. Satu hal yang perlu dicatat, payload QR berbentuk SVG meskipun nama objeknya berakhiran `.png`. Perilaku ini sudah diketahui dan dicatat di sini supaya tidak membingungkan pengembang berikutnya.

### 5.5 API keys

User dapat membuat API key dari halaman `/api-keys`, dengan masa kedaluwarsa opsional 7, 30, atau 90 hari. Kunci hanya ditampilkan sekali saat dibuat, dan halaman mengunci tombol dismiss sampai kunci disalin. Daftar kunci menampilkan kapan terakhir dipakai, dan setiap kunci dapat dicabut. Rute ini tersedia untuk user biasa, bukan hanya admin.

### 5.6 Debug, load test, dan chaos

Halaman `/debug/stream` hanya untuk admin. Di dalamnya ada load generator untuk menguji beban pada event atau tier tertentu, chaos injection untuk menyuntikkan kegagalan, serta live trace feed yang menampilkan trace dari pekerjaan worker. Trace stream hanya terisi saat ada job worker yang berjalan. Browsing biasa tidak menghasilkan trace, dan hal ini memang sesuai rancangan.

### 5.7 Onboarding tour

Kunjungan pertama ke `/events` menampilkan onboarding tour lima langkah yang memperkenalkan pencarian, kategori, sort dan filter, kartu event, serta bottom bar. Tour memakai spotlight dan box sambutan, berjalan otomatis untuk guest dan user non-admin, dan dapat diputar ulang dari Settings. Judul tab berubah mengikuti halaman yang dibuka, dan perpindahan tema memakai animasi circular wipe selama 500 ms.

### 5.8 Remember me dan kata sandi

Halaman login menyediakan checkbox Remember me yang secara default tercentang. Access token berlaku 15 menit, sedangkan refresh token berlaku 7 hari dengan rotasi dan deteksi reuse. Jika Remember me dicentang, sesi disimpan di localStorage. Jika tidak, sesi disimpan di sessionStorage dan berakhir saat tab ditutup. Alur lupa kata sandi memakai token sha256 dengan masa kedaluwarsa 1 jam dan sekali pakai, dan halaman forgot password serta reset password sudah tersedia lengkap.

### 5.9 Rute web

Daftar rute web adalah sebagai berikut. Rute `/` mengarahkan ke `/events`. Rute `/events` menampilkan daftar event, dan `/events/$eventId` menampilkan detail satu event. Rute `/login` dan `/register` mengatur masuk dan daftar. Rute `/orders` dan `/orders/$orderId` menampilkan daftar pesanan dan detail pesanan dengan countdown, tombol bayar, ulangi, dan batal, serta live status stream. Rute `/tickets` dan `/tickets/$ticketId` menampilkan daftar tiket dan detail tiket. Rute `/api-keys` mengelola kunci API. Rute `/debug/stream` khusus admin. Rute `/forgot-password`, `/reset-password`, dan `/settings` melengkapi akun dan preferensi.

---

## 6. Alur Utama

### 6.1 Mencari event

Pengunjung membuka `/events`, lalu mengetik kata kunci atau memilih kategori dan urutan. Pencarian memakai debounce 300 ms dan pengurutan di sisi server, kemudian daftar dimuat 12 event per halaman lewat infinite scroll. Detail event menampilkan tier, harga, dan sisa stok per tier.

### 6.2 Membeli tiket

Pembeli yang sudah masuk memilih tier lalu membuat pesanan. API menjalankan skrip Lua di Redis untuk mengambil stok secara atomik. Jika stok tersedia, pesanan dan event `order.created` ditulis ke MongoDB dalam satu transaksi. Jika stok habis, pesanan ditolak dan stok yang tampil dihitung dari data API, bukan dari angka yang disimpan di sisi web.

### 6.3 Membayar secara asinkron

Pembeli menekan tombol bayar dan API mengembalikan 202 QUEUED. Outbox publisher mengambil event `payment.requested` lalu memasukkannya ke BullMQ dengan jobId deterministik. Worker mengambil job itu dan menagih mock-gateway lewat circuit breaker. Jika gateway menjawab lunas, pesanan berubah menjadi `order.paid`. Seluruh proses ini dapat diikuti lewat live status stream di halaman detail pesanan.

### 6.4 Tiket terbit

Setelah pembayaran lunas, tiket beserta kode QR diterbitkan dan disimpan di object storage, lalu pesanan berubah menjadi `order.confirmed`. Pembeli membuka halaman tiket, melihat QR, dan dapat mengunduhnya. Alur lengkap dari pembuatan pesanan sampai konfirmasi ditunjukkan pada Gambar 3.

![Alur order TixWar](tixwar-api-architecture-order-flow.png)

**Gambar 3.** Alur order dari pembuatan pesanan sampai tiket terbit.

---

## 7. Observability dan Operasi

Prometheus mengumpulkan metrik dari API dan layanan pendukung, lalu Grafana menampilkan metrik itu dalam dashboard. Log aplikasi dikumpulkan oleh Promtail dan disimpan di Loki, sehingga pencarian log dapat dilakukan berdasarkan label dan rentang waktu. Trace dikirim ke Jaeger lewat OTLP, dan mongodb-exporter menyediakan metrik basis data untuk Prometheus. Alertmanager mengatur rute peringatan ketika ada kondisi yang perlu ditindaklanjuti.

Email keluar, termasuk tautan reset password, ditampung oleh Mailpit, sehingga pengujian alur email dapat dilakukan tanpa mengirim ke alamat sungguhan. Object storage pada stack native memakai s3rver, sedangkan pada compose memakai s3mock.

Operasi harian berjalan pada stack native di VM, karena full docker compose tidak dapat berjalan di VM ini. Penyebabnya dicatat pada Bab 10. Stack native tetap memakai layanan yang sama, yaitu API, worker, outbox publisher, mock-gateway, MongoDB, Redis, MinIO atau s3rver, serta layanan observability. URL live yang dipakai saat ini adalah web di http://bore.pub:54812 dan API di http://bore.pub:50430.

---

## 8. Pengujian dan Verifikasi

### 8.1 Pengujian API

API memiliki 106 unit test, dan semuanya lolos di main. OpenAPI mendokumentasikan 26 path dan 39 schema pada `docs/openapi.json`. Setiap perubahan melewati gate lint, typecheck, dan build pada web sebelum commit, dan gate itu harus hijau sebelum commit diteruskan.

### 8.2 Load test k6

Load test dijalankan dengan k6 dalam lima skenario, yaitu smoke, browse, war, abuse, dan soak. Hasil nyatanya tersimpan di `docs/benchmarks/`. Skenario browse memakai 50 VU dengan p95 di bawah 300 ms. Skenario war memakai 300 VU untuk memperebutkan 100 tiket. Skenario abuse menguji rate limit, sedangkan skenario cache membandingkan kondisi cold dan warm.

### 8.3 Kritik Impeccable ronde 2

Seluruh halaman dinilai Acceptable pada kritik Impeccable ronde 2, tanpa temuan P0. Skor tiap halaman tercantum pada tabel berikut.

| Halaman | Skor |
|---|---|
| / | 26/40 |
| /events | 24/36 |
| Detail event | 25/40 |
| /orders | 22/40 |
| Detail order | 21/40 |
| /tickets | 23/36 |
| Detail tiket | 27/40 |
| /api-keys | 26/40 |
| /settings | 24/40 |
| /debug/stream | 23/40 |
| /login | 24/40 |
| /register | 24/40 |
| /forgot-password | 27/40 |
| /reset-password | 22/40 |

Skor tertinggi ada pada halaman detail tiket dan forgot password, masing-masing 27/40, sedangkan skor terendah ada pada halaman detail order, yaitu 21/40. Temuan yang tersisa pada ronde ini bersifat perbaikan tampilan dan kejelasan, bukan cacat yang menghentikan pemakaian.

### 8.4 Batasan verifikasi

Verifikasi visual tidak dilakukan dengan browser asli, karena VM ini tidak menyediakan browser asli. Pemeriksaan tampilan dilakukan dari kode dan hasil render, bukan dari klik nyata di browser. Pengukuran CLS juga berasal dari cara yang sama. Laporan ini menulis batasan itu secara terbuka supaya pembaca tidak mengira pengujiannya memakai klik nyata.

---

## 9. Status Rilis

Semua pekerjaan berikut sudah merge ke main. Tidak ada PR yang masih menggantung pada daftar ini.

### 9.1 Web

| PR | Isi |
|---|---|
| Web PR #4 | Migrasi shadcn, 100 commit |
| Web PR #5 | Diagram |

Main web berada pada commit 381c1cb.

### 9.2 API

| PR | Isi |
|---|---|
| API PR #7 | Harga tier pada daftar event |
| API PR #8 | Urgency |
| API PR #9 | Sisa stok per tier, forgot dan reset password |
| API PR #10 | Masa kedaluwarsa API key |
| API PR #11 | lastUsedAt, GET /debug/chaos, sort server-side |
| API PR #12 | Kredensial admin |
| API PR #13 | Podman |
| API PR #14 | Diagram |

Main API berada pada commit cc30038.

Akun demo admin dan user tersedia untuk pengujian. Kata sandinya tidak ditulis di laporan ini.

---

## 10. Keterbatasan dan Rencana Lanjut

Empat keterbatasan perlu dicatat secara jujur. Pertama, tidak ada browser asli di VM, sehingga verifikasi visual dan pengukuran CLS dilakukan dari kode dan render, bukan klik nyata. Kedua, full docker compose tidak dapat jalan di VM ini, karena seccomp memblokir setns dan container tidak mendapat CAP_NET_ADMIN. Stack live karena itu berjalan native, dan compose tetap tersedia untuk mesin yang mendukungnya. Ketiga, Jaeger sudah menerima span, tetapi belum ada span aplikasi yang masuk, karena instrumentasi OTEL pada Bun membutuhkan span manual yang belum ditulis. Keempat, trace stream hanya terisi saat ada job worker, sehingga halaman debug tampak kosong ketika tidak ada pekerjaan yang berjalan.

Rencana lanjut yang paling dekat adalah menulis span manual untuk instrumentasi OTEL supaya Jaeger menampilkan trace aplikasi yang sebenarnya, lalu melakukan verifikasi visual dengan browser asli ketika tersedia. Sesudah itu, deck dan dokumen pendukung dapat diselaraskan kembali dengan perubahan terakhir pada web dan API.

---

## 11. Penutup

TixWar sudah berjalan sebagai sistem yang utuh, dari web dan API sampai worker, pembayaran asinkron, tiket berkode QR, dan lapisan observability. Semua PR pada daftar rilis sudah merge ke main, pengujian API lolos, dan kritik Impeccable ronde 2 tidak menemukan temuan P0. Keterbatasan yang ada sudah dicatat pada Bab 10, beserta rencana untuk menanganinya. Laporan ini disusun pada 21 November 2026 sebagai catatan rilis awal, dan dapat dipakai sebagai acuan untuk pekerjaan berikutnya.
