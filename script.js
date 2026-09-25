/**
 * SISTEM BUKU TAMU DIGITAL & E-DISPENSASI TERPADU (SIMTADIK)
 * SMAN 1 KANDANGAN KEDIRI - ENGINE VERSION 12.0 (AUTO-EXPIRE & 3-STRIKE BAN SYSTEM)
 */

const STORAGE_KEY = 'SMAN1_KANDANGAN_APPOINTMENTS_V11';
const ADMIN_SESSION_KEY = 'SMAN1_ADMIN_AUTH_SESSION';
const THEME_STORAGE_KEY = 'SMAN1_UI_THEME';
const ADMIN_CREDENTIALS = { username: 'admin1234', password: '1234admin' };

const DEFAULT_APPROVE_TEMPLATE = "Permohonan audiensi disetujui. Harap hadir tepat waktu di lokasi yang telah ditentukan dengan membawa tanda pengenal.";
const DEFAULT_REJECT_TEMPLATE = "Mohon maaf, permohonan audiensi belum dapat dipenuhi sehubungan dengan adanya agenda kedinasan pimpinan pada waktu bersamaan.";
const DEFAULT_RESCHEDULE_TEMPLATE = "Pemberitahuan Penjadwalan Ulang (Reschedule): Mohon maaf yang sebesar-besarnya atas ketidaknyamanan ini. Sehubungan dengan adanya agenda kedinasan pimpinan yang mendesak dan mendadak, waktu audiensi disesuaikan kembali sesuai jadwal baru tertera.";

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

let appData = {
  appointments: [], activeStream: null, capturedBase64: null, currentWizardStep: 1,
  selectedTicketForAction: null, activeLetterTicketCode: null, calendarOffsetWeeks: 0,
  activeAdminSubView: 'table', liveClockTimer: null
};

function initTheme() { applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'dark'); }
function toggleTheme() {
  const newTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
  applyTheme(newTheme); localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  showToast(`Mode ${newTheme === 'light' ? 'Terang' : 'Gelap'} aktif`, 'info');
}
function applyTheme(theme) {
  const icon = document.getElementById('themeToggleIcon');
  if (theme === 'light') { document.body.classList.add('light-theme'); if (icon) icon.className = 'fa-solid fa-moon'; }
  else { document.body.classList.remove('light-theme'); if (icon) icon.className = 'fa-solid fa-sun'; }
}

function formatIndonesianDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return `${dayNames[d.getDay()]}, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
}

function generateTicketCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let p1 = '', p2 = '';
  for (let i = 0; i < 4; i++) p1 += chars.charAt(Math.floor(Math.random() * chars.length));
  for (let i = 0; i < 5; i++) p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  return `SMANSAKA-${p1}-${p2}`;
}

function generateOfficialLetterNumber(index) {
  const paddedNo = String(index || Math.floor(Math.random() * 800) + 100).padStart(3, '0');
  return `421.3 / ${paddedNo} / 101.6.14 / ${new Date().getFullYear()}`;
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme(); loadDatabase(); checkAndExpireAppointments(); initializeVisitDateInput(); updateAuthUIState();
  const ticketParam = new URLSearchParams(window.location.search).get('ticket');
  if (ticketParam) {
    switchView('tracking-portal');
    const input = document.getElementById('trackTicketCodeInput');
    if (input) { input.value = ticketParam; trackTicketStatus(); }
  }
});

function loadDatabase() {
  const stored = localStorage.getItem(STORAGE_KEY);
  appData.appointments = stored ? JSON.parse(stored) : [];
}
function saveDatabase() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(appData.appointments)); }
  catch (e) { showToast('Penyimpanan lokal penuh.', 'error'); }
}
function resetAllData() {
  if (confirm("Kosongkan seluruh data antrean di sistem?")) {
    localStorage.removeItem(STORAGE_KEY); appData.appointments = []; saveDatabase();
    renderAdminDashboard(); showToast("Tabel antrean berhasil dibersihkan total!", "success");
  }
}
function initializeVisitDateInput() {
  const today = new Date().toISOString().split('T')[0];
  const visitInput = document.getElementById('visitDate');
  if (visitInput) { visitInput.min = today; visitInput.value = today; }
}

// ==========================================================================
// AUTO-EXPIRE (H+1 NO-SHOW) & SISTEM SANKSI BLOKIR (3-STRIKE BAN)
// ==========================================================================
function checkAndExpireAppointments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let changed = false;

  appData.appointments.forEach(item => {
    // Berlaku untuk yang belum pernah check-in
    if (item.status === 'Disetujui' || item.status === 'Menunggu Konfirmasi' || item.status === 'Tawaran Delegasi') {
      const targetDateStr = item.scheduledDate || item.visitDate;
      if (targetDateStr) {
        const appointmentDate = new Date(targetDateStr + 'T00:00:00');
        // Jika tanggal janji temu sudah berlalu sebelum hari ini (H+1 penuh)
        if (appointmentDate < today && !item.checkInAt) {
          item.status = 'Kadaluarsa';
          item.expiredAt = new Date().toISOString();
          item.rejectionReason = "Tiket hangus/kadaluarsa otomatis karena pemohon tidak hadir (No-Show) melakukan check-in pada hari yang ditentukan.";
          changed = true;
        }
      }
    }
  });

  if (changed) {
    saveDatabase();
  }
}

function getGuestNoShowCount(whatsapp) {
  if (!whatsapp) return 0;
  const clean = formatToWhatsApp(whatsapp);
  return appData.appointments.filter(a => formatToWhatsApp(a.whatsapp) === clean && a.status === 'Kadaluarsa').length;
}

function isGuestBanned(whatsapp) {
  return getGuestNoShowCount(whatsapp) >= 3;
}

function switchView(viewId) {
  ['guest-portal', 'tracking-portal', 'admin-portal'].forEach(v => document.getElementById(`${v}-view`)?.classList.add('hidden'));
  document.getElementById('tabGuestBtn')?.classList.remove('active');
  document.getElementById('tabTrackBtn')?.classList.remove('active');
  document.getElementById('tabAdminBtn')?.classList.remove('active');
  if (appData.liveClockTimer) { clearInterval(appData.liveClockTimer); appData.liveClockTimer = null; }

  if (viewId === 'guest-portal') {
    document.getElementById('guest-portal-view')?.classList.remove('hidden');
    document.getElementById('tabGuestBtn')?.classList.add('active');
    if (appData.currentWizardStep === 3 && !appData.capturedBase64) startCamera();
  } else if (viewId === 'tracking-portal') {
    checkAndExpireAppointments();
    document.getElementById('tracking-portal-view')?.classList.remove('hidden');
    document.getElementById('tabTrackBtn')?.classList.add('active');
    stopCamera();
  } else if (viewId === 'admin-portal') {
    checkAndExpireAppointments();
    document.getElementById('admin-portal-view')?.classList.remove('hidden');
    document.getElementById('tabAdminBtn')?.classList.add('active');
    stopCamera(); renderAdminDashboard();
  }
}

function handleAdminNavClick() {
  if (localStorage.getItem(ADMIN_SESSION_KEY) === 'active') switchView('admin-portal');
  else openAdminLoginModal();
}

function handleCategoryChange() {
  const cat = document.getElementById('guestCategory').value;
  const targetSelect = document.getElementById('targetOfficial');
  document.getElementById('dynamicStudentFields')?.classList.add('hidden');
  document.getElementById('dynamicParentFields')?.classList.add('hidden');
  document.getElementById('dynamicInstansiFields')?.classList.add('hidden');

  if (cat === 'Siswa') {
    document.getElementById('dynamicStudentFields')?.classList.remove('hidden');
    if (targetSelect) targetSelect.value = 'Koordinator Guru BK';
  } else if (cat === 'Orang Tua Murid') {
    document.getElementById('dynamicParentFields')?.classList.remove('hidden');
    if (targetSelect) targetSelect.value = 'Koordinator Guru BK';
  } else if (cat === 'Instansi / Kedinasan') {
    document.getElementById('dynamicInstansiFields')?.classList.remove('hidden');
    if (targetSelect) targetSelect.value = 'Kepala SMAN 1 Kandangan';
  } else if (targetSelect) { targetSelect.value = 'Kepala SMAN 1 Kandangan'; }
}

function goToStep(targetStep) {
  if (targetStep === 2 && appData.currentWizardStep === 1 && !validateStep1()) return;
  if (targetStep === 3 && appData.currentWizardStep === 2 && !validateStep2()) return;
  if (targetStep === 3 && appData.currentWizardStep === 1 && (!validateStep1() || !validateStep2())) return;

  for (let i = 1; i <= 3; i++) {
    document.getElementById(`wizardStep${i}`)?.classList.add('hidden');
    document.getElementById(`stepIndicator${i}`)?.classList.remove('active');
  }
  document.getElementById(`wizardStep${targetStep}`)?.classList.remove('hidden');
  document.getElementById(`stepIndicator${targetStep}`)?.classList.add('active');

  if (targetStep >= 2) { document.getElementById('stepIndicator1')?.classList.add('completed'); document.getElementById('stepLine1')?.classList.add('filled'); }
  else { document.getElementById('stepIndicator1')?.classList.remove('completed'); document.getElementById('stepLine1')?.classList.remove('filled'); }

  if (targetStep === 3) {
    document.getElementById('stepIndicator2')?.classList.add('completed'); document.getElementById('stepLine2')?.classList.add('filled');
    if (!appData.capturedBase64) startCamera();
  } else { document.getElementById('stepIndicator2')?.classList.remove('completed'); document.getElementById('stepLine2')?.classList.remove('filled'); stopCamera(); }

  appData.currentWizardStep = targetStep;
  window.scrollTo({ top: 100, behavior: 'smooth' });
}

function validateStep1() {
  const cat = document.getElementById('guestCategory').value;
  const target = document.getElementById('targetOfficial').value;
  const name = document.getElementById('fullName').value.trim();
  const wa = document.getElementById('whatsappNumber').value.trim();

  if (!cat || !target) { showToast('Lengkapi kategori dan pejabat tujuan.', 'error'); return false; }
  
  // VALIDASI BLOKIR SANKSI (3 KALI NO-SHOW)
  if (isGuestBanned(wa)) {
    showToast('Nomor WhatsApp Anda DIBLOKIR oleh sistem karena 3x tidak hadir (No-Show). Hubungi pos resepsionis sekolah.', 'error');
    return false;
  }

  if (cat === 'Siswa') {
    const nisn = document.getElementById('studentNisn').value.trim();
    if (!nisn || !/^\d{10}$/.test(nisn)) { showToast('Cantumkan 10 digit NISN yang valid.', 'error'); return false; }
    if (!document.getElementById('studentClass').value.trim()) { showToast('Cantumkan Kelas/Rombel siswa.', 'error'); return false; }
  } else if (cat === 'Orang Tua Murid' && document.getElementById('parentChildName').value.trim().length < 3) {
    showToast('Sebutkan nama putra/putri yang diwakili.', 'error'); return false;
  } else if (cat === 'Instansi / Kedinasan') {
    if (document.getElementById('agencyName').value.trim().length < 3 || document.getElementById('agencyAddress').value.trim().length < 5) {
      showToast('Lengkapi nama dan alamat kantor instansi.', 'error'); return false;
    }
  }
  if (name.length < 3) { showToast('Nama lengkap minimal 3 karakter.', 'error'); return false; }
  const cleanPhone = wa.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 14) { showToast('Nomor WhatsApp harus 10-14 digit angka.', 'error'); return false; }
  return true;
}

function validateStep2() {
  const visitDate = document.getElementById('visitDate').value;
  const startTime = document.getElementById('preferredStartTime')?.value;
  const endTime = document.getElementById('preferredEndTime')?.value;
  const purpose = document.getElementById('visitPurpose').value.trim();

  if (!visitDate) { showToast('Pilih rencana tanggal kunjungan.', 'error'); return false; }
  const selDate = new Date(visitDate + 'T00:00:00'), today = new Date(); today.setHours(0, 0, 0, 0);
  if (selDate < today) { showToast('Tanggal kunjungan tidak boleh di masa lampau.', 'error'); return false; }
  if (selDate.getDay() === 0) { showToast('Layanan libur hari Minggu. Pilih hari kerja.', 'error'); return false; }

  if (!startTime || !endTime) { showToast('Tentukan rencana jam mulai dan jam selesai audiensi.', 'error'); return false; }
  if (startTime >= endTime) { showToast('Jam mulai audiensi harus lebih awal daripada jam selesai.', 'error'); return false; }

  if (purpose.length < 10) { showToast('Keperluan terlalu singkat (min 10 karakter).', 'error'); return false; }
  return true;
}

async function startCamera() {
  const video = document.getElementById('webcamVideo');
  if (!navigator.mediaDevices?.getUserMedia) { document.getElementById('cameraPlaceholder')?.classList.remove('hidden'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    appData.activeStream = stream;
    if (video) { video.srcObject = stream; video.classList.remove('hidden'); }
    document.getElementById('cameraPlaceholder')?.classList.add('hidden');
  } catch (err) { document.getElementById('cameraPlaceholder')?.classList.remove('hidden'); }
}

function stopCamera() {
  if (appData.activeStream) { appData.activeStream.getTracks().forEach(t => t.stop()); appData.activeStream = null; }
}

function takePhoto() {
  const video = document.getElementById('webcamVideo'), canvas = document.getElementById('photoCanvas'), capturedImg = document.getElementById('capturedImage');
  if (!appData.activeStream || !video || video.videoWidth === 0) { synthesizeFallbackPhoto(); return; }
  canvas.width = 320; canvas.height = 240;
  const ctx = canvas.getContext('2d'); ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, 320, 240);
  const dataURL = canvas.toDataURL('image/jpeg', 0.65);
  appData.capturedBase64 = dataURL;
  if (capturedImg) capturedImg.src = dataURL;
  document.getElementById('cameraPreviewContainer')?.classList.add('hidden');
  document.getElementById('capturedResultContainer')?.classList.remove('hidden');
  document.getElementById('snapPhotoBtn')?.classList.add('hidden');
  document.getElementById('retakePhotoBtn')?.classList.remove('hidden');
  stopCamera(); showToast('Foto wajah berhasil diverifikasi!', 'success');
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
  const canvas = document.getElementById('photoCanvas'); canvas.width = 320; canvas.height = 240;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 320, 240);
  ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(160, 90, 45, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1e40af'; ctx.beginPath(); ctx.arc(160, 220, 80, 0, Math.PI, true); ctx.fill();
  const data = canvas.toDataURL('image/jpeg', 0.65); appData.capturedBase64 = data;
  const capturedImg = document.getElementById('capturedImage'); if (capturedImg) capturedImg.src = data;
  document.getElementById('cameraPreviewContainer')?.classList.add('hidden');
  document.getElementById('capturedResultContainer')?.classList.remove('hidden');
  document.getElementById('snapPhotoBtn')?.classList.add('hidden');
  document.getElementById('retakePhotoBtn')?.classList.remove('hidden');
  showToast('Simulasi biometrik wajah dimuat.', 'info');
}

function timeToMinutes(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function hitungDispensasiPelajaran(startStr, endStr) {
  const sMin = timeToMinutes(startStr), eMin = timeToMinutes(endStr);
  const terpotong = []; let total = 0;
  ROSTER_SEKOLAH.forEach(sesi => {
    const sesiS = timeToMinutes(sesi.mulai), sesiE = timeToMinutes(sesi.selesai);
    if (sMin < sesiE && eMin > sesiS && sesi.tipe === 'belajar') {
      terpotong.push(sesi.no); total += (Math.min(eMin, sesiE) - Math.max(sMin, sesiS));
    }
  });
  let label = terpotong.length === 1 ? `Jam Pelajaran ke-${terpotong[0]}` : terpotong.length > 1 ? `Jam Pelajaran ke-${terpotong[0]} s.d. ke-${terpotong[terpotong.length - 1]}` : `Waktu Istirahat`;
  return { isKena: terpotong.length > 0, labelJam: label, totalMenit: total };
}

function handleFormSubmission(e) {
  e.preventDefault();
  const wa = document.getElementById('whatsappNumber').value.trim();

  // Proteksi Blokir
  if (isGuestBanned(wa)) {
    showToast('Pendaftaran ditolak. Nomor Anda telah diblokir permanen karena 3x No-Show.', 'error');
    return;
  }

  if (!appData.capturedBase64) { showToast('Ambil foto wajah terlebih dahulu.', 'error'); return; }
  const ticketCode = generateTicketCode();
  const preferredStart = document.getElementById('preferredStartTime')?.value || '08:30';
  const preferredEnd = document.getElementById('preferredEndTime')?.value || '09:30';

  const newAppointment = {
    ticketCode, category: document.getElementById('guestCategory').value,
    targetOfficial: document.getElementById('targetOfficial').value,
    fullName: document.getElementById('fullName').value.trim(),
    whatsapp: wa,
    visitDate: document.getElementById('visitDate').value,
    preferredStart: preferredStart,
    preferredEnd: preferredEnd,
    urgency: document.getElementById('urgencyLevel').value,
    purpose: document.getElementById('visitPurpose').value.trim(),
    studentNisn: document.getElementById('studentNisn')?.value.trim() || null,
    studentClass: document.getElementById('studentClass')?.value.trim() || null,
    parentChildName: document.getElementById('parentChildName')?.value.trim() || null,
    agencyName: document.getElementById('agencyName')?.value.trim() || null,
    agencyAddress: document.getElementById('agencyAddress')?.value.trim() || null,
    photoBase64: appData.capturedBase64, status: 'Menunggu Konfirmasi',
    hostOfficer: document.getElementById('targetOfficial').value, officialLetterNo: null,
    scheduledRoom: null, scheduledDate: null,
    scheduledStart: preferredStart, scheduledEnd: preferredEnd,
    approvalMessage: '', rejectionReason: '', isRescheduled: false, isDelegated: false,
    guestDeclineReason: '', checkInAt: null, createdAt: new Date().toISOString()
  };

  appData.appointments.unshift(newAppointment); saveDatabase();
  document.getElementById('modalTicketCode').innerText = ticketCode;
  document.getElementById('modalSummaryName').innerText = newAppointment.fullName;
  document.getElementById('modalSummaryOfficial').innerText = newAppointment.targetOfficial;
  document.getElementById('modalSummaryDate').innerText = `${newAppointment.visitDate} (${preferredStart} - ${preferredEnd} WIB)`;
  document.getElementById('modalSummaryPhone').innerText = newAppointment.whatsapp;
  document.getElementById('ticketSuccessModal')?.classList.remove('hidden');
  document.getElementById('guestAppointmentForm').reset();
  handleCategoryChange(); retakePhoto(); goToStep(1);
}

function closeTicketModal() { document.getElementById('ticketSuccessModal')?.classList.add('hidden'); }
function copyModalTicketCode() {
  navigator.clipboard.writeText(document.getElementById('modalTicketCode').innerText).then(() => showToast('Kode tiket berhasil disalin!', 'success'));
}

function formatToWhatsApp(phone) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.substring(1);
  else if (!clean.startsWith('62')) clean = '62' + clean;
  return clean;
}

function trackTicketStatus() {
  checkAndExpireAppointments();
  const code = document.getElementById('trackTicketCodeInput').value.trim().toUpperCase();
  const resultBox = document.getElementById('trackerResultBox');
  if (appData.liveClockTimer) { clearInterval(appData.liveClockTimer); appData.liveClockTimer = null; }
  if (!code) { showToast('Masukkan kode tiket SMANSAKA.', 'error'); return; }

  const found = appData.appointments.find(a => a.ticketCode === code);
  if (!found) {
    resultBox.innerHTML = `<div class="collision-alert"><i class="fa-solid fa-circle-xmark"></i><div><strong>Tiket Tidak Ditemukan</strong><p>Pastikan kode tiket sesuai format.</p></div></div>`;
    resultBox.classList.remove('hidden'); return;
  }

  // KONDISI KADALUARSA (H+1 NO-SHOW)
  if (found.status === 'Kadaluarsa') {
    const strikes = getGuestNoShowCount(found.whatsapp);
    const banned = strikes >= 3;
    resultBox.innerHTML = `
      <div class="glass-card" style="padding:1.4rem; margin-top:1rem; border:1px solid var(--rose-danger);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <span style="font-weight:800; color:var(--rose-danger);">${found.ticketCode}</span>
          <span class="badge badge-rejected"><i class="fa-solid fa-hourglass-end"></i> HANGUS / KADALUARSA</span>
        </div>
        <div style="background:rgba(239, 68, 68, 0.08); border-left:4px solid var(--rose-danger); padding:0.85rem; border-radius:8px;">
          <strong style="color:#FCA5A5; font-size:0.88rem; display:block;">
            <i class="fa-solid fa-triangle-exclamation"></i> Masa Berlaku Tiket Telah Berakhir
          </strong>
          <p style="font-size:0.84rem; color:#fff; margin-top:0.35rem; line-height:1.45;">
            Tiket audiensi Anda untuk tanggal <strong>${formatIndonesianDate(found.scheduledDate || found.visitDate)}</strong> telah <strong>Hangus & Kadaluarsa</strong> karena Anda tidak hadir melakukan presensi (check-in) di lobi sekolah.
          </p>
          <div style="margin-top:0.6rem; padding:0.4rem 0.6rem; background:rgba(0,0,0,0.3); border-radius:6px; font-size:0.78rem;">
            Catatan Pelanggaran No-Show: <strong style="color:${banned ? '#ef4444' : 'var(--amber-warning)'};">${strikes}/3 Kali</strong>
            ${banned ? '<br><span style="color:#ef4444; font-weight:800;">PERINGATAN: Nomor WhatsApp Anda telah DIBLOKIR permanen dari sistem SIMTADIK.</span>' : '<br><span style="color:var(--text-muted);">*Jika mangkir mencapai 3 kali, identitas Anda akan diblokir otomatis.</span>'}
          </div>
        </div>
        <p style="font-size:0.78rem; color:var(--text-dim); margin-top:0.85rem; font-style:italic;">
          *Apabila masih berkepentingan, silakan melakukan pengisian formulir pendaftaran baru di lobi sekolah.
        </p>
      </div>
    `;
    resultBox.classList.remove('hidden');
    return;
  }

  // KONDISI TAWARAN DELEGASI
  if (found.status === 'Tawaran Delegasi') {
    resultBox.innerHTML = `
      <div class="glass-card" style="padding:1.4rem; margin-top:1rem; border:1px solid var(--amber-warning);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <span style="font-weight:800; color:var(--cyan-glow);">${found.ticketCode}</span>
          <span class="badge badge-pending">Pemberitahuan Delegasi</span>
        </div>
        <div style="background:rgba(245, 158, 11, 0.1); border-left:4px solid var(--amber-warning); padding:0.85rem; border-radius:8px; margin-bottom:1rem;">
          <strong style="color:var(--amber-warning); font-size:0.88rem; display:block;">
            <i class="fa-solid fa-triangle-exclamation"></i> Pimpinan Berhalangan Hadir
          </strong>
          <p style="font-size:0.84rem; color:#fff; margin-top:0.35rem; line-height:1.45;">
            Mohon maaf, <strong>${escapeHtml(found.targetOfficial)}</strong> sedang memiliki agenda kedinasan mendesak lain pada hari tersebut. Permohonan audiensi Anda dialihkan kepada:
          </p>
          <p style="font-size:0.95rem; font-weight:800; color:var(--cyan-glow); margin:0.35rem 0;">
            <i class="fa-solid fa-user-tie"></i> ${escapeHtml(found.hostOfficer)}
          </p>
          <small style="color:var(--text-muted);">
            Ruangan: <strong>${escapeHtml(found.scheduledRoom)}</strong> | Waktu: <strong>${found.scheduledDate} (${found.scheduledStart} - ${found.scheduledEnd} WIB)</strong>
          </small>
        </div>
        <p style="font-size:0.84rem; color:var(--text-muted); margin-bottom:1rem;">
          Apakah Anda bersedia melanjutkan audiensi dengan pejabat penerima pengganti di atas?
        </p>
        <div style="display:flex; flex-direction:column; gap:0.5rem;" id="delegationActionButtonsBox">
          <button type="button" class="btn btn-emerald btn-block" onclick="acceptDelegation('${found.ticketCode}')">
            <i class="fa-solid fa-circle-check"></i> Setujui & Temui ${escapeHtml(found.hostOfficer)}
          </button>
          <button type="button" class="btn btn-outline btn-block" style="color:var(--rose-danger); border-color:var(--rose-danger);" onclick="showRejectDelegationInput()">
            <i class="fa-solid fa-circle-xmark"></i> Tolak Tawaran & Batalkan Audiensi
          </button>
        </div>
        <div id="delegationRejectArea" class="hidden" style="margin-top:1rem; padding-top:0.85rem; border-top:1px dashed var(--border-subtle);">
          <label class="field-label" style="color:#FCA5A5;">Uraikan Alasan Pembatalan / Penolakan Delegasi:</label>
          <textarea id="guestDeclineReasonInput" class="form-control" rows="3" placeholder="Contoh: Kami memerlukan tanda tangan langsung Ibu Kepala Sekolah, mohon dijadwalkan ulang..."></textarea>
          <div style="display:flex; gap:0.5rem; margin-top:0.65rem;">
            <button type="button" class="btn btn-danger btn-sm" onclick="submitRejectDelegation('${found.ticketCode}')">Kirim & Batalkan</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="cancelRejectDelegation()">Kembali</button>
          </div>
        </div>
      </div>
    `;
    resultBox.classList.remove('hidden');
    return;
  }

  // KONDISI DELEGASI DITOLAK
  if (found.status === 'Delegasi Ditolak') {
    resultBox.innerHTML = `
      <div class="glass-card" style="padding:1.4rem; margin-top:1rem; border:1px solid var(--rose-danger);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <span style="font-weight:800; color:var(--rose-danger);">${found.ticketCode}</span>
          <span class="badge badge-rejected"><i class="fa-solid fa-ban"></i> Batal & Kadaluarsa</span>
        </div>
        <div style="background:rgba(239, 68, 68, 0.08); border-left:4px solid var(--rose-danger); padding:0.85rem; border-radius:8px;">
          <strong style="color:#FCA5A5; font-size:0.88rem; display:block;">
            <i class="fa-solid fa-circle-xmark"></i> Audiensi Dibatalkan oleh Pemohon
          </strong>
          <p style="font-size:0.84rem; color:#fff; margin-top:0.35rem; line-height:1.45;">
            Anda telah menolak tawaran pengalihan audiensi. Sesuai prosedur birokrasi, tiket registrasi ini dinyatakan <strong>Batal & Kadaluarsa</strong>.
          </p>
          <p style="font-size:0.8rem; color:#FCA5A5; margin-top:0.4rem; font-style:italic;">
            Alasan penolakan Anda: "${escapeHtml(found.guestDeclineReason || '-')}"
          </p>
        </div>
      </div>
    `;
    resultBox.classList.remove('hidden');
    return;
  }

  // KATEGORI SISWA: E-DISPEN
  if (found.category === 'Siswa') {
    if (found.status === 'Disetujui' || found.status === 'Checked-In') {
      const dispen = hitungDispensasiPelajaran(found.scheduledStart, found.scheduledEnd);
      resultBox.innerHTML = `
        <div class="edispen-card">
          <div class="edispen-header">
            <div class="edispen-brand"><i class="fa-solid fa-graduation-cap"></i> E-DISPENSASI SMAN 1 KANDANGAN</div>
            <div class="edispen-live-clock" id="liveDispenClock">Memuat jam...</div>
          </div>
          <div class="edispen-body">
            <h3 class="edispen-student-name">${escapeHtml(found.fullName)}</h3>
            <div class="edispen-student-class">Kelas: <strong>${escapeHtml(found.studentClass || '-')}</strong> • NISN: ${escapeHtml(found.studentNisn || '-')}</div>
            <div class="edispen-date-row"><i class="fa-solid fa-calendar-day"></i> ${formatIndonesianDate(found.scheduledDate || found.visitDate)}</div>
            <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.4rem;">Tujuan: <strong style="color:#fff;">${escapeHtml(found.hostOfficer || 'Guru BK')}</strong> (${escapeHtml(found.scheduledRoom || 'Ruang BK')})</div>
            <div class="edispen-highlight-box">
              <div class="edispen-period-title"><i class="fa-solid fa-bell"></i> ${dispen.labelJam}</div>
              <div class="edispen-period-time">Waktu: <strong>${found.scheduledStart} - ${found.scheduledEnd} WIB</strong> (${dispen.totalMenit} Menit Efektif Pembelajaran)</div>
            </div>
            <div class="edispen-note-box">
              <span class="edispen-note-label"><i class="fa-solid fa-comment-dots"></i> Catatan Lembar Disposisi:</span>
              <p class="edispen-note-text">"${escapeHtml(found.approvalMessage || 'Disetujui untuk mengikuti sesi bimbingan konseling.')}"</p>
            </div>
            <p style="font-size:0.75rem; color:var(--text-dim); margin-top:0.4rem; font-style:italic;">*Tunjukkan layar ini kepada Guru Mapel di kelas sebagai izin sah meninggalkan KBM.</p>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed rgba(255,255,255,0.18); padding-top:0.75rem; margin-top:0.5rem;">
            <span class="edispen-status-pill status-active-pulse"><i class="fa-solid fa-circle-check"></i> IZIN SAH DIGITAL</span>
            <span style="font-size:0.74rem; color:var(--text-dim); font-family:monospace;">${found.ticketCode}</span>
          </div>
        </div>
      `;
      startLiveDispenClock();
    } else { resultBox.innerHTML = renderStandardStatusCard(found); }
  } else if (found.category === 'Instansi / Kedinasan') {
    let btn = (found.status === 'Disetujui' || found.status === 'Checked-In') ? `<div style="margin-top:1.2rem; text-align:center;"><button type="button" class="btn btn-primary btn-block" onclick="openOfficialLetterModal('${found.ticketCode}')"><i class="fa-solid fa-file-pdf"></i> Unduh / Cetak Surat Undangan Resmi Berkop</button></div>` : '';
    resultBox.innerHTML = renderStandardStatusCard(found) + btn;
  } else {
    resultBox.innerHTML = renderStandardStatusCard(found);
  }
  resultBox.classList.remove('hidden');
}

function renderStandardStatusCard(found) {
  let note = '';
  if (found.status === 'Disetujui' || found.status === 'Checked-In') {
    note = `<div style="margin-top:1rem; padding:0.8rem; background:rgba(56,189,248,0.08); border-left:3px solid var(--cyan-glow); border-radius:6px;"><span style="font-size:0.75rem; color:var(--cyan-glow); font-weight:700; display:block;">CATATAN RESMI:</span><p style="font-size:0.86rem; color:#fff; font-style:italic; margin:0.25rem 0 0;">"${escapeHtml(found.approvalMessage || DEFAULT_APPROVE_TEMPLATE)}"</p></div>`;
  } else if (found.status === 'Ditolak') {
    note = `<div style="margin-top:1rem; padding:0.8rem; background:rgba(239,68,68,0.08); border-left:3px solid var(--rose-danger); border-radius:6px;"><span style="font-size:0.75rem; color:#FCA5A5; font-weight:700; display:block;">ALASAN PENOLAKAN:</span><p style="font-size:0.86rem; color:#FCA5A5; font-style:italic; margin:0.25rem 0 0;">"${escapeHtml(found.rejectionReason || DEFAULT_REJECT_TEMPLATE)}"</p></div>`;
  }

  const jamRencana = found.scheduledRoom 
    ? `${found.scheduledRoom} (${found.scheduledStart} - ${found.scheduledEnd} WIB)`
    : `Diusulkan: ${found.preferredStart || '08:30'} - ${found.preferredEnd || '09:30'} WIB (Menunggu Konfirmasi)`;

  return `
    <div class="glass-card" style="padding:1.4rem; margin-top:1rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.85rem;"><span style="font-weight:800; color:var(--cyan-glow); font-size:1.1rem;">${found.ticketCode}</span><span class="badge ${getBadgeClass(found.status)}">${found.status}</span></div>
      <div style="display:flex; gap:1rem; align-items:center;">
        <img src="${found.photoBase64 || ''}" alt="Foto" style="width:56px; height:56px; border-radius:8px; object-fit:cover; border:1px solid var(--border-subtle); flex-shrink:0;">
        <div>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Pemohon: <strong style="color:#fff;">${escapeHtml(found.fullName)}</strong></p>
          ${found.agencyName ? `<p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Instansi: <strong style="color:#fff;">${escapeHtml(found.agencyName)}</strong></p>` : ''}
          ${found.parentChildName ? `<p style="font-size:0.85rem; color:var(--text-muted); margin:0;">Orang Tua dari: <strong style="color:#fff;">${escapeHtml(found.parentChildName)}</strong></p>` : ''}
          <p style="font-size:0.85rem; color:var(--cyan-glow); margin:0;">Tujuan: <strong>${escapeHtml(found.hostOfficer || found.targetOfficial)}</strong></p>
          <p style="font-size:0.8rem; color:var(--text-dim); margin-top:0.2rem;"><i class="fa-solid fa-calendar"></i> Tanggal: ${formatIndonesianDate(found.scheduledDate || found.visitDate)}</p>
        </div>
      </div>
      <p style="font-size:0.85rem; color:var(--emerald-green); margin-top:0.65rem; font-weight:700;"><i class="fa-solid fa-clock"></i> Waktu: ${jamRencana}</p>
      ${note}
    </div>
  `;
}

function startLiveDispenClock() {
  const update = () => { const cl = document.getElementById('liveDispenClock'); if (cl) cl.innerText = new Date().toLocaleTimeString('id-ID', { hour12: false }) + ' WIB'; };
  update(); appData.liveClockTimer = setInterval(update, 1000);
}

function switchAdminSubView(subview) {
  appData.activeAdminSubView = subview;
  ['table', 'calendar', 'analytics'].forEach(s => {
    document.getElementById(`subtabBtn${s.charAt(0).toUpperCase() + s.slice(1)}`)?.classList.remove('active');
    document.getElementById(`adminSubView${s.charAt(0).toUpperCase() + s.slice(1)}`)?.classList.add('hidden');
  });
  document.getElementById(`subtabBtn${subview.charAt(0).toUpperCase() + subview.slice(1)}`)?.classList.add('active');
  document.getElementById(`adminSubView${subview.charAt(0).toUpperCase() + subview.slice(1)}`)?.classList.remove('hidden');
  if (subview === 'table') renderAdminQueueTable();
  else if (subview === 'calendar') renderWeeklyCalendar();
  else if (subview === 'analytics') renderAnalyticsAndHeatmap();
}

function renderAdminDashboard() {
  checkAndExpireAppointments();
  renderMetrics();
  switchAdminSubView(appData.activeAdminSubView || 'table');
}

function renderMetrics() {
  document.getElementById('metricTotal').innerText = appData.appointments.length;
  document.getElementById('metricPending').innerText = appData.appointments.filter(a => a.status === 'Menunggu Konfirmasi' || a.status === 'Tawaran Delegasi').length;
  document.getElementById('metricApproved').innerText = appData.appointments.filter(a => a.status === 'Disetujui').length;
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('metricToday').innerText = appData.appointments.filter(a => (a.scheduledDate === todayStr || a.visitDate === todayStr)).length;
}

function renderAdminQueueTable() {
  const tbody = document.getElementById('adminTableBody'); if (!tbody) return;
  const filter = document.getElementById('tableFilterStatus')?.value || 'ALL';
  const q = document.getElementById('adminSearchInput')?.value.toLowerCase().trim() || '';

  let list = appData.appointments;
  if (filter !== 'ALL') {
    if (filter === 'Ditolak') {
      list = list.filter(item => item.status === 'Ditolak' || item.status === 'Delegasi Ditolak' || item.status === 'Kadaluarsa');
    } else {
      list = list.filter(item => item.status === filter);
    }
  }
  if (q) list = list.filter(i => i.fullName.toLowerCase().includes(q) || i.ticketCode.toLowerCase().includes(q) || (i.agencyName && i.agencyName.toLowerCase().includes(q)));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-dim);">Tidak ada data permohonan antrean.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => {
    const cleanPhone = formatToWhatsApp(item.whatsapp);
    const strikes = getGuestNoShowCount(item.whatsapp);
    const isBanned = strikes >= 3;
    let waMsg = "";
    
    // FORMAT WHATSAPP BERDASARKAN STATUS
    if (item.status === 'Kadaluarsa') {
      waMsg = `*PEMBERITAHUAN TIKET AUDIENSI KADALUARSA (NO-SHOW)*
Yth. Bapak/Ibu ${item.fullName},

Kami menginformasikan bahwa tiket audiensi Anda di SMAN 1 Kandangan [Tiket: ${item.ticketCode}] telah *HANGUS / KADALUARSA* karena Anda tidak hadir melakukan presensi (check-in) pada jadwal yang telah ditentukan.

⚠️ *Peringatan Ketertiban Tamu:*
Mohon untuk tidak mengulangi kelalaian serupa demi kelancaran agenda pimpinan sekolah. Catatan ketidakhadiran Anda saat ini: *${strikes}/3 Kali*.
${isBanned ? '❌ *PERHATIAN:* Akumulasi kelalaian Anda telah mencapai batas maksimal (3x). Nomor dan identitas Anda telah DIBLOKIR otomatis oleh sistem SIMTADIK.' : 'Sesuai regulasi sekolah, apabila terjadi mangkir (No-Show) sebanyak 3 kali, sistem akan memblokir nomor/identitas Anda secara permanen.'}

Apabila masih berkepentingan, silakan mengajukan permohonan baru pada hari kerja berikutnya. Terima kasih.`;
    } else if (item.status === 'Tawaran Delegasi') {
      waMsg = `*PEMBERITAHUAN PENDELEGASIAN AUDIENSI RESMI*\nYth. Bapak/Ibu ${item.fullName},\n\nKami dari Sekretariat Tata Usaha SMAN 1 Kandangan menyampaikan permohonan maaf. Pejabat yang Anda tuju (${item.targetOfficial}) berhalangan hadir pada waktu yang direncanakan.\n\nAudiensi Anda dialihkan kepada:\n👤 *Pejabat Penerima:* ${item.hostOfficer}\n📅 *Waktu:* ${item.scheduledDate} (${item.scheduledStart} - ${item.scheduledEnd} WIB)\n📍 *Ruangan:* ${item.scheduledRoom}\n\nMohon konfirmasi persetujuan melalui tautan resmi:\n${window.location.origin}${window.location.pathname}?ticket=${item.ticketCode}\n\nTerima kasih.`;
    } else if (item.isRescheduled) {
      waMsg = `*PEMBERITAHUAN PENJADWALAN ULANG (RESCHEDULE)*\nYth. Bapak/Ibu ${item.fullName},\n\nKami dari Sekretariat Pimpinan SMAN 1 Kandangan memohon maaf. Audiensi [Tiket: ${item.ticketCode}] diatur ulang menjadi:\n\n📅 *Tanggal:* ${item.scheduledDate}\n⏰ *Waktu:* ${item.scheduledStart} - ${item.scheduledEnd} WIB\n📍 *Tempat:* ${item.scheduledRoom}\n📝 *Catatan:* "${item.approvalMessage}"\n\nCek berkas: ${window.location.origin}${window.location.pathname}?ticket=${item.ticketCode}`;
    } else {
      waMsg = `Halo Bapak/Ibu ${item.fullName}, permohonan audiensi Anda di SMAN 1 Kandangan [Tiket: ${item.ticketCode}] status: ${item.status}. Cek status: ${window.location.origin}${window.location.pathname}?ticket=${item.ticketCode}`;
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;
    let scheduleDisplay = item.scheduledRoom 
      ? `<span class="table-host-tag">${escapeHtml(item.hostOfficer || item.targetOfficial)}</span><br><strong style="font-size:0.82rem;">${item.scheduledRoom}</strong><br><small style="color:var(--cyan-glow);">${item.scheduledDate} (${item.scheduledStart} - ${item.scheduledEnd} WIB)</small>` 
      : '<span style="color:var(--text-dim);">-</span>';

    // LABEL & CATATAN
    let note = '';
    if (item.status === 'Kadaluarsa') {
      note = `<div class="table-note-pill table-note-reject"><i class="fa-solid fa-hourglass-end"></i> <strong>KADALUARSA (NO-SHOW)</strong><br>Pelanggaran: <strong style="color:${isBanned ? '#ef4444' : 'var(--amber-warning)'};">${strikes}/3</strong> ${isBanned ? '<span style="color:#ef4444; font-weight:800;">[DIBLOKIR]</span>' : ''}</div>`;
    } else if (item.status === 'Delegasi Ditolak') {
      note = `<div class="table-note-pill table-note-reject"><i class="fa-solid fa-ban"></i> <strong>BATAL:</strong> Tamu menolak delegasi. Alasan: "${escapeHtml(item.guestDeclineReason || '-')}"</div>`;
    } else if (item.status === 'Tawaran Delegasi') {
      note = `<div class="table-note-pill"><i class="fa-solid fa-clock-rotate-left"></i> Menunggu konfirmasi delegasi ke ${escapeHtml(item.hostOfficer)}</div>`;
    } else if (item.status === 'Disetujui' || item.status === 'Checked-In') {
      note = `<div class="table-note-pill"><i class="fa-regular fa-comment-dots"></i> "${escapeHtml(item.approvalMessage || DEFAULT_APPROVE_TEMPLATE)}"</div>`;
    } else if (item.status === 'Ditolak') {
      note = `<div class="table-note-pill table-note-reject"><i class="fa-solid fa-circle-exclamation"></i> "${escapeHtml(item.rejectionReason || DEFAULT_REJECT_TEMPLATE)}"</div>`;
    }

    // PENGATURAN TOMBOL AKSI
    let btns = '';
    if (item.status === 'Kadaluarsa') {
      // Untuk tiket kadaluarsa: Hanya ada tombol kirim teguran WhatsApp dan Hapus
      btns = `
        <a href="${waUrl}" target="_blank" class="btn btn-outline btn-sm" style="color:#22c55e; border-color:#22c55e;" title="Kirim Surat Teguran Kadaluarsa via WhatsApp"><i class="fa-brands fa-whatsapp"></i> Tegur</a>
      `;
    } else if (item.status === 'Menunggu Konfirmasi') {
      btns = `<button class="btn btn-primary btn-sm" onclick="openScheduleModal('${item.ticketCode}')" title="Disposisi Pimpinan"><i class="fa-solid fa-calendar-check"></i></button>`;
    } else if (item.status === 'Tawaran Delegasi') {
      btns = `
        <button class="btn btn-outline btn-sm" onclick="openScheduleModal('${item.ticketCode}')" title="Atur Ulang / Batal Delegasi" style="color:var(--amber-warning); border-color:var(--amber-warning);"><i class="fa-solid fa-pen-to-square"></i></button>
        <a href="${waUrl}" target="_blank" class="btn btn-outline btn-sm" style="color:#22c55e;" title="Kirim Notifikasi WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
      `;
    } else if (item.status === 'Disetujui') {
      btns = `
        <button class="btn btn-outline btn-sm" onclick="openScheduleModal('${item.ticketCode}')" title="Atur Ulang / Reschedule" style="color:var(--amber-warning); border-color:var(--amber-warning);"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn btn-emerald btn-sm" onclick="executeCheckIn('${item.ticketCode}')" title="Check-In Lobi"><i class="fa-solid fa-user-check"></i></button>
        ${item.category === 'Instansi / Kedinasan' ? `<button class="btn btn-outline btn-sm" onclick="openOfficialLetterModal('${item.ticketCode}')" title="Cetak Surat Dinas"><i class="fa-solid fa-file-pdf"></i></button>` : ''}
        <a href="${waUrl}" target="_blank" class="btn btn-outline btn-sm" style="color:#22c55e;" title="Kirim Pesan WhatsApp"><i class="fa-brands fa-whatsapp"></i></a>
      `;
    } else if (item.status === 'Checked-In') {
      btns = `<button class="btn btn-outline btn-sm" onclick="executeComplete('${item.ticketCode}')" title="Selesai"><i class="fa-solid fa-flag-checkered"></i></button>`;
    }

    btns += `<button class="btn btn-danger btn-sm" onclick="deleteAppointment('${item.ticketCode}')" title="Hapus Arsip" style="margin-left:0.25rem;"><i class="fa-solid fa-trash-can"></i></button>`;

    return `
      <tr>
        <td><strong style="color:var(--cyan-glow); font-size:0.84rem;">${item.ticketCode}</strong></td>
        <td><strong style="overflow-wrap:anywhere;">${escapeHtml(item.fullName)}</strong><br><a href="${waUrl}" target="_blank" class="wa-link"><i class="fa-brands fa-whatsapp"></i> ${item.whatsapp}</a></td>
        <td><span style="font-size:0.82rem; font-weight:700;">${item.category}</span><br><small style="color:var(--text-muted);"><i class="fa-solid fa-arrow-right"></i> ${escapeHtml(item.targetOfficial)}</small></td>
        <td>
          <span style="font-size:0.82rem;">${item.visitDate}</span><br>
          <small style="color:var(--cyan-glow); font-weight:600;"><i class="fa-regular fa-clock"></i> ${item.preferredStart || '08:30'} - ${item.preferredEnd || '09:30'}</small><br>
          <span class="urgency-pill urgency-${item.urgency.toLowerCase()}">${item.urgency}</span>
        </td>
        <td>${scheduleDisplay}</td>
        <td><span class="badge ${getBadgeClass(item.status)}">${item.status}</span>${note}</td>
        <td style="text-align: right;">${btns}</td>
      </tr>
    `;
  }).join('');
}

function getBadgeClass(status) {
  switch (status) {
    case 'Menunggu Konfirmasi': return 'badge-pending';
    case 'Tawaran Delegasi': return 'badge-pending';
    case 'Disetujui': return 'badge-approved';
    case 'Ditolak': return 'badge-rejected';
    case 'Delegasi Ditolak': return 'badge-rejected';
    case 'Kadaluarsa': return 'badge-rejected';
    case 'Checked-In': return 'badge-checkin';
    case 'Selesai': return 'badge-completed';
    default: return 'badge-pending';
  }
}

function openScheduleModal(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode); if (!item) return;

  if (item.status === 'Delegasi Ditolak' || item.status === 'Ditolak' || item.status === 'Selesai' || item.status === 'Kadaluarsa') {
    showToast('Tiket ini sudah kadaluarsa/batal dan tidak dapat diubah.', 'error');
    return;
  }

  appData.selectedTicketForAction = ticketCode;
  const isReschedule = (item.status === 'Disetujui' || item.status === 'Checked-In');

  document.getElementById('scheduleModalTicketPill').innerHTML = isReschedule 
    ? `<span style="color:var(--amber-warning);"><i class="fa-solid fa-clock-rotate-left"></i> Reschedule: ${item.ticketCode}</span>` 
    : `Tiket: ${item.ticketCode}`;

  document.getElementById('schedModalName').innerText = item.fullName;
  document.getElementById('schedModalCategoryMeta').innerHTML = `${item.category} • Tujuan: ${item.targetOfficial}<br><span style="color:var(--cyan-glow); font-size:0.75rem;"><i class="fa-regular fa-clock"></i> Usulan Pemohon: ${item.preferredStart || '08:30'} - ${item.preferredEnd || '09:30'} WIB</span>`;
  document.getElementById('schedModalPurposeInput').value = item.purpose;

  const modalPhoto = document.getElementById('schedModalPhoto');
  if (modalPhoto) modalPhoto.src = item.photoBase64 || '';

  const isStudent = (item.category === 'Siswa');
  ['letterNoGroupApprove', 'letterNoGroupDelegate'].forEach(id => document.getElementById(id)?.classList.toggle('hidden', isStudent));
  ['studentNoticeApprove', 'studentNoticeDelegate'].forEach(id => document.getElementById(id)?.classList.toggle('hidden', !isStudent));

  const autoLetterNo = item.officialLetterNo || generateOfficialLetterNumber(appData.appointments.indexOf(item) + 1);
  document.getElementById('schedLetterNoApprove').value = isStudent ? '' : autoLetterNo;
  document.getElementById('schedLetterNoDelegate').value = isStudent ? '' : autoLetterNo;
  document.getElementById('schedRoom').value = item.scheduledRoom || 'Ruang Kepala Sekolah';
  document.getElementById('schedDate').value = item.scheduledDate || item.visitDate;
  
  document.getElementById('schedStartTime').value = item.scheduledStart || item.preferredStart || '08:30';
  document.getElementById('schedEndTime').value = item.scheduledEnd || item.preferredEnd || '09:30';
  
  document.getElementById('schedDelegateDate').value = item.scheduledDate || item.visitDate;
  document.getElementById('schedDelegateStartTime').value = item.scheduledStart || item.preferredStart || '08:30';
  document.getElementById('schedDelegateEndTime').value = item.scheduledEnd || item.preferredEnd || '09:30';

  if (item.targetOfficial && item.targetOfficial !== 'Kepala SMAN 1 Kandangan') document.getElementById('schedDelegateHost').value = item.targetOfficial;
  handleDelegateHostChange();

  if (isReschedule) {
    const resMsg = item.approvalMessage.includes("Reschedule") ? item.approvalMessage : DEFAULT_RESCHEDULE_TEMPLATE;
    document.getElementById('schedApprovalNotes').value = resMsg;
    document.getElementById('schedDelegateNotes').value = resMsg;
  } else {
    document.getElementById('schedApprovalNotes').value = item.approvalMessage || DEFAULT_APPROVE_TEMPLATE;
    document.getElementById('schedDelegateNotes').value = item.approvalMessage || (isStudent ? 'Disetujui untuk sesi bimbingan di ruang BK.' : DEFAULT_APPROVE_TEMPLATE);
  }

  document.getElementById('schedRejectionReason').value = item.rejectionReason || DEFAULT_REJECT_TEMPLATE;
  switchActionTab(item.targetOfficial === 'Kepala SMAN 1 Kandangan' ? 'approve' : 'delegate');
  runLiveCollisionCheck();
  document.getElementById('scheduleActionModal')?.classList.remove('hidden');
}

function closeScheduleModal() {
  document.getElementById('scheduleActionModal')?.classList.add('hidden');
  appData.selectedTicketForAction = null;
}

function handleDelegateHostChange() {
  const host = document.getElementById('schedDelegateHost').value, room = document.getElementById('schedDelegateRoom');
  if (host === 'Koordinator Guru BK') room.value = 'Ruang Konseling BK';
  else if (host === 'Waka Bidang Kesiswaan') room.value = 'Ruang Waka Kesiswaan';
  else if (host === 'Waka Bidang Kurikulum') room.value = 'Ruang Waka Kurikulum';
  else if (host === 'Waka Bidang Sarpras' || host === 'Waka Bidang Humas') room.value = 'Ruang Waka Humas & Sarpras';
  else if (host === 'Tata Usaha') room.value = 'Ruang Tata Usaha';
  else room.value = 'Ruang Tamu Khusus Lobi';
}

function switchActionTab(tab) {
  ['approve', 'delegate', 'reject'].forEach(t => {
    document.getElementById(`btnTab${t.charAt(0).toUpperCase() + t.slice(1)}`)?.classList.remove('active');
    document.getElementById(`tabContent${t.charAt(0).toUpperCase() + t.slice(1)}`)?.classList.add('hidden');
  });
  document.getElementById(`btnTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.classList.add('active');
  document.getElementById(`tabContent${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.classList.remove('hidden');
  if (tab === 'approve') runLiveCollisionCheck();
}

function runLiveCollisionCheck() {
  const room = document.getElementById('schedRoom').value, date = document.getElementById('schedDate').value;
  const start = document.getElementById('schedStartTime').value, end = document.getElementById('schedEndTime').value;
  const alertBox = document.getElementById('collisionAlertBox'), alertMsg = document.getElementById('collisionAlertMsg'), confirmBtn = document.getElementById('confirmApproveBtn');
  if (!room || !date || !start || !end) return;

  if (start >= end) {
    alertBox?.classList.remove('hidden'); if (alertMsg) alertMsg.innerText = 'Jam mulai harus lebih awal dari selesai!';
    if (confirmBtn) confirmBtn.disabled = true; return;
  }

  const conflict = appData.appointments.find(a => (a.ticketCode !== appData.selectedTicketForAction && (a.status === 'Disetujui' || a.status === 'Checked-In') && a.scheduledRoom === room && a.scheduledDate === date && start < a.scheduledEnd && end > a.scheduledStart));
  if (conflict) {
    alertBox?.classList.remove('hidden'); if (alertMsg) alertMsg.innerText = `Ruangan "${room}" telah terisi untuk [${conflict.fullName}] jam ${conflict.scheduledStart}-${conflict.scheduledEnd}!`;
    if (confirmBtn) confirmBtn.disabled = true;
  } else { alertBox?.classList.add('hidden'); if (confirmBtn) confirmBtn.disabled = false; }
}

function executeApprove() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction); if (!item) return;
  const wasApproved = (item.status === 'Disetujui'), isStudent = (item.category === 'Siswa');
  item.purpose = document.getElementById('schedModalPurposeInput').value.trim() || item.purpose;
  item.approvalMessage = document.getElementById('schedApprovalNotes').value.trim() || DEFAULT_APPROVE_TEMPLATE;
  item.officialLetterNo = isStudent ? null : (document.getElementById('schedLetterNoApprove').value.trim() || generateOfficialLetterNumber());
  item.hostOfficer = 'Kepala SMAN 1 Kandangan'; item.status = 'Disetujui';
  item.scheduledRoom = document.getElementById('schedRoom').value; item.scheduledDate = document.getElementById('schedDate').value;
  item.scheduledStart = document.getElementById('schedStartTime').value; item.scheduledEnd = document.getElementById('schedEndTime').value;
  item.rejectionReason = ''; if (wasApproved) item.isRescheduled = true;

  saveDatabase(); renderAdminDashboard(); closeScheduleModal();
  showToast(wasApproved ? `Jadwal [${item.ticketCode}] diatur ulang!` : `Janji temu disetujui!`, 'success');
}

function executeDelegate() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction); if (!item) return;
  const isStudent = (item.category === 'Siswa'), targetHost = document.getElementById('schedDelegateHost').value;
  
  item.purpose = document.getElementById('schedModalPurposeInput').value.trim() || item.purpose;
  item.hostOfficer = targetHost;
  item.officialLetterNo = isStudent ? null : (document.getElementById('schedLetterNoDelegate').value.trim() || generateOfficialLetterNumber());
  item.approvalMessage = document.getElementById('schedDelegateNotes').value.trim() || `Disposisi dialihkan kepada ${targetHost}.`;
  
  item.status = 'Tawaran Delegasi';
  item.isDelegated = true;
  item.scheduledRoom = document.getElementById('schedDelegateRoom').value;
  item.scheduledDate = document.getElementById('schedDelegateDate').value; 
  item.scheduledStart = document.getElementById('schedDelegateStartTime').value;
  item.scheduledEnd = document.getElementById('schedDelegateEndTime').value; 
  item.rejectionReason = '';
  item.guestDeclineReason = '';

  saveDatabase(); renderAdminDashboard(); closeScheduleModal();
  showToast(`Audiensi didelegasikan ke ${targetHost}. Menunggu persetujuan tamu!`, 'info');
}

function acceptDelegation(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode); if (!item) return;
  item.status = 'Disetujui';
  item.approvalMessage = `Tamu telah menyetujui audiensi delegasi bersama ${item.hostOfficer}.`;
  saveDatabase(); renderAdminDashboard();
  showToast('Tawaran delegasi disetujui! Jadwal audiensi Anda telah sah.', 'success');
  trackTicketStatus();
}

function showRejectDelegationInput() {
  document.getElementById('delegationRejectArea')?.classList.remove('hidden');
  document.getElementById('delegationActionButtonsBox')?.classList.add('hidden');
}

function cancelRejectDelegation() {
  document.getElementById('delegationRejectArea')?.classList.add('hidden');
  document.getElementById('delegationActionButtonsBox')?.classList.remove('hidden');
}

function submitRejectDelegation(ticketCode) {
  const item = appData.appointments.find(a => a.ticketCode === ticketCode);
  const reason = document.getElementById('guestDeclineReasonInput')?.value.trim();
  if (!item) return;
  if (!reason || reason.length < 5) { showToast('Uraikan alasan penolakan minimal 5 karakter.', 'error'); return; }

  item.status = 'Delegasi Ditolak';
  item.guestDeclineReason = reason;
  item.rejectionReason = `Tamu menolak audiensi delegasi. Alasan: ${reason}`;
  saveDatabase(); renderAdminDashboard();
  showToast('Penolakan telah terkirim. Tiket audiensi resmi dibatalkan (kadaluarsa).', 'info');
  trackTicketStatus();
}

function executeReject() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction); if (!item) return;
  item.status = 'Ditolak'; item.rejectionReason = document.getElementById('schedRejectionReason').value.trim() || DEFAULT_REJECT_TEMPLATE;
  saveDatabase(); renderAdminDashboard(); closeScheduleModal(); showToast(`Permohonan ditolak secara resmi.`, 'info');
}

function executeCheckIn(code) {
  const item = appData.appointments.find(a => a.ticketCode === code); if (!item) return;
  item.status = 'Checked-In'; item.checkInAt = new Date().toISOString(); saveDatabase(); renderAdminDashboard(); showToast(`Tamu [${item.fullName}] berhasil check-in!`, 'success');
}

function executeComplete(code) {
  const item = appData.appointments.find(a => a.ticketCode === code); if (!item) return;
  item.status = 'Selesai'; saveDatabase(); renderAdminDashboard(); showToast(`Audiensi [${code}] selesai.`, 'success');
}

function deleteAppointment(code) {
  const item = appData.appointments.find(a => a.ticketCode === code); if (!item) return;
  if (confirm(`Hapus arsip antrean tiket [${code}] atas nama ${item.fullName}?`)) {
    appData.appointments = appData.appointments.filter(a => a.ticketCode !== code);
    saveDatabase(); renderAdminDashboard(); showToast(`Tiket [${code}] dihapus.`, 'info');
  }
}

function backupDataToJSON() {
  if (appData.appointments.length === 0) { showToast('Belum ada data antrean.', 'error'); return; }
  const a = document.createElement('a');
  a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData.appointments, null, 2));
  a.download = `Backup_SIMTADIK_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); a.remove(); showToast('Cadangan JSON diunduh!', 'success');
}

function triggerRestoreJSON() { document.getElementById('jsonFileInput')?.click(); }
function handleJSONFileRestore(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed)) { appData.appointments = parsed; saveDatabase(); renderAdminDashboard(); showToast('Data berhasil dipulihkan!', 'success'); }
      else { showToast('Format JSON tidak sesuai.', 'error'); }
    } catch (err) { showToast('Gagal membaca file JSON.', 'error'); }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function openOfficialLetterModal(code) {
  const item = appData.appointments.find(a => a.ticketCode === code); if (!item) return;
  appData.activeLetterTicketCode = code;

  document.getElementById('docLetterNo').innerText = item.officialLetterNo || generateOfficialLetterNumber();
  const dateStr = `Kandangan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  document.getElementById('docLetterDate').innerText = dateStr;
  document.getElementById('signPlaceDate').innerText = dateStr;
  document.getElementById('docGuestName').innerText = item.fullName;
  document.getElementById('docGuestAgency').innerText = item.agencyName ? `${item.agencyName} (${item.agencyAddress || '-'})` : 'Mitra SMAN 1 Kandangan';
  document.getElementById('docTicketCode').innerText = item.ticketCode;
  document.getElementById('docScheduleDateDay').innerText = formatIndonesianDate(item.scheduledDate || item.visitDate);
  document.getElementById('docScheduleTime').innerText = `${item.scheduledStart || '09:00'} s.d. ${item.scheduledEnd || '10:00'} WIB`;
  document.getElementById('docScheduleRoom').innerText = item.scheduledRoom || 'Ruang Pimpinan SMAN 1 Kandangan';
  document.getElementById('docHostOfficer').innerText = item.hostOfficer || 'Kepala SMAN 1 Kandangan';
  document.getElementById('docPurpose').innerText = item.purpose;
  document.getElementById('docHostNotes').innerText = `"${item.approvalMessage || DEFAULT_APPROVE_TEMPLATE}"`;

  const isDel = item.hostOfficer && item.hostOfficer !== 'Kepala SMAN 1 Kandangan';
  if (isDel) {
    document.getElementById('signRoleTitle').innerHTML = `a.n. Kepala Sekolah<br><strong style="font-size:10pt;">${escapeHtml(item.hostOfficer)}</strong>`;
    document.getElementById('signOfficerName').innerHTML = '<strong>Tim Layanan Disposisi</strong>';
    document.getElementById('signOfficerRank').innerText = 'SMAN 1 Kandangan';
    document.getElementById('signOfficerNip').innerText = 'Kabupaten Kediri';
  } else {
    document.getElementById('signRoleTitle').innerText = 'Kepala Sekolah,';
    document.getElementById('signOfficerName').innerHTML = '<strong>ISTU HANDAYANI, M.Pd</strong>';
    document.getElementById('signOfficerRank').innerText = 'Pembina, IV/a';
    document.getElementById('signOfficerNip').innerText = 'NIP 19760801 200501 2 009';
  }

  const qrBox = document.getElementById('letterQrContainer');
  if (qrBox) {
    qrBox.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`${window.location.origin}${window.location.pathname}?ticket=${item.ticketCode}`)}" alt="QR" style="width:85px; height:85px; border:1px solid #cbd5e1; padding:2px; background:#fff;">`;
  }
  document.getElementById('officialLetterModal')?.classList.remove('hidden');
}

function saveEditedDocPurpose() {
  const el = document.getElementById('docPurpose'); if (!el || !appData.activeLetterTicketCode) return;
  const newP = el.innerText.trim(), item = appData.appointments.find(a => a.ticketCode === appData.activeLetterTicketCode);
  if (item && newP && newP !== item.purpose) {
    item.purpose = newP; saveDatabase(); renderAdminDashboard();
    showToast('Redaksi agenda surat resmi berhasil disempurnakan!', 'success');
  }
}

function closeOfficialLetterModal() { document.getElementById('officialLetterModal')?.classList.add('hidden'); appData.activeLetterTicketCode = null; }
function printOfficialLetter() { window.print(); }

function changeCalendarWeek(o) { appData.calendarOffsetWeeks += o; renderWeeklyCalendar(); }
function resetCalendarToCurrentWeek() { appData.calendarOffsetWeeks = 0; renderWeeklyCalendar(); }
function getStartOfWeek(date, offsetWeeks = 0) {
  const d = new Date(date), day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff + (offsetWeeks * 7)); d.setHours(0, 0, 0, 0); return d;
}

function renderWeeklyCalendar() {
  const monday = getStartOfWeek(new Date(), appData.calendarOffsetWeeks), dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const grid = document.getElementById('calendarGridWeek'); if (!grid) return;
  const saturday = new Date(monday); saturday.setDate(monday.getDate() + 5);
  document.getElementById('calWeekRangeLabel').innerText = `Minggu: ${monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${saturday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  let html = ''; const todayStr = new Date().toISOString().split('T')[0];
  for (let i = 0; i < 6; i++) {
    const cur = new Date(monday); cur.setDate(monday.getDate() + i);
    const dISO = cur.toISOString().split('T')[0], isToday = (dISO === todayStr);
    const dayApps = appData.appointments.filter(a => (a.scheduledDate === dISO || a.visitDate === dISO) && (a.status === 'Disetujui' || a.status === 'Checked-In'));

    let evHTML = dayApps.length === 0 ? `<div class="cal-empty-day">Tidak ada audiensi</div>` : dayApps.map(a => `
      <div class="cal-event-card ${a.urgency === 'Mendesak' ? 'urgent' : ''}" onclick="openScheduleModal('${a.ticketCode}')">
        <span class="cal-event-time"><i class="fa-regular fa-clock"></i> ${a.scheduledStart || '09:00'} - ${a.scheduledEnd || '10:00'} WIB</span>
        <div class="cal-event-title">${escapeHtml(a.fullName)}</div>
        <div class="cal-event-room"><i class="fa-solid fa-user-tie"></i> ${a.hostOfficer || 'Kepala Sekolah'}</div>
      </div>
    `).join('');

    html += `<div class="calendar-day-col ${isToday ? 'is-today' : ''}"><div class="cal-col-header"><span class="cal-day-name">${dayNames[i]}</span><span class="cal-day-date">${cur.getDate()}</span></div><div class="cal-events-list">${evHTML}</div></div>`;
  }
  grid.innerHTML = html;
}

function renderAnalyticsAndHeatmap() {
  const total = appData.appointments.length, cats = ['Siswa', 'Guru/Staf', 'Orang Tua Murid', 'Instansi / Kedinasan', 'Umum'], counts = {};
  cats.forEach(c => counts[c] = 0);
  appData.appointments.forEach(a => { if (counts[a.category] !== undefined) counts[a.category]++; else counts['Umum']++; });

  const bars = document.getElementById('categoryBarsContainer');
  if (bars) {
    bars.innerHTML = cats.map(c => {
      const p = total > 0 ? Math.round((counts[c] / total) * 100) : 0;
      return `<div class="cat-bar-item"><div class="cat-bar-labels"><span>${c}</span><span style="color:var(--cyan-glow);">${counts[c]} (${p}%)</span></div><div class="cat-bar-track"><div class="cat-bar-fill" style="width:${p}%;"></div></div></div>`;
    }).join('');
  }

  const p = appData.appointments.filter(a => a.status === 'Menunggu Konfirmasi' || a.status === 'Tawaran Delegasi').length;
  const ap = appData.appointments.filter(a => a.status === 'Disetujui').length;
  const ci = appData.appointments.filter(a => a.status === 'Checked-In' || a.status === 'Selesai').length;
  const rj = appData.appointments.filter(a => a.status === 'Ditolak' || a.status === 'Delegasi Ditolak' || a.status === 'Kadaluarsa').length;

  document.getElementById('statusSummaryPills').innerHTML = `
    <div class="status-pill-card"><span class="status-pill-val" style="color:var(--amber-warning);">${p}</span><span class="status-pill-lbl">Menunggu Disposisi</span></div>
    <div class="status-pill-card"><span class="status-pill-val" style="color:var(--emerald-green);">${ap}</span><span class="status-pill-lbl">Disetujui</span></div>
    <div class="status-pill-card"><span class="status-pill-val" style="color:var(--cyan-glow);">${ci}</span><span class="status-pill-lbl">Kehadiran Lobi</span></div>
    <div class="status-pill-card"><span class="status-pill-val" style="color:var(--rose-danger);">${rj}</span><span class="status-pill-lbl">Ditolak / Hangus</span></div>
  `;
  renderHeatmapMatrix();
}

function renderHeatmapMatrix() {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], hours = [{ label: '07.00 - 08.20', s: 7 }, { label: '08.20 - 09.40', s: 8 }, { label: '09.55 - 11.15', s: 9 }, { label: '11.15 - 12.40', s: 11 }, { label: '12.40 - 14.00', s: 12 }, { label: '14.00 - 15.20', s: 14 }];
  const density = Array(hours.length).fill(0).map(() => Array(days.length).fill(0));

  appData.appointments.forEach(app => {
    if ((app.status === 'Disetujui' || app.status === 'Checked-In') && app.scheduledDate && app.scheduledStart) {
      const dIdx = new Date(app.scheduledDate).getDay() - 1;
      if (dIdx >= 0 && dIdx < 5) {
        const h = parseInt(app.scheduledStart.split(':')[0], 10);
        hours.forEach((hr, hIdx) => { if (h >= hr.s && h < hr.s + 2) density[hIdx][dIdx]++; });
      }
    }
  });

  const matrix = document.getElementById('heatmapMatrix'); if (!matrix) return;
  let html = `<div class="heat-cell heat-header-cell">Waktu</div>`; days.forEach(d => html += `<div class="heat-cell heat-header-cell">${d}</div>`);
  hours.forEach((hr, hIdx) => {
    html += `<div class="heat-cell heat-hour-label">${hr.label}</div>`;
    days.forEach((d, dIdx) => {
      const c = density[hIdx][dIdx], cls = c === 1 ? 'heat-1' : c === 2 ? 'heat-2' : c >= 3 ? 'heat-3' : 'heat-0';
      html += `<div class="heat-cell ${cls}">${c > 0 ? c : '-'}</div>`;
    });
  });
  matrix.innerHTML = html;
}

function openFullPhotoModal() {
  const item = appData.appointments.find(a => a.ticketCode === appData.selectedTicketForAction); if (!item) return;
  document.getElementById('photoFullElement').src = item.photoBase64 || '';
  document.getElementById('photoFullTitle').innerText = item.fullName;
  document.getElementById('photoFullModal')?.classList.remove('hidden');
}
function closeFullPhotoModal() { document.getElementById('photoFullModal')?.classList.add('hidden'); }
function openAdminLoginModal() { document.getElementById('adminLoginModal')?.classList.remove('hidden'); }
function closeAdminLoginModal() { document.getElementById('adminLoginModal')?.classList.add('hidden'); }
function handleAdminLogin(e) {
  e.preventDefault();
  if (document.getElementById('adminUsername').value.trim() === ADMIN_CREDENTIALS.username && document.getElementById('adminPassword').value.trim() === ADMIN_CREDENTIALS.password) {
    localStorage.setItem(ADMIN_SESSION_KEY, 'active'); closeAdminLoginModal(); updateAuthUIState(); switchView('admin-portal'); showToast('Login Berhasil!', 'success');
  } else { showToast('Username / password tidak valid.', 'error'); }
}
function logoutAdmin() { localStorage.removeItem(ADMIN_SESSION_KEY); updateAuthUIState(); switchView('guest-portal'); showToast('Keluar dari panel admin.', 'info'); }
function updateAuthUIState() {
  const l = document.getElementById('adminNavLabel');
  if (l) l.innerText = (localStorage.getItem(ADMIN_SESSION_KEY) === 'active') ? 'Dashboard Pimpinan' : 'Host Portal';
}

function exportDataToCSV() {
  if (appData.appointments.length === 0) { showToast('Tidak ada data antrean.', 'error'); return; }
  const headers = ['Kode Tiket', 'No Surat Resmi', 'Kategori', 'Pihak Dituju', 'Nama Pemohon', 'Kontak WhatsApp', 'Urgensi', 'Tgl Pelaksanaan', 'Status', 'Ruangan', 'Waktu Mulai', 'Waktu Selesai'];
  const rows = appData.appointments.map(a => {
    const s = txt => (!txt ? '-' : (/^[=+\-@]/.test(String(txt)) ? `'${String(txt).replace(/"/g, '""')}` : String(txt).replace(/"/g, '""')));
    return [`"${s(a.ticketCode)}"`, `"${s(a.officialLetterNo)}"`, `"${s(a.category)}"`, `"${s(a.hostOfficer || a.targetOfficial)}"`, `"${s(a.fullName)}"`, `"${s(a.whatsapp)}"`, `"${s(a.urgency)}"`, `"${s(a.scheduledDate || a.visitDate)}"`, `"${s(a.status)}"`, `"${s(a.scheduledRoom)}"`, `"${s(a.scheduledStart)}"`, `"${s(a.scheduledEnd)}"`];
  });
  const link = document.createElement('a');
  link.href = encodeURI('data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
  link.download = `Data_SIMTADIK_${new Date().toISOString().split('T')[0]}.csv`;
  link.click(); showToast('Rekapitulasi CSV diunduh.', 'success');
}

function showToast(m, type = 'info') {
  const c = document.getElementById('toastContainer'); if (!c) return;
  const t = document.createElement('div'); t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : type === 'error' ? 'circle-exclamation' : 'circle-info'}"></i> <span>${escapeHtml(m)}</span>`;
  c.appendChild(t); setTimeout(() => t.remove(), 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

window.toggleTheme = toggleTheme; window.switchView = switchView; window.handleAdminNavClick = handleAdminNavClick;
window.handleCategoryChange = handleCategoryChange; window.goToStep = goToStep; window.startCamera = startCamera;
window.takePhoto = takePhoto; window.retakePhoto = retakePhoto; window.handleFormSubmission = handleFormSubmission;
window.closeTicketModal = closeTicketModal; window.copyModalTicketCode = copyModalTicketCode; window.trackTicketStatus = trackTicketStatus;
window.switchAdminSubView = switchAdminSubView; window.renderAdminQueueTable = renderAdminQueueTable; window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal; window.handleDelegateHostChange = handleDelegateHostChange; window.switchActionTab = switchActionTab;
window.runLiveCollisionCheck = runLiveCollisionCheck; window.executeApprove = executeApprove; window.executeDelegate = executeDelegate;
window.acceptDelegation = acceptDelegation; window.showRejectDelegationInput = showRejectDelegationInput;
window.cancelRejectDelegation = cancelRejectDelegation; window.submitRejectDelegation = submitRejectDelegation;
window.executeReject = executeReject; window.executeCheckIn = executeCheckIn; window.executeComplete = executeComplete;
window.deleteAppointment = deleteAppointment; window.backupDataToJSON = backupDataToJSON; window.triggerRestoreJSON = triggerRestoreJSON;
window.handleJSONFileRestore = handleJSONFileRestore; window.openOfficialLetterModal = openOfficialLetterModal;
window.saveEditedDocPurpose = saveEditedDocPurpose; window.closeOfficialLetterModal = closeOfficialLetterModal;
window.printOfficialLetter = printOfficialLetter; window.changeCalendarWeek = changeCalendarWeek; window.resetCalendarToCurrentWeek = resetCalendarToCurrentWeek;
window.openFullPhotoModal = openFullPhotoModal; window.closeFullPhotoModal = closeFullPhotoModal; window.openAdminLoginModal = openAdminLoginModal;
window.closeAdminLoginModal = closeAdminLoginModal; window.handleAdminLogin = handleAdminLogin; window.logoutAdmin = logoutAdmin;
window.exportDataToCSV = exportDataToCSV; window.resetAllData = resetAllData;
