// ── ADD PLACE PAGE ────────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, token)

document.addEventListener('DOMContentLoaded', () => {

    const addPlaceForm = document.getElementById('add-place-form');
    if (!addPlaceForm) return;

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const addPlaceError = document.getElementById('add-place-error');
    const amenitiesDiv  = document.getElementById('amenities-checkboxes');

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    fetch(`${API_URL}/amenities/`)
        .then(r => r.json())
        .then(allAmenities => {
            allAmenities.forEach(amenity => {
                const label = document.createElement('label');
                label.style.cssText = 'display:flex;align-items:center;gap:0.35rem;';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = amenity.id;
                label.appendChild(cb);
                label.appendChild(document.createTextNode(amenity.name));
                amenitiesDiv.appendChild(label);
            });
        })
        .catch(() => {});

    addPlaceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amenityIds = Array.from(amenitiesDiv.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);
        const data = {
            title:       document.getElementById('place-title').value,
            description: document.getElementById('place-description').value,
            price:       parseFloat(document.getElementById('place-price').value),
            latitude:    parseFloat(document.getElementById('place-latitude').value),
            longitude:   parseFloat(document.getElementById('place-longitude').value),
            amenities:   amenityIds,
        };
        const pictureInput = document.getElementById('place-picture');
        fetch(`${API_URL}/places/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        })
        .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Failed to create place');
            const placeId = data.id;
            if (pictureInput && pictureInput.files && pictureInput.files[0]) {
                const fd = new FormData();
                fd.append('picture', pictureInput.files[0]);
                return fetch(`${API_URL}/places/${placeId}/picture`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: fd
                }).then(() => placeId);
            }
            return placeId;
        })
        .then(placeId => {
            window.location.href = `place.html?id=${placeId}`;
        })
        .catch(err => {
            if (addPlaceError) {
                addPlaceError.textContent = err.message;
                setVisibility(addPlaceError, true);
            }
        });
    });

});
