// Ждем, пока весь сайт загрузится
document.addEventListener('DOMContentLoaded', () => {
    
    // Подключаем Telegram Web App API
    const tg = window.Telegram.WebApp;
    tg.expand(); // Растягиваем приложение на весь экран телефона

    // Находим все наши "страницы" и кнопки меню
    const pages = {
        home: document.getElementById('page-home'),
        catalog: document.getElementById('page-catalog'),
        favorites: document.getElementById('page-favorites')
    };

    const navButtons = {
        home: document.getElementById('nav-home'),
        catalog: document.getElementById('nav-catalog'),
        favorites: document.getElementById('nav-favorites')
    };

    // Функция для переключения страниц
    function showPage(pageId) {
        // 1. Скрываем все страницы
        for (let key in pages) {
            pages[key].classList.remove('active');
            pages[key].style.display = 'none';
        }
        
        // 2. Показываем нужную страницу
        pages[pageId].classList.add('active');
        pages[pageId].style.display = 'block';

        // 3. (Опционально) Меняем цвет активной кнопки в меню
        for (let key in navButtons) {
            navButtons[key].style.color = (key === pageId) ? 'var(--main-pink)' : 'var(--text-dark)';
        }
    }

    // Вешаем слушатели кликов на кнопки нижнего меню
    navButtons.home.addEventListener('click', () => showPage('home'));
    navButtons.catalog.addEventListener('click', () => showPage('catalog'));
    navButtons.favorites.addEventListener('click', () => showPage('favorites'));

    // По умолчанию показываем Главную страницу при входе
    showPage('home');
});
