// открыть модалку отзыва
function openReviewModal() {
    if (!currentService) {
        alert('Сначала выберите сервис');
        return;
    }
    document.getElementById('review-modal').classList.remove('hidden');
    document.getElementById('reviewForm').reset();
}

// закрыть модалку отзыва
function closeReviewModal() {
    document.getElementById('review-modal').classList.add('hidden');
}

// отправка отзыва
async function submitReview(e) {
    e.preventDefault();

    if (!currentService) {
        alert('Сначала выберите сервис');
        return;
    }

    const data = {
        service: currentService.id,
        author: document.getElementById('review-author').value.trim(),
        text: document.getElementById('review-text').value.trim(),
        rating: parseInt(document.getElementById('review-rating').value),
        date: new Date().toISOString().split('T')[0]
    };

    if (!data.rating) {
        alert('Выберите оценку');
        return;
    }

    try {
        const csrfToken = getCookie('csrftoken');

        const response = await fetch('/api/reviews/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify(data),
            credentials: 'same-origin'
        });

        if (response.ok) {
            closeReviewModal();

            // перезагружаем данные с сервера
            await loadServicesFromAPI();

            // находим обновлённый сервис и показываем его
            const updatedService = servicesData.find(s => s.id === currentService.id);
            if (updatedService) {
                showServiceDetails(updatedService);
            }

            alert('Спасибо за отзыв!');
        } else {
            const error = await response.json();
            alert('Ошибка: ' + JSON.stringify(error));
        }
    } catch (error) {
        console.error('Ошибка отправки отзыва:', error);
        alert('Не удалось отправить отзыв. Попробуйте позже.');
    }
}