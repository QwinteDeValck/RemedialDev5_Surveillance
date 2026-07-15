const db = require('../db');
const { hashPassword, verifyPassword } = require('./users');
const { geocode } = require('../services/geocoding');

async function getProfile(userId) {
  const result = await db.pool.query(
    `SELECT u.id, u.username, u.email, u.role_id, r.name AS role_name, u.created_at
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { error: 'User not found.', status: 404 };
  }

  return result.rows[0];
}

async function updatePassword(userId, body) {
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !currentPassword.trim()) {
    return { error: 'Current password is required.', status: 400 };
  }
  if (!newPassword || newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters.', status: 400 };
  }

  const user = await db.pool.query(
    'SELECT password FROM users WHERE id = $1',
    [userId]
  );

  if (user.rows.length === 0) {
    return { error: 'User not found.', status: 404 };
  }

  if (!verifyPassword(currentPassword, user.rows[0].password)) {
    return { error: 'Current password is incorrect.', status: 403 };
  }

  const hashed = hashPassword(newPassword);

  await db.pool.query(
    'UPDATE users SET password = $1 WHERE id = $2',
    [hashed, userId]
  );

  return { message: 'Password updated successfully.' };
}

async function updateProfile(userId, body) {
  const { username, email } = body;

  if (!username || !username.trim()) {
    return { error: 'Username is required.', status: 400 };
  }
  if (!email || !email.trim()) {
    return { error: 'Email is required.', status: 400 };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: 'Invalid email format.', status: 400 };
  }

  const trimmedUsername = username.trim();
  const trimmedEmail = email.trim();

  const existing = await db.pool.query(
    `SELECT id, username, email FROM users WHERE (username = $1 OR email = $2) AND id != $3`,
    [trimmedUsername, trimmedEmail, userId]
  );

  for (const row of existing.rows) {
    if (row.username === trimmedUsername) {
      return { error: 'Username already taken.', status: 409 };
    }
    if (row.email === trimmedEmail) {
      return { error: 'Email already taken.', status: 409 };
    }
  }

  const result = await db.pool.query(
    `UPDATE users SET username = $1, email = $2 WHERE id = $3
     RETURNING id, username, email, role_id, created_at`,
    [trimmedUsername, trimmedEmail, userId]
  );

  return result.rows[0];
}

async function getPreferences(userId) {
  const result = await db.pool.query(
    `SELECT preferred_city, preferred_latitude, preferred_longitude FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { error: 'User not found.', status: 404 };
  }

  return result.rows[0];
}

async function updatePreferences(userId, body) {
  const { city } = body;

  if (!city || !city.trim()) {
    return { error: 'City is required.', status: 400 };
  }

  const trimmedCity = city.trim();

  if (trimmedCity === 'Other...') {
    return { error: 'Please enter a city name.', status: 400 };
  }

  const presetCities = ['Brussels', 'Amsterdam', 'Paris', 'Berlin', 'London', 'Luxembourg'];
  const isPreset = presetCities.includes(trimmedCity);

  let lat, lon, cityName;

  if (isPreset) {
    const geocodeResult = await geocode(trimmedCity);
    if (geocodeResult.error) {
      return { error: geocodeResult.error, status: 400 };
    }
    lat = geocodeResult.latitude;
    lon = geocodeResult.longitude;
    cityName = trimmedCity;
  } else {
    const geocodeResult = await geocode(trimmedCity);
    if (geocodeResult.error) {
      return { error: 'Could not find the specified city.', status: 400 };
    }
    lat = geocodeResult.latitude;
    lon = geocodeResult.longitude;
    cityName = trimmedCity;
  }

  const result = await db.pool.query(
    `UPDATE users SET preferred_city = $1, preferred_latitude = $2, preferred_longitude = $3 WHERE id = $4
     RETURNING preferred_city, preferred_latitude, preferred_longitude`,
    [cityName, lat, lon, userId]
  );

  return result.rows[0];
}

async function deleteAccount(userId) {
  const result = await db.pool.query(
    'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
    [userId]
  );

  if (result.rows.length === 0) {
    return { error: 'User not found or already deleted.', status: 404 };
  }

  return { message: 'Account deleted successfully.' };
}

module.exports = { getProfile, updateProfile, updatePassword, getPreferences, updatePreferences, deleteAccount };
