 window.addEventListener('DOMContentLoaded', checkForDangerousUsername);
        // Основні змінні гри
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const hpDisplay = document.getElementById('hpDisplay');
        const scoreHud = document.getElementById('scoreHud');
        const levelHud = document.getElementById('levelHud');
        const gameOverScreen = document.getElementById('gameOver');
        const scoreDisplay = document.getElementById('scoreDisplay');
        const restartButton = document.getElementById('restartButton');
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingProgress = document.getElementById('loadingProgress');
        const mainMenu = document.getElementById('mainMenu');
        const startButton = document.getElementById('startButton');
        
        // Розміри canvas
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        function sanitizeUsername(username) {
            if (!username) return 'Гість';
            
            // Видаляємо всі HTML-теги
            username = username.replace(/<[^>]*>/g, '');
            
            // Замінюємо спецсимволи на HTML-сутності
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '/': '&#x2F;'
            };
            
            return username.replace(/[&<>"'/]/g, function(m) { return map[m]; });
        }

        function isUsernameValid(username) {
            if (!username || username.length > 20) return false;
            return /^[a-zA-Zа-яА-ЯїЇіІєЄґҐ0-9 ]+$/.test(username);
        }
        // Змінні гри
        let gameRunning = false;
        let score = 0;
        let level = 1;
        let gameTime = 0;
        let lastBossTime = 0;
        let lastCoinSpawnTime = 0;
        let kits = [];
        let bossActive = false;

        // Базові ймовірності появи об'єктів (коли боса немає)
        const baseSpawnRates = {
            asteroid: 0.005,
            enemy: 0.005,
            kit: 0.005,
            boss: 0.005
        };
        
        // Завантаження зображень
        const imagePaths = {
            player: 'player.svg',
            enemy: 'enemy.svg',
            boss: 'boss.svg',
            asteroid: 'asteroid.svg',
            coin: 'astronaut.svg',
            bullet: 'bullet.svg',
            enemyBullet: 'enemy_bullet.svg',
            bossBullet: 'boss_bullet.svg',
            kit: 'kit.svg'
        };
        
        const images = {};
        let imagesLoaded = 0;
        const totalImages = Object.keys(imagePaths).length;
        
        // Функція для завантаження SVG
        function loadImages() {
            loadingScreen.style.display = "flex";
            mainMenu.style.display = "none";
            
            Object.keys(imagePaths).forEach(key => {
                const img = new Image();
                img.onload = () => {
                    imagesLoaded++;
                    loadingProgress.value = (imagesLoaded / totalImages) * 100;
                    if (imagesLoaded === totalImages) {
                        loadingScreen.style.display = 'none';
                        mainMenu.style.display = 'flex';
                    }
                };
                img.onerror = () => {
                    console.error(`Помилка завантаження зображення: ${imagePaths[key]}`);
                    images[key] = createPlaceholderImage(key);
                    imagesLoaded++;
                    loadingProgress.value = (imagesLoaded / totalImages) * 100;
                    if (imagesLoaded === totalImages) {
                        loadingScreen.style.display = 'none';
                        mainMenu.style.display = 'flex';
                    }
                };
                img.src = imagePaths[key];
                images[key] = img;
            });
        }

        //аптечки
    function spawnKit() {
        const size = 25; // трохи більше за астронавтів
        const x = Math.random() * (canvas.width - size);
        const y = -size;
        const speed = Math.random() * 2 + 1;
        const healAmount = 5 + Math.floor(Math.random() * 10); // кількість HP для лікування
        
        kits.push({
            x: x,
            y: y,
            width: size,
            height: size,
            speed: speed,
            heal: healAmount,
            rotation: 0
        });
    }
        
        // Створення заглушки для зображення
        function createPlaceholderImage(type) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let width, height, color;
            
            switch(type) {
                case 'player':
                    width = 40;
                    height = 60;
                    color = '#3498db';
                    break;
                case 'enemy':
                    width = 30;
                    height = 30;
                    color = '#e74c3c';
                    break;
                case 'boss':
                    width = 80;
                    height = 80;
                    color = '#9b59b6';
                    break;
                case 'asteroid':
                    width = 40;
                    height = 40;
                    color = '#95a5a6';
                    break;
                case 'coin':
                    width = 20;
                    height = 20;
                    color = '#f1c40f';
                    break;
                case 'bullet':
                    width = 5;
                    height = 15;
                    color = '#f1c40f';
                    break;
                case 'enemyBullet':
                    width = 5;
                    height = 15;
                    color = '#e74c3c';
                    break;
                case 'bossBullet':
                    width = 8;
                    height = 8;
                    color = '#9b59b6';
                    break;
                default:
                    width = 20;
                    height = 20;
                    color = '#ffffff';
            }
            
            canvas.width = width;
            canvas.height = height;
            
            if (type === 'asteroid') {
                ctx.beginPath();
                ctx.arc(width/2, height/2, width/2, 0, Math.PI*2);
                ctx.fillStyle = color;
                ctx.fill();
            } else if (type === 'coin') {
                ctx.beginPath();
                ctx.arc(width/2, height/2, width/2, 0, Math.PI*2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', width/2, height/2);
            } else {
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, width, height);
            }
            
            const img = new Image();
            img.src = canvas.toDataURL();
            return img;
        }
        
        // Ініціалізація гри після завантаження зображень
        function initGame() {
            // Гравця
            player.x = canvas.width / 2;
            player.y = canvas.height / 2;
            player.targetX = canvas.width / 2;
            player.targetY = canvas.height / 2;
            player.hp = player.maxHp;
            player.bullets = [];
            
            // Скидання інших змінних
            score = 0;
            level = 1;
            gameTime = 0;
            lastBossTime = 0;
            lastCoinSpawnTime = 0;
            bossActive = false;
            
            enemies = [];
            asteroids = [];
            coins = [];
            explosions = [];
            boss = null;
            
            gameRunning = true;
            gameOverScreen.style.display = 'none';
            
            // Оновлення HUD
            hpDisplay.textContent = player.hp;
            scoreHud.textContent = score;
            levelHud.textContent = level;
            
            // Запуск гри
            gameLoop();
        }
        
        // Гравця
        const player = {
            x: 0,
            y: 0,
            width: 40,
            height: 60,
            speed: 8,
            hp: 100,
            maxHp: 100,
            bullets: [],
            lastShot: 0,
            shootDelay: 300,
            targetX: 0,
            targetY: 0
        };
        
        // Вороги
        let enemies = [];
        let asteroids = [];
        let coins = [];
        let explosions = [];
        let boss = null;
        
        // Обробник подій торкання
        canvas.addEventListener('touchstart', handleTouch);
        canvas.addEventListener('touchmove', handleTouch);
        
        function handleTouch(e) {
            e.preventDefault();
            const touch = e.touches[0];
            player.targetX = touch.clientX;
            player.targetY = touch.clientY;
        }
        
        // Обробник кліків миші (для тестування на ПК)
        canvas.addEventListener('mousemove', (e) => {
            player.targetX = e.clientX;
            player.targetY = e.clientY;
        });
        
        // Постріл
        function shoot() {
            player.bullets.push({
                x: player.x,
                y: player.y - player.height / 2,
                width: 5,
                height: 15,
                speed: 12
            });
        }
        
        // Генерація астероїдів
        function spawnAsteroid() {
            const size = Math.random() * 30 + 20;
            const x = Math.random() * (canvas.width - size);
            const y = -size;
            const speed = Math.random() * 2 + 1 + level * 0.2;
            
            asteroids.push({
                x: x,
                y: y,
                width: size,
                height: size,
                speed: speed,
                hp: Math.floor(size / 10),
                maxHp: Math.floor(size / 10),
                rotation: Math.random() * 360
            });
        }
        
        // Генерація ворогів
        function spawnEnemy() {
            const size = Math.random() * 20 + 30;
            const x = Math.random() * (canvas.width - size);
            const y = -size;
            const speed = Math.random() * 1.5 + 1 + level * 0.1;
            
            enemies.push({
                x: x,
                y: y,
                width: size,
                height: size,
                speed: speed,
                hp: 3 + Math.floor(level / 2),
                maxHp: 3 + Math.floor(level / 2),
                bullets: [],
                lastShot: 0,
                shootDelay: 2000 - level * 100,
                shootChance: 0.02 + level * 0.005,
                rotation: Math.random() * 30 - 15,
                targetRotation: 0,
                rotationSpeed: 0.5
            });
        }
        
        // Генерація монет
        function spawnCoin() {
            const size = 35;
            const x = Math.random() * (canvas.width - size);
            const y = -size;
            const speed = Math.random() * 2 + 1;
            const value = 10 + Math.floor(Math.random() * 20);
            
            coins.push({
                x: x,
                y: y,
                width: size,
                height: size,
                speed: speed,
                value: value,
                rotation: 0
            });
        }

        // Генерація боса
        function spawnBoss() {
            const size = 80;
            const x = canvas.width / 2 - size / 2;
            const y = -size;
            
            boss = {
                x: x,
                y: y,
                width: size,
                height: size,
                speed: 1,
                hp: 50 + level * 20,
                maxHp: 50 + level * 20,
                bullets: [],
                lastShot: 0,
                shootDelay: 1000 - level * 50,
                movePattern: 0,
                moveTimer: 0,
                rotation: Math.random() * 30 - 15,
                targetRotation: 0,
                rotationSpeed: 0.3
            };
            
            bossActive = true;
            lastBossTime = gameTime;
        }
        
        // Оновлення стану гри
        function update() {
            if (!gameRunning) return;
            
            gameTime += 16; // ~60 FPS
            
            // Автоматичний постріл гравця
            const now = Date.now();
            if (now - player.lastShot > player.shootDelay) {
                shoot();
                player.lastShot = now;
            }
            
            // Генерація монет
            if (gameTime - lastCoinSpawnTime > 2000) {
                if (Math.random() < 0.5) {
                    spawnCoin();
                }
                lastCoinSpawnTime = gameTime;
            }
            
            // Оновлення гравця
            const dx = player.targetX - player.x;
            const dy = player.targetY - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > player.speed) {
                player.x += dx / distance * player.speed;
                player.y += dy / distance * player.speed;
            } else {
                player.x = player.targetX;
                player.y = player.targetY;
            }
            
            // Обмеження руху гравця
            player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
            player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
            
            // Оновлення куль гравця
            for (let i = player.bullets.length - 1; i >= 0; i--) {
                const bullet = player.bullets[i];
                bullet.y -= bullet.speed;
                
                // Видалення куль за межі екрану
                if (bullet.y + bullet.height < 0) {
                    player.bullets.splice(i, 1);
                    continue;
                }
                
                // Перевірка зіткнень з астероїдами
                for (let j = asteroids.length - 1; j >= 0; j--) {
                    const asteroid = asteroids[j];
                    if (checkCollision(bullet, asteroid)) {
                        asteroid.hp--;
                        player.bullets.splice(i, 1);
                        
                        createExplosion(bullet.x, bullet.y, 10);
                        
                        if (asteroid.hp <= 0) {
                            createExplosion(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2, asteroid.width / 2);
                            asteroids.splice(j, 1);
                            score += 5;
                        }
                        break;
                    }
                }
                
                // Перевірка зіткнень з ворогами
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const enemy = enemies[j];
                    if (checkCollision(bullet, enemy)) {
                        enemy.hp--;
                        player.bullets.splice(i, 1);
                        
                        createExplosion(bullet.x, bullet.y, 10);
                        
                        if (enemy.hp <= 0) {
                            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2);
                            enemies.splice(j, 1);
                            score += 10 + level;
                        }
                        break;
                    }
                }
                
                // Перевірка зіткнень з босом
                if (boss && checkCollision(bullet, boss)) {
                    boss.hp--;
                    player.bullets.splice(i, 1);
                    
                    createExplosion(bullet.x, bullet.y, 15);
                    
                    if (boss.hp <= 0) {
                        createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.width);
                        boss = null;
                        bossActive = false;
                        score += 100 + level * 20;
                        level++;
                    }
                }
            }
            
            // Оновлення астероїдів
            for (let i = asteroids.length - 1; i >= 0; i--) {
                const asteroid = asteroids[i];
                asteroid.y += asteroid.speed;
                asteroid.rotation += 0.5;
                
                // Видалення астероїдів за межі екрану
                if (asteroid.y - asteroid.height > canvas.height) {
                    asteroids.splice(i, 1);
                    continue;
                }
                
                // Перевірка зіткнення з гравцем
                if (checkCollision(player, asteroid)) {
                    player.hp -= 5;
                    asteroids.splice(i, 1);
                    createExplosion(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2, asteroid.width / 2);
                    
                    if (player.hp <= 0) {
                        player.hp = 0;
                        gameOver();
                    }
                }
            }
        // Оновлення аптечок
        for (let i = kits.length - 1; i >= 0; i--) {
            const kit = kits[i];
            kit.y += kit.speed;
            kit.rotation += 2;
            
            // Видалення аптечок за межі екрану
            if (kit.y - kit.height > canvas.height) {
                kits.splice(i, 1);
                continue;
            }
            
            // Перевірка зіткнення з гравцем
            if (checkCollision(player, kit)) {
                player.hp = Math.min(player.maxHp, player.hp + kit.heal);
                kits.splice(i, 1);
            }
        }
            
            // Оновлення ворогів
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                enemy.y += enemy.speed;
                
                // Плавне обертання ворогів
                if (Math.abs(enemy.rotation - enemy.targetRotation) < 1) {
                    enemy.targetRotation = Math.random() * 30 - 15;
                }
                
                if (enemy.rotation < enemy.targetRotation) {
                    enemy.rotation += enemy.rotationSpeed;
                } else if (enemy.rotation > enemy.targetRotation) {
                    enemy.rotation -= enemy.rotationSpeed;
                }
                
                // Видалення ворогів за межі екрану
                if (enemy.y - enemy.height > canvas.height) {
                    enemies.splice(i, 1);
                    continue;
                }
                
                // Постріл ворога
                const now = Date.now();
                if (Math.random() < enemy.shootChance && now - enemy.lastShot > enemy.shootDelay) {
                    enemy.bullets.push({
                        x: enemy.x + enemy.width / 2,
                        y: enemy.y + enemy.height,
                        width: 5,
                        height: 15,
                        speed: 5
                    });
                    enemy.lastShot = now;
                }
                
                // Оновлення куль ворогів
                for (let j = enemy.bullets.length - 1; j >= 0; j--) {
                    const bullet = enemy.bullets[j];
                    bullet.y += bullet.speed;
                    
                    // Видалення куль за межі екрану
                    if (bullet.y > canvas.height) {
                        enemy.bullets.splice(j, 1);
                        continue;
                    }
                    
                    // Перевірка зіткнення з гравцем
                    if (checkCollision(bullet, player)) {
                        player.hp -= 10;
                        enemy.bullets.splice(j, 1);
                        createExplosion(bullet.x, bullet.y, 10);
                        
                        if (player.hp <= 0) {
                            player.hp = 0;
                            gameOver();
                        }
                    }
                }
                
                // Перевірка зіткнення з гравцем
                if (checkCollision(player, enemy)) {
                    player.hp -= 15;
                    enemies.splice(i, 1);
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2);
                    
                    if (player.hp <= 0) {
                        player.hp = 0;
                        gameOver();
                    }
                }
            }
            
            // Оновлення боса
            if (boss) {
                // Рух боса
                boss.moveTimer++;
                if (boss.moveTimer > 60) {
                    boss.movePattern = (boss.movePattern + 1) % 4;
                    boss.moveTimer = 0;
                }
                
                switch (boss.movePattern) {
                    case 0: // Рух вправо
                        boss.x += boss.speed;
                        if (boss.x + boss.width > canvas.width) {
                            boss.x = canvas.width - boss.width;
                            boss.movePattern = 1;
                        }
                        break;
                    case 1: // Рух вниз
                        boss.y += boss.speed;
                        if (boss.y + boss.height > canvas.height / 3) {
                            boss.y = canvas.height / 3;
                            boss.movePattern = 2;
                        }
                        break;
                    case 2: // Рух вліво
                        boss.x -= boss.speed;
                        if (boss.x < 0) {
                            boss.x = 0;
                            boss.movePattern = 3;
                        }
                        break;
                    case 3: // Рух вгору
                        boss.y -= boss.speed;
                        if (boss.y < 0) {
                            boss.y = 0;
                            boss.movePattern = 0;
                        }
                        break;
                }
                
                // Плавне обертання боса
                if (Math.abs(boss.rotation - boss.targetRotation) < 1) {
                    boss.targetRotation = Math.random() * 30 - 15;
                }
                
                if (boss.rotation < boss.targetRotation) {
                    boss.rotation += boss.rotationSpeed;
                } else if (boss.rotation > boss.targetRotation) {
                    boss.rotation -= boss.rotationSpeed;
                }
                
                // Постріл боса
                const now = Date.now();
                if (now - boss.lastShot > boss.shootDelay) {
                    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                        boss.bullets.push({
                            x: boss.x + boss.width / 2,
                            y: boss.y + boss.height / 2,
                            width: 8,
                            height: 8,
                            speedX: Math.cos(angle) * 4,
                            speedY: Math.sin(angle) * 4
                        });
                    }
                    boss.lastShot = now;
                }
                
                // Оновлення куль боса
                for (let i = boss.bullets.length - 1; i >= 0; i--) {
                    const bullet = boss.bullets[i];
                    bullet.x += bullet.speedX;
                    bullet.y += bullet.speedY;
                    
                    // Видалення куль за межі екрану
                    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
                        boss.bullets.splice(i, 1);
                        continue;
                    }
                    
                    // Перевірка зіткнення з гравцем
                    if (checkCollision(bullet, player)) {
                        player.hp -= 15;
                        boss.bullets.splice(i, 1);
                        createExplosion(bullet.x, bullet.y, 15);
                        
                        if (player.hp <= 0) {
                            player.hp = 0;
                            gameOver();
                        }
                    }
                }
                
                // Перевірка зіткнення з гравцем
                if (checkCollision(player, boss)) {
                    player.hp -= 20;
                    createExplosion(player.x, player.y, 30);
                    
                    if (player.hp <= 0) {
                        player.hp = 0;
                        gameOver();
                    }
                }
            }
            
            // Оновлення монет
            for (let i = coins.length - 1; i >= 0; i--) {
                const coin = coins[i];
                coin.y += coin.speed;
                coin.rotation += 2;
                
                // Видалення монет за межі екрану
                if (coin.y - coin.height > canvas.height) {
                    coins.splice(i, 1);
                    continue;
                }
                
                // Перевірка зіткнення з гравцем
                if (checkCollision(player, coin)) {
                    score += coin.value;
                    coins.splice(i, 1);
                }
            }
            
            // Оновлення вибухів
            for (let i = explosions.length - 1; i >= 0; i--) {
                const explosion = explosions[i];
                explosion.radius += explosion.growth;
                explosion.alpha -= 0.02;
                
                if (explosion.alpha <= 0) {
                    explosions.splice(i, 1);
                }
            }
            
            // Отримуємо поточні ймовірності появи об'єктів
            const currentSpawnRates = {
                asteroid: boss ? baseSpawnRates.asteroid * 0.6 : baseSpawnRates.asteroid, // Зменшуємо на 40% коли є бос
                enemy: boss ? baseSpawnRates.enemy * 0.6 : baseSpawnRates.enemy, // Зменшуємо на 40% коли є бос
                kit: baseSpawnRates.kit, // Аптечки залишаються з тією ж ймовірністю
                boss: baseSpawnRates.boss
            };

            // Генерація нових об'єктів з урахуванням поточних ймовірностей
            if (Math.random() < currentSpawnRates.asteroid + level * 0.002) {
                spawnAsteroid();
            }

            if (Math.random() < currentSpawnRates.enemy + level * 0.001) {
                spawnEnemy();
            }

            if (Math.random() < currentSpawnRates.kit) {
                spawnKit();
            }

            const bossCooldown = 20000 + level * 5000; // 20s + 5s за рівень
            if (!bossActive && gameTime - lastBossTime > bossCooldown && Math.random() < currentSpawnRates.boss) {
                spawnBoss();
            }
            
            // Оновлення HUD
            hpDisplay.textContent = player.hp;
            scoreHud.textContent = score;
            levelHud.textContent = level;
        }
        
        // Перевірка зіткнення
        function checkCollision(obj1, obj2) {
            return obj1.x < obj2.x + obj2.width &&
                   obj1.x + obj1.width > obj2.x &&
                   obj1.y < obj2.y + obj2.height &&
                   obj1.y + obj1.height > obj2.y;
        }
        
        // Створення вибуху
        function createExplosion(x, y, radius) {
            explosions.push({
                x: x,
                y: y,
                radius: radius / 2,
                maxRadius: radius,
                growth: radius / 20,
                color: `hsl(${Math.random() * 60 + 10}, 100%, 50%)`,
                alpha: 1
            });
        }
        
        // Кінець гри
        function gameOver() {
            gameRunning = false;
            scoreDisplay.textContent = `Ваш рахунок: ${score}`;
            gameOverScreen.style.display = 'flex';

            sendGameResultsToBot(score);
        }
        
        // Перезапуск гри
        restartButton.addEventListener('click', () => {
            initGame();
        });
        
        // Початок гри з меню
        startButton.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            initGame();
        });
        
        // Відображення гри
        function render() {
            // Очищення canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Малювання космічного фону
            drawSpaceBackground();
            
            // Малювання гравця
            if (images.player.complete) {
                ctx.drawImage(
                    images.player, 
                    player.x - player.width/2, 
                    player.y - player.height/2, 
                    player.width, 
                    player.height
                );
            }
            
            // Малювання куль гравця
            player.bullets.forEach(bullet => {
                if (images.bullet.complete) {
                    ctx.drawImage(images.bullet, bullet.x, bullet.y, bullet.width, bullet.height);
                }
            });

            // Малювання аптечок
            kits.forEach(kit => {
                if (images.kit.complete) {
                    ctx.save();
                    ctx.translate(kit.x + kit.width/2, kit.y + kit.height/2);
                    ctx.rotate(kit.rotation * Math.PI/180);
                    ctx.drawImage(images.kit, -kit.width/2, -kit.height/2, kit.width, kit.height);
                    ctx.restore();
                }
            });
            
            // Малювання астероїдів
            asteroids.forEach(asteroid => {
                if (images.asteroid.complete) {
                    ctx.save();
                    ctx.translate(asteroid.x + asteroid.width/2, asteroid.y + asteroid.height/2);
                    ctx.rotate(asteroid.rotation * Math.PI/180);
                    ctx.drawImage(images.asteroid, -asteroid.width/2, -asteroid.height/2, asteroid.width, asteroid.height);
                    ctx.restore();
                }
                

            });
            
            // Малювання ворогів
            enemies.forEach(enemy => {
                if (images.enemy.complete) {
                    ctx.save();
                    ctx.translate(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    ctx.rotate(enemy.rotation * Math.PI/180);
                    ctx.drawImage(images.enemy, -enemy.width/2, -enemy.height/2, enemy.width, enemy.height);
                    ctx.restore();
                }
                
                // Відображення HP ворога
                
                // Малювання куль ворогів
                enemy.bullets.forEach(bullet => {
                    if (images.enemyBullet.complete) {
                        ctx.drawImage(images.enemyBullet, bullet.x, bullet.y, bullet.width, bullet.height);
                    }
                });
            });
            
            // Малювання боса
            if (boss && images.boss.complete) {
                ctx.save();
                ctx.translate(boss.x + boss.width/2, boss.y + boss.height/2);
                ctx.rotate(boss.rotation * Math.PI/180);
                ctx.drawImage(images.boss, -boss.width/2, -boss.height/2, boss.width, boss.height);
                ctx.restore();
                
                // Відображення HP боса
                const hpPercent = boss.hp / boss.maxHp;
                const barWidth = boss.width;
                const barHeight = 5;
                const barX = boss.x;
                const barY = boss.y - 10;
                
                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                
                ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.2 ? '#f39c12' : '#e74c3c';
                ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
                
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barWidth, barHeight);
            }
            
            // Малювання куль боса
            if (boss) {
                boss.bullets.forEach(bullet => {
                    if (images.bossBullet.complete) {
                        ctx.drawImage(images.bossBullet, bullet.x, bullet.y, bullet.width, bullet.height);
                    }
                });
            }
            
            // Малювання монет
            coins.forEach(coin => {
                if (images.coin.complete) {
                    ctx.save();
                    ctx.translate(coin.x + coin.width/2, coin.y + coin.height/2);
                    ctx.rotate(coin.rotation * Math.PI/180);
                    ctx.drawImage(images.coin, -coin.width/2, -coin.height/2, coin.width, coin.height);
                    ctx.restore();
                }
            });
            
            // Малювання вибухів
            explosions.forEach(explosion => {
                ctx.globalAlpha = explosion.alpha;
                
                const gradient = ctx.createRadialGradient(
                    explosion.x, explosion.y, 0,
                    explosion.x, explosion.y, explosion.radius
                );
                gradient.addColorStop(0, explosion.color);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.globalAlpha = 1;
            });
        }
        
        // Малювання космічного фону
        function drawSpaceBackground() {
            // Темний фіолетовий фон
            ctx.fillStyle = '#0a001a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Зірки
            if (!window.stars) {
                window.stars = [];
                for (let i = 0; i < 300; i++) {
                    window.stars.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        size: Math.random() * 1.5 + 0.5,
                        alpha: Math.random() * 0.8 + 0.2,
                        twinkleSpeed: Math.random() * 0.05 + 0.01,
                        twinklePhase: Math.random() * Math.PI * 2
                    });
                }
            }
            
            // Оновлення та малювання зірок
            const now = Date.now();
            window.stars.forEach(star => {
                star.twinklePhase += star.twinkleSpeed;
                const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
                
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
                ctx.fillRect(star.x, star.y, star.size, star.size);
            });
            
            // Туманності
            if (!window.nebulas) {
                window.nebulas = [];
                // Фіалетові туманності
                for (let i = 0; i < 2; i++) {
                    window.nebulas.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        radius: Math.random() * 300 + 150,
                        color: `hsla(${Math.random() * 30 + 270}, 80%, 50%, ${Math.random() * 0.1 + 0.05})`
                    });
                }
                // Блакитні туманності
                for (let i = 0; i < 1; i++) {
                    window.nebulas.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        radius: Math.random() * 250 + 100,
                        color: `hsla(${Math.random() * 30 + 200}, 80%, 50%, ${Math.random() * 0.1 + 0.05})`
                    });
                }
            }
            
            // Малювання туманностей
            window.nebulas.forEach(nebula => {
                const gradient = ctx.createRadialGradient(
                    nebula.x, nebula.y, 0,
                    nebula.x, nebula.y, nebula.radius
                );
                gradient.addColorStop(0, nebula.color);
                gradient.addColorStop(1, 'hsla(270, 80%, 10%, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(nebula.x, nebula.y, nebula.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        }
        
        // Головний цикл гри
        function gameLoop() {
            update();
            render();
            if (gameRunning) {
                requestAnimationFrame(gameLoop);
            }
        }

        function getUsernameFromUrl() {
            const urlParams = new URLSearchParams(window.location.search);
            const username = urlParams.get('username');
            return sanitizeUsername(username) || 'Гість';
        }

        async function sendGameResultsToBot(score) {
            checkForDangerousUsername();
            const username = getUsernameFromUrl();
                
                // Додаткова перевірка перед відправкою
                if (!isUsernameValid(username)) {
                    console.error('Неприпустиме ім\'я користувача');
                    return;
                }

                const webAppUrl = 'https://script.google.com/macros/s/AKfycbxXRv8RppxeoCnZ6-uA127lOIv9ePbg8_O45FC2oAxypol-vJnvckbEz0I2AzL1BGU/exec';

                try {
                    const response = await fetch(webAppUrl, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ username: sanitizeUsername(username), score }),
                        mode: 'no-cors'
                    });
                    console.log('Результат відправлено');
                } catch (error) {
                    console.error('Помилка відправки:', error);
                }
        }

        // Елементи рейтингу
const ratingButton = document.getElementById('ratingButton');
const ratingButtonGameOver = document.getElementById('ratingButtonGameOver');
const ratingModal = document.getElementById('ratingModal');
const ratingList = document.getElementById('ratingList');
const closeRating = document.getElementById('closeRating');

// Обробники кліків для кнопок рейтингу
ratingButton.addEventListener('click', showRating);
ratingButtonGameOver.addEventListener('click', showRating);
closeRating.addEventListener('click', () => {
    ratingModal.style.display = 'none';
});

// Функція для відображення рейтингу
async function showRating() {
    ratingModal.style.display = 'flex';
    ratingList.innerHTML = '<p style="color: white; text-align: center;">Завантаження...</p>';
    
    try {
        // Використовуємо JSONP підхід для обходу CORS
        const callbackName = 'handleRatingData_' + Date.now();
        window[callbackName] = function(data) {
            // Обробка даних
            if (data && data.length > 0) {
                ratingList.innerHTML = '';
                data.forEach((player, index) => {
                    const playerElement = document.createElement('div');
                    playerElement.className = 'rating-item';
                    playerElement.innerHTML = `
                        <span class="rating-position">${index + 1}.</span>
                        <span class="rating-name">${sanitizeUsername(player[0] || 'Невідомий')}</span>
                        <span class="rating-score">${player[1] || 0}</span>
                    `;
                    ratingList.appendChild(playerElement);
                });
            } else {
                ratingList.innerHTML = '<p style="color: white; text-align: center;">Рейтинг порожній</p>';
            }
            // Видаляємо тимчасову функцію
            delete window[callbackName];
        };

        // Створюємо script тег для JSONP запиту
        const script = document.createElement('script');
        script.src = `https://script.google.com/macros/s/AKfycbxXRv8RppxeoCnZ6-uA127lOIv9ePbg8_O45FC2oAxypol-vJnvckbEz0I2AzL1BGU/exec?callback=${callbackName}`;
        document.body.appendChild(script);
        
        // Видаляємо script тег після завантаження
        script.onload = function() {
            document.body.removeChild(script);
        };
        
    } catch (error) {
        console.error('Помилка завантаження рейтингу:', error);
        ratingList.innerHTML = `
            <p style="color: #e74c3c; text-align: center;">Помилка завантаження рейтингу</p>
            <p style="color: white; text-align: center; font-size: 14px;">${error.message}</p>
        `;
    }
}
function checkForDangerousUsername() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    
    if (!username) {
        alert('Відсутнє ім\'я користувача');
        document.body.innerHTML = '';
        throw new Error('Відсутнє ім\'я користувача');
    }
    
    if (!isUsernameValid(username)) {
        alert('Невірний формат імені користувача. Дозволені тільки літери, цифри та пробіли.');
        document.body.innerHTML = '';
        throw new Error('Невірне ім\'я користувача');
    }
    
    // Додатковий захист на випадок, якщо хтось модифікує код після завантаження
    return sanitizeUsername(username);
}
        loadImages();