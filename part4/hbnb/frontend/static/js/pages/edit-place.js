// ── EDIT PLACE PAGE ───────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, BASE_URL, token, jwtPayload, isCurrentUserAdmin, getQueryParam)

document.addEventListener('DOMContentLoaded', () => {

    const editPlaceForm = document.getElementById('edit-place-form');
    if (!editPlaceForm) return;

    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    const placeId = getQueryParam('id');
    if (!placeId) {
        window.location.href = 'my_places.html';
        return;
    }
    const currentUserId = jwtPayload ? jwtPayload.sub : null;
    const editError     = document.getElementById('edit-place-error');
    const editSuccess   = document.getElementById('edit-place-success');
    const amenitiesDiv  = document.getElementById('amenities-checkboxes');
    const backLink      = document.getElementById('back-to-place-link');
    if (backLink) backLink.href = `place.html?id=${placeId}`;

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    Promise.all([
        fetch(`${API_URL}/places/${placeId}`).then(r => r.json()),
        fetch(`${API_URL}/amenities/`).then(r => r.json())
    ])
    .then(([place, allAmenities]) => {
        if (place.Error) throw new Error(place.Error);
        // Authorization check
        const ownerId = place.owner ? place.owner.id : null;
        if (!isCurrentUserAdmin && ownerId !== currentUserId) {
            window.location.href = 'index.html';
            return;
        }
        const editTitle = document.getElementById('edit-place-title');
        if (editTitle) editTitle.textContent = `Edit: ${place.title}`;

        document.getElementById('place-title').value       = place.title       || '';
        document.getElementById('place-description').value = place.description || '';
        document.getElementById('place-price').value       = place.price       || '';
        document.getElementById('place-latitude').value    = place.latitude    || '';
        document.getElementById('place-longitude').value   = place.longitude   || '';

        const picPreview = document.getElementById('place-picture-preview');
        if (picPreview && place.picture) {
            picPreview.src = `${BASE_URL}${place.picture}`;
            setVisibility(picPreview, true);
        }

        // Show existing gallery images with delete buttons
        const galleryDiv = document.getElementById('place-images-gallery');
        if (galleryDiv && (place.images || []).length > 0) {
            place.images.forEach(img => {
                const wrap = document.createElement('span');
                wrap.className = 'gallery-thumb-delete';
                wrap.dataset.imgId = img.id;
                wrap.innerHTML = `<img src="${BASE_URL}${img.path}" alt="image"><button type="button" title="Delete">&times;</button>`;
                wrap.querySelector('button').addEventListener('click', () => {
                    if (!confirm('Delete this image?')) return;
                    fetch(`${API_URL}/places/${placeId}/images/${img.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    .then(r => r.json().then(d => ({ ok: r.ok, data: d })))
                    .then(({ ok, data }) => {
                        if (!ok) throw new Error(data.Error || 'Delete failed');
                        wrap.remove();
                    })
                    .catch(err => alert(err.message));
                });
                galleryDiv.appendChild(wrap);
            });
        }

        const currentAmenityIds = new Set((place.amenities || []).map(a => a.id));
        allAmenities.forEach(amenity => {
            const label = document.createElement('label');
            label.style.cssText = 'display:flex;align-items:center;gap:0.35rem;';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = amenity.id;
            cb.checked = currentAmenityIds.has(amenity.id);
            label.appendChild(cb);
            label.appendChild(document.createTextNode(amenity.name));
            amenitiesDiv.appendChild(label);
        });
    })
    .catch(err => {
        if (editError) {
            editError.textContent = err.message;
            setVisibility(editError, true);
        }
    });

    editPlaceForm.addEventListener('submit', (e) => {
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
        const pictureInput      = document.getElementById('place-picture');
        const extraImagesInput  = document.getElementById('place-extra-images');
        fetch(`${API_URL}/places/${placeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        })
        .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Update failed');
            const uploads = [];
            if (pictureInput && pictureInput.files && pictureInput.files[0]) {
                const fd = new FormData();
                fd.append('picture', pictureInput.files[0]);
                uploads.push(fetch(`${API_URL}/places/${placeId}/picture`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: fd
                }));
            }
            if (extraImagesInput && extraImagesInput.files && extraImagesInput.files.length > 0) {
                Array.from(extraImagesInput.files).forEach(file => {
                    const fd = new FormData();
                    fd.append('image', file);
                    uploads.push(fetch(`${API_URL}/places/${placeId}/images`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: fd
                    }));
                });
            }
            return Promise.all(uploads);
        })
        .then(() => {
            if (editSuccess) {
                editSuccess.textContent = 'Place updated successfully.';
                setVisibility(editSuccess, true);
            }
            if (editError) setVisibility(editError, false);
        })
        .catch(err => {
            if (editError) {
                editError.textContent = err.message;
                setVisibility(editError, true);
            }
            if (editSuccess) setVisibility(editSuccess, false);
        });
    });

});
