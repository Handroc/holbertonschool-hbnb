// ── PROFILE PAGE ─────────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, BASE_URL, token, jwtPayload, isCurrentUserAdmin, getQueryParam)

document.addEventListener('DOMContentLoaded', () => {

    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const currentUserId = jwtPayload ? jwtPayload.sub : null;
    if (!currentUserId) {
        window.location.href = 'login.html';
        return;
    }

    const paramId = getQueryParam('id');
    // Admins can view/edit any user via ?id=; others always see own profile
    const viewUserId = (isCurrentUserAdmin && paramId) ? paramId : currentUserId;

    const profileTitle   = document.getElementById('profile-title');
    const profileEmail   = document.getElementById('profile-email');
    const profileError   = document.getElementById('profile-error');
    const profileSuccess = document.getElementById('profile-success');
    const emailLabel     = document.getElementById('email-label');
    const emailInput     = document.getElementById('email-input');
    const passwordInput  = document.getElementById('password-input');
    const deleteBtn      = document.getElementById('delete-btn');

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    // Show email edit field for admins only
    if (isCurrentUserAdmin) {
        if (emailLabel) setVisibility(emailLabel, true);
        if (emailInput) setVisibility(emailInput, true);
    }

    const avatarPreview     = document.getElementById('avatar-preview');
    const avatarPlaceholder = document.getElementById('avatar-placeholder');
    const avatarInput       = document.getElementById('avatar-input');
    const avatarError       = document.getElementById('avatar-error');
    const avatarSuccess     = document.getElementById('avatar-success');

    function showAvatar(url) {
        if (!avatarPreview) return;
        avatarPreview.src = url;
        setVisibility(avatarPreview, true);
        if (avatarPlaceholder) setVisibility(avatarPlaceholder, false);
    }

    // Fetch and populate user data
    fetch(`${API_URL}/users/${viewUserId}`)
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'User not found');
            document.getElementById('first-name').value = data.first_name || '';
            document.getElementById('last-name').value  = data.last_name  || '';
            if (emailInput) emailInput.value = data.email || '';
            // Show email as read-only info for non-admins
            if (profileEmail && !isCurrentUserAdmin) {
                profileEmail.textContent = `Email: ${data.email}`;
            }
            // Update heading when admin views another user
            if (viewUserId !== currentUserId && profileTitle) {
                profileTitle.textContent = `Edit User: ${data.first_name} ${data.last_name}`;
            }
            // Show avatar if one exists
            if (data.profile_picture) {
                showAvatar(`${BASE_URL}${data.profile_picture}`);
            }
        })
        .catch(err => {
            if (profileError) {
                profileError.textContent = err.message;
                setVisibility(profileError, true);
            }
        });

    // Avatar upload
    if (avatarInput) {
        avatarInput.addEventListener('change', () => {
            const file = avatarInput.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('avatar', file);

            fetch(`${API_URL}/users/${viewUserId}/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })
            .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.Error || 'Upload failed');
                showAvatar(`${BASE_URL}${data.profile_picture}?t=${Date.now()}`);
                if (avatarSuccess) {
                    avatarSuccess.textContent = 'Profile picture updated.';
                    setVisibility(avatarSuccess, true);
                }
                if (avatarError) setVisibility(avatarError, false);
                avatarInput.value = '';
            })
            .catch(err => {
                if (avatarError) {
                    avatarError.textContent = err.message;
                    setVisibility(avatarError, true);
                }
                if (avatarSuccess) setVisibility(avatarSuccess, false);
            });
        });
    }

    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            first_name: document.getElementById('first-name').value,
            last_name:  document.getElementById('last-name').value,
        };
        if (passwordInput && passwordInput.value) data.password = passwordInput.value;
        if (isCurrentUserAdmin) {
            if (emailInput && emailInput.value) data.email = emailInput.value;
        }

        fetch(`${API_URL}/users/${viewUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        })
        .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Update failed');
            if (profileSuccess) {
                profileSuccess.textContent = 'Profile updated successfully.';
                setVisibility(profileSuccess, true);
            }
            if (profileError) setVisibility(profileError, false);
        })
        .catch(err => {
            if (profileError) {
                profileError.textContent = err.message;
                setVisibility(profileError, true);
            }
            if (profileSuccess) setVisibility(profileSuccess, false);
        });
    });

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const isOwn = viewUserId === currentUserId;
            const msg = isOwn
                ? 'Delete your account? This cannot be undone.'
                : 'Delete this user account? This cannot be undone.';
            if (!confirm(msg)) return;

            fetch(`${API_URL}/users/${viewUserId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.Error || 'Delete failed');
                if (isOwn) {
                    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    window.location.href = 'index.html';
                } else {
                    window.location.href = 'admin_users.html';
                }
            })
            .catch(err => alert(err.message));
        });
    }

});
