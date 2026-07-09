const form = document.getElementById('loginForm');
const feedback = document.getElementById('feedback');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  feedback.className = 'feedback';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    feedback.className = 'feedback error';
    feedback.textContent = 'Please fill in all fields.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      feedback.className = 'feedback success';
      feedback.textContent = 'Login successful!';
    } else {
      feedback.className = 'feedback error';
      feedback.textContent = data.error || 'Login failed.';
    }
  } catch {
    feedback.className = 'feedback error';
    feedback.textContent = 'Could not connect to server.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log In';
  }
});
