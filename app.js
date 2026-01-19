// ===========================================
// IRL LEVEL - РАБОЧИЙ КОД С ИСПРАВЛЕНИЯМИ
// ===========================================

const SUPABASE_URL = 'https://rghcofervucgrkudsuvq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaGNvZmVydnVjZ3JrdWRzdXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Mjk4MzgsImV4cCI6MjA4NDQwNTgzOH0.zUovZ4pUwRry_evfOQehl4PYYcM2I7LxSFVNzAVBITY';

// DOM элементы
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('app');
const mainContent = document.getElementById('mainContent');
const playerCodeName = document.getElementById('playerCodeName');
const playerLevel = document.getElementById('playerLevel');
const navButtons = document.querySelectorAll('.nav-btn');
const contractModal = document.getElementById('contractModal');
const levelUpModal = document.getElementById('levelUpModal');
const acceptContractBtn = document.getElementById('acceptContractBtn');
const declineContractBtn = document.getElementById('declineContractBtn');
const closeLevelUpBtn = document.getElementById('closeLevelUpBtn');

// Глобальные переменные
let supabaseClient = null;
let telegramUser = null;
let player = null;
let currentTab = 'cabinet'; // Добавляем переменную для отслеживания текущей вкладки

// ===========================================
// БАЗОВЫЕ ФУНКЦИИ
// ===========================================

function generateCodeName() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = Math.floor(Math.random() * 900) + 100;
    return letters[Math.floor(Math.random() * letters.length)] + numbers;
}

function initTelegram() {
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        telegramUser = tg.initDataUnsafe?.user;
        console.log('👤 Telegram:', telegramUser?.id || 'Нет данных');
    }
    return telegramUser;
}

function getUserId() {
    if (telegramUser?.id) return telegramUser.id.toString();
    let localId = localStorage.getItem('irl_local_id');
    if (!localId) {
        localId = 'local_' + Date.now();
        localStorage.setItem('irl_local_id', localId);
    }
    return localId;
}

function initSupabase() {
    try {
        if (!window.supabase) {
            console.log('⚠️ Supabase SDK не загружен');
            return false;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase клиент создан');
        return true;
    } catch (error) {
        console.log('❌ Ошибка Supabase:', error);
        return false;
    }
}

// ===========================================
// РАБОТА С ДАННЫМИ
// ===========================================

async function loadPlayerFromSupabase() {
    if (!supabaseClient) return false;
    const userId = getUserId();
    if (!userId) return false;

    try {
        const { data, error } = await supabaseClient
            .from('players')
            .select('*')
            .eq('telegram_id', userId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return false;

        player = {
            codeName: data.code_name || generateCodeName(),
            level: data.level || 1,
            xp: data.xp || 0,
            resolve: data.resolve || 0,
            diamonds: data.diamonds || 0,
            stats: data.stats || { strength: 1, focus: 1, will: 1 },
            achievements: data.achievements || [],
            acceptedContract: data.accepted_contract || false,
            lastQuestDate: data.last_quest_date || null
        };
        console.log('📥 Загружено из Supabase');
        return true;
    } catch (error) {
        console.log('⚠️ Ошибка загрузки:', error);
        return false;
    }
}

function loadPlayerFromLocal() {
    const userId = getUserId();
    const key = `irl_player_${userId}`;
    const data = localStorage.getItem(key);

    if (data) {
        try {
            player = JSON.parse(data);
            console.log('📥 Загружено локально');
            return true;
        } catch (e) {
            console.log('❌ Ошибка парсинга:', e);
        }
    }
    return false;
}

async function savePlayerToSupabase() {
    if (!supabaseClient || !player) return false;
    const userId = getUserId();
    if (!userId) return false;

    try {
        const { error } = await supabaseClient
            .from('players')
            .upsert({
                telegram_id: userId,
                telegram_username: telegramUser?.username || '',
                telegram_first_name: telegramUser?.first_name || '',
                telegram_last_name: telegramUser?.last_name || '',
                code_name: player.codeName,
                level: player.level,
                xp: player.xp,
                resolve: player.resolve,
                diamonds: player.diamonds,
                stats: player.stats,
                achievements: player.achievements,
                accepted_contract: player.acceptedContract,
                last_quest_date: player.lastQuestDate,
                last_active: new Date().toISOString()
            });
        if (error) throw error;
        console.log('💾 Сохранено в Supabase');
        return true;
    } catch (error) {
        console.log('❌ Ошибка сохранения:', error);
        return false;
    }
}

function savePlayerToLocal() {
    if (!player) return;
    const userId = getUserId();
    const key = `irl_player_${userId}`;
    localStorage.setItem(key, JSON.stringify(player));
    console.log('💾 Сохранено локально');
}

async function savePlayerData() {
    if (!player) return;
    savePlayerToLocal();
    if (supabaseClient) await savePlayerToSupabase();
}

// ===========================================
// ИНТЕРФЕЙС
// ===========================================

function showLoadingScreen(callback) {
    const loadingProgress = document.getElementById('loadingProgress');
    const loadingText = document.getElementById('loadingText');

    if (!loadingProgress || !loadingText) {
        if (callback) setTimeout(callback, 100);
        return;
    }

    let progress = 0;
    const messages = [
        'Инициализация...',
        'Загрузка...',
        'Проверка...',
        'Подготовка...',
        'Готово!'
    ];

    const interval = setInterval(() => {
        progress += 2;
        loadingProgress.style.width = progress + '%';

        if (progress % 20 === 0) {
            const idx = Math.floor(progress / 20) - 1;
            if (messages[idx]) loadingText.textContent = messages[idx];
        }

        if (progress >= 100) {
            clearInterval(interval);
            loadingText.textContent = 'Готово!';
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    if (callback) callback();
                }, 500);
            }, 300);
        }
    }, 50);
}

function updatePlayerInfo() {
    if (playerCodeName && player) playerCodeName.textContent = player.codeName || 'Новичок';
    if (playerLevel && player) playerLevel.textContent = player.level;
}

function showContract() {
    if (appContainer) appContainer.classList.add('hidden');
    if (contractModal) {
        contractModal.classList.remove('hidden');
        const example = generateCodeName();
        const info = document.querySelector('.contract-info');
        if (info) {
            const existing = info.querySelector('.example-code');
            if (existing) existing.remove();
            const p = document.createElement('p');
            p.className = 'example-code';
            p.style.cssText = 'text-align:center;margin-top:20px;color:#00ff88';
            p.innerHTML = `<i class="fas fa-user-secret"></i> Пример: <strong>${example}</strong>`;
            info.appendChild(p);
        }
    }
}

async function acceptContract() {
    player = {
        codeName: generateCodeName(),
        level: 1,
        xp: 0,
        resolve: 10,
        diamonds: 5,
        stats: { strength: 1, focus: 1, will: 1 },
        acceptedContract: true,
        lastQuestDate: null,
        achievements: ['first_contract']
    };

    await savePlayerData();
    updatePlayerInfo();
    if (contractModal) contractModal.classList.add('hidden');
    showNotification(`Добро пожаловать, ${player.codeName}!`, 'success');
    startGame();
}

function declineContract() {
    console.log('❌ Контракт отклонен');
    setTimeout(() => {
        document.body.innerHTML = `
            <div style="text-align:center;padding:50px;color:white;font-family:'Roboto Mono',monospace">
                <h2 style="color:#ff3860">Контракт отклонен</h2>
                <p style="margin:20px 0">Обнови страницу чтобы начать заново</p>
                <button onclick="location.reload()" style="
                    background:linear-gradient(135deg,#00ff88,#00ccff);
                    color:#000;border:none;padding:12px 24px;
                    border-radius:8px;font-family:'Orbitron',sans-serif;
                    font-weight:bold;cursor:pointer;margin-top:20px">
                    НАЧАТЬ ЗАНОВО
                </button>
            </div>
        `;
    }, 2000);
}

function startGame() {
    if (appContainer) appContainer.classList.remove('hidden');
    updatePlayerInfo();
    showTab('cabinet');
    setActiveNavButton('tabCabinet');
}

// ===========================================
// ВКЛАДКИ С ИСПРАВЛЕННОЙ ЛОГИКОЙ КНОПОК
// ===========================================

function getCabinetContent() {
    if (!player) return '<div class="card"><h2>Ошибка</h2></div>';
    const xpPercent = Math.min(player.xp, 100);
    return `
        <div class="card">
            <h2><i class="fas fa-home"></i> ЛИЧНЫЙ КАБИНЕТ</h2>
            <div class="player-info">
                <div class="player-header">
                    <div class="player-avatar"><i class="fas fa-user-secret"></i></div>
                    <div class="player-name">
                        <h3>${player.codeName}</h3>
                        <p class="player-title">Новичок системы</p>
                    </div>
                </div>
                <div class="player-stats">
                    <div class="stat-item"><div class="stat-label">Уровень</div><div class="stat-value level">${player.level}</div></div>
                    <div class="stat-item"><div class="stat-label">Опыт</div><div class="stat-value xp">${player.xp}/100</div></div>
                    <div class="stat-item"><div class="stat-label">Resolve</div><div class="stat-value resolve">${player.resolve}</div></div>
                    <div class="stat-item"><div class="stat-label">Бриллианты</div><div class="stat-value diamonds">${player.diamonds} <i class="fas fa-gem"></i></div></div>
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-label">Прогресс до уровня ${player.level + 1}</div>
                <div class="progress-bar"><div class="progress-fill" style="width:${xpPercent}%"></div></div>
                <div class="progress-text">${xpPercent}%</div>
            </div>
            <div class="characteristics">
                <h3><i class="fas fa-chart-line"></i> ХАРАКТЕРИСТИКИ</h3>
                <div class="characteristics-grid">
                    <div class="char-item"><div class="char-icon strength"><i class="fas fa-dumbbell"></i></div><div class="char-info"><div class="char-name">Сила</div><div class="char-value">${(player.stats.strength || 1).toFixed(1)}</div></div></div>
                    <div class="char-item"><div class="char-icon focus"><i class="fas fa-brain"></i></div><div class="char-info"><div class="char-name">Концентрация</div><div class="char-value">${(player.stats.focus || 1).toFixed(1)}</div></div></div>
                    <div class="char-item"><div class="char-icon will"><i class="fas fa-fire"></i></div><div class="char-info"><div class="char-name">Воля</div><div class="char-value">${(player.stats.will || 1).toFixed(1)}</div></div></div>
                </div>
            </div>
        </div>
    `;
}

function getQuestsContent() {
    if (!player) return '<div class="card"><h2>Ошибка</h2></div>';
    const today = new Date().toISOString().split('T')[0];
    const canDoQuest = player.lastQuestDate !== today;
    const isQuestDone = !canDoQuest;

    // Получаем ID выполненных сегодня заданий
    const completedQuestsToday = player.completedQuestsToday || [];

    return `
        <div class="card">
            <h2><i class="fas fa-tasks"></i> ЕЖЕДНЕВНЫЕ ЗАДАНИЯ</h2>
            <p class="quest-status">${canDoQuest ? '✅ Задания доступны!' : '⏳ Уже выполнено сегодня'}</p>
            <div class="quests-list">
                <div class="quest-item" id="quest-strength">
                    <div class="quest-header"><div class="quest-icon"><i class="fas fa-dumbbell"></i></div><div class="quest-info"><h3>10 отжиманий</h3><p class="quest-desc">Развивайте физическую силу</p></div></div>
                    <div class="quest-rewards"><span class="reward"><i class="fas fa-star"></i> +10 XP</span><span class="reward"><i class="fas fa-bolt"></i> +3 Resolve</span><span class="reward"><i class="fas fa-dumbbell"></i> +0.1 к Силе</span></div>
                    <button class="quest-button" onclick="completeQuest('strength', this)" 
                        ${isQuestDone ? 'disabled' : ''}
                        ${completedQuestsToday.includes('strength') ? 'disabled style="background: #444; color: #888;"' : ''}>
                        ${completedQuestsToday.includes('strength') ? 'ВЫПОЛНЕНО' : isQuestDone ? 'ВЫПОЛНЕНО' : 'ВЫПОЛНИТЬ'}
                    </button>
                </div>
                <div class="quest-item" id="quest-focus">
                    <div class="quest-header"><div class="quest-icon"><i class="fas fa-book"></i></div><div class="quest-info"><h3>Читать 30 минут</h3><p class="quest-desc">Развивайте концентрацию</p></div></div>
                    <div class="quest-rewards"><span class="reward"><i class="fas fa-star"></i> +15 XP</span><span class="reward"><i class="fas fa-bolt"></i> +5 Resolve</span><span class="reward"><i class="fas fa-brain"></i> +0.1 к Концентрации</span></div>
                    <button class="quest-button" onclick="completeQuest('focus', this)" 
                        ${isQuestDone ? 'disabled' : ''}
                        ${completedQuestsToday.includes('focus') ? 'disabled style="background: #444; color: #888;"' : ''}>
                        ${completedQuestsToday.includes('focus') ? 'ВЫПОЛНЕНО' : isQuestDone ? 'ВЫПОЛНЕНО' : 'ВЫПОЛНИТЬ'}
                    </button>
                </div>
                <div class="quest-item" id="quest-will">
                    <div class="quest-header"><div class="quest-icon"><i class="fas fa-sun"></i></div><div class="quest-info"><h3>Ранний подъем (до 7:00)</h3><p class="quest-desc">Развивайте силу воли</p></div></div>
                    <div class="quest-rewards"><span class="reward"><i class="fas fa-star"></i> +20 XP</span><span class="reward"><i class="fas fa-bolt"></i> +7 Resolve</span><span class="reward"><i class="fas fa-fire"></i> +0.1 к Воле</span></div>
                    <button class="quest-button" onclick="completeQuest('will', this)" 
                        ${isQuestDone ? 'disabled' : ''}
                        ${completedQuestsToday.includes('will') ? 'disabled style="background: #444; color: #888;"' : ''}>
                        ${completedQuestsToday.includes('will') ? 'ВЫПОЛНЕНО' : isQuestDone ? 'ВЫПОЛНЕНО' : 'ВЫПОЛНИТЬ'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getShopContent() {
    if (!player) return '<div class="card"><h2>Ошибка</h2></div>';
    return `
        <div class="card">
            <h2><i class="fas fa-store"></i> МАГАЗИН СИСТЕМЫ</h2>
            <div class="shop-balance"><i class="fas fa-wallet"></i><span>Ваш баланс: <strong>${player.diamonds} <i class="fas fa-gem"></i></strong></span></div>
            <div class="shop-items">
                <div class="shop-item"><div class="item-header"><div class="item-icon"><i class="fas fa-bolt"></i></div><h3>Бустер опыта</h3><div class="item-price">20 <i class="fas fa-gem"></i></div></div><p class="item-desc">+50% XP ко всем заданиям на 24 часа</p><button class="buy-button" onclick="buyItem('xp_booster',20)">КУПИТЬ</button></div>
                <div class="shop-item"><div class="item-header"><div class="item-icon"><i class="fas fa-heart"></i></div><h3>Доп. задание</h3><div class="item-price">30 <i class="fas fa-gem"></i></div></div><p class="item-desc">Открывает дополнительное задание на день</p><button class="buy-button" onclick="buyItem('extra_quest',30)">КУПИТЬ</button></div>
                <div class="shop-item"><div class="item-header"><div class="item-icon"><i class="fas fa-palette"></i></div><h3>Скин "Неон"</h3><div class="item-price">50 <i class="fas fa-gem"></i></div></div><p class="item-desc">Изменяет цветовую тему интерфейса</p><button class="buy-button" onclick="buyItem('neon_skin',50)">КУПИТЬ</button></div>
                <div class="shop-item"><div class="item-header"><div class="item-icon"><i class="fas fa-undo"></i></div><h3>Сброс характеристик</h3><div class="item-price">100 <i class="fas fa-gem"></i></div></div><p class="item-desc">Позволяет перераспределить очки характеристик</p><button class="buy-button" onclick="buyItem('reset_stats',100)">КУПИТЬ</button></div>
            </div>
        </div>
    `;
}

function getAchievementsContent() {
    if (!player) return '<div class="card"><h2>Ошибка</h2></div>';
    return `
        <div class="card">
            <h2><i class="fas fa-trophy"></i> ДОСТИЖЕНИЯ</h2>
            <p class="achievements-count">Открыто: ${player.achievements?.length || 0} из 12</p>
            <div class="achievements-list">
                <div class="achievement-item ${player.achievements?.includes('first_contract') ? 'unlocked' : 'locked'}"><div class="achievement-icon"><i class="fas fa-file-signature"></i></div><div class="achievement-info"><h3>Первый контракт</h3><p>Примите контракт системы</p></div><div class="achievement-status">${player.achievements?.includes('first_contract') ? '✅' : '🔒'}</div></div>
                <div class="achievement-item ${player.achievements?.includes('first_quest') ? 'unlocked' : 'locked'}"><div class="achievement-icon"><i class="fas fa-flag-checkered"></i></div><div class="achievement-info"><h3>Первая победа</h3><p>Выполните первое задание</p></div><div class="achievement-status">${player.achievements?.includes('first_quest') ? '✅' : '🔒'}</div></div>
                <div class="achievement-item locked"><div class="achievement-icon"><i class="fas fa-layer-group"></i></div><div class="achievement-info"><h3>Уровень 5</h3><p>Достигните 5 уровня</p></div><div class="achievement-status">${(player.level || 0) >= 5 ? '✅' : '🔒'}</div></div>
                <div class="achievement-item locked"><div class="achievement-icon"><i class="fas fa-calendar-day"></i></div><div class="achievement-info"><h3>Семь дней силы</h3><p>Выполняйте задания 7 дней подряд</p></div><div class="achievement-status">🔒</div></div>
            </div>
        </div>
    `;
}

function getSettingsContent() {
    return `
        <div class="card">
            <h2><i class="fas fa-cog"></i> НАСТРОЙКИ</h2>
            <div class="settings-section"><h3><i class="fas fa-bell"></i> Уведомления</h3>
                <div class="setting-item"><span>Напоминания о заданиях</span><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
                <div class="setting-item"><span>Уведомления об уровне</span><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
            </div>
            <div class="settings-section"><h3><i class="fas fa-gamepad"></i> Игровые настройки</h3>
                <div class="setting-item"><span>Анимации</span><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
                <div class="setting-item"><span>Звуковые эффекты</span><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>
            </div>
            <div class="settings-section"><h3><i class="fas fa-database"></i> Данные</h3>
                <button class="settings-button" onclick="exportData()"><i class="fas fa-download"></i> Экспорт данных</button>
                <button class="settings-button" onclick="importData()"><i class="fas fa-upload"></i> Импорт данных</button>
                <button class="settings-button danger" onclick="resetGame()"><i class="fas fa-trash"></i> Сбросить игру</button>
            </div>
            <div class="settings-info"><p><i class="fas fa-info-circle"></i> Версия: 1.0.0</p><p><i class="fas fa-code"></i> IRL Level System</p></div>
        </div>
    `;
}

// ===========================================
// ЛОГИКА С ИСПРАВЛЕНИЯМИ
// ===========================================

function setActiveNavButton(buttonId) {
    if (!navButtons || navButtons.length === 0) return;
    navButtons.forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById(buttonId);
    if (btn) btn.classList.add('active');
}

function showTab(tabName) {
    if (!mainContent || !player) return;

    currentTab = tabName; // Сохраняем текущую вкладку

    let content = '';
    switch (tabName) {
        case 'cabinet': content = getCabinetContent(); break;
        case 'quests': content = getQuestsContent(); break;
        case 'shop': content = getShopContent(); break;
        case 'achievements': content = getAchievementsContent(); break;
        case 'settings': content = getSettingsContent(); break;
        default: content = '<div class="card"><h2>Ошибка</h2></div>';
    }
    mainContent.innerHTML = content;
}

async function completeQuest(type, buttonElement) {
    if (!player) return;

    const today = new Date().toISOString().split('T')[0];

    // Инициализируем массив выполненных заданий за сегодня, если его нет
    if (!player.completedQuestsToday) {
        player.completedQuestsToday = [];
    }

    // Проверяем, выполнено ли уже это задание сегодня
    if (player.completedQuestsToday.includes(type)) {
        showNotification('Это задание уже выполнено сегодня!', 'warning');
        return;
    }

    // Проверяем, выполнено ли какое-либо задание сегодня
    const isAnyQuestDoneToday = player.lastQuestDate === today;

    // Если какое-то задание уже выполнено сегодня, но это другое задание
    if (isAnyQuestDoneToday && player.lastQuestDate === today && !player.completedQuestsToday.includes(type)) {
        // Позволяем выполнять разные задания в один день
        // Просто продолжаем
    }

    // Добавляем текущее задание в список выполненных
    player.completedQuestsToday.push(type);

    // Обновляем дату последнего задания
    player.lastQuestDate = today;

    // Начисляем награды в зависимости от типа задания
    if (type === 'strength') {
        player.xp += 10;
        player.resolve += 3;
        player.stats.strength = (player.stats.strength || 1) + 0.1;
    } else if (type === 'focus') {
        player.xp += 15;
        player.resolve += 5;
        player.stats.focus = (player.stats.focus || 1) + 0.1;
    } else if (type === 'will') {
        player.xp += 20;
        player.resolve += 7;
        player.stats.will = (player.stats.will || 1) + 0.1;
    }

    // Добавляем достижение "первое задание", если его еще нет
    if (!player.achievements.includes('first_quest')) {
        player.achievements.push('first_quest');
    }

    await savePlayerData();

    // Визуальное обновление кнопки сразу
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.textContent = 'ВЫПОЛНЕНО';
        buttonElement.style.background = '#444';
        buttonElement.style.color = '#888';

        // Анимация смены цвета
        const questItem = buttonElement.closest('.quest-item');
        if (questItem) {
            questItem.style.transition = 'all 0.5s ease';
            questItem.style.borderColor = 'rgba(0, 255, 136, 0.3)';
            questItem.style.background = 'rgba(0, 255, 136, 0.05)';
        }
    }

    // Проверяем повышение уровня
    if (player.xp >= 100) {
        player.level += 1;
        player.xp = player.xp - 100;
        player.diamonds += 5;
        player.resolve += 10;
        showLevelUpModal();
    }

    updatePlayerInfo();
    showNotification('Задание выполнено! +' + (type === 'strength' ? '10' : type === 'focus' ? '15' : '20') + ' XP', 'success');

    // Обновляем информацию в кабинете, если он открыт
    if (currentTab === 'cabinet') {
        showTab('cabinet');
    }
}

function buyItem(itemId, price) {
    if (!player) return;

    if (player.diamonds < price) {
        showNotification('Недостаточно бриллиантов!', 'error');
        return;
    }

    player.diamonds -= price;

    switch (itemId) {
        case 'xp_booster':
            showNotification('Бустер опыта активирован на 24 часа!', 'success');
            break;
        case 'extra_quest':
            showNotification('Дополнительное задание разблокировано!', 'success');
            break;
        case 'neon_skin':
            showNotification('Скин "Неон" применен!', 'success');
            break;
        case 'reset_stats':
            showNotification('Характеристики сброшены!', 'success');
            player.stats = { strength: 1, focus: 1, will: 1 };
            break;
    }

    savePlayerData();
    updatePlayerInfo();
    showTab('shop');
}

function showLevelUpModal() {
    const old = document.getElementById('oldLevel');
    const newLvl = document.getElementById('newLevel');
    if (old) old.textContent = player.level - 1;
    if (newLvl) newLvl.textContent = player.level;
    if (levelUpModal) levelUpModal.classList.remove('hidden');
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<div class="notification-content"><i class="fas fa-info-circle"></i><span>${message}</span></div>`;

    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function exportData() {
    if (!player) return;
    const data = JSON.stringify(player);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irl-backup.json`;
    a.click();
    showNotification('Данные экспортированы!', 'success');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                player = JSON.parse(event.target.result);
                savePlayerData();
                updatePlayerInfo();
                showNotification('Данные импортированы!', 'success');
                showTab('cabinet');
            } catch (error) {
                showNotification('Ошибка импорта!', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function resetGame() {
    if (confirm('Вы уверены?')) {
        const userId = getUserId();
        localStorage.removeItem(`irl_player_${userId}`);
        localStorage.removeItem('irl_local_id');
        location.reload();
    }
}

// ===========================================
// ЗАПУСК
// ===========================================

async function initApp() {
    console.log('🚀 Запуск...');

    initTelegram();
    initSupabase();

    const fromSupabase = await loadPlayerFromSupabase();
    if (!fromSupabase) {
        loadPlayerFromLocal();
    }

    if (!player || !player.acceptedContract) {
        showContract();
    } else {
        startGame();
    }
}

function setupEventListeners() {
    if (navButtons.length > 0) {
        navButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                const tab = this.getAttribute('data-tab');
                setActiveNavButton(this.id);
                showTab(tab);
            });
        });
    }

    if (acceptContractBtn) acceptContractBtn.addEventListener('click', acceptContract);
    if (declineContractBtn) declineContractBtn.addEventListener('click', declineContract);
    if (closeLevelUpBtn) closeLevelUpBtn.addEventListener('click', () => {
        if (levelUpModal) levelUpModal.classList.add('hidden');
    });
}

window.addEventListener('DOMContentLoaded', function () {
    console.log('📱 DOM загружен');
    setupEventListeners();

    if (loadingScreen) {
        showLoadingScreen(async () => {
            await initApp();
        });
    } else {
        setTimeout(async () => {
            await initApp();
        }, 100);
    }
});

// Глобальные функции
window.completeQuest = completeQuest;
window.buyItem = buyItem;
window.exportData = exportData;
window.importData = importData;
window.resetGame = resetGame;

// Отладка
window.debugSystem = () => {
    console.log('=== DEBUG ===');
    console.log('Player:', player);
    console.log('Telegram:', telegramUser);
    console.log('Supabase:', supabaseClient ? '✅' : '❌');
    console.log('Current Tab:', currentTab);
    console.log('Completed Quests Today:', player?.completedQuestsToday || []);
};
