const https = require('https');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

async function geocode(address) {
  if (!address || !address.trim()) {
    return { error: 'Address is required.' };
  }

  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address.trim())}&format=json&limit=1`;

  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'NeighborhoodSurveillance/1.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed || parsed.length === 0) {
            return resolve({ error: 'Could not geocode the provided address.' });
          }
          resolve({
            latitude: parseFloat(parsed[0].lat),
            longitude: parseFloat(parsed[0].lon),
          });
        } catch {
          resolve({ error: 'Invalid response from geocoding service.' });
        }
      });
    }).on('error', () => {
      resolve({ error: 'Geocoding service request failed.' });
    });
  });
}

module.exports = { geocode };
