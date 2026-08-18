document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand();

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQofE7L59iFriQgwIJ-P0MclqfZ2QhBHR-zbk6FgaaZ7VSJ_dmtv823zjZkXBRWDodnCJ11B_Pa1oPc/pub?output=csv';

    let allBooks = [];
    let savedBookIds = JSON.parse(localStorage.getItem('wombooks_saved')) || [];
    let currentOpenBookId = null;
    let currentRating = 0; // Переменная для хранения выбранных звезд

    const booksGrid = document.getElementById('books-grid');
    const authorsContainer = document.getElementById('authors-container');
    const pageHome = document.getElementById('page-home');
    const pageDetails = document.getElementById('page-book-details');
    const bottomNav = document.getElementById('bottom-nav');

    const filterRecent = document.getElementById('filter-recent');
    const filterTropes = document.getElementById('filter-tropes');
    const filterAuthors = document.getElementById('filter-authors');
    const navHome = document.getElementById('nav-home');
    const navSaved = document.getElementById('nav-saved');

    function getRecentBooks() { return allBooks.slice(-3).reverse(); }

    async function fetchBooks() {
        try {
            const response = await fetch(csvUrl);
            const data = await response.text();
            parseCSV(data);
            renderBooks(getRecentBooks(), true);
        } catch (error) {
            booksGrid.innerHTML = '<p style="text-align:center; font-size: 12px; margin-top:20px;">Ошибка загрузки книг. Проверьте интернет.</p>';
        }
    }

    function parseCSV(str) {
        const arr = []; let quote = false;
        for (let row = 0, col = 0, c = 0; c < str.length; c++) {
            let cc = str[c], nc = str[c+1];
            arr[row] = arr[row] || []; arr[row][col] = arr[row][col] || '';
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
                    id: arr[i][0].trim(), title: arr[i][1] ? arr[i][1].trim() : 'Без названия',
                    author: arr[i][2] ? arr[i][2].trim() : '', series: arr[i][3] ? arr[i][3].trim() : '',
                    tropes: arr[i][4] ? arr[i][4].trim() : '', annotation: arr[i][5] ? arr[i][5].trim() : '',
                    seriesNumber: arr[i][6] ? arr[i][6].trim() : '' 
                });
            }
        }
    }

    function createBookCardHTML(book) {
        const isSaved = savedBookIds.includes(book.id);
        const heartIcon = isSaved ? '♥' : '♡';
        return `
            <img src="covers/${book.id}.PNG" alt="${book.title}" class="book-cover" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23F8EBF0\\'/></svg>'">
            <div class="card-info">
                <h4 class="book-title">${book.title}</h4>
                <p class="book-author">${book.author || 'Неизвестный автор'}</p>
                <div class="card-actions">
                    <button class="action-btn arrow-btn" onclick="openBook('${book.id}')">➔</button>
                    <button class="action-btn fav-btn" onclick="toggleSave(this, '${book.id}')">${heartIcon}</button>
                </div>
            </div>
        `;
    }

    function renderBooks(books, highlightFirst = false) {
        booksGrid.innerHTML = ''; 
        if (books.length === 0) { booksGrid.innerHTML = '<p style="text-align:center; width: 300%; margin-top: 20px; font-size: 12px; color: #A0A0A0;">Здесь пока пусто.</p>'; return; }
        books.forEach((book, index) => {
            const card = document.createElement('div');
            if (highlightFirst && index === 0) { card.className = 'book-card highlight-newest'; } else { card.className = 'book-card'; }
            card.innerHTML = createBookCardHTML(book); booksGrid.appendChild(card);
        });
    }

    function renderAuthorsList() {
        authorsContainer.innerHTML = ''; const authorsMap = {};
        allBooks.forEach(book => {
            const author = book.author || 'Неизвестный автор';
            if (!authorsMap[author]) authorsMap[author] = {};
            const series = book.series ? book.series : 'Одиночные книги';
            if (!authorsMap[author][series]) authorsMap[author][series] = [];
            authorsMap[author][series].push(book);
        });
        const sortedAuthors = Object.keys(authorsMap).sort();
        if (sortedAuthors.length === 0) { authorsContainer.innerHTML = '<p style="text-align:center; margin-top: 20px; font-size: 12px; color: #A0A0A0;">Авторов пока нет.</p>'; return; }

        sortedAuthors.forEach(author => {
            const authorItem = document.createElement('div'); authorItem.className = 'author-item';
            const authorHeader = document.createElement('div'); authorHeader.className = 'author-header';
            authorHeader.onclick = function() { toggleAuthor(this); };
            authorHeader.innerHTML = `<span>${author}</span><span class="round-arrow author-arrow">➔</span>`;
            const seriesList = document.createElement('div'); seriesList.className = 'author-series-list';
            
            const sortedSeries = Object.keys(authorsMap[author]).sort();
            sortedSeries.forEach(series => {
                const seriesItem = document.createElement('div'); seriesItem.className = 'series-item';
                const seriesHeader = document.createElement('div'); seriesHeader.className = 'series-header';
                seriesHeader.onclick = function() { toggleSeries(this); };
                seriesHeader.innerHTML = `<span>${series}</span><span class="round-arrow series-arrow">➔</span>`;
                const seriesGrid = document.createElement('div'); seriesGrid.className = 'series-books-grid';
                authorsMap[author][series].forEach(book => {
                    const card = document.createElement('div'); card.className = 'book-card';
                    card.innerHTML = createBookCardHTML(book); seriesGrid.appendChild(card);
                });
                seriesItem.appendChild(seriesHeader); seriesItem.appendChild(seriesGrid); seriesList.appendChild(seriesItem);
            });
            authorItem.appendChild(authorHeader); authorItem.appendChild(seriesList); authorsContainer.appendChild(authorItem);
        });
    }

    window.toggleAuthor = function(headerElement) { const authorItem = headerElement.parentElement; authorItem.classList.toggle('open'); };
    window.toggleSeries = function(headerElement) { const seriesItem = headerElement.parentElement; seriesItem.classList.toggle('open'); };

    function setActiveFilter(activeBtn) { [filterRecent, filterTropes, filterAuthors].forEach(btn => btn.classList.remove('active-filter')); activeBtn.classList.add('active-filter'); }

    if (filterRecent) { filterRecent.addEventListener('click', () => { setActiveFilter(filterRecent); authorsContainer.style.display = 'none'; booksGrid.style.display = 'grid'; renderBooks(getRecentBooks(), true); }); }
    if (filterAuthors) { filterAuthors.addEventListener('click', () => { setActiveFilter(filterAuthors); booksGrid.style.display = 'none'; authorsContainer.style.display = 'block'; renderAuthorsList(); }); }
    if (filterTropes) { filterTropes.addEventListener('click', () => { tg.showAlert('Фильтр по тропам настроим следующим шагом!'); }); }

    window.toggleSave = function(btnElement, id) {
        const index = savedBookIds.indexOf(id);
        if (index > -1) { savedBookIds.splice(index, 1); btnElement.innerText = '♡'; } 
        else { savedBookIds.push(id); btnElement.innerText = '♥'; }
        localStorage.setItem('wombooks_saved', JSON.stringify(savedBookIds));
    };

    window.openBook = function(id) {
        const book = allBooks.find(b => b.id === id); if (!book) return; currentOpenBookId = id;
        
        document.getElementById('details-cover').src = `covers/${book.id}.PNG`;
        document.getElementById('details-title').innerText = book.title;
        document.getElementById('details-author').innerText = book.author;
        
        // Пока мы не подключили базу, ставим временную оценку 0.0
        document.getElementById('details-rating').innerText = '★ 0.0';

        const seriesContainer = document.getElementById('details-series-container'); seriesContainer.innerHTML = '';
        if (book.series) { seriesContainer.innerHTML += `<span class="details-series">${book.series}</span>`; }
        if (book.seriesNumber) { seriesContainer.innerHTML += `<span class="details-series">${book.seriesNumber}</span>`; }

        const tropesContainer = document.getElementById('details-tropes'); tropesContainer.innerHTML = '';
        if (book.tropes) { book.tropes.split(',').forEach(trope => { if (trope.trim()) { const span = document.createElement('span'); span.className = 'trope-tag'; span.innerText = trope.trim(); tropesContainer.appendChild(span); } }); }
        document.getElementById('details-annotation').innerText = book.annotation;
        document.getElementById('details-download').href = `books/${book.id}.epub`;

        const isSaved = savedBookIds.includes(book.id); document.getElementById('details-fav-btn').innerText = isSaved ? '♥' : '♡';
        pageHome.style.display = 'none'; bottomNav.style.display = 'none'; pageDetails.style.display = 'block'; window.scrollTo(0, 0); 
    };

    window.closeBook = function() {
        pageDetails.style.display = 'none'; pageHome.style.display = 'block'; bottomNav.style.display = 'flex';
        if (navSaved && navSaved.classList.contains('active-pill')) { renderBooks(allBooks.filter(b => savedBookIds.includes(b.id))); } 
        else if (filterAuthors && filterAuthors.classList.contains('active-filter')) {} 
        else if (filterRecent && filterRecent.classList.contains('active-filter')) { renderBooks(getRecentBooks(), true); } 
        else { renderBooks(allBooks); }
    };

    window.toggleSaveFromDetails = function() { if (!currentOpenBookId) return; const btn = document.getElementById('details-fav-btn'); toggleSave(btn, currentOpenBookId); };

    // --- ЛОГИКА ОЦЕНОК И ОТЗЫВОВ ---
    window.openReviewModal = function() {
        document.getElementById('review-modal').style.display = 'flex';
        currentRating = 0;
        document.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));
        document.getElementById('review-text').value = '';
    };

    window.closeReviewModal = function() {
        document.getElementById('review-modal').style.display = 'none';
    };

    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', function() {
            currentRating = parseInt(this.getAttribute('data-val'));
            document.querySelectorAll('.star').forEach(s => {
                if (parseInt(s.getAttribute('data-val')) <= currentRating) { s.classList.add('selected'); } 
                else { s.classList.remove('selected'); }
            });
        });
    });

    window.submitReview = function() {
        if (currentRating === 0) { tg.showAlert('Пожалуйста, поставьте хотя бы одну звездочку!'); return; }
        
        // Показываем уведомление (в следующем шаге заменим на реальную отправку)
        tg.showAlert('Супер! Звезды и отзыв готовы к отправке. В следующем шаге мы подключим Google Таблицу для сохранения!');
        closeReviewModal();
    };

    if (navHome) { navHome.addEventListener('click', () => { navHome.classList.add('active-pill'); if (navSaved) navSaved.classList.remove('active-pill'); if (filterRecent) setActiveFilter(filterRecent); authorsContainer.style.display = 'none'; booksGrid.style.display = 'grid'; renderBooks(getRecentBooks(), true); }); }
    if (navSaved) { navSaved.addEventListener('click', () => { navSaved.classList.add('active-pill'); if (navHome) navHome.classList.remove('active-pill'); authorsContainer.style.display = 'none'; booksGrid.style.display = 'grid'; renderBooks(allBooks.filter(book => savedBookIds.includes(book.id))); }); }

    fetchBooks();
});
