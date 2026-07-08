async function register() {
  const feedback = document.getElementById('feedback');
  feedback.className = 'feedback';

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      feedback.className = 'feedback success';
      feedback.textContent = 'Account created successfully! You can now log in.';
      document.getElementById('username').value = '';
      document.getElementById('email').value = '';
      document.getElementById('password').value = '';
    } else {
      feedback.className = 'feedback error';
      feedback.textContent = data.error || 'Registration failed.';
    }
  } catch {
    feedback.className = 'feedback error';
    feedback.textContent = 'Could not connect to server.';
  }
}
