const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

// глобальные переменные для фильтров
let activeFilters = {
    spec: '',
    minRating: 0,
    checkMin: null,
    checkMax: null
};

// открытие модального окна фильтров
function openFilterModal() {
    // загружаем специализации для фильтра
    loadFilterSpecs();

    // восстанавливаем сохраненные значения фильтров
    document.getElementById('filter-rating').value = activeFilters.minRating || '0';
    document.getElementById('filter-check-min').value = activeFilters.checkMin || '';
    document.getElementById('filter-check-max').value = activeFilters.checkMax || '';

    document.getElementById('filter-modal').classList.remove('hidden');
}

// закрытие модального окна фильтров
function closeFilterModal() {
    document.getElementById('filter-modal').classList.add('hidden');
}

// загрузка специализаций в фильтр
// загрузка специализаций в фильтр
async function loadFilterSpecs() {
    try {
        const response = await fetch('/api/specializations/');
        const specs = await response.json();
        const select = document.getElementById('filter-spec');
        select.innerHTML = '<option value="">Все специализации</option>';
        specs.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec;
            option.textContent = spec;
            select.appendChild(option);
        });

        // восстанавливаем выбранную специализацию
        if (activeFilters.spec) {
            select.value = activeFilters.spec;
        }
    } catch (error) {
        console.error('ошибка загрузки специализаций:', error);
    }
}

// сброс фильтров
function resetFilters() {
    activeFilters = {
        spec: '',
        minRating: 0,
        checkMin: null,
        checkMax: null
    };
    document.getElementById('filter-spec').value = '';
    document.getElementById('filter-rating').value = '0';
    document.getElementById('filter-check-min').value = '';
    document.getElementById('filter-check-max').value = '';
    performSearch();
    closeFilterModal();
}

// применение фильтров
function applyFilters() {
    activeFilters.spec = document.getElementById('filter-spec').value;
    activeFilters.minRating = parseFloat(document.getElementById('filter-rating').value) || 0;
    activeFilters.checkMin = document.getElementById('filter-check-min').value ?
        parseInt(document.getElementById('filter-check-min').value) : null;
    activeFilters.checkMax = document.getElementById('filter-check-max').value ?
        parseInt(document.getElementById('filter-check-max').value) : null;

    performSearch();
    closeFilterModal();
}

// применение фильтров к списку сервисов
function applyFiltersToServices(servicesList) {
    return servicesList.filter(service => {
        // фильтр по специализации
        if (activeFilters.spec) {
            const specs = service.specs || [];
            if (!specs.includes(activeFilters.spec)) {
                return false;
            }
        }

        // фильтр по рейтингу
        if (activeFilters.minRating > 0) {
            if ((service.rating || 0) < activeFilters.minRating) {
                return false;
            }
        }

        // фильтр по среднему чеку
        if (activeFilters.checkMin !== null) {
            if ((service.avg_check || 0) < activeFilters.checkMin) {
                return false;
            }
        }
        if (activeFilters.checkMax !== null) {
            if ((service.avg_check || 0) > activeFilters.checkMax) {
                return false;
            }
        }

        return true;
    });
}
// поиск по enter
searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
    }
});

// закрытие результатов при клике вне
document.addEventListener('click', function(e) {
    if (!e.target.closest('#search-input') && !e.target.closest('#search-results')) {
        searchResults.classList.add('hidden');
    }
});

// расстояние левенштейна (количество опечаток)
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],      // удаление
                    dp[i][j - 1],      // вставка
                    dp[i - 1][j - 1]   // замена
                );
            }
        }
    }
    return dp[m][n];
}

// проверка нечёткого совпадения с допустимыми опечатками
function isFuzzyMatch(query, text, maxDistance = 2) {
    query = query.toLowerCase();
    text = text.toLowerCase();

    // если запрос очень короткий (1-2 буквы), ищем просто вхождение
    if (query.length <= 2) {
        return text.includes(query);
    }

    // если query короче текста, проверяем схожесть с началом слова
    if (query.length < text.length) {
        // проверяем начало текста той же длины что и query
        const textStart = text.substr(0, query.length);
        const distance = levenshteinDistance(query, textStart);
        if (distance <= maxDistance) return true;

        // также проверяем, содержится ли query в тексте с опечатками
        for (let i = 0; i <= text.length - query.length; i++) {
            const substring = text.substr(i, query.length);
            const dist = levenshteinDistance(query, substring);
            if (dist <= maxDistance) return true;
        }
    } else {
        // если query длиннее или равен тексту
        const distance = levenshteinDistance(query, text);
        if (distance <= maxDistance) return true;

        // проверяем все подстроки
        for (let i = 0; i <= text.length - Math.min(query.length, text.length); i++) {
            const len = Math.min(query.length, text.length - i);
            const substring = text.substr(i, len);
            const dist = levenshteinDistance(query.substr(0, len), substring);
            if (dist <= maxDistance) return true;
        }
    }

    return false;
}

// подсчёт релевантности для нечёткого поиска
function calculateFuzzyScore(query, text) {
    query = query.toLowerCase();
    text = text.toLowerCase();

    let bestScore = 0;

    // проверяем точное совпадение
    if (text === query) return 10;

    // проверяем совпадение с начала
    if (text.startsWith(query)) return 8;

    // проверяем все подстроки
    for (let i = 0; i <= text.length - query.length; i++) {
        const substring = text.substr(i, query.length);
        const distance = levenshteinDistance(query, substring);
        const similarity = 1 - (distance / Math.max(query.length, substring.length));
        const score = similarity * 5;
        if (score > bestScore) bestScore = score;
    }

    return Math.max(0, bestScore);
}

// умный поиск
function performSearch() {
    const query = searchInput.value.trim().toLowerCase();

    // фильтруем только валидные сервисы (с координатами, названием и адресом)
    let validServices = servicesData.filter(s => {
        const hasCoords = s.latitude !== null && s.latitude !== undefined &&
                          s.longitude !== null && s.longitude !== undefined;
        const hasName = s.name && typeof s.name === 'string' && s.name.trim().length > 0;
        const hasAddress = s.address && typeof s.address === 'string' && s.address.trim().length > 0;

        return hasCoords && hasName && hasAddress;
    });

    // применяем фильтры
    validServices = applyFiltersToServices(validServices);

    // если пусто — показать все валидные
    if (!query) {
        showSearchResults(validServices, 'Все автосервисы');
        return;
    }

    // разбиваем запрос на слова
    const words = query.split(/\s+/).filter(w => w.length > 0);

    // считаем релевантность для каждого сервиса
    const scored = validServices.map(service => {
        let score = 0;
        const name = service.name || '';
        const address = service.address || '';
        const specs = service.specs || [];

        const searchText = [name, address, ...specs].join(' ').toLowerCase();

        words.forEach(word => {
            // точное совпадение
            if (searchText.includes(word)) {
                score += 10;
            }

            // нечёткое совпадение (fuzzy)
            if (isFuzzyMatch(word, name)) {
                score += calculateFuzzyScore(word, name) * 2;
            }
            if (isFuzzyMatch(word, address)) {
                score += calculateFuzzyScore(word, address);
            }

            // проверка специализаций
            specs.forEach(spec => {
                if (isFuzzyMatch(word, spec)) {
                    score += calculateFuzzyScore(word, spec) * 1.5;
                }
            });

            // бонус за совпадение с начала названия
            if (name.toLowerCase().startsWith(word)) {
                score += 5;
            }
        });

        return { service, score };
    });

    // разделяем на найденные и не найденные
    const found = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    const notFound = scored.filter(s => s.score === 0)
        .sort((a, b) => b.service.rating - a.service.rating);

    if (found.length > 0) {
        // показываем найденные
        showSearchResults(
            found.map(s => s.service),
            `Найдено: ${found.length}`,
            null
        );
    } else {
        // ничего не найдено — показываем подсказку
        showSearchResults(
            [],
            `По запросу "${query}" ничего не найдено. Попробуйте:`,
            notFound.slice(0, 5).map(s => s.service),
            'Популярные автосервисы:'
        );
    }
}

// показ результатов поиска
function showSearchResults(results, title, fallbackResults = null, fallbackTitle = null) {
    searchResults.innerHTML = '';

    // заголовок
    const header = document.createElement('div');
    header.className = 'px-3 py-2 bg-light border-bottom small text-muted fw-bold';
    header.textContent = title;
    searchResults.appendChild(header);

    // результаты
    if (results.length > 0) {
        results.forEach(service => {
            searchResults.appendChild(createResultCard(service));
        });
    } else if (!fallbackResults) {
        const empty = document.createElement('div');
        empty.className = 'px-3 py-3 text-muted small text-center';
        empty.textContent = 'Ничего не найдено';
        searchResults.appendChild(empty);
    }

    // fallback (если ничего не нашли — показываем остальные)
    if (fallbackResults && fallbackResults.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'px-3 py-2 bg-light border-top border-bottom small text-muted fst-italic';
        divider.textContent = fallbackTitle || 'Возможно, вы искали:';
        searchResults.appendChild(divider);

        fallbackResults.slice(0, 10).forEach(service => {
            searchResults.appendChild(createResultCard(service, true));
        });
    }

    searchResults.classList.remove('hidden');
}

// создание карточки результата
function createResultCard(service, isFallback = false) {
    const card = document.createElement('div');
    card.className = 'search-result-item px-3 py-2 border-bottom';
    card.style.cssText = 'cursor: pointer; transition: background 0.2s;' + (isFallback ? ' opacity: 0.7;' : '');

    // безопасное получение данных с проверкой на undefined
    const name = service.name || 'Без названия';
    const address = service.address || 'Адрес не указан';
    const rating = service.rating || 0;
    const avgCheck = service.avg_check || 0;
    const lat = parseFloat(service.latitude);
    const lng = parseFloat(service.longitude);
    const specs = service.specs || [];

    card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <div class="flex-grow-1">
                <div class="fw-bold small">${name}</div>
                <div class="text-muted" style="font-size: 12px;">📍 ${address}</div>
                ${specs.length > 0 ?
                    `<div class="mt-1">${specs.map(s =>
                        `<span class="spec-tag" style="font-size: 10px; padding: 2px 6px;">${s}</span>`
                    ).join('')}</div>` : ''}
            </div>
            <div class="text-end ms-2">
                <div class="text-warning small">⭐ ${rating}</div>
                <div class="text-muted" style="font-size: 11px;">${avgCheck} ₽</div>
            </div>
        </div>
    `;

    card.addEventListener('mouseenter', () => card.style.background = '#f8f9fa');
    card.addEventListener('mouseleave', () => card.style.background = 'white');

    card.addEventListener('click', () => {
        // проверяем, что координаты валидны
        if (isNaN(lat) || isNaN(lng)) {
            alert('У этого сервиса не заданы координаты');
            return;
        }

        // центрируем карту на сервисе
        map.setView([lat, lng], 16);
        // открываем карточку сервиса
        showServiceDetails(service);
        // закрываем результаты поиска
        searchResults.classList.add('hidden');
        searchInput.value = '';
    });

    return card;
}