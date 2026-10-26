// routes/auth.routes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

function signToken(user, profileId) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, profileId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

router.get('/doctors', (req, res) => {
  const doctors = db
    .prepare(
      `SELECT dp.id AS doctor_id, u.name, u.email, dp.specialty
       FROM doctor_profiles dp
       JOIN users u ON u.id = dp.user_id
       ORDER BY u.name ASC`
    )
    .all();

  res.json(doctors);
});

// POST /api/auth/register
// body: { name, email, password, role: 'medecin'|'patient', specialty?, birth_date?, gender?, assigned_doctor_id? }
router.post('/register', (req, res) => {
  const { name, email, password, role, specialty, birth_date, gender, assigned_doctor_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Champs requis manquants.' });
  }
  if (!['medecin', 'patient'].includes(role)) {
    return res.status(400).json({ error: 'Role invalide.' });
  }
  if (role === 'patient' && birth_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
      return res.status(400).json({ error: 'La date de naissance est invalide.' });
    }

    const birthDate = new Date(`${birth_date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [year, month, day] = birth_date.split('-').map(Number);
    if (
      Number.isNaN(birthDate.getTime()) ||
      birthDate.getFullYear() !== year ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day
    ) {
      return res.status(400).json({ error: 'La date de naissance est invalide.' });
    }
    if (birthDate > today) {
      return res.status(400).json({ error: 'La date de naissance ne peut pas etre dans le futur.' });
    }
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Un compte existe deja avec cet email.' });
  }

  const hashed = hashPassword(password);
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  );
  const info = insertUser.run(name, email, hashed, role);
  const userId = info.lastInsertRowid;

  let profileId;
  if (role === 'medecin') {
    const info2 = db
      .prepare('INSERT INTO doctor_profiles (user_id, specialty) VALUES (?, ?)')
      .run(userId, specialty || null);
    profileId = info2.lastInsertRowid;
  } else {
    const doctorId = Number(assigned_doctor_id);
    if (!doctorId || !db.prepare('SELECT id FROM doctor_profiles WHERE id = ?').get(doctorId)) {
      return res.status(400).json({ error: 'Veuillez choisir un medecin valide.' });
    }

    const info2 = db
      .prepare('INSERT INTO patient_profiles (user_id, birth_date, gender) VALUES (?, ?, ?)')
      .run(userId, birth_date || null, gender || null);
    profileId = info2.lastInsertRowid;

    db.prepare(
      'INSERT INTO patient_doctor_assignments (patient_id, doctor_id) VALUES (?, ?)'
    ).run(profileId, doctorId);
  }

  const user = { id: userId, role, name };
  const token = signToken(user, profileId);
  res.status(201).json({ token, user: { id: userId, name, email, role, profileId } });
});

// POST /api/auth/login
// body: { email, password }
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !comparePassword(password, user.password)) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  let profileId;
  if (user.role === 'medecin') {
    const p = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(user.id);
    profileId = p ? p.id : null;
  } else {
    const p = db.prepare('SELECT id FROM patient_profiles WHERE user_id = ?').get(user.id);
    profileId = p ? p.id : null;
  }

  const token = signToken(user, profileId);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, profileId },
  });
});

// PUT /api/auth/profile
// body: { name, email, password?, birth_date? }
router.put('/profile', verifyToken, (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!name || !email) {
    return res.status(400).json({ error: 'Le nom et l email sont requis.' });
  }
  if (password && password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caracteres.' });
  }

  if (req.user.role === 'patient' && req.body.birth_date) {
    const birthDateValue = req.body.birth_date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateValue)) {
      return res.status(400).json({ error: 'La date de naissance est invalide.' });
    }

    const birthDate = new Date(`${birthDateValue}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = birthDateValue.split('-').map(Number);
    if (
      Number.isNaN(birthDate.getTime()) ||
      birthDate.getFullYear() !== year ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day ||
      birthDate > today
    ) {
      return res.status(400).json({ error: 'La date de naissance est invalide.' });
    }
  }

  const duplicate = db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(email, req.user.id);
  if (duplicate) {
    return res.status(409).json({ error: 'Un compte existe deja avec cet email.' });
  }

  const updateUser = password
    ? db.prepare('UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?')
    : db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?');
  if (password) {
    updateUser.run(name, email, hashPassword(password), req.user.id);
  } else {
    updateUser.run(name, email, req.user.id);
  }

  if (req.user.role === 'patient' && req.body.birth_date) {
    db.prepare('UPDATE patient_profiles SET birth_date = ? WHERE user_id = ?')
      .run(req.body.birth_date, req.user.id);
  }

  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id);
  const token = signToken(user, req.user.profileId);
  res.json({ token, user: { ...user, profileId: req.user.profileId } });
});

module.exports = router;
