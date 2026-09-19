/**
 * SISTEM BUKU TAMU DIGITAL & PENJADWALAN JANJI TEMU SEKOLAH
 * SMAN 1 KANDANGAN KEDIRI - ENGINE VERSION 10.1 (STABLE CLIENT-SIDE)
 */

const STORAGE_KEY = 'SMAN1_KANDANGAN_APPOINTMENTS_V10';
const ADMIN_SESSION_KEY = 'SMAN1_ADMIN_AUTH_SESSION';

const ADMIN_CREDENTIALS = {
  username: 'admin1234',
  password: '1234admin'
};

// Template Baku Respon Pimpinan
const DEFAULT_APPROVE_TEMPLATE = "Baik, saya tunggu 😊";
const DEFAULT_REJECT_TEMPLATE = "Mohon maaf, pada waktu tersebut berbenturan dengan agenda kedinasan luar sekolah 🙏";

// Global State Aplikasi
let appData = {
  appointments: [],
  activeStream: null,
  capturedBase64: null,
  currentWizardStep: 1,
  selectedTicketForAction: null,
  activeLetterTicketCode: null,
  calendarOffsetWeeks: 0,
  activeAdminSubView: 'table'
};

// Generator Nomor Surat Baku Dinas Pendidikan Jawa Timur
function generateOfficialLetterNumber(index) {
  const paddedNo = String(index || Math.floor(Math.random() * 800) + 100).padStart(3, '0');
  return `421.3 / ${paddedNo} / 101.6.14 / 2026`;
}

// Mock Data Awal (Untuk Simulasi Demo)
const INITIAL_MOCK_DATA = [
  {
    ticketCode: 'TKT-2026-X8K9M2',
    category: 'Instansi / Kedinasan',
    fullName: 'Drs. H. Bambang Soetrisno, M.Pd',
    whatsapp: '081234567890',
    agencyName: 'Cabang Dinas Pendidikan Wilayah Kediri',
    agencyAddress: 'Jl. Jaksa Agung Suprapto No. 2, Kediri',
    studentNisn: null,
    studentClass: null,
    parentChildName: null,
    urgency: 'Penting',
    requestedDate: '2026-09-18',
    purpose: 'Koordinasi teknis penjaminan mutu asesmen pembelajaran semester ganjil tahun ajaran berjalan.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%2338bdf8"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%232563eb"/></svg>',
    status: 'Disetujui',
    hostOfficer: 'Kepala SMAN 1 Kandangan',
    officialLetterNo: '421.3 / 084 / 101.6.14 / 2026',
    scheduledRoom: 'Ruang Kepala Sekolah',
    scheduledDate: '2026-09-18',
    scheduledStart: '09:00',
    scheduledEnd: '10:30',
    approvalMessage: DEFAULT_APPROVE_TEMPLATE,
    rejectionReason: '',
    checkInAt: null,
    createdAt: '2026-09-14T08:30:00.000Z'
  },
  {
    ticketCode: 'TKT-2026-M4P7Q1',
    category: 'Orang Tua Murid',
    fullName: 'Siti Aminah, S.Pd',
    whatsapp: '085712349988',
    agencyName: null,
    agencyAddress: null,
    studentNisn: null,
    studentClass: null,
    parentChildName: 'Muhammad Farhan (Kelas X-5)',
    urgency: 'Biasa',
    requestedDate: '2026-09-16',
    purpose: 'Konsultasi program beasiswa bakat prestasi akademik dan pembinaan olimpiade sains.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%2310b981"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%23059669"/></svg>',
    status: 'Disetujui',
    hostOfficer: 'Waka Bidang Kurikulum',
    officialLetterNo: '421.3 / 085 / 101.6.14 / 2026',
    scheduledRoom: 'Ruang Waka Kurikulum',
    scheduledDate: '2026-09-16',
    scheduledStart: '10:00',
    scheduledEnd: '11:00',
    approvalMessage: 'Didelegasikan ke Waka Kurikulum untuk koordinasi teknis.',
    rejectionReason: '',
    checkInAt: null,
    createdAt: '2026-09-15T07:15:00.000Z'
  },
  {
    ticketCode: 'TKT-2026-K9L2B5',
    category: 'Umum',
    fullName: 'Ir. Hendra Gunawan',
    whatsapp: '081398765432',
    agencyName: 'PT Edutech Nusantara Bersama',
    agencyAddress: 'Surabaya',
    studentNisn: null,
    studentClass: null,
    parentChildName: null,
    urgency: 'Mendesak',
    requestedDate: '2026-09-15',
    purpose: 'Penyampaian proposal kemitraan beasiswa riset dan teknologi robotika sekolah.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%23f59e0b"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%23d97706"/></svg>',
    status: 'Ditolak',
    hostOfficer: null,
    officialLetterNo: null,
    scheduledRoom: null,
    scheduledDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    approvalMessage: '',
    rejectionReason: DEFAULT_REJECT_TEMPLATE,
    checkInAt: null,
    createdAt: '2026-09-13T10:00:00.000Z'
  }
];

// ==========================================================================
// INISIALISASI APLIKASI
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadDatabase();
  initializeVisitDateInput();
  updateAuthUIState();

  // Deteksi Scan QR Code dari Ponsel (?ticket=TKT-XXXX)
  const urlParams = new URLSearchParams(window.location.search);
  const ticketParam = urlParams.get('ticket');
  if (ticketParam) {
    switchView('tracking-portal');
    const inputTrack = document.getElementById('trackTicketCodeInput');
    if (inputTrack) {
      inputTrack.value = ticketParam;
      trackTicketStatus();
    }
  }
});

function loadDatabase() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    appData.appointments = INITIAL_MOCK_DATA;
    saveDatabase();
  } else {
    try {
      appData.appointments = JSON.parse(stored);
    } catch (e) {
      appData.appointments = INITIAL_MOCK_DATA;
    }
  }
}

function saveDatabase() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData.appointments));
  } catch (e) {
    showToast('Penyimpanan memori penuh! Silakan hapus beberapa data demo.', 'error');
  }
}

function resetAllData() {
  if (confirm("Reset ulang seluruh data antrean ke setelan demo awal?")) {
    localStorage.removeItem(STORAGE_KEY);
    appData.appointments = INITIAL_MOCK_DATA;
    saveDatabase();
    renderAdminDashboard();
    showToast("Data antrean berhasil direset!", "success");
  }
}

function initializeVisitDateInput() {
  const today = new Date().toISOString().split('T')[0];
  const visitInput = document.getElementById('visitDate');
  if (visitInput) {
    visitInput.min = today;
    visitInput.value = today;
  }
}

// ==========================================================================
// PENGALIH TAMPILAN VIEW UTAMA
// ==========================================================================
function switchView(viewId) {
  const views = ['guest-portal', 'tracking-portal', 'admin-portal'];
  views.forEach(v => {
    const el = document.getElementById(`${v}-view`);
    if (el) el.classList.add('hidden');
  });

  document.getElementById('tabGuestBtn')?.classList.remove('active');
  document.getElementById('tabTrackBtn')?.classList.remove('active');
  document.getElementById('tabAdminBtn')?.classList.remove('active');

  if (viewId === 'guest-portal') {
    document.getElementById('guest-portal-view')?.classList.remove('hidden');
    document.getElementById('tabGuestBtn')?.classList.add('active');
    if (appData.currentWizardStep === 3 && !appData.capturedBase64) {
      startCamera();
    }
  } else if (viewId === 'tracking-portal') {
    document.getElementById('tracking-portal-view')?.classList.remove('hidden');
    document.getElementById('tabTrackBtn')?.classList.add('active');
    stopCamera();
  } else if (viewId === 'admin-portal') {
    document.getElementById('admin-portal-view')?.classList.remove('hidden');
    document.getElementById('tabAdminBtn')?.classList.add('active');
    stopCamera();
    renderAdminDashboard();
  }
}

function handleAdminNavClick() {
  const session = localStorage.getItem(ADMIN_SESSION_KEY);
  if (session === 'active') {
    switchView('admin-portal');
  } else {
    openAdminLoginModal();
  }
}

// ==========================================================================
// MODUL WIZARD STEP & VALIDASI BERJENJANG (3 LANGKAH)
// ==========================================================================
function goToStep(targetStep) {
  const currentStep = appData.currentWizardStep;

  // 1. Validasi saat maju dari Langkah 1 ke Langkah 2
  if (targetStep === 2 && currentStep === 1) {
    if (!validateStep1()) return;
  }

  // 2. Validasi saat maju dari Langkah 2 ke Langkah 3
  if (targetStep === 3 && currentStep === 2) {
    if (!validateStep2()) return;
  }

  // 3. Pencegahan lompatan langsung dari 1 ke 3 tanpa validasi
  if (targetStep === 3 && currentStep === 1) {
    if (!validateStep1() || !validateStep2()) return;
  }

  // Update Tampilan DOM Card Langkah
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`wizardStep${i}`)?.classList.add('hidden');
    document.getElementById(`stepIndicator${i}`)?.classList.remove('active');
  }

  document.getElementById(`wizardStep${targetStep}`)?.classList.remove('hidden');
  document.getElementById(`stepIndicator${targetStep}`)?.classList.add('active');

  // Update Garis Stepper Progress
  const ind1 = document.getElementById('stepIndicator1');
  const line1 = document.getElementById('stepLine1');
  const ind2 = document.getElementById('stepIndicator2');
  const line2 = document.getElementById('stepLine2');

  if (targetStep >= 2) {
    ind1?.classList.add('completed');
    line1?.classList.add('filled');
  } else {
    ind1?.classList.remove('completed');
    line1?.classList.remove('filled');
  }

  if (targetStep === 3) {
    ind2?.classList.add('completed');
    line2?.classList.add('filled');
    if (!appData.capturedBase64) startCamera();
  } else {
    ind2?.classList.remove('completed');
    line2?.classList.remove('filled');
    stopCamera();
  }

  appData.currentWizardStep = targetStep;
  window.scrollTo({ top: 100, behavior: 'smooth' });
}

function validateStep1() {
  const category = document.getElementById('guestCategory').value;
  const fullName = document.getElementById('fullName').value.trim();
  const rawWa = document.getElementById('whatsappNumber').value.trim();

  if (!category) {
    showToast('Pilih kategori tamu terlebih dahulu.', 'error');
    document.getElementById('guestCategory').focus();
    return false;
  }

  // Validasi Isian Dinamis Sesuai Kategori
  if (category === 'Siswa') {
    const nisn = document.getElementById('studentNisn').value.trim();
    const sClass = document.getElementById('studentClass').value.trim();
    if (!nisn) {
      showToast('Harap cantumkan 10 digit NISN siswa.', 'error');
      document.getElementById('studentNisn').focus();
      return false;
    }
    if (!/^\d{10}$/.test(nisn)) {
      showToast('NISN harus berupa 10 digit angka valid.', 'error');
      document.getElementById('studentNisn').focus();
      return false;
    }
    if (!sClass) {
      showToast('Harap cantumkan Kelas/Rombel siswa (misal: X-5).', 'error');
      document.getElementById('studentClass').focus();
      return false;
    }
  } else if (category === 'Orang Tua Murid') {
    const child = document.getElementById('parentChildName').value.trim();
    if (!child || child.length < 3) {
      showToast('Harap sebutkan nama putra/putri yang diwakili.', 'error');
      document.getElementById('parentChildName').focus();
      return false;
    }
  } else if (category === 'Instansi / Kedinasan') {
    const agency = document.getElementById('agencyName').value.trim();
    const addr = document.getElementById('agencyAddress').value.trim();
    if (!agency || agency.length < 3) {
      showToast('Harap cantumkan nama instansi/lembaga pengirim.', 'error');
      document.getElementById('agencyName').focus();
      return false;
    }
    if (!addr || addr.length < 5) {
      showToast('Harap cantumkan alamat lengkap kantor instansi pengirim.', 'error');
      document.getElementById('agencyAddress').focus();
      return false;
    }
  }

  // Validasi Nama Pemohon
  if (!fullName || fullName.length < 3) {
    showToast('Isi Nama Lengkap sesuai tanda pengenal (minimal 3 karakter).', 'error');
    document.getElementById('fullName').focus();
    return false;
  }

  // Validasi Nomor WhatsApp
  const cleanPhone = rawWa.replace(/\D/g, '');
  if (!cleanPhone) {
    showToast('Harap isi nomor WhatsApp aktif.', 'error');
    document.getElementById('whatsappNumber').focus();
    return false;
  }
  if (cleanPhone.length < 10 || cleanPhone.length > 14) {
    showToast('Nomor WhatsApp harus terdiri dari 10 hingga 14 digit angka.', 'error');
    document.getElementById('whatsappNumber').focus();
    return false;
  }

  return true;
}

function validateStep2() {
  const visitDate = document.getElementById('visitDate').value;
  const purpose = document.getElementById('visitPurpose').value.trim();

  if (!visitDate) {
    showToast('Tentukan rencana tanggal kedatangan audiensi.', 'error');
    document.getElementById('visitDate').focus();
    return false;
  }

  const selectedDate = new Date(visitDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    showToast('Tanggal kunjungan tidak boleh di masa lampau.', 'error');
    document.getElementById('visitDate').focus();
    return false;
  }

  if (selectedDate.getDay() === 0) { // 0 = Hari Minggu
    showToast('Layanan pimpinan libur pada hari Minggu. Silakan pilih hari kerja Senin–Sabtu.', 'error');
    document.getElementById('visitDate').focus();
    return false;
  }

  if (!purpose) {
    showToast('Harap jelaskan maksud dan pokok keperluan audiensi.', 'error');
    document.getElementById('visitPurpose').focus();
    return false;
  }

  if (purpose.length < 10) {
    showToast('Uraian keperluan terlalu singkat. Mohon jelaskan lebih spesifik (minimal 10 karakter).', 'error');
    document.getElementById('visitPurpose').focus();
    return false;
  }

  return true;
}

function handleCategoryChange() {
  const cat = document.getElementById('guestCategory').value;
  const studentBox = document.getElementById('dynamicStudentFields');
  const parentBox = document.getElementById('dynamicParentFields');
  const instansiBox = document.getElementById('dynamicInstansiFields');

  studentBox?.classList.add('hidden');
  parentBox?.classList.add('hidden');
  instansiBox?.classList.add('hidden');

  if (cat === 'Siswa') {
    studentBox?.classList.remove('hidden');
  } else if (cat === 'Orang Tua Murid') {
    parentBox?.classList.remove('hidden');
  } else if (cat === 'Instansi / Kedinasan') {
    instansiBox?.classList.remove('hidden');
  }
}

// ==========================================================================
// ENGINE KAMERA LIVE WEBRTC (DENGAN KOMPRESI HEMAT MEMORI)
// ==========================================================================
async function startCamera() {
  const video = document.getElementById('webcamVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const errMsg = document.getElementById('cameraErrMsg');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (placeholder) {
      placeholder.classList.remove('hidden');
      errMsg.innerText = 'Fitur kamera tidak didukung oleh browser ini.';
    }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    appData.activeStream = stream;
    if (video) {
      video.srcObject = stream;
      video.classList.remove('hidden');
    }
    placeholder?.classList.add('hidden');
  } catch (err) {
    console.warn('Camera error:', err);
    if (placeholder) {
      placeholder.classList.remove('hidden');
      errMsg.innerText = 'Izin kamera ditolak atau perangkat kamera tidak ditemukan.';
    }
  }
}

function stopCamera() {
  if (appData.activeStream) {
    appData.activeStream.getTracks().forEach(t => t.stop());
    appData.activeStream = null;
  }
}

function takePhoto() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('photoCanvas');
  const capturedImg = document.getElementById('capturedImage');
  const previewBox = document.getElementById('capturedResultContainer');
  const cameraBox = document.getElementById('cameraPreviewContainer');
  const snapBtn = document.getElementById('snapPhotoBtn');
  const retakeBtn = document.getElementById('retakePhotoBtn');

  if (!appData.activeStream || !video || video.videoWidth === 0) {
    synthesizeFallbackPhoto();
    return;
  }

  // Kunci Resolusi Avatar Pasfoto: 320 x 240 px (Hemat kuota LocalStorage)
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, 320, 240);

  // Kompresi JPEG Kualitas 0.65 (~20 - 30 KB)
  const dataURL = canvas.toDataURL('image/jpeg', 0.65);
  appData.capturedBase64 = dataURL;
  if (capturedImg) capturedImg.src = dataURL;

  cameraBox?.classList.add('hidden');
  previewBox?.classList.remove('hidden');
  snapBtn?.classList.add('hidden');
  retakeBtn?.classList.remove('hidden');

  stopCamera();
  showToast('Foto wajah berhasil diverifikasi!', 'success');
}

function retakePhoto() {
  appData.capturedBase64 = null;
  document.getElementById('cameraPreviewContainer')?.classList.remove('hidden');
  document.getElementById('capturedResultContainer')?.classList.add('hidden');
  document.getElementById('snapPhotoBtn')?.classList.remove('hidden');
  document.getElementById('retakePhotoBtn')?.classList.add('hidden');
  startCamera();
}

function synthesizeFallbackPhoto() {
  const canvas = document.getElementById('photoCanvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 320, 240);

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(160, 90, 45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e40af';
  ctx.beginPath();
  ctx.arc(160, 220, 80, 0, Math.PI, true);
  ctx.fill();

  const data = canvas.toDataURL('image/jpeg', 0.65);
  appData.capturedBase64 = data;
  
  const capturedImg = document.getElementById('capturedImage');
  if (capturedImg) capturedImg.src = data;

  document.getElementById('cameraPreviewContainer')?.classList.add('hidden');
  document.getElementById('capturedResultContainer')?.classList.remove('hidden');
  document.getElementById('snapPhotoBtn')?.classList.add('hidden');
  document.getElementById('retakePhotoBtn')?.classList.remove('hidden');
  showToast('Simulasi biometrik wajah disiapkan.', 'info');
}

// ==========================================================================
// PENGIRIMAN FORMULIR AUDIENSI & PELACAKAN TIKET
// ==========================================================================
function handleFormSubmission(e) {
  e.preventDefault();

  if (!appData.capturedBase64) {
    showToast('Harap ambil foto wajah Anda sebelum mengirimkan permohonan.', 'error');
    return;
  }

  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ticketCode = `TKT-2026-${randomChars}`;

  const category = document.getElementById('guestCategory').value;
  const fullName = document.getElementById('fullName').value.trim();
  const whatsapp = document.getElementById('whatsappNumber').value.trim();
  const visitDate = document.getElementById('visitDate').value;
  const urgency = document.getElementById('urgencyLevel').value;
  const purpose = document.getElementById('visitPurpose').value.trim();

  // Ambil Nilai Kolom Khusus Kategori Tanpa Terpotong
  const studentNisn = document.getElementById('studentNisn')?.value.trim() || null;
  const studentClass = document.getElementById('studentClass')?.value.trim() || null;
  const parentChildName = document.getElementById('parentChildName')?.value.trim() || null;
  const agencyName = document.getElementById('agencyName')?.value.trim() || null;
  const agencyAddress = document.getElementById('agencyAddress')?.value.trim() || null;

  const newAppointment = {
    ticketCode,
    category,
    fullName,
    whatsapp,
    visitDate,
    urgency,
    purpose,
    studentNisn,
    studentClass,
    parentChildName,
    agencyName,
    agencyAddress,
    photoBase64: appData.capturedBase64,
    status: 'Menunggu Konfirmasi',
    hostOfficer: null,
    officialLetterNo: null,
    scheduledRoom: null,
    scheduledDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    approvalMessage: '',
    rejectionReason: '',
    checkInAt: null,
    createdAt: new Date().toISOString()
  };

  appData.appointments.unshift(newAppointment);
  saveDatabase();

  // Tampilkan Rincian pada Modal Berhasil
  document.getElementById('modalTicketCode').innerText = ticketCode;
  document.getElementById('modalSummaryName').innerText = fullName;
  document.getElementById('modalSummaryDate').innerText = visitDate;
  document.getElementById('modalSummaryPhone').innerText = whatsapp;
  document.getElementById('ticketSuccessModal')?.classList.remove('hidden');

  // Bersihkan Input Form
  document.getElementById('guestAppointmentForm').reset();
  handleCategoryChange();
  retakePhoto();
  goToStep(1);
}

function closeTicketModal() {
  document.getElementById('ticketSuccessModal')?.classList.add('hidden');
}

function copyModalTicketCode() {
  const code = document.getElementById('modalTicketCode').innerText;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Kode tiket berhasil disalin ke papan klip!', 'success');
  });
}

function formatToWhatsApp(phone) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.substring(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

function trackTicketStatus() {
  const code = document.getElementById('trackTicketCodeInput').value.trim().toUpperCase();
  const resultBox = document.getElementById('trackerResultBox');

  if (!code) {
    showToast('Masukkan kode tiket Anda.', 'error');
    return;
  }

  const found = appData.appointments.find(a => a.ticketCode === code);
  if (!found) {
    resultBox.innerHTML = `
      <div class="collision-alert">
        <i class="fa-solid fa-circle-xmark"></i>
        <div>
          <strong>Tiket Tidak Ditemukan</strong>
          <p>Pastikan kode tiket yang Anda masukkan sudah sesuai (Contoh: TKT-2026-XXXXXX).</p>
        </div>
      </div>
    `;
    resultBox.classList.remove('hidden');
    return;
  }

  let hostNoteHTML = '';
  let letterBtnHTML = '';

  if (found.status === 'Disetujui' || found.status === 'Checked-In') {
    const msg = (found.approvalMessage && found.approvalMessage.trim()) || DEFAULT_APPROVE_TEMPLATE;
    hostNoteHTML = `
      <div style="margin-top:1.1rem; padding:0.9rem 1.1rem; background:rgba(56, 189, 248, 0.08); border-left:3px solid var(--cyan-glow); border-radius:8px;">
        <span style="font-size:0.75rem; color:var(--cyan-glow); font-weight:700; display:block; text-transform:uppercase;">
          <i class="fa-solid fa-comment-dots"></i> Catatan Pimpinan:
        </span>
        <p style="font-size:0.92rem; color:var(--text-main); font-style:italic; margin-top:0.35rem; overflow-wrap:anywhere;">
          "${escapeHtml(msg)}"
        </p>
      </div>
    `;

    letterBtnHTML = `
      <div style="margin-top:1.2rem; text-align:center;">
        <button type="button" class="btn btn-primary btn-block" onclick="openOfficialLetterModal('${found.ticketCode}')">
          <i class="fa-solid fa-file-pdf"></i> Unduh / Cetak Surat Undangan Resmi Berkop
        </button>
      </div>
    `;
  } else if (found.status === 'Ditolak') {
    const rejMsg = (found.rejectionReason && found.rejectionReason.trim()) || DEFAULT_REJECT_TEMPLATE;
    hostNoteHTML = `
      <div style="margin-top:1.1rem; padding:0.9rem 1.1rem; background:rgba(239, 68, 68, 0.08); border-left:3px solid var(--rose-danger); border-radius:8px;">
        <span style="font-size:0.75rem; color:#FCA5A5; font-weight:700; display:block; text-transform:uppercase;">
          <i class="fa-solid fa-circle-exclamation"></i> Catatan Penolakan:
        </span>
        <p style="font-size:0.92rem; color:#FCA5A5; font-style:italic; margin-top:0.35rem; overflow-wrap:anywhere;">
          "${escapeHtml(rejMsg)}"
        </p>
      </div>
    `;
  }

  // Label Asal Instansi / Siswa untuk Pelacakan Mandiri
  let metaInfo = '';
  if (found.agencyName) {
    metaInfo = `<p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Instansi: <strong style="color:#fff;">${escapeHtml(found.agencyName)}</strong></p>`;
  } else if (found.category === 'Siswa') {
    metaInfo = `<p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Kelas: <strong style="color:#fff;">${escapeHtml(found.studentClass || '-')} (NISN: ${found.studentNisn || '-'})</strong></p>`;
  } else if (found.parentChildName) {
    metaInfo = `<p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Orang Tua dari: <strong style="color:#fff;">${escapeHtml(found.parentChildName)}</strong></p>`;
  }

  resultBox.innerHTML = `
    <div class="glass-card" style="padding:1.5rem; margin-top:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <span style="font-weight:800; color:var(--cyan-glow); font-size:1.15rem;">${found.ticketCode}</span>
        <span class="badge ${getBadgeClass(found.status)}">${found.status}</span>
      </div>
      <div style="display:flex; gap:1rem; align-items:center; margin-bottom:0.75rem;">
        <img src="${found.photoBase64 || ''}" alt="Foto Tamu" style="width:56px; height:56px; border-radius:8px; object-fit:cover; border:1px solid var(--border-subtle); flex-shrink:0; background:#050811;">
        <div style="min-width:0; overflow-wrap:anywhere; word-break:break-word;">
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Nama Pemohon: <strong style="color:#fff;">${escapeHtml(found.fullName)}</strong></p>
          ${metaInfo}
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Tanggal Pengajuan: <strong style="color:#fff;">${found.visitDate || found.requestedDate}</strong></p>
          ${found.hostOfficer ? `<p style="font-size:0.85rem; color:var(--cyan-glow); margin:0;">Pejabat Penerima: <strong>${escapeHtml(found.hostOfficer)}</strong></p>` : ''}
        </div>
      </div>
      ${found.scheduledRoom ? `<p style="font-size:0.85rem; color:var(--cyan-glow); margin-top:0.5rem; font-weight:600;"><i class="fa-solid fa-location-dot"></i> Tempat: ${found.scheduledRoom} (${found.scheduledStart} -${found.scheduledEnd} WIB)</p>` : ''}
      ${hostNoteHTML}
      ${letterBtnHTML}
    </div>
  `;
  resultBox.classList.remove('hidden');
}

// ==========================================================================
// PANEL ADMIN / DISPOSISI PIMPINAN
// ==========================================================================
function switchAdminSubView(subview) {
  appData.activeAdminSubView = subview;

  document.getElementById('subtabBtnTable')?.classList.remove('active');
  document.getElementById('subtabBtnCalendar')?.classList.remove('active');
  document.getElementById('subtabBtnAnalytics')?.classList.remove('active');

  document.getElementById('adminSubViewTable')?.classList.add('hidden');
  document.getElementById('adminSubViewCalendar')?.classList.add('hidden');
  document.getElementById('adminSubViewAnalytics')?.classList.add('hidden');

  if (subview === 'table') {
    document.getElementById('subtabBtnTable')?.classList.add('active');
    document.getElementById('adminSubViewTable')?.classList.remove('hidden');
    renderAdminQueueTable();
  } else if (subview === 'calendar') {
    document.getElementById('subtabBtnCalendar')?.classList.add('active');
    document.getElementById('adminSubViewCalendar')?.classList.remove('hidden');
    renderWeeklyCalendar();
  } else if (subview === 'analytics') {
    document.getElementById('subtabBtnAnalytics')?.classList.add('active');
    document.getElementById('adminSubViewAnalytics')?.classList.remove('hidden');
    renderAnalyticsAndHeatmap();
  }
}

function renderAdminDashboard() {
  renderMetrics();
  switchAdminSubView(appData.activeAdminSubView || 'table');
}

function renderMetrics() {
  document.getElementById('metricTotal').innerText = appData.appointments.length;
  document.getElementById('metricPending').innerText = appData.appointments.filter(a => a.status === 'Menunggu Konfirmasi').length;
  document.getElementById('metricApproved').innerText = appData.appointments.filter(a => a.status === 'Disetujui').length;

  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('metricToday').innerText = appData.appointments.filter(a => (a.scheduledDate === todayStr || a.requestedDate === todayStr || a.visitDate === todayStr)).length;
}

function renderAdminQueueTable() {
  const tbody = document.getElementById('adminTableBody');
  if (!tbody) return;

  const filter = document.getElementById('tableFilterStatus')?.value || 'ALL';
  const searchInput = document.getElementById('adminSearchInput')?.value.toLowerCase().trim() || '';

  let list = appData.appointments;

  // Filter Berdasarkan Status
  if (filter !== 'ALL') {
    list = list.filter(item => item.status === filter);
  }

  // Filter Berdasarkan Kata Kunci Pencarian (Nama, Tiket, atau Instansi)
  if (searchInput) {
    list = list.filter(item => 
      item.fullName.toLowerCase().includes(searchInput) ||
      item.ticketCode.toLowerCase().includes(searchInput) ||
      (item.agencyName && item.agencyName.toLowerCase().includes(searchInput)) ||
      (item.parentChildName && item.parentChildName.toLowerCase().includes(searchInput))
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-dim);">
          Tidak ada data antrean permohonan yang sesuai.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const cleanPhone = formatToWhatsApp(item.whatsapp);
    
    // Siapkan Template Pesan WhatsApp Resmi Otomatis
    let waMessage = `Halo Bapak/Ibu ${item.fullName}, permohonan audiensi Anda di SMAN 1 Kandangan [Tiket: ${item.ticketCode}] `;
    if (item.status === 'Disetujui') {
      waMessage += `telah DISETUJUI. Pertemuan dijadwalkan pada ${item.scheduledDate} jam ${item.scheduledStart}-${item.scheduledEnd} WIB di ${item.scheduledRoom}. Cek status tiket Anda: ${window.location.origin}${window.location.pathname}?ticket=${item.ticketCode}`;
    } else {
      waMessage += `saat ini berstatus: ${item.status}. Pantau status tiket Anda: ${window.location.origin}${window.location.pathname}?ticket=${item.ticketCode}`;
    }
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

    let scheduleDisplay = '<span style="color:var(--text-dim);">-</span>';
    if (item.scheduledRoom) {
      const hostLabel = item.hostOfficer ? `<span class="table-host-tag">${escapeHtml(item.hostOfficer)}</span><br>` : '';
      scheduleDisplay = `${hostLabel}<strong style="color:var(--text-main); font-size:0.82rem;">${item.scheduledRoom}</strong><br><small style="color:var(--cyan-glow);">${item.scheduledDate} (${item.scheduledStart}-${item.scheduledEnd})</small>`;
    }

    let noteInTable = '';
    if (item.status === 'Disetujui' || item.status === 'Checked-In') {
      const msg = (item.approvalMessage && item.approvalMessage.trim()) || DEFAULT_APPROVE_TEMPLATE;
      noteInTable = `<div class="table-note-pill"><i class="fa-regular fa-comment-dots"></i> "${escapeHtml(msg)}"</div>`;
    } else if (item.status === 'Ditolak') {
      const rej = (item.rejectionReason && item.rejectionReason.trim()) || DEFAULT_REJECT_TEMPLATE;
      noteInTable = `<div class="table-note-pill table-note-reject"><i class="fa-solid fa-circle-exclamation"></i> "${escapeHtml(rej)}"</div>`;
    }

    let actionButtons = '';
    if (item.status === 'Menunggu Konfirmasi') {
      actionButtons = `
        <button class="btn btn-primary btn-sm" onclick="openScheduleModal('${item.ticketCode}')" title="Tinjau & Disposisi TU/Pimpinan">
          <i class="fa-solid fa-calendar-check"></i> Disposisi
        </button>
      `;
    } else if (item.status === 'Disetujui') {
      actionButtons = `
        <button class="btn btn-emerald btn-sm" onclick="executeCheckIn('${item.ticketCode}')" title="Tandai Hadir di Lobi">
          <i class="fa-solid fa-user-check"></i>
        </button>
        <button class="btn btn-outline btn-sm" onclick="openOfficialLetterModal('${item.ticketCode}')" title="Cetak Surat Undangan Resmi Berkop">
          <i class="fa-solid fa-file-pdf"></i>
        </button>
        <button class="btn btn-outline btn-sm" onclick="openScheduleModal('${item.ticketCode}')" title="Ubah Disposisi">
          <i class="fa-solid fa-pen"></i>
        </button>
      `;
    } else if (item.status === 'Checked-In') {
      actionButtons = `
        <button class="btn btn-outline btn-sm" onclick="executeComplete('${item.ticketCode}')" title="Selesaikan Audiensi">
          <i class="fa-solid fa-flag-checkered"></i> Selesai
        </button>
        <button class="btn btn-outline btn-sm" onclick="openOfficialLetterModal('${item.ticketCode}')" title="Cetak Surat Undangan Resmi Berkop">
          <i class="fa-solid fa-file-pdf"></i>
        </button>
      `;
    } else {
      actionButtons = `<span style="font-size:0.75rem; color:var(--text-dim);">-</span>`;
    }

    // Detail asal instansi/siswa pada baris tabel
    let extraMeta = '';
    if (item.agencyName) {
      extraMeta = `<br><small style="color:var(--text-muted);">${escapeHtml(item.agencyName)}</small>`;
    } else if (item.parentChildName) {
      extraMeta = `<br><small style="color:var(--text-muted);">Ortu: ${escapeHtml(item.parentChildName)}</small>`;
    } else if (item.studentClass) {
      extraMeta = `<br><small style="color:var(--text-muted);">Kelas: ${escapeHtml(item.studentClass)}</small>`;
    }

    return `
      <tr>
        <td>
          <strong style="color:var(--cyan-glow); font-size:0.84rem;">${item.ticketCode}</strong>
        </td>
        <td>
          <strong style="overflow-wrap:anywhere; word-break:break-word;">${escapeHtml(item.fullName)}</strong>
          ${extraMeta}
          <br>
          <a href="${waUrl}" target="_blank" class="wa-link">
            <i class="fa-brands fa-whatsapp"></i> ${item.whatsapp}
          </a>
        </td>
        <td><span style="font-size:0.82rem;">${item.category}</span></td>
        <td>
          <span style="font-size:0.82rem;">${item.visitDate || item.requestedDate}</span>
          <br>
          <span class="urgency-pill urgency-${item.urgency.toLowerCase()}">${item.urgency}</span>
        </td>
        <td>${scheduleDisplay}</td>
        <td>
          <span class="badge ${getBadgeClass(item.status)}">${item.status}</span>
          ${noteInTable}
        </td>
        <td style="text-align: right;">${actionButtons}</td>
      </tr>
    `;
  }).join('');
}

function getBadgeClass(status) {
  switch (status) {
    case 'Menunggu Konfirmasi': return 'badge-pending';
    case 'Disetujui': return 'badge-approved';
    case 'Ditolak': return 'badge-rejected';
    case 'Checked-In': return 'badge-checkin';
    case 'Selesai': return 'badge-completed';
    default: return 'badge-pending';
  }
}

// ==========================================================================
// AKSI PENJADWALAN, DISPOSISI, DAN DELEGASI PIMPINAN
// ==========================================================================
function openScheduleModal(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  appData.selectedTicketForAction = ticketCode;

  document.getElementById('scheduleModalTicketPill').innerText = `Tiket: ${item.ticketCode}`;
  document.getElementById('schedModalName').innerText = item.fullName;
  document.getElementById('schedModalCategoryMeta').innerText = `${item.category} • Urgensi: ${item.urgency}`;
  document.getElementById('schedModalPurpose').innerText = `"${item.purpose}"`;

  const modalPhoto = document.getElementById('schedModalPhoto');
  if (modalPhoto) {
    modalPhoto.src = item.photoBase64 || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%2338bdf8"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%232563eb"/></svg>';
  }

  // Generate Nomor Surat Otomatis
  const autoLetterNo = item.officialLetterNo || generateOfficialLetterNumber(appData.appointments.indexOf(item) + 1);
  document.getElementById('schedLetterNoApprove').value = autoLetterNo;
  document.getElementById('schedLetterNoDelegate').value = autoLetterNo;

  // Nilai Awal Tab Kepala Sekolah
  document.getElementById('schedRoom').value = item.scheduledRoom || 'Ruang Kepala Sekolah';
  document.getElementById('schedDate').value = item.scheduledDate || item.visitDate || item.requestedDate;
  document.getElementById('schedStartTime').value = item.scheduledStart || '09:00';
  document.getElementById('schedEndTime').value = item.scheduledEnd || '10:00';

  // Nilai Awal Tab Delegasi
  document.getElementById('schedDelegateDate').value = item.scheduledDate || item.visitDate || item.requestedDate;
  if (item.hostOfficer && item.hostOfficer !== 'Kepala SMAN 1 Kandangan') {
    document.getElementById('schedDelegateHost').value = item.hostOfficer;
  }
  handleDelegateHostChange();

  const existingApprove = item.approvalMessage && item.approvalMessage.trim();
  document.getElementById('schedApprovalNotes').value = existingApprove ? existingApprove : DEFAULT_APPROVE_TEMPLATE;

  const existingReject = item.rejectionReason && item.rejectionReason.trim();
  document.getElementById('schedRejectionReason').value = existingReject ? existingReject : DEFAULT_REJECT_TEMPLATE;

  switchActionTab('approve');
  runLiveCollisionCheck();

  document.getElementById('scheduleActionModal')?.classList.remove('hidden');
}

function closeScheduleModal() {
  document.getElementById('scheduleActionModal')?.classList.add('hidden');
  appData.selectedTicketForAction = null;
}

function handleDelegateHostChange() {
  const host = document.getElementById('schedDelegateHost').value;
  const roomSelect = document.getElementById('schedDelegateRoom');
  
  if (host === 'Waka Bidang Kurikulum') roomSelect.value = 'Ruang Waka Kurikulum';
  else if (host === 'Waka Bidang Kesiswaan') roomSelect.value = 'Ruang Waka Kesiswaan';
  else if (host === 'Waka Bidang Sarpras' || host === 'Waka Bidang Humas') roomSelect.value = 'Ruang Waka Humas & Sarpras';
  else if (host === 'Koordinator Guru BK') roomSelect.value = 'Ruang Konseling BK';
  else roomSelect.value = 'Ruang Tamu Khusus';
}

function switchActionTab(tab) {
  const btnApprove = document.getElementById('btnTabApprove');
  const btnDelegate = document.getElementById('btnTabDelegate');
  const btnReject = document.getElementById('btnTabReject');
  
  const contentApprove = document.getElementById('tabContentApprove');
  const contentDelegate = document.getElementById('tabContentDelegate');
  const contentReject = document.getElementById('tabContentReject');

  btnApprove?.classList.remove('active');
  btnDelegate?.classList.remove('active');
  btnReject?.classList.remove('active');

  contentApprove?.classList.add('hidden');
  contentDelegate?.classList.add('hidden');
  contentReject?.classList.add('hidden');

  if (tab === 'approve') {
    btnApprove?.classList.add('active');
    contentApprove?.classList.remove('hidden');
    runLiveCollisionCheck();
  } else if (tab === 'delegate') {
    btnDelegate?.classList.add('active');
    contentDelegate?.classList.remove('hidden');
  } else {
    btnReject?.classList.add('active');
    contentReject?.classList.remove('hidden');
    const rejInput = document.getElementById('schedRejectionReason');
    if (!rejInput.value || !rejInput.value.trim()) {
      rejInput.value = DEFAULT_REJECT_TEMPLATE;
    }
  }
}

function applyDefaultRejectTemplate() {
  document.getElementById('schedRejectionReason').value = DEFAULT_REJECT_TEMPLATE;
  showToast("Template penolakan dimuat!", "info");
}

function applyDefaultApproveTemplate() {
  document.getElementById('schedApprovalNotes').value = DEFAULT_APPROVE_TEMPLATE;
  showToast("Template sambutan dimuat!", "info");
}

function runLiveCollisionCheck() {
  const room = document.getElementById('schedRoom').value;
  const date = document.getElementById('schedDate').value;
  const start = document.getElementById('schedStartTime').value;
  const end = document.getElementById('schedEndTime').value;
  const alertBox = document.getElementById('collisionAlertBox');
  const alertMsg = document.getElementById('collisionAlertMsg');
  const confirmBtn = document.getElementById('confirmApproveBtn');

  if (!room || !date || !start || !end) return;

  if (start >= end) {
    alertBox?.classList.remove('hidden');
    if (alertMsg) alertMsg.innerText = 'Jam mulai harus lebih awal daripada jam selesai pertemuan!';
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.5';
    }
    return;
  }

  // Deteksi Tumpang Tindih Interval Waktu Pertemuan
  const conflict = appData.appointments.find(a => {
    if (a.ticketCode === appData.selectedTicketForAction) return false;
    if (a.status !== 'Disetujui' && a.status !== 'Checked-In') return false;

    if (a.scheduledRoom === room && a.scheduledDate === date) {
      return (start < a.scheduledEnd && end > a.scheduledStart);
    }
    return false;
  });

  if (conflict) {
    alertBox?.classList.remove('hidden');
    if (alertMsg) alertMsg.innerText = `Ruangan "${room}" telah dialokasikan untuk tamu [${conflict.fullName}] pada jam ${conflict.scheduledStart} - ${conflict.scheduledEnd} WIB!`;
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.style.opacity = '0.5';
    }
  } else {
    alertBox?.classList.add('hidden');
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.style.opacity = '1';
    }
  }
}

function executeApprove() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  const note = document.getElementById('schedApprovalNotes').value.trim();
  item.approvalMessage = note || DEFAULT_APPROVE_TEMPLATE;
  item.officialLetterNo = document.getElementById('schedLetterNoApprove').value.trim() || generateOfficialLetterNumber();
  item.hostOfficer = 'Kepala SMAN 1 Kandangan';

  item.status = 'Disetujui';
  item.scheduledRoom = document.getElementById('schedRoom').value;
  item.scheduledDate = document.getElementById('schedDate').value;
  item.scheduledStart = document.getElementById('schedStartTime').value;
  item.scheduledEnd = document.getElementById('schedEndTime').value;
  item.rejectionReason = '';

  saveDatabase();
  renderAdminDashboard();
  closeScheduleModal();
  showToast(`Janji temu [${item.ticketCode}] disetujui bersama Kepala Sekolah!`, 'success');
}

function executeDelegate() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  const targetHost = document.getElementById('schedDelegateHost').value;
  const note = document.getElementById('schedDelegateNotes').value.trim();
  
  item.hostOfficer = targetHost;
  item.officialLetterNo = document.getElementById('schedLetterNoDelegate').value.trim() || generateOfficialLetterNumber();
  item.approvalMessage = `Didelegasikan ke ${targetHost}. ${note}`;

  item.status = 'Disetujui';
  item.scheduledRoom = document.getElementById('schedDelegateRoom').value;
  item.scheduledDate = document.getElementById('schedDelegateDate').value;
  item.scheduledStart = document.getElementById('schedDelegateStartTime').value;
  item.scheduledEnd = document.getElementById('schedDelegateEndTime').value;
  item.rejectionReason = '';

  saveDatabase();
  renderAdminDashboard();
  closeScheduleModal();
  showToast(`Audiensi [${item.ticketCode}] berhasil didelegasikan ke ${targetHost}!`, 'success');
}

function executeReject() {
  const reason = document.getElementById('schedRejectionReason').value.trim();
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  item.status = 'Ditolak';
  item.rejectionReason = reason || DEFAULT_REJECT_TEMPLATE;

  saveDatabase();
  renderAdminDashboard();
  closeScheduleModal();
  showToast(`Permohonan [${item.ticketCode}] ditolak dengan catatan.`, 'info');
}

function executeCheckIn(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  item.status = 'Checked-In';
  item.checkInAt = new Date().toISOString();

  saveDatabase();
  renderAdminDashboard();
  showToast(`Tamu [${item.fullName}] berhasil check-in di lobi!`, 'success');
}

function executeComplete(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  item.status = 'Selesai';
  saveDatabase();
  renderAdminDashboard();
  showToast(`Audiensi [${item.ticketCode}] selesai.`, 'success');
}

// ==========================================================================
// MODAL SURAT RESMI BERKOP (A4 PDF LAYOUT & QR CODE NYATA)
// ==========================================================================
function openOfficialLetterModal(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  appData.activeLetterTicketCode = ticketCode;

  const letterNo = item.officialLetterNo || generateOfficialLetterNumber();
  document.getElementById('docLetterNo').innerText = letterNo;
  
  const today = new Date();
  const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('docLetterDate').innerText = `Kediri, ${today.toLocaleDateString('id-ID', dateOptions)}`;

  document.getElementById('docGuestName').innerText = item.fullName;
  
  // Format Identitas Asal Tamu Berdasarkan Kategori
  let agencyDisplay = 'Masyarakat / Pemohon';
  if (item.agencyName) {
    agencyDisplay = `${item.agencyName} (${item.agencyAddress || '-'})`;
  } else if (item.category === 'Siswa') {
    agencyDisplay = `Siswa Kelas ${item.studentClass || '-'} (NISN: ${item.studentNisn || '-'})`;
  } else if (item.category === 'Orang Tua Murid') {
    agencyDisplay = `Wali Murid dari: ${item.parentChildName || '-'}`;
  }
  document.getElementById('docGuestAgency').innerText = agencyDisplay;

  document.getElementById('docTicketCode').innerText = item.ticketCode;

  let schedDayName = '-';
  if (item.scheduledDate) {
    const d = new Date(item.scheduledDate);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    schedDayName = `${dayNames[d.getDay()]}, ${d.toLocaleDateString('id-ID', dateOptions)}`;
  }
  document.getElementById('docScheduleDateDay').innerText = schedDayName;
  document.getElementById('docScheduleTime').innerText = `${item.scheduledStart || '09.00'} s/d ${item.scheduledEnd || '10.00'}`;
  document.getElementById('docScheduleRoom').innerText = item.scheduledRoom || 'Ruang Pimpinan SMAN 1 Kandangan';
  document.getElementById('docHostOfficer').innerText = item.hostOfficer || 'Kepala SMAN 1 Kandangan';
  document.getElementById('docPurpose').innerText = item.purpose;
  document.getElementById('docHostNotes').innerText = `"${item.approvalMessage || DEFAULT_APPROVE_TEMPLATE}"`;

  // Render QR Code Nyata yang Mengarah ke Tautan Verifikasi Sistem
  const verificationUrl = `${window.location.origin}${window.location.pathname}?ticket=${item.ticketCode}`;
  const qrPlaceholder = document.querySelector('.sign-qr-box .qr-placeholder');
  if (qrPlaceholder) {
    qrPlaceholder.innerHTML = `
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(verificationUrl)}" 
           alt="QR Verifikasi Tiket" 
           style="width:90px; height:90px; border:1px solid #cbd5e1; padding:3px; border-radius:4px; background:#fff; margin-bottom:0.25rem;">
    `;
  }

  document.getElementById('officialLetterModal')?.classList.remove('hidden');
}

function closeOfficialLetterModal() {
  document.getElementById('officialLetterModal')?.classList.add('hidden');
  appData.activeLetterTicketCode = null;
}

function printOfficialLetter() {
  window.print();
}

// ==========================================================================
// KALENDER MINGGUAN & HEATMAP KEPADATAN AUDIENSI
// ==========================================================================
function changeCalendarWeek(offset) {
  appData.calendarOffsetWeeks += offset;
  renderWeeklyCalendar();
}

function resetCalendarToCurrentWeek() {
  appData.calendarOffsetWeeks = 0;
  renderWeeklyCalendar();
}

function getStartOfWeek(date, offsetWeeks = 0) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff + (offsetWeeks * 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function renderWeeklyCalendar() {
  const baseDate = new Date();
  const monday = getStartOfWeek(baseDate, appData.calendarOffsetWeeks);
  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const grid = document.getElementById('calendarGridWeek');
  if (!grid) return;
  
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  const label = document.getElementById('calWeekRangeLabel');
  if (label) {
    label.innerText = `Minggu: ${monday.toLocaleDateString('id-ID', options)} - ${saturday.toLocaleDateString('id-ID', options)}`;
  }

  let html = '';
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 6; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);
    const dateISO = currentDay.toISOString().split('T')[0];
    const isToday = (dateISO === todayStr);

    const dayAppointments = appData.appointments.filter(a => {
      const matchDate = (a.scheduledDate === dateISO || a.requestedDate === dateISO);
      return matchDate && (a.status === 'Disetujui' || a.status === 'Checked-In');
    });

    let eventsHTML = '';
    if (dayAppointments.length === 0) {
      eventsHTML = `<div class="cal-empty-day">Tidak ada agenda audiensi</div>`;
    } else {
      eventsHTML = dayAppointments.map(app => {
        const timeDisplay = app.scheduledStart ? `${app.scheduledStart} - ${app.scheduledEnd}` : 'Jam Belum Ditentukan';
        const isUrgent = (app.urgency === 'Mendesak');
        return `
          <div class="cal-event-card ${isUrgent ? 'urgent' : ''}" onclick="openScheduleModal('${app.ticketCode}')">
            <span class="cal-event-time"><i class="fa-regular fa-clock"></i> ${timeDisplay}</span>
            <div class="cal-event-title">${escapeHtml(app.fullName)}</div>
            <div class="cal-event-room"><i class="fa-solid fa-user-tie"></i> ${app.hostOfficer || 'Kepala Sekolah'}</div>
          </div>
        `;
      }).join('');
    }

    html += `
      <div class="calendar-day-col ${isToday ? 'is-today' : ''}">
        <div class="cal-col-header">
          <span class="cal-day-name">${dayNames[i]}</span>
          <span class="cal-day-date">${currentDay.getDate()}</span>
        </div>
        <div class="cal-events-list">
          ${eventsHTML}
        </div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

function renderAnalyticsAndHeatmap() {
  renderCategoryBreakdown();
  renderHeatmapMatrix();
}

function renderCategoryBreakdown() {
  const total = appData.appointments.length;
  const categories = ['Siswa', 'Guru/Staf', 'Orang Tua Murid', 'Instansi / Kedinasan', 'Umum'];
  const counts = {};
  categories.forEach(c => counts[c] = 0);

  appData.appointments.forEach(a => {
    if (counts[a.category] !== undefined) counts[a.category]++;
    else counts['Umum']++;
  });

  const barsContainer = document.getElementById('categoryBarsContainer');
  if (barsContainer) {
    barsContainer.innerHTML = categories.map(cat => {
      const count = counts[cat];
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div class="cat-bar-item">
          <div class="cat-bar-labels">
            <span style="color:var(--text-main);">${cat}</span>
            <span style="color:var(--cyan-glow);">${count} (${percent}%)</span>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  const approved = appData.appointments.filter(a => a.status === 'Disetujui').length;
  const pending = appData.appointments.filter(a => a.status === 'Menunggu Konfirmasi').length;
  const checkedIn = appData.appointments.filter(a => a.status === 'Checked-In' || a.status === 'Selesai').length;
  const rejected = appData.appointments.filter(a => a.status === 'Ditolak').length;

  const pillsContainer = document.getElementById('statusSummaryPills');
  if (pillsContainer) {
    pillsContainer.innerHTML = `
      <div class="status-pill-card">
        <span class="status-pill-val" style="color:var(--amber-warning);">${pending}</span>
        <span class="status-pill-lbl">Menunggu Disposisi</span>
      </div>
      <div class="status-pill-card">
        <span class="status-pill-val" style="color:var(--emerald-green);">${approved}</span>
        <span class="status-pill-lbl">Disetujui / Terjadwal</span>
      </div>
      <div class="status-pill-card">
        <span class="status-pill-val" style="color:var(--cyan-glow);">${checkedIn}</span>
        <span class="status-pill-lbl">Kehadiran Fisik</span>
      </div>
      <div class="status-pill-card">
        <span class="status-pill-val" style="color:var(--rose-danger);">${rejected}</span>
        <span class="status-pill-lbl">Ditolak</span>
      </div>
    `;
  }
}

function renderHeatmapMatrix() {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const hours = [
    { label: '08.00 - 09.00', start: 8 },
    { label: '09.00 - 10.00', start: 9 },
    { label: '10.00 - 11.00', start: 10 },
    { label: '11.00 - 12.00', start: 11 },
    { label: '13.00 - 14.00', start: 13 },
    { label: '14.00 - 15.00', start: 14 }
  ];

  const density = Array(hours.length).fill(0).map(() => Array(days.length).fill(0));

  appData.appointments.forEach(app => {
    if ((app.status === 'Disetujui' || app.status === 'Checked-In') && app.scheduledDate && app.scheduledStart) {
      const dateObj = new Date(app.scheduledDate);
      let dayIndex = dateObj.getDay() - 1;
      if (dayIndex >= 0 && dayIndex < 5) {
        const startHour = parseInt(app.scheduledStart.split(':')[0], 10);
        hours.forEach((h, hIdx) => {
          if (startHour === h.start) {
            density[hIdx][dayIndex]++;
          }
        });
      }
    }
  });

  const matrixEl = document.getElementById('heatmapMatrix');
  if (!matrixEl) return;

  let html = '';
  html += `<div class="heat-cell heat-header-cell">Waktu</div>`;
  days.forEach(d => {
    html += `<div class="heat-cell heat-header-cell">${d}</div>`;
  });

  hours.forEach((h, hIdx) => {
    html += `<div class="heat-cell heat-hour-label">${h.label}</div>`;
    days.forEach((d, dIdx) => {
      const count = density[hIdx][dIdx];
      let heatClass = 'heat-0';
      if (count === 1) heatClass = 'heat-1';
      else if (count === 2) heatClass = 'heat-2';
      else if (count >= 3) heatClass = 'heat-3';

      html += `<div class="heat-cell ${heatClass}" title="${days[dIdx]}, ${h.label}: ${count} sesi audiensi">${count > 0 ? count : '-'}</div>`;
    });
  });

  matrixEl.innerHTML = html;
}

// ==========================================================================
// MODAL FOTO FULL & AUTENTIKASI HOST PORTAL
// ==========================================================================
function openFullPhotoModal() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  const fullImg = document.getElementById('photoFullElement');
  const fullTitle = document.getElementById('photoFullTitle');
  
  if (fullImg) fullImg.src = item.photoBase64 || '';
  if (fullTitle) fullTitle.innerText = item.fullName;

  document.getElementById('photoFullModal')?.classList.remove('hidden');
}

function closeFullPhotoModal() {
  document.getElementById('photoFullModal')?.classList.add('hidden');
}

function openAdminLoginModal() {
  document.getElementById('adminLoginModal')?.classList.remove('hidden');
}

function closeAdminLoginModal() {
  document.getElementById('adminLoginModal')?.classList.add('hidden');
}

function handleAdminLogin(e) {
  e.preventDefault();
  const u = document.getElementById('adminUsername').value.trim();
  const p = document.getElementById('adminPassword').value.trim();

  if (u === ADMIN_CREDENTIALS.username && p === ADMIN_CREDENTIALS.password) {
    localStorage.setItem(ADMIN_SESSION_KEY, 'active');
    closeAdminLoginModal();
    updateAuthUIState();
    switchView('admin-portal');
    showToast('Login Berhasil! Selamat datang di Panel Pimpinan.', 'success');
  } else {
    showToast('Username atau kata sandi tidak sesuai.', 'error');
  }
}

function logoutAdmin() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  updateAuthUIState();
  switchView('guest-portal');
  showToast('Telah keluar dari panel pimpinan.', 'info');
}

function updateAuthUIState() {
  const session = localStorage.getItem(ADMIN_SESSION_KEY);
  const label = document.getElementById('adminNavLabel');
  if (label) {
    label.innerText = (session === 'active') ? 'Dashboard Pimpinan' : 'Host Portal';
  }
}

// ==========================================================================
// EKSPOR CSV AMAN & TOAST NOTIFIKASI
// ==========================================================================
function exportDataToCSV() {
  if (appData.appointments.length === 0) {
    showToast('Tidak ada data untuk diekspor.', 'error');
    return;
  }

  const headers = ['Kode Tiket', 'No Surat Resmi', 'Pejabat Penerima', 'Kategori', 'Nama Lengkap', 'Instansi / Identitas', 'WhatsApp', 'Urgensi', 'Tgl Kunjungan', 'Status', 'Ruangan', 'Jam Mulai', 'Jam Selesai', 'Catatan'];
  
  const rows = appData.appointments.map(a => {
    let identityMeta = '-';
    if (a.agencyName) identityMeta = a.agencyName;
    else if (a.parentChildName) identityMeta = `Ortu dari ${a.parentChildName}`;
    else if (a.studentClass) identityMeta = `Siswa Kelas ${a.studentClass} (${a.studentNisn || '-'})`;

    // Sanitasi Cegah Formula Injection di Microsoft Excel (=, +, -, @)
    const sanitize = (text) => {
      if (!text) return '-';
      const str = String(text).replace(/"/g, '""');
      return (/^[=+\-@]/.test(str)) ? `'${str}` : str;
    };

    return [
      `"${sanitize(a.ticketCode)}"`,
      `"${sanitize(a.officialLetterNo)}"`,
      `"${sanitize(a.hostOfficer)}"`,
      `"${sanitize(a.category)}"`,
      `"${sanitize(a.fullName)}"`,
      `"${sanitize(identityMeta)}"`,
      `"${sanitize(a.whatsapp)}"`,
      `"${sanitize(a.urgency)}"`,
      `"${sanitize(a.visitDate || a.requestedDate)}"`,
      `"${sanitize(a.status)}"`,
      `"${sanitize(a.scheduledRoom)}"`,
      `"${sanitize(a.scheduledStart)}"`,
      `"${sanitize(a.scheduledEnd)}"`,
      `"${sanitize(a.approvalMessage || a.rejectionReason)}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.href = encodeURI(csvContent);
  link.download = `Buku_Tamu_SMAN1_Kandangan_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  showToast('Data CSV berhasil diunduh.', 'success');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
