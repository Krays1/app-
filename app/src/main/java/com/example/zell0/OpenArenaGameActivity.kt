package com.example.zell0

import android.content.Context
import android.graphics.*
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.MotionEvent
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import kotlin.math.*

class OpenArenaGameActivity : AppCompatActivity(), SurfaceHolder.Callback {
    
    companion object {
        private const val TAG = "OpenArenaGameActivity"
        private const val GAME_TICK_INTERVAL = 16L // ~60 FPS
    }
    
    private lateinit var gameView: OpenArenaGameView
    private lateinit var scoreText: TextView
    private lateinit var healthText: TextView
    private lateinit var ammoText: TextView
    private lateinit var newGameButton: Button
    private lateinit var submitScoreButton: Button
    private lateinit var networkManager: NetworkManager
    
    private var gameRunning = false
    private var gamePaused = false
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_openarena_game)
        
        networkManager = MainActivity.getNetworkManager() ?: NetworkManager()
        
        initializeViews()
        setupClickListeners()
        startGame()
    }
    
    private fun initializeViews() {
        gameView = findViewById(R.id.gameView)
        scoreText = findViewById(R.id.scoreText)
        healthText = findViewById(R.id.healthText)
        ammoText = findViewById(R.id.ammoText)
        newGameButton = findViewById(R.id.newGameButton)
        submitScoreButton = findViewById(R.id.submitScoreButton)
        
        gameView.holder.addCallback(this)
        gameView.setOnGameStateChangeListener(object : OpenArenaGameView.OnGameStateChangeListener {
            override fun onScoreChanged(score: Int) {
                scoreText.text = "Score: $score"
            }
            
            override fun onHealthChanged(health: Int) {
                healthText.text = "Health: $health"
            }
            
            override fun onAmmoChanged(ammo: Int) {
                ammoText.text = "Ammo: $ammo"
            }
            
            override fun onGameOver(score: Int, kills: Int, deaths: Int) {
                showGameOverDialog(score, kills, deaths)
            }
        })
    }
    
    private fun setupClickListeners() {
        newGameButton.setOnClickListener {
            startNewGame()
        }
        
        submitScoreButton.setOnClickListener {
            submitCurrentScore()
        }
    }
    
    private fun startGame() {
        gameRunning = true
        gamePaused = false
        gameView.startGame()
    }
    
    private fun startNewGame() {
        gameView.resetGame()
        gameRunning = true
        gamePaused = false
    }
    
    private fun submitCurrentScore() {
        val stats = gameView.getGameStats()
        val username = LoginActivity.getCurrentUser(this)?.username ?: "anonymous"
        
        networkManager.submitOpenArenaResult(
            username, 
            stats.kills, 
            stats.deaths, 
            stats.score, 
            "Free For All", 
            "Arena"
        ) { success ->
            runOnUiThread {
                if (success) {
                    Toast.makeText(this, "Score submitted successfully!", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Failed to submit score", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun showGameOverDialog(score: Int, kills: Int, deaths: Int) {
        val message = """
            Game Over!
            
            Final Score: $score
            Kills: $kills
            Deaths: $deaths
            
            Would you like to submit your score?
        """.trimIndent()
        
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Game Over")
            .setMessage(message)
            .setPositiveButton("Submit Score") { _, _ ->
                submitCurrentScore()
            }
            .setNegativeButton("New Game") { _, _ ->
                startNewGame()
            }
            .setCancelable(false)
            .show()
    }
    
    override fun surfaceCreated(holder: SurfaceHolder) {
        Log.d(TAG, "Surface created")
        gameView.startGame()
    }
    
    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        Log.d(TAG, "Surface changed: ${width}x${height}")
    }
    
    override fun surfaceDestroyed(holder: SurfaceHolder) {
        Log.d(TAG, "Surface destroyed")
        gameView.stopGame()
    }
    
    override fun onPause() {
        super.onPause()
        gamePaused = true
        gameView.pauseGame()
    }
    
    override fun onResume() {
        super.onResume()
        if (gameRunning) {
            gamePaused = false
            gameView.resumeGame()
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        gameRunning = false
        gameView.stopGame()
    }
}

class OpenArenaGameView @JvmOverloads constructor(
    context: Context,
    attrs: android.util.AttributeSet? = null,
    defStyleAttr: Int = 0
) : SurfaceView(context, attrs, defStyleAttr), Runnable {
    
    companion object {
        private const val TAG = "OpenArenaGameView"
    }
    
    private val holder: SurfaceHolder = getHolder()
    private val paint = Paint()
    private val backgroundPaint = Paint()
    private val playerPaint = Paint()
    private val enemyPaint = Paint()
    private val bulletPaint = Paint()
    private val textPaint = Paint()
    
    private var gameThread: Thread? = null
    private var gameRunning = false
    private var gamePaused = false
    
    // Game state
    private var score = 0
    private var health = 100
    private var ammo = 30
    private var kills = 0
    private var deaths = 0
    
    // Player
    private var playerX = 0f
    private var playerY = 0f
    private var playerAngle = 0f
    private var playerSpeed = 5f
    
    // Enemies
    private val enemies = mutableListOf<Enemy>()
    private val maxEnemies = 8
    
    // Bullets
    private val bullets = mutableListOf<Bullet>()
    private val enemyBullets = mutableListOf<Bullet>()
    
    // Input
    private var touchX = 0f
    private var touchY = 0f
    private var isShooting = false
    private var moveForward = false
    private var moveBackward = false
    private var moveLeft = false
    private var moveRight = false
    
    // Game loop
    private val handler = Handler(Looper.getMainLooper())
    private val gameTickRunnable = object : Runnable {
        override fun run() {
            if (gameRunning && !gamePaused) {
                updateGame()
                drawGame()
                handler.postDelayed(this, 16L) // ~60 FPS
            }
        }
    }
    
    // Callback interface
    interface OnGameStateChangeListener {
        fun onScoreChanged(score: Int)
        fun onHealthChanged(health: Int)
        fun onAmmoChanged(ammo: Int)
        fun onGameOver(score: Int, kills: Int, deaths: Int)
    }
    
    private var gameStateListener: OnGameStateChangeListener? = null
    
    fun setOnGameStateChangeListener(listener: OnGameStateChangeListener) {
        gameStateListener = listener
    }
    
    init {
        setupPaints()
        setupTouchListener()
    }
    
    private fun setupPaints() {
        paint.isAntiAlias = true
        
        backgroundPaint.color = Color.rgb(26, 26, 26)
        
        playerPaint.color = Color.GREEN
        playerPaint.style = Paint.Style.FILL
        
        enemyPaint.color = Color.RED
        enemyPaint.style = Paint.Style.FILL
        
        bulletPaint.color = Color.YELLOW
        bulletPaint.style = Paint.Style.FILL
        
        textPaint.color = Color.WHITE
        textPaint.textSize = 24f
        textPaint.isAntiAlias = true
    }
    
    private fun setupTouchListener() {
        setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    touchX = event.x
                    touchY = event.y
                    isShooting = true
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    touchX = event.x
                    touchY = event.y
                    true
                }
                MotionEvent.ACTION_UP -> {
                    isShooting = false
                    true
                }
                else -> false
            }
        }
    }
    
    fun startGame() {
        if (!gameRunning) {
            gameRunning = true
            gamePaused = false
            resetGame()
            handler.post(gameTickRunnable)
        }
    }
    
    fun stopGame() {
        gameRunning = false
        handler.removeCallbacks(gameTickRunnable)
    }
    
    fun pauseGame() {
        gamePaused = true
    }
    
    fun resumeGame() {
        gamePaused = false
    }
    
    fun resetGame() {
        score = 0
        health = 100
        ammo = 30
        kills = 0
        deaths = 0
        
        playerX = width / 2f
        playerY = height / 2f
        playerAngle = 0f
        
        enemies.clear()
        bullets.clear()
        enemyBullets.clear()
        
        spawnEnemies()
        
        gameStateListener?.onScoreChanged(score)
        gameStateListener?.onHealthChanged(health)
        gameStateListener?.onAmmoChanged(ammo)
    }
    
    private fun spawnEnemies() {
        enemies.clear()
        repeat(maxEnemies) {
            val enemy = Enemy(
                x = (Math.random() * width).toFloat(),
                y = (Math.random() * height).toFloat(),
                health = 100,
                speed = 2f + (Math.random() * 2f).toFloat()
            )
            enemies.add(enemy)
        }
    }
    
    private fun updateGame() {
        updatePlayer()
        updateEnemies()
        updateBullets()
        checkCollisions()
        
        // Auto-reload
        if (ammo <= 0) {
            ammo = 30
            gameStateListener?.onAmmoChanged(ammo)
        }
    }
    
    private fun updatePlayer() {
        // Calculate movement direction based on touch
        val centerX = width / 2f
        val centerY = height / 2f
        
        // Calculate angle to touch point
        val dx = touchX - centerX
        val dy = touchY - centerY
        playerAngle = atan2(dy, dx)
        
        // Move player towards touch point
        if (isShooting && ammo > 0) {
            playerX += cos(playerAngle) * playerSpeed
            playerY += sin(playerAngle) * playerSpeed
            
            // Keep player in bounds
            playerX = playerX.coerceIn(50f, width - 50f)
            playerY = playerY.coerceIn(50f, height - 50f)
        }
        
        // Shooting
        if (isShooting && ammo > 0 && System.currentTimeMillis() % 5 == 0L) {
            shoot()
        }
    }
    
    private fun updateEnemies() {
        enemies.forEach { enemy ->
            // Move towards player
            val dx = playerX - enemy.x
            val dy = playerY - enemy.y
            val distance = sqrt(dx * dx + dy * dy)
            
            if (distance > 0) {
                enemy.x += (dx / distance) * enemy.speed
                enemy.y += (dy / distance) * enemy.speed
            }
            
            // Keep enemies in bounds
            enemy.x = enemy.x.coerceIn(25f, width - 25f)
            enemy.y = enemy.y.coerceIn(25f, height - 25f)
            
            // Enemy shooting
            if (Math.random() < 0.01) {
                val angle = atan2(playerY - enemy.y, playerX - enemy.x)
                enemyBullets.add(
                    Bullet(
                        x = enemy.x,
                        y = enemy.y,
                        vx = cos(angle) * 8f,
                        vy = sin(angle) * 8f
                    )
                )
            }
        }
    }
    
    private fun updateBullets() {
        // Update player bullets
        bullets.removeAll { bullet ->
            bullet.x += bullet.vx
            bullet.y += bullet.vy
            
            // Check if bullet is out of bounds
            bullet.x < 0 || bullet.x > width || bullet.y < 0 || bullet.y > height
        }
        
        // Update enemy bullets
        enemyBullets.removeAll { bullet ->
            bullet.x += bullet.vx
            bullet.y += bullet.vy
            
            // Check if bullet is out of bounds
            bullet.x < 0 || bullet.x > width || bullet.y < 0 || bullet.y > height
        }
    }
    
    private fun checkCollisions() {
        // Player bullets vs enemies
        bullets.forEach { bullet ->
            enemies.removeAll { enemy ->
                val dx = bullet.x - enemy.x
                val dy = bullet.y - enemy.y
                val distance = sqrt(dx * dx + dy * dy)
                
                if (distance < 30f) {
                    enemy.health -= 25
                    if (enemy.health <= 0) {
                        kills++
                        score += 100
                        gameStateListener?.onScoreChanged(score)
                        true
                    } else {
                        false
                    }
                } else {
                    false
                }
            }
        }
        
        // Enemy bullets vs player
        enemyBullets.removeAll { bullet ->
            val dx = bullet.x - playerX
            val dy = bullet.y - playerY
            val distance = sqrt(dx * dx + dy * dy)
            
            if (distance < 25f) {
                health -= 10
                deaths++
                gameStateListener?.onHealthChanged(health)
                
                if (health <= 0) {
                    gameStateListener?.onGameOver(score, kills, deaths)
                }
                true
            } else {
                false
            }
        }
        
        // Enemy collision with player
        enemies.removeAll { enemy ->
            val dx = enemy.x - playerX
            val dy = enemy.y - playerY
            val distance = sqrt(dx * dx + dy * dy)
            
            if (distance < 40f) {
                health -= 20
                deaths++
                gameStateListener?.onHealthChanged(health)
                
                if (health <= 0) {
                    gameStateListener?.onGameOver(score, kills, deaths)
                }
                true
            } else {
                false
            }
        }
        
        // Respawn enemies if needed
        if (enemies.size < maxEnemies / 2) {
            repeat(maxEnemies - enemies.size) {
                val enemy = Enemy(
                    x = (Math.random() * width).toFloat(),
                    y = (Math.random() * height).toFloat(),
                    health = 100,
                    speed = 2f + (Math.random() * 2f).toFloat()
                )
                enemies.add(enemy)
            }
        }
    }
    
    private fun shoot() {
        if (ammo > 0) {
            bullets.add(
                Bullet(
                    x = playerX,
                    y = playerY,
                    vx = cos(playerAngle) * 15f,
                    vy = sin(playerAngle) * 15f
                )
            )
            ammo--
            gameStateListener?.onAmmoChanged(ammo)
        }
    }
    
    private fun drawGame() {
        val canvas = holder.lockCanvas()
        if (canvas != null) {
            try {
                // Clear background
                canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), backgroundPaint)
                
                // Draw player
                canvas.drawCircle(playerX, playerY, 25f, playerPaint)
                
                // Draw player direction indicator
                val endX = playerX + cos(playerAngle) * 40f
                val endY = playerY + sin(playerAngle) * 40f
                paint.color = Color.WHITE
                paint.strokeWidth = 5f
                canvas.drawLine(playerX, playerY, endX, endY, paint)
                
                // Draw enemies
                enemies.forEach { enemy ->
                    enemyPaint.alpha = (enemy.health * 255 / 100).coerceIn(0, 255)
                    canvas.drawCircle(enemy.x, enemy.y, 20f, enemyPaint)
                }
                
                // Draw bullets
                bullets.forEach { bullet ->
                    canvas.drawCircle(bullet.x, bullet.y, 5f, bulletPaint)
                }
                
                enemyBullets.forEach { bullet ->
                    paint.color = Color.RED
                    canvas.drawCircle(bullet.x, bullet.y, 4f, paint)
                }
                
                // Draw UI
                drawUI(canvas)
                
            } finally {
                holder.unlockCanvasAndPost(canvas)
            }
        }
    }
    
    private fun drawUI(canvas: Canvas) {
        // Draw crosshair
        val centerX = width / 2f
        val centerY = height / 2f
        
        paint.color = Color.WHITE
        paint.strokeWidth = 3f
        
        // Horizontal line
        canvas.drawLine(centerX - 20f, centerY, centerX + 20f, centerY, paint)
        // Vertical line
        canvas.drawLine(centerX, centerY - 20f, centerX, centerY + 20f, paint)
        
        // Draw game info
        textPaint.textSize = 30f
        canvas.drawText("Score: $score", 20f, 40f, textPaint)
        canvas.drawText("Health: $health", 20f, 80f, textPaint)
        canvas.drawText("Ammo: $ammo", 20f, 120f, textPaint)
        canvas.drawText("Kills: $kills", 20f, 160f, textPaint)
        canvas.drawText("Deaths: $deaths", 20f, 200f, textPaint)
    }
    
    fun getGameStats(): GameStats {
        return GameStats(score, kills, deaths, health, ammo)
    }
    
    override fun run() {
        // This is for the old threading approach, not used anymore
    }
    
    data class Enemy(
        var x: Float,
        var y: Float,
        var health: Int,
        val speed: Float
    )
    
    data class Bullet(
        var x: Float,
        var y: Float,
        val vx: Float,
        val vy: Float
    )
    
    data class GameStats(
        val score: Int,
        val kills: Int,
        val deaths: Int,
        val health: Int,
        val ammo: Int
    )
} 