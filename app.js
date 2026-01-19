// ==============================================
// IRL LEVEL - Геймификация жизни
// Основной файл JavaScript
// ==============================================

// Подключаем Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем на весь экран

// Глобальные переменные
let user = null;

// ==============================================
// 1. ФУНКЦИЯ ДЛЯ УНИКАЛЬНЫХ ИМЕН (без повторов)
// ==============================================
function generateUniqueCodeName() {
    // Берем список уже использованных имен
    let usedNames = JSON.parse(localStorage.getItem("usedNames") || "[]");
    
    // Если список пустой, создаем новый
    if (usedNames.length === 0) {
        usedNames = ["A001", "B202", "C303", "D404", "E505"];
        localStorage.setItem("usedNames", JSON.stringify(usedNames));
    }
    
    let name;
    let attempts = 0;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    
    // Пытаемся найти уникальное имя
    do {
        const letter = letters[Math.floor(Math.random() * letters.length)];
        const digits = Math.floor(Math.random() * 900) + 100;
        name = `${letter}${digits}`;
        attempts++;
        
        // Если слишком много попыток, меняем формат
        if (attempts > 50) {
            name = `${letter}${letter}${Math.floor(Math.random() * 90) + 10}`;
        }
    } while (usedNames.includes(name) && attempts < 100);
    
    // Добавляем новое имя в список
    usedNames.push(name);
    localStorage.setItem("usedNames", JSON.stringify(usedNames));
    
    return name;
}

// ==============================================
// 2. АНИМАЦИЯ ЗАГРУЗКИ
// ==============================================
function animateLoading(callback) {
    let width = 0;
    let bar = document.getElementById("progressBar");
    
    // Очищаем предыдущую анимацию
    clearInterval(window.loadingInterval);
    
    window.loadingInterval = setInterval(() => {
        width += 1 + Math.random() * 3; // Случайная скорость
        if (width > 100) width = 100;
        
        bar.style.width = width + "%";
        
        // Меняем цвет при загрузке
        if (width < 30) {
            bar.style.background = "linear-gradient(90deg, #ff0000, #ff6b6b)";
        } else if (width < 70) {
            bar.style.background = "linear-gradient(90deg, #ff6b6b, #4ecdc4)";
        } else {
            bar.style.background = "linear-gradient(90deg, #4ecdc4, #00ff00)";
        }
        
        if (width >= 100) {
            clearInterval(window.loadingInterval);
            setTimeout(() => {
                document.getElementById("loadingScreen").style.display = "none";
                document.body.style.background = "#1e1e1e";
                callback();
            }, 300);
        }
    }, 30);
}

// ==============================================
// 3. ПОКАЗАТЬ ЭКРАН КОНТРАКТА (УЛУЧШЕННЫЙ)
// ==============================================
function showContractScreen() {
    const contractHTML = `
      <div class="card contract-card">
        <h3>🟥 СИСТЕМА «IRL LEVEL» АКТИВИРОВАНА</h3>
        <p>Обнаружено тело без активной прокачки.</p>
        <div class="stats">
          <p>⚡ Физические параметры: <span style="color:#ff0000">24%</span></p>
          <p>🧠 Психическая устойчивость: <span style="color:#ff0000">31%</span></p>
          <p>🔥 Воля к развитию: <span style="color:#ff0000">18%</span></p>
        </div>
        <div class="terms">
          <p>▸ Ежедневные задания на прокачку</p>
          <p>▸ Уровневая система с наградами</p>
          <p>▸ Характеристики: Сила, Концентрация, Воля</p>
          <p>▸ Скрытые достижения и испытания</p>
        </div>
        <p style="font-size:10px; margin-top:20px; color:#aaa;">
          Приняв контракт, вы соглашаетесь на ежедневную работу над собой
        </p>
      </div>
      <div class="button-container">
        <button onclick="acceptContract()" style="background:linear-gradient(145deg, #ff0000, #cc0000);">
          🎯 ПРИНЯТЬ КОНТРАКТ
        </button>
        <button onclick="declineContract()" class="decline-btn">
          ⛔ ОТКЛОНИТЬ
        </button>
      </div>
    `;
    
    document.getElementById("mainContent").innerHTML = contractHTML;
    document.getElementById("mainContent").style.display = "block";
}

// ==============================================
// 4. ПРИНЯТЬ КОНТРАКТ
// ==============================================
function acceptContract() {
    // Создаем нового пользователя
    user = {
        codeName: generateUniqueCodeName(),
        level: 1,
        xp: 0,
        resolve: 10, // Начальный бонус
        diamonds: 5, // Бриллианты для магазина
        acceptedContract: true,
        lastTaskDate: null,
        stats: {
            strength: 1,
            focus: 1,
            will: 1
        },
        createdAt: new Date().toISOString()
    };
    
    // Сохраняем
    localStorage.setItem("userData", JSON.stringify(user));
    
    // Показываем приветствие
    document.getElementById("mainContent").innerHTML = `
        <div class="card" style="border:2px solid gold;">
            <h3>🎉 КОНТРАКТ ПРИНЯТ!</h3>
            <p>Добро пожаловать в систему, <span style="color:gold">${user.codeName}</span>!</p>
            <p>Твой путь к прокачке начинается сейчас.</p>
            <p style="font-size:12px; margin-top:20px;">
                Начальные бонусы:<br>
                🔵 Resolve: +10<br>
                💎 Бриллианты: +5
            </p>
            <button onclick="initApp()" style="margin-top:20px;">
                НАЧАТЬ ПРОКАЧКУ →
            </button>
        </div>
    `;
}

// ==============================================
// 5. ОТКЛОНИТЬ КОНТРАКТ
// ==============================================
function declineContract() {
    document.getElementById("mainContent").innerHTML = `
        <div class="card" style="border:2px solid #666;">
            <h3>⛔ КОНТРАКТ ОТКЛОНЕН</h3>
            <p>Система деактивирована.</p>
            <p style="font-size:12px; color:#aaa; margin-top:20px;">
                Когда будете готовы к изменениям -<br>
                перезапустите приложение
            </p>
        </div>
    `;
    
    // Через 3 секунды предлагаем еще раз
    setTimeout(() => {
        if (!user || !user.acceptedContract) {
            showContractScreen();
        }
    }, 3000);
}

// ==============================================
// 6. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ==============================================
function initApp() {
    // Показываем нижнюю панель
    document.getElementById("bottomNav").style.display = "flex";
    
    // Загружаем данные пользователя
    user = JSON.parse(localStorage.getItem("userData"));
    
    // Показываем вкладку с заданиями
    showTab('tasks');
}

// ==============================================
// 7. ТАЙМЕР ДЛЯ ЗАДАНИЙ (обратный отсчет)
// ==============================================
function getTaskTimer() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `🕒 Доступно через: <span style="color:#4ecdc4">${hours}ч ${minutes}м</span>`;
}

// ==============================================
// 8. ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ==============================================
function showTab(tab) {
    // Обновляем активную кнопку
    document.querySelectorAll('.navButton').forEach(btn => btn.classList.remove('active'));
    const activeTab = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (activeTab) activeTab.classList.add('active');
    
    let content = '';
    const today = new Date().toISOString().slice(0, 10);
    
    switch(tab) {
        case 'cabinet':
            content = `
                <div class="card">
                    <h3>💻 ЛИЧНЫЙ КАБИНЕТ</h3>
                    <p style="font-size:18px; color:gold;">${user.codeName}</p>
                    
                    <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; margin:15px 0;">
                        <p>🏆 Уровень: <span style="color:#4ecdc4">${user.level}</span></p>
                        <p>⚡ XP: ${user.xp}/100</p>
                        <div style="background:#333; height:10px; border-radius:5px; margin:10px 0;">
                            <div style="width:${user.xp}%; background:#4ecdc4; height:100%; border-radius:5px;"></div>
                        </div>
                    </div>
                    
                    <div style="display:flex; justify-content:space-around; margin:20px 0;">
                        <div style="text-align:center;">
                            <div style="font-size:24px;">🔥</div>
                            <div>${user.resolve}</div>
                            <div style="font-size:10px;">Resolve</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:24px;">💎</div>
                            <div>${user.diamonds || 0}</div>
                            <div style="font-size:10px;">Бриллианты</div>
                        </div>
                    </div>
                    
                    <div style="margin-top:20px;">
                        <h4>📊 ХАРАКТЕРИСТИКИ</h4>
                        <p>💪 Сила: ${user.stats.strength}</p>
                        <p>🧠 Концентрация: ${user.stats.focus}</p>
                        <p>🔥 Воля: ${user.stats.will}</p>
                    </div>
                </div>
            `;
            break;
            
        case 'tasks':
            const canDoTask = user.lastTaskDate !== today;
            
            content = `
                <div class="card">
                    <h3>🎯 ЕЖЕДНЕВНЫЕ ЗАДАНИЯ</h3>
                    
                    <div style="text-align:left; margin:20px 0;">
                        <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; margin-bottom:10px;">
                            <p style="margin:0 0 10px 0;">💪 10 отжиманий</p>
                            <p style="font-size:10px; color:#aaa;">Награда: XP +10, Resolve +3</p>
                            ${canDoTask ? 
                                `<button onclick="completeTask('pushups')" class="pulse" style="margin-top:10px;">
                                    ВЫПОЛНИТЬ
                                </button>` :
                                `<div class="timer">${getTaskTimer()}</div>`
                            }
                        </div>
                        
                        <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; margin-bottom:10px;">
                            <p style="margin:0 0 10px 0;">📚 Читать 30 минут</p>
                            <p style="font-size:10px; color:#aaa;">Награда: XP +15, Resolve +5</p>
                            ${canDoTask ? 
                                `<button onclick="completeTask('reading')" class="pulse" style="margin-top:10px;">
                                    ВЫПОЛНИТЬ
                                </button>` :
                                `<div style="color:#888; font-size:12px; margin-top:10px;">Доступно завтра</div>`
                            }
                        </div>
                        
                        <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px;">
                            <p style="margin:0 0 10px 0;">🌅 Ранний подъем (до 7:00)</p>
                            <p style="font-size:10px; color:#aaa;">Награда: XP +20, Resolve +7</p>
                            ${canDoTask ? 
                                `<button onclick="completeTask('wakeup')" class="pulse" style="margin-top:10px;">
                                    ВЫПОЛНИТЬ
                                </button>` :
                                `<div style="color:#888; font-size:12px; margin-top:10px;">Доступно завтра</div>`
                            }
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'shop':
            content = `
                <div class="card">
                    <h3>🛒 МАГАЗИН СИСТЕМЫ</h3>
                    <p>Твои бриллианты: <span style="color:#4ecdc4">${user.diamonds || 0} 💎</span></p>
                    
                    <div style="margin:20px 0;">
                        <div style="background:linear-gradient(145deg, #2a2a2a, #1a1a1a); padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #444;">
                            <p style="margin:0 0 10px 0;">⚡ Бустер опыта (24 часа)</p>
                            <p style="font-size:12px; color:#aaa;">+50% XP ко всем заданиям</p>
                            <button onclick="buyItem('xp_booster')" style="background:linear-gradient(145deg, #f39c12, #e67e22); margin-top:10px;">
                                КУПИТЬ ЗА 20 💎
                            </button>
                        </div>
                        
                        <div style="background:linear-gradient(145deg, #2a2a2a, #1a1a1a); padding:15px; border-radius:10px; margin-bottom:10px; border:1px solid #444;">
                            <p style="margin:0 0 10px 0;">🎨 Скин интерфейса "Неон"</p>
                            <p style="font-size:12px; color:#aaa;">Изменяет цветовую тему</p>
                            <button onclick="buyItem('neon_skin')" style="background:linear-gradient(145deg, #9b59b6, #8e44ad); margin-top:10px;">
                                КУПИТЬ ЗА 50 💎
                            </button>
                        </div>
                        
                        <div style="background:linear-gradient(145deg, #2a2a2a, #1a1a1a); padding:15px; border-radius:10px; border:1px solid #444;">
                            <p style="margin:0 0 10px 0;">🔓 Дополнительное задание</p>
                            <p style="font-size:12px; color:#aaa;">Открывает экстра-квест</p>
                            <button onclick="buyItem('extra_quest')" style="background:linear-gradient(145deg, #e74c3c, #c0392b); margin-top:10px;">
                                КУПИТЬ ЗА 30 💎
                            </button>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'achievements':
            content = `
                <div class="card">
                    <h3>🏆 ДОСТИЖЕНИЯ</h3>
                    
                    <div style="margin:20px 0;">
                        <div style="display:flex; align-items:center; background:rgba(0,0,0,0.3); padding:10px; border-radius:10px; margin-bottom:10px;">
                            <div style="font-size:24px; margin-right:15px;">🥉</div>
                            <div>
                                <p style="margin:0;">Новичок системы</p>
                                <p style="font-size:10px; color:#aaa; margin:5px 0 0 0;">Примите контракт</p>
                            </div>
                            <div style="margin-left:auto; color:gold;">✔️</div>
                        </div>
                        
                        <div style="display:flex; align-items:center; background:rgba(0,0,0,0.3); padding:10px; border-radius:10px; margin-bottom:10px;">
                            <div style="font-size:24px; margin-right:15px;">🔥</div>
                            <div>
                                <p style="margin:0;">Первая прокачка</p>
                                <p style="font-size:10px; color:#aaa; margin:5px 0 0 0;">Выполните первое задание</p>
                            </div>
                            <div style="margin-left:auto; color:#666;">🔒</div>
                        </div>
                        
                        <div style="display:flex; align-items:center; background:rgba(0,0,0,0.3); padding:10px; border-radius:10px;">
                            <div style="font-size:24px; margin-right:15px;">💎</div>
                            <div>
                                <p style="margin:0;">Коллекционер</p>
                                <p style="font-size:10px; color:#aaa; margin:5px 0 0 0;">Соберите 100 бриллиантов</p>
                            </div>
                            <div style="margin-left:auto; color:#666;">🔒</div>
                        </div>
                    </div>
                </div>
            `;
            break;
    }
    
    document.getElementById("mainContent").innerHTML = content;
    document.getElementById("mainContent").style.display = "block";
}

// ==============================================
// 9. ВЫПОЛНЕНИЕ ЗАДАНИЯ
// ==============================================
function completeTask(taskType) {
    const today = new Date().toISOString().slice(0, 10);
    
    // Проверяем, не выполнял ли сегодня
    if (user.lastTaskDate === today) {
        showNotification("⚠️ Задание уже выполнено сегодня!");
        return;
    }
    
    // Награды в зависимости от задания
    let xpReward = 10;
    let resolveReward = 3;
    let message = "Задание выполнено!";
    
    switch(taskType) {
        case 'pushups':
            xpReward = 10;
            resolveReward = 3;
            user.stats.strength += 0.1;
            message = "💪 Сила +0.1!";
            break;
        case 'reading':
            xpReward = 15;
            resolveReward = 5;
            user.stats.focus += 0.1;
            message = "🧠 Концентрация +0.1!";
            break;
        case 'wakeup':
            xpReward = 20;
            resolveReward = 7;
            user.stats.will += 0.1;
            message = "🔥 Воля +0.1!";
            break;
    }
    
    // Добавляем награды
    user.xp += xpReward;
    user.resolve += resolveReward;
    user.lastTaskDate = today;
    
    // Проверяем уровень
    if (user.xp >= 100) {
        user.level += 1;
        user.xp -= 100;
        user.diamonds += 5; // Бонус за уровень
        showNotification(`🎉 УРОВЕНЬ ${user.level} ДОСТИГНУТ! +5 💎`);
    }
    
    // Сохраняем
    localStorage.setItem("userData", JSON.stringify(user));
    
    // Показываем уведомление
    showNotification(`✅ ${message} XP +${xpReward}, Resolve +${resolveReward}`);
    
    // Обновляем вкладку
    setTimeout(() => showTab('tasks'), 1000);
}

// ==============================================
// 10. ПОКУПКА В МАГАЗИНЕ
// ==============================================
function buyItem(itemId) {
    const prices = {
        'xp_booster': 20,
        'neon_skin': 50,
        'extra_quest': 30
    };
    
    const price = prices[itemId];
    
    if (user.diamonds < price) {
        showNotification("❌ Недостаточно бриллиантов!");
        return;
    }
    
    user.diamonds -= price;
    localStorage.setItem("userData", JSON.stringify(user));
    
    showNotification(`✅ Покупка совершена! Осталось: ${user.diamonds} 💎`);
    
    // Обновляем магазин
    setTimeout(() => showTab('shop'), 1000);
}

// ==============================================
// 11. УВЕДОМЛЕНИЯ
// ==============================================
function showNotification(message) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        border-left: 5px solid #4ecdc4;
        z-index: 1000;
        animation: slideDown 0.3s ease-out;
        max-width: 90%;
        text-align: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
    `;
    
    notification.innerHTML = message;
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideUp 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Добавляем стили для анимации уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { top: -100px; opacity: 0; }
        to { top: 20px; opacity: 1; }
    }
    @keyframes slideUp {
        from { top: 20px; opacity: 1; }
        to { top: -100px; opacity: 0; }
    }
`;
document.head.appendChild(style);

// ==============================================
// 12. ЗАПУСК ПРИЛОЖЕНИЯ ПРИ ЗАГРУЗКЕ
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem("userData");
    
    if (savedUser) {
        user = JSON.parse(savedUser);
        
        if (user.acceptedContract) {
            // Показываем анимацию загрузки
            animateLoading(() => {
                initApp();
            });
        } else {
            animateLoading(() => {
                showContractScreen();
            });
        }
    } else {
        // Первый запуск
        animateLoading(() => {
            showContractScreen();
        });
    }
});

// ==============================================
// ФУНКЦИЯ ДЛЯ ТЕСТИРОВАНИЯ (удобно для отладки)
// ==============================================
function resetApp() {
    if (confirm("Сбросить все данные и начать заново?")) {
        localStorage.clear();
        location.reload();
    }
}

// Добавляем скрытую кнопку сброса (удерживать 5 секунд)
let resetTimer;
document.addEventListener('DOMContentLoaded', function() {
    const loadingScreen = document.getElementById('loadingScreen');
    
    loadingScreen.addEventListener('touchstart', function() {
        resetTimer = setTimeout(() => {
            resetApp();
        }, 5000);
    });
    
    loadingScreen.addEventListener('touchend', function() {
        clearTimeout(resetTimer);
    });
    
    loadingScreen.addEventListener('mousedown', function() {
        resetTimer = setTimeout(() => {
            resetApp();
        }, 5000);
    });
    
    loadingScreen.addEventListener('mouseup', function() {
        clearTimeout(resetTimer);
