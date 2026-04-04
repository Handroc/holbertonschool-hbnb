// ── ADMIN AMENITIES PAGE ──────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token, isCurrentUserAdmin)

document.addEventListener('DOMContentLoaded', () => {

    const amenitiesTbody = document.getElementById('amenities-tbody');
    const statusMessage = document.getElementById('admin-amenities-status');
    const statusText = statusMessage?.querySelector('.admin-inline-status__text');
    const statusDismissBtn = statusMessage?.querySelector('.admin-inline-status__dismiss');
    const amenitiesFilterInput = document.getElementById('amenities-filter');
    if (!amenitiesTbody) return;

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

    let allAmenities = [];

    const normalizeForSearch = (value) =>
        String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '');

    const getFilteredAmenities = () => {
        const query = normalizeForSearch(amenitiesFilterInput?.value || '');
        if (!query) return allAmenities;
        return allAmenities.filter((amenity) => normalizeForSearch(amenity.name).includes(query));
    };

    const renderAmenities = (amenities) => {
        amenitiesTbody.innerHTML = '';
        if (!amenities.length) {
            const hasFilter = Boolean((amenitiesFilterInput?.value || '').trim());
            const emptyMessage = hasFilter
                ? 'No amenities match this filter. Try another search term.'
                : 'No amenities yet. Add one from the form to start your catalog.';
            amenitiesTbody.innerHTML = `<tr><td colspan="2" class="admin-table-empty">${emptyMessage}</td></tr>`;
            return;
        }
        amenities.forEach(amenity => {
            const tr = document.createElement('tr');
            tr.dataset.id = amenity.id;
            tr.innerHTML = `
                <td data-label="Name" class="amenity-name-cell">${escapeHtml(amenity.name)}</td>
                <td data-label="Actions">
                    <div class="admin-actions">
                    <button class="action-btn edit-amenity-btn" data-id="${escapeHtml(amenity.id)}" data-name="${escapeHtml(amenity.name)}">Edit</button>
                    <button class="action-btn danger delete-amenity-btn" data-id="${escapeHtml(amenity.id)}">Delete</button>
                    </div>
                </td>
            `;
            const deleteBtn = tr.querySelector('.delete-amenity-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const id = btn.dataset.id;
                const amenityLabel = tr.querySelector('.amenity-name-cell')?.textContent?.trim() || 'Amenity';
                if (!requireDeleteConfirmation(btn)) return;
                btn.disabled = true;
                btn.setAttribute('aria-busy', 'true');
                btn.textContent = 'Deleting...';
                fetch(`${API_URL}/amenities/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
                .then(({ ok, data }) => {
                    if (!ok) throw new Error(data.Error || 'Delete failed');
                    showAdminStatus(`${amenityLabel} was removed from amenities.`, 'success');
                    loadAmenities();
                })
                .catch(err => {
                    showAdminStatus(err.message, 'error');
                    resetDeleteButton(btn);
                });
                });
            }

            const editBtn = tr.querySelector('.edit-amenity-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const nameCell = tr.querySelector('.amenity-name-cell');
                const currentName = e.currentTarget.dataset.name;
                const editInput = document.createElement('input');
                editInput.type = 'text';
                editInput.value = currentName;
                editInput.style.width = '90%';
                nameCell.innerHTML = '';
                nameCell.appendChild(editInput);
                e.currentTarget.textContent = 'Save';
                e.currentTarget.classList.remove('edit-amenity-btn');
                e.currentTarget.classList.add('save-amenity-btn');
                e.currentTarget.addEventListener('click', () => {
                    const newName = editInput.value.trim();
                    if (!newName) {
                        showAdminStatus('Enter an amenity name before saving.', 'warning');
                        return;
                    }
                    fetch(`${API_URL}/amenities/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ name: newName })
                    })
                    .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
                    .then(({ ok, data }) => {
                        if (!ok) throw new Error(data.Error || 'Update failed');
                        showAdminStatus('Amenity name updated.', 'success');
                        loadAmenities();
                    })
                    .catch(err => showAdminStatus(err.message, 'error'));
                });
                }, { once: true });
            }
            amenitiesTbody.appendChild(tr);
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

    function loadAmenities() {
        fetch(`${API_URL}/amenities/`)
            .then(res => res.json())
            .then(amenities => {
                allAmenities = amenities;
                renderAmenities(getFilteredAmenities());
            })
            .catch(err => {
                showAdminStatus('Could not load amenities. Check your connection and refresh.', 'error');
                console.error('Failed to load amenities:', err);
            });
    }

    loadAmenities();

    if (amenitiesFilterInput) {
        amenitiesFilterInput.addEventListener('input', () => {
            renderAmenities(getFilteredAmenities());
        });
    }

    const createAmenityForm = document.getElementById('create-amenity-form');
    if (createAmenityForm) {
        const createError   = document.getElementById('create-amenity-error');
        const createSuccess = document.getElementById('create-amenity-success');
        createAmenityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('new-amenity-name').value.trim();
            if (!name) {
                showAdminStatus('Enter an amenity name before creating.', 'warning');
                return;
            }
            fetch(`${API_URL}/amenities/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name })
            })
            .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.Error || 'Failed to create amenity');
                if (createSuccess) {
                    createSuccess.textContent = `Amenity "${data.name}" created.`;
                    setVisibility(createSuccess, true);
                }
                showAdminStatus('Amenity added to the catalog.', 'success');
                if (createError) setVisibility(createError, false);
                createAmenityForm.reset();
                loadAmenities();
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
