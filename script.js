/**
 * SISTEM BUKU TAMU DIGITAL & PENJADWALAN JANJI TEMU SEKOLAH
 * SMAN 1 KANDANGAN KEDIRI - ENGINE VERSION 9.0 (WITH TIMELINE CALENDAR & HEATMAP)
 */

const STORAGE_KEY = 'SMAN1_KANDANGAN_APPOINTMENTS_V9';
const ADMIN_SESSION_KEY = 'SMAN1_ADMIN_AUTH_SESSION';

const ADMIN_CREDENTIALS = {
  username: 'admin1234',
  password: '1234admin'
};

// Template Respon Kepala Sekolah
const DEFAULT_APPROVE_TEMPLATE = "Baik, saya tunggu 😊";
const DEFAULT_REJECT_TEMPLATE = "Mohon maaf, pada waktu tersebut berbenturan dengan agenda kedinasan luar sekolah 🙏";

// Global State
let appData = {
  appointments: [],
  activeStream: null,
  capturedBase64: null,
  currentWizardStep: 1,
  selectedTicketForAction: null,
  calendarOffsetWeeks: 0,
  activeAdminSubView: 'table'
};

// Mock Data Awal
const INITIAL_MOCK_DATA = [
  {
    ticketCode: 'TKT-2026-X8K9M2',
    category: 'Instansi / Kedinasan',
    fullName: 'Drs. H. Bambang Soetrisno, M.Pd',
    whatsapp: '081234567890',
    agencyName: 'Cabang Dinas Pendidikan Wilayah Kediri',
    agencyAddress: 'Jl. Jaksa Agung Suprapto No. 2, Kediri',
    urgency: 'Penting',
    requestedDate: '2026-09-18',
    purpose: 'Koordinasi teknis penjaminan mutu asesmen pembelajaran semester ganjil tahun ajaran berjalan.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%2338bdf8"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%232563eb"/></svg>',
    status: 'Disetujui',
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
    parentChildName: 'Muhammad Farhan',
    urgency: 'Biasa',
    requestedDate: '2026-09-16',
    purpose: 'Konsultasi program beasiswa bakat prestasi akademik dan pembinaan olimpiade sains.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%2310b981"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%23059669"/></svg>',
    status: 'Disetujui',
    scheduledRoom: 'Ruang Tamu Khusus',
    scheduledDate: '2026-09-16',
    scheduledStart: '10:00',
    scheduledEnd: '11:00',
    approvalMessage: DEFAULT_APPROVE_TEMPLATE,
    rejectionReason: '',
    checkInAt: null,
    createdAt: '2026-09-15T07:15:00.000Z'
  },
  {
    ticketCode: 'TKT-2026-K9L2B5',
    category: 'Umum',
    fullName: 'Ir. Hendra Gunawan',
    whatsapp: '081398765432',
    urgency: 'Mendesak',
    requestedDate: '2026-09-15',
    purpose: 'Penyampaian proposal kemitraan beasiswa riset dan teknologi robotika sekolah.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%23f59e0b"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%23d97706"/></svg>',
    status: 'Ditolak',
    scheduledRoom: null,
    scheduledDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    approvalMessage: '',
    rejectionReason: DEFAULT_REJECT_TEMPLATE,
    checkInAt: null,
    createdAt: '2026-09-13T10:00:00.000Z'
  },
  {
    ticketCode: 'TKT-2026-W3R8Z1',
    category: 'Siswa',
    fullName: 'Ahmad Raihan Pratama',
    whatsapp: '085811223344',
    studentNisn: '0089123456',
    studentClass: 'XII MIPA 2',
    urgency: 'Penting',
    requestedDate: '2026-09-17',
    purpose: 'Permohonan surat rekomendasi pimpinan untuk seleksi beasiswa kepemimpinan nasional.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%23a855f7"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%237c3aed"/></svg>',
    status: 'Disetujui',
    scheduledRoom: 'Ruang Kepala Sekolah',
    scheduledDate: '2026-09-17',
    scheduledStart: '13:00',
    scheduledEnd: '14:00',
    approvalMessage: 'Bawa serta berkas portofolio prestasi ya.',
    rejectionReason: '',
    checkInAt: null,
    createdAt: '2026-09-15T09:00:00.000Z'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  loadDatabase();
  initializeVisitDateInput();
  updateAuthUIState();
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData.appointments));
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
// NAVIGATION & VIEW SWITCHER
// ==========================================================================
function switchView(viewId) {
  const views = ['guest-portal', 'tracking-portal', 'admin-portal'];
  views.forEach(v => document.getElementById(`${v}-view`).classList.add('hidden'));

  document.getElementById('tabGuestBtn').classList.remove('active');
  document.getElementById('tabTrackBtn').classList.remove('active');
  document.getElementById('tabAdminBtn').classList.remove('active');

  if (viewId === 'guest-portal') {
    document.getElementById('guest-portal-view').classList.remove('hidden');
    document.getElementById('tabGuestBtn').classList.add('active');
    if (appData.currentWizardStep === 3 && !appData.capturedBase64) {
      startCamera();
    }
  } else if (viewId === 'tracking-portal') {
    document.getElementById('tracking-portal-view').classList.remove('hidden');
    document.getElementById('tabTrackBtn').classList.add('active');
    stopCamera();
  } else if (viewId === 'admin-portal') {
    document.getElementById('admin-portal-view').classList.remove('hidden');
    document.getElementById('tabAdminBtn').classList.add('active');
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
// MULTI-STEP WIZARD (3 LANGKAH)
// ==========================================================================
function goToStep(step) {
  if (step === 2 && appData.currentWizardStep === 1) {
    const category = document.getElementById('guestCategory').value;
    const name = document.getElementById('fullName').value.trim();
    const wa = document.getElementById('whatsappNumber').value.trim();

    if (!category) {
      showToast('Pilih kategori tamu terlebih dahulu.', 'error');
      return;
    }
    if (!name || !wa) {
      showToast('Lengkapi nama pemohon dan nomor WhatsApp aktif.', 'error');
      return;
    }
  }

  if (step === 3 && appData.currentWizardStep === 2) {
    const visitDate = document.getElementById('visitDate').value;
    const purpose = document.getElementById('visitPurpose').value.trim();

    if (!visitDate || !purpose) {
      showToast('Lengkapi tanggal kunjungan dan pokok permohonan audiensi.', 'error');
      return;
    }
  }

  for (let i = 1; i <= 3; i++) {
    document.getElementById(`wizardStep${i}`).classList.add('hidden');
    document.getElementById(`stepIndicator${i}`).classList.remove('active');
  }

  document.getElementById(`wizardStep${step}`).classList.remove('hidden');
  document.getElementById(`stepIndicator${step}`).classList.add('active');

  if (step >= 2) {
    document.getElementById('stepIndicator1').classList.add('completed');
    document.getElementById('stepLine1').classList.add('filled');
  } else {
    document.getElementById('stepIndicator1').classList.remove('completed');
    document.getElementById('stepLine1').classList.remove('filled');
  }

  if (step === 3) {
    document.getElementById('stepIndicator2').classList.add('completed');
    document.getElementById('stepLine2').classList.add('filled');
    if (!appData.capturedBase64) {
      startCamera();
    }
  } else {
    document.getElementById('stepIndicator2').classList.remove('completed');
    document.getElementById('stepLine2').classList.remove('filled');
    stopCamera();
  }

  appData.currentWizardStep = step;
  window.scrollTo({ top: 120, behavior: 'smooth' });
}

function handleCategoryChange() {
  const cat = document.getElementById('guestCategory').value;
  const studentBox = document.getElementById('dynamicStudentFields');
  const parentBox = document.getElementById('dynamicParentFields');
  const instansiBox = document.getElementById('dynamicInstansiFields');

  studentBox.classList.add('hidden');
  parentBox.classList.add('hidden');
  instansiBox.classList.add('hidden');

  if (cat === 'Siswa') studentBox.classList.remove('hidden');
  else if (cat === 'Orang Tua Murid') parentBox.classList.remove('hidden');
  else if (cat === 'Instansi / Kedinasan') instansiBox.classList.remove('hidden');
}

// ==========================================================================
// WEBRTC LIVE CAMERA ENGINE
// ==========================================================================
async function startCamera() {
  const video = document.getElementById('webcamVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const errMsg = document.getElementById('cameraErrMsg');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (placeholder) {
      placeholder.classList.remove('hidden');
      errMsg.innerText = 'Akses webcam tidak didukung oleh browser ini.';
    }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    appData.activeStream = stream;
    video.srcObject = stream;
    video.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
  } catch (err) {
    console.warn('Webcam permission not granted:', err);
    if (placeholder) {
      placeholder.classList.remove('hidden');
      errMsg.innerText = 'Izin kamera belum diaktifkan atau kamera tidak terdeteksi.';
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

  if (!appData.activeStream || video.videoWidth === 0) {
    synthesizeFallbackPhoto();
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');

  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataURL = canvas.toDataURL('image/jpeg', 0.85);
  appData.capturedBase64 = dataURL;
  capturedImg.src = dataURL;

  cameraBox.classList.add('hidden');
  previewBox.classList.remove('hidden');
  snapBtn.classList.add('hidden');
  retakeBtn.classList.remove('hidden');

  stopCamera();
  showToast('Foto wajah berhasil diverifikasi!', 'success');
}

function retakePhoto() {
  appData.capturedBase64 = null;
  document.getElementById('cameraPreviewContainer').classList.remove('hidden');
  document.getElementById('capturedResultContainer').classList.add('hidden');
  document.getElementById('snapPhotoBtn').classList.remove('hidden');
  document.getElementById('retakePhotoBtn').classList.add('hidden');
  startCamera();
}

function synthesizeFallbackPhoto() {
  const canvas = document.getElementById('photoCanvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 400, 300);

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(200, 110, 50, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e40af';
  ctx.beginPath();
  ctx.arc(200, 260, 90, 0, Math.PI, true);
  ctx.fill();

  const data = canvas.toDataURL('image/jpeg', 0.85);
  appData.capturedBase64 = data;
  document.getElementById('capturedImage').src = data;
  document.getElementById('cameraPreviewContainer').classList.add('hidden');
  document.getElementById('capturedResultContainer').classList.remove('hidden');
  document.getElementById('snapPhotoBtn').classList.add('hidden');
  document.getElementById('retakePhotoBtn').classList.remove('hidden');
  showToast('Simulasi biometrik wajah disiapkan.', 'info');
}

// ==========================================================================
// SUBMISSION & TRACKING
// ==========================================================================
function handleFormSubmission(e) {
  e.preventDefault();

  if (!appData.capturedBase64) {
    showToast('Harap ambil foto wajah Anda sebelum mengirim.', 'error');
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

  const newAppointment = {
    ticketCode,
    category,
    fullName,
    whatsapp,
    visitDate,
    urgency,
    purpose,
    photoBase64: appData.capturedBase64,
    status: 'Menunggu Konfirmasi',
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
  document.getElementById('modalSummaryDate').innerText = visitDate;
  document.getElementById('modalSummaryPhone').innerText = whatsapp;
  document.getElementById('ticketSuccessModal').classList.remove('hidden');

  document.getElementById('guestAppointmentForm').reset();
  retakePhoto();
  goToStep(1);
}

function closeTicketModal() {
  document.getElementById('ticketSuccessModal').classList.add('hidden');
}

function copyModalTicketCode() {
  const code = document.getElementById('modalTicketCode').innerText;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Kode tiket berhasil disalin ke clipboard!', 'success');
  });
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
          <p>Pastikan kode tiket yang Anda masukkan sudah sesuai.</p>
        </div>
      </div>
    `;
    resultBox.classList.remove('hidden');
    return;
  }

  let hostNoteHTML = '';
  if (found.status === 'Disetujui' || found.status === 'Checked-In') {
    const msg = (found.approvalMessage && found.approvalMessage.trim()) || DEFAULT_APPROVE_TEMPLATE;
    hostNoteHTML = `
      <div style="margin-top:1.1rem; padding:0.9rem 1.1rem; background:rgba(56, 189, 248, 0.08); border-left:3px solid var(--cyan-glow); border-radius:8px;">
        <span style="font-size:0.75rem; color:var(--cyan-glow); font-weight:700; display:block; text-transform:uppercase; letter-spacing:0.04em;">
          <i class="fa-solid fa-comment-dots"></i> Catatan dari Kepala Sekolah:
        </span>
        <p style="font-size:0.92rem; color:var(--text-main); font-style:italic; margin-top:0.35rem; overflow-wrap:anywhere; word-break:break-word;">
          "${escapeHtml(msg)}"
        </p>
      </div>
    `;
  } else if (found.status === 'Ditolak') {
    const rejMsg = (found.rejectionReason && found.rejectionReason.trim()) || DEFAULT_REJECT_TEMPLATE;
    hostNoteHTML = `
      <div style="margin-top:1.1rem; padding:0.9rem 1.1rem; background:rgba(239, 68, 68, 0.08); border-left:3px solid var(--rose-danger); border-radius:8px;">
        <span style="font-size:0.75rem; color:#FCA5A5; font-weight:700; display:block; text-transform:uppercase; letter-spacing:0.04em;">
          <i class="fa-solid fa-circle-exclamation"></i> Catatan Penolakan Kepala Sekolah:
        </span>
        <p style="font-size:0.92rem; color:#FCA5A5; font-style:italic; margin-top:0.35rem; overflow-wrap:anywhere; word-break:break-word;">
          "${escapeHtml(rejMsg)}"
        </p>
      </div>
    `;
  }

  resultBox.innerHTML = `
    <div class="glass-card" style="padding:1.5rem; margin-top:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <span style="font-weight:800; color:var(--cyan-glow); font-size:1.15rem;">${found.ticketCode}</span>
        <span class="badge ${getBadgeClass(found.status)}">${found.status}</span>
      </div>
      <div style="display:flex; gap:1rem; align-items:center; margin-bottom:0.75rem;">
        <img src="${found.photoBase64 || ''}" alt="Foto Tamu" style="width:52px; height:52px; border-radius:8px; object-fit:cover; border:1px solid var(--border-subtle); flex-shrink:0; background:#050811;">
        <div style="min-width:0; overflow-wrap:anywhere; word-break:break-word;">
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Nama Pemohon: <strong style="color:#fff;">${escapeHtml(found.fullName)}</strong></p>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Tanggal Pengajuan: <strong style="color:#fff;">${found.visitDate || found.requestedDate}</strong></p>
        </div>
      </div>
      ${found.scheduledRoom ? `<p style="font-size:0.85rem; color:var(--cyan-glow); margin-top:0.5rem; font-weight:600;">Ruangan: ${found.scheduledRoom} (${found.scheduledStart} -${found.scheduledEnd} WIB)</p>` : ''}
      ${hostNoteHTML}
    </div>
  `;
  resultBox.classList.remove('hidden');
}

// ==========================================================================
// ADMIN DASHBOARD & SUBVIEWS CONTROLLER
// ==========================================================================
function switchAdminSubView(subview) {
  appData.activeAdminSubView = subview;

  // Tombol tab
  document.getElementById('subtabBtnTable').classList.remove('active');
  document.getElementById('subtabBtnCalendar').classList.remove('active');
  document.getElementById('subtabBtnAnalytics').classList.remove('active');

  // Konten panel
  document.getElementById('adminSubViewTable').classList.add('hidden');
  document.getElementById('adminSubViewCalendar').classList.add('hidden');
  document.getElementById('adminSubViewAnalytics').classList.add('hidden');

  if (subview === 'table') {
    document.getElementById('subtabBtnTable').classList.add('active');
    document.getElementById('adminSubViewTable').classList.remove('hidden');
    renderAdminQueueTable();
  } else if (subview === 'calendar') {
    document.getElementById('subtabBtnCalendar').classList.add('active');
    document.getElementById('adminSubViewCalendar').classList.remove('hidden');
    renderWeeklyCalendar();
  } else if (subview === 'analytics') {
    document.getElementById('subtabBtnAnalytics').classList.add('active');
    document.getElementById('adminSubViewAnalytics').classList.remove('hidden');
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
  const filter = document.getElementById('tableFilterStatus').value;

  let list = appData.appointments;
  if (filter !== 'ALL') {
    list = list.filter(item => item.status === filter);
  }

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:var(--text-dim);">
          Tidak ada data antrean permohonan.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const cleanPhone = item.whatsapp.replace(/^0/, '62').replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(item.fullName)},%20terkait%20audiensi%20di%20SMAN%201%20Kandangan%20[Tiket:%20${item.ticketCode}].`;

    let scheduleDisplay = '<span style="color:var(--text-dim);">-</span>';
    if (item.scheduledRoom) {
      scheduleDisplay = `<strong style="color:var(--text-main); font-size:0.82rem;">${item.scheduledRoom}</strong><br><small style="color:var(--cyan-glow);">${item.scheduledDate} (${item.scheduledStart}-${item.scheduledEnd})</small>`;
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
        <button class="btn btn-primary btn-sm" onclick="openScheduleModal('${item.ticketCode}')">
          <i class="fa-solid fa-calendar-check"></i> Disposisi
        </button>
      `;
    } else if (item.status === 'Disetujui') {
      actionButtons = `
        <button class="btn btn-emerald btn-sm" onclick="executeCheckIn('${item.ticketCode}')" title="Tandai Hadir">
          <i class="fa-solid fa-user-check"></i>
        </button>
        <button class="btn btn-outline btn-sm" onclick="openScheduleModal('${item.ticketCode}')" title="Ubah Jadwal">
          <i class="fa-solid fa-pen"></i>
        </button>
      `;
    } else if (item.status === 'Checked-In') {
      actionButtons = `
        <button class="btn btn-outline btn-sm" onclick="executeComplete('${item.ticketCode}')">
          <i class="fa-solid fa-flag-checkered"></i> Selesai
        </button>
      `;
    } else {
      actionButtons = `<span style="font-size:0.75rem; color:var(--text-dim);">-</span>`;
    }

    return `
      <tr>
        <td>
          <strong style="color:var(--cyan-glow); font-size:0.84rem;">${item.ticketCode}</strong>
        </td>
        <td>
          <strong style="overflow-wrap:anywhere; word-break:break-word;">${escapeHtml(item.fullName)}</strong>
          <br>
          <a href="${waUrl}" target="_blank" class="wa-link">
            <i class="fa-brands fa-whatsapp"></i> ${item.whatsapp}
          </a>
        </td>
        <td>
          <span style="font-size:0.82rem;">${item.category}</span>
        </td>
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
        <td style="text-align: right;">
          ${actionButtons}
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// FITUR BARU 1: KALENDER VISUAL MINGGUAN (TIMELINE CALENDAR)
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
  // Set ke hari Senin (1)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff + (offsetWeeks * 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function renderWeeklyCalendar() {
  const baseDate = new Date(); // Hari ini
  const monday = getStartOfWeek(baseDate, appData.calendarOffsetWeeks);
  const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const grid = document.getElementById('calendarGridWeek');
  
  // Format tanggal rentang minggu
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  document.getElementById('calWeekRangeLabel').innerText = 
    `Minggu: ${monday.toLocaleDateString('id-ID', options)} - ${saturday.toLocaleDateString('id-ID', options)}`;

  let html = '';
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 6; i++) {
    const currentDay = new Date(monday);
    currentDay.setDate(monday.getDate() + i);
    const dateISO = currentDay.toISOString().split('T')[0];
    const isToday = (dateISO === todayStr);

    // Ambil jadwal pertemuan yang disetujui pada tanggal ini
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
          <div class="cal-event-card ${isUrgent ? 'urgent' : ''}" onclick="openScheduleModal('${app.ticketCode}')" title="Klik untuk meninjau/mengubah jadwal">
            <span class="cal-event-time"><i class="fa-regular fa-clock"></i> ${timeDisplay}</span>
            <div class="cal-event-title">${escapeHtml(app.fullName)}</div>
            <div class="cal-event-room"><i class="fa-solid fa-door-open"></i> ${app.scheduledRoom || 'Ruang Pimpinan'}</div>
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

// ==========================================================================
// FITUR BARU 2: ANALITIK KATEGORI & HEATMAP JAM SIBUK
// ==========================================================================
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

  // Status Summary Cards
  const approved = appData.appointments.filter(a => a.status === 'Disetujui').length;
  const pending = appData.appointments.filter(a => a.status === 'Menunggu Konfirmasi').length;
  const checkedIn = appData.appointments.filter(a => a.status === 'Checked-In' || a.status === 'Selesai').length;
  const rejected = appData.appointments.filter(a => a.status === 'Ditolak').length;

  document.getElementById('statusSummaryPills').innerHTML = `
    <div class="status-pill-card">
      <span class="status-pill-val" style="color:var(--amber-warning);">${pending}</span>
      <span class="status-pill-lbl">Menunggu Disposisi</span>
    </div>
    <div class="status-pill-card">
      <span class="status-pill-val" style="color:var(--emerald-green);">${approved}</span>
      <span class="status-pill-lbl">Disetujui Aktif</span>
    </div>
    <div class="status-pill-card">
      <span class="status-pill-val" style="color:var(--cyan-glow);">${checkedIn}</span>
      <span class="status-pill-lbl">Kehadiran Lobi</span>
    </div>
    <div class="status-pill-card">
      <span class="status-pill-val" style="color:var(--rose-danger);">${rejected}</span>
      <span class="status-pill-lbl">Ditolak</span>
    </div>
  `;
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

  // Inisialisasi matriks penghitung
  // density[hourIndex][dayIndex]
  const density = Array(hours.length).fill(0).map(() => Array(days.length).fill(0));

  // Hitung kepadatan dari janji temu yang disetujui / checked-in
  appData.appointments.forEach(app => {
    if ((app.status === 'Disetujui' || app.status === 'Checked-In') && app.scheduledDate && app.scheduledStart) {
      const dateObj = new Date(app.scheduledDate);
      let dayIndex = dateObj.getDay() - 1; // 0 = Senin, 4 = Jumat
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
  let html = '';

  // Header Baris: Pojok kosong + Nama Hari
  html += `<div class="heat-cell heat-header-cell">Waktu</div>`;
  days.forEach(d => {
    html += `<div class="heat-cell heat-header-cell">${d}</div>`;
  });

  // Isi Tiap Jam
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
// SCHEDULING ENGINE & ACTION MODAL
// ==========================================================================
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

function openScheduleModal(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  appData.selectedTicketForAction = ticketCode;

  document.getElementById('scheduleModalTicketPill').innerText = `Tiket: ${item.ticketCode}`;
  document.getElementById('schedModalName').innerText = item.fullName;
  document.getElementById('schedModalCategoryMeta').innerText = `${item.category} • Urgensi: ${item.urgency}`;
  document.getElementById('schedModalPurpose').innerText = `"${item.purpose}"`;

  // Render Foto Live Pemohon (Terkunci 96x96 px di atas tengah)
  const modalPhoto = document.getElementById('schedModalPhoto');
  if (modalPhoto) {
    modalPhoto.src = item.photoBase64 || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%230f172a"/><circle cx="60" cy="45" r="22" fill="%2338bdf8"/><path d="M25 105 C25 78, 95 78, 95 105" fill="%232563eb"/></svg>';
  }

  document.getElementById('schedRoom').value = item.scheduledRoom || 'Ruang Kepala Sekolah';
  document.getElementById('schedDate').value = item.scheduledDate || item.visitDate || item.requestedDate;
  document.getElementById('schedStartTime').value = item.scheduledStart || '09:00';
  document.getElementById('schedEndTime').value = item.scheduledEnd || '10:00';

  const existingApprove = item.approvalMessage && item.approvalMessage.trim();
  document.getElementById('schedApprovalNotes').value = existingApprove ? existingApprove : DEFAULT_APPROVE_TEMPLATE;

  const existingReject = item.rejectionReason && item.rejectionReason.trim();
  document.getElementById('schedRejectionReason').value = existingReject ? existingReject : DEFAULT_REJECT_TEMPLATE;

  switchActionTab('approve');
  runLiveCollisionCheck();

  document.getElementById('scheduleActionModal').classList.remove('hidden');
}

function closeScheduleModal() {
  document.getElementById('scheduleActionModal').classList.add('hidden');
  appData.selectedTicketForAction = null;
}

function openFullPhotoModal() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  const fullImg = document.getElementById('photoFullElement');
  const fullTitle = document.getElementById('photoFullTitle');
  
  if (fullImg) {
    fullImg.src = item.photoBase64 || '';
  }
  if (fullTitle) {
    fullTitle.innerText = item.fullName;
  }

  document.getElementById('photoFullModal').classList.remove('hidden');
}

function closeFullPhotoModal() {
  document.getElementById('photoFullModal').classList.add('hidden');
}

function switchActionTab(tab) {
  const btnApprove = document.getElementById('btnTabApprove');
  const btnReject = document.getElementById('btnTabReject');
  const contentApprove = document.getElementById('tabContentApprove');
  const contentReject = document.getElementById('tabContentReject');

  if (tab === 'approve') {
    btnApprove.classList.add('active');
    btnReject.classList.remove('active');
    contentApprove.classList.remove('hidden');
    contentReject.classList.add('hidden');

    const appInput = document.getElementById('schedApprovalNotes');
    if (!appInput.value || !appInput.value.trim()) {
      appInput.value = DEFAULT_APPROVE_TEMPLATE;
    }
    runLiveCollisionCheck();
  } else {
    btnApprove.classList.remove('active');
    btnReject.classList.add('active');
    contentApprove.classList.add('hidden');
    contentReject.classList.remove('hidden');

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
    alertBox.classList.remove('hidden');
    alertMsg.innerText = 'Jam mulai harus lebih awal daripada jam selesai!';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
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
    alertBox.classList.remove('hidden');
    alertMsg.innerText = `Ruangan "${room}" telah dipesan untuk [${conflict.fullName}] pada jam ${conflict.scheduledStart} - ${conflict.scheduledEnd} WIB!`;
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
  } else {
    alertBox.classList.add('hidden');
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
  }
}

function executeApprove() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  const note = document.getElementById('schedApprovalNotes').value.trim();
  item.approvalMessage = note || DEFAULT_APPROVE_TEMPLATE;

  item.status = 'Disetujui';
  item.scheduledRoom = document.getElementById('schedRoom').value;
  item.scheduledDate = document.getElementById('schedDate').value;
  item.scheduledStart = document.getElementById('schedStartTime').value;
  item.scheduledEnd = document.getElementById('schedEndTime').value;
  item.rejectionReason = '';

  saveDatabase();
  renderAdminDashboard();
  closeScheduleModal();
  showToast(`Janji temu [${item.ticketCode}] disetujui!`, 'success');
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
// AUTH & UTILITIES
// ==========================================================================
function openAdminLoginModal() {
  document.getElementById('adminLoginModal').classList.remove('hidden');
}

function closeAdminLoginModal() {
  document.getElementById('adminLoginModal').classList.add('hidden');
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
    showToast('Login Berhasil!', 'success');
  } else {
    showToast('Username atau password salah.', 'error');
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
  if (session === 'active') {
    label.innerText = 'Dashboard Pimpinan';
  } else {
    label.innerText = 'Host Portal';
  }
}

function exportDataToCSV() {
  if (appData.appointments.length === 0) {
    showToast('Tidak ada data.', 'error');
    return;
  }

  const headers = ['Kode Tiket', 'Kategori', 'Nama Lengkap', 'WhatsApp', 'Urgensi', 'Tgl Diminta', 'Status', 'Ruangan', 'Jam Mulai', 'Jam Selesai', 'Catatan Kepsek'];
  const rows = appData.appointments.map(a => [
    `"${a.ticketCode}"`,
    `"${a.category}"`,
    `"${a.fullName.replace(/"/g, '""')}"`,
    `"${a.whatsapp}"`,
    `"${a.urgency}"`,
    `"${a.visitDate || a.requestedDate}"`,
    `"${a.status}"`,
    `"${a.scheduledRoom || '-'}"`,
    `"${a.scheduledStart || '-'}"`,
    `"${a.scheduledEnd || '-'}"`,
    `"${(a.approvalMessage || a.rejectionReason || '-').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const link = document.createElement('a');
  link.href = encodeURI(csvContent);
  link.download = `Data_Buku_Tamu_SMAN1_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  showToast('Data CSV berhasil diunduh.', 'success');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
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
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
