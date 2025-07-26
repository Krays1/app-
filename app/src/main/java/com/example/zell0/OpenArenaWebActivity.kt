package com.example.zell0

import android.annotation.SuppressLint
import android.content.Context
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebSettings
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import android.util.Log

class OpenArenaWebActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "OpenArenaWebActivity"
    }
    
    private lateinit var webView: WebView
    private lateinit var networkManager: NetworkManager
    
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_openarena_web)
        
        networkManager = MainActivity.getNetworkManager() ?: NetworkManager()
        
        setupWebView()
        loadGame()
    }
    
    private fun setupWebView() {
        webView = findViewById(R.id.webView)
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_NO_CACHE
        }
        
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d(TAG, "WebView page loaded: $url")
            }
        }
        
        // Add JavaScript interface for communication
        webView.addJavascriptInterface(OpenArenaInterface(), "OpenArena")
    }
    
    private fun loadGame() {
        // Load a simple HTML5 FPS game
        val htmlContent = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>OpenArena Web</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #000;
                        font-family: Arial, sans-serif;
                        overflow: hidden;
                    }
                    #gameCanvas {
                        display: block;
                        background: #1a1a1a;
                        cursor: crosshair;
                    }
                    #ui {
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        color: white;
                        font-size: 16px;
                        z-index: 100;
                    }
                    #controls {
                        position: absolute;
                        bottom: 10px;
                        left: 10px;
                        color: white;
                        font-size: 14px;
                        z-index: 100;
                    }
                    .button {
                        background: #ff6b35;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        margin: 5px;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                    .button:hover {
                        background: #ff5722;
                    }
                </style>
            </head>
            <body>
                <canvas id="gameCanvas" width="800" height="600"></canvas>
                <div id="ui">
                    <div>Score: <span id="score">0</span></div>
                    <div>Kills: <span id="kills">0</span></div>
                    <div>Deaths: <span id="deaths">0</span></div>
                    <div>Health: <span id="health">100</span></div>
                </div>
                <div id="controls">
                    <button class="button" onclick="submitScore()">Submit Score</button>
                    <button class="button" onclick="resetGame()">New Game</button>
                </div>
                
                <script>
                    const canvas = document.getElementById('gameCanvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Game state
                    let score = 0;
                    let kills = 0;
                    let deaths = 0;
                    let health = 100;
                    let gameMode = 'Free For All';
                    let map = 'Arena';
                    
                    // Player
                    const player = {
                        x: canvas.width / 2,
                        y: canvas.height / 2,
                        size: 20,
                        speed: 5,
                        color: '#00ff00'
                    };
                    
                    // Enemies
                    let enemies = [];
                    const enemyCount = 5;
                    
                    // Bullets
                    let bullets = [];
                    let enemyBullets = [];
                    
                    // Input
                    const keys = {};
                    let mouseX = 0;
                    let mouseY = 0;
                    
                    // Initialize enemies
                    function initEnemies() {
                        enemies = [];
                        for (let i = 0; i < enemyCount; i++) {
                            enemies.push({
                                x: Math.random() * canvas.width,
                                y: Math.random() * canvas.height,
                                size: 15,
                                speed: 2,
                                color: '#ff0000',
                                health: 100
                            });
                        }
                    }
                    
                    // Event listeners
                    document.addEventListener('keydown', (e) => {
                        keys[e.key] = true;
                    });
                    
                    document.addEventListener('keyup', (e) => {
                        keys[e.key] = false;
                    });
                    
                    canvas.addEventListener('mousemove', (e) => {
                        const rect = canvas.getBoundingClientRect();
                        mouseX = e.clientX - rect.left;
                        mouseY = e.clientY - rect.top;
                    });
                    
                    canvas.addEventListener('click', () => {
                        shoot();
                    });
                    
                    // Game functions
                    function shoot() {
                        const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
                        bullets.push({
                            x: player.x,
                            y: player.y,
                            vx: Math.cos(angle) * 10,
                            vy: Math.sin(angle) * 10,
                            size: 5,
                            color: '#ffff00'
                        });
                    }
                    
                    function updatePlayer() {
                        if (keys['w'] || keys['ArrowUp']) player.y -= player.speed;
                        if (keys['s'] || keys['ArrowDown']) player.y += player.speed;
                        if (keys['a'] || keys['ArrowLeft']) player.x -= player.speed;
                        if (keys['d'] || keys['ArrowRight']) player.x += player.speed;
                        
                        // Keep player in bounds
                        player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
                        player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
                    }
                    
                    function updateEnemies() {
                        enemies.forEach(enemy => {
                            // Simple AI: move towards player
                            const dx = player.x - enemy.x;
                            const dy = player.y - enemy.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance > 0) {
                                enemy.x += (dx / distance) * enemy.speed;
                                enemy.y += (dy / distance) * enemy.speed;
                            }
                            
                            // Keep enemies in bounds
                            enemy.x = Math.max(enemy.size, Math.min(canvas.width - enemy.size, enemy.x));
                            enemy.y = Math.max(enemy.size, Math.min(canvas.height - enemy.size, enemy.y));
                            
                            // Enemy shooting
                            if (Math.random() < 0.02) {
                                const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                                enemyBullets.push({
                                    x: enemy.x,
                                    y: enemy.y,
                                    vx: Math.cos(angle) * 5,
                                    vy: Math.sin(angle) * 5,
                                    size: 4,
                                    color: '#ff6666'
                                });
                            }
                        });
                    }
                    
                    function updateBullets() {
                        // Update player bullets
                        bullets = bullets.filter(bullet => {
                            bullet.x += bullet.vx;
                            bullet.y += bullet.vy;
                            
                            // Check collision with enemies
                            enemies.forEach((enemy, index) => {
                                const dx = bullet.x - enemy.x;
                                const dy = bullet.y - enemy.y;
                                const distance = Math.sqrt(dx * dx + dy * dy);
                                
                                if (distance < enemy.size + bullet.size) {
                                    enemy.health -= 25;
                                    if (enemy.health <= 0) {
                                        enemies.splice(index, 1);
                                        kills++;
                                        score += 100;
                                    }
                                    return false;
                                }
                            });
                            
                            return bullet.x > 0 && bullet.x < canvas.width && 
                                   bullet.y > 0 && bullet.y < canvas.height;
                        });
                        
                        // Update enemy bullets
                        enemyBullets = enemyBullets.filter(bullet => {
                            bullet.x += bullet.vx;
                            bullet.y += bullet.vy;
                            
                            // Check collision with player
                            const dx = bullet.x - player.x;
                            const dy = bullet.y - player.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);
                            
                            if (distance < player.size + bullet.size) {
                                health -= 20;
                                deaths++;
                                if (health <= 0) {
                                    resetGame();
                                }
                                return false;
                            }
                            
                            return bullet.x > 0 && bullet.x < canvas.width && 
                                   bullet.y > 0 && bullet.y < canvas.height;
                        });
                    }
                    
                    function draw() {
                        // Clear canvas
                        ctx.fillStyle = '#1a1a1a';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Draw player
                        ctx.fillStyle = player.color;
                        ctx.beginPath();
                        ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Draw enemies
                        enemies.forEach(enemy => {
                            ctx.fillStyle = enemy.color;
                            ctx.beginPath();
                            ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
                            ctx.fill();
                        });
                        
                        // Draw bullets
                        bullets.forEach(bullet => {
                            ctx.fillStyle = bullet.color;
                            ctx.beginPath();
                            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
                            ctx.fill();
                        });
                        
                        enemyBullets.forEach(bullet => {
                            ctx.fillStyle = bullet.color;
                            ctx.beginPath();
                            ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
                            ctx.fill();
                        });
                    }
                    
                    function updateUI() {
                        document.getElementById('score').textContent = score;
                        document.getElementById('kills').textContent = kills;
                        document.getElementById('deaths').textContent = deaths;
                        document.getElementById('health').textContent = health;
                    }
                    
                    function gameLoop() {
                        updatePlayer();
                        updateEnemies();
                        updateBullets();
                        draw();
                        updateUI();
                        
                        // Respawn enemies if all are dead
                        if (enemies.length === 0) {
                            initEnemies();
                        }
                        
                        requestAnimationFrame(gameLoop);
                    }
                    
                    function resetGame() {
                        score = 0;
                        kills = 0;
                        deaths = 0;
                        health = 100;
                        bullets = [];
                        enemyBullets = [];
                        initEnemies();
                        player.x = canvas.width / 2;
                        player.y = canvas.height / 2;
                    }
                    
                    function submitScore() {
                        if (typeof OpenArena !== 'undefined') {
                            OpenArena.submitResult(kills, deaths, score, gameMode, map);
                        }
                    }
                    
                    // Start game
                    initEnemies();
                    gameLoop();
                </script>
            </body>
            </html>
        """.trimIndent()
        
        webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
    }
    
    inner class OpenArenaInterface {
        @JavascriptInterface
        fun submitResult(kills: Int, deaths: Int, score: Int, gameMode: String, map: String) {
            val username = LoginActivity.getCurrentUser(this@OpenArenaWebActivity)?.username ?: "anonymous"
            
            networkManager.submitOpenArenaResult(username, kills, deaths, score, gameMode, map) { success ->
                runOnUiThread {
                    if (success) {
                        Toast.makeText(this@OpenArenaWebActivity, "Score submitted successfully!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@OpenArenaWebActivity, "Failed to submit score", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }
    
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
} 