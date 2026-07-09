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
  window.location.href = '/login';
}

function updateNavbar() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks) return;

  if (isLoggedIn()) {
    const user = getUser();
    navLinks.innerHTML = `
      <span style="color:#fff;opacity:0.8;font-size:0.9rem">${user.username}</span>
      <a href="#" class="logout-link" onclick="logout(); return false;">Logout</a>
    `;
  } else {
    navLinks.innerHTML = `
      <a href="/">Home</a>
      <a href="/register">Register</a>
      <a href="/login">Login</a>
    `;
  }
}

document.addEventListener('DOMContentLoaded', updateNavbar);
