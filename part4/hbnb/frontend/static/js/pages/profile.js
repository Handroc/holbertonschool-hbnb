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
    const emailAdminNote = document.getElementById('email-admin-note');
    const passwordInput  = document.getElementById('password-input');
    const deleteBtn      = document.getElementById('delete-btn');
    const profileSubmitBtn = profileForm.querySelector('button[type="submit"]');

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    const setFeedback = (target, text = '', tone = 'error') => {
        if (!target) return;
        target.textContent = text;
        target.classList.remove('form-feedback-error', 'form-feedback-success', 'hidden');
        target.classList.add(tone === 'success' ? 'form-feedback-success' : 'form-feedback-error');
        setVisibility(target, !!text);
    };

    const clearFeedback = (...elements) => {
        elements.forEach((element) => {
            if (!element) return;
            element.textContent = '';
            setVisibility(element, false);
        });
    };

    const setButtonBusy = (button, busy, busyLabel, idleLabel) => {
        if (!button) return;
        button.disabled = busy;
        button.setAttribute('aria-busy', busy ? 'true' : 'false');
        if (busy && busyLabel) button.textContent = busyLabel;
        if (!busy && idleLabel) button.textContent = idleLabel;
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

    const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
    const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
    let isSavingProfile = false;
    let isUploadingAvatar = false;
    let isDeletingAccount = false;

    // Show email edit field for admins only
    if (isCurrentUserAdmin) {
        if (emailLabel) setVisibility(emailLabel, true);
        if (emailInput) setVisibility(emailInput, true);
        if (emailAdminNote) setVisibility(emailAdminNote, true);
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
        .then(parseJsonResponse)
        .then(({ ok, status, data }) => {
            if (status === 401) {
                window.location.href = 'login.html';
                return;
            }
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
                if (deleteBtn) deleteBtn.textContent = 'Delete User';
            }
            // Show avatar if one exists
            if (data.profile_picture) {
                showAvatar(`${BASE_URL}${data.profile_picture}`);
            }
        })
        .catch(err => {
            setFeedback(profileError, err.message, 'error');
        });

    // Avatar upload
    if (avatarInput) {
        avatarInput.addEventListener('click', () => {
            clearFeedback(avatarError, avatarSuccess);
        });

        avatarInput.addEventListener('change', () => {
            if (isUploadingAvatar || isDeletingAccount) return;
            const file = avatarInput.files[0];
            if (!file) return;

            clearFeedback(avatarError, avatarSuccess);

            if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
                setFeedback(avatarError, 'Use JPG, PNG, or WEBP for profile photos.', 'error');
                avatarInput.value = '';
                return;
            }
            if (file.size > MAX_AVATAR_SIZE) {
                setFeedback(avatarError, 'Profile photo must be 5 MB or smaller.', 'error');
                avatarInput.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('avatar', file);

            isUploadingAvatar = true;
            if (avatarInput) avatarInput.disabled = true;

            fetch(`${API_URL}/users/${viewUserId}/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })
            .then(parseJsonResponse)
            .then(({ ok, status, data }) => {
                if (status === 401) {
                    window.location.href = 'login.html';
                    return;
                }
                if (!ok) throw new Error(data.Error || 'Upload failed');
                showAvatar(`${BASE_URL}${data.profile_picture}?t=${Date.now()}`);
                setFeedback(avatarSuccess, 'Profile picture updated.', 'success');
                avatarInput.value = '';
            })
            .catch(err => {
                setFeedback(avatarError, err.message, 'error');
            })
            .finally(() => {
                isUploadingAvatar = false;
                if (avatarInput) avatarInput.disabled = false;
            });
        });
    }

    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (isSavingProfile || isDeletingAccount) return;

        clearFeedback(profileError, profileSuccess);

        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();

        if (!firstName || !lastName) {
            setFeedback(profileError, 'First and last name are required.', 'error');
            return;
        }

        const data = {
            first_name: firstName,
            last_name:  lastName,
        };
        if (passwordInput && passwordInput.value) {
            data.password = passwordInput.value;
        }
        if (isCurrentUserAdmin) {
            if (emailInput && emailInput.value.trim()) data.email = emailInput.value.trim();
        }

        isSavingProfile = true;
        setButtonBusy(profileSubmitBtn, true, 'Saving...', 'Save Changes');
        if (deleteBtn) deleteBtn.disabled = true;

        fetch(`${API_URL}/users/${viewUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        })
        .then(parseJsonResponse)
        .then(({ ok, status, data }) => {
            if (status === 401) {
                window.location.href = 'login.html';
                return;
            }
            if (!ok) throw new Error(data.Error || 'Update failed');
            setFeedback(profileSuccess, 'Profile updated successfully.', 'success');
            if (passwordInput) passwordInput.value = '';
        })
        .catch(err => {
            setFeedback(profileError, err.message, 'error');
        })
        .finally(() => {
            isSavingProfile = false;
            setButtonBusy(profileSubmitBtn, false, 'Saving...', 'Save Changes');
            if (deleteBtn) deleteBtn.disabled = false;
        });
    });

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (isDeletingAccount || isSavingProfile || isUploadingAvatar) return;

            const isOwn = viewUserId === currentUserId;
            const msg = isOwn
                ? 'Delete your account? This cannot be undone.'
                : 'Delete this user account? This cannot be undone.';
            if (!confirm(msg)) return;

            const confirmationText = window.prompt('Type DELETE to confirm this action.');
            if (confirmationText !== 'DELETE') {
                setFeedback(profileError, 'Account deletion canceled. Confirmation text did not match.', 'error');
                return;
            }

            isDeletingAccount = true;
            setButtonBusy(deleteBtn, true, 'Deleting...', 'Delete Account');
            if (profileSubmitBtn) profileSubmitBtn.disabled = true;

            fetch(`${API_URL}/users/${viewUserId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(parseJsonResponse)
            .then(({ ok, status, data }) => {
                if (status === 401) {
                    window.location.href = 'login.html';
                    return;
                }
                if (!ok) throw new Error(data.Error || 'Delete failed');
                if (isOwn) {
                    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    window.location.href = 'index.html';
                } else {
                    window.location.href = 'admin_users.html';
                }
            })
            .catch(err => {
                setFeedback(profileError, err.message, 'error');
            })
            .finally(() => {
                isDeletingAccount = false;
                setButtonBusy(deleteBtn, false, 'Deleting...', 'Delete Account');
                if (profileSubmitBtn) profileSubmitBtn.disabled = false;
            });
        });
    }

    profileForm.addEventListener('input', () => {
        clearFeedback(profileError, profileSuccess);
    });

});
