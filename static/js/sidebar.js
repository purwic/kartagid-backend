// показ деталей сервиса
function showServiceDetails(service) {
    currentService = service;
    const sidebar = document.getElementById('sidebar');

    document.getElementById('default-message').classList.add('hidden');
    document.getElementById('service-details').classList.remove('hidden');

    document.getElementById('detail-name').textContent = service.name;
    document.getElementById('detail-address').textContent = service.address;
    document.getElementById('detail-phone').textContent = service.phone;
    document.getElementById('detail-hours').textContent = service.hours;
    document.getElementById('detail-rating').textContent = service.rating;
    document.getElementById('detail-reviews-count').textContent = service.reviews.length;
    document.getElementById('detail-avg-check').textContent = service.avg_check.toLocaleString() + ' ₽';

    const specsContainer = document.getElementById('detail-specs');
    specsContainer.innerHTML = '';
    if (service.specs && service.specs.length > 0) {
        service.specs.forEach(spec => {
            const tag = document.createElement('span');
            tag.className = 'spec-tag';
            tag.textContent = spec;
            specsContainer.appendChild(tag);
        });
    } else {
        specsContainer.innerHTML = '<span class="text-muted small">Специализации не указаны</span>';
    }

    const reviewsContainer = document.getElementById('detail-reviews');
    reviewsContainer.innerHTML = '';
    if (service.reviews.length === 0) {
        reviewsContainer.innerHTML = '<p class="text-muted small fst-italic">Отзывов пока нет.</p>';
    } else {
        service.reviews.forEach(review => {
            const reviewDiv = document.createElement('div');
            reviewDiv.className = 'review-item';
            reviewDiv.innerHTML = `
                <div class="review-header">
                    <span class="review-author">${review.author}</span>
                    <span class="review-rating">⭐ ${review.rating}/5</span>
                </div>
                <p class="review-text">${review.text}</p>
                <div class="review-date">${review.date}</div>
            `;
            reviewsContainer.appendChild(reviewDiv);
        });
    }

    sidebar.classList.add('show');

    // на мобильных устройствах центрируем карту на сервисе
    if (window.innerWidth <= 768) {
        setTimeout(() => {
            map.setView([service.latitude, service.longitude], map.getZoom());
        }, 350);
    }
}

// закрытие панели (маршрут при этом сохраняется на карте)
function closePanel() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('show');

    setTimeout(() => {
        document.getElementById('service-details').classList.add('hidden');
        document.getElementById('default-message').classList.remove('hidden');
    }, 300);
}

// клик по карте закрывает боковую панель, только если маршрут ещё не построен
map.on('click', () => {
    if (!routingControl) {
        closePanel();
    }
});