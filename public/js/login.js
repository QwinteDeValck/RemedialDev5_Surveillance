async function login() {
  const feedback = document.getElementById('feedback');
  feedback.className = 'feedback';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    feedback.className = 'feedback error';
    feedback.textContent = 'Please fill in all fields.';
    return;
  }

  feedback.className = 'feedback success';
  feedback.textContent = 'Authentication will be implemented in a future MVP.';
}
