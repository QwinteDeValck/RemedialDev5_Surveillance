function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login.html';
}

const ROLE_LEVELS = { USER: 1, MODERATOR: 2, ADMIN: 3, OWNER: 4 };

function updateNavbar() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  if (isLoggedIn()) {
    const user = getUser();
    const initial = user.username.charAt(0).toUpperCase();
    const colors = ['#D32F2F', '#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#00796B', '#5D4037', '#C2185B'];
    const color = colors[initial.charCodeAt(0) % colors.length];
    const roleLevel = ROLE_LEVELS[user.role_name] || 0;
    const showAdmin = roleLevel >= ROLE_LEVELS.MODERATOR;

    navLinks.innerHTML = `
      <a href="/map/" class="nav-link">Map</a>
      <a href="/observations/" class="nav-link">Observations</a>
      ${showAdmin ? '<a href="/admin/" class="nav-link">Administration</a>' : ''}
      <div class="nav-dropdown" id="navDropdown">
        <button class="nav-dropdown-trigger" id="dropdownTrigger">
          <span class="nav-avatar" style="background:${color}">${initial}</span>
          <span class="nav-username">${user.username}</span>
          <svg class="nav-arrow" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="nav-dropdown-menu" id="dropdownMenu">
          <a href="/profile/" class="dropdown-item">Profile</a>
          <div class="dropdown-divider"></div>
          <a href="#" class="dropdown-item dropdown-item-danger" onclick="logout(); return false;">Logout</a>
        </div>
      </div>
    `;

    const trigger = document.getElementById('dropdownTrigger');
    const menu = document.getElementById('dropdownMenu');
    const dropdown = document.getElementById('navDropdown');

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    document.addEventListener('click', () => menu.classList.remove('open'));
    menu.addEventListener('click', (e) => e.stopPropagation());
  } else {
    navLinks.innerHTML = `
      <a href="/" class="nav-link">Home</a>
      <a href="/auth/register.html" class="nav-link">Register</a>
      <a href="/auth/login.html" class="nav-link">Login</a>
    `;
  }
}

document.addEventListener('DOMContentLoaded', updateNavbar);
