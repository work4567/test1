// ===========================================
// IRL LEVEL - ОСНОВНОЙ ФАЙЛ JAVASCRIPT С SUPABASE
// ===========================================

// ===========================================
// 1. НАСТРОЙКА ПЕРЕМЕННЫХ И КОНСТАНТ
// ===========================================

// ВСТАВЬ СВОИ ДАННЫЕ SUPABASE СЮДА!
const SUPABASE_URL = 'https://rghcofervucgrkudsuvq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnaGNvZmVydnVjZ3JrdWRzdXZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4Mjk4MzgsImV4cCI6MjA4NDQwNTgzOH0.zUovZ4pUwRry_evfOQehl4PYYcM2I7LxSFVNzAVBITY';

// Основные DOM элементы
const loadingScreen = document.getElementById('loadingScreen');
const appContainer = document.getElementById('app');
const mainContent = document.getElementById('mainContent');
const playerCodeName = document.getElementById('playerCodeName');
const playerLevel = document.getElementById('playerLevel');

// Кнопки навигации
const navButtons = document.querySelectorAll('.nav-btn');

// Модальные окна
const contractModal = document.getElementById('contractModal');
const levelUpModal = document.getElementById('levelUpModal');

// Кнопки в модальных окнах
const acceptContractBtn = document.getElementById('acceptContractBtn');
const declineContractBtn = document.getElementById('declineContractBtn');
const closeLevelUpBtn = document.getElementById('closeLevelUpBtn');

// Глобальные переменные (УБЕРИ let отсюда если есть повторение)
let supabase = null; // ТОЛЬКО ОДИН РАЗ ЗДЕСЬ!
let telegramApp = null;
let telegramUser = null;

// Проверяем есть ли Telegram вообще
if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
    telegramApp = window.Telegram.WebApp;
    console.log('✅ Telegram WebApp обнаружен');
    telegramApp.expand(); // Разворачиваем на весь экран
    telegramUser = telegramApp.initDataUnsafe?.user;
} else {
    console.log('🌐 Запущено в браузере (не в Telegram)');
}

// Данные игрока по умолчанию
let player = {
    codeName: '',
    level: 1,
    xp: 0,
    resolve: 0,
    diamonds: 0,
    stats: { strength: 1, focus: 1, will: 1 },
    acceptedContract: false,
    lastQuestDate: null,
    achievements: []
};

// ===========================================
// 2. ИНИЦИАЛИЗАЦИЯ SUPABASE
// ===========================================

/**
 * Инициализирует Supabase
 */
async function initSupabase() {
    try {
        // ПРОВЕРКА: есть ли supabase в window
        if (!window.supabase) {
            console.error('❌ Supabase не загрузился в window');
            return false;
        }

        console.log('🔄 Инициализация Supabase...');
        console.log('URL:', SUPABASE_URL);

        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: false },
            db: { schema: 'public' }
        });

        // Проверяем подключение
        const { data, error } = await supabase
            .from('players')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Ошибка подключения к Supabase:', error);
            return false;
        }

        console.log('✅ Supabase подключен успешно!');
        return true;
    } catch (error) {
        console.error('❌ Критическая ошибка Supabase:', error);
        return false;
    }
}

// ===========================================
// 3. ФУНКЦИИ ДЛЯ РАБОТЫ С БАЗОЙ ДАННЫХ
// ===========================================

/**
 * Получает ID пользователя
 */
function getUserId() {
    if (telegramUser && telegramUser.id) {
        return telegramUser.id.toString();
    }

    // Для локального использования создаем ID
    let localUserId = localStorage.getItem('irlLevel_userId');
    if (!localUserId) {
        localUserId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('irlLevel_userId', localUserId);
    }
    return localUserId;
}

/**
 * Сохраняет данные игрока в Supabase
 */
async function saveToSupabase() {
    if (!supabase) {
        console.log('⚠️ Supabase не готов');
        return false;
    }

    const userId = getUserId();
    if (!userId) {
        console.log('⚠️ Нет ID пользователя');
        return false;
    }

    console.log('💾 Сохранение в Supabase для ID:', userId);

    try {
        const { data, error } = await supabase
            .from('players')
            .upsert({
                telegram_id: userId,
                telegram_username: telegramUser?.username || '',
                telegram_first_name: telegramUser?.first_name || '',
                telegram_last_name: telegramUser?.last_name || '',
                code_name: player.codeName || generateCodeName(),
                level: player.level || 1,
                xp: player.xp || 0,
                resolve: player.resolve || 0,
                diamonds: player.diamonds || 0,
                stats: player.stats || { strength: 1, focus: 1, will: 1 },
                achievements: player.achievements || [],
                accepted_contract: player.acceptedContract || false,
                last_quest_date: player.lastQuestDate || null,
                last_active: new Date().toISOString()
            }, {
                onConflict: 'telegram_id'
            });

        if (error) {
            console.error('❌ Ошибка Supabase:', error);
            return false;
        }

        console.log('✅ Данные сохранены в Supabase');
        return true;
    } catch (error) {
        console.error('❌ Исключение при сохранении:', error);
        return false;
    }
}

/**
 * Загружает данные игрока из Supabase
 */
async function loadFromSupabase() {
    if (!supabase) {
        console.log('⚠️ Supabase не инициализирован');
        return false;
    }

    const userId = getUserId();
    if (!userId) {
        console.log('⚠️ Не удалось определить ID пользователя');
        return false;
    }

    try {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Пользователь не найден - это нормально для первого входа
                console.log('👤 Пользователь не найден в базе, создадим нового');
                return false;
            }
            console.error('❌ Ошибка загрузки из Supabase:', error);
            return false;
        }

        if (data) {
            // Преобразуем данные из Supabase в наш формат
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

            console.log('✅ Данные загружены из Supabase для:', userId);
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Ошибка при загрузке:', error);
        return false;
    }
}

/**
 * Сохраняет данные локально
 */
function saveToLocalStorage() {
    const key = `irlLevel_${getUserId()}`;
    localStorage.setItem(key, JSON.stringify(player));
}

/**
 * Загружает данные локально
 */
function loadFromLocalStorage() {
    const key = `irlLevel_${getUserId()}`;
    const data = localStorage.getItem(key);
    if (data) {
        try {
            player = JSON.parse(data);
            return true;
        } catch (e) {
            console.error('❌ Ошибка парсинга локальных данных:', e);
        }
    }
    return false;
}

/**
 * Основная функция сохранения данных
 */
async function savePlayerData() {
    // Всегда сохраняем локально
    saveToLocalStorage();
    console.log('💾 Данные сохранены локально');

    // Пробуем сохранить в Supabase (если доступен)
    if (supabase) {
        setTimeout(async () => {
            await trySaveToSupabase();
        }, 500); // Сохраняем с небольшой задержкой
    }

    return true;
}

/**
 * Основная функция загрузки данных
 */
async function loadPlayerData() {
    console.log('🔄 Загрузка данных...');

    // Пробуем грузить локально (это точно сработает)
    const loaded = loadFromLocalStorage();

    if (loaded) {
        console.log('📥 Данные загружены локально:', player);
        return true;
    } else {
        console.log('📝 Данные не найдены, создаем нового игрока');
        // Создаем дефолтного игрока для теста
        player = {
            codeName: generateCodeName(),
            level: 1,
            xp: 0,
            resolve: 10,
            diamonds: 5,
            stats: { strength: 1, focus: 1, will: 1 },
            acceptedContract: false,  // Оставляем false чтобы показать контракт
            lastQuestDate: null,
            achievements: []
        };
        return false;
    }
}

// ===========================================
// 4. ОСНОВНЫЕ ФУНКЦИИ ПРИЛОЖЕНИЯ
// ===========================================

/**
 * Генерирует уникальное кодовое имя
 */
function generateCodeName() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = Math.floor(Math.random() * 900) + 100;
    const letter = letters[Math.floor(Math.random() * letters.length)];
    return letter + numbers;
}

/**
 * Показывает экран загрузки
 */
function showLoadingScreen(callback) {
    const loadingProgress = document.getElementById('loadingProgress');
    const loadingText = document.getElementById('loadingText');

    if (!loadingProgress || !loadingText) {
        console.error('❌ Не найден элемент загрузки');
        if (callback) setTimeout(callback, 100);
        return;
    }

    let progress = 0;

    const loadingMessages = [
        'Инициализация системы...',
        'Загрузка модулей...',
        'Проверка данных...',
        'Подготовка интерфейса...',
        'Активация прокачки...'
    ];

    const interval = setInterval(() => {
        progress += 2;
        loadingProgress.style.width = progress + '%';

        if (progress % 20 === 0) {
            const messageIndex = Math.floor(progress / 20) - 1;
            if (loadingMessages[messageIndex]) {
                loadingText.textContent = loadingMessages[messageIndex];
            }
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

/**
 * Обновляет информацию игрока в интерфейсе
 */
function updatePlayerInfo() {
    if (playerCodeName) {
        playerCodeName.textContent = player.codeName || 'Новичок';
    }
    if (playerLevel) {
        playerLevel.textContent = player.level;
    }
}

/**
 * Инициализирует приложение
 */
async function initApp() {
    console.log('🚀 Инициализация приложения...');

    // ВРЕМЕННО: пропускаем Supabase для теста
    console.log('⚠️ Временный режим без Supabase');

    // Создаем или загружаем игрока
    const loaded = loadFromLocalStorage();

    if (!loaded || !player.acceptedContract) {
        // Показываем контракт
        showContract();
    } else {
        // Показываем игру
        updatePlayerInfo();
        startGame();
    }
}

/**
 * Показывает контракт
 */
function showContract() {
    if (appContainer) appContainer.classList.add('hidden');
    if (contractModal) {
        contractModal.classList.remove('hidden');

        // Генерируем пример кодового имени
        const exampleName = generateCodeName();
        const contractInfo = document.querySelector('.contract-info');
        if (contractInfo) {
            const existingExample = contractInfo.querySelector('.example-code');
            if (existingExample) {
                existingExample.remove();
            }

            const exampleElement = document.createElement('p');
            exampleElement.className = 'example-code';
            exampleElement.style.textAlign = 'center';
            exampleElement.style.marginTop = '20px';
            exampleElement.style.color = '#00ff88';
            exampleElement.innerHTML = `<i class="fas fa-user-secret"></i> Пример кода: <strong>${exampleName}</strong>`;
            contractInfo.appendChild(exampleElement);
        }
    }
}

/**
 * Принимает контракт
 */
async function acceptContract() {
    console.log('📝 Контракт принят!');

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

    // Пробуем синхронизировать с Supabase
    setTimeout(async () => {
        if (supabase) {
            await trySaveToSupabase();
        }
    }, 1000);
}

/**
 * Отклоняет контракт
 */
function declineContract() {
    console.log('❌ Контракт отклонен');
    showNotification('Контракт отклонен. Возвращайтесь, когда будете готовы!', 'warning');

    setTimeout(() => {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 50px; color: white; font-family: 'Roboto Mono', monospace;">
                <h2 style="color: #ff3860;">Контракт отклонен</h2>
                <p style="margin: 20px 0;">Система прокачки не активирована</p>
                <button onclick="location.reload()" style="
                    background: linear-gradient(135deg, #00ff88, #00ccff);
                    color: #000;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-family: 'Orbitron', sans-serif;
                    font-weight: bold;
                    cursor: pointer;
                    margin-top: 20px;
                ">
                    НАЧАТЬ ЗАНОВО
                </button>
            </div>
        `;
    }, 2000);
}

/**
 * Начинает игру
 */
function startGame() {
    console.log('🎮 Начало игры!');

    if (appContainer) {
        appContainer.classList.remove('hidden');
    }

    updatePlayerInfo();
    showTab('cabinet');
    setActiveNavButton('tabCabinet');
}

// ===========================================
// 5. ФУНКЦИИ ДЛЯ ВКЛАДОК
// ===========================================

function getCabinetContent() {
    const xpPercent = Math.min(player.xp, 100);

    return `
        <div class="card">
            <h2><i class="fas fa-home"></i> ЛИЧНЫЙ КАБИНЕТ</h2>
            
            <div class="player-info">
                <div class="player-header">
                    <div class="player-avatar">
                        <i class="fas fa-user-secret"></i>
                    </div>
                    <div class="player-name">
                        <h3>${player.codeName}</h3>
                        <p class="player-title">Новичок системы</p>
                    </div>
                </div>
                
                <div class="player-stats">
                    <div class="stat-item">
                        <div class="stat-label">Уровень</div>
                        <div class="stat-value level">${player.level}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Опыт</div>
                        <div class="stat-value xp">${player.xp}/100</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Resolve</div>
                        <div class="stat-value resolve">${player.resolve}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Бриллианты</div>
                        <div class="stat-value diamonds">${player.diamonds} <i class="fas fa-gem"></i></div>
                    </div>
                </div>
            </div>
            
            <div class="progress-container">
                <div class="progress-label">Прогресс до уровня ${player.level + 1}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${xpPercent}%"></div>
                </div>
                <div class="progress-text">${xpPercent}%</div>
            </div>
            
            <div class="characteristics">
                <h3><i class="fas fa-chart-line"></i> ХАРАКТЕРИСТИКИ</h3>
                <div class="characteristics-grid">
                    <div class="char-item">
                        <div class="char-icon strength"><i class="fas fa-dumbbell"></i></div>
                        <div class="char-info">
                            <div class="char-name">Сила</div>
                            <div class="char-value">${player.stats.strength.toFixed(1)}</div>
                        </div>
                    </div>
                    <div class="char-item">
                        <div class="char-icon focus"><i class="fas fa-brain"></i></div>
                        <div class="char-info">
                            <div class="char-name">Концентрация</div>
                            <div class="char-value">${player.stats.focus.toFixed(1)}</div>
                        </div>
                    </div>
                    <div class="char-item">
                        <div class="char-icon will"><i class="fas fa-fire"></i></div>
                        <div class="char-info">
                            <div class="char-name">Воля</div>
                            <div class="char-value">${player.stats.will.toFixed(1)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getQuestsContent() {
    const today = new Date().toISOString().split('T')[0];
    const canDoQuest = player.lastQuestDate !== today;

    return `
        <div class="card">
            <h2><i class="fas fa-tasks"></i> ЕЖЕДНЕВНЫЕ ЗАДАНИЯ</h2>
            <p class="quest-status">${canDoQuest ? '✅ Задания доступны!' : '⏳ Уже выполнено сегодня'}</p>
            
            <div class="quests-list">
                <div class="quest-item">
                    <div class="quest-header">
                        <div class="quest-icon"><i class="fas fa-dumbbell"></i></div>
                        <div class="quest-info">
                            <h3>10 отжиманий</h3>
                            <p class="quest-desc">Развивайте физическую силу</p>
                        </div>
                    </div>
                    <div class="quest-rewards">
                        <span class="reward"><i class="fas fa-star"></i> +10 XP</span>
                        <span class="reward"><i class="fas fa-bolt"></i> +3 Resolve</span>
                        <span class="reward"><i class="fas fa-dumbbell"></i> +0.1 к Силе</span>
                    </div>
                    <button class="quest-button" onclick="completeQuest('strength')" ${!canDoQuest ? 'disabled' : ''}>
                        ${canDoQuest ? 'ВЫПОЛНИТЬ' : 'ВЫПОЛНЕНО'}
                    </button>
                </div>
                
                <div class="quest-item">
                    <div class="quest-header">
                        <div class="quest-icon"><i class="fas fa-book"></i></div>
                        <div class="quest-info">
                            <h3>Читать 30 минут</h3>
                            <p class="quest-desc">Развивайте концентрацию</p>
                        </div>
                    </div>
                    <div class="quest-rewards">
                        <span class="reward"><i class="fas fa-star"></i> +15 XP</span>
                        <span class="reward"><i class="fas fa-bolt"></i> +5 Resolve</span>
                        <span class="reward"><i class="fas fa-brain"></i> +0.1 к Концентрации</span>
                    </div>
                    <button class="quest-button" onclick="completeQuest('focus')" ${!canDoQuest ? 'disabled' : ''}>
                        ${canDoQuest ? 'ВЫПОЛНИТЬ' : 'ВЫПОЛНЕНО'}
                    </button>
                </div>
                
                <div class="quest-item">
                    <div class="quest-header">
                        <div class="quest-icon"><i class="fas fa-sun"></i></div>
                        <div class="quest-info">
                            <h3>Ранний подъем (до 7:00)</h3>
                            <p class="quest-desc">Развивайте силу воли</p>
                        </div>
                    </div>
                    <div class="quest-rewards">
                        <span class="reward"><i class="fas fa-star"></i> +20 XP</span>
                        <span class="reward"><i class="fas fa-bolt"></i> +7 Resolve</span>
                        <span class="reward"><i class="fas fa-fire"></i> +0.1 к Воле</span>
                    </div>
                    <button class="quest-button" onclick="completeQuest('will')" ${!canDoQuest ? 'disabled' : ''}>
                        ${canDoQuest ? 'ВЫПОЛНИТЬ' : 'ВЫПОЛНЕНО'}
                    </button>
                </div>
            </div>
            
            ${!canDoQuest ? `
                <div class="quest-timer">
                    <i class="fas fa-clock"></i>
                    <span>Следующее задание через: <span id="timerCountdown">--:--:--</span></span>
                </div>
            ` : ''}
        </div>
    `;
}

function getShopContent() {
    return `
        <div class="card">
            <h2><i class="fas fa-store"></i> МАГАЗИН СИСТЕМЫ</h2>
            <div class="shop-balance">
                <i class="fas fa-wallet"></i>
                <span>Ваш баланс: <strong>${player.diamonds} <i class="fas fa-gem"></i></strong></span>
            </div>
            
            <div class="shop-items">
                <div class="shop-item">
                    <div class="item-header">
                        <div class="item-icon"><i class="fas fa-bolt"></i></div>
                        <h3>Бустер опыта</h3>
                        <div class="item-price">20 <i class="fas fa-gem"></i></div>
                    </div>
                    <p class="item-desc">+50% XP ко всем заданиям на 24 часа</p>
                    <button class="buy-button" onclick="buyItem('xp_booster', 20)">
                        КУПИТЬ
                    </button>
                </div>
                
                <div class="shop-item">
                    <div class="item-header">
                        <div class="item-icon"><i class="fas fa-heart"></i></div>
                        <h3>Доп. задание</h3>
                        <div class="item-price">30 <i class="fas fa-gem"></i></div>
                    </div>
                    <p class="item-desc">Открывает дополнительное задание на день</p>
                    <button class="buy-button" onclick="buyItem('extra_quest', 30)">
                        КУПИТЬ
                    </button>
                </div>
                
                <div class="shop-item">
                    <div class="item-header">
                        <div class="item-icon"><i class="fas fa-palette"></i></div>
                        <h3>Скин "Неон"</h3>
                        <div class="item-price">50 <i class="fas fa-gem"></i></div>
                    </div>
                    <p class="item-desc">Изменяет цветовую тему интерфейса</p>
                    <button class="buy-button" onclick="buyItem('neon_skin', 50)">
                        КУПИТЬ
                    </button>
                </div>
                
                <div class="shop-item">
                    <div class="item-header">
                        <div class="item-icon"><i class="fas fa-undo"></i></div>
                        <h3>Сброс характеристик</h3>
                        <div class="item-price">100 <i class="fas fa-gem"></i></div>
                    </div>
                    <p class="item-desc">Позволяет перераспределить очки характеристик</p>
                    <button class="buy-button" onclick="buyItem('reset_stats', 100)">
                        КУПИТЬ
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getAchievementsContent() {
    return `
        <div class="card">
            <h2><i class="fas fa-trophy"></i> ДОСТИЖЕНИЯ</h2>
            <p class="achievements-count">Открыто: ${player.achievements.length} из 12</p>
            
            <div class="achievements-list">
                <div class="achievement-item ${player.achievements.includes('first_contract') ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">
                        <i class="fas fa-file-signature"></i>
                    </div>
                    <div class="achievement-info">
                        <h3>Первый контракт</h3>
                        <p>Примите контракт системы</p>
                    </div>
                    <div class="achievement-status">
                        ${player.achievements.includes('first_contract') ? '✅' : '🔒'}
                    </div>
                </div>
                
                <div class="achievement-item ${player.achievements.includes('first_quest') ? 'unlocked' : 'locked'}">
                    <div class="achievement-icon">
                        <i class="fas fa-flag-checkered"></i>
                    </div>
                    <div class="achievement-info">
                        <h3>Первая победа</h3>
                        <p>Выполните первое задание</p>
                    </div>
                    <div class="achievement-status">
                        ${player.achievements.includes('first_quest') ? '✅' : '🔒'}
                    </div>
                </div>
                
                <div class="achievement-item locked">
                    <div class="achievement-icon">
                        <i class="fas fa-layer-group"></i>
                    </div>
                    <div class="achievement-info">
                        <h3>Уровень 5</h3>
                        <p>Достигните 5 уровня</p>
                    </div>
                    <div class="achievement-status">
                        ${player.level >= 5 ? '✅' : '🔒'}
                    </div>
                </div>
                
                <div class="achievement-item locked">
                    <div class="achievement-icon">
                        <i class="fas fa-calendar-day"></i>
                    </div>
                    <div class="achievement-info">
                        <h3>Семь дней силы</h3>
                        <p>Выполняйте задания 7 дней подряд</p>
                    </div>
                    <div class="achievement-status">
                        🔒
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getSettingsContent() {
    return `
        <div class="card">
            <h2><i class="fas fa-cog"></i> НАСТРОЙКИ</h2>
            
            <div class="settings-section">
                <h3><i class="fas fa-bell"></i> Уведомления</h3>
                <div class="setting-item">
                    <span>Напоминания о заданиях</span>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <span>Уведомления об уровне</span>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h3><i class="fas fa-gamepad"></i> Игровые настройки</h3>
                <div class="setting-item">
                    <span>Анимации</span>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-item">
                    <span>Звуковые эффекты</span>
                    <label class="switch">
                        <input type="checkbox" checked>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h3><i class="fas fa-database"></i> Данные</h3>
                <button class="settings-button" onclick="exportData()">
                    <i class="fas fa-download"></i> Экспорт данных
                </button>
                <button class="settings-button" onclick="importData()">
                    <i class="fas fa-upload"></i> Импорт данных
                </button>
                <button class="settings-button danger" onclick="resetGame()">
                    <i class="fas fa-trash"></i> Сбросить игру
                </button>
            </div>
            
            <div class="settings-info">
                <p><i class="fas fa-info-circle"></i> Версия: 1.0.0</p>
                <p><i class="fas fa-code"></i> IRL Level System</p>
            </div>
        </div>
    `;
}

// ===========================================
// 6. ФУНКЦИИ ДЛЯ ВКЛАДОК И ИГРОВОЙ ЛОГИКИ
// ===========================================

function setActiveNavButton(buttonId) {
    navButtons.forEach(btn => btn.classList.remove('active'));
    const activeButton = document.getElementById(buttonId);
    if (activeButton) activeButton.classList.add('active');
}

function showTab(tabName) {
    let content = '';
    switch (tabName) {
        case 'cabinet': content = getCabinetContent(); break;
        case 'quests': content = getQuestsContent(); break;
        case 'shop': content = getShopContent(); break;
        case 'achievements': content = getAchievementsContent(); break;
        case 'settings': content = getSettingsContent(); break;
        default: content = `<div class="card"><h2>Ошибка</h2><p>Вкладка не найдена</p></div>`;
    }
    if (mainContent) {
        mainContent.innerHTML = content;
    }
}

async function completeQuest(type) {
    const today = new Date().toISOString().split('T')[0];

    if (player.lastQuestDate === today) {
        showNotification('Вы уже выполнили задание сегодня!', 'warning');
        return;
    }

    let xpGain = 0, resolveGain = 0, questName = '';
    switch (type) {
        case 'strength': xpGain = 10; resolveGain = 3; questName = '10 отжиманий'; break;
        case 'focus': xpGain = 15; resolveGain = 5; questName = 'Чтение 30 минут'; break;
        case 'will': xpGain = 20; resolveGain = 7; questName = 'Ранний подъем'; break;
        default: return;
    }

    player.lastQuestDate = today;
    player.xp += xpGain;
    player.resolve += resolveGain;
    if (type === 'strength') player.stats.strength += 0.1;
    if (type === 'focus') player.stats.focus += 0.1;
    if (type === 'will') player.stats.will += 0.1;

    if (!player.achievements.includes('first_quest')) {
        player.achievements.push('first_quest');
    }

    await savePlayerData();

    if (player.xp >= 100) {
        levelUp();
    }

    updatePlayerInfo();
    showNotification(`✅ "${questName}" выполнено! +${xpGain} XP, +${resolveGain} Resolve`, 'success');
    setTimeout(() => showTab('quests'), 1000);
}

function levelUp() {
    player.level += 1;
    player.xp = player.xp - 100;
    player.diamonds += 5;
    player.resolve += 10;
    showLevelUpModal();
    if (player.level === 5 && !player.achievements.includes('level_5')) {
        player.achievements.push('level_5');
    }
}

function buyItem(itemId, price) {
    if (player.diamonds < price) {
        showNotification('Недостаточно бриллиантов!', 'error');
        return;
    }
    player.diamonds -= price;
    switch (itemId) {
        case 'xp_booster': showNotification('Бустер опыта активирован!', 'success'); break;
        case 'extra_quest': showNotification('Доп. задание разблокировано!', 'success'); break;
        case 'neon_skin': showNotification('Скин "Неон" применен!', 'success'); break;
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
    const oldLevelEl = document.getElementById('oldLevel');
    const newLevelEl = document.getElementById('newLevel');

    if (oldLevelEl) oldLevelEl.textContent = player.level - 1;
    if (newLevelEl) newLevelEl.textContent = player.level;

    if (levelUpModal) {
        levelUpModal.classList.remove('hidden');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    const container = document.getElementById('notificationContainer');
    if (container) {
        container.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) notification.parentNode.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function resetGame() {
    if (confirm('Вы уверены? Все данные будут удалены!')) {
        const userId = getUserId();
        localStorage.removeItem(`irlLevel_${userId}`);
        localStorage.removeItem('irlLevel_userId');
        location.reload();
    }
}

function exportData() {
    const data = JSON.stringify(player);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irl-level-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
                showNotification('Ошибка импорта данных!', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ===========================================
// 7. ОБРАБОТЧИКИ СОБЫТИЙ
// ===========================================

function setupEventListeners() {
    navButtons.forEach(button => {
        button.addEventListener('click', function () {
            const tab = this.getAttribute('data-tab');
            setActiveNavButton(this.id);
            showTab(tab);
        });
    });

    if (acceptContractBtn) acceptContractBtn.addEventListener('click', acceptContract);
    if (declineContractBtn) declineContractBtn.addEventListener('click', declineContract);
    if (closeLevelUpBtn) {
        closeLevelUpBtn.addEventListener('click', function () {
            if (levelUpModal) {
                levelUpModal.classList.add('hidden');
            }
        });
    }
}

// ===========================================
// 8. ЗАПУСК ПРИЛОЖЕНИЯ (ИСПРАВЛЕННЫЙ)
// ===========================================

window.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Приложение запускается...');

    // Настраиваем обработчики
    setupEventListeners();

    // Показываем загрузку
    showLoadingScreen(async function () {
        // Инициализируем приложение (локально)
        await initApp();

        // Пытаемся подключить Supabase в фоне
        setTimeout(async () => {
            console.log('🔄 Фоновая инициализация Supabase...');
            try {
                if (window.supabase) {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
                        auth: { persistSession: false }
                    });
                    console.log('✅ Supabase клиент создан (фон)');

                    // Пробуем проверить подключение
                    setTimeout(async () => {
                        try {
                            const { data, error } = await supabase
                                .from('players')
                                .select('count', { count: 'exact', head: true })
                                .limit(1);

                            if (error) {
                                console.log('⚠️ Supabase: таблица недоступна', error.message);
                            } else {
                                console.log('✅ Supabase подключен! Записей:', data?.count || 0);

                                // Если игрок уже есть, сохраняем в Supabase
                                if (player.acceptedContract) {
                                    setTimeout(async () => {
                                        await saveToSupabase();
                                    }, 1000);
                                }
                            }
                        } catch (e) {
                            console.log('⚠️ Supabase: ошибка проверки', e.message);
                        }
                    }, 500);
                } else {
                    console.log('❌ Supabase не загрузился в window');
                }
            } catch (error) {
                console.log('⚠️ Ошибка инициализации Supabase:', error.message);
            }
        }, 1500); // Ждем 1.5 секунды после старта
    });
});

// Делаем функции глобальными для обработчиков onclick в HTML
window.completeQuest = completeQuest;
window.buyItem = buyItem;
window.exportData = exportData;
window.importData = importData;
window.resetGame = resetGame;

// Функция для проверки Supabase
window.checkSupabase = async () => {
    console.log('=== ПРОВЕРКА SUPABASE ===');
    console.log('Supabase объект:', supabase);
    console.log('Ключ:', SUPABASE_KEY ? 'Есть' : 'Нет');
    console.log('Telegram User:', telegramUser);
    console.log('Player:', player);

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('players')
                .select('telegram_id', { count: 'exact', head: true });

            console.log('Проверка подключения:', error ? `❌ ${error.message}` : '✅ OK');
            console.log('Количество записей в таблице:', data?.count || 0);
        } catch (e) {
            console.error('Ошибка проверки:', e);
        }
    }
};
