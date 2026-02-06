Dokumen ini menjelaskan arsitektur **Retrieval-Augmented Generation (RAG)** yang akan digunakan pada RAPI.

Dokumen bersifat **teknis dan sistem-oriented**, tanpa konteks psikologis, tanpa implementasi kode, dan berfokus pada **alur data, komponen, serta tanggung jawab sistem**.

---

## 1. Tujuan RAG dalam RAPI

RAG digunakan untuk:

- Menyediakan **jawaban berbasis sumber yang terkontrol**
- Mengurangi hallucination dari LLM
- Menjadikan AI bergantung pada **knowledge yang terkurasi**, bukan asumsi model
- Memisahkan **knowledge (data)** dari **reasoning (LLM)**

RAG **bukan pengganti LLM**, melainkan **penambah konteks**.

---

## 2. Prinsip Arsitektur RAG

Prinsip yang digunakan:

- **Backend-driven**: seluruh proses RAG dikontrol backend
- **Deterministic pipeline**: setiap langkah dapat diaudit
- **Source of truth jelas**: dokumen adalah referensi utama
- **Model-agnostic**: tidak tergantung satu LLM

Client tidak mengetahui:

- Cara retrieval
- Sumber dokumen
- Strategi embedding

---

## 3. High-Level RAG Architecture

Alur tingkat tinggi:

1. User mengirim pertanyaan
2. Backend memvalidasi konteks & intent
3. Backend menjalankan retrieval ke knowledge store
4. Dokumen relevan dipilih & diringkas
5. Konteks hasil retrieval digabung ke prompt
6. Prompt dikirim ke LLM
7. Response divalidasi dan dikirim ke client

LLM **tidak pernah** mengakses database atau vector store secara langsung.

---

## 4. Core RAG Components

### 4.1 Knowledge Source

Sumber data yang menjadi basis RAG.

Karakteristik:

- Bersifat statis atau semi-statis
- Dikurasi secara manual
- Memiliki struktur dan versi

Contoh kategori:

- Dokumentasi internal
- Panduan kebijakan
- Knowledge base produk
- Catatan teknis

---

### 4.2 Document Processing Pipeline

Bertanggung jawab mengubah dokumen mentah menjadi unit yang dapat diretrieval.

Tahapan konseptual:

- Normalisasi konten
- Chunking (pemecahan dokumen)
- Metadata enrichment
- Versioning

Pipeline ini berjalan **di luar request user** (offline / async).

---

### 4.3 Embedding & Vector Store

Fungsi:

- Mengubah dokumen menjadi representasi vektor
- Menyediakan pencarian berbasis kemiripan

Karakteristik:

- Hanya menyimpan representasi, bukan logika
- Tidak memiliki awareness terhadap user
- Bersifat read-heavy

Vector store adalah **storage**, bukan decision maker.

---

### 4.4 Retrieval Layer

Lapisan yang menentukan:

- Dokumen mana yang relevan
- Berapa jumlah dokumen yang diambil
- Strategi filtering berdasarkan metadata

Retrieval dilakukan **sebelum** LLM dipanggil.

---

### 4.5 Context Builder

Mengubah hasil retrieval menjadi konteks yang aman untuk LLM.

Tanggung jawab:

- Merangkum dokumen
- Menghilangkan redundansi
- Membatasi panjang konteks
- Menjaga struktur informasi

Output dari layer ini adalah **RAG Context Block**.

---

### 4.6 Prompt Integration Layer

Menggabungkan:

- System prompt
- User message
- RAG Context Block

RAG context **bersifat tambahan**, bukan pengganti prompt utama.

---

## 5. Memory & RAG Relationship

RAG **bukan memory**.

Perbedaan:

- Memory → konteks percakapan
- RAG → knowledge eksternal

Keduanya digabung secara terkontrol:

- Memory dipilih dulu
- RAG dipanggil jika diperlukan

Tidak semua pertanyaan memicu RAG.

---

## 6. Data Flow Summary

Ringkasan alur data:

- User input → intent validation
- Retrieval → dokumen relevan
- Context building → ringkasan
- Prompt composition → LLM
- Response validation → client

Setiap tahap dapat di-log dan diukur.

---

## 7. Yang Sengaja Tidak Termasuk

Untuk menjaga kompleksitas:

- Autonomous agent
- Self-updating knowledge
- Real-time web browsing
- Cross-user memory sharing

Semua ini dapat ditambahkan **setelah fondasi stabil**.

---

## 8. Prinsip Utama

> RAG adalah sistem data, bukan sistem berpikir.
> 

> Kontrol backend lebih penting daripada kecanggihan model.
> 

> Knowledge yang rapi menghasilkan AI yang dapat dipercaya.
>