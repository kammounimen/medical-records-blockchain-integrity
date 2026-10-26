// public/doctor/js/patient.js
requireRole('medecin');
document.getElementById('doctorName').textContent = 'Dr ' + (localStorage.getItem('name') || '');

const params = new URLSearchParams(window.location.search);
const patientId = params.get('id');
if (!patientId) window.location.href = 'dashboard.html';

let currentDossier = null;

async function loadDossier() {
  try {
    const dossier = await apiFetch(`/api/doctor/patients/${patientId}/dossier`);
    currentDossier = dossier;
    renderPatientInfo(dossier.patient);
    renderHistory(dossier.consultations);
    renderConsultationSelect(dossier.consultations);
  } catch (err) {
    alert(err.message);
  }
}

function renderPatientInfo(patient) {
  document.getElementById('patientName').textContent = patient.name;
  document.getElementById('patientDetails').textContent =
    `${patient.email} · Né(e) le ${patient.birth_date || 'N/A'} · ${patient.gender || ''} ${patient.blood_type ? '· Groupe: ' + patient.blood_type : ''}`;
}

function renderConsultationSelect(consultations) {
  const select = document.getElementById('targetConsultation');
  select.innerHTML = '';
  if (consultations.length === 0) {
    select.innerHTML = '<option value="">Aucune consultation - créez-en une d\'abord</option>';
    return;
  }
  consultations.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${formatDate(c.date)} — ${c.reason || 'Sans motif'}`;
    select.appendChild(opt);
  });
}

function renderHistory(consultations) {
  const container = document.getElementById('historyContainer');
  container.innerHTML = '';

  if (consultations.length === 0) {
    container.innerHTML = '<div class="empty-state">Aucune consultation enregistrée.</div>';
    return;
  }

  consultations.forEach((c) => {
    const block = document.createElement('div');
    block.className = 'consultation-block';

    let diagnosticsHtml = c.diagnostics.length
      ? '<ul class="sub-list">' + c.diagnostics.map(d => `<li>🩺 ${d.description}</li>`).join('') + '</ul>'
      : '<p style="font-size:13px;color:#94a3b8;">Aucun diagnostic.</p>';

    let prescriptionsHtml = c.prescriptions.length
      ? '<ul class="sub-list">' + c.prescriptions.map(p =>
          `<li>💊 <strong>${p.medication}</strong> ${p.dosage ? '- ' + p.dosage : ''} ${p.duration ? '(' + p.duration + ')' : ''}${p.instructions ? '<br><em>' + p.instructions + '</em>' : ''}</li>`
        ).join('') + '</ul>'
      : '<p style="font-size:13px;color:#94a3b8;">Aucune prescription.</p>';

    block.innerHTML = `
      <div class="consultation-header">
        <span class="date">${formatDate(c.date)}</span>
      </div>
      <p><strong>Motif:</strong> ${c.reason || '-'}</p>
      <p><strong>Notes:</strong> ${c.notes || '-'}</p>
      <p><strong>Diagnostics</strong></p>
      ${diagnosticsHtml}
      <p><strong>Prescriptions</strong></p>
      ${prescriptionsHtml}
    `;
    container.appendChild(block);
  });
}

document.getElementById('consultationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('consultationError');
  errorEl.textContent = '';
  try {
    await apiFetch('/api/doctor/consultations', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: Number(patientId),
        reason: document.getElementById('reason').value,
        notes: document.getElementById('notes').value,
      }),
    });
    document.getElementById('consultationForm').reset();
    loadDossier();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('diagnosticForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('subFormError');
  errorEl.textContent = '';
  const consultationId = document.getElementById('targetConsultation').value;
  if (!consultationId) {
    errorEl.textContent = 'Créez d\'abord une consultation.';
    return;
  }
  try {
    await apiFetch('/api/doctor/diagnostics', {
      method: 'POST',
      body: JSON.stringify({
        consultation_id: Number(consultationId),
        description: document.getElementById('diagnosticDescription').value,
      }),
    });
    document.getElementById('diagnosticForm').reset();
    loadDossier();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('prescriptionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('subFormError');
  errorEl.textContent = '';
  const consultationId = document.getElementById('targetConsultation').value;
  if (!consultationId) {
    errorEl.textContent = 'Créez d\'abord une consultation.';
    return;
  }
  try {
    await apiFetch('/api/doctor/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        consultation_id: Number(consultationId),
        medication: document.getElementById('medication').value,
        dosage: document.getElementById('dosage').value,
        duration: document.getElementById('duration').value,
        instructions: document.getElementById('instructions').value,
      }),
    });
    document.getElementById('prescriptionForm').reset();
    loadDossier();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

loadDossier();
