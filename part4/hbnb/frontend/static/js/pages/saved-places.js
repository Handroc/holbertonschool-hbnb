// ── SAVED PLACES PAGE ─────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, BASE_URL, token)

document.addEventListener('DOMContentLoaded', () => {

    const savedPlacesContainer = document.getElementById('saved-places-container');
    if (!savedPlacesContainer) return;

    if (!token) { window.location.href = 'login.html'; return; }

    fetch(`${API_URL}/wishlist/`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(places => {
            if (!Array.isArray(places) || !places.length) {
                savedPlacesContainer.innerHTML = `
                    <div class="empty-state" role="status" aria-live="polite">
                        <div class="empty-state-icon" aria-hidden="true">❤</div>
                        <h3>No saved places yet</h3>
                        <p>Save places you like to quickly compare and book them later.</p>
                        <a href="index.html" class="btn--primary">Find places</a>
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
                        <h2>${escapeHtml(place.title)}</h2>
                        <p>$${escapeHtml(String(place.price))} per night</p>
                        <div class="place-card-footer">
                            <a href="place.html?id=${escapeHtml(place.id)}" class="details-button">View Details</a>
                            <button class="btn-danger-subtle" data-id="${escapeHtml(place.id)}">Remove</button>
                        </div>
                    </div>
                `;
                card.querySelector('button[data-id]').addEventListener('click', (e) => {
                    const pid = e.currentTarget.dataset.id;
                    fetch(`${API_URL}/wishlist/${pid}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(r => r.ok ? r.json() : Promise.reject())
                    .then(() => card.remove())
                    .catch(() => {});
                });
                savedPlacesContainer.appendChild(card);
            });
        })
            .catch(err => { savedPlacesContainer.innerHTML = `<p class="form-feedback-error" role="alert">${err.message}</p>`; });

});
