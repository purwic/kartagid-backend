
let map;
let tempMarker;
let services = [];
let editingId = null;

// инициализация карты
function initMap() {
    map = L.map('map').setView([55.7961, 49.1088], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    map.on('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        document.getElementById('serviceLat').value = lat.toFixed(6);
        document.getElementById('serviceLng').value = lng.toFixed(6);

        if (tempMarker) {
            map.removeLayer(tempMarker);
        }
        tempMarker = L.marker([lat, lng]).addTo(map);
    });
}

// Загрузка сервисов
async function loadServices() {
    try {
        const response = await fetch('/api/services/');
        services = await response.json();
        renderServices();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        alert('Не удалось загрузить сервисы');
    }
}

// отрисовка списка
function renderServices() {
    const container = document.getElementById('services-list');
    container.innerHTML = '';

    services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start card-content">
                <div class="flex-grow-1">
                    <h5>${service.name}</h5>
                    <p class="mb-1 text-muted">${service.address}</p>
                    <p class="mb-1 text-muted phone-text">${service.phone || 'Не указан'}</p>
                    <p class="mb-1">
                        ${service.rating !== null ? '⭐ ' + service.rating : 'Без рейтинга'} |
                        ${service.avg_check !== null ? service.avg_check + ' ₽' : 'Чек не установлен'}
                    </p>
                    <small class="text-muted coords-text">Координаты: ${service.latitude}, ${service.longitude}</small>
                </div>
                <div class="card-actions ms-3">
                    <button class="btn btn-sm btn-outline-primary" onclick="editService(${service.id})">Изменить</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteService(${service.id})">Удалить</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// открыть модалку добавления
function openAddModal() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Добавить сервис';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';

    // сбрасываем чекбоксы специализаций
    renderSpecsCheckboxes([]);

    const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
    modal.show();

    setTimeout(() => {
        if (!map) initMap();
        map.invalidateSize();
    }, 500);
}

// редактирование сервиса
async function editService(id) {
    const service = services.find(s => s.id === id);
    if (!service) return;

    editingId = id;
    document.getElementById('modalTitle').textContent = 'Редактировать сервис';
    document.getElementById('serviceId').value = service.id;
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceAddress').value = service.address;
    document.getElementById('servicePhone').value = service.phone || '';
    document.getElementById('serviceHours').value = service.hours || '';
    document.getElementById('serviceAvgCheck').value = service.avg_check;
    document.getElementById('serviceLat').value = service.latitude;
    document.getElementById('serviceLng').value = service.longitude;

    // загружаем специализации
    renderSpecsCheckboxes(service.specs || []);

    const modal = new bootstrap.Modal(document.getElementById('serviceModal'));
    modal.show();

    // ждём пока модальное окно откроется
    document.getElementById('serviceModal').addEventListener('shown.bs.modal', function () {
        setTimeout(() => {
            if (!map) initMap();
            map.invalidateSize();

            const lat = parseFloat(service.latitude);
            const lng = parseFloat(service.longitude);
            map.setView([lat, lng], 15);

            if (tempMarker) map.removeLayer(tempMarker);
            tempMarker = L.marker([lat, lng]).addTo(map);
        }, 100);
    }, { once: true });
}

// сохранение сервиса
async function saveService() {
    // подготовка значений к данным
    const avgCheckValue = document.getElementById('serviceAvgCheck').value;
    const phoneValue = document.getElementById('servicePhone').value;
    const hoursValue = document.getElementById('serviceHours').value;
    const avgCheck = avgCheckValue.trim() === '' ? null : parseFloat(avgCheckValue);
    const phoneCheck = phoneValue.trim() === '' ? null : phoneValue;
    const hoursCheck = hoursValue.trim() === '' ? null : hoursValue;

    const data = {
        name: document.getElementById('serviceName').value,
        address: document.getElementById('serviceAddress').value,
        phone: phoneCheck,
        hours: hoursCheck,
        avg_check: avgCheck,
        latitude: parseFloat(document.getElementById('serviceLat').value),
        longitude: parseFloat(document.getElementById('serviceLng').value),
        specs: getSelectedSpecs()
    };

    if (!data.name || !data.address || !data.latitude || !data.longitude) {
        alert('Заполните обязательные поля: название, адрес и координаты');
        return;
    }

    try {
        const csrfToken = getCookie('csrftoken');
        const url = editingId ? `/api/services-admin/${editingId}/` : '/api/services-admin/';
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(data),
            credentials: 'same-origin'
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('serviceModal')).hide();
            await loadServices();
            alert(editingId ? 'Сервис обновлен' : 'Сервис добавлен');
        } else {
            const error = await response.json();
            alert('Ошибка: ' + JSON.stringify(error));
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        alert('Ошибка сохранения сервиса');
    }
}

// удаление сервиса
async function deleteService(id) {
    if (!confirm('Удалить этот сервис?')) return;

    try {
        const csrfToken = getCookie('csrftoken');
        const response = await fetch(`/api/services-admin/${id}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': csrfToken
            },
            credentials: 'same-origin'
        });

        if (response.ok) {
            await loadServices();
            alert('Сервис удален');
        } else {
            alert('Ошибка удаления');
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка удаления сервиса');
    }
}

// CSRF токен
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

let specializations = [];

// загрузка специализаций
async function loadSpecializations() {
    try {
        const response = await fetch('/api/specializations/');
        specializations = await response.json();
        renderSpecsCheckboxes();
    } catch (error) {
        console.error('Ошибка загрузки специализаций:', error);
    }
}

// отрисовка чекбоксов специализаций
function renderSpecsCheckboxes(selectedSpecs = []) {
    const container = document.getElementById('specs-checkboxes');
    if (specializations.length === 0) {
        container.innerHTML = '<div class="text-muted small">Специализации не добавлены</div>';
        return;
    }
    container.innerHTML = specializations.map(spec => `
        <div class="form-check">
            <input class="form-check-input spec-checkbox" type="checkbox" value="${spec}" id="spec-${spec}">
            <label class="form-check-label" for="spec-${spec}">${spec}</label>
        </div>
    `).join('');

    // отмечаем выбранные
    selectedSpecs.forEach(spec => {
        const checkbox = document.getElementById(`spec-${spec}`);
        if (checkbox) checkbox.checked = true;
    });
}

// получение выбранных специализаций
function getSelectedSpecs() {
    const checkboxes = document.querySelectorAll('.spec-checkbox:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// загрузка при старте
loadSpecializations();
loadServices();
let currentReviews = [];

// загрузка отзывов
async function loadReviews() {
    const serviceId = document.getElementById('serviceSelect').value;
    if (!serviceId) {
        document.getElementById('addReviewBtn').disabled = true;
        document.getElementById('reviews-list').innerHTML = '';
        return;
    }

    document.getElementById('addReviewBtn').disabled = false;

    try {
        const response = await fetch(`/api/services/${serviceId}/`);
        const service = await response.json();

        currentReviews = service.reviews || [];
        renderReviews(currentReviews);
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
    }
}

// отрисовка отзывов
function renderReviews(reviews) {
    const container = document.getElementById('reviews-list');

    if (reviews.length === 0) {
        container.innerHTML = '<p class="text-muted">Отзывов пока нет</p>';
        return;
    }

    container.innerHTML = reviews.map(review => {
        // форматируем дату
        const reviewDate = new Date(review.date);
        const formattedDate = reviewDate.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="card mb-2">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong>${review.author}</strong>
                            <span class="text-warning ms-2">${'⭐'.repeat(review.rating)}</span>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="editReview('${review.id}')">✏️</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${review.id}')">🗑️</button>
                        </div>
                    </div>
                    <p class="mb-1 mt-2">${review.text}</p>
                    <small class="text-muted">${formattedDate}</small>
                </div>
            </div>
        `;
    }).join('');
}

// открыть модалку добавления отзыва
function openAddReviewModal() {
    const serviceId = document.getElementById('serviceSelect').value;
    if (!serviceId) {
        alert('Сначала выберите сервис');
        return;
    }

    document.getElementById('reviewModalTitle').textContent = 'Добавить отзыв';
    document.getElementById('reviewForm').reset();
    document.getElementById('reviewId').value = '';
    document.getElementById('reviewServiceId').value = serviceId;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('reviewDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;

    new bootstrap.Modal(document.getElementById('reviewModal')).show();
}

// редактирование отзыва
function editReview(id) {
    const review = currentReviews.find(r => r.id == id);
    if (!review) return;

    document.getElementById('reviewModalTitle').textContent = 'Редактировать отзыв';
    document.getElementById('reviewId').value = review.id;
    document.getElementById('reviewServiceId').value = review.service;
    document.getElementById('reviewAuthor').value = review.author;
    document.getElementById('reviewText').value = review.text;
    document.getElementById('reviewRating').value = review.rating;
    const reviewDate = new Date(review.date);
    const year = reviewDate.getFullYear();
    const month = String(reviewDate.getMonth() + 1).padStart(2, '0');
    const day = String(reviewDate.getDate()).padStart(2, '0');
    const hours = String(reviewDate.getHours()).padStart(2, '0');
    const minutes = String(reviewDate.getMinutes()).padStart(2, '0');
    document.getElementById('reviewDate').value = `${year}-${month}-${day}T${hours}:${minutes}`;

    new bootstrap.Modal(document.getElementById('reviewModal')).show();
}

// удаление отзыва
async function deleteReview(id) {
    if (!confirm('Удалить этот отзыв?')) return;

    try {
        const csrfToken = getCookie('csrftoken');
        const response = await fetch(`/api/reviews/${id}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': csrfToken
            },
            credentials: 'same-origin'
        });

        if (response.ok) {
            await loadReviews();
            alert('Отзыв удалён!');
        } else {
            alert('Ошибка удаления отзыва');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка удаления отзыва');
    }
}

// сохранение отзыва
async function saveReview() {
    // конвертируем дату из datetime-local в ISO формат
    const dateValue = document.getElementById('reviewDate').value;
    const isoDate = dateValue ? new Date(dateValue).toISOString() : null;

    const data = {
        service: parseInt(document.getElementById('reviewServiceId').value),
        author: document.getElementById('reviewAuthor').value,
        text: document.getElementById('reviewText').value,
        rating: parseInt(document.getElementById('reviewRating').value),
        date: isoDate
    };

    if (!data.author || !data.date) {
        alert('Заполните все обязательные поля');
        return;
    }

    try {
        const csrfToken = getCookie('csrftoken');
        const reviewId = document.getElementById('reviewId').value;
        const url = reviewId ? `/api/reviews/${reviewId}/` : '/api/reviews/';
        const method = reviewId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(data),
            credentials: 'same-origin'
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('reviewModal')).hide();
            await loadReviews();
            await loadServices(); // Перезагрузить для обновления рейтинга
            alert(reviewId ? 'Отзыв обновлён!' : 'Отзыв добавлен!');
        } else {
            alert('Ошибка сохранения отзыва');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка сохранения отзыва');
    }
}

// обновление заполнения выпадающего списка сервисов
const originalRenderServices = renderServices;
renderServices = function() {
    originalRenderServices();

    // обновляем select для отзывов
    const select = document.getElementById('serviceSelect');
    if (select) { // проверчем, что элемент существует
        select.innerHTML = '<option value="">Выберите сервис для управления отзывами</option>';
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = service.name;
            select.appendChild(option);
        });
    }
}

// управление специализациями
let specializationsAdmin = [];

// открытие модального окна со списком специализаций
function openSpecsListModal() {
    loadSpecializationsAdmin();
    new bootstrap.Modal(document.getElementById('specsListModal')).show();
}

// загрузка специализаций для админки
async function loadSpecializationsAdmin() {
    try {
        const response = await fetch('/api/specializations-admin/');
        specializationsAdmin = await response.json();
        renderSpecsAdmin();
    } catch (error) {
        console.error('ошибка загрузки специализаций:', error);
    }
}

// отрисовка списка специализаций
function renderSpecsAdmin() {
    const container = document.getElementById('specs-list');
    if (!container) return;

    container.innerHTML = '';

    if (specializationsAdmin.length === 0) {
        container.innerHTML = '<p class="text-muted">Специализации не добавлены</p>';
        return;
    }

    specializationsAdmin.forEach(spec => {
        const card = document.createElement('div');
        card.className = 'service-card d-flex justify-content-between align-items-center';
        card.innerHTML = `
            <div>
                <strong>${spec.name}</strong>
            </div>
            <div>
                <button class="btn btn-sm btn-outline-primary" onclick="editSpec(${spec.id})">Изменить</button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteSpec(${spec.id})">Удалить</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// открыть модалку добавления специализации
function openAddSpecModal() {
    document.getElementById('specModalTitle').textContent = 'Добавить специализацию';
    document.getElementById('specForm').reset();
    document.getElementById('specId').value = '';
    new bootstrap.Modal(document.getElementById('specModal')).show();
}

// редактирование специализации
function editSpec(id) {
    const spec = specializationsAdmin.find(s => s.id === id);
    if (!spec) return;

    document.getElementById('specModalTitle').textContent = 'Редактировать специализацию';
    document.getElementById('specId').value = spec.id;
    document.getElementById('specName').value = spec.name;
    new bootstrap.Modal(document.getElementById('specModal')).show();
}

// сохранение специализации
async function saveSpec() {
    const name = document.getElementById('specName').value.trim();
    const specId = document.getElementById('specId').value;

    if (!name) {
        alert('Введите название специализации');
        return;
    }

    try {
        const csrfToken = getCookie('csrftoken');
        const url = specId ? `/api/specializations-admin/${specId}/` : '/api/specializations-admin/';
        const method = specId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ name: name }),
            credentials: 'same-origin'
        });

        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('specModal')).hide();
            await loadSpecializationsAdmin();
            await loadSpecializations();
            alert(specId ? 'Специализация обновлена!' : 'Специализация добавлена!');
        } else {
            const error = await response.json();
            alert('Ошибка: ' + JSON.stringify(error));
        }
    } catch (error) {
        console.error('ошибка сохранения:', error);
        alert('Ошибка сохранения специализации');
    }
}

// удаление специализации
async function deleteSpec(id) {
    if (!confirm('Удалить эту специализацию?')) return;

    try {
        const csrfToken = getCookie('csrftoken');
        const response = await fetch(`/api/specializations-admin/${id}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': csrfToken
            },
            credentials: 'same-origin'
        });

        if (response.ok) {
            await loadSpecializationsAdmin();
            await loadSpecializations();
            alert('Специализация удалена!');
        } else {
            alert('Ошибка удаления');
        }
    } catch (error) {
        console.error('ошибка:', error);
        alert('Ошибка удаления специализации');
    }
}