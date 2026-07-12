(function () {
  const mapElement = document.getElementById('map');

  if (!mapElement) return;

  if (typeof L === 'undefined') {
    mapElement.innerHTML = '<div class="map-error"><h2>Map failed to load</h2><p>The map library could not be loaded. Please try again later.</p></div>';
    return;
  }

  const map = L.map('map').setView([50.69, 4.04], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
})();
