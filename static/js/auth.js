// проверка при загрузке страницы — вдруг уже залогинен
(async function checkAuthOnLoad() {
    try {
        const response = await fetch('/api/auth/check/', {
            credentials: 'same-origin'
        });
        const data = await response.json();

        if (data.authenticated && data.user.is_staff) {
            localStorage.setItem('isAdmin', 'true');
            showAdminMode();
        } else {
            localStorage.removeItem('isAdmin');
            showGuestMode();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        showGuestMode();
    }
})();

// открыть модалку входа
function openLoginModal() {
    document.getElementById('login-modal').classList.remove('hidden');
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('login-input').value = '';
    document.getElementById('password-input').value = '';
    setTimeout(() => document.getElementById('login-input').focus(), 100);
}

// закрыть модалку входа
function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
}

async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('login-input').value.trim();
    const password = document.getElementById('password-input').value;
    const errorBox = document.getElementById('login-error');

    try {
        // получаем csrf токен
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                         getCookie('csrftoken');

        const response = await fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({ username, password }),
            credentials: 'same-origin'
        });

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.log('CSRF токен устарел, перезагружаем страницу');
            window.location.reload();
            return;
        }

        const data = await response.json();

        if (data.success && data.user.is_staff) {
            localStorage.setItem('isAdmin', 'true');
            closeLoginModal();
            showAdminMode();
        } else if (data.success && !data.user.is_staff) {
            errorBox.textContent = '❌ У вас нет прав администратора';
            errorBox.classList.remove('hidden');
        } else {
            errorBox.textContent = '❌ ' + (data.error || 'Неверный логин или пароль');
            errorBox.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        errorBox.textContent = '❌ Ошибка соединения с сервером';
        errorBox.classList.remove('hidden');
    }
}

// функция для получения csrf токена из cookie
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

// переключение в режим админа
function showAdminMode() {
    document.getElementById('login-btn').classList.add('hidden');
    document.getElementById('admin-menu').classList.remove('hidden');
}

// переключение в режим гостя
function showGuestMode() {
    document.getElementById('login-btn').classList.remove('hidden');
    document.getElementById('admin-menu').classList.add('hidden');
}

async function logout() {
    try {
        const csrfToken = getCookie('csrftoken');

        const response = await fetch('/api/auth/logout/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken
            },
            credentials: 'same-origin'
        });

        if (response.ok) {
            localStorage.removeItem('isAdmin');
            window.location.reload();
        } else {
            console.error('Ошибка выхода:', response.status);
        }
    } catch (error) {
        console.error('Ошибка выхода:', error);
        // всё равно выходим на фронтенде
        localStorage.removeItem('isAdmin');
        window.location.reload();
    }
}