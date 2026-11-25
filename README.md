# Finwise

Finwise adalah aplikasi browser untuk simulasi keuangan pribadi, kemampuan cicilan, biaya pembiayaan, dana darurat, dan perbandingan opsi kredit. Seluruh data disimpan lokal di browser.

## Menjalankan aplikasi

Tidak ada instalasi, bundler, backend, atau database.

```powershell
python -m http.server 8000
```

Buka `http://localhost:8000` di browser. Alternatifnya, buka `index.html` langsung, tetapi server lokal direkomendasikan untuk perilaku modul JavaScript yang konsisten.

## Menguji kalkulasi

Node.js diperlukan hanya untuk menjalankan pengujian kalkulasi.

```powershell
npm test
```

Pengujian mencakup:

- Cicilan 0% dengan uang muka.
- Bunga flat 2% per bulan.
- Kemampuan cicilan berdasarkan batas penghasilan dan sisa uang.
- Debt-to-income ratio.
- Anuitas 0%.
- Input tidak valid, Pindar berbunga harian, jadwal amortisasi, dan dana darurat.

## Modul

- Ringkasan arus kas dan visualisasi pengeluaran.
- Kalkulator kemampuan cicilan dengan DTI dan disposable income.
- Simulasi PayLater, kartu kredit, Pindar, DANA CICIL/sejenis, KTA, dan multifinance.
- Jadwal amortisasi, unduh CSV, ringkasan unduhan, dan cetak laporan.
- Perbandingan maksimal lima opsi pembiayaan.
- Perencana dana darurat dan pusat edukasi finansial.
- Riwayat simulasi yang tersimpan di LocalStorage perangkat.

## Catatan penting

Seluruh hasil kalkulasi merupakan simulasi edukatif berdasarkan informasi yang dimasukkan pengguna. Hasil bukan penawaran pembiayaan, keputusan persetujuan kredit, ataupun nasihat keuangan profesional. Biaya, bunga, denda, metode pembayaran, dan syarat produk sebenarnya mengikuti perjanjian resmi penyedia.

Rasio cicilan 10-15% adalah panduan konservatif Finwise, bukan ketentuan resmi OJK. Gunakan sumber resmi sebelum mengambil keputusan:

- https://www.ojk.go.id/
- https://find.ojk.go.id/
- https://www.bi.go.id/
- https://idebku.ojk.go.id/
