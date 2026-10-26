const profileModal = document.getElementById('profileModal');
const profileForm = document.getElementById('profileForm');
const profileBirthDateField = document.getElementById('profileBirthDateField');
const profileBirthDate = document.getElementById('profileBirthDate');
const profileError = document.getElementById('profileError');

async function openProfileModal() {
  profileError.textContent = '';
  profileForm.reset();

  try {
    const role = localStorage.getItem('role');
    const profile = await apiFetch(`/api/${role === 'medecin' ? 'doctor' : 'patient'}/profile`);
    document.getElementById('profileName').value = profile.name || '';
    document.getElementById('profileEmail').value = profile.email || '';
    profileBirthDateField.classList.toggle('hidden', role !== 'patient');
    if (role === 'patient') profileBirthDate.value = profile.birth_date || '';
    profileModal.classList.remove('hidden');
  } catch (err) {
    alert(err.message);
  }
}

function closeProfileModal() {
  profileModal.classList.add('hidden');
}

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  profileError.textContent = '';
  const role = localStorage.getItem('role');
  const payload = {
    name: document.getElementById('profileName').value.trim(),
    email: document.getElementById('profileEmail').value.trim(),
    password: document.getElementById('profilePassword').value,
  };
  if (role === 'patient') payload.birth_date = profileBirthDate.value;

  try {
    const data = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('name', data.user.name);
    localStorage.setItem('profileId', data.user.profileId);
    const nameElement = document.getElementById(role === 'medecin' ? 'doctorName' : 'patientNameTop');
    if (nameElement) nameElement.textContent = role === 'medecin' ? `Dr ${data.user.name}` : data.user.name;
    closeProfileModal();
    if (role === 'patient' && typeof loadProfile === 'function') loadProfile();
    alert('Informations mises a jour avec succes.');
  } catch (err) {
    profileError.textContent = err.message;
  }
});

profileModal.addEventListener('click', (event) => {
  if (event.target === profileModal) closeProfileModal();
});