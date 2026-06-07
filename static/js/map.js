// пытаемся восстановить позицию из localStorage
const savedView = localStorage.getItem('mapView');
let initialLat = 55.7961; // казань
let initialLng = 49.1088; // кпзань
let initialZoom = 13;

if (savedView) {
    try {
        const view = JSON.parse(savedView);
        initialLat = view.lat;
        initialLng = view.lng;
        initialZoom = view.zoom;
    } catch (e) {
        console.error('Ошибка загрузки позиции карты:', e);
    }
}

var map = L.map('map').setView([initialLat, initialLng], initialZoom);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

// сохраняем позицию карты при перемещении и зуме
function saveMapView() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    localStorage.setItem('mapView', JSON.stringify({
        lat: center.lat,
        lng: center.lng,
        zoom: zoom
    }));
}

// сохраняем при перемещении карты
map.on('moveend', saveMapView);

// сохраняем при зуме
map.on('zoomend', saveMapView);

// переменная для хранения маршрута
var routingControl = null;
var currentService = null;

// загружаем данные из api
let servicesData = [];
let specializations = [];

async function loadServicesFromAPI() {
    try {
        // загружаем сервисы
        const servicesResponse = await fetch('/api/services/');
        servicesData = await servicesResponse.json();

        // загружаем специализации
        const specsResponse = await fetch('/api/specializations/');
        specializations = await specsResponse.json();

        // инициализируем маркеры
        displayMarkers(servicesData);

        console.log('Данные загружены:', servicesData.length, 'сервисов');
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Не удалось загрузить данные с сервера. Убедитесь, что Django сервер запущен на порту 8000.');
    }
}

// загружаем данные при загрузке страницы
loadServicesFromAPI();

// массив для хранения маркеров
var markers = [];

function displayMarkers(services) {
    // очищаем старые маркеры
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // создаем новые маркеры
    services.forEach(service => {
        const marker = L.marker([service.latitude, service.longitude]).addTo(map);
        marker.on('click', () => {
            showServiceDetails(service);
        });
        markers.push(marker);
    });
}

// глобальная переменная для режима выбора точки
var selectStartPointMode = false;

function buildRoute() {
    if (!currentService) return;

    // показываем модальное окно выбора способа
    document.getElementById('route-modal').classList.remove('hidden');
}

function closeRouteModal() {
    document.getElementById('route-modal').classList.add('hidden');
}

function enableMapSelection() {
    closeRouteModal();

    selectStartPointMode = true;

    // меняем курсор
    map.getContainer().style.cursor = 'crosshair';

    // показываем подсказку
    const hint = document.createElement('div');
    hint.id = 'route-hint';
    hint.className = 'alert alert-info';
    hint.style.cssText = 'position: absolute; top: 70px; left: 50%; transform: translateX(-50%); z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
    hint.innerHTML = `
        <strong>Выберите точку старта на карте</strong><br>
        <small>Кликните в любое место на карте</small>
        <button class="btn btn-sm btn-outline-secondary ms-3" onclick="disableMapSelection()">Отмена</button>
    `;
    document.querySelector('.content-wrapper').appendChild(hint);

    // добавляем обработчик клика по карте (один раз)
    map.once('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;

        // строим маршрут от выбранной точки
        buildRouteFromCoords(lat, lng, 'Выбранная точка');

        // выключаем режим выбора
        disableMapSelection();
    });
}

function disableMapSelection() {
    selectStartPointMode = false;
    map.getContainer().style.cursor = '';

    // удаляем подсказку
    const hint = document.getElementById('route-hint');
    if (hint) hint.remove();
}

function buildRouteFromCoords(startLat, startLng, startName) {
    // удаляем старый маршрут если есть
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    console.log('Создание маршрута от', startName, 'до', currentService.name);

    // создаем маршрут с кастомными маркерами A и B
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(startLat, startLng),
            L.latLng(parseFloat(currentService.latitude), parseFloat(currentService.longitude))
        ],
        routeWhileDragging: true,
        addWaypoints: false,
        draggableWaypoints: true,
        fitSelectedRoutes: false,
        show: false,
        language: 'ru',
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'car'
        }),
        lineOptions: {
            styles: [{color: '#3498db', opacity: 0.8, weight: 6}]
        },
        // кастомные маркеры A и B
        createMarker: function(waypointIndex, waypoint, n) {
            const isStart = waypointIndex === 0;
            const markerHtml = isStart ? 'A' : 'B';
            const markerClass = isStart ? 'route-marker-start' : 'route-marker-end';

            const icon = L.divIcon({
                className: 'route-marker ' + markerClass,
                iconSize: [30, 30],
                html: markerHtml
            });

            return L.marker(waypoint.latLng, {
                icon: icon,
                draggable: true
            });
        }
    })
    .on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;

        const time = Math.round(summary.totalTime / 60);
        const distance = (summary.totalDistance / 1000).toFixed(1);

        // показываем инфо в плавающей панели на карте
        document.getElementById('route-distance').textContent = distance;
        document.getElementById('route-time').textContent = time;
        document.getElementById('route-info-panel').classList.remove('hidden');
    })
    .on('routingerror', function(e) {
        console.error('Ошибка маршрутизации:', e);
        alert('Не удалось построить маршрут. Попробуйте выбрать другую точку.');
    })
    .addTo(map);
}

function clearRoute() {
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    // скрываем плавающую панель маршрута
    document.getElementById('route-info-panel').classList.add('hidden');
}

function openInYandexMaps() {
    if (!currentService) return;

    // получаем координаты начала маршрута
    let startLat, startLng;

    if (routingControl && routingControl.getWaypoints) {
        const waypoints = routingControl.getWaypoints();
        if (waypoints && waypoints.length > 0 && waypoints[0].latLng) {
            startLat = waypoints[0].latLng.lat;
            startLng = waypoints[0].latLng.lng;
        }
    }

    const endLat = parseFloat(currentService.latitude);
    const endLng = parseFloat(currentService.longitude);

    // формируем url для яндекс карт
    let routeUrl;
    if (startLat && startLng) {
        routeUrl = `https://yandex.ru/maps/?rtext=${startLat},${startLng}~${endLat},${endLng}&rtt=auto`;
    } else {
        routeUrl = `https://yandex.ru/maps/?pt=${endLng},${endLat}&z=16&l=map`;
    }

    // открываем в новой вкладке
    window.open(routeUrl, '_blank');
}

function useGeolocation() {
    closeRouteModal();

    if (!navigator.geolocation) {
        alert('Ваш браузер не поддерживает геолокацию.');
        return;
    }

    const modalBody = document.querySelector('#route-modal .modal-body');
    const originalContent = modalBody.innerHTML;
    modalBody.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-success" role="status"></div><p class="mt-2">Определение местоположения...</p></div>';

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            buildRouteFromCoords(userLat, userLng, 'Моё местоположение');

            // восстанавливаем содержимое модального окна
            modalBody.innerHTML = originalContent;
        },
        function(error) {
            // восстанавливаем содержимое модального окна
            modalBody.innerHTML = originalContent;

            let msg = 'Не удалось определить местоположение. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    msg += 'Разрешите доступ к геолокации или выберите точку на карте.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    msg += 'Информация недоступна. Выберите точку на карте.';
                    break;
                case error.TIMEOUT:
                    msg += 'Время ожидания истекло. Выберите точку на карте.';
                    break;
            }
            alert(msg);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}