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

function updateNavbar() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  if (isLoggedIn()) {
    const user = getUser();
    navLinks.innerHTML = `
      <a href="/observations/" style="color:#fff;text-decoration:none;font-size:0.9rem;opacity:0.8">Observations</a>
      <span style="color:#fff;opacity:0.8;font-size:0.9rem">${user.username}</span>
      <a href="#" class="logout-link" onclick="logout(); return false;">Logout</a>
    `;
  } else {
    navLinks.innerHTML = `
      <a href="/">Home</a>
      <a href="/auth/register.html">Register</a>
      <a href="/auth/login.html">Login</a>
    `;
  }
}

document.addEventListener('DOMContentLoaded', updateNavbar);
