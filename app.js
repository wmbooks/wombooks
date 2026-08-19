document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand();

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQofE7L59iFriQgwIJ-P0MclqfZ2QhBHR-zbk6FgaaZ7VSJ_dmtv823zjZkXBRWDodnCJ11B_Pa1oPc/pub?output=csv';
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbxF_KGJfmq8npELJDMecB1QxRl0zew1W6K8S18vRQ9CP4lf_DWc_RIdstdCqk_v1auX/exec';

    let allBooks = [];
    let allRatings = []; 
    let savedBookIds = JSON.parse(localStorage.getItem('wombooks_saved')) || [];
    let currentOpenBookId = null;
    let currentRating = 0; 
    let activeTropeName = null; 

    const tropesMapping = {
        "От ненависти до любви": ["от ненависти до любви", "от неприязни до любви", "враги любовники"],
        "Спортивные романы": ["хоккей", "спорт", "спортивный роман", "спортсмены", "баскетбол", "бейсбол"],
        "Миллиардеры": ["он – миллиардер", "миллиардеры", "богатый парень"],
        "Мафия": ["мафия", "криминал", "бандиты", "босс мафии"],
        "Фиктивные отношения": ["вынужденный брак", "фиктивный брак", "фейковые отношения"]
    };

    const booksGrid = document.getElementById('books-grid');
    const authorsContainer = document.getElementById('authors-container');
    const standalonesContainer = document.getElementById('standalones-container'); 
    const tropesContainer = document.getElementById('tropes-container');
    const tropesMenu = document.getElementById('tropes-menu');
    const tropesBooksGrid = document.getElementById('tropes-books-grid');
    const filtersContainer = document.querySelector('.category-filters-container'); 
    
    // БЛОК ДИСКЛЕЙМЕРА
    const disclaimerBox = document.getElementById('disclaimer-box');

    const pageHome = document.getElementById('page-home');
    const pageDetails = document.getElementById('page-book-details');
    const bottomNav = document.getElementById('bottom-nav');

    const filterRecent = document.getElementById('filter-recent');
    const filterTropes = document.getElementById('filter-tropes');
    const filterAuthors = document.getElementById('filter-authors');
    const filterStandalones = document.getElementById('filter-standalones');
    const navHome = document.getElementById('nav-home');
    const navSaved = document.getElementById('nav-saved');

    function getRecentBooks() { return allBooks.slice(-3).reverse(); }

    function getRatingText(rating) {
        if (!rating || rating === 0 || rating === "0") {
            return `<span style="color: #A0A0A0; font-weight: 500;">0.00</span>`;
        }
        return `<span style="color: var(--shadow-pink); font-weight: 600;">${parseFloat(rating).toFixed(2)}</span>`;
    }

    function formatSeriesNumber(numStr) {
        if (!numStr) return '';
        const trimmed = numStr.trim();
        if (/^[\d.,]+$/.test(trimmed)) {
            return `#${trimmed}`;
        }
        return trimmed;
    }

    async function fetchBooksAndRatings() {
        if(booksGrid) { booksGrid.innerHTML = '<div class="loader-container"><div class="loader"></div></div>'; }
        try {
            const response = await fetch(csvUrl);
            const data = await response.text();
            parseCSV(data);
            renderCurrentView();
            loadRatingsAsync();
        } catch (error) {
            if(booksGrid) booksGrid.innerHTML = '<p style="text-align:center; font-size: 13px; margin-top:30px; color: var(--shadow-pink);">Ошибка загрузки. Проверьте интернет.</p>';
        }
    }

    async function loadRatingsAsync() {
        try {
            const ratingsResponse = await fetch(scriptUrl);
            allRatings = await ratingsResponse.json();
            calculateRatings();
            renderCurrentView();
            
            if (currentOpenBookId && pageDetails && pageDetails.style.display === 'block') {
                const book = allBooks.find(b => b.id === currentOpenBookId);
                const ratingBox = document.getElementById('details-rating-box');
                if (book && ratingBox) { ratingBox.innerHTML = getRatingText(book.rating); }
            }
        } catch (e) { console.error("Оценки не загрузились", e); }
    }

    function renderCurrentView() {
        if (authorsContainer && authorsContainer.style.display === 'block') {
            renderAuthorsList();
        } else if (standalonesContainer && standalonesContainer.style.display === 'block') {
            renderStandalonesList();
        } else if (tropesContainer && tropesContainer.style.display === 'block') {
            renderTropesMenu();
        } else if (navSaved && navSaved.classList.contains('active-pill')) {
            renderBooksToGrid(allBooks.filter(book => savedBookIds.includes(book.id)), booksGrid);
        } else if (filterRecent && filterRecent.classList.contains('active-filter')) {
            renderBooksToGrid(getRecentBooks(), booksGrid, true);
        } else {
            renderBooksToGrid(allBooks, booksGrid);
        }
    }

    function calculateRatings() {
        const ratingsByBook = {};
        allRatings.forEach(r => {
            if (!ratingsByBook[r.bookId]) ratingsByBook[r.bookId] = [];
            ratingsByBook[r.bookId].push(r.rating);
        });

        allBooks.forEach(book => {
            if (ratingsByBook[book.id]) {
                const sum = ratingsByBook[book.id].reduce((a, b) => a + b, 0);
                book.rating = sum / ratingsByBook[book.id].length;
            } else {
                book.rating = 0;
            }
        });
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
                    seriesNumber: arr[i][6] ? arr[i][6].trim() : '', pages: arr[i][7] ? arr[i][7].trim() : '', rating: 0 
                });
            }
        }
    }

    function createBookCardHTML(book) {
        const isSaved = savedBookIds.includes(book.id);
        const heartIcon = isSaved ? '♥' : '♡';
        let seriesBadgeHtml = '';
        if (book.seriesNumber) { seriesBadgeHtml = `<div class="cover-series-badge">${formatSeriesNumber(book.seriesNumber)}</div>`; }

        return `
            <div class="grid-cover-wrapper">
                <img src="covers/${book.id}.PNG" alt="${book.title}" class="book-cover" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23F8EBF0\\'/></svg>'">
                ${seriesBadgeHtml}
            </div>
            <div class="card-info">
                <h4 class="book-title">${book.title}</h4>
                <p class="book-author">${book.author || 'Неизвестный автор'}</p>
                <div class="card-actions">
                    <button class="action-btn arrow-btn" onclick="openBook('${book.id}')">➔</button>
                    <div class="card-rating-text">${getRatingText(book.rating)}</div>
                    <button class="action-btn fav-btn" onclick="toggleSave(this, '${book.id}')">${heartIcon}</button>
                </div>
            </div>
        `;
    }

    function renderBooksToGrid(books, gridElement, highlightFirst = false) {
        if(!gridElement) return;
        gridElement.innerHTML = ''; 
        if (books.length === 0) { gridElement.innerHTML = '<p style="text-align:center; width: 300%; margin-top: 20px; font-size: 12px; color: #A0A0A0;">Здесь пока пусто.</p>'; return; }
        books.forEach((book, index) => {
            const card = document.createElement('div');
            if (highlightFirst && index === 0) { card.className = 'book-card highlight-newest'; } else { card.className = 'book-card'; }
            card.innerHTML = createBookCardHTML(book); gridElement.appendChild(card);
        });
    }

    function renderTropesMenu() {
        if(!tropesMenu) return;
        
        if(tropesMenu.innerHTML === '') {
            Object.keys(tropesMapping).forEach(tropeName => {
                const btn = document.createElement('button');
                btn.className = 'trope-menu-btn';
                btn.innerText = tropeName;
                btn.onclick = () => {
                    document.querySelectorAll('.trope-menu-btn').forEach(b => b.classList.remove('active-trope-btn'));
                    btn.classList.add('active-trope-btn');
                    activeTropeName = tropeName;
                    filterBooksByTrope(tropeName);
                };
                tropesMenu.appendChild(btn);
            });
        }

        if (activeTropeName) {
            filterBooksByTrope(activeTropeName);
        } else {
            tropesBooksGrid.style.display = 'none';
        }
    }

    function filterBooksByTrope(tropeName) {
        const synonyms = tropesMapping[tropeName];
        const filteredBooks = allBooks.filter(book => {
            if (!book.tropes) return false;
            const bookTropes = book.tropes.split(',').map(t => t.trim().toLowerCase());
            return bookTropes.some(t => synonyms.includes(t));
        });

        renderBooksToGrid(filteredBooks, tropesBooksGrid);
        tropesBooksGrid.style.display = 'grid';
    }

    function renderAuthorsList() {
        if(!authorsContainer) return;
        authorsContainer.innerHTML = ''; 
        
        const authorsMap = {};
        const authorMaxIndex = {};
        
        allBooks.forEach((book, index) => {
            const author = book.author || 'Неизвестный автор';
            if (!authorsMap[author]) authorsMap[author] = {};
            const series = book.series ? book.series : 'Одиночные книги';
            if (!authorsMap[author][series]) authorsMap[author][series] = [];
            authorsMap[author][series].push(book);
            
            authorMaxIndex[author] = index;
        });
        
        const allAuthors = Object.keys(authorsMap);
        if (allAuthors.length === 0) { 
            authorsContainer.innerHTML = '<p style="text-align:center; margin-top: 20px; font-size: 12px; color: #A0A0A0;">Авторов пока нет.</p>'; 
            return; 
        }

        const topAuthorsOrder = ["Эмили Рат", "Лили Голд", "К.Р. Джейн", "Оливия Хейл", "Э. Сальвадор"];
        const fixedAuthors = [];
        topAuthorsOrder.forEach(author => {
            if (authorsMap[author]) fixedAuthors.push(author);
        });

        const otherAuthors = allAuthors.filter(a => !topAuthorsOrder.includes(a));
        otherAuthors.sort((a, b) => authorMaxIndex[b] - authorMaxIndex[a]);

        const renderAuthorItem = (author) => {
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
        };

        fixedAuthors.forEach(renderAuthorItem);
        if (fixedAuthors.length > 0 && otherAuthors.length > 0) {
            const divider = document.createElement('div');
            divider.className = 'authors-divider';
            authorsContainer.appendChild(divider);
        }
        otherAuthors.forEach(renderAuthorItem);
    }

    function renderStandalonesList() {
        if(!standalonesContainer) return;
        standalonesContainer.innerHTML = '';
        
        const standalones = allBooks.filter(b => {
            if (!b.series) return false;
            const s = b.series.trim().toLowerCase();
            return s === 'одиночная' || s === 'одиночные';
        });
        
        const authorsMap = {};
        const authorMaxIndex = {};
        
        standalones.forEach((book) => {
            const originalIndex = allBooks.indexOf(book);
            const author = book.author || 'Неизвестный автор';
            if (!authorsMap[author]) authorsMap[author] = [];
            authorsMap[author].push(book);
            
            if (authorMaxIndex[author] === undefined || originalIndex > authorMaxIndex[author]) {
                authorMaxIndex[author] = originalIndex;
            }
        });

        const allAuthors = Object.keys(authorsMap);
        if (allAuthors.length === 0) { 
            standalonesContainer.innerHTML = '<p style="text-align:center; margin-top: 20px; font-size: 12px; color: #A0A0A0;">Одиночных книг пока нет.</p>'; 
            return; 
        }

        const topAuthorsOrder = ["Эмили Рат", "Лили Голд", "К.Р. Джейн", "Оливия Хейл", "Э. Сальвадор"];
        const fixedAuthors = [];
        topAuthorsOrder.forEach(author => {
            if (authorsMap[author]) fixedAuthors.push(author);
        });

        const otherAuthors = allAuthors.filter(a => !topAuthorsOrder.includes(a));
        otherAuthors.sort((a, b) => authorMaxIndex[b] - authorMaxIndex[a]);

        const renderAuthorItem = (author) => {
            const authorItem = document.createElement('div'); 
            authorItem.className = 'author-item';
            
            const authorHeader = document.createElement('div'); 
            authorHeader.className = 'author-header';
            authorHeader.onclick = function() { toggleAuthor(this); };
            authorHeader.innerHTML = `<span>${author}</span><span class="round-arrow author-arrow">➔</span>`;
            
            const booksGrid = document.createElement('div'); 
            booksGrid.className = 'standalones-grid';
            
            authorsMap[author].forEach(book => {
                const card = document.createElement('div'); 
                card.className = 'book-card';
                card.innerHTML = createBookCardHTML(book); 
                booksGrid.appendChild(card);
            });
            
            authorItem.appendChild(authorHeader); 
            authorItem.appendChild(booksGrid); 
            standalonesContainer.appendChild(authorItem);
        };

        fixedAuthors.forEach(renderAuthorItem);
        if (fixedAuthors.length > 0 && otherAuthors.length > 0) {
            const divider = document.createElement('div');
            divider.className = 'authors-divider';
            standalonesContainer.appendChild(divider);
        }
        otherAuthors.forEach(renderAuthorItem);
    }

    window.toggleAuthor = function(headerElement) { const authorItem = headerElement.parentElement; authorItem.classList.toggle('open'); };
    window.toggleSeries = function(headerElement) { const seriesItem = headerElement.parentElement; seriesItem.classList.toggle('open'); };

    function setActiveFilter(activeBtn) { 
        [filterRecent, filterTropes, filterAuthors, filterStandalones].forEach(btn => { 
            if(btn) btn.classList.remove('active-filter'); 
        }); 
        if(activeBtn) activeBtn.classList.add('active-filter'); 
    }

    if (navHome) { 
        navHome.addEventListener('click', () => { 
            navHome.classList.add('active-pill'); 
            if (navSaved) navSaved.classList.remove('active-pill'); 
            if (filtersContainer) filtersContainer.style.display = 'flex';
            
            if (disclaimerBox) disclaimerBox.style.display = 'flex'; // Показываем дисклеймер

            if (filterRecent) setActiveFilter(filterRecent); 
            if(authorsContainer) authorsContainer.style.display = 'none'; 
            if(standalonesContainer) standalonesContainer.style.display = 'none'; 
            if(tropesContainer) tropesContainer.style.display = 'none'; 
            if(booksGrid) booksGrid.style.display = 'grid'; 
            renderCurrentView(); 
        }); 
    }
    if (navSaved) { 
        navSaved.addEventListener('click', () => { 
            navSaved.classList.add('active-pill'); 
            if (navHome) navHome.classList.remove('active-pill'); 
            if (filtersContainer) filtersContainer.style.display = 'none';
            
            if (disclaimerBox) disclaimerBox.style.display = 'none'; // Скрываем дисклеймер

            if(authorsContainer) authorsContainer.style.display = 'none'; 
            if(standalonesContainer) standalonesContainer.style.display = 'none'; 
            if(tropesContainer) tropesContainer.style.display = 'none'; 
            if(booksGrid) booksGrid.style.display = 'grid'; 
            renderCurrentView(); 
        }); 
    }

    if (filterRecent) { 
        filterRecent.addEventListener('click', () => { 
            setActiveFilter(filterRecent); 
            if (disclaimerBox) disclaimerBox.style.display = 'flex'; // Показываем дисклеймер
            if(authorsContainer) authorsContainer.style.display = 'none'; 
            if(standalonesContainer) standalonesContainer.style.display = 'none'; 
            if(tropesContainer) tropesContainer.style.display = 'none'; 
            if(booksGrid) booksGrid.style.display = 'grid'; 
            renderCurrentView(); 
        }); 
    }
    if (filterAuthors) { 
        filterAuthors.addEventListener('click', () => { 
            setActiveFilter(filterAuthors); 
            if (disclaimerBox) disclaimerBox.style.display = 'none'; // Скрываем дисклеймер
            if(booksGrid) booksGrid.style.display = 'none'; 
            if(standalonesContainer) standalonesContainer.style.display = 'none'; 
            if(tropesContainer) tropesContainer.style.display = 'none'; 
            if(authorsContainer) authorsContainer.style.display = 'block'; 
            renderCurrentView(); 
        }); 
    }
    if (filterStandalones) { 
        filterStandalones.addEventListener('click', () => { 
            setActiveFilter(filterStandalones); 
            if (disclaimerBox) disclaimerBox.style.display = 'none'; // Скрываем дисклеймер
            if(booksGrid) booksGrid.style.display = 'none'; 
            if(authorsContainer) authorsContainer.style.display = 'none'; 
            if(tropesContainer) tropesContainer.style.display = 'none'; 
            if(standalonesContainer) standalonesContainer.style.display = 'block'; 
            renderCurrentView(); 
        }); 
    }
    if (filterTropes) { 
        filterTropes.addEventListener('click', () => { 
            setActiveFilter(filterTropes); 
            if (disclaimerBox) disclaimerBox.style.display = 'none'; // Скрываем дисклеймер
            if(booksGrid) booksGrid.style.display = 'none'; 
            if(authorsContainer) authorsContainer.style.display = 'none'; 
            if(standalonesContainer) standalonesContainer.style.display = 'none'; 
            if(tropesContainer) tropesContainer.style.display = 'block'; 
            renderCurrentView(); 
        }); 
    }

    window.toggleSave = function(btnElement, id) {
        const index = savedBookIds.indexOf(id);
        if (index > -1) { savedBookIds.splice(index, 1); btnElement.innerText = '♡'; } 
        else { savedBookIds.push(id); btnElement.innerText = '♥'; }
        localStorage.setItem('wombooks_saved', JSON.stringify(savedBookIds));
    };

    window.openBook = function(id) {
        const book = allBooks.find(b => b.id === id); if (!book) return; currentOpenBookId = id;
        
        const coverEl = document.getElementById('details-cover');
        if(coverEl) coverEl.src = `covers/${book.id}.PNG`;
        
        const titleEl = document.getElementById('details-title');
        if(titleEl) titleEl.innerText = book.title;
        
        const authorEl = document.getElementById('details-author');
        if(authorEl) authorEl.innerText = book.author;
        
        const ratingBox = document.getElementById('details-rating-box');
        if(ratingBox) ratingBox.innerHTML = getRatingText(book.rating);

        const seriesContainer = document.getElementById('details-series-container'); 
        if(seriesContainer) {
            seriesContainer.innerHTML = '';
            if (book.series) { seriesContainer.innerHTML += `<div class="details-series">${book.series}</div>`; }
            if (book.pages) { seriesContainer.innerHTML += `<div class="gray-badge">${book.pages}</div>`; }
        }

        const seriesNumBadge = document.getElementById('details-series-num-badge');
        if(seriesNumBadge) {
            if (book.seriesNumber) {
                seriesNumBadge.innerText = formatSeriesNumber(book.seriesNumber);
                seriesNumBadge.style.display = 'block';
            } else {
                seriesNumBadge.style.display = 'none';
            }
        }

        const tropesContainerEl = document.getElementById('details-tropes'); 
        if(tropesContainerEl) {
            tropesContainerEl.innerHTML = '';
            if (book.tropes) { book.tropes.split(',').forEach(trope => { if (trope.trim()) { const span = document.createElement('span'); span.className = 'trope-tag'; span.innerText = trope.trim(); tropesContainerEl.appendChild(span); } }); }
        }
        
        const annEl = document.getElementById('details-annotation');
        if(annEl) annEl.innerText = book.annotation;
        
        const favBtn = document.getElementById('details-fav-btn');
        const isSaved = savedBookIds.includes(book.id); 
        if(favBtn) favBtn.innerText = isSaved ? '♥' : '♡';

        if(pageHome) pageHome.style.display = 'none'; 
        if(bottomNav) bottomNav.style.display = 'none'; 
        if(pageDetails) pageDetails.style.display = 'block'; 
        window.scrollTo(0, 0); 
    };

    window.closeBook = function() {
        if(pageDetails) pageDetails.style.display = 'none'; 
        if(pageHome) pageHome.style.display = 'block'; 
        if(bottomNav) bottomNav.style.display = 'flex';
        renderCurrentView(); 
    };

    window.toggleSaveFromDetails = function() { if (!currentOpenBookId) return; const btn = document.getElementById('details-fav-btn'); if(btn) toggleSave(btn, currentOpenBookId); };

    window.downloadBook = function() {
        if (!currentOpenBookId) return;
        const fileUrl = new URL(`books/${currentOpenBookId}.epub`, window.location.href).href;
        tg.openLink(fileUrl);
    };

    window.openReviewModal = function() {
        const modal = document.getElementById('review-modal');
        if(modal) modal.style.display = 'flex';
        currentRating = 0;
        document.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));
        const revText = document.getElementById('review-text');
        if(revText) revText.value = '';
    };

    window.closeReviewModal = function() {
        const modal = document.getElementById('review-modal');
        if(modal) modal.style.display = 'none';
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

    window.submitReview = async function() {
        if (currentRating === 0) { tg.showAlert('Пожалуйста, поставьте хотя бы одну звездочку!'); return; }
        
        const reviewTextEl = document.getElementById('review-text');
        const reviewText = reviewTextEl ? reviewTextEl.value : '';
        const userId = tg.initDataUnsafe?.user?.id || 'Аноним'; 

        const payload = {
            bookId: currentOpenBookId,
            userId: userId,
            rating: currentRating,
            reviewText: reviewText
        };

        closeReviewModal();
        tg.showAlert('Отправляем ваш отзыв...');

        try {
            await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(payload)
            });

            tg.showAlert('Спасибо! Оценка учтена.');
            
            allRatings.push(payload);
            calculateRatings();
            
            const book = allBooks.find(b => b.id === currentOpenBookId);
            const ratingBox = document.getElementById('details-rating-box');
            if (book && ratingBox) { ratingBox.innerHTML = getRatingText(book.rating); }

        } catch (error) {
            tg.showAlert('Ошибка отправки. Проверьте интернет.');
        }
    };

    fetchBooksAndRatings();
});
