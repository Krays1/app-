package com.example.zell0

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import kotlin.math.*
import kotlin.random.Random
import android.media.SoundPool
import android.media.MediaPlayer
import android.media.AudioManager
import android.os.Handler
import android.os.Looper
import java.util.concurrent.CopyOnWriteArrayList

class PacmanGameView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    companion object {
        const val MAZE_WIDTH = 28
        const val MAZE_HEIGHT = 31
    }

    interface OnGameStateChangeListener {
        fun onScoreChanged(score: Int)
        fun onLevelChanged(level: Int)
        fun onLivesChanged(lives: Int)
        fun onGameOver(score: Int, level: Int, dotsEaten: Int)
    }

    enum class Direction {
        UP, DOWN, LEFT, RIGHT
    }

    enum class GhostMode {
        CHASE, SCATTER, SCARED, EATEN
    }

    data class Point(val x: Int, val y: Int)
    data class Ghost(
        var x: Float,
        var y: Float,
        var direction: Direction,
        var mode: GhostMode,
        var color: Int,
        var targetX: Float,
        var targetY: Float,
        var scatterTargetX: Float,
        var scatterTargetY: Float,
        var speed: Float = 0.1f
    )

    // Game state
    private var score = 0
    private var level = 1
    private var lives = 3
    private var gameOver = false
    private var gamePaused = false
    private var dotsEaten = 0
    private var totalDots = 0

    // Pac-Man - ensure starting position is valid
    private var pacmanX = 14f
    private var pacmanY = 22f
    private var pacmanDirection = Direction.LEFT
    private var nextDirection = Direction.LEFT
    private var pacmanMouthAngle = 0f
    private var pacmanMouthDirection = 1f

    // Maze and game elements
    private val maze = Array(MAZE_HEIGHT) { IntArray(MAZE_WIDTH) }
    private val dots = mutableSetOf<Point>()
    private val powerPellets = mutableSetOf<Point>()
    private val ghosts = CopyOnWriteArrayList<Ghost>()

    // Visual elements
    private val pacmanPaint = Paint().apply {
        color = Color.parseColor("#FFFF00") // Classic yellow
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    private val dotPaint = Paint().apply {
        color = Color.parseColor("#FFFFFF") // White dots
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    private val powerPelletPaint = Paint().apply {
        color = Color.parseColor("#FFFFFF") // White power pellets
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    private val wallPaint = Paint().apply {
        color = Color.parseColor("#0000FF") // Classic blue walls
        style = Paint.Style.FILL
        isAntiAlias = true
    }

    private val backgroundPaint = Paint().apply {
        color = Color.parseColor("#000000") // Black background
        style = Paint.Style.FILL
    }

    // Game loop
    private val handler = Handler(Looper.getMainLooper())
    private val gameTickInterval = 80L // Faster gameplay
    private var tickRunnable: Runnable? = null

    // Callbacks
    private var gameStateListener: OnGameStateChangeListener? = null

    // Audio
    private var soundPool: SoundPool? = null
    private var mediaPlayer: MediaPlayer? = null
    private var volume = 0.5f
    private var isMuted = false

    // Ghost AI timing
    private var scatterModeTimer = 0
    private var chaseModeTimer = 0
    private val scatterDuration = 7000 // 7 seconds
    private val chaseDuration = 20000 // 20 seconds

    init {
        initializeMaze()
        initializeGhosts()
        setupAudio()
        startGameLoop()
    }

    private fun initializeMaze() {
        // Classic Pac-Man maze layout - more accurate to original
        val mazeLayout = """
            1111111111111111111111111111
            1000000000000110000000000001
            1011110111110110111110111101
            1011110111110110111110111101
            1011110111110110111110111101
            1000000000000000000000000001
            1011110110111111110110111101
            1011110110111111110110111101
            1000000110000110000110000001
            1111110111110110111110111111
            1111110111110110111110111111
            1111110110000000000110111111
            1111110110111001110110111111
            1111110110100000010110111111
            0000000000100000010000000000
            1111110110100000010110111111
            1111110110111111110110111111
            1111110110000000000110111111
            1111110110111111110110111111
            1000000000000110000000000001
            1011110111110110111110111101
            1011110111110110111110111101
            1000110000000000000000110001
            1110110110111111110110110111
            1110110110111111110110110111
            1000000110000110000110000001
            1011111111110110111111111101
            1011111111110110111111111101
            1000000000000000000000000001
            1111111111111111111111111111
        """.trimIndent()

        val lines = mazeLayout.split("\n")
        for (y in lines.indices) {
            for (x in lines[y].indices) {
                maze[y][x] = if (lines[y][x] == '1') 0 else 1 // 0 = wall, 1 = path
            }
        }

        // Initialize dots and power pellets
        dots.clear()
        powerPellets.clear()
        for (y in 0 until MAZE_HEIGHT) {
            for (x in 0 until MAZE_WIDTH) {
                if (maze[y][x] == 1) {
                    when {
                        (x == 1 && y == 3) || (x == 26 && y == 3) ||
                        (x == 1 && y == 23) || (x == 26 && y == 23) -> {
                            powerPellets.add(Point(x, y))
                        }
                        else -> {
                            dots.add(Point(x, y))
                        }
                    }
                }
            }
        }
        totalDots = dots.size + powerPellets.size
    }

    private fun initializeGhosts() {
        ghosts.clear()
        
        // Classic ghost colors and starting positions - ensure they start in valid positions
        val ghostData = listOf(
            Triple(13f, 11f, Color.parseColor("#FF0000")), // Red - Blinky
            Triple(14f, 11f, Color.parseColor("#FFB8FF")), // Pink - Pinky
            Triple(13f, 12f, Color.parseColor("#00FFFF")), // Cyan - Inky
            Triple(14f, 12f, Color.parseColor("#FFB852"))  // Orange - Clyde
        )

        for ((startX, startY, color) in ghostData) {
            ghosts.add(Ghost(
                x = startX,
                y = startY,
                direction = Direction.LEFT,
                mode = GhostMode.CHASE,
                color = color,
                targetX = pacmanX,
                targetY = pacmanY,
                scatterTargetX = when (color) {
                    Color.parseColor("#FF0000") -> 26f // Blinky targets top-right
                    Color.parseColor("#FFB8FF") -> 1f  // Pinky targets top-left
                    Color.parseColor("#00FFFF") -> 26f // Inky targets bottom-right
                    else -> 1f // Clyde targets bottom-left
                },
                scatterTargetY = when (color) {
                    Color.parseColor("#FF0000") -> 1f  // Blinky
                    Color.parseColor("#FFB8FF") -> 1f  // Pinky
                    Color.parseColor("#00FFFF") -> 29f // Inky
                    else -> 29f // Clyde
                },
                speed = 0.08f
            ))
        }
    }

    private fun setupAudio() {
        soundPool = SoundPool.Builder()
            .setMaxStreams(10)
            .setAudioAttributes(android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_GAME)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build())
            .build()

        // Load existing sound effects from the app
        try {
            // Use existing sounds from other games
            soundPool?.load(context, R.raw.eat, 1) // Chomp sound
            soundPool?.load(context, R.raw.gameover, 2) // Death sound
            soundPool?.load(context, R.raw.eat, 3) // Ghost eaten (reuse eat sound)
            soundPool?.load(context, R.raw.eat, 4) // Power pellet (reuse eat sound)
            
            // Setup background music
            mediaPlayer = MediaPlayer.create(context, R.raw.background)
            mediaPlayer?.isLooping = true
            mediaPlayer?.setVolume(volume, volume)
            if (!isMuted) {
                mediaPlayer?.start()
            }
        } catch (e: Exception) {
            // If sounds don't exist, continue without them
        }
    }

    private fun startGameLoop() {
        tickRunnable = object : Runnable {
            override fun run() {
                if (!gameOver && !gamePaused) {
                    updateGame()
                    invalidate()
                }
                handler.postDelayed(this, gameTickInterval)
            }
        }
        handler.post(tickRunnable!!)
    }

    private fun updateGame() {
        updatePacman()
        updateGhosts()
        checkCollisions()
        updateGhostMode()
    }

    private fun updatePacman() {
        // Try to change direction if requested
        if (nextDirection != pacmanDirection) {
            android.util.Log.d("PacmanGameView", "Trying to change direction from $pacmanDirection to $nextDirection")
            if (canMove(pacmanX, pacmanY, nextDirection)) {
                pacmanDirection = nextDirection
                android.util.Log.d("PacmanGameView", "Direction changed to: $pacmanDirection")
            } else {
                android.util.Log.d("PacmanGameView", "Cannot move in direction: $nextDirection")
            }
        }

        // Move Pac-Man in current direction
        val moveSpeed = 0.1f
        var newX = pacmanX
        var newY = pacmanY

        when (pacmanDirection) {
            Direction.LEFT -> newX -= moveSpeed
            Direction.RIGHT -> newX += moveSpeed
            Direction.UP -> newY -= moveSpeed
            Direction.DOWN -> newY += moveSpeed
        }

        // Check if we can move to the new position
        if (canMove(pacmanX, pacmanY, pacmanDirection)) {
            pacmanX = newX
            pacmanY = newY
            android.util.Log.d("PacmanGameView", "Pac-Man moved to: ($pacmanX, $pacmanY)")
        } else {
            android.util.Log.d("PacmanGameView", "Pac-Man cannot move in direction: $pacmanDirection")
        }

        // Wrap around tunnel
        if (pacmanX < 0) pacmanX = MAZE_WIDTH.toFloat()
        if (pacmanX >= MAZE_WIDTH) pacmanX = 0f
    }

    private fun updateGhosts() {
        for (ghost in ghosts) {
            if (ghost.mode == GhostMode.EATEN) {
                // Return to ghost house
                if (abs(ghost.x - 14f) < 0.5f && abs(ghost.y - 14f) < 0.5f) {
                    ghost.mode = GhostMode.CHASE
                    ghost.color = when (ghost) {
                        ghosts[0] -> Color.parseColor("#FF0000") // Red
                        ghosts[1] -> Color.parseColor("#FFB8FF") // Pink
                        ghosts[2] -> Color.parseColor("#00FFFF") // Cyan
                        else -> Color.parseColor("#FFB852") // Orange
                    }
                } else {
                    // Move towards ghost house
                    val targetX = 14f
                    val targetY = 14f
                    moveGhostTowardsTarget(ghost, targetX, targetY)
                }
            } else {
                // Update target based on mode
                when (ghost.mode) {
                    GhostMode.CHASE -> {
                        when (ghost) {
                            ghosts[0] -> { // Blinky - direct chase
                                ghost.targetX = pacmanX
                                ghost.targetY = pacmanY
                            }
                            ghosts[1] -> { // Pinky - 4 tiles ahead
                                val offsetX = when (pacmanDirection) {
                                    Direction.LEFT -> -4f
                                    Direction.RIGHT -> 4f
                                    else -> 0f
                                }
                                val offsetY = when (pacmanDirection) {
                                    Direction.UP -> -4f
                                    Direction.DOWN -> 4f
                                    else -> 0f
                                }
                                ghost.targetX = pacmanX + offsetX
                                ghost.targetY = pacmanY + offsetY
                            }
                            ghosts[2] -> { // Inky - based on Blinky's position
                                val blinky = ghosts[0]
                                val offsetX = pacmanX - blinky.x
                                val offsetY = pacmanY - blinky.y
                                ghost.targetX = pacmanX + offsetX
                                ghost.targetY = pacmanY + offsetY
                            }
                            else -> { // Clyde - random behavior
                                val distance = sqrt((pacmanX - ghost.x).pow(2) + (pacmanY - ghost.y).pow(2))
                                if (distance > 8f) {
                                    ghost.targetX = pacmanX
                                    ghost.targetY = pacmanY
                                } else {
                                    ghost.targetX = ghost.scatterTargetX
                                    ghost.targetY = ghost.scatterTargetY
                                }
                            }
                        }
                    }
                    GhostMode.SCATTER -> {
                        ghost.targetX = ghost.scatterTargetX
                        ghost.targetY = ghost.scatterTargetY
                    }
                    GhostMode.SCARED -> {
                        // Run away from Pac-Man when scared
                        val runAwayX = if (ghost.x < pacmanX) 0f else MAZE_WIDTH.toFloat()
                        val runAwayY = if (ghost.y < pacmanY) 0f else MAZE_HEIGHT.toFloat()
                        ghost.targetX = runAwayX
                        ghost.targetY = runAwayY
                    }
                    else -> {}
                }

                // Move ghost towards target
                if (ghost.mode == GhostMode.SCARED) {
                    moveGhostTowardsTarget(ghost, ghost.targetX, ghost.targetY)
                } else {
                    moveGhostTowardsTarget(ghost, ghost.targetX, ghost.targetY)
                }
            }

            // Wrap around tunnel
            if (ghost.x < 0) ghost.x = MAZE_WIDTH.toFloat()
            if (ghost.x >= MAZE_WIDTH) ghost.x = 0f
        }
    }

    private fun moveGhostTowardsTarget(ghost: Ghost, targetX: Float, targetY: Float) {
        val possibleDirections = mutableListOf<Direction>()
        
        for (direction in Direction.values()) {
            if (canMove(ghost.x, ghost.y, direction)) {
                possibleDirections.add(direction)
            }
        }

        if (possibleDirections.isNotEmpty()) {
            // Choose best direction towards target
            var bestDirection = possibleDirections[0]
            var bestDistance = Float.MAX_VALUE

            for (direction in possibleDirections) {
                val newX = ghost.x + when (direction) {
                    Direction.LEFT -> -ghost.speed
                    Direction.RIGHT -> ghost.speed
                    else -> 0f
                }
                val newY = ghost.y + when (direction) {
                    Direction.UP -> -ghost.speed
                    Direction.DOWN -> ghost.speed
                    else -> 0f
                }

                val distance = sqrt((targetX - newX).pow(2) + (targetY - newY).pow(2))
                if (distance < bestDistance) {
                    bestDistance = distance
                    bestDirection = direction
                }
            }

            ghost.direction = bestDirection
            android.util.Log.d("PacmanGameView", "Ghost chose direction: $bestDirection towards target ($targetX, $targetY)")
        } else {
            android.util.Log.d("PacmanGameView", "Ghost has no possible directions to move")
        }

        // Move ghost only if we can move in the current direction
        var newX = ghost.x
        var newY = ghost.y

        when (ghost.direction) {
            Direction.LEFT -> newX -= ghost.speed
            Direction.RIGHT -> newX += ghost.speed
            Direction.UP -> newY -= ghost.speed
            Direction.DOWN -> newY += ghost.speed
        }

        if (canMove(ghost.x, ghost.y, ghost.direction)) {
            ghost.x = newX
            ghost.y = newY
            android.util.Log.d("PacmanGameView", "Ghost moved to: (${ghost.x}, ${ghost.y})")
        } else {
            android.util.Log.d("PacmanGameView", "Ghost cannot move in direction: ${ghost.direction}")
        }
    }

    private fun moveGhostRandomly(ghost: Ghost) {
        if (Random.nextFloat() < 0.1f) {
            val possibleDirections = mutableListOf<Direction>()
            for (direction in Direction.values()) {
                if (canMove(ghost.x, ghost.y, direction)) {
                    possibleDirections.add(direction)
                }
            }
            if (possibleDirections.isNotEmpty()) {
                ghost.direction = possibleDirections[Random.nextInt(possibleDirections.size)]
            }
        }

        // Move ghost only if we can move in the current direction
        var newX = ghost.x
        var newY = ghost.y

        when (ghost.direction) {
            Direction.LEFT -> newX -= ghost.speed * 0.5f
            Direction.RIGHT -> newX += ghost.speed * 0.5f
            Direction.UP -> newY -= ghost.speed * 0.5f
            Direction.DOWN -> newY += ghost.speed * 0.5f
        }

        if (canMove(ghost.x, ghost.y, ghost.direction)) {
            ghost.x = newX
            ghost.y = newY
        }
    }

    private fun updateGhostMode() {
        scatterModeTimer += gameTickInterval.toInt()
        chaseModeTimer += gameTickInterval.toInt()

        if (scatterModeTimer >= scatterDuration) {
            // Switch to chase mode
            for (ghost in ghosts) {
                if (ghost.mode == GhostMode.SCATTER) {
                    ghost.mode = GhostMode.CHASE
                }
            }
            scatterModeTimer = 0
            chaseModeTimer = 0
        } else if (chaseModeTimer >= chaseDuration) {
            // Switch to scatter mode
            for (ghost in ghosts) {
                if (ghost.mode == GhostMode.CHASE) {
                    ghost.mode = GhostMode.SCATTER
                }
            }
            chaseModeTimer = 0
            scatterModeTimer = 0
        }
    }

    private fun canMove(x: Float, y: Float, direction: Direction): Boolean {
        val newX = x + when (direction) {
            Direction.LEFT -> -0.1f
            Direction.RIGHT -> 0.1f
            else -> 0f
        }
        val newY = y + when (direction) {
            Direction.UP -> -0.1f
            Direction.DOWN -> 0.1f
            else -> 0f
        }
        
        // Check boundaries first
        if (newX < 0 || newX >= MAZE_WIDTH || newY < 0 || newY >= MAZE_HEIGHT) {
            android.util.Log.d("PacmanGameView", "Boundary check failed: newX=$newX, newY=$newY")
            return false
        }
        
        // Check the exact grid position
        val gridX = newX.toInt().coerceIn(0, MAZE_WIDTH - 1)
        val gridY = newY.toInt().coerceIn(0, MAZE_HEIGHT - 1)
        
        // If the target position is a wall, don't allow movement
        if (maze[gridY][gridX] == 0) {
            android.util.Log.d("PacmanGameView", "Wall detected at grid position: ($gridX, $gridY)")
            return false
        }
        
        // Also check current position to ensure we're not already in a wall
        val currentGridX = x.toInt().coerceIn(0, MAZE_WIDTH - 1)
        val currentGridY = y.toInt().coerceIn(0, MAZE_HEIGHT - 1)
        
        if (maze[currentGridY][currentGridX] == 0) {
            android.util.Log.d("PacmanGameView", "Currently in wall at: ($currentGridX, $currentGridY)")
            return false
        }
        
        return true
    }

    private fun checkCollisions() {
        val pacmanGridX = pacmanX.toInt()
        val pacmanGridY = pacmanY.toInt()

        // Check dot collisions
        val dotPoint = Point(pacmanGridX, pacmanGridY)
        if (dots.contains(dotPoint)) {
            dots.remove(dotPoint)
            score += 10
            dotsEaten++
            playSound(1) // Chomp sound
            gameStateListener?.onScoreChanged(score)
        }

        // Check power pellet collisions
        if (powerPellets.contains(dotPoint)) {
            powerPellets.remove(dotPoint)
            score += 50
            dotsEaten++
            playSound(2) // Power pellet sound
            gameStateListener?.onScoreChanged(score)
            
            // Make ghosts scared
            for (ghost in ghosts) {
                if (ghost.mode != GhostMode.EATEN) {
                    ghost.mode = GhostMode.SCARED
                }
            }
            
            // Reset scared mode after 10 seconds
            handler.postDelayed({
                for (ghost in ghosts) {
                    if (ghost.mode == GhostMode.SCARED) {
                        ghost.mode = GhostMode.CHASE
                    }
                }
            }, 10000)
        }

        // Check ghost collisions with more precise detection
        for (ghost in ghosts.toList()) {
            val distance = sqrt((pacmanX - ghost.x).pow(2) + (pacmanY - ghost.y).pow(2))
            
            if (distance < 0.6f) { // Tighter collision detection
                when (ghost.mode) {
                    GhostMode.SCARED -> {
                        // Eat ghost - check if Pac-Man is behind the ghost
                        val isBehind = when (ghost.direction) {
                            Direction.LEFT -> pacmanX > ghost.x
                            Direction.RIGHT -> pacmanX < ghost.x
                            Direction.UP -> pacmanY > ghost.y
                            Direction.DOWN -> pacmanY < ghost.y
                        }
                        
                        if (isBehind) {
                            // Ghost runs away when hit from behind
                            ghost.mode = GhostMode.SCARED
                            ghost.color = Color.BLUE
                            score += 100
                            playSound(3) // Ghost eaten sound
                            gameStateListener?.onScoreChanged(score)
                        } else {
                            // Eat the ghost normally
                            ghost.mode = GhostMode.EATEN
                            ghost.color = Color.WHITE
                            score += 200
                            playSound(3) // Ghost eaten sound
                            gameStateListener?.onScoreChanged(score)
                        }
                    }
                    GhostMode.EATEN -> {
                        // Already eaten, ignore
                    }
                    else -> {
                        // Pac-Man dies
                        lives--
                        playSound(2) // Death sound
                        gameStateListener?.onLivesChanged(lives)
                        
                        if (lives <= 0) {
                            gameOver = true
                            gameStateListener?.onGameOver(score, level, dotsEaten)
                        } else {
                            // Add delay before reset to prevent immediate re-collision
                            handler.postDelayed({
                                resetPositions()
                            }, 1000) // 1 second delay
                        }
                    }
                }
            }
        }

        // Check if level complete
        if (dots.isEmpty() && powerPellets.isEmpty()) {
            level++
            gameStateListener?.onLevelChanged(level)
            initializeMaze()
            resetPositions()
            // Increase ghost speed
            for (ghost in ghosts) {
                ghost.speed = minOf(ghost.speed + 0.01f, 0.15f)
            }
        }
    }

    private fun resetPositions() {
        // Reset Pac-Man to valid position
        pacmanX = 14f
        pacmanY = 22f
        pacmanDirection = Direction.LEFT
        nextDirection = Direction.LEFT

        // Reset ghosts
        synchronized(ghosts) {
            ghosts.clear()
            initializeGhosts()
        }
    }

    private fun playSound(soundId: Int) {
        if (!isMuted && soundPool != null) {
            soundPool?.play(soundId, volume, volume, 1, 0, 1.0f)
        }
    }

    fun setOnGameStateChangeListener(listener: OnGameStateChangeListener?) {
        gameStateListener = listener
    }

    // Public methods for activity interaction
    fun setNextDirection(direction: Direction) {
        android.util.Log.d("PacmanGameView", "Setting next direction to: $direction")
        nextDirection = direction
    }

    fun newGame() {
        score = 0
        level = 1
        lives = 3
        gameOver = false
        dotsEaten = 0
        initializeMaze()
        resetPositions()
        for (ghost in ghosts) {
            ghost.speed = 0.08f
        }
    }

    fun pauseGame() {
        gamePaused = !gamePaused
    }

    fun setVolume(volume: Float) {
        this.volume = volume
        mediaPlayer?.setVolume(volume, volume)
    }

    fun setMuted(muted: Boolean) {
        isMuted = muted
        if (muted) {
            mediaPlayer?.pause()
        } else {
            mediaPlayer?.start()
        }
    }

    fun getScore(): Int = score
    fun getLevel(): Int = level
    fun getLives(): Int = lives
    fun getDotsEaten(): Int = dotsEaten
    fun getTotalDots(): Int = totalDots
    fun isGameOver(): Boolean = gameOver
    fun isPaused(): Boolean = gamePaused

    // Drawing methods
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val cellSize = minOf(width.toFloat() / MAZE_WIDTH, height.toFloat() / MAZE_HEIGHT)
        val offsetX = (width - MAZE_WIDTH * cellSize) / 2
        val offsetY = (height - MAZE_HEIGHT * cellSize) / 2

        // Draw background
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), backgroundPaint)

        // Draw maze
        drawMaze(canvas, offsetX, offsetY, cellSize)

        // Draw dots
        drawDots(canvas, offsetX, offsetY, cellSize)

        // Draw power pellets
        drawPowerPellets(canvas, offsetX, offsetY, cellSize)

        // Draw Pac-Man
        drawPacman(canvas, offsetX, offsetY, cellSize)

        // Draw ghosts
        drawGhosts(canvas, offsetX, offsetY, cellSize)

        // Draw game over screen
        if (gameOver) {
            drawGameOver(canvas)
        }
    }

    private fun drawMaze(canvas: Canvas, offsetX: Float, offsetY: Float, cellSize: Float) {
        for (y in 0 until MAZE_HEIGHT) {
            for (x in 0 until MAZE_WIDTH) {
                if (maze[y][x] == 0) { // Wall
                    val left = offsetX + x * cellSize
                    val top = offsetY + y * cellSize
                    val right = left + cellSize
                    val bottom = top + cellSize
                    canvas.drawRect(left, top, right, bottom, wallPaint)
                }
            }
        }
    }

    private fun drawDots(canvas: Canvas, offsetX: Float, offsetY: Float, cellSize: Float) {
        for ((x, y) in dots) {
            val centerX = offsetX + x * cellSize + cellSize / 2
            val centerY = offsetY + y * cellSize + cellSize / 2
            val radius = 1f
            canvas.drawCircle(centerX, centerY, radius, dotPaint)
        }
    }

    private fun drawPowerPellets(canvas: Canvas, offsetX: Float, offsetY: Float, cellSize: Float) {
        for ((x, y) in powerPellets) {
            val centerX = offsetX + x * cellSize + cellSize / 2
            val centerY = offsetY + y * cellSize + cellSize / 2
            val pulse = ((sin(System.currentTimeMillis() * 0.006) + 1) * 0.5).toFloat()
            val radius = 3f + pulse * 1f
            canvas.drawCircle(centerX, centerY, radius, powerPelletPaint)
        }
    }

    private fun drawPacman(canvas: Canvas, offsetX: Float, offsetY: Float, cellSize: Float) {
        val centerX = offsetX + pacmanX * cellSize + cellSize / 2
        val centerY = offsetY + pacmanY * cellSize + cellSize / 2
        val radius = cellSize / 2 - 1
        
        // Classic Pac-Man mouth animation
        pacmanMouthAngle += pacmanMouthDirection * 0.6f
        if (pacmanMouthAngle > 0.8f || pacmanMouthAngle < 0f) {
            pacmanMouthDirection *= -1
        }
        
        val startAngle = when (pacmanDirection) {
            Direction.RIGHT -> pacmanMouthAngle
            Direction.LEFT -> 180f + pacmanMouthAngle
            Direction.UP -> 270f + pacmanMouthAngle
            Direction.DOWN -> 90f + pacmanMouthAngle
        }
        
        val sweepAngle = 360f - pacmanMouthAngle * 2
        
        // Draw glow effect
        val glowPaint = Paint().apply {
            color = Color.parseColor("#40FFFF00") // Semi-transparent yellow glow
            style = Paint.Style.FILL
            isAntiAlias = true
            maskFilter = BlurMaskFilter(8f, BlurMaskFilter.Blur.NORMAL)
        }
        val glowRect = RectF(centerX - radius - 4f, centerY - radius - 4f, centerX + radius + 4f, centerY + radius + 4f)
        canvas.drawArc(glowRect, startAngle, sweepAngle, true, glowPaint)
        
        // Draw Pac-Man with enhanced yellow color
        val rect = RectF(centerX - radius, centerY - radius, centerX + radius, centerY + radius)
        canvas.drawArc(rect, startAngle, sweepAngle, true, pacmanPaint)
        
        // Draw highlight for sparkle effect
        val highlightPaint = Paint().apply {
            color = Color.parseColor("#80FFFFFF") // Semi-transparent white
            style = Paint.Style.FILL
            isAntiAlias = true
        }
        val highlightRadius = radius * 0.3f
        canvas.drawCircle(centerX - radius * 0.3f, centerY - radius * 0.3f, highlightRadius, highlightPaint)
        
        // Draw eye with classic positioning
        val eyePaint = Paint().apply {
            color = Color.BLACK
            style = Paint.Style.FILL
            isAntiAlias = true
        }
        
        val eyeOffsetX = when (pacmanDirection) {
            Direction.RIGHT -> 2f
            Direction.LEFT -> -2f
            else -> 0f
        }
        val eyeOffsetY = when (pacmanDirection) {
            Direction.UP -> -2f
            Direction.DOWN -> 2f
            else -> 0f
        }
        
        canvas.drawCircle(centerX + eyeOffsetX, centerY + eyeOffsetY, 1.5f, eyePaint)
    }

    private fun drawGhosts(canvas: Canvas, offsetX: Float, offsetY: Float, cellSize: Float) {
        for (ghost in ghosts) {
            val centerX = offsetX + ghost.x * cellSize + cellSize / 2
            val centerY = offsetY + ghost.y * cellSize + cellSize / 2
            val radius = cellSize / 2 - 1
            
            val paint = when (ghost.mode) {
                GhostMode.SCARED -> {
                    // Animated scared ghost (flashing)
                    val flash = (sin(System.currentTimeMillis() * 0.02) + 1) * 0.5f
                    Paint().apply {
                        color = if (flash > 0.5f) Color.BLUE else Color.WHITE
                        style = Paint.Style.FILL
                        isAntiAlias = true
                    }
                }
                GhostMode.EATEN -> Paint().apply {
                    color = Color.WHITE
                    style = Paint.Style.FILL
                    isAntiAlias = true
                }
                else -> Paint().apply {
                    color = ghost.color
                    style = Paint.Style.FILL
                    isAntiAlias = true
                }
            }
            
            // Draw ghost glow effect
            val glowPaint = Paint().apply {
                color = when (ghost.mode) {
                    GhostMode.SCARED -> Color.parseColor("#400000FF") // Blue glow when scared
                    GhostMode.EATEN -> Color.parseColor("#40FFFFFF") // White glow when eaten
                    else -> Color.parseColor("#40${String.format("%06X", ghost.color and 0xFFFFFF)}") // Color-specific glow
                }
                style = Paint.Style.FILL
                isAntiAlias = true
                maskFilter = BlurMaskFilter(6f, BlurMaskFilter.Blur.NORMAL)
            }
            val glowRadius = radius + 3f
            canvas.drawCircle(centerX, centerY, glowRadius, glowPaint)
            
            // Draw ghost body (upper circle)
            val rect = RectF(centerX - radius, centerY - radius, centerX + radius, centerY + radius)
            canvas.drawCircle(centerX, centerY, radius, paint)
            
            // Draw ghost highlight for sparkle effect
            val highlightPaint = Paint().apply {
                color = Color.parseColor("#60FFFFFF") // Semi-transparent white
                style = Paint.Style.FILL
                isAntiAlias = true
            }
            val highlightRadius = radius * 0.4f
            canvas.drawCircle(centerX - radius * 0.4f, centerY - radius * 0.4f, highlightRadius, highlightPaint)
            
            // Draw ghost bottom (wavy skirt) - more classic look
            val path = Path()
            path.moveTo(centerX - radius, centerY)
            val time = System.currentTimeMillis() * 0.006f
            for (i in 0..4) {
                val x = centerX - radius + (i * radius * 2 / 4)
                val wave = sin(time + i * 1.2f) * 1.5f
                val y = centerY + wave + 1f
                path.lineTo(x, y)
            }
            path.lineTo(centerX + radius, centerY)
            path.close()
            canvas.drawPath(path, paint)
            
            // Draw eyes - classic ghost eyes
            val eyePaint = Paint().apply {
                color = Color.WHITE
                style = Paint.Style.FILL
                isAntiAlias = true
            }
            val pupilPaint = Paint().apply {
                color = if (ghost.mode == GhostMode.SCARED) Color.WHITE else Color.BLACK
                style = Paint.Style.FILL
                isAntiAlias = true
            }
            
            // Calculate eye direction based on ghost movement
            val eyeOffsetX = when (ghost.direction) {
                Direction.RIGHT -> 0.5f
                Direction.LEFT -> -0.5f
                else -> 0f
            }
            val eyeOffsetY = when (ghost.direction) {
                Direction.UP -> -0.5f
                Direction.DOWN -> 0.5f
                else -> 0f
            }
            
            // Left eye
            canvas.drawCircle(centerX - 5f + eyeOffsetX, centerY - 3f + eyeOffsetY, 2.5f, eyePaint)
            canvas.drawCircle(centerX - 5f + eyeOffsetX * 1.2f, centerY - 3f + eyeOffsetY * 1.2f, 1.2f, pupilPaint)
            
            // Right eye
            canvas.drawCircle(centerX + 5f + eyeOffsetX, centerY - 3f + eyeOffsetY, 2.5f, eyePaint)
            canvas.drawCircle(centerX + 5f + eyeOffsetX * 1.2f, centerY - 3f + eyeOffsetY * 1.2f, 1.2f, pupilPaint)
        }
    }

    private fun drawGameOver(canvas: Canvas) {
        val overlayPaint = Paint().apply {
            color = Color.parseColor("#80000000") // Semi-transparent black
            style = Paint.Style.FILL
        }
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), overlayPaint)

        val textPaint = Paint().apply {
            color = Color.WHITE
            textSize = 48f
            textAlign = Paint.Align.CENTER
            isAntiAlias = true
            typeface = Typeface.DEFAULT_BOLD
        }

        val centerX = width / 2f
        val centerY = height / 2f

        canvas.drawText("GAME OVER", centerX, centerY - 50f, textPaint)
        
        textPaint.textSize = 24f
        canvas.drawText("Final Score: $score", centerX, centerY + 20f, textPaint)
        canvas.drawText("Level: $level", centerX, centerY + 50f, textPaint)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        tickRunnable?.let { handler.removeCallbacks(it) }
        soundPool?.release()
        mediaPlayer?.release()
    }
} 