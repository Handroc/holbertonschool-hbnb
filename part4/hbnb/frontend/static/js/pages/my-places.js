// ── MY PLACES PAGE ────────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token, jwtPayload)

document.addEventListener('DOMContentLoaded', () => {

    const myPlacesContainer = document.getElementById('my-places-container');
    if (!myPlacesContainer) return;

    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    const currentUserId = jwtPayload ? jwtPayload.sub : null;
    if (!currentUserId) {
        window.location.href = 'login.html';
        return;
    }

    function loadMyPlaces() {
        fetch(`${API_URL}/users/${currentUserId}/places`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(places => {
            myPlacesContainer.innerHTML = '';
            if (!Array.isArray(places) || !places.length) {
                myPlacesContainer.innerHTML = `
                    <div class="empty-state" role="status" aria-live="polite">
                        <div class="empty-state-icon" aria-hidden="true">🏠</div>
                        <h3>No listings yet</h3>
                        <p>You have not listed any place yet. Create your first listing to start receiving bookings.</p>
                        <a href="add_place.html" class="btn--primary">Add your own place</a>
                    </div>
                `;
                return;
            }
            places.forEach(place => {
                const card = document.createElement('div');
                card.className = 'place-card';
                const picHtml = place.picture
                    ? `<div class="place-card-img"><img src="${BASE_URL}${escapeHtml(place.picture)}" alt="${escapeHtml(place.title)}"></div>`
                    : `<div class="place-card-img place-card-img--empty"></div>`;
                card.innerHTML = `
                    ${picHtml}
                    <div class="place-card-body">
                        <div class="place-card-title-row">
                            <h2 class="place-card-title">${escapeHtml(place.title)}</h2>
                            <button class="btn-danger-subtle btn-delete" data-id="${escapeHtml(place.id)}" title="Delete Listing">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </button>
                        </div>
                        <p class="place-card-desc">${escapeHtml(place.description || '')}</p>
                        <p class="place-card-price">$${escapeHtml(String(place.price))} <span class="price-unit">per night</span></p>
                        <div class="place-card-actions">
                            <a href="manage_bookings.html?id=${escapeHtml(place.id)}" class="btn--primary">Manage Bookings</a>
                            <a href="edit_place.html?id=${escapeHtml(place.id)}" class="btn-outline">Edit</a>
                            <a href="place.html?id=${escapeHtml(place.id)}" class="btn-outline">Preview</a>
                        </div>
                    </div>
                `;
                card.querySelector('button[data-id]').addEventListener('click', (e) => {
                    const placeId = e.currentTarget.dataset.id;
                    showDeleteModal(placeId);
                });
                myPlacesContainer.appendChild(card);
            });
        })
        .catch(err => {
            myPlacesContainer.innerHTML = `<p class="form-feedback-error" role="alert">${err.message}</p>`;
        });
    }

    // Modal logic for sweet deletion
    let placeToDelete = null;

    function createDeleteModal() {
        const modal = document.createElement('div');
        modal.id = 'delete-confirm-modal';
        modal.className = 'modal-overlay hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="modal-content">
                <h3 class="modal-title">Delete this place?</h3>
                <p class="modal-desc">This action cannot be undone. All bookings and reviews associated with this listing will be permanently removed.</p>
                <div class="modal-actions">
                    <button class="btn-outline" id="btn-cancel-delete">Cancel</button>
                    <button class="btn-danger" id="btn-confirm-delete">Yes, delete place</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('btn-cancel-delete').addEventListener('click', closeDeleteModal);
        document.getElementById('btn-confirm-delete').addEventListener('click', () => {
            if (placeToDelete) confirmDeletePlace(placeToDelete);
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeDeleteModal();
        });
    }

    function showDeleteModal(placeId) {
        placeToDelete = placeId;
        const modal = document.getElementById('delete-confirm-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        // forced reflow to ensure transition runs
        void modal.offsetWidth;
        modal.classList.add('open');
    }

    function closeDeleteModal() {
        const modal = document.getElementById('delete-confirm-modal');
        if (!modal) return;
        placeToDelete = null;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }

    function confirmDeletePlace(placeId) {
        fetch(`${API_URL}/places/${placeId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Delete failed');
            closeDeleteModal();
            loadMyPlaces();
        })
        .catch(err => {
            alert(err.message);
            closeDeleteModal();
        });
    }

    createDeleteModal();
    loadMyPlaces();

});
