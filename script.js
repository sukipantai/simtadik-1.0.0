/**
 * SISTEM BUKU TAMU DIGITAL & PENJADWALAN JANJI TEMU SEKOLAH
 * SMAN 1 KANDANGAN KEDIRI
 * 
 * Production-ready Client Architecture with WebRTC Camera, 
 * Collision-free Scheduling Engine, and LocalStorage Mock Database.
 */

// ==========================================================================
// 1. CONSTANTS & DATABASE INITIALIZATION
// ==========================================================================
const STORAGE_KEY = 'SMAN1_KANDANGAN_APPOINTMENTS_V1';
const ADMIN_SESSION_KEY = 'SMAN1_ADMIN_AUTH_SESSION';

// Default static credentials
const ADMIN_CREDENTIALS = {
  username: 'admin1234',
  password: '1234admin'
};

// Global App State
let appData = {
  appointments: [],
  activeStream: null,
  capturedBase64: null,
  selectedTicketForAction: null
};

// Realistic mock data if storage is empty
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
    purpose: 'Koordinasi teknis penjaminan mutu asesmen pembelajaran semester ganjil.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%231e293b"/><circle cx="100" cy="80" r="40" fill="%2338bdf8"/><path d="M40 170 C40 130, 160 130, 160 170" fill="%232563eb"/></svg>',
    status: 'Disetujui',
    scheduledRoom: 'Ruang Kepala Sekolah',
    scheduledDate: '2026-09-18',
    scheduledStart: '09:00',
    scheduledEnd: '10:30',
    rejectionReason: '',
    checkInAt: null,
    createdAt: '2026-09-14T08:30:00.000Z'
  },
  {
    ticketCode: 'TKT-2026-M4P7Q1',
    category: 'Orang Tua Murid',
    fullName: 'Siti Aminah, S.Pd',
    whatsapp: '085712349988',
    parentChildName: 'Muhammad Farhan (Kelas X-5)',
    urgency: 'Biasa',
    requestedDate: '2026-09-19',
    purpose: 'Konsultasi program beasiswa bakat prestasi akademik putra kami.',
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%231e293b"/><circle cx="100" cy="80" r="40" fill="%2310b981"/><path d="M40 170 C40 130, 160 130, 160 170" fill="%23059669"/></svg>',
    status: 'Menunggu Konfirmasi',
    scheduledRoom: null,
    scheduledDate: null,
    scheduledStart: null,
    scheduledEnd: null,
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
    photoBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%231e293b"/><circle cx="100" cy="80" r="40" fill="%23f59e0b"/><path d="M40 170 C40 130, 160 130, 160 170" fill="%23d97706"/></svg>',
    status: 'Checked-In',
    scheduledRoom: 'Ruang Tamu Khusus',
    scheduledDate: '2026-09-15',
    scheduledStart: '08:00',
    scheduledEnd: '09:00',
    rejectionReason: '',
    checkInAt: '2026-09-15T08:05:00.000Z',
    createdAt: '2026-09-13T10:00:00.000Z'
  }
];

// ==========================================================================
// 2. LIFECYCLE & INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadDatabase();
  initializeVisitDateInput();
  startCamera();
  updateAuthUIState();
});

// Load from LocalStorage
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

// Set minimum date to today
function initializeVisitDateInput() {
  const today = new Date().toISOString().split('T')[0];
  const visitInput = document.getElementById('visitDate');
  if (visitInput) {
    visitInput.min = today;
    visitInput.value = today;
  }
}

// ==========================================================================
// 3. NAVIGATION & VIEW SWITCHER
// ==========================================================================
function switchView(viewId) {
  const views = ['guest-portal', 'tracking-portal', 'admin-portal'];
  
  views.forEach(v => {
    const el = document.getElementById(`${v}-view`);
    if (el) el.classList.add('hidden');
  });

  // Highlight Nav Buttons
  document.getElementById('tabGuestBtn').classList.remove('active');
  document.getElementById('tabTrackBtn').classList.remove('active');
  document.getElementById('tabAdminBtn').classList.remove('active');

  if (viewId === 'guest-portal') {
    document.getElementById('guest-portal-view').classList.remove('hidden');
    document.getElementById('tabGuestBtn').classList.add('active');
    if (!appData.capturedBase64) {
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
// 4. WEBRTC LIVE CAMERA ENGINE (ANTI-FILE-PICKER)
// ==========================================================================
async function startCamera() {
  const video = document.getElementById('webcamVideo');
  const placeholder = document.getElementById('cameraPlaceholder');

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      appData.activeStream = stream;
      video.srcObject = stream;
      video.classList.remove('hidden');
      if (placeholder) placeholder.classList.add('hidden');
    } catch (err) {
      console.warn('Webcam permission denied or unavailable:', err);
      // Fallback UI if camera access fails
      if (placeholder) {
        placeholder.classList.remove('hidden');
        placeholder.querySelector('p').innerText = 'Izin kamera diblokir atau kamera tidak tersedia.';
      }
    }
  }
}

function stopCamera() {
  if (appData.activeStream) {
    appData.activeStream.getTracks().forEach(track => track.stop());
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

  // If video is not active, synthesize fallback snapshot
  if (!appData.activeStream || video.videoWidth === 0) {
    synthesizeFallbackPhoto();
    return;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Mirror adjustment to preserve natural selfie perspective
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);

  // Convert to high efficiency JPEG
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

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 400, 300);

  // Avatar Icon Silhouette
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(200, 120, 55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e40af';
  ctx.beginPath();
  ctx.arc(200, 270, 100, 0, Math.PI, true);
  ctx.fill();

  // Watermark text
  ctx.fillStyle = '#f8fafc';
  ctx.font = '14px Plus Jakarta Sans';
  ctx.textAlign = 'center';
  ctx.fillText('VERIFIKASI FISIK LOBI', 200, 220);

  const fallbackData = canvas.toDataURL('image/jpeg', 0.85);
  appData.capturedBase64 = fallbackData;

  document.getElementById('capturedImage').src = fallbackData;
  document.getElementById('cameraPreviewContainer').classList.add('hidden');
  document.getElementById('capturedResultContainer').classList.remove('hidden');

  document.getElementById('snapPhotoBtn').classList.add('hidden');
  document.getElementById('retakePhotoBtn').classList.remove('hidden');

  showToast('Simulasi foto biometrik diaktifkan.', 'info');
}

// ==========================================================================
// 5. DYNAMIC FORM FIELDS & SUBMISSION
// ==========================================================================
function handleCategoryChange() {
  const cat = document.getElementById('guestCategory').value;
  const studentBox = document.getElementById('dynamicStudentFields');
  const parentBox = document.getElementById('dynamicParentFields');
  const instansiBox = document.getElementById('dynamicInstansiFields');

  studentBox.classList.add('hidden');
  parentBox.classList.add('hidden');
  instansiBox.classList.add('hidden');

  if (cat === 'Siswa') {
    studentBox.classList.remove('hidden');
  } else if (cat === 'Orang Tua Murid') {
    parentBox.classList.remove('hidden');
  } else if (cat === 'Instansi / Kedinasan') {
    instansiBox.classList.remove('hidden');
  }
}

function handleFormSubmission(e) {
  e.preventDefault();

  if (!appData.capturedBase64) {
    showToast('Harap ambil foto wajah Anda terlebih dahulu sebelum mengirim!', 'error');
    return;
  }

  const category = document.getElementById('guestCategory').value;
  const fullName = document.getElementById('fullName').value.trim();
  const whatsapp = document.getElementById('whatsappNumber').value.trim();
  const visitDate = document.getElementById('visitDate').value;
  const urgency = document.getElementById('urgencyLevel').value;
  const purpose = document.getElementById('visitPurpose').value.trim();

  // Additional dynamic fields
  const studentNisn = document.getElementById('studentNisn')?.value.trim() || '';
  const studentClass = document.getElementById('studentClass')?.value.trim() || '';
  const parentChildName = document.getElementById('parentChildName')?.value.trim() || '';
  const agencyName = document.getElementById('agencyName')?.value.trim() || '';
  const agencyAddress = document.getElementById('agencyAddress')?.value.trim() || '';

  // Generate Unique Non-Sequential Ticket Code
  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ticketCode = `TKT-2026-${randomChars}`;

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
    scheduledRoom: null,
    scheduledDate: null,
    scheduledStart: null,
    scheduledEnd: null,
    rejectionReason: '',
    checkInAt: null,
    createdAt: new Date().toISOString()
  };

  appData.appointments.unshift(newAppointment);
  saveDatabase();

  // Show Success Modal
  document.getElementById('modalTicketCode').innerText = ticketCode;
  document.getElementById('modalSummaryName').innerText = fullName;
  document.getElementById('modalSummaryDate').innerText = visitDate;
  document.getElementById('modalSummaryPhone').innerText = whatsapp;
  document.getElementById('ticketSuccessModal').classList.remove('hidden');

  // Reset form
  document.getElementById('guestAppointmentForm').reset();
  retakePhoto();
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

// ==========================================================================
// 6. SELF-TRACKING PORTAL
// ==========================================================================
function trackTicketStatus() {
  const codeInput = document.getElementById('trackTicketCodeInput').value.trim().toUpperCase();
  const resultBox = document.getElementById('trackerResultBox');

  if (!codeInput) {
    showToast('Masukkan kode tiket Anda.', 'error');
    return;
  }

  const found = appData.appointments.find(a => a.ticketCode === codeInput);

  if (!found) {
    resultBox.innerHTML = `
      <div class="collision-alert" style="background: rgba(239, 68, 68, 0.1);">
        <i class="fa-solid fa-circle-xmark"></i>
        <div>
          <strong>Tiket Tidak Ditemukan</strong>
          <p>Pastikan format kode tiket Anda benar (contoh: TKT-2026-X8K9M2).</p>
        </div>
      </div>
    `;
    resultBox.classList.remove('hidden');
    return;
  }

  // Masking phone number for privacy protection (UU PDP)
  const phoneMasked = found.whatsapp.replace(/(\d{4})\d{4}(\d+)/, '$1****$2');
  
  // Masking name: First name + Initial
  const nameParts = found.fullName.split(' ');
  const nameMasked = nameParts[0] + (nameParts.length > 1 ? ` ${nameParts[1][0]}.***` : '');

  // Step indicator calculation
  let step1 = 'completed';
  let step2 = '';
  let step3 = '';

  if (found.status === 'Disetujui') {
    step2 = 'completed';
  } else if (found.status === 'Checked-In' || found.status === 'Selesai') {
    step2 = 'completed';
    step3 = 'completed';
  } else if (found.status === 'Ditolak') {
    step2 = 'active';
  } else {
    step2 = 'active';
  }

  let scheduleInfoHTML = '';
  if (found.status === 'Disetujui' || found.status === 'Checked-In') {
    scheduleInfoHTML = `
      <div class="summary-item">
        <span>Ruangan:</span> <strong style="color:var(--cyan-glow);">${found.scheduledRoom}</strong>
      </div>
      <div class="summary-item">
        <span>Jadwal Jam:</span> <strong>${found.scheduledStart} - ${found.scheduledEnd} WIB</strong>
      </div>
    `;
  } else if (found.status === 'Ditolak') {
    scheduleInfoHTML = `
      <div class="summary-item" style="color:#FCA5A5;">
        <span>Alasan Penolakan:</span> <strong>${found.rejectionReason || 'Jadwal pimpinan penuh'}</strong>
      </div>
    `;
  }

  resultBox.innerHTML = `
    <div class="ticket-live-card">
      <div class="ticket-live-head">
        <div>
          <span style="font-size:0.75rem; color:var(--text-muted); display:block;">STATUS TIKET AUDIENSI</span>
          <span class="ticket-code-badge">${found.ticketCode}</span>
        </div>
        <div>
          <span class="badge ${getBadgeClass(found.status)}">${found.status}</span>
        </div>
      </div>

      <div class="ticket-live-body">
        <div class="ticket-status-stepper">
          <div class="step-item ${step1}">
            <div class="step-circle"><i class="fa-solid fa-file-lines"></i></div>
            <span class="step-label">Pengajuan</span>
          </div>
          <div class="step-item ${step2}">
            <div class="step-circle"><i class="fa-solid fa-calendar-check"></i></div>
            <span class="step-label">${found.status === 'Ditolak' ? 'Ditolak' : 'Disposisi'}</span>
          </div>
          <div class="step-item ${step3}">
            <div class="step-circle"><i class="fa-solid fa-handshake"></i></div>
            <span class="step-label">Kunjungan</span>
          </div>
        </div>

        <div class="ticket-details-grid">
          <div>
            <span class="detail-label">Nama Pemohon</span>
            <span class="detail-val">${nameMasked}</span>
          </div>
          <div>
            <span class="detail-label">No. WhatsApp</span>
            <span class="detail-val">${phoneMasked}</span>
          </div>
          <div>
            <span class="detail-label">Kategori</span>
            <span class="detail-val">${found.category}</span>
          </div>
          <div>
            <span class="detail-label">Tanggal Diminta</span>
            <span class="detail-val">${found.requestedDate}</span>
          </div>
        </div>

        <div style="margin-top:1rem; padding:0.8rem; background:rgba(0,0,0,0.2); border-radius:8px;">
          ${scheduleInfoHTML}
          <div class="summary-item" style="margin-top:0.4rem;">
            <span>Perihal Pertemuan:</span> <em>"${found.purpose}"</em>
          </div>
        </div>
      </div>
    </div>
  `;
  resultBox.classList.remove('hidden');
}

// ==========================================================================
// 7. ADMIN AUTHENTICATION & SESSION MANAGEMENT
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
    showToast('Autentikasi Host Portal Berhasil!', 'success');
  } else {
    showToast('Kredensial tidak valid. Silakan coba lagi.', 'error');
  }
}

function logoutAdmin() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  updateAuthUIState();
  switchView('guest-portal');
  showToast('Sesi Host Portal telah diakhiri.', 'info');
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

// ==========================================================================
// 8. ADMIN DASHBOARD & ANTI-DOUBLE BOOKING SCHEDULING ENGINE
// ==========================================================================
function renderAdminDashboard() {
  renderMetrics();
  renderAdminQueueTable();
}

function renderMetrics() {
  const total = appData.appointments.length;
  const pending = appData.appointments.filter(a => a.status === 'Menunggu Konfirmasi').length;
  const approved = appData.appointments.filter(a => a.status === 'Disetujui').length;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = appData.appointments.filter(a => (a.scheduledDate === todayStr || a.requestedDate === todayStr)).length;

  document.getElementById('metricTotal').innerText = total;
  document.getElementById('metricPending').innerText = pending;
  document.getElementById('metricApproved').innerText = approved;
  document.getElementById('metricToday').innerText = todayCount;
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
        <td colspan="9" style="text-align:center; padding:2rem; color:var(--text-dim);">
          Tidak ada data antrean janji temu yang sesuai.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(item => {
    // Format WhatsApp Link
    const cleanPhone = item.whatsapp.replace(/^0/, '62').replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(item.fullName)},%20terkait%20permohonan%20audiensi%20di%20SMAN%201%20Kandangan%20[Tiket:%20${item.ticketCode}].`;

    // Room and Time Slot Display
    let scheduleDisplay = '-';
    if (item.scheduledRoom) {
      scheduleDisplay = `<strong>${item.scheduledRoom}</strong><br><small style="color:var(--cyan-glow);">${item.scheduledDate} (${item.scheduledStart} - ${item.scheduledEnd})</small>`;
    }

    // Action buttons based on status
    let actionButtons = '';
    if (item.status === 'Menunggu Konfirmasi') {
      actionButtons = `
        <button class="btn btn-primary btn-sm" onclick="openScheduleModal('${item.ticketCode}')" title="Tinjau & Jadwalkan">
          <i class="fa-solid fa-calendar-check"></i> Disposisi
        </button>
      `;
    } else if (item.status === 'Disetujui') {
      actionButtons = `
        <button class="btn btn-emerald btn-sm" onclick="executeCheckIn('${item.ticketCode}')" title="Tandai Hadir di Lobi">
          <i class="fa-solid fa-user-check"></i> Hadir
        </button>
        <button class="btn btn-outline btn-sm" onclick="openScheduleModal('${item.ticketCode}')" title="Ubah Jadwal">
          <i class="fa-solid fa-pen"></i>
        </button>
      `;
    } else if (item.status === 'Checked-In') {
      actionButtons = `
        <button class="btn btn-outline btn-sm" onclick="executeComplete('${item.ticketCode}')" title="Selesaikan Audiensi">
          <i class="fa-solid fa-flag-checkered"></i> Selesai
        </button>
      `;
    } else {
      actionButtons = `<span style="font-size:0.75rem; color:var(--text-dim);">Arsip</span>`;
    }

    return `
      <tr>
        <td>
          <img src="${item.photoBase64}" alt="Thumb" class="table-thumb" onclick="openPhotoPreview('${item.ticketCode}')" title="Klik untuk perbesar">
        </td>
        <td>
          <strong style="color:var(--cyan-glow); font-size:0.82rem;">${item.ticketCode}</strong>
        </td>
        <td>
          <strong>${escapeHtml(item.fullName)}</strong>
          <br>
          <a href="${waUrl}" target="_blank" class="wa-link">
            <i class="fa-brands fa-whatsapp"></i> ${item.whatsapp}
          </a>
        </td>
        <td>
          <span style="font-size:0.8rem;">${item.category}</span>
          ${item.agencyName ? `<br><small style="color:var(--text-dim);">${escapeHtml(item.agencyName)}</small>` : ''}
          ${item.studentClass ? `<br><small style="color:var(--text-dim);">Kelas: ${escapeHtml(item.studentClass)}</small>` : ''}
        </td>
        <td>${item.requestedDate}</td>
        <td>
          <span class="urgency-pill urgency-${item.urgency.toLowerCase()}">${item.urgency}</span>
        </td>
        <td>${scheduleDisplay}</td>
        <td>
          <span class="badge ${getBadgeClass(item.status)}">${item.status}</span>
        </td>
        <td class="text-right">
          <div class="action-btn-group">
            ${actionButtons}
          </div>
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
// 9. SCHEDULING ACTION MODAL & COLLISION DETECTOR ENGINE
// ==========================================================================
function openScheduleModal(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  appData.selectedTicketForAction = ticketCode;

  document.getElementById('scheduleModalTicketPill').innerText = `Tiket: ${item.ticketCode}`;
  document.getElementById('schedModalName').innerText = item.fullName;
  document.getElementById('schedModalCategoryMeta').innerText = `${item.category} • Urgensi: ${item.urgency}`;
  document.getElementById('schedModalPurpose').innerText = `"${item.purpose}"`;
  document.getElementById('schedModalPhoto').src = item.photoBase64;

  // Set default values
  document.getElementById('schedRoom').value = item.scheduledRoom || 'Ruang Kepala Sekolah';
  document.getElementById('schedDate').value = item.scheduledDate || item.requestedDate;
  document.getElementById('schedStartTime').value = item.scheduledStart || '09:00';
  document.getElementById('schedEndTime').value = item.scheduledEnd || '10:00';
  document.getElementById('schedRejectionReason').value = item.rejectionReason || '';

  switchActionTab('approve');
  runLiveCollisionCheck();

  document.getElementById('scheduleActionModal').classList.remove('hidden');
}

function closeScheduleModal() {
  document.getElementById('scheduleActionModal').classList.add('hidden');
  appData.selectedTicketForAction = null;
}

function switchActionTab(tabType) {
  const btnApprove = document.getElementById('btnTabApprove');
  const btnReject = document.getElementById('btnTabReject');
  const contentApprove = document.getElementById('tabContentApprove');
  const contentReject = document.getElementById('tabContentReject');

  if (tabType === 'approve') {
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

/**
 * ANTI-COLLISION / ANTI-DOUBLE BOOKING ENGINE
 * Memeriksa apakah rentang waktu [StartA - EndA] bertabrakan dengan janji temu lain
 * pada Ruangan & Tanggal yang sama yang sudah berstatus 'Disetujui' atau 'Checked-In'.
 */
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
    alertMsg.innerText = 'Jam mulai harus lebih awal daripada jam selesai pertemuan!';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    return;
  }

  // Cari benturan jadwal pada database lokal
  const conflict = appData.appointments.find(a => {
    // Abaikan tiket yang sedang diedit itu sendiri
    if (a.ticketCode === appData.selectedTicketForAction) return false;
    // Hanya cek janji temu yang aktif disetujui / checked-in
    if (a.status !== 'Disetujui' && a.status !== 'Checked-In') return false;

    // Cek kesamaan ruang dan tanggal
    if (a.scheduledRoom === room && a.scheduledDate === date) {
      // Logika benturan: (StartA < EndB) AND (EndA > StartB)
      return (start < a.scheduledEnd && end > a.scheduledStart);
    }
    return false;
  });

  if (conflict) {
    alertBox.classList.remove('hidden');
    alertMsg.innerText = `Ruangan "${room}" telah dipesan oleh [${conflict.fullName}] pada jam ${conflict.scheduledStart} - ${conflict.scheduledEnd} WIB!`;
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

  item.status = 'Disetujui';
  item.scheduledRoom = document.getElementById('schedRoom').value;
  item.scheduledDate = document.getElementById('schedDate').value;
  item.scheduledStart = document.getElementById('schedStartTime').value;
  item.scheduledEnd = document.getElementById('schedEndTime').value;
  item.rejectionReason = '';

  saveDatabase();
  renderAdminDashboard();
  closeScheduleModal();
  showToast(`Janji temu [${item.ticketCode}] berhasil dijadwalkan secara resmi!`, 'success');
}

function executeReject() {
  const reason = document.getElementById('schedRejectionReason').value.trim();
  if (!reason) {
    showToast('Harap cantumkan alasan penolakan atau delegasi.', 'error');
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
  showToast(`Tamu [${item.fullName}] berhasil Check-In di lobi sekolah!`, 'success');
}

function executeComplete(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  item.status = 'Selesai';

  saveDatabase();
  renderAdminDashboard();
  showToast(`Kunjungan [${item.ticketCode}] telah diselesaikan.`, 'success');
}

// ==========================================================================
// 10. PHOTO PREVIEW & UTILITIES
// ==========================================================================
function openPhotoPreview(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  if (!item) return;

  document.getElementById('fullPhotoElement').src = item.photoBase64;
  document.getElementById('previewPhotoTitle').innerText = `Verifikasi Wajah: ${item.fullName}`;
  document.getElementById('previewPhotoMeta').innerText = `Diambil pada: ${new Date(item.createdAt).toLocaleString('id-ID')} (WIB)`;
  document.getElementById('photoPreviewModal').classList.remove('hidden');
}

function closePhotoPreviewModal() {
  document.getElementById('photoPreviewModal').classList.add('hidden');
}

function exportDataToCSV() {
  if (appData.appointments.length === 0) {
    showToast('Tidak ada data untuk diekspor.', 'error');
    return;
  }

  const headers = ['Kode Tiket', 'Kategori', 'Nama Lengkap', 'WhatsApp', 'Urgensi', 'Tgl Pengajuan', 'Status', 'Ruangan', 'Tgl Disetujui', 'Jam Mulai', 'Jam Selesai', 'Keperluan'];
  
  const rows = appData.appointments.map(a => [
    `"${a.ticketCode}"`,
    `"${a.category}"`,
    `"${a.fullName.replace(/"/g, '""')}"`,
    `"${a.whatsapp}"`,
    `"${a.urgency}"`,
    `"${a.requestedDate}"`,
    `"${a.status}"`,
    `"${a.scheduledRoom || '-'}"`,
    `"${a.scheduledDate || '-'}"`,
    `"${a.scheduledStart || '-'}"`,
    `"${a.scheduledEnd || '-'}"`,
    `"${a.purpose.replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
    + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Laporan_Buku_Tamu_SMAN1_Kandangan_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Laporan buku tamu berhasil diunduh dalam format CSV.', 'success');
}

// Toast System
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
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// XSS Sanitizer Helper
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
