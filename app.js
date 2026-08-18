document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand();

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQofE7L59iFriQgwIJ-P0MclqfZ2QhBHR-zbk6FgaaZ7VSJ_dmtv823zjZkXBRWDodnCJ11B_Pa1oPc/pub?output=csv';

    let allBooks = [];
    let savedBookIds = JSON.parse(localStorage.getItem('wombooks_saved')) || [];
    let currentOpenBookId = null;

    const booksGrid = document.querySelector('.books-grid');
    const navBtns = document.querySelectorAll('.bottom-pill-btn');
    
    const pageHome = document.getElementById('page-home');
    const pageDetails = document.getElementById('page-book-details');
    const bottomNav = document.getElementById('bottom-nav');

    async function fetchBooks() {
        try {
            const response = await fetch(csvUrl);
            const data = await response.text();
            parseCSV(data);
            renderBooks(allBooks);
        } catch (error) {
            booksGrid.innerHTML = '<p style="text-align:center; font-size: 12px;">Ошибка загрузки книг. Проверьте интернет.</p>';
        }
    }

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
        for (let i = 1; i < arr.length; i++) {
            if (arr[i].length >= 2 && arr[i][0]) {
                allBooks.push({
                    id: arr[i][0].trim(),
                    title: arr[i][1] ? arr[i][1].trim() : 'Без названия',
                    author: arr[i][2] ? arr[i][2].trim() : '',
                    series: arr[i][3] ? arr[i][3].trim() : '',
                    tropes: arr[i][4] ? arr[i][4].trim() : '',
                    annotation: arr[i][5] ? arr[i][5].trim() : '',
                    seriesNumber: arr[i][6] ? arr[i][6].trim() : '' // Новая 7-я колонка
                });
            }
        }
    }

    function renderBooks(books) {
        booksGrid.innerHTML = ''; 
        if (books.length === 0) {
            booksGrid.innerHTML = '<p style="text-align:center; width: 300%; margin-top: 20px; font-size: 12px; color: #A0A0A0;">Здесь пока пусто.</p>';
            return;
        }

        books.forEach(book => {
            const isSaved = savedBookIds.includes(book.id);
            const heartIcon = isSaved ? '♥' : '♡';

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

    window.toggleSave = function(btnElement, id) {
        const index = savedBookIds.indexOf(id);
        if (index > -1) {
            savedBookIds.splice(index, 1);
            btnElement.innerText = '♡';
        } else {
            savedBookIds.push(id);
            btnElement.innerText = '♥';
        }
        localStorage.setItem('wombooks_saved', JSON.stringify(savedBookIds));
    };

    window.openBook = function(id) {
        const book = allBooks.find(b => b.id === id);
        if (!book) return;

        currentOpenBookId = id;

        document.getElementById('details-cover').src = `covers/${book.id}.jpg`;
        document.getElementById('details-title').innerText = book.title;
        document.getElementById('details-author').innerText = book.author;
        
        // Очищаем и заново создаем плашки для Серии и Номера в серии
        const seriesContainer = document.getElementById('details-series-container');
        seriesContainer.innerHTML = '';
        if (book.series) {
            seriesContainer.innerHTML += `<span class="details-series">${book.series}</span>`;
        }
        if (book.seriesNumber) {
            seriesContainer.innerHTML += `<span class="details-series">${book.seriesNumber}</span>`;
        }

        const tropesContainer = document.getElementById('details-tropes');
        tropesContainer.innerHTML = '';
        if (book.tropes) {
            const tropesArray = book.tropes.split(',');
            tropesArray.forEach(trope => {
                if (trope.trim()) {
                    const span = document.createElement('span');
                    span.className = 'trope-tag';
                    span.innerText = trope.trim();
                    tropesContainer.appendChild(span);
                }
            });
        }

        document.getElementById('details-annotation').innerText = book.annotation;
        document.getElementById('details-download').href = `books/${book.id}.epub`;

        const isSaved = savedBookIds.includes(book.id);
        document.getElementById('details-fav-btn').innerText = isSaved ? '♥' : '♡';

        pageHome.style.display = 'none';
        bottomNav.style.display = 'none';
        pageDetails.style.display = 'block';
        window.scrollTo(0, 0); 
    };

    window.closeBook = function() {
        pageDetails.style.display = 'none';
        pageHome.style.display = 'block';
        bottomNav.style.display = 'flex';
        
        const isSavedTab = navBtns[1].classList.contains('active-pill');
        if (isSavedTab) {
            renderBooks(allBooks.filter(b => savedBookIds.includes(b.id)));
        } else {
            renderBooks(allBooks);
        }
    };

    window.toggleSaveFromDetails = function() {
        if (!currentOpenBookId) return;
        const btn = document.getElementById('details-fav-btn');
        toggleSave(btn, currentOpenBookId);
    };

    navBtns[0].addEventListener('click', () => {
        navBtns[0].classList.add('active-pill');
        navBtns[1].classList.remove('active-pill');
        renderBooks(allBooks);
    });

    navBtns[1].addEventListener('click', () => {
        navBtns[1].classList.add('active-pill');
        navBtns[0].classList.remove('active-pill');
        const savedBooks = allBooks.filter(book => savedBookIds.includes(book.id));
        renderBooks(savedBooks);
    });

    fetchBooks();
});
