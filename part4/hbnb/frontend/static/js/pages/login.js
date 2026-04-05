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
    const loginSubmit = document.getElementById('login-submit');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    let isSubmitting = false;

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    const showError = (message) => {
        if (!loginError) return;
        loginError.textContent = message;
        setVisibility(loginError, true);
    };

    const clearError = () => {
        if (!loginError) return;
        loginError.textContent = '';
        setVisibility(loginError, false);
    };

    const setSubmitting = (submitting) => {
        isSubmitting = submitting;
        if (loginSubmit) {
            loginSubmit.disabled = submitting;
            loginSubmit.setAttribute('aria-busy', submitting ? 'true' : 'false');
            loginSubmit.textContent = submitting ? 'Signing in...' : 'Sign in';
        }
        if (emailInput) emailInput.readOnly = submitting;
        if (passwordInput) passwordInput.readOnly = submitting;
    };

    const parseJsonResponse = async (response) => {
        let data = null;
        try {
            data = await response.json();
        } catch (err) {
            data = null;
        }
        return { ok: response.ok, status: response.status, data };
    };

    clearError();

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showError('Enter both email and password to continue.');
            return;
        }

        clearError();
        setSubmitting(true);

        fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(parseJsonResponse)
        .then(({ ok, status, data }) => {
            if (!ok) {
                if (status === 401) {
                    throw new Error('Invalid email or password. Please try again.');
                }
                throw new Error((data && data.Error) || 'We could not sign you in right now. Please try again.');
            }
            if (!data || !data.access_token) {
                throw new Error('Unexpected login response. Please try again.');
            }
            document.cookie = `token=${data.access_token}; path=/; SameSite=Lax`;
            window.location.href = 'index.html';
        })
        .catch(err => {
            showError(err.message);
        })
        .finally(() => {
            setSubmitting(false);
        });
    });

});
