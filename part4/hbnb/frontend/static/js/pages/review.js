// ── ADD REVIEW PAGE ───────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token, getQueryParam)

document.addEventListener('DOMContentLoaded', () => {

    const addReviewForm = document.getElementById('review-form');
    const ratingSelect  = document.getElementById('rating');
    if (!addReviewForm || !ratingSelect) return;

    const placeId = getQueryParam('id');

    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Show place name in the heading
    if (placeId) {
        fetch(`${API_URL}/places/${placeId}`)
            .then(res => res.json())
            .then(place => {
                const heading = document.getElementById('place-name');
                if (heading) heading.textContent = `Add a Review for: ${place.title}`;
            })
            .catch(() => {});
    }

    addReviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text   = document.getElementById('review').value;
        const rating = parseInt(ratingSelect.value);
        const payload = { place_id: placeId, text, rating };
        const cleanEl = document.getElementById('cat-cleanliness');
        const locEl   = document.getElementById('cat-location');
        const valEl   = document.getElementById('cat-value');
        const commEl  = document.getElementById('cat-comm');
        if (cleanEl && cleanEl.value) payload.cleanliness    = parseInt(cleanEl.value);
        if (locEl   && locEl.value)   payload.location        = parseInt(locEl.value);
        if (valEl   && valEl.value)   payload.value_score     = parseInt(valEl.value);
        if (commEl  && commEl.value)  payload.communication   = parseInt(commEl.value);
        fetch(`${API_URL}/reviews/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Failed to submit review');
            alert('Review submitted successfully!');
            addReviewForm.reset();
        })
        .catch(err => alert(err.message));
    });

});
