// ── PLACE DETAILS PAGE ────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, BASE_URL, token, jwtPayload, amenityIcon)

document.addEventListener('DOMContentLoaded', () => {

    const placeDetails = document.getElementById('place-details');
    if (!placeDetails) return;

    const placeId = getQueryParam('id');
    if (!placeId) {
        placeDetails.innerHTML = '<p>No place selected. <a href="index.html">Go back</a></p>';
        return;
    }

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    // Fetch and display place info
    fetch(`${API_URL}/places/${placeId}`)
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Failed to load place details');
            return data;
        })
        .then(place => {
            const ownerName = place.owner
                ? `${escapeHtml(place.owner.first_name)} ${escapeHtml(place.owner.last_name)}`
                : 'Unknown';
            const ownerId = place.owner ? place.owner.id : null;
            const ownerLink = ownerId
                ? `<a href="user_profile.html?id=${escapeHtml(ownerId)}" class="host-link">${ownerName}</a>`
                : ownerName;
            const amenitiesHtml = place.amenities && place.amenities.length
                ? place.amenities.map(a => {
                    const icon = amenityIcon(a.name);
                    const img = icon ? `<img src="${escapeHtml(icon)}" alt="${escapeHtml(a.name)}" class="amenity-icon">` : '';
                    return `<span class="amenity-item">${img}${escapeHtml(a.name)}</span>`;
                }).join('')
                : 'None';

            // Render gallery including the original cover image plus extra images.
            const gallerySection = document.getElementById('place-gallery');
            const images = place.images || [];
            const galleryItems = [];

            if (place.picture) {
                galleryItems.push({ path: place.picture, isCover: true });
            }

            images.forEach(img => {
                if (img && img.path) {
                    galleryItems.push({ path: img.path, isCover: false });
                }
            });

            const seenPaths = new Set();
            const uniqueGalleryItems = galleryItems.filter(item => {
                if (!item.path || seenPaths.has(item.path)) return false;
                seenPaths.add(item.path);
                return true;
            });

            if (gallerySection && uniqueGalleryItems.length > 0) {
                setVisibility(gallerySection, true);
                const mainImg = document.createElement('img');
                mainImg.src = `${BASE_URL}${uniqueGalleryItems[0].path}`;
                mainImg.alt = place.title;
                mainImg.className = 'gallery-hero';
                gallerySection.appendChild(mainImg);
                if (uniqueGalleryItems.length > 1) {
                    const thumbs = document.createElement('div');
                    thumbs.className = 'place-gallery';
                    uniqueGalleryItems.forEach(img => {
                        const t = document.createElement('img');
                        t.src = `${BASE_URL}${img.path}`;
                        t.alt = place.title;
                        t.addEventListener('click', () => { mainImg.src = `${BASE_URL}${img.path}`; });
                        thumbs.appendChild(t);
                    });
                    gallerySection.appendChild(thumbs);
                }
            }

            const placePhotoHtml = '';
            const avgRating = place.average_rating;
            const totalReviews = place.review_counts
                ? Object.values(place.review_counts).reduce((s, n) => s + n, 0) : 0;
            const avgHtml = avgRating !== null && avgRating !== undefined
                ? `<div class="detail-avg-rating"><span class="avg-star">★</span><span class="avg-val">${avgRating}</span><span class="avg-total">(${totalReviews} review${totalReviews !== 1 ? 's' : ''})</span></div>`
                : '';
            const catAvgs = place.category_averages || {};
            const catLabels = { cleanliness: 'Cleanliness', location: 'Location', value_score: 'Value', communication: 'Communication' };
            const catRows = Object.entries(catLabels)
                .filter(([k]) => catAvgs[k] != null)
                .map(([k, label]) => {
                    const pct = (catAvgs[k] / 5) * 100;
                    return `<div class="cat-avg-row"><span class="cat-avg-label">${label}</span><div class="cat-avg-bar-wrap"><div class="cat-avg-bar" style="width:${pct}%"></div></div><span class="cat-avg-val">${catAvgs[k]}</span></div>`;
                }).join('');
            const catHtml = catRows ? `<div class="place-cat-averages">${catRows}</div>` : '';
            placeDetails.innerHTML = `
                ${placePhotoHtml}
                <div class="place-info">
                    <h1>${escapeHtml(place.title)}</h1>
                    ${avgHtml}
                    ${catHtml}
                    <p><strong>Host:</strong> ${ownerLink}</p>
                    <p><strong>Price:</strong> $${escapeHtml(String(place.price))} per night</p>
                    <p><strong>Description:</strong> ${escapeHtml(place.description || 'No description provided.')}</p>
                    <p><strong>Amenities:</strong> ${amenitiesHtml}</p>
                </div>
            `;

            // Show map
            const mapSection = document.getElementById('place-map-section');
            if (mapSection && place.latitude != null && place.longitude != null) {
                setVisibility(mapSection, true);
                const map = L.map('place-map').setView([place.latitude, place.longitude], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                    maxZoom: 19,
                }).addTo(map);
                L.marker([place.latitude, place.longitude])
                    .addTo(map)
                    .bindPopup(`<strong>${place.title}</strong>`)
                    .openPopup();
            }

            // Show booking form for logged-in non-owners
            const bookSection = document.getElementById('book-place');
            if (bookSection && token) {
                const placeOwnerId = place.owner ? place.owner.id : null;
                const currentUserId = jwtPayload ? jwtPayload.sub : null;
                if (String(placeOwnerId) !== String(currentUserId)) {
                    setVisibility(bookSection, true);
                }
            }
        })
        .catch(err => {
            placeDetails.innerHTML = `<p>${err.message}</p>`;
        });

    // Fetch and display reviews
    const reviewsSection = document.getElementById('reviews');
    fetch(`${API_URL}/places/${placeId}/reviews`)
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) throw new Error(data.Error || 'Failed to load reviews');
            return data;
        })
        .then(reviews => {
            reviewsSection.innerHTML = '<h2>Reviews</h2>';
            if (!reviews.length) {
                reviewsSection.innerHTML += '<p>No reviews yet. Be the first!</p>';
                return;
            }
            reviews.forEach(review => {
                const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                const userName = review.user
                    ? `${escapeHtml(review.user.first_name)} ${escapeHtml(review.user.last_name)}`
                    : 'Anonymous';
                const avatarHtml = review.user && review.user.profile_picture
                    ? `<img src="${BASE_URL}${escapeHtml(review.user.profile_picture)}" alt="${userName}" class="review-avatar">`
                    : `<div class="review-avatar review-avatar--empty"></div>`;
                const card = document.createElement('div');
                card.className = 'review-card';
                card.innerHTML = `
                    <div class="review-card-header">
                        ${avatarHtml}
                        <div>
                            <h3>${userName}</h3>
                            <p class="rc-stars">${stars}</p>
                        </div>
                    </div>
                    <p>${escapeHtml(review.text)}</p>
                `;
                reviewsSection.appendChild(card);
            });
        })
        .catch(err => {
            reviewsSection.innerHTML += `<p>${err.message}</p>`;
        });

    // Show add-review section only when logged in
    const addReviewSection = document.getElementById('add-review');
    if (addReviewSection) {
        if (token) {
            setVisibility(addReviewSection, true);
            const reviewForm = document.getElementById('review-form');
            reviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text   = document.getElementById('review-text').value;
                const rating = parseInt(document.getElementById('inline-rating').value);
                const payload = { place_id: placeId, text, rating };
                const cleanEl = document.getElementById('inline-cleanliness');
                const locEl   = document.getElementById('inline-location');
                const valEl   = document.getElementById('inline-value');
                const commEl  = document.getElementById('inline-comm');
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
                    window.location.reload();
                })
                .catch(err => alert(err.message));
            });
        }
    }

    // Booking form submission
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm && token) {
        const bookingError   = document.getElementById('booking-error');
        const bookingSuccess = document.getElementById('booking-success');
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const check_in  = document.getElementById('check-in').value;
            const check_out = document.getElementById('check-out').value;
            fetch(`${API_URL}/bookings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ place_id: placeId, check_in, check_out })
            })
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.Error || 'Booking failed');
                if (bookingSuccess) {
                    bookingSuccess.textContent = `Booking confirmed for ${check_in} → ${check_out}!`;
                    setVisibility(bookingSuccess, true);
                }
                if (bookingError) setVisibility(bookingError, false);
                bookingForm.reset();
            })
            .catch(err => {
                if (bookingError) {
                    bookingError.textContent = err.message;
                    setVisibility(bookingError, true);
                }
                if (bookingSuccess) setVisibility(bookingSuccess, false);
            });
        });
    }

});
