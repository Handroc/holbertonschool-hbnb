// ── ADMIN USERS PAGE ──────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token, isCurrentUserAdmin)

document.addEventListener('DOMContentLoaded', () => {

    const usersTbody = document.getElementById('users-tbody');
    const statusMessage = document.getElementById('admin-users-status');
    const statusText = statusMessage?.querySelector('.admin-inline-status__text');
    const statusDismissBtn = statusMessage?.querySelector('.admin-inline-status__dismiss');
    const usersFilterInput = document.getElementById('users-filter');
    if (!usersTbody) return;

    if (!token || !isCurrentUserAdmin) {
        window.location.href = token ? 'index.html' : 'login.html';
        return;
    }

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    const hideAdminStatus = () => {
        if (!statusMessage) return;
        statusMessage.classList.add('hidden');
        statusMessage.setAttribute('aria-hidden', 'true');
    };

    const showAdminStatus = (message, tone = 'warning') => {
        if (!statusMessage) return;
        if (statusText) {
            statusText.textContent = message;
        } else {
            statusMessage.textContent = message;
        }
        statusMessage.classList.remove('hidden', 'is-success', 'is-warning', 'is-error');
        statusMessage.classList.add(`is-${tone}`);
        statusMessage.setAttribute('aria-hidden', 'false');
    };

    if (statusDismissBtn) {
        statusDismissBtn.addEventListener('click', hideAdminStatus);
    }

    let allUsers = [];

    const getFilteredUsers = () => {
        const query = (usersFilterInput?.value || '').trim().toLowerCase();
        if (!query) return allUsers;
        return allUsers.filter((user) => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
            const email = (user.email || '').toLowerCase();
            return fullName.includes(query) || email.includes(query);
        });
    };

    const renderUsers = (users) => {
        usersTbody.innerHTML = '';
        if (!users.length) {
            const hasFilter = Boolean((usersFilterInput?.value || '').trim());
            const emptyMessage = hasFilter
                ? 'No users match this filter. Try another name or email.'
                : 'No user accounts yet. Use “Create New User” to add the first account.';
            usersTbody.innerHTML = `<tr><td colspan="4" class="admin-table-empty">${emptyMessage}</td></tr>`;
            return;
        }
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Name">${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</td>
                <td data-label="Email">${escapeHtml(user.email)}</td>
                <td data-label="Admin">${user.is_admin ? 'Yes' : 'No'}</td>
                <td data-label="Actions">
                    <div class="admin-actions">
                        <a href="profile.html?id=${escapeHtml(user.id)}" class="action-btn">Edit</a>
                        <button class="action-btn danger" data-id="${escapeHtml(user.id)}">Delete</button>
                    </div>
                </td>
            `;
            tr.querySelector('button[data-id]').addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const userId = btn.dataset.id;
                const userLabel = tr.querySelector('td')?.textContent?.trim() || 'User';
                if (!requireDeleteConfirmation(btn)) return;
                btn.disabled = true;
                btn.setAttribute('aria-busy', 'true');
                btn.textContent = 'Deleting...';
                fetch(`${API_URL}/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
                .then(({ ok, data }) => {
                    if (!ok) throw new Error(data.Error || 'Delete failed');
                    showAdminStatus(`${userLabel} was deleted.`, 'success');
                    loadUsers();
                })
                .catch(err => {
                    showAdminStatus(err.message, 'error');
                    resetDeleteButton(btn);
                });
            });
            usersTbody.appendChild(tr);
        });
    };

    const resetDeleteButton = (button) => {
        if (!button) return;
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.classList.remove('action-btn--confirm');
        button.dataset.armed = 'false';
        button.textContent = button.dataset.defaultLabel || 'Delete';
    };

    const requireDeleteConfirmation = (button) => {
        if (!button) return false;
        if (button.dataset.armed === 'true') return true;
        button.dataset.defaultLabel = button.textContent.trim() || 'Delete';
        button.dataset.armed = 'true';
        button.textContent = 'Confirm Delete';
        button.classList.add('action-btn--confirm');
        showAdminStatus('Deleting is permanent. Press again within 4 seconds to confirm.', 'warning');
        window.setTimeout(() => {
            if (button.dataset.armed === 'true' && !button.disabled) {
                resetDeleteButton(button);
            }
        }, 4000);
        return false;
    };

    function loadUsers() {
        fetch(`${API_URL}/users/`)
            .then(res => res.json())
            .then(users => {
                allUsers = users;
                renderUsers(getFilteredUsers());
            })
            .catch(err => {
                showAdminStatus('Could not load users. Check your connection and refresh.', 'error');
                console.error('Failed to load users:', err);
            });
    }

    loadUsers();

    if (usersFilterInput) {
        usersFilterInput.addEventListener('input', () => {
            renderUsers(getFilteredUsers());
        });
    }

    const createUserForm = document.getElementById('create-user-form');
    if (createUserForm) {
        const createError   = document.getElementById('create-user-error');
        const createSuccess = document.getElementById('create-user-success');

        createUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                first_name: document.getElementById('new-first-name').value,
                last_name:  document.getElementById('new-last-name').value,
                email:      document.getElementById('new-email').value,
                password:   document.getElementById('new-password').value,
            };
            fetch(`${API_URL}/users/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            })
            .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.Error || 'Failed to create user');
                if (createSuccess) {
                    createSuccess.textContent = 'User created successfully.';
                    setVisibility(createSuccess, true);
                }
                showAdminStatus('User created. You can edit profile details from the table.', 'success');
                if (createError) setVisibility(createError, false);
                createUserForm.reset();
                loadUsers();
            })
            .catch(err => {
                showAdminStatus(err.message, 'error');
                if (createError) {
                    createError.textContent = err.message;
                    setVisibility(createError, true);
                }
                if (createSuccess) setVisibility(createSuccess, false);
            });
        });
    }

});
