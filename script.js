/**
 * SISTEM BUKU TAMU DIGITAL & E-DISPENSASI TERPADU (SIMTADIK)
 * SMAN 1 KANDANGAN KEDIRI - ENGINE VERSION 11.4
 */

const STORAGE_KEY = 'SMAN1_KANDANGAN_APPOINTMENTS_V11';
const ADMIN_SESSION_KEY = 'SMAN1_ADMIN_AUTH_SESSION';
const THEME_STORAGE_KEY = 'SMAN1_UI_THEME';

const ADMIN_CREDENTIALS = {
  username: 'admin1234',
  password: '1234admin'
};

// Template Resmi Bahasa Birokrasi SMANSAKA
const DEFAULT_APPROVE_TEMPLATE = "Permohonan audiensi disetujui. Harap hadir tepat waktu di lokasi yang telah ditentukan dengan membawa tanda pengenal.";
const DEFAULT_REJECT_TEMPLATE = "Mohon maaf, permohonan audiensi belum dapat dipenuhi sehubungan dengan adanya agenda kedinasan pimpinan pada waktu bersamaan.";

// Master Roster Jam Pelajaran SMAN 1 Kandangan (Format 24 Jam WIB)
const ROSTER_SEKOLAH = [
  { no: 1,  nama: 'Jam ke-1',  mulai: '07:00', selesai: '07:40', tipe: 'belajar' },
  { no: 2,  nama: 'Jam ke-2',  mulai: '07:40', selesai: '08:20', tipe: 'belajar' },
  { no: 3,  nama: 'Jam ke-3',  mulai: '08:20', selesai: '09:00', tipe: 'belajar' },
  { no: 4,  nama: 'Jam ke-4',  mulai: '09:00', selesai: '09:40', tipe: 'belajar' },
  { no: 0,  nama: 'Istirahat 1', mulai: '09:40', selesai: '09:55', tipe: 'istirahat' },
  { no: 5,  nama: 'Jam ke-5',  mulai: '09:55', selesai: '10:35', tipe: 'belajar' },
  { no: 6,  nama: 'Jam ke-6',  mulai: '10:35', selesai: '11:15', tipe: 'belajar' },
  { no: 7,  nama: 'Jam ke-7',  mulai: '11:15', selesai: '11:55', tipe: 'belajar' },
  { no: 0,  nama: 'Istirahat 2 (Ishoma)', mulai: '11:55', selesai: '12:40', tipe: 'istirahat' },
  { no: 8,  nama: 'Jam ke-8',  mulai: '12:40', selesai: '13:20', tipe: 'belajar' },
  { no: 9,  nama: 'Jam ke-9',  mulai: '13:20', selesai: '14:00', tipe: 'belajar' },
  { no: 10, nama: 'Jam ke-10', mulai: '14:00', selesai: '14:40', tipe: 'belajar' },
  { no: 11, nama: 'Jam ke-11', mulai: '14:40', selesai: '15:20', tipe: 'belajar' },
];

// Global State
let appData = {
  appointments: [],
  activeStream: null,
  capturedBase64: null,
  currentWizardStep: 1,
  selectedTicketForAction: null,
  activeLetterTicketCode: null,
  calendarOffsetWeeks: 0,
  activeAdminSubView: 'table',
  liveClockTimer: null
};

// ==========================================================================
// PENGATUR TEMA GELAP / TERANG
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  applyTheme(savedTheme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-theme');
  const newTheme = isLight ? 'dark' : 'light';
  applyTheme(newTheme);
  localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  showToast(`Mode ${newTheme === 'light' ? 'Terang' : 'Gelap'} diaktifkan`, 'info');
}

function applyTheme(theme) {
  const icon = document.getElementById('themeToggleIcon');
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    if (icon) icon.className = 'fa-solid fa-moon';
  } else {
    document.body.classList.remove('light-theme');
    if (icon) icon.className = 'fa-solid fa-sun';
  }
}

// Format Tanggal Indonesia Baku
function formatIndonesianDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  return `${dayNames[d.getDay()]}, ${d.toLocaleDateString('id-ID', dateOptions)}`;
}

// Generator Kode Tiket Dinamis (SMANSAKA-XXXX-XXXXX)
function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  for (let i = 0; i < 4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  let part2 = '';
  for (let i = 0; i < 5; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  return `SMANSAKA-${part1}-${part2}`;
}

// Generator Nomor Surat Dinas Resmi
function generateOfficialLetterNumber(index) {
  const paddedNo = String(index || Math.floor(Math.random() * 800) + 100).padStart(3, '0');
  const currentYear = new Date().getFullYear();
  return `421.3 / ${paddedNo} / 101.6.14 / ${currentYear}`;
}

// Mock Data Awal Simulasi Demo
const INITIAL_MOCK_DATA = [
  {
    ticketCode: 'SMANSAKA-8K9M-2P4Q1',
    category: 'Instansi / Kedinasan',
    targetOfficial: 'Kepala SMAN 1 Kandangan',
    fullName: 'Drs. H. Bambang Soetrisno, M.Pd',
    whatsapp: '081234567890',
    agencyName: 'Cabang Dinas Pendidikan Wilayah Kediri',
    agencyAddress: 'Jl. Jaksa Agung Suprapto No. 2, Kediri',
    studentNisn: null,
    studentClass: null,
    parentChildName: null,
    urgency: 'Penting',
    requestedDate: '2026-09-21',
    purpose: 'Koordinasi teknis penjaminan mutu asesmen pembelajaran semester ganjil.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%2338bdf8"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%232563eb"/></svg>',
    status: 'Disetujui',
    hostOfficer: 'Kepala SMAN 1 Kandangan',
    officialLetterNo: '421.3 / 084 / 101.6.14 / 2026',
    scheduledRoom: 'Ruang Kepala Sekolah',
    scheduledDate: '2026-09-21',
    scheduledStart: '09:00',
    scheduledEnd: '10:30',
    approvalMessage: DEFAULT_APPROVE_TEMPLATE,
    rejectionReason: '',
    checkInAt: null,
    createdAt: '2026-09-18T08:30:00.000Z'
  },
  {
    ticketCode: 'SMANSAKA-4R7Q-9M1K2',
    category: 'Siswa',
    targetOfficial: 'Koordinator Guru BK',
    fullName: 'Muhammad Farhan',
    whatsapp: '085712349988',
    agencyName: null,
    agencyAddress: null,
    studentNisn: '0089123456',
    studentClass: 'X-5',
    parentChildName: null,
    urgency: 'Penting',
    requestedDate: '2026-09-21',
    purpose: 'Konseling peminatan program sains dan pembinaan olimpiade astronomi.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%2310b981"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%23059669"/></svg>',
    status: 'Disetujui',
    hostOfficer: 'Koordinator Guru BK',
    officialLetterNo: null,
    scheduledRoom: 'Ruang Konseling BK',
    scheduledDate: '2026-09-21',
    scheduledStart: '08:20',
    scheduledEnd: '09:40',
    approvalMessage: 'Harap hadir tepat waktu di Ruang BK membawa buku catatan peminatan.',
    rejectionReason: '',
    checkInAt: null,
    createdAt: '2026-09-18T09:15:00.000Z'
  },
  {
    ticketCode: 'SMANSAKA-3L1P-7Q8X9',
    category: 'Orang Tua Murid',
    targetOfficial: 'Waka Bidang Kesiswaan',
    fullName: 'Siti Aminah, S.Pd',
    whatsapp: '081299887766',
    agencyName: null,
    agencyAddress: null,
    studentNisn: null,
    studentClass: null,
    parentChildName: 'Muhammad Farhan (Kelas X-5)',
    urgency: 'Biasa',
    requestedDate: '2026-09-22',
    purpose: 'Konsultasi koordinasi perkembangan akademik ananda Farhan di kelas X-5.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%23f59e0b"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%23d97706"/></svg>',
    status: 'Menunggu Konfirmasi',
    hostOfficer: 'Waka Bidang Kesiswaan',
    officialLetterNo: null,
    scheduledRoom: null,
    scheduledDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    approvalMessage: '',
    rejectionReason: '',
    checkInAt: null,
    createdAt: '2026-09-19T07:45:00.000Z'
  }
];

// Inisialisasi Aplikasi
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadDatabase();
  initializeVisitDateInput();
  updateAuthUIState();

  const urlParams = new URLSearchParams(window.location.search);
  const ticketParam = urlParams.get('ticket');
  if (ticketParam) {
    switchView('tracking-portal');
    const input = document.getElementById('trackTicketCodeInput');
    if (input) {
      input.value = ticketParam;
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
    showToast('Memori penyimpanan lokal penuh.', 'error');
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
  views.forEach(v => document.getElementById(`${v}-view`)?.classList.add('hidden'));

  document.getElementById('tabGuestBtn')?.classList.remove('active');
  document.getElementById('tabTrackBtn')?.classList.remove('active');
  document.getElementById('tabAdminBtn')?.classList.remove('active');

  if (appData.liveClockTimer) {
    clearInterval(appData.liveClockTimer);
    appData.liveClockTimer = null;
  }

  if (viewId === 'guest-portal') {
    document.getElementById('guest-portal-view')?.classList.remove('hidden');
    document.getElementById('tabGuestBtn')?.classList.add('active');
    if (appData.currentWizardStep === 3 && !appData.capturedBase64) startCamera();
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
// SMART ROUTING & VALIDASI WIZARD FORM
// ==========================================================================
function handleCategoryChange() {
  const cat = document.getElementById('guestCategory').value;
  const targetSelect = document.getElementById('targetOfficial');
  const studentBox = document.getElementById('dynamicStudentFields');
  const parentBox = document.getElementById('dynamicParentFields');
  const instansiBox = document.getElementById('dynamicInstansiFields');

  studentBox?.classList.add('hidden');
  parentBox?.classList.add('hidden');
  instansiBox?.classList.add('hidden');

  if (cat === 'Siswa') {
    studentBox?.classList.remove('hidden');
    if (targetSelect) targetSelect.value = 'Koordinator Guru BK';
  } else if (cat === 'Orang Tua Murid') {
    parentBox?.classList.remove('hidden');
    if (targetSelect) targetSelect.value = 'Koordinator Guru BK';
  } else if (cat === 'Instansi / Kedinasan') {
    instansiBox?.classList.remove('hidden');
    if (targetSelect) targetSelect.value = 'Kepala SMAN 1 Kandangan';
  } else {
    if (targetSelect) targetSelect.value = 'Kepala SMAN 1 Kandangan';
  }
}

function goToStep(targetStep) {
  const currentStep = appData.currentWizardStep;

  if (targetStep === 2 && currentStep === 1) {
    if (!validateStep1()) return;
  }
  if (targetStep === 3 && currentStep === 2) {
    if (!validateStep2()) return;
  }
  if (targetStep === 3 && currentStep === 1) {
    if (!validateStep1() || !validateStep2()) return;
  }

  for (let i = 1; i <= 3; i++) {
    document.getElementById(`wizardStep${i}`)?.classList.add('hidden');
    document.getElementById(`stepIndicator${i}`)?.classList.remove('active');
  }

  document.getElementById(`wizardStep${targetStep}`)?.classList.remove('hidden');
  document.getElementById(`stepIndicator${targetStep}`)?.classList.add('active');

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
  const targetOfficial = document.getElementById('targetOfficial').value;
  const fullName = document.getElementById('fullName').value.trim();
  const rawWa = document.getElementById('whatsappNumber').value.trim();

  if (!category) {
    showToast('Pilih kategori pemohon terlebih dahulu.', 'error');
    return false;
  }
  if (!targetOfficial) {
    showToast('Pilih pihak/pejabat yang ingin Anda tuju.', 'error');
    return false;
  }

  if (category === 'Siswa') {
    const nisn = document.getElementById('studentNisn').value.trim();
    const sClass = document.getElementById('studentClass').value.trim();
    if (!nisn || !/^\d{10}$/.test(nisn)) {
      showToast('Harap cantumkan 10 digit NISN siswa yang valid.', 'error');
      return false;
    }
    if (!sClass) {
      showToast('Cantumkan Kelas/Rombel siswa (misal: X-5).', 'error');
      return false;
    }
  } else if (category === 'Orang Tua Murid') {
    const child = document.getElementById('parentChildName').value.trim();
    if (!child || child.length < 3) {
      showToast('Sebutkan nama putra/putri yang Anda wakili.', 'error');
      return false;
    }
  } else if (category === 'Instansi / Kedinasan') {
    const agency = document.getElementById('agencyName').value.trim();
    const addr = document.getElementById('agencyAddress').value.trim();
    if (!agency || agency.length < 3) {
      showToast('Harap cantumkan nama instansi pengirim resmi.', 'error');
      return false;
    }
    if (!addr || addr.length < 5) {
      showToast('Cantumkan alamat lengkap kantor instansi pengirim.', 'error');
      return false;
    }
  }

  if (!fullName || fullName.length < 3) {
    showToast('Harap isi Nama Lengkap sesuai tanda pengenal (minimal 3 karakter).', 'error');
    return false;
  }

  const cleanPhone = rawWa.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 14) {
    showToast('Nomor WhatsApp harus terdiri dari 10 hingga 14 digit angka.', 'error');
    return false;
  }

  return true;
}

function validateStep2() {
  const visitDate = document.getElementById('visitDate').value;
  const purpose = document.getElementById('visitPurpose').value.trim();

  if (!visitDate) {
    showToast('Pilih rencana tanggal kedatangan audiensi.', 'error');
    return false;
  }

  const selectedDate = new Date(visitDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    showToast('Tanggal kunjungan tidak boleh di masa lampau.', 'error');
    return false;
  }

  if (selectedDate.getDay() === 0) {
    showToast('Layanan pimpinan libur pada hari Minggu. Silakan pilih hari kerja.', 'error');
    return false;
  }

  if (!purpose || purpose.length < 10) {
    showToast('Uraian keperluan terlalu singkat (minimal 10 karakter).', 'error');
    return false;
  }

  return true;
}

// ==========================================================================
// ENGINE KAMERA WEBRTC
// ==========================================================================
async function startCamera() {
  const video = document.getElementById('webcamVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const errMsg = document.getElementById('cameraErrMsg');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    placeholder?.classList.remove('hidden');
    if (errMsg) errMsg.innerText = 'Fitur webcam tidak didukung browser ini.';
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
    placeholder?.classList.remove('hidden');
    if (errMsg) errMsg.innerText = 'Izin kamera belum aktif atau tidak ditemukan.';
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

  if (!appData.activeStream || !video || video.videoWidth === 0) {
    synthesizeFallbackPhoto();
    return;
  }

  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, 320, 240);

  const dataURL = canvas.toDataURL('image/jpeg', 0.65);
  appData.capturedBase64 = dataURL;
  if (capturedImg) capturedImg.src = dataURL;

  document.getElementById('cameraPreviewContainer')?.classList.add('hidden');
  document.getElementById('capturedResultContainer')?.classList.remove('hidden');
  document.getElementById('snapPhotoBtn')?.classList.add('hidden');
  document.getElementById('retakePhotoBtn')?.classList.remove('hidden');

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
  showToast('Simulasi biometrik wajah dimuat.', 'info');
}

// ==========================================================================
// KALKULATOR JAM PELAJARAN (E-DISPENSASI KELAS)
// ==========================================================================
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function hitungDispensasiPelajaran(startStr, endStr) {
  const startMin = timeToMinutes(startStr);
  const endMin = timeToMinutes(endStr);

  const jamTerpotong = [];
  let totalMenitBelajar = 0;

  ROSTER_SEKOLAH.forEach(sesi => {
    const sesiMulaiMin = timeToMinutes(sesi.mulai);
    const sesiSelesaiMin = timeToMinutes(sesi.selesai);
    const adaIrisan = (startMin < sesiSelesaiMin && endMin > sesiMulaiMin);

    if (adaIrisan && sesi.tipe === 'belajar') {
      jamTerpotong.push(sesi.no);
      const awal = Math.max(startMin, sesiMulaiMin);
      const akhir = Math.min(endMin, sesiSelesaiMin);
      totalMenitBelajar += (akhir - awal);
    }
  });

  let labelJam = '-';
  if (jamTerpotong.length === 1) {
    labelJam = `Jam Pelajaran ke-${jamTerpotong[0]}`;
  } else if (jamTerpotong.length > 1) {
    labelJam = `Jam Pelajaran ke-${jamTerpotong[0]} s.d. ke-${jamTerpotong[jamTerpotong.length - 1]}`;
  } else {
    labelJam = `Waktu Istirahat (Bukan Jam Belajar)`;
  }

  return {
    isKenaJamPelajaran: jamTerpotong.length > 0,
    daftarJam: jamTerpotong,
    labelJamPelajaran: labelJam,
    totalMenitEfektif: totalMenitBelajar
  };
}

// ==========================================================================
// SUBMISSION & PELACAKAN TIKET
// ==========================================================================
function handleFormSubmission(e) {
  e.preventDefault();

  if (!appData.capturedBase64) {
    showToast('Harap ambil foto wajah Anda sebelum mengirim permohonan.', 'error');
    return;
  }

  const ticketCode = generateTicketCode();

  const category = document.getElementById('guestCategory').value;
  const targetOfficial = document.getElementById('targetOfficial').value;
  const fullName = document.getElementById('fullName').value.trim();
  const whatsapp = document.getElementById('whatsappNumber').value.trim();
  const visitDate = document.getElementById('visitDate').value;
  const urgency = document.getElementById('urgencyLevel').value;
  const purpose = document.getElementById('visitPurpose').value.trim();

  const studentNisn = document.getElementById('studentNisn')?.value.trim() || null;
  const studentClass = document.getElementById('studentClass')?.value.trim() || null;
  const parentChildName = document.getElementById('parentChildName')?.value.trim() || null;
  const agencyName = document.getElementById('agencyName')?.value.trim() || null;
  const agencyAddress = document.getElementById('agencyAddress')?.value.trim() || null;

  const newAppointment = {
    ticketCode,
    category,
    targetOfficial,
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
    hostOfficer: targetOfficial,
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

  document.getElementById('modalTicketCode').innerText = ticketCode;
  document.getElementById('modalSummaryName').innerText = fullName;
  document.getElementById('modalSummaryOfficial').innerText = targetOfficial;
  document.getElementById('modalSummaryDate').innerText = visitDate;
  document.getElementById('modalSummaryPhone').innerText = whatsapp;
  document.getElementById('ticketSuccessModal')?.classList.remove('hidden');

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
    showToast('Kode tiket SMANSAKA berhasil disalin!', 'success');
  });
}

function formatToWhatsApp(phone) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.substring(1);
  else if (!clean.startsWith('62')) clean = '62' + clean;
  return clean;
}

function trackTicketStatus() {
  const code = document.getElementById('trackTicketCodeInput').value.trim().toUpperCase();
  const resultBox = document.getElementById('trackerResultBox');

  if (appData.liveClockTimer) {
    clearInterval(appData.liveClockTimer);
    appData.liveClockTimer = null;
  }

  if (!code) {
    showToast('Masukkan kode tiket SMANSAKA Anda.', 'error');
    return;
  }

  const found = appData.appointments.find(a => a.ticketCode === code);
  if (!found) {
    resultBox.innerHTML = `
      <div class="collision-alert">
        <i class="fa-solid fa-circle-xmark"></i>
        <div>
          <strong>Tiket Tidak Ditemukan</strong>
          <p>Pastikan kode tiket yang dimasukkan sesuai (Contoh: SMANSAKA-XXXX-XXXXX).</p>
        </div>
      </div>
    `;
    resultBox.classList.remove('hidden');
    return;
  }

  // 1. KATEGORI SISWA: TAMPILKAN KARTU E-DISPENSASI LENGKAP TANGGAL & CATATAN
  if (found.category === 'Siswa') {
    if (found.status === 'Disetujui' || found.status === 'Checked-In') {
      const dispen = hitungDispensasiPelajaran(found.scheduledStart, found.scheduledEnd);
      const tanggalIzin = formatIndonesianDate(found.scheduledDate || found.visitDate);

      resultBox.innerHTML = `
        <div class="edispen-card">
          <div class="edispen-header">
            <div class="edispen-brand">
              <i class="fa-solid fa-graduation-cap"></i> E-DISPENSASI SMAN 1 KANDANGAN
            </div>
            <div class="edispen-live-clock" id="liveDispenClock">Memuat jam...</div>
          </div>
          
          <div class="edispen-body">
            <h3 class="edispen-student-name">${escapeHtml(found.fullName)}</h3>
            <div class="edispen-student-class">
              Kelas: <strong>${escapeHtml(found.studentClass || '-')}</strong> • NISN: ${escapeHtml(found.studentNisn || '-')}
            </div>

            <div class="edispen-date-row">
              <i class="fa-solid fa-calendar-day"></i> ${tanggalIzin}
            </div>
            
            <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.4rem;">
              Tujuan Audiensi: <strong style="color:#fff;">${escapeHtml(found.hostOfficer || 'Guru BK')}</strong> (${escapeHtml(found.scheduledRoom || 'Ruang BK')})
            </div>

            <div class="edispen-highlight-box">
              <div class="edispen-period-title">
                <i class="fa-solid fa-bell"></i> ${dispen.labelJamPelajaran}
              </div>
              <div class="edispen-period-time">
                Waktu: <strong>${found.scheduledStart} s.d. ${found.scheduledEnd} WIB</strong> (${dispen.totalMenitEfektif} Menit Efektif Pembelajaran)
              </div>
            </div>

            <div class="edispen-note-box">
              <span class="edispen-note-label"><i class="fa-solid fa-comment-dots"></i> Catatan Lembar Disposisi:</span>
              <p class="edispen-note-text">"${escapeHtml(found.approvalMessage || 'Disetujui untuk mengikuti sesi bimbingan/audiensi.')}"</p>
            </div>
            
            <p style="font-size:0.75rem; color:var(--text-dim); margin-top:0.4rem; font-style:italic;">
              *Tunjukkan layar ini kepada Guru Mata Pelajaran di kelas sebagai bukti izin resmi meninggalkan pembelajaran.
            </p>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed rgba(255,255,255,0.18); padding-top:0.75rem; margin-top:0.5rem;">
            <span class="edispen-status-pill status-active-pulse">
              <i class="fa-solid fa-circle-check"></i> IZIN SAH DIGITAL
            </span>
            <span style="font-size:0.74rem; color:var(--text-dim); font-family:monospace;">
              ${found.ticketCode}
            </span>
          </div>
        </div>
      `;
      startLiveDispenClock();
    } else {
      resultBox.innerHTML = renderStandardStatusCard(found);
    }
  } 
  // 2. KATEGORI KEDINASAN: TOMBOL CETAK SURAT RESMI
  else if (found.category === 'Instansi / Kedinasan') {
    let letterBtn = '';
    if (found.status === 'Disetujui' || found.status === 'Checked-In') {
      letterBtn = `
        <div style="margin-top:1.2rem; text-align:center;">
          <button type="button" class="btn btn-primary btn-block" onclick="openOfficialLetterModal('${found.ticketCode}')">
            <i class="fa-solid fa-file-pdf"></i> Unduh / Cetak Surat Undangan Resmi Berkop
          </button>
        </div>
      `;
    }
    resultBox.innerHTML = renderStandardStatusCard(found) + letterBtn;
  } 
  // 3. KATEGORI ORANG TUA / UMUM
  else {
    resultBox.innerHTML = renderStandardStatusCard(found);
  }

  resultBox.classList.remove('hidden');
}

function renderStandardStatusCard(found) {
  let noteHTML = '';
  if (found.status === 'Disetujui' || found.status === 'Checked-In') {
    const msg = (found.approvalMessage && found.approvalMessage.trim()) || DEFAULT_APPROVE_TEMPLATE;
    noteHTML = `
      <div style="margin-top:1rem; padding:0.8rem 1rem; background:rgba(56, 189, 248, 0.08); border-left:3px solid var(--cyan-glow); border-radius:6px;">
        <span style="font-size:0.75rem; color:var(--cyan-glow); font-weight:700; display:block;">CATATAN RESMI PIMPINAN:</span>
        <p style="font-size:0.86rem; color:#fff; font-style:italic; margin-top:0.25rem;">"${escapeHtml(msg)}"</p>
      </div>
    `;
  } else if (found.status === 'Ditolak') {
    const rej = (found.rejectionReason && found.rejectionReason.trim()) || DEFAULT_REJECT_TEMPLATE;
    noteHTML = `
      <div style="margin-top:1rem; padding:0.8rem 1rem; background:rgba(239, 68, 68, 0.08); border-left:3px solid var(--rose-danger); border-radius:6px;">
        <span style="font-size:0.75rem; color:#FCA5A5; font-weight:700; display:block;">ALASAN PENOLAKAN:</span>
        <p style="font-size:0.86rem; color:#FCA5A5; font-style:italic; margin-top:0.25rem;">"${escapeHtml(rej)}"</p>
      </div>
    `;
  }

  let extraIdentity = '';
  if (found.agencyName) extraIdentity = `<p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Instansi: <strong style="color:#fff;">${escapeHtml(found.agencyName)}</strong></p>`;
  if (found.parentChildName) extraIdentity = `<p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Orang Tua dari: <strong style="color:#fff;">${escapeHtml(found.parentChildName)}</strong></p>`;

  const tanggalKunjungan = formatIndonesianDate(found.scheduledDate || found.visitDate);

  return `
    <div class="glass-card" style="padding:1.4rem; margin-top:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem;">
        <span style="font-weight:800; color:var(--cyan-glow); font-size:1.1rem;">${found.ticketCode}</span>
        <span class="badge ${getBadgeClass(found.status)}">${found.status}</span>
      </div>
      <div style="display:flex; gap:1rem; align-items:center;">
        <img src="${found.photoBase64 || ''}" alt="Foto Tamu" style="width:56px; height:56px; border-radius:8px; object-fit:cover; border:1px solid var(--border-subtle); flex-shrink:0;">
        <div>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Pemohon: <strong style="color:#fff;">${escapeHtml(found.fullName)}</strong></p>
          ${extraIdentity}
          <p style="font-size:0.85rem; color:var(--cyan-glow); margin:0;">Tujuan: <strong>${escapeHtml(found.hostOfficer || found.targetOfficial)}</strong></p>
          <p style="font-size:0.8rem; color:var(--text-dim); margin-top:0.2rem;"><i class="fa-solid fa-calendar"></i> Tanggal: ${tanggalKunjungan}</p>
        </div>
      </div>
      ${found.scheduledRoom ? `<p style="font-size:0.85rem; color:var(--emerald-green); margin-top:0.65rem; font-weight:700;"><i class="fa-solid fa-clock"></i> Jadwal: ${found.scheduledRoom} (${found.scheduledStart} -${found.scheduledEnd} WIB)</p>` : ''}
      ${noteHTML}
    </div>
  `;
}

function startLiveDispenClock() {
  const updateClock = () => {
    const clock = document.getElementById('liveDispenClock');
    if (clock) {
      const now = new Date();
      clock.innerText = now.toLocaleTimeString('id-ID', { hour12: false }) + ' WIB';
    }
  };
  updateClock();
  appData.liveClockTimer = setInterval(updateClock, 1000);
}

// ==========================================================================
// ADMIN DASHBOARD & DISPOSISI
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
  if (filter !== 'ALL') list = list.filter(item => item.status === filter);
  if (searchInput) {
    list = list.filter(item => 
      item.fullName.toLowerCase().includes(searchInput) ||
      item.ticketCode.toLowerCase().includes(searchInput) ||
      (item.agencyName && item.agencyName.toLowerCase().includes(searchInput)) ||
      (item.parentChildName && item.parentChildName.toLowerCase().includes(searchInput))
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-dim);">Tidak ada data permohonan antrean.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const cleanPhone = formatToWhatsApp(item.whatsapp);
    const waMsg = `Halo Bapak/Ibu ${item.fullName}, permohonan audiensi Anda di SMAN 1 Kandangan [Tiket: ${item.ticketCode}] status: ${item.status}. Cek status: ${window.location.origin}${window.location.pathname}?ticket=${item.ticketCode}`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

    let scheduleDisplay = '<span style="color:var(--text-dim);">-</span>';
    if (item.scheduledRoom) {
      scheduleDisplay = `
        <span class="table-host-tag">${escapeHtml(item.hostOfficer || item.targetOfficial)}</span><br>
        <strong style="color:var(--text-main); font-size:0.82rem;">${item.scheduledRoom}</strong><br>
        <small style="color:var(--cyan-glow);">${item.scheduledDate} (${item.scheduledStart} - ${item.scheduledEnd} WIB)</small>
      `;
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
        <button class="btn btn-primary btn-sm" onclick="openScheduleModal('${item.ticketCode}')" title="Disposisi Pimpinan">
          <i class="fa-solid fa-calendar-check"></i>
        </button>
      `;
    } else if (item.status === 'Disetujui') {
      actionButtons = `
        <button class="btn btn-emerald btn-sm" onclick="executeCheckIn('${item.ticketCode}')" title="Check-In Kedatangan">
          <i class="fa-solid fa-user-check"></i>
        </button>
        ${item.category === 'Instansi / Kedinasan' ? `
          <button class="btn btn-outline btn-sm" onclick="openOfficialLetterModal('${item.ticketCode}')" title="Cetak Surat Dinas">
            <i class="fa-solid fa-file-pdf"></i>
          </button>
        ` : ''}
        <a href="${waUrl}" target="_blank" class="btn btn-outline btn-sm" style="color:#22c55e;" title="Kirim Pesan WhatsApp">
          <i class="fa-brands fa-whatsapp"></i>
        </a>
      `;
    } else if (item.status === 'Checked-In') {
      actionButtons = `
        <button class="btn btn-outline btn-sm" onclick="executeComplete('${item.ticketCode}')" title="Selesai">
          <i class="fa-solid fa-flag-checkered"></i>
        </button>
      `;
    }

    actionButtons += `
      <button class="btn btn-danger btn-sm" onclick="deleteAppointment('${item.ticketCode}')" title="Hapus Data Ini" style="margin-left:0.25rem;">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;

    return `
      <tr>
        <td><strong style="color:var(--cyan-glow); font-size:0.84rem;">${item.ticketCode}</strong></td>
        <td>
          <strong style="overflow-wrap:anywhere;">${escapeHtml(item.fullName)}</strong>
          <br>
          <a href="${waUrl}" target="_blank" class="wa-link"><i class="fa-brands fa-whatsapp"></i> ${item.whatsapp}</a>
        </td>
        <td>
          <span style="font-size:0.82rem; font-weight:700;">${item.category}</span><br>
          <small style="color:var(--text-muted);"><i class="fa-solid fa-arrow-right"></i> ${escapeHtml(item.targetOfficial)}</small>
        </td>
        <td>
          <span style="font-size:0.82rem;">${item.visitDate || item.requestedDate}</span><br>
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
// MODAL DISPOSISI & PENJADWALAN RUANGAN
// ==========================================================================
function openScheduleModal(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  appData.selectedTicketForAction = ticketCode;

  document.getElementById('scheduleModalTicketPill').innerText = `Tiket: ${item.ticketCode}`;
  document.getElementById('schedModalName').innerText = item.fullName;
  document.getElementById('schedModalCategoryMeta').innerText = `${item.category} • Tujuan: ${item.targetOfficial}`;
  document.getElementById('schedModalPurpose').innerText = `"${item.purpose}"`;

  const modalPhoto = document.getElementById('schedModalPhoto');
  if (modalPhoto) modalPhoto.src = item.photoBase64 || '';

  // Logika Khusus Siswa: Sembunyikan Nomor Surat Dinas!
  const isStudent = (item.category === 'Siswa');
  const groupApprove = document.getElementById('letterNoGroupApprove');
  const groupDelegate = document.getElementById('letterNoGroupDelegate');
  const noticeApprove = document.getElementById('studentNoticeApprove');
  const noticeDelegate = document.getElementById('studentNoticeDelegate');

  if (isStudent) {
    groupApprove?.classList.add('hidden');
    groupDelegate?.classList.add('hidden');
    noticeApprove?.classList.remove('hidden');
    noticeDelegate?.classList.remove('hidden');
  } else {
    groupApprove?.classList.remove('hidden');
    groupDelegate?.classList.remove('hidden');
    noticeApprove?.classList.add('hidden');
    noticeDelegate?.classList.add('hidden');
  }

  const autoLetterNo = item.officialLetterNo || generateOfficialLetterNumber(appData.appointments.indexOf(item) + 1);
  document.getElementById('schedLetterNoApprove').value = isStudent ? '' : autoLetterNo;
  document.getElementById('schedLetterNoDelegate').value = isStudent ? '' : autoLetterNo;

  document.getElementById('schedRoom').value = item.scheduledRoom || 'Ruang Kepala Sekolah';
  document.getElementById('schedDate').value = item.scheduledDate || item.visitDate;
  document.getElementById('schedStartTime').value = item.scheduledStart || '09:00';
  document.getElementById('schedEndTime').value = item.scheduledEnd || '10:00';

  document.getElementById('schedDelegateDate').value = item.scheduledDate || item.visitDate;
  if (item.targetOfficial && item.targetOfficial !== 'Kepala SMAN 1 Kandangan') {
    document.getElementById('schedDelegateHost').value = item.targetOfficial;
  }
  handleDelegateHostChange();

  document.getElementById('schedApprovalNotes').value = item.approvalMessage || DEFAULT_APPROVE_TEMPLATE;
  document.getElementById('schedDelegateNotes').value = item.approvalMessage || (isStudent ? 'Disetujui untuk sesi bimbingan konseling di ruang BK.' : DEFAULT_APPROVE_TEMPLATE);
  document.getElementById('schedRejectionReason').value = item.rejectionReason || DEFAULT_REJECT_TEMPLATE;

  if (item.targetOfficial === 'Kepala SMAN 1 Kandangan') {
    switchActionTab('approve');
  } else {
    switchActionTab('delegate');
  }

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
  
  if (host === 'Koordinator Guru BK') roomSelect.value = 'Ruang Konseling BK';
  else if (host === 'Waka Bidang Kesiswaan') roomSelect.value = 'Ruang Waka Kesiswaan';
  else if (host === 'Waka Bidang Kurikulum') roomSelect.value = 'Ruang Waka Kurikulum';
  else if (host === 'Waka Bidang Sarpras' || host === 'Waka Bidang Humas') roomSelect.value = 'Ruang Waka Humas & Sarpras';
  else if (host === 'Tata Usaha') roomSelect.value = 'Ruang Tata Usaha';
  else roomSelect.value = 'Ruang Tamu Khusus Lobi';
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
  }
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
    if (alertMsg) alertMsg.innerText = 'Jam mulai harus lebih awal daripada jam selesai!';
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }

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
    if (alertMsg) alertMsg.innerText = `Ruangan "${room}" telah dipesan untuk [${conflict.fullName}] jam ${conflict.scheduledStart} - ${conflict.scheduledEnd} WIB!`;
    if (confirmBtn) confirmBtn.disabled = true;
  } else {
    alertBox?.classList.add('hidden');
    if (confirmBtn) confirmBtn.disabled = false;
  }
}

function executeApprove() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  const isStudent = (item.category === 'Siswa');
  item.approvalMessage = document.getElementById('schedApprovalNotes').value.trim() || DEFAULT_APPROVE_TEMPLATE;
  item.officialLetterNo = isStudent ? null : (document.getElementById('schedLetterNoApprove').value.trim() || generateOfficialLetterNumber());
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
  showToast(`Janji temu [${item.ticketCode}] disetujui Kepala Sekolah!`, 'success');
}

function executeDelegate() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  const isStudent = (item.category === 'Siswa');
  const targetHost = document.getElementById('schedDelegateHost').value;
  item.hostOfficer = targetHost;
  item.officialLetterNo = isStudent ? null : (document.getElementById('schedLetterNoDelegate').value.trim() || generateOfficialLetterNumber());
  item.approvalMessage = document.getElementById('schedDelegateNotes').value.trim() || `Disetujui untuk audiensi bersama ${targetHost}.`;
  item.status = 'Disetujui';
  item.scheduledRoom = document.getElementById('schedDelegateRoom').value;
  item.scheduledDate = document.getElementById('schedDelegateDate').value;
  item.scheduledStart = document.getElementById('schedDelegateStartTime').value;
  item.scheduledEnd = document.getElementById('schedDelegateEndTime').value;
  item.rejectionReason = '';

  saveDatabase();
  renderAdminDashboard();
  closeScheduleModal();
  showToast(`Audiensi [${item.ticketCode}] didelegasikan ke ${targetHost}!`, 'success');
}

function executeReject() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  item.status = 'Ditolak';
  item.rejectionReason = document.getElementById('schedRejectionReason').value.trim() || DEFAULT_REJECT_TEMPLATE;

  saveDatabase();
  renderAdminDashboard();
  closeScheduleModal();
  showToast(`Permohonan [${item.ticketCode}] ditolak secara resmi.`, 'info');
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
  showToast(`Audiensi [${item.ticketCode}] dinyatakan selesai.`, 'success');
}

function deleteAppointment(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  if (confirm(`Hapus antrean tiket [${ticketCode}] atas nama ${item.fullName}?`)) {
    appData.appointments = appData.appointments.filter(a => a.ticketCode !== ticketCode);
    saveDatabase();
    renderAdminDashboard();
    showToast(`Data tiket [${ticketCode}] telah dihapus.`, 'info');
  }
}

// ==========================================================================
// CADANGKAN & PULIHKAN DATA JSON
// ==========================================================================
function backupDataToJSON() {
  if (appData.appointments.length === 0) {
    showToast('Belum ada data untuk dicadangkan.', 'error');
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData.appointments, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `Backup_SIMTADIK_SMANSAKA_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast('File cadangan JSON berhasil diunduh!', 'success');
}

function triggerRestoreJSON() {
  document.getElementById('jsonFileInput')?.click();
}

function handleJSONFileRestore(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed)) {
        appData.appointments = parsed;
        saveDatabase();
        renderAdminDashboard();
        showToast('Data berhasil dipulihkan dari file JSON!', 'success');
      } else {
        showToast('Format JSON tidak sesuai struktur aplikasi.', 'error');
      }
    } catch (err) {
      showToast('Gagal membaca file JSON.', 'error');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ==========================================================================
// MODAL SURAT RESMI BERKOP DINAS (PERSIS FOTO 1 & 2)
// ==========================================================================
function openOfficialLetterModal(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  appData.activeLetterTicketCode = ticketCode;

  document.getElementById('docLetterNo').innerText = item.officialLetterNo || generateOfficialLetterNumber();
  const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  
  // Sesuai Foto 2: "Kandangan, [Tanggal]"
  document.getElementById('docLetterDate').innerText = `Kandangan, ${new Date().toLocaleDateString('id-ID', dateOptions)}`;
  document.getElementById('signPlaceDate').innerText = `Kandangan, ${new Date().toLocaleDateString('id-ID', dateOptions)}`;

  document.getElementById('docGuestName').innerText = item.fullName;
  document.getElementById('docGuestAgency').innerText = item.agencyName ? `${item.agencyName} (${item.agencyAddress || '-'})` : 'Mitra SMAN 1 Kandangan';
  document.getElementById('docTicketCode').innerText = item.ticketCode;

  const schedDay = formatIndonesianDate(item.scheduledDate || item.visitDate);
  document.getElementById('docScheduleDateDay').innerText = schedDay;
  document.getElementById('docScheduleTime').innerText = `${item.scheduledStart || '09:00'} s.d. ${item.scheduledEnd || '10:00'} WIB`;
  document.getElementById('docScheduleRoom').innerText = item.scheduledRoom || 'Ruang Pimpinan SMAN 1 Kandangan';
  document.getElementById('docHostOfficer').innerText = item.hostOfficer || 'Kepala SMAN 1 Kandangan';
  document.getElementById('docPurpose').innerText = item.purpose;
  document.getElementById('docHostNotes').innerText = `"${item.approvalMessage || DEFAULT_APPROVE_TEMPLATE}"`;

  // Tanda Tangan & Data Kepala Sekolah (Persis Foto 2)
  const isDelegated = item.hostOfficer && item.hostOfficer !== 'Kepala SMAN 1 Kandangan';
  const roleTitleEl = document.getElementById('signRoleTitle');
  const officerNameEl = document.getElementById('signOfficerName');
  const officerRankEl = document.getElementById('signOfficerRank');
  const officerNipEl = document.getElementById('signOfficerNip');

  if (isDelegated) {
    if (roleTitleEl) roleTitleEl.innerHTML = `a.n. Kepala Sekolah<br><strong style="font-size:10pt;">${escapeHtml(item.hostOfficer)}</strong>`;
    if (officerNameEl) officerNameEl.innerHTML = '<strong>Tim Layanan Disposisi</strong>';
    if (officerRankEl) officerRankEl.innerText = 'SMAN 1 Kandangan';
    if (officerNipEl) officerNipEl.innerText = 'Kabupaten Kediri';
  } else {
    if (roleTitleEl) roleTitleEl.innerText = 'Kepala Sekolah,';
    if (officerNameEl) officerNameEl.innerHTML = '<strong>ISTU HANDAYANI, M.Pd</strong>';
    if (officerRankEl) officerRankEl.innerText = 'Pembina, IV/a';
    if (officerNipEl) officerNipEl.innerText = 'NIP 19760801 200501 2 009';
  }

  // QR Code Dinamis
  const verifyUrl = `${window.location.origin}${window.location.pathname}?ticket=${item.ticketCode}`;
  const qrBox = document.getElementById('letterQrContainer');
  if (qrBox) {
    qrBox.innerHTML = `
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(verifyUrl)}" 
           alt="QR Verifikasi" style="width:85px; height:85px; border:1px solid #cbd5e1; padding:2px; background:#fff;">
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
// KALENDER MINGGUAN & HEATMAP ANALITIK
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
  if (label) label.innerText = `Minggu: ${monday.toLocaleDateString('id-ID', options)} - ${saturday.toLocaleDateString('id-ID', options)}`;

  let html = '';
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 6; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);
    const dateISO = currentDay.toISOString().split('T')[0];
    const isToday = (dateISO === todayStr);

    const dayApps = appData.appointments.filter(a => (a.scheduledDate === dateISO || a.requestedDate === dateISO) && (a.status === 'Disetujui' || a.status === 'Checked-In'));

    let eventsHTML = '';
    if (dayApps.length === 0) {
      eventsHTML = `<div class="cal-empty-day">Tidak ada audiensi</div>`;
    } else {
      eventsHTML = dayApps.map(app => `
        <div class="cal-event-card ${app.urgency === 'Mendesak' ? 'urgent' : ''}" onclick="openScheduleModal('${app.ticketCode}')">
          <span class="cal-event-time"><i class="fa-regular fa-clock"></i> ${app.scheduledStart || '09:00'} - ${app.scheduledEnd || '10:00'} WIB</span>
          <div class="cal-event-title">${escapeHtml(app.fullName)}</div>
          <div class="cal-event-room"><i class="fa-solid fa-user-tie"></i> ${app.hostOfficer || 'Kepala Sekolah'}</div>
        </div>
      `).join('');
    }

    html += `
      <div class="calendar-day-col ${isToday ? 'is-today' : ''}">
        <div class="cal-col-header">
          <span class="cal-day-name">${dayNames[i]}</span>
          <span class="cal-day-date">${currentDay.getDate()}</span>
        </div>
        <div class="cal-events-list">${eventsHTML}</div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

function renderAnalyticsAndHeatmap() {
  const total = appData.appointments.length;
  const categories = ['Siswa', 'Guru/Staf', 'Orang Tua Murid', 'Instansi / Kedinasan', 'Umum'];
  const counts = {};
  categories.forEach(c => counts[c] = 0);

  appData.appointments.forEach(a => {
    if (counts[a.category] !== undefined) counts[a.category]++;
    else counts['Umum']++;
  });

  const bars = document.getElementById('categoryBarsContainer');
  if (bars) {
    bars.innerHTML = categories.map(cat => {
      const count = counts[cat];
      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div class="cat-bar-item">
          <div class="cat-bar-labels">
            <span>${cat}</span>
            <span style="color:var(--cyan-glow);">${count} (${percent}%)</span>
          </div>
          <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${percent}%;"></div></div>
        </div>
      `;
    }).join('');
  }

  const approved = appData.appointments.filter(a => a.status === 'Disetujui').length;
  const pending = appData.appointments.filter(a => a.status === 'Menunggu Konfirmasi').length;
  const checkedIn = appData.appointments.filter(a => a.status === 'Checked-In' || a.status === 'Selesai').length;
  const rejected = appData.appointments.filter(a => a.status === 'Ditolak').length;

  const pills = document.getElementById('statusSummaryPills');
  if (pills) {
    pills.innerHTML = `
      <div class="status-pill-card"><span class="status-pill-val" style="color:var(--amber-warning);">${pending}</span><span class="status-pill-lbl">Menunggu Disposisi</span></div>
      <div class="status-pill-card"><span class="status-pill-val" style="color:var(--emerald-green);">${approved}</span><span class="status-pill-lbl">Disetujui / Terjadwal</span></div>
      <div class="status-pill-card"><span class="status-pill-val" style="color:var(--cyan-glow);">${checkedIn}</span><span class="status-pill-lbl">Kehadiran Lobi</span></div>
      <div class="status-pill-card"><span class="status-pill-val" style="color:var(--rose-danger);">${rejected}</span><span class="status-pill-lbl">Ditolak</span></div>
    `;
  }

  renderHeatmapMatrix();
}

function renderHeatmapMatrix() {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
  const hours = [
    { label: '07.00 - 08.20', start: 7 },
    { label: '08.20 - 09.40', start: 8 },
    { label: '09.55 - 11.15', start: 9 },
    { label: '11.15 - 12.40', start: 11 },
    { label: '12.40 - 14.00', start: 12 },
    { label: '14.00 - 15.20', start: 14 }
  ];

  const density = Array(hours.length).fill(0).map(() => Array(days.length).fill(0));

  appData.appointments.forEach(app => {
    if ((app.status === 'Disetujui' || app.status === 'Checked-In') && app.scheduledDate && app.scheduledStart) {
      const dayIndex = new Date(app.scheduledDate).getDay() - 1;
      if (dayIndex >= 0 && dayIndex < 5) {
        const startHour = parseInt(app.scheduledStart.split(':')[0], 10);
        hours.forEach((h, hIdx) => {
          if (startHour >= h.start && startHour < h.start + 2) density[hIdx][dayIndex]++;
        });
      }
    }
  });

  const matrixEl = document.getElementById('heatmapMatrix');
  if (!matrixEl) return;

  let html = `<div class="heat-cell heat-header-cell">Waktu</div>`;
  days.forEach(d => html += `<div class="heat-cell heat-header-cell">${d}</div>`);

  hours.forEach((h, hIdx) => {
    html += `<div class="heat-cell heat-hour-label">${h.label}</div>`;
    days.forEach((d, dIdx) => {
      const count = density[hIdx][dIdx];
      let heatClass = count === 1 ? 'heat-1' : count === 2 ? 'heat-2' : count >= 3 ? 'heat-3' : 'heat-0';
      html += `<div class="heat-cell ${heatClass}">${count > 0 ? count : '-'}</div>`;
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
    showToast('Username atau password tidak valid.', 'error');
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
    showToast('Tidak ada data antrean.', 'error');
    return;
  }

  const headers = ['Kode Tiket', 'No Surat Resmi', 'Kategori', 'Pihak Dituju', 'Nama Pemohon', 'Kontak WhatsApp', 'Urgensi', 'Tgl Pelaksanaan', 'Status', 'Ruangan', 'Waktu Mulai', 'Waktu Selesai'];
  const rows = appData.appointments.map(a => {
    const sanitize = (txt) => {
      if (!txt) return '-';
      const str = String(txt).replace(/"/g, '""');
      return (/^[=+\-@]/.test(str)) ? `'${str}` : str;
    };
    return [
      `"${sanitize(a.ticketCode)}"`,
      `"${sanitize(a.officialLetterNo)}"`,
      `"${sanitize(a.category)}"`,
      `"${sanitize(a.hostOfficer || a.targetOfficial)}"`,
      `"${sanitize(a.fullName)}"`,
      `"${sanitize(a.whatsapp)}"`,
      `"${sanitize(a.urgency)}"`,
      `"${sanitize(a.scheduledDate || a.visitDate)}"`,
      `"${sanitize(a.status)}"`,
      `"${sanitize(a.scheduledRoom)}"`,
      `"${sanitize(a.scheduledStart)}"`,
      `"${sanitize(a.scheduledEnd)}"`
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.href = encodeURI(csvContent);
  link.download = `Data_SIMTADIK_SMANSAKA_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  showToast('Rekapitulasi CSV berhasil diunduh.', 'success');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = (type === 'success') ? 'fa-circle-check' : (type === 'error') ? 'fa-circle-exclamation' : 'fa-circle-info';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
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

// Window Binding Global
window.toggleTheme = toggleTheme;
window.switchView = switchView;
window.handleAdminNavClick = handleAdminNavClick;
window.handleCategoryChange = handleCategoryChange;
window.goToStep = goToStep;
window.startCamera = startCamera;
window.takePhoto = takePhoto;
window.retakePhoto = retakePhoto;
window.handleFormSubmission = handleFormSubmission;
window.closeTicketModal = closeTicketModal;
window.copyModalTicketCode = copyModalTicketCode;
window.trackTicketStatus = trackTicketStatus;
window.switchAdminSubView = switchAdminSubView;
window.renderAdminQueueTable = renderAdminQueueTable;
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.handleDelegateHostChange = handleDelegateHostChange;
window.switchActionTab = switchActionTab;
window.runLiveCollisionCheck = runLiveCollisionCheck;
window.executeApprove = executeApprove;
window.executeDelegate = executeDelegate;
window.executeReject = executeReject;
window.executeCheckIn = executeCheckIn;
window.executeComplete = executeComplete;
window.deleteAppointment = deleteAppointment;
window.backupDataToJSON = backupDataToJSON;
window.triggerRestoreJSON = triggerRestoreJSON;
window.handleJSONFileRestore = handleJSONFileRestore;
window.openOfficialLetterModal = openOfficialLetterModal;
window.closeOfficialLetterModal = closeOfficialLetterModal;
window.printOfficialLetter = printOfficialLetter;
window.changeCalendarWeek = changeCalendarWeek;
window.resetCalendarToCurrentWeek = resetCalendarToCurrentWeek;
window.openFullPhotoModal = openFullPhotoModal;
window.closeFullPhotoModal = closeFullPhotoModal;
window.openAdminLoginModal = openAdminLoginModal;
window.closeAdminLoginModal = closeAdminLoginModal;
window.handleAdminLogin = handleAdminLogin;
window.logoutAdmin = logoutAdmin;
window.exportDataToCSV = exportDataToCSV;
window.resetAllData = resetAllData;
