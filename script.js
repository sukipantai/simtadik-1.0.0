/**
 * SISTEM BUKU TAMU DIGITAL & PENJADWALAN JANJI TEMU SEKOLAH
 * SMAN 1 KANDANGAN KEDIRI
 */

const STORAGE_KEY = 'SMAN1_KANDANGAN_APPOINTMENTS_V3';
const ADMIN_SESSION_KEY = 'SMAN1_ADMIN_AUTH_SESSION';

const ADMIN_CREDENTIALS = {
  username: 'admin1234',
  password: '1234admin'
};

let appData = {
  appointments: [],
  activeStream: null,
  capturedBase64: null,
  currentWizardStep: 1,
  selectedTicketForAction: null
};

// Data mock awal
const INITIAL_MOCK_DATA = [
  {
    ticketCode: 'TKT-2026-X8K9M2',
    category: 'Instansi / Kedinasan',
    fullName: 'Drs. H. Bambang Soetrisno, M.Pd',
    whatsapp: '081234567890',
    agencyName: 'Cabang Dinas Pendidikan Wilayah Kediri',
    agencyAddress: 'Jl. Jaksa Agung Suprapto No. 2',
    urgency: 'Penting',
    requestedDate: '2026-09-18',
    purpose: 'Koordinasi teknis penjaminan mutu asesmen pembelajaran semester ganjil.',
    status: 'Disetujui',
    scheduledRoom: 'Ruang Kepala Sekolah',
    scheduledDate: '2026-09-18',
    scheduledStart: '09:00',
    scheduledEnd: '10:30',
    approvalMessage: 'Silakan langsung menuju ruang Kepala Sekolah, kami siap menerima.',
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
    requestedDate: '2026-09-19',
    purpose: 'Konsultasi program beasiswa bakat prestasi akademik putra kami.',
    status: 'Menunggu Konfirmasi',
    scheduledRoom: null,
    scheduledDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    approvalMessage: '',
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
    purpose: 'Penyampaian proposal kemitraan beasiswa sains dan teknologi robotika.',
    status: 'Checked-In',
    scheduledRoom: 'Ruang Tamu Khusus',
    scheduledDate: '2026-09-15',
    scheduledStart: '08:00',
    scheduledEnd: '09:00',
    approvalMessage: 'Baik, saya tunggu 😊',
    rejectionReason: '',
    checkInAt: '2026-09-15T08:05:00.000Z',
    createdAt: '2026-09-13T10:00:00.000Z'
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

function initializeVisitDateInput() {
  const today = new Date().toISOString().split('T')[0];
  const visitInput = document.getElementById('visitDate');
  if (visitInput) {
    visitInput.min = today;
    visitInput.value = today;
  }
}

// ==========================================================================
// NAVIGATION & VIEW CONTROLLER
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
// MULTI-STEP WIZARD (3 LANGKAH FORMULIR)
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
      showToast('Lengkapi tanggal kunjungan dan uraian keperluan temu.', 'error');
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
// WEBRTC CAMERA
// ==========================================================================
async function startCamera() {
  const video = document.getElementById('webcamVideo');
  const placeholder = document.getElementById('cameraPlaceholder');
  const errMsg = document.getElementById('cameraErrMsg');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (placeholder) {
      placeholder.classList.remove('hidden');
      errMsg.innerText = 'Akses kamera peramban dibatasi.';
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
    console.warn('Camera inaccessible:', err);
    if (placeholder) {
      placeholder.classList.remove('hidden');
      errMsg.innerText = 'Izin kamera belum diaktifkan.';
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
  showToast('Foto verifikasi simulasi disiapkan.', 'info');
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
    showToast('Kode tiket berhasil disalin!', 'success');
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
          <p>Periksa kembali kode tiket Anda.</p>
        </div>
      </div>
    `;
    resultBox.classList.remove('hidden');
    return;
  }

  // Tampilkan pesan sambutan dari Kepala Sekolah jika permohonan disetujui
  let hostMessageHTML = '';
  if (found.status === 'Disetujui' || found.status === 'Checked-In') {
    const msg = found.approvalMessage || 'Baik, saya tunggu 😊';
    hostMessageHTML = `
      <div style="margin-top:1rem; padding:0.9rem; background:rgba(56, 189, 248, 0.08); border-left:3px solid var(--cyan-glow); border-radius:8px;">
        <span style="font-size:0.75rem; color:var(--cyan-glow); font-weight:700; display:block; text-transform:uppercase; letter-spacing:0.04em;">
          <i class="fa-solid fa-comment-check"></i> Pesan dari Kepala Sekolah:
        </span>
        <p style="font-size:0.9rem; color:var(--text-main); font-style:italic; margin-top:0.35rem;">
          "${escapeHtml(msg)}"
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
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.25rem;">Nama Pemohon: <strong style="color:#fff;">${escapeHtml(found.fullName)}</strong></p>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.25rem;">Tanggal Pengajuan: <strong style="color:#fff;">${found.visitDate || found.requestedDate}</strong></p>
      ${found.scheduledRoom ? `<p style="font-size:0.85rem; color:var(--cyan-glow); margin-top:0.5rem; font-weight:600;">Jadwal: ${found.scheduledRoom} (${found.scheduledStart} - ${found.scheduledEnd} WIB)</p>` : ''}
      ${hostMessageHTML}
      ${found.rejectionReason ? `<p style="font-size:0.85rem; color:var(--rose-danger); margin-top:0.6rem;"><strong>Alasan Penolakan:</strong> ${escapeHtml(found.rejectionReason)}</p>` : ''}
    </div>
  `;
  resultBox.classList.remove('hidden');
}

// ==========================================================================
// ADMIN DASHBOARD
// ==========================================================================
function renderAdminDashboard() {
  renderMetrics();
  renderAdminQueueTable();
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
          <strong>${escapeHtml(item.fullName)}</strong>
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
        </td>
        <td style="text-align: right;">
          ${actionButtons}
        </td>
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
// SCHEDULING ENGINE & ANTI-COLLISION
// ==========================================================================
function openScheduleModal(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  appData.selectedTicketForAction = ticketCode;

  document.getElementById('scheduleModalTicketPill').innerText = `Tiket: ${item.ticketCode}`;
  document.getElementById('schedModalName').innerText = item.fullName;
  document.getElementById('schedModalCategoryMeta').innerText = `${item.category} • Urgensi: ${item.urgency}`;
  document.getElementById('schedModalPurpose').innerText = `"${item.purpose}"`;

  document.getElementById('schedRoom').value = item.scheduledRoom || 'Ruang Kepala Sekolah';
  document.getElementById('schedDate').value = item.scheduledDate || item.visitDate || item.requestedDate;
  document.getElementById('schedStartTime').value = item.scheduledStart || '09:00';
  document.getElementById('schedEndTime').value = item.scheduledEnd || '10:00';
  document.getElementById('schedRejectionReason').value = item.rejectionReason || '';

  // Isi otomatis dengan pesan yang sudah ada, atau template default "Baik, saya tunggu 😊"
  document.getElementById('schedApprovalNotes').value = item.approvalMessage ? item.approvalMessage : 'Baik, saya tunggu 😊';

  switchActionTab('approve');
  runLiveCollisionCheck();

  document.getElementById('scheduleActionModal').classList.remove('hidden');
}

function closeScheduleModal() {
  document.getElementById('scheduleActionModal').classList.add('hidden');
  appData.selectedTicketForAction = null;
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
    runLiveCollisionCheck();
  } else {
    btnApprove.classList.remove('active');
    btnReject.classList.add('active');
    contentApprove.classList.add('hidden');
    contentReject.classList.remove('hidden');
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
    alertMsg.innerText = `Ruangan "${room}" telah dijadwalkan untuk [${conflict.fullName}] pada jam ${conflict.scheduledStart} - ${conflict.scheduledEnd} WIB!`;
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

  // Baca input pesan pimpinan. Jika dikosongkan oleh kepsek, gunakan default template
  const customMessage = document.getElementById('schedApprovalNotes').value.trim();
  item.approvalMessage = customMessage || 'Baik, saya tunggu 😊';

  item.status = 'Disetujui';
  item.scheduledRoom = document.getElementById('schedRoom').value;
  item.scheduledDate = document.getElementById('schedDate').value;
  item.scheduledStart = document.getElementById('schedStartTime').value;
  item.scheduledEnd = document.getElementById('schedEndTime').value;
  item.rejectionReason = '';

  saveDatabase();
  renderAdminDashboard();
  closeScheduleModal();
  showToast(`Janji temu [${item.ticketCode}] berhasil disetujui!`, 'success');
}

function executeReject() {
  const reason = document.getElementById('schedRejectionReason').value.trim();
  if (!reason) {
    showToast('Cantumkan alasan penolakan.', 'error');
    return;
  }

  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction);
  if (!item) return;

  item.status = 'Ditolak';
  item.rejectionReason = reason;

  saveDatabase();
  renderAdminDashboard();
  closeScheduleModal();
  showToast(`Permohonan [${item.ticketCode}] ditolak.`, 'info');
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

  const headers = ['Kode Tiket', 'Kategori', 'Nama Lengkap', 'WhatsApp', 'Urgensi', 'Tgl Diminta', 'Status', 'Ruangan', 'Jam Mulai', 'Jam Selesai', 'Pesan Kepala Sekolah'];
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
    `"${(a.approvalMessage || '-').replace(/"/g, '""')}"`
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
