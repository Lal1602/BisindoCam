# Atribusi data & model

Proyek ini non-komersial. Model pengenal isyarat dilatih dari dataset publik di bawah ini. Terima kasih kepada para penyusun dataset dan para penutur BISINDO yang merekam isyaratnya.

## Dataset kata (isyarat dinamis)

| Dataset | Sumber | Lisensi | Isi |
|---|---|---|---|
| Dataset Bisindo 40 Kata 5 Subjek | Kaggle `aridone/dataset-bisindo-40-kata-5-subjek` | tidak dicantumkan pengunggah | 40 kata, 5 peraga, ±10.000 video |
| WL-BISINDO — *Word-Level BISINDO: A Novel Video Indonesian Sign Language Dataset and Baseline Methods* (Procedia Computer Science, 2025) | [GitHub](https://github.com/AceKinnn/WL-BISINDO) · Kaggle `glennleonali/wl-bisindo` | CC BY-NC 4.0 | 32 kata, 5 peraga dari Banten, 1.600 video |

## Dataset huruf (isyarat statis)

| Dataset | Sumber | Lisensi |
|---|---|---|
| Bahasa Isyarat Indonesia (BISINDO) Alphabets | Kaggle `achmadnoer/alfabet-bisindo` | tidak dicantumkan pengunggah |
| bisindo dataset | Kaggle `yunitayupratiwi/bisindo-dataset` | tidak dicantumkan pengunggah |
| BISINDO Dataset — MediaPipe Hand Landmarks | Kaggle `suryaadji/bisindo-alphabet-mediapipe-hand-landmarks` | lihat halaman dataset |

Dataset landmark di atas tidak menyimpan arah gambar maupun urutan tangan. Konvensinya (gambar tercermin, tangan paling kiri = tangan kanan peraga) ditentukan dengan `ml/scripts/calibrate_surya.py` pada 20% data.

Dicoba tetapi tidak dipakai: versi publik *BISINDO Indonesian Sign Language: Alphabet Image Data* (Mendeley `ywnjpbcz8m`, CC BY 4.0) yang berukuran kecil berupa gambar biner hitam-putih, sehingga titik tangan tidak dapat dideteksi.

## Model pihak ketiga

- MediaPipe Hand Landmarker & Pose Landmarker (Google) — Apache 2.0.

## Catatan penggunaan

- Karena WL-BISINDO berlisensi **NonCommercial**, model yang dilatih dengannya hanya dipakai untuk keperluan non-komersial (portofolio, edukasi).
- Dataset yang tidak mencantumkan lisensi dipakai dengan itikad baik untuk tujuan non-komersial, dengan atribusi penuh. Bila pemilik keberatan, data tersebut akan dikeluarkan dan model dilatih ulang.
- BISINDO memiliki variasi daerah. Data latih berasal dari sejumlah kecil penutur, sehingga isyarat dari daerah lain bisa dikenali dengan akurasi lebih rendah.
