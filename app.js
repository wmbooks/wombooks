document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand();

    if (tg.requestFullscreen) {
        tg.requestFullscreen();
    }

    const heartEmpty = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
    const heartFilled = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
    const arrowRightSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
    const moonSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    const sunSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const checkIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    let toastTimeout;
    window.showToast = function(message) {
        const toast = document.getElementById('toast');
        if(!toast) return;
        toast.innerText = message;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    };

    const savedTheme = localStorage.getItem('wombooks_theme');
    const themeBtn = document.getElementById('theme-btn');
    const isDarkInitial = savedTheme === 'dark';

    if (isDarkInitial) {
        document.body.classList.add('dark-theme');
        if(themeBtn) themeBtn.innerHTML = sunSvg;
    } else {
        if(themeBtn) themeBtn.innerHTML = moonSvg;
    }

    if (tg.setHeaderColor) { tg.setHeaderColor(isDarkInitial ? '#121212' : '#FAFAFA'); }
    if (tg.setBackgroundColor) { tg.setBackgroundColor(isDarkInitial ? '#121212' : '#FAFAFA'); }

    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQofE7L59iFriQgwIJ-P0MclqfZ2QhBHR-zbk6FgaaZ7VSJ_dmtv823zjZkXBRWDodnCJ11B_Pa1oPc/pub?output=csv';
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbxF_KGJfmq8npELJDMecB1QxRl0zew1W6K8S18vRQ9CP4lf_DWc_RIdstdCqk_v1auX/exec';

    let allBooks = [];
    let allRatings = []; 
    
    let savedBookIds = JSON.parse(localStorage.getItem('wombooks_saved')) || [];
    let readBookIds = JSON.parse(localStorage.getItem('wombooks_read')) || [];
    let currentUserName = localStorage.getItem('wombooks_nickname') || 'Читатель';
    let currentProfileTab = 'saved'; 
    
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
    const recentCarousel = document.getElementById('recent-carousel');
    const recentSection = document.getElementById('recent-section');
    const authorsContainer = document.getElementById('authors-container');
    const standalonesContainer = document.getElementById('standalones-container'); 
    
    const tropesContainer = document.getElementById('tropes-container');
    const tropesMenu = document.getElementById('tropes-menu');
    const tropesBooksGrid = document.getElementById('tropes-books-grid');
    
    const mainFilters = document.getElementById('main-filters'); 
    const disclaimerBox = document.getElementById('disclaimer-box');
    const searchInput = document.getElementById('main-search-input'); 
    const searchClearBtn = document.getElementById('search-clear-btn'); 

    const profileSection = document.getElementById('profile-section');
    const pageHome = document.getElementById('page-home');
    const pageDetails = document.getElementById('page-book-details');
    const bottomNav = document.getElementById('bottom-nav');

    const filterAll = document.getElementById('filter-all');
    const filterTropes = document.getElementById('filter-tropes');
    const filterAuthors = document.getElementById('filter-authors');
    const filterStandalones = document.getElementById('filter-standalones');
    const navHome = document.getElementById('nav-home');
    const navSaved = document.getElementById('nav-saved');

    window.toggleTheme = function() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('wombooks_theme', isDark ? 'dark' : 'light');
        if(themeBtn) themeBtn.innerHTML = isDark ? sunSvg : moonSvg;
        
        if (tg.setHeaderColor) { tg.setHeaderColor(isDark ? '#121212' : '#FAFAFA'); }
        if (tg.setBackgroundColor) { tg.setBackgroundColor(isDark ? '#121212' : '#FAFAFA'); }
    };

    function getRecentBooks() { return allBooks.slice(-4).reverse(); }

    function getRatingText(rating) {
        if (!rating || rating === 0 || rating === "0") {
            return `<span style="color: var(--gray-text); font-weight: 500;">0.00</span>`;
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

    if (searchClearBtn && searchInput) {
        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchClearBtn.style.display = 'none';
            renderCurrentView();
            searchInput.focus();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query === '') {
                if(searchClearBtn) searchClearBtn.style.display = 'none';
                renderCurrentView(); 
                return;
            } else {
                if(searchClearBtn) searchClearBtn.style.display = 'flex';
            }
            
            if (disclaimerBox) disclaimerBox.style.display = 'none'; 
            if (authorsContainer) authorsContainer.style.display = 'none'; 
            if (standalonesContainer) standalonesContainer.style.display = 'none'; 
            if (tropesContainer) tropesContainer.style.display = 'none'; 
            if (profileSection) profileSection.style.display = 'none';
            if (mainFilters) mainFilters.style.display = 'none';
            if (recentSection) recentSection.style.display = 'none';
            if (booksGrid) booksGrid.style.display = 'grid'; 

            const filtered = allBooks.filter(b => {
                const t = (b.title || '').toLowerCase();
                const a = (b.author || '').toLowerCase();
                const s = (b.series || '').toLowerCase();
                return t.includes(query) || a.includes(query) || s.includes(query);
            });
            renderBooksToGrid(filtered, booksGrid);
        });
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
            updateProfileStats();
            
            if (currentOpenBookId && pageDetails && pageDetails.style.display === 'block') {
                const book = allBooks.find(b => b.id === currentOpenBookId);
                const ratingBox = document.getElementById('details-rating-box');
                if (book && ratingBox) { ratingBox.innerHTML = getRatingText(book.rating); }
            }
        } catch (e) { console.error("Оценки не загрузились", e); }
    }

    function updateProfileStats() {
        const userId = tg.initDataUnsafe?.user?.id || 'anonymous';
        const myReviews = allRatings.filter(r => String(r.userId) === String(userId));
        
        let detailedCount = 0;
        myReviews.forEach(r => {
            if (r.reviewText && r.reviewText.trim().split(/\s+/).length >= 5) {
                detailedCount++;
            }
        });

        const displayNameEl = document.getElementById('profile-display-name');
        const statusTextEl = document.getElementById('profile-status-text');
        const countTextEl = document.getElementById('review-count-text');
        const fillEl = document.getElementById('review-progress-fill');
        const hintTextEl = document.getElementById('progress-hint-text');
        const editBlock = document.getElementById('nickname-edit-block');

        if (displayNameEl) displayNameEl.innerText = currentUserName;

        if (detailedCount >= 5) {
            if (statusTextEl) statusTextEl.innerText = "Книжный эксперт";
            if (countTextEl) countTextEl.innerText = `${detailedCount} (Цель достигнута!)`;
            if (fillEl) fillEl.style.width = '100%';
            if (hintTextEl) hintTextEl.style.display = 'none';
            if (editBlock) editBlock.style.display = 'block'; 
        } else {
            if (statusTextEl) statusTextEl.innerText = "Новичок";
            if (countTextEl) countTextEl.innerText = `${detailedCount}/5`;
            if (fillEl) fillEl.style.width = `${(detailedCount / 5) * 100}%`;
            if (hintTextEl) hintTextEl.style.display = 'block';
            if (editBlock) editBlock.style.display = 'none';
        }
    }

    window.saveNickname = function() {
        const input = document.getElementById('nickname-input');
        if (!input || input.value.trim() === '') {
            showToast('Пожалуйста, введите никнейм!');
            return;
        }
        currentUserName = input.value.trim();
        localStorage.setItem('wombooks_nickname', currentUserName);
        document.getElementById('profile-display-name').innerText = currentUserName;
        input.value = '';
        showToast('Никнейм успешно сохранен!');
    };

    window.toggleProfileDropdown = function() {
        const wrapper = document.querySelector('.profile-tabs-wrapper');
        const menu = document.getElementById('profile-tabs-menu');
        if (wrapper.classList.contains('open')) {
            wrapper.classList.remove('open');
            menu.style.display = 'none';
        } else {
            wrapper.classList.add('open');
            menu.style.display = 'block';
        }
    };

    window.selectAlternativeTab = function() {
        if (currentProfileTab === 'saved') {
            currentProfileTab = 'read';
            document.getElementById('profile-tab-title').innerText = 'Прочитанные книги';
            document.getElementById('profile-alternative-tab').innerText = 'Сохраненные книги';
        } else {
            currentProfileTab = 'saved';
            document.getElementById('profile-tab-title').innerText = 'Сохраненные книги';
            document.getElementById('profile-alternative-tab').innerText = 'Прочитанные книги';
        }
        toggleProfileDropdown(); 
        renderCurrentView(); 
    };

    function renderCurrentView() {
        if (searchInput && searchInput.value !== '') {
            searchInput.value = '';
            if(searchClearBtn) searchClearBtn.style.display = 'none';
        }

        if (navSaved && navSaved.classList.contains('active-pill')) {
            if (recentSection) recentSection.style.display = 'none';
            if (profileSection) profileSection.style.display = 'block';
            
            if (currentProfileTab === 'saved') {
                renderBooksToGrid(allBooks.filter(book => savedBookIds.includes(book.id)), booksGrid);
            } else {
                renderBooksToGrid(allBooks.filter(book => readBookIds.includes(book.id)), booksGrid);
            }
        } else {
            if (profileSection) profileSection.style.display = 'none';
            if (recentSection) recentSection.style.display = 'block';
            renderCarousel(getRecentBooks(), recentCarousel);

            if (authorsContainer && authorsContainer.style.display === 'block') {
                renderAuthorsList();
            } else if (standalonesContainer && (standalonesContainer.style.display === 'block' || standalonesContainer.style.display === 'grid')) {
                renderStandalonesList();
            } else if (tropesContainer && tropesContainer.style.display === 'block') {
                renderTropesMenu();
            } else {
                renderBooksToGrid(allBooks, booksGrid);
            }
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
                    seriesNumber: arr[i][6] ? arr[i][6].trim() : '', 
                    pages: arr[i][7] ? arr[i][7].trim() : '',
                    warnings: arr[i][8] ? arr[i][8].trim() : '', 
                    rating: 0 
                });
            }
        }
    }

    function createBookCardHTML(book) {
        const isSaved = savedBookIds.includes(book.id);
        const isRead = readBookIds.includes(book.id);
        
        let iconHtml = heartEmpty;
        if (isRead) iconHtml = checkIconSvg;
        else if (isSaved) iconHtml = heartFilled;
        
        let seriesBadgeHtml = '';
        if (book.seriesNumber) { seriesBadgeHtml = `<div class="cover-series-badge">${formatSeriesNumber(book.seriesNumber)}</div>`; }

        let readBadgeHtml = isRead ? `<div class="cover-read-badge">Прочитано</div>` : '';
        let coverClass = isRead ? `book-cover read-opacity` : `book-cover`;

        return `
            <div class="grid-cover-wrapper">
                <img src="covers/${book.id}.PNG" alt="${book.title}" class="${coverClass}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23F8EBF0\\'/></svg>'">
                ${readBadgeHtml}
                ${seriesBadgeHtml}
            </div>
            <div class="card-info">
                <h4 class="book-title">${book.title}</h4>
                <p class="book-author">${book.author || 'Неизвестный автор'}</p>
                <div class="card-actions">
                    <button class="action-btn arrow-btn" onclick="openBook('${book.id}')">${arrowRightSvg}</button>
                    <div class="card-rating-text">${getRatingText(book.rating)}</div>
                    <button class="action-btn fav-btn" onclick="toggleSaveOrRead(this, '${book.id}')">${iconHtml}</button>
                </div>
            </div>
        `;
    }

    function renderBooksToGrid(books, gridElement) {
        if(!gridElement) return;
        gridElement.innerHTML = ''; 
        if (books.length === 0) { gridElement.innerHTML = '<p style="text-align:center; width: 200%; margin-top: 20px; font-size: 13px; color: var(--gray-text);">Ничего не найдено.</p>'; return; }
        books.forEach((book) => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = createBookCardHTML(book); 
            gridElement.appendChild(card);
        });
    }

    function renderCarousel(books, carouselElement) {
        if(!carouselElement) return;
        carouselElement.innerHTML = ''; 
        books.forEach((book) => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = createBookCardHTML(book); 
            carouselElement.appendChild(card);
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
            if (book.series) {
                const s = book.series.trim().toLowerCase();
                if (s === 'одиночная' || s === 'одиночные') return; 
            }

            const author = book.author || 'Неизвестный автор';
            if (!authorsMap[author]) authorsMap[author] = {};
            const series = book.series ? book.series : 'Без серии';
            if (!authorsMap[author][series]) authorsMap[author][series] = [];
            authorsMap[author][series].push(book);
            
            if (authorMaxIndex[author] === undefined || index > authorMaxIndex[author]) {
                authorMaxIndex[author] = index;
            }
        });
        
        const allAuthors = Object.keys(authorsMap);
        if (allAuthors.length === 0) { 
            authorsContainer.innerHTML = '<p style="text-align:center; margin-top: 20px; font-size: 13px; color: var(--gray-text);">Авторов пока нет.</p>'; 
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
            authorHeader.innerHTML = `<span>${author}</span><span class="round-arrow author-arrow">${arrowRightSvg}</span>`;
            
            const seriesList = document.createElement('div'); seriesList.className = 'author-series-list';
            
            const sortedSeries = Object.keys(authorsMap[author]).sort();
            sortedSeries.forEach(series => {
                const seriesItem = document.createElement('div'); seriesItem.className = 'series-item';
                const seriesHeader = document.createElement('div'); seriesHeader.className = 'series-header';
                seriesHeader.onclick = function() { toggleSeries(this); };
                seriesHeader.innerHTML = `<span>${series}</span><span class="round-arrow series-arrow">${arrowRightSvg}</span>`;
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

        const sortedStandalones = standalones.slice().reverse();
        renderBooksToGrid(sortedStandalones, standalonesContainer);
    }

    window.toggleAuthor = function(headerElement) { const authorItem = headerElement.parentElement; authorItem.classList.toggle('open'); };
    window.toggleSeries = function(headerElement) { const seriesItem = headerElement.parentElement; seriesItem.classList.toggle('open'); };
    
    window.toggleWarnings = function() {
        document.getElementById('warnings-wrapper').classList.toggle('open');
    };

    function setActiveFilter(activeBtn) { 
        [filterAll, filterTropes, filterAuthors, filterStandalones].forEach(btn => { 
            if(btn) btn.classList.remove('active-filter'); 
        }); 
        if(activeBtn) activeBtn.classList.add('active-filter'); 
    }

    if (navHome) { 
        navHome.addEventListener('click', () => { 
            navHome.classList.add('active-pill'); 
            if (navSaved) navSaved.classList.remove('active-pill'); 
            if (mainFilters) mainFilters.style.display = 'flex';
            if (disclaimerBox) disclaimerBox.style.display = 'flex'; 
            if (profileSection) profileSection.style.display = 'none'; 
            
            currentProfileTab = 'saved';
            const tabTitle = document.getElementById('profile-tab-title');
            const tabAlternative = document.getElementById('profile-alternative-tab');
            if (tabTitle) tabTitle.innerText = 'Сохраненные книги';
            if (tabAlternative) tabAlternative.innerText = 'Прочитанные книги';
            const wrapper = document.querySelector('.profile-tabs-wrapper');
            if (wrapper) wrapper.classList.remove('open');
            document.getElementById('profile-tabs-menu').style.display = 'none';

            if (filterAll) setActiveFilter(filterAll); 
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
            if (mainFilters) mainFilters.style.display = 'none';
            if (disclaimerBox) disclaimerBox.style.display = 'none'; 
            if (profileSection) profileSection.style.display = 'block'; 
            updateProfileStats(); 
            if(authorsContainer) authorsContainer.style.display = 'none'; 
            if(standalonesContainer) standalonesContainer.style.display = 'none'; 
            if(tropesContainer) tropesContainer.style.display = 'none'; 
            if(booksGrid) booksGrid.style.display = 'grid'; 
            renderCurrentView(); 
        }); 
    }

    if (filterAll) { 
        filterAll.addEventListener('click', () => { 
            setActiveFilter(filterAll); 
            if (disclaimerBox) disclaimerBox.style.display = 'flex'; 
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
            if (disclaimerBox) disclaimerBox.style.display = 'none'; 
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
            if (disclaimerBox) disclaimerBox.style.display = 'none'; 
            if(booksGrid) booksGrid.style.display = 'none'; 
            if(authorsContainer) authorsContainer.style.display = 'none'; 
            if(tropesContainer) tropesContainer.style.display = 'none'; 
            if(standalonesContainer) standalonesContainer.style.display = 'grid';
            renderCurrentView(); 
        }); 
    }
    if (filterTropes) { 
        filterTropes.addEventListener('click', () => { 
            setActiveFilter(filterTropes); 
            if (disclaimerBox) disclaimerBox.style.display = 'none'; 
            if(booksGrid) booksGrid.style.display = 'none'; 
            if(authorsContainer) authorsContainer.style.display = 'none'; 
            if(standalonesContainer) standalonesContainer.style.display = 'none'; 
            if(tropesContainer) tropesContainer.style.display = 'block'; 
            renderCurrentView(); 
        }); 
    }

    window.toggleSaveOrRead = function(btnElement, id, fromDetails = false) {
        btnElement.classList.remove('pulse');
        void btnElement.offsetWidth; 
        btnElement.classList.add('pulse');

        const isRead = readBookIds.includes(id);
        
        if (isRead) {
            readBookIds.splice(readBookIds.indexOf(id), 1);
            localStorage.setItem('wombooks_read', JSON.stringify(readBookIds));
            
            const isSaved = savedBookIds.includes(id);
            btnElement.innerHTML = isSaved ? heartFilled : heartEmpty;
            
            const card = btnElement.closest('.book-card');
            if (card) {
                const img = card.querySelector('.book-cover');
                if (img) img.style.opacity = '1';
                const badge = card.querySelector('.cover-read-badge');
                if (badge) badge.remove();
            }
            showToast('Убрано из прочитанного');
        } else {
            const index = savedBookIds.indexOf(id);
            if (index > -1) { 
                savedBookIds.splice(index, 1); 
                btnElement.innerHTML = heartEmpty; 
                showToast('Убрано из сохраненных');
            } else { 
                savedBookIds.push(id); 
                btnElement.innerHTML = heartFilled; 
                showToast('Книга добавлена в сохраненные');
            }
            localStorage.setItem('wombooks_saved', JSON.stringify(savedBookIds));
        }
        
        if (fromDetails) {
            updateDetailsReadState();
        } else {
            if (navSaved && navSaved.classList.contains('active-pill')) {
                renderCurrentView();
            }
        }
    };

    window.shareBook = function() {
        if (!currentOpenBookId) return;
        const book = allBooks.find(b => b.id === currentOpenBookId);
        if (!book) return;
        
        let seriesInfo = '';
        if (book.series && book.series.trim().toLowerCase() !== 'одиночная' && book.series.trim().toLowerCase() !== 'одиночные') { 
            seriesInfo = `\nСерия: ${book.series}`;
            if (book.seriesNumber) {
                seriesInfo += `, ${formatSeriesNumber(book.seriesNumber)}`;
            }
        }

        const appLink = `t.me/wombookbot/app`; 
        
        const shareText = `Название: ${book.title}${seriesInfo}\nАвтор: ${book.author || 'Неизвестный автор'}\n\nПрочитать можно здесь: ${appLink}\nПодписывайся на канал, чтобы читать больше интересных книг – https://t.me/+8Y0po5gZxCU2NWRi`;
        
        const shareUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(shareText)}`;
        tg.openTelegramLink(shareUrl);
    };

    function updateDetailsReadState() {
        if (!currentOpenBookId) return;
        const isRead = readBookIds.includes(currentOpenBookId);
        const isSaved = savedBookIds.includes(currentOpenBookId);
        
        const mainBtn = document.getElementById('details-mark-read-btn');
        const favBtn = document.getElementById('details-fav-btn');
        
        if (mainBtn) mainBtn.innerText = isRead ? 'Убрать из прочитанного' : 'Отметить прочитанным';
        
        if (favBtn) {
            if (isRead) {
                favBtn.innerHTML = checkIconSvg;
            } else {
                favBtn.innerHTML = isSaved ? heartFilled : heartEmpty;
            }
        }
    }

    window.toggleReadFromDetails = function() {
        if (!currentOpenBookId) return;
        const index = readBookIds.indexOf(currentOpenBookId);
        if (index > -1) { 
            readBookIds.splice(index, 1); 
            showToast('Убрано из прочитанного');
        } else { 
            readBookIds.push(currentOpenBookId); 
            showToast('Отмечено прочитанным');
        }
        localStorage.setItem('wombooks_read', JSON.stringify(readBookIds));
        updateDetailsReadState();
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
            if (book.series && book.series.trim().toLowerCase() !== 'одиночная' && book.series.trim().toLowerCase() !== 'одиночные') { 
                seriesContainer.innerHTML += `<div class="details-series">${book.series}</div>`; 
            }
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

        const warningsWrapper = document.getElementById('warnings-wrapper');
        const warningsContent = document.getElementById('warnings-content');
        if (warningsWrapper && warningsContent) {
            warningsWrapper.classList.remove('open'); 
            if (book.warnings) {
                warningsWrapper.style.display = 'flex'; 
                warningsContent.innerHTML = '';
                book.warnings.split(',').forEach(w => {
                    if (w.trim()) {
                        const span = document.createElement('span');
                        span.className = 'warning-tag';
                        span.innerText = w.trim();
                        warningsContent.appendChild(span);
                    }
                });
            } else {
                warningsWrapper.style.display = 'none';
            }
        }
        
        const annEl = document.getElementById('details-annotation');
        if(annEl) annEl.innerText = book.annotation;
        
        updateDetailsReadState();

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

    window.downloadBook = function() {
        if (!currentOpenBookId) return;
        const fileUrl = new URL(`books/${currentOpenBookId}.epub`, window.location.href).href;
        tg.openLink(fileUrl);
    };

    window.openReviewsListModal = function() {
        if (!currentOpenBookId) return;
        const container = document.getElementById('reviews-list-container');
        container.innerHTML = '';
        const bookReviews = allRatings.filter(r => r.bookId === currentOpenBookId && r.reviewText && r.reviewText.trim() !== "");
        if (bookReviews.length === 0) {
            container.innerHTML = '<p class="no-reviews-msg">Пока нет отзывов с текстом.</p>';
        } else {
            [...bookReviews].reverse().forEach(r => {
                const item = document.createElement('div');
                item.className = 'review-item';
                
                const authorDiv = document.createElement('div');
                authorDiv.className = 'review-item-author';
                authorDiv.innerText = r.userName || 'Читатель';
                
                const ratingDiv = document.createElement('div');
                ratingDiv.className = 'review-item-rating';
                ratingDiv.innerText = parseFloat(r.rating).toFixed(2);
                
                const textDiv = document.createElement('div');
                textDiv.className = 'review-item-text';
                textDiv.innerText = r.reviewText;
                
                item.appendChild(authorDiv);
                item.appendChild(ratingDiv);
                item.appendChild(textDiv);
                container.appendChild(item);
            });
        }
        document.getElementById('reviews-list-modal').style.display = 'flex';
    };

    window.closeReviewsListModal = function() { document.getElementById('reviews-list-modal').style.display = 'none'; };

    window.openReviewModal = function() {
        const modal = document.getElementById('review-modal');
        if(modal) modal.style.display = 'flex';
        currentRating = 0;
        document.querySelectorAll('.star').forEach(s => s.classList.remove('selected'));
        const revText = document.getElementById('review-text');
        if(revText) revText.value = '';
    };

    window.closeReviewModal = function() { document.getElementById('review-modal').style.display = 'none'; };

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
        if (currentRating === 0) { showToast('Пожалуйста, поставьте хотя бы одну звездочку!'); return; }
        const reviewTextEl = document.getElementById('review-text');
        const reviewText = reviewTextEl ? reviewTextEl.value : '';
        
        if (currentOpenBookId && !readBookIds.includes(currentOpenBookId)) {
            readBookIds.push(currentOpenBookId);
            localStorage.setItem('wombooks_read', JSON.stringify(readBookIds));
            updateDetailsReadState();
        }

        if (reviewText.trim().split(/\s+/).length >= 5) {
            setTimeout(updateProfileStats, 1000); 
        }

        const userId = tg.initDataUnsafe?.user?.id || 'anonymous'; 
        const payload = { 
            bookId: currentOpenBookId, 
            userId: userId, 
            rating: currentRating, 
            reviewText: reviewText,
            userName: currentUserName 
        };
        
        closeReviewModal();
        
        try {
            await fetch(scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
            showToast('Спасибо! Оценка учтена.');
            allRatings.push(payload);
            calculateRatings();
            const book = allBooks.find(b => b.id === currentOpenBookId);
            const ratingBox = document.getElementById('details-rating-box');
            if (book && ratingBox) { ratingBox.innerHTML = getRatingText(book.rating); }
        } catch (error) { showToast('Ошибка отправки. Проверьте интернет.'); }
    };

    fetchBooksAndRatings();
});
