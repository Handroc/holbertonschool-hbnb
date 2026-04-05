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
    const addPlaceSuccess = document.getElementById('add-place-success');
    const addPlaceSubmit = document.getElementById('add-place-submit');
    const amenitiesDiv  = document.getElementById('amenities-checkboxes');
    const amenitiesLoading = document.getElementById('amenities-loading');
    const pictureInput = document.getElementById('place-picture');
    const picturePreview = document.getElementById('place-picture-preview');
    const pictureNote = document.getElementById('place-picture-note');
    let isSubmitting = false;

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    const setMessage = ({ tone = 'error', text = '' } = {}) => {
        if (tone === 'success') {
            if (addPlaceSuccess) {
                addPlaceSuccess.textContent = text;
                setVisibility(addPlaceSuccess, !!text);
            }
            if (addPlaceError) setVisibility(addPlaceError, false);
            return;
        }

        if (addPlaceError) {
            addPlaceError.textContent = text;
            setVisibility(addPlaceError, !!text);
        }
        if (addPlaceSuccess) setVisibility(addPlaceSuccess, false);
    };

    const setSubmitting = (submitting) => {
        isSubmitting = submitting;
        if (!addPlaceSubmit) return;
        addPlaceSubmit.disabled = submitting;
        addPlaceSubmit.setAttribute('aria-busy', submitting ? 'true' : 'false');
        addPlaceSubmit.textContent = submitting ? 'Creating place...' : 'Create Place';
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

    const updatePictureNote = (text) => {
        if (pictureNote) pictureNote.textContent = text;
    };

    const resetPicturePreview = () => {
        if (picturePreview) {
            picturePreview.src = '';
            setVisibility(picturePreview, false);
        }
    };

    const validatePictureFile = (file) => {
        if (!file) return null;
        if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
            return 'Use JPG, PNG, or WEBP for the photo.';
        }
        if (file.size > MAX_IMAGE_SIZE) {
            return 'Photo must be 5 MB or smaller.';
        }
        return null;
    };

    const readFormData = () => {
        const title = document.getElementById('place-title').value.trim();
        const description = document.getElementById('place-description').value.trim();
        const price = Number.parseFloat(document.getElementById('place-price').value);
        const latitude = Number.parseFloat(document.getElementById('place-latitude').value);
        const longitude = Number.parseFloat(document.getElementById('place-longitude').value);

        if (!title) {
            throw new Error('Add a title before creating your place.');
        }
        if (!Number.isFinite(price) || price <= 0) {
            throw new Error('Price must be a valid number greater than 0.');
        }
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
            throw new Error('Latitude must be between -90 and 90.');
        }
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new Error('Longitude must be between -180 and 180.');
        }

        const amenityIds = Array.from(amenitiesDiv.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        return {
            title,
            description,
            price,
            latitude,
            longitude,
            amenities: amenityIds,
        };
    };

    const renderAmenities = (allAmenities) => {
        amenitiesDiv.innerHTML = '';

        if (!Array.isArray(allAmenities) || allAmenities.length === 0) {
            if (amenitiesLoading) {
                amenitiesLoading.textContent = 'No amenities available right now.';
            }
            return;
        }

        allAmenities.forEach((amenity) => {
            const label = document.createElement('label');
            label.className = 'add-place-amenity-option';

            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = amenity.id;

            const text = document.createElement('span');
            text.textContent = amenity.name;

            label.appendChild(cb);
            label.appendChild(text);
            amenitiesDiv.appendChild(label);
        });

        if (amenitiesLoading) {
            amenitiesLoading.textContent = 'Amenities loaded.';
        }
    };

    if (pictureInput) {
        pictureInput.addEventListener('change', () => {
            setMessage({ text: '' });

            const file = pictureInput.files && pictureInput.files[0] ? pictureInput.files[0] : null;
            const pictureError = validatePictureFile(file);

            if (pictureError) {
                pictureInput.value = '';
                resetPicturePreview();
                updatePictureNote('JPG or PNG recommended.');
                setMessage({ tone: 'error', text: pictureError });
                return;
            }

            if (!file) {
                resetPicturePreview();
                updatePictureNote('JPG or PNG recommended.');
                return;
            }

            if (picturePreview) {
                picturePreview.src = URL.createObjectURL(file);
                setVisibility(picturePreview, true);
            }
            updatePictureNote(`Selected: ${file.name}`);
        });
    }

    fetch(`${API_URL}/amenities/`)
        .then(parseJsonResponse)
        .then(({ ok, data }) => {
            if (!ok) {
                throw new Error('Failed to load amenities.');
            }
            renderAmenities(data);
        })
        .catch(() => {
            if (amenitiesLoading) {
                amenitiesLoading.textContent = 'Amenities could not be loaded right now.';
            }
        });

    addPlaceForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        let data;
        try {
            data = readFormData();
        } catch (err) {
            setMessage({ tone: 'error', text: err.message });
            return;
        }

        const selectedPicture = pictureInput && pictureInput.files ? pictureInput.files[0] : null;
        const pictureError = validatePictureFile(selectedPicture);
        if (pictureError) {
            setMessage({ tone: 'error', text: pictureError });
            return;
        }

        setMessage({ text: '' });
        setSubmitting(true);

        fetch(`${API_URL}/places/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        })
        .then(parseJsonResponse)
        .then(({ ok, status, data }) => {
            if (status === 401) {
                window.location.href = 'login.html';
                return null;
            }
            if (!ok) throw new Error(data.Error || 'Failed to create place');
            const placeId = data.id;
            if (selectedPicture) {
                const fd = new FormData();
                fd.append('picture', selectedPicture);
                return fetch(`${API_URL}/places/${placeId}/picture`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: fd
                })
                .then(parseJsonResponse)
                .then(({ ok: pictureOk, data: pictureData }) => {
                    if (!pictureOk) {
                        throw new Error((pictureData && pictureData.Error) || 'Place created but photo upload failed.');
                    }
                    return placeId;
                });
            }
            return placeId;
        })
        .then(placeId => {
            if (!placeId) return;
            setMessage({ tone: 'success', text: 'Place created. Redirecting...' });
            window.location.href = `place.html?id=${placeId}`;
        })
        .catch(err => {
            setMessage({ tone: 'error', text: err.message });
        })
        .finally(() => {
            setSubmitting(false);
        });
    });

});
