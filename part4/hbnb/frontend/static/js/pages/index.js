// ── INDEX PAGE ────────────────────────────────────────────────────────────────
// Depends on: utils.js (API_URL, BASE_URL, token, isCurrentUserAdmin)

document.addEventListener('DOMContentLoaded', () => {

    const placesContainer = document.getElementById('places-container');
    if (!placesContainer) return;

    const priceFilter = document.getElementById('price-filter');

    // Populate price filter options
    [['all', 'All'], ['10', '$10'], ['50', '$50'], ['100', '$100']].forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        priceFilter.appendChild(opt);
    });

    const amenityDropdown = document.getElementById('amenity-dropdown');
    const amenityDropdownToggle = document.getElementById('amenity-dropdown-toggle');
    const amenityDropdownMenu = document.getElementById('amenity-dropdown-menu');
    const amenityCheckboxes = document.getElementById('amenity-checkboxes');
    const searchInput   = document.getElementById('search-input');
    const sortSelect    = document.getElementById('sort-select');
    const filterError   = document.getElementById('filter-error');

    let allPlaces = [];
    let filteredPlaces = [];
    let wishlistIds = new Set();
    let currentPage = 1;
    const PAGE_SIZE = 12;
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    // Load wishlist IDs if logged in
    if (token) {
        fetch(`${API_URL}/wishlist/ids`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : [])
            .then(ids => { wishlistIds = new Set(ids); })
            .catch(() => {});
    }

    function toggleWishlist(placeId, btn) {
        if (!token) { window.location.href = 'login.html'; return; }
        const inWishlist = wishlistIds.has(placeId);
        if (inWishlist) {
            fetch(`${API_URL}/wishlist/${placeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(() => { wishlistIds.delete(placeId); btn.textContent = '♡'; btn.classList.replace('active', 'inactive'); })
            .catch(() => {});
        } else {
            fetch(`${API_URL}/wishlist/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ place_id: placeId })
            })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(() => { wishlistIds.add(placeId); btn.textContent = '♥'; btn.classList.replace('inactive', 'active'); })
            .catch(() => {});
        }
    }

    const paginationControls = document.getElementById('pagination-controls');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo    = document.getElementById('page-info');

    const setVisibility = (element, isVisible) => {
        if (!element) return;
        element.classList.toggle('hidden', !isVisible);
        element.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    };

    const availFrom = document.getElementById('avail-from');
    const availTo   = document.getElementById('avail-to');
    const amenityNameById = new Map();

    function setFilterError(message) {
        if (!filterError) return;
        if (!message) {
            filterError.textContent = '';
            filterError.classList.add('hidden');
            filterError.setAttribute('aria-hidden', 'true');
            return;
        }
        filterError.textContent = message;
        filterError.classList.remove('hidden');
        filterError.setAttribute('aria-hidden', 'false');
    }

    function getSelectedAmenityIds() {
        if (!amenityCheckboxes) return [];
        return Array.from(amenityCheckboxes.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value)
            .filter(Boolean);
    }

    function setAmenityDropdownOpen(isOpen) {
        if (!amenityDropdownMenu || !amenityDropdownToggle) return;
        amenityDropdownMenu.classList.toggle('hidden', !isOpen);
        amenityDropdownToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    function updateAmenityDropdownLabel() {
        if (!amenityDropdownToggle) return;
        const selectedIds = getSelectedAmenityIds();
        if (!selectedIds.length) {
            amenityDropdownToggle.textContent = 'All Amenities';
            return;
        }
        if (selectedIds.length === 1) {
            amenityDropdownToggle.textContent = amenityNameById.get(selectedIds[0]) || '1 Amenity';
            return;
        }
        amenityDropdownToggle.textContent = `${selectedIds.length} amenities selected`;
    }

    function parseDateAtMidnight(dateValue) {
        return new Date(`${dateValue}T00:00:00`);
    }

    function getDateRangeState() {
        const from = availFrom ? availFrom.value : '';
        const to = availTo ? availTo.value : '';
        const hasPartialRange = (from && !to) || (!from && to);
        const hasCompleteRange = !!(from && to);
        let isOrderedRange = true;

        if (hasCompleteRange) {
            const fromDate = parseDateAtMidnight(from);
            const toDate = parseDateAtMidnight(to);
            isOrderedRange = fromDate < toDate;
        }

        return { from, to, hasPartialRange, hasCompleteRange, isOrderedRange };
    }

    function showSkeleton(count = 6) {
        placesContainer.innerHTML = '';
        for (let i = 0; i < count; i++) {
            placesContainer.innerHTML += `
                <div class="place-card-skeleton">
                    <div class="skeleton-line skeleton-img"></div>
                    <div class="skeleton-body">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-line skeleton-price"></div>
                        <div class="skeleton-line skeleton-desc"></div>
                        <div class="skeleton-line skeleton-desc2"></div>
                    </div>
                </div>`;
        }
    }


    function renderActiveFilters() {
        const list = document.getElementById('active-filters-list');
        if (!list) return;
        list.innerHTML = '';
        
        let hasFilters = false;

        // Search
        if (searchInput && searchInput.value) {
            hasFilters = true;
            const pill = document.createElement('button');
            pill.className = 'filter-pill';
            pill.innerHTML = `<span>"${escapeHtml(searchInput.value)}"</span> <span class="filter-pill-close">&times;</span>`;
            pill.onclick = () => { searchInput.value = ''; applyFilters(); };
            list.appendChild(pill);
        }
        
        // Price Max
        if (priceFilter && priceFilter.value !== 'all') {
            hasFilters = true;
            const pill = document.createElement('button');
            pill.className = 'filter-pill';
            pill.innerHTML = `<span>Max $${priceFilter.value}</span> <span class="filter-pill-close">&times;</span>`;
            pill.onclick = () => { priceFilter.value = 'all'; applyFilters(); };
            list.appendChild(pill);
        }
        
        // Amenity
        const selectedAmenities = getSelectedAmenityIds();
        if (selectedAmenities.length > 0) {
            hasFilters = true;
            selectedAmenities.forEach(amenityId => {
                const amenityName = amenityNameById.get(amenityId);
                if (!amenityName) return;
                const pill = document.createElement('button');
                pill.className = 'filter-pill';
                pill.innerHTML = `<span>${escapeHtml(amenityName)}</span> <span class="filter-pill-close">&times;</span>`;
                pill.onclick = () => {
                    const checkbox = amenityCheckboxes ? amenityCheckboxes.querySelector(`input[value="${amenityId}"]`) : null;
                    if (checkbox) checkbox.checked = false;
                    applyFilters();
                };
                list.appendChild(pill);
            });
        }
        
        // Dates
        // since availFrom/availTo are defined later, we fetch them directly
        const df = document.getElementById('avail-from');
        const dt = document.getElementById('avail-to');
        if ((df && df.value) || (dt && dt.value)) {
            hasFilters = true;
            const fromTxt = (df && df.value) ? df.value : 'Any';
            const toTxt = (dt && dt.value) ? dt.value : 'Any';
            const pill = document.createElement('button');
            pill.className = 'filter-pill';
            pill.innerHTML = `<span>${fromTxt} &rarr; ${toTxt}</span> <span class="filter-pill-close">&times;</span>`;
            pill.onclick = () => { 
                if(df) df.value = ''; 
                if(dt) dt.value = ''; 
                applyFilters(); 
            };
            list.appendChild(pill);
        }

        updateAmenityDropdownLabel();
    }

    function checkClearBtn() {
        const selectedAmenities = getSelectedAmenityIds();
        const active = priceFilter.value !== 'all' ||
            selectedAmenities.length > 0 ||
            (searchInput && searchInput.value !== '') ||
            (sortSelect && sortSelect.value !== 'default') ||
            (availFrom && availFrom.value !== '') ||
            (availTo && availTo.value !== '');
        if (clearFiltersBtn) setVisibility(clearFiltersBtn, active);
        renderActiveFilters();
    }

    function clearFilters() {
        priceFilter.value = 'all';
        if (amenityCheckboxes) {
            Array.from(amenityCheckboxes.querySelectorAll('input[type="checkbox"]')).forEach(checkbox => {
                checkbox.checked = false;
            });
        }
        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = 'default';
        if (availFrom) availFrom.value = '';
        if (availTo) availTo.value = '';
        setFilterError('');
        checkClearBtn();
        applyFilters();
    }

    function isDateInsideBooking(targetDate, bookingStart, bookingEnd) {
        return targetDate >= bookingStart && targetDate < bookingEnd;
    }

    function hasBookingConflict(bookedRanges, checkInValue, checkOutValue) {
        if (!Array.isArray(bookedRanges) || bookedRanges.length === 0) return false;

        const hasCheckIn = !!checkInValue;
        const hasCheckOut = !!checkOutValue;
        const requestedCheckIn = hasCheckIn ? parseDateAtMidnight(checkInValue) : null;
        const requestedCheckOut = hasCheckOut ? parseDateAtMidnight(checkOutValue) : null;

        return bookedRanges.some(([startValue, endValue]) => {
            const bookingStart = parseDateAtMidnight(startValue);
            const bookingEnd = parseDateAtMidnight(endValue);

            if (hasCheckIn && !hasCheckOut) {
                return isDateInsideBooking(requestedCheckIn, bookingStart, bookingEnd);
            }

            if (!hasCheckIn && hasCheckOut) {
                return requestedCheckOut > bookingStart && requestedCheckOut <= bookingEnd;
            }

            if (hasCheckIn && hasCheckOut) {
                const checkInInsideBooking = isDateInsideBooking(requestedCheckIn, bookingStart, bookingEnd);
                const checkOutInsideBooking = requestedCheckOut > bookingStart && requestedCheckOut <= bookingEnd;
                const bookingFullyWithinRequestedRange = bookingStart >= requestedCheckIn && bookingEnd <= requestedCheckOut;
                return checkInInsideBooking || checkOutInsideBooking || bookingFullyWithinRequestedRange;
            }

            return false;
        });
    }

    function applyFilters() {
        const maxPrice        = priceFilter.value;
        const selectedAmenities = getSelectedAmenityIds();
        const searchText      = searchInput ? searchInput.value.toLowerCase() : '';
        const sortVal         = sortSelect ? sortSelect.value : 'default';
        const dateRange = getDateRangeState();
        const availFromValue = dateRange.from;
        const availToValue = dateRange.to;

        if (dateRange.hasCompleteRange && !dateRange.isOrderedRange) {
            setFilterError('Check-out must be after check-in.');
        } else {
            setFilterError('');
        }

        let filtered = allPlaces.filter(place => {
            const priceOk   = maxPrice === 'all' || place.price <= Number(maxPrice);
            const amenityOk = selectedAmenities.length === 0 ||
                selectedAmenities.every(selectedId =>
                    (place.amenities || []).some(a => String(a.id) === String(selectedId))
                );
            const searchOk  = !searchText ||
                place.title.toLowerCase().includes(searchText) ||
                (place.description || '').toLowerCase().includes(searchText);
            const hasUsableRange = !dateRange.hasCompleteRange || dateRange.isOrderedRange;
            const availOk = hasUsableRange
                ? !hasBookingConflict(place._bookedRanges || [], availFromValue, availToValue)
                : true;
            return priceOk && amenityOk && searchOk && availOk;
        });

        if (sortVal === 'price-asc')    filtered.sort((a, b) => a.price - b.price);
        else if (sortVal === 'price-desc')  filtered.sort((a, b) => b.price - a.price);
        else if (sortVal === 'rating-desc') filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));

        filteredPlaces = filtered;
        currentPage = 1;
        renderPage();
        checkClearBtn();
    }

    function renderPage() {
        const totalPages = Math.max(1, Math.ceil(filteredPlaces.length / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * PAGE_SIZE;
        const pageItems = filteredPlaces.slice(start, start + PAGE_SIZE);
        displayPlaces(pageItems);

        if (paginationControls) {
            if (filteredPlaces.length > PAGE_SIZE) {
                setVisibility(paginationControls, true);
                if (pageInfo) pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
                if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
                if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
            } else {
                setVisibility(paginationControls, false);
            }
        }
    }

    if (prevPageBtn) prevPageBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPage(); } });
    if (nextPageBtn) nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredPlaces.length / PAGE_SIZE);
        if (currentPage < totalPages) { currentPage++; renderPage(); }
    });

    function displayPlaces(places) {
        placesContainer.innerHTML = '';
        if (!places.length) {
            placesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                            <path d="M8 11h6"></path>
                        </svg>
                    </div>
                    <h3>0 Results Found</h3>
                    <p>We couldn't find any places matching your current filters. Try adjusting them or clearing your search.</p>
                    <button class="empty-clear-btn" id="empty-state-clear-btn">Clear all filters</button>
                </div>
            `;
        const emptyStateBtn = placesContainer.querySelector('#empty-state-clear-btn');
        if (emptyStateBtn && clearFiltersBtn) {
            emptyStateBtn.addEventListener('click', () => clearFiltersBtn.click());
        }
            return;
        }
        places.forEach(place => {
            const card = document.createElement('div');
            card.className = 'place-card';

            const counts = place.review_counts || {};
            const totalReviews = Object.values(counts).reduce((s, n) => s + n, 0);
            const avgRating = place.average_rating;

            let ratingHtml;
            if (totalReviews === 0) {
                ratingHtml = '<p class="no-reviews">No reviews yet</p>';
            } else {
                ratingHtml = `<div class="avg-rating-row"><span class="avg-star">★</span><span class="avg-val">${avgRating}</span><span class="avg-total">· ${totalReviews} review${totalReviews === 1 ? '' : 's'}</span></div>`;
            }

            const picHtml = place.picture
                ? `<div class="place-card-img"><img src="${BASE_URL}${escapeHtml(place.picture)}" alt="${escapeHtml(place.title)}" loading="lazy"></div>`
                : `<div class="place-card-img place-card-img--empty" role="img" aria-label="No photo available"></div>`;

            const descHtml = place.description
                ? `<p class="place-card-desc">${escapeHtml(place.description)}</p>`
                : '';

            const owner = place.owner;
            const ownerName = owner ? `${escapeHtml(owner.first_name)} ${escapeHtml(owner.last_name)}` : '';
            const ownerAvatarHtml = owner
                ? (owner.profile_picture
                    ? `<img src="${BASE_URL}${escapeHtml(owner.profile_picture)}" alt="${ownerName}" class="place-owner-avatar" data-tooltip="${ownerName}" loading="lazy">`
                    : `<div class="place-owner-avatar place-owner-avatar--empty" data-tooltip="${ownerName}"></div>`)
                : '';
            const ownerLinkHtml = owner
                ? `<a href="user_profile.html?id=${escapeHtml(owner.id)}" class="place-owner-link" data-tooltip="${ownerName}">${ownerAvatarHtml}</a>`
                : '';

            const isWished = wishlistIds.has(place.id);
            card.innerHTML = `
                ${picHtml}
                <div class="place-card-body">
                    <h2>${escapeHtml(place.title)}</h2>
                    <p>$${escapeHtml(String(place.price))} per night</p>
                    ${descHtml}
                    ${ratingHtml}
                    <div class="place-card-footer">
                        ${ownerLinkHtml}
                        <button class="wish-btn ${isWished ? 'active' : 'inactive'}" data-place-id="${escapeHtml(place.id)}" title="${isWished ? 'Remove from saved' : 'Save'}">${isWished ? '♥' : '♡'}</button>
                        <a href="place.html?id=${escapeHtml(place.id)}" class="details-button">View Details</a>
                    </div>
                </div>
            `;
            card.querySelector('.wish-btn').addEventListener('click', (e) => {
                toggleWishlist(place.id, e.currentTarget);
            });
            placesContainer.appendChild(card);
        });
    }

    function fetchPlaces() {
        showSkeleton();
        const url = `${API_URL}/places/`;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        fetch(url, { headers })
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok) throw new Error(data.Error || 'Unable to load places for the selected dates.');
                allPlaces = Array.isArray(data) ? data : [];
                applyFilters();
            })
            .catch(err => {
                console.error('Error fetching places:', err);
                setFilterError(err.message || 'Unable to apply availability filter right now.');
                applyFilters();
            });
    }

    function handleAvailabilityChange() {
        checkClearBtn();
        applyFilters();
    }

    priceFilter.addEventListener('change', applyFilters);
    if (amenityCheckboxes) amenityCheckboxes.addEventListener('change', applyFilters);
    if (searchInput)   searchInput.addEventListener('input', applyFilters);
    if (sortSelect)    sortSelect.addEventListener('change', applyFilters);
    if (availFrom) availFrom.addEventListener('change', handleAvailabilityChange);
    if (availTo)   availTo.addEventListener('change', handleAvailabilityChange);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);

    // Populate amenity filter options
    fetch(`${API_URL}/amenities/`)
        .then(res => res.json())
        .then(amenities => {
            if (amenityCheckboxes) {
                amenities.forEach(a => {
                    amenityNameById.set(String(a.id), a.name);
                    const option = document.createElement('label');
                    option.className = 'amenity-option';
                    option.innerHTML = `<input type="checkbox" value="${escapeHtml(a.id)}"> <span>${escapeHtml(a.name)}</span>`;
                    amenityCheckboxes.appendChild(option);
                });
                updateAmenityDropdownLabel();
            }
        })
        .catch(() => {});

    if (amenityDropdownToggle && amenityDropdownMenu) {
        amenityDropdownToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = amenityDropdownToggle.getAttribute('aria-expanded') === 'true';
            setAmenityDropdownOpen(!isOpen);
        });

        document.addEventListener('click', (event) => {
            if (!amenityDropdown || amenityDropdown.contains(event.target)) return;
            setAmenityDropdownOpen(false);
        });

        amenityDropdownMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }

    // Filter panel toggle
    const filterToggle = document.getElementById('filter-toggle');
    const filterExtra  = document.getElementById('filter-extra');
    if (filterToggle && filterExtra) {
        const setFilterPanelOpen = (isOpen) => {
            if (isOpen) {
                filterExtra.hidden = false;
                filterExtra.setAttribute('aria-hidden', 'false');
                requestAnimationFrame(() => {
                    filterExtra.classList.add('open');
                    filterToggle.classList.add('active');
                    filterToggle.setAttribute('aria-expanded', 'true');
                });
            } else {
                filterExtra.classList.remove('open');
                filterToggle.classList.remove('active');
                filterToggle.setAttribute('aria-expanded', 'false');
                filterExtra.setAttribute('aria-hidden', 'true');
                filterExtra.hidden = true;
            }
        };

        setFilterPanelOpen(false);

        filterToggle.addEventListener('click', () => {
            const isOpen = filterToggle.getAttribute('aria-expanded') === 'true';
            setFilterPanelOpen(!isOpen);
        });
    }

    fetchPlaces();

});
