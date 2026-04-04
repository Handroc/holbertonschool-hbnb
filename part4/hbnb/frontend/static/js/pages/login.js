// ── LOGIN PAGE ────────────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token)

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    if (token) {
        window.location.href = 'index.html';
        return;
    }

    const loginError = document.getElementById('login-error');
    if (loginError) {
        loginError.classList.add('hidden');
        loginError.setAttribute('aria-hidden', 'true');
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email    = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (loginError) {
            loginError.classList.add('hidden');
            loginError.setAttribute('aria-hidden', 'true');
        }

        fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Login failed');
            document.cookie = `token=${data.access_token}; path=/`;
            window.location.href = 'index.html';
        })
        .catch(err => {
            if (loginError) {
                loginError.textContent = err.message;
                loginError.classList.remove('hidden');
                loginError.setAttribute('aria-hidden', 'false');
            }
        });
    });

});
