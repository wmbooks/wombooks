document.addEventListener('DOMContentLoaded', () => {
    // Подключаем Telegram
    const tg = window.Telegram.WebApp;
    tg.expand();

    // Системная ссылка на твою базу данных (я переделал её для кода)
    const csvUrl = 'https://docs.google.com/spreadsheets/d/114rRidA5kuYGYFrH8266t1mQtvTeWoTPeoIlishnhrg/pub?output=csv';

    let allBooks = [];
    // Загружаем список сохраненных книг из памяти телефона
    let savedBookIds = JSON.parse(localStorage.getItem('wombooks_saved')) || [];

    const booksGrid = document.querySelector('.books-grid');
    const navBtns = document.querySelectorAll('.bottom-pill-btn');

    // Функция загрузки книг из Google Таблицы
    async function fetchBooks() {
        try {
            const response = await fetch(csvUrl);
            const data = await response.text();
            parseCSV(data);
            renderBooks(allBooks);
        } catch (error) {
            booksGrid.innerHTML = '<p style="text-align:center; margin-top: 20px; font-size: 12px;">Ошибка загрузки книг. Проверьте интернет.</p>';
        }
    }

    // Системный парсер для чтения таблицы
    function parseCSV(str) {
        const arr = [];
        let quote = false;
        for (let row = 0, col = 0, c = 0; c < str.length; c++) {
            let cc = str[c], nc = str[c+1];
            arr[row] = arr[row] || [];
            arr[row][col] = arr[row][col] || '';
            
            if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
            if (cc == '"') { quote = !quote; continue; }
            if (cc == ',' && !quote) { ++col; continue; }
            if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
            if (cc == '\n' && !quote) { ++row; col = 0; continue; }
            if (cc == '\r' && !quote) { ++row; col = 0; continue; }
            
            arr[row][col] += cc;
        }
        
        allBooks = [];
        // Пропускаем первую строку с заголовками
        for (let i = 1; i < arr.length; i++) {
            if (arr[i].length >= 2 && arr[i][0]) {
                allBooks.push({
                    id: arr[i][0].trim(),
                    title: arr[i][1] ? arr[i][1].trim() : 'Без названия',
                    author: arr[i][2] ? arr[i][2].trim() : '',
                    series: arr[i][3] ? arr[i][3].trim() : '',
                    tropes: arr[i][4] ? arr[i][4].trim() : '',
                    annotation: arr[i][5] ? arr[i][5].trim() : ''
                });
            }
        }
    }

    // Функция отрисовки карточек
    function renderBooks(books) {
        booksGrid.innerHTML = ''; // Очищаем экран перед отрисовкой
        
        books.forEach(book => {
            const isSaved = savedBookIds.includes(book.id);
            const heartIcon = isSaved ? '♥' : '♡'; // Закрашиваем, если книга сохранена

            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <img src="covers/${book.id}.jpg" alt="${book.title}" class="book-cover" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23F8EBF0\\'/></svg>'">
                <div class="card-info">
                    <h4 class="book-title">${book.title}</h4>
                    <p class="book-author">${book.author}</p>
                    <div class="card-actions">
                        <button class="action-btn arrow-btn" onclick="openBook('${book.id}')">➔</button>
                        <button class="action-btn fav-btn" onclick="toggleSave(this, '${book.id}')">${heartIcon}</button>
                    </div>
                </div>
            `;
            booksGrid.appendChild(card);
        });
    }

    // Временная заглушка для стрелочки (позже сделаем переход на страницу книги)
    window.openBook = function(id) {
        tg.showAlert('Скоро здесь будет открываться информация о книге!');
    };

    // Логика кнопки "В избранное" (Сердечко)
    window.toggleSave = function(btnElement, id) {
        const index = savedBookIds.indexOf(id);
        if (index > -1) {
            savedBookIds.splice(index, 1); // Удаляем
            btnElement.innerText = '♡';
        } else {
            savedBookIds.push(id); // Добавляем
            btnElement.innerText = '♥';
        }
        localStorage.setItem('wombooks_saved', JSON.stringify(savedBookIds));
    };

    // Логика нижних плашек (переключение экранов)
    navBtns[0].addEventListener('click', () => {
        navBtns[0].classList.add('active-pill');
        navBtns[1].classList.remove('active-pill');
        renderBooks(allBooks); // Показываем все
    });

    navBtns[1].addEventListener('click', () => {
        navBtns[1].classList.add('active-pill');
        navBtns[0].classList.remove('active-pill');
        const savedBooks = allBooks.filter(book => savedBookIds.includes(book.id));
        renderBooks(savedBooks); // Показываем только сохраненные
    });

    // Запускаем магию!
    fetchBooks();
});
