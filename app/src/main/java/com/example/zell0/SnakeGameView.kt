package com.example.zell0

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import kotlin.random.Random
import android.graphics.BitmapFactory
import android.view.GestureDetector
import android.view.MotionEvent
import android.media.SoundPool
import android.media.AudioAttributes
import android.media.MediaPlayer

class SnakeGameView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null, defStyle: Int = 0
) : View(context, attrs, defStyle) {

    // Board size
    private val numRows = 20
    private val numCols = 20
    private val boardBitmap = BitmapFactory.decodeResource(context.resources, R.drawable.snake_checkered_bg)

    // Snake state
    private var snake: MutableList<Point> = mutableListOf(Point(numCols / 2, numRows / 2))
    private var direction: Direction = Direction.RIGHT
    private var nextDirection: Direction = Direction.RIGHT
    private var food: Point = randomFood()
    private var isGameOver = false
    private var score = 0
    private var timeSeconds = 0
    private var waitingForStart = true
    private var gameOverCallback: (() -> Unit)? = null

    // Colors and paint
    private val snakePaint = Paint().apply {
        shader = LinearGradient(0f, 0f, 0f, 100f, Color.RED, Color.parseColor("#FF3B30"), Shader.TileMode.CLAMP)
        style = Paint.Style.FILL
        isAntiAlias = true
    }
    private val snakeEdgePaint = Paint().apply {
        color = Color.parseColor("#B71C1C")
        style = Paint.Style.STROKE
        strokeWidth = 4f
        isAntiAlias = true
    }
    private val foodPaint = Paint().apply {
        shader = RadialGradient(0f, 0f, 1f, Color.YELLOW, Color.RED, Shader.TileMode.MIRROR)
        style = Paint.Style.FILL
        isAntiAlias = true
    }
    private val boardPaint = Paint().apply {
        color = Color.parseColor("#222222")
        style = Paint.Style.FILL
    }
    private val gridPaint = Paint().apply {
        color = Color.parseColor("#333333")
        style = Paint.Style.STROKE
        strokeWidth = 1f
    }

    // Game loop
    private var gameTickInterval = 150L // ms
    private var lastTickTime = System.currentTimeMillis()
    private val tickRunnable = object : Runnable {
        override fun run() {
            if (!isGameOver) {
                updateGame()
                invalidate()
                postDelayed(this, gameTickInterval)
            }
        }
    }

    // Sound effect and music fields
    private var soundPool: SoundPool? = null
    private var eatSoundId: Int = 0
    private var gameOverSoundId: Int = 0
    private var moveSoundId: Int = 0
    private var mediaPlayer: MediaPlayer? = null
    private var soundLoaded = false

    init {
        setBackgroundColor(Color.TRANSPARENT)
        setupSound(context)
    }

    private fun setupSound(context: Context) {
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        soundPool = SoundPool.Builder()
            .setMaxStreams(3)
            .setAudioAttributes(audioAttributes)
            .build()
        // Load sound effects
        eatSoundId = soundPool!!.load(context, R.raw.eat, 1)
        gameOverSoundId = soundPool!!.load(context, R.raw.gameover, 1)
        // moveSoundId = soundPool!!.load(context, R.raw.move, 1) // Uncomment if move.ogg is present
        soundLoaded = true
        // Prepare background music
        mediaPlayer = MediaPlayer.create(context, R.raw.background)
        mediaPlayer?.isLooping = true
        mediaPlayer?.setVolume(0.5f, 0.5f)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (!waitingForStart && !isGameOver) {
            post(tickRunnable)
        }
        startBackgroundMusic()
    }

    override fun onDetachedFromWindow() {
        removeCallbacks(tickRunnable)
        stopBackgroundMusic()
        soundPool?.release()
        soundPool = null
        mediaPlayer?.release()
        mediaPlayer = null
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        // Make the board a perfect square, centered
        val size = width.coerceAtMost(height)
        val left = (width - size) / 2f
        val top = (height - size) / 2f
        val right = left + size
        val bottom = top + size
        val cellWidth = size / numCols.toFloat()
        val cellHeight = size / numRows.toFloat()

        // Draw checkered background image
        val dstRect = RectF(left, top, right, bottom)
        canvas.drawBitmap(boardBitmap, null, dstRect, null)

        // Draw crash (kill zone) border in red
        val borderPaint = Paint().apply {
            color = Color.RED
            style = Paint.Style.STROKE
            strokeWidth = cellWidth.coerceAtMost(cellHeight)
            isAntiAlias = true
        }
        // The border is drawn just inside the outermost cells
        val borderInset = borderPaint.strokeWidth / 2f
        val borderRect = RectF(
            left + borderInset,
            top + borderInset,
            right - borderInset,
            bottom - borderInset
        )
        canvas.drawRect(borderRect, borderPaint)

        // Draw food (polygon/star)
        drawFood(canvas, food, cellWidth, cellHeight, left, top)

        // Draw snake
        for (i in snake.indices) {
            val segment = snake[i]
            val rect = RectF(
                left + segment.x * cellWidth,
                top + segment.y * cellHeight,
                left + (segment.x + 1) * cellWidth,
                top + (segment.y + 1) * cellHeight
            )
            if (i == 0) {
                drawSnakeHead(canvas, rect)
            } else {
                drawSnakeBody(canvas, rect)
            }
        }

        // Draw game over overlay
        if (isGameOver) {
            val overlayPaint = Paint().apply {
                color = Color.argb(180, 0, 0, 0)
                style = Paint.Style.FILL
            }
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), overlayPaint)
            
            val textPaint = Paint().apply {
                color = Color.WHITE
                textSize = 48f
                textAlign = Paint.Align.CENTER
                isAntiAlias = true
            }
            val text = "GAME OVER"
            val x = width / 2f
            val y = height / 2f
            canvas.drawText(text, x, y, textPaint)
            
            val scoreText = "Score: $score"
            val scorePaint = Paint().apply {
                color = Color.WHITE
                textSize = 24f
                textAlign = Paint.Align.CENTER
                isAntiAlias = true
            }
            canvas.drawText(scoreText, x, y + 40f, scorePaint)
        }
        
        // Draw overlay if waiting for start
        if (waitingForStart) {
            val paint = Paint().apply {
                color = Color.argb(180, 0, 0, 0)
                style = Paint.Style.FILL
            }
            canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
            
            val textPaint = Paint().apply {
                color = Color.WHITE
                textSize = 24f
                textAlign = Paint.Align.CENTER
                isAntiAlias = true
            }
            canvas.drawText("Press any direction to start", width / 2f, height / 2f, textPaint)
        }
    }

    private fun drawFood(canvas: Canvas, point: Point, cellWidth: Float, cellHeight: Float, left: Float, top: Float) {
        val cx = left + point.x * cellWidth + cellWidth / 2
        val cy = top + point.y * cellHeight + cellHeight / 2
        val radius = cellWidth.coerceAtMost(cellHeight) * 0.35f
        val paint = Paint(foodPaint)
        paint.shader = RadialGradient(cx, cy, radius, Color.YELLOW, Color.RED, Shader.TileMode.MIRROR)
        val path = createPolygonPath(RectF(cx - radius, cy - radius, cx + radius, cy + radius), 5)
        canvas.drawPath(path, paint)
    }

    private fun drawSnakeEyes(canvas: Canvas, rect: RectF) {
        val eyeRadius = rect.width() * 0.1f
        val offsetX = rect.width() * 0.2f
        val offsetY = rect.height() * 0.2f
        val cx1 = rect.left + offsetX
        val cy1 = rect.top + offsetY
        val cx2 = rect.right - offsetX
        val cy2 = rect.top + offsetY
        val eyePaint = Paint().apply { color = Color.WHITE; style = Paint.Style.FILL }
        canvas.drawCircle(cx1, cy1, eyeRadius, eyePaint)
        canvas.drawCircle(cx2, cy2, eyeRadius, eyePaint)
    }

    private fun createPolygonPath(rect: RectF, sides: Int): Path {
        val path = Path()
        val cx = rect.centerX()
        val cy = rect.centerY()
        val radius = rect.width().coerceAtMost(rect.height()) / 2f * 0.9f
        for (i in 0..sides) {
            val angle = 2.0 * Math.PI * i / sides - Math.PI / 2
            val x = (cx + radius * Math.cos(angle)).toFloat()
            val y = (cy + radius * Math.sin(angle)).toFloat()
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        path.close()
        return path
    }

    private fun updateGame() {
        // Move snake
        direction = nextDirection
        val head = snake.first()
        val newHead = when (direction) {
            Direction.UP -> Point(head.x, head.y - 1)
            Direction.DOWN -> Point(head.x, head.y + 1)
            Direction.LEFT -> Point(head.x - 1, head.y)
            Direction.RIGHT -> Point(head.x + 1, head.y)
        }
        // Check collision with wall (outermost row/col is kill zone)
        if (newHead.x <= 0 || newHead.x >= numCols - 1 || newHead.y <= 0 || newHead.y >= numRows - 1 || snake.contains(newHead)) {
            if (!isGameOver) {
                isGameOver = true
                onGameOver() // Play game over sound and stop music
                gameOverCallback?.invoke()
            }
            return
        }
        snake.add(0, newHead)
        if (newHead == food) {
            score++
            food = randomFood()
            onEatFood()
        } else {
            snake.removeAt(snake.size - 1)
        }
        // Update time
        val now = System.currentTimeMillis()
        if (now - lastTickTime >= 1000) {
            timeSeconds++
            lastTickTime = now
        }
    }

    private fun randomFood(): Point {
        val empty = mutableListOf<Point>()
        for (x in 1 until numCols - 1) {
            for (y in 1 until numRows - 1) {
                val p = Point(x, y)
                if (!snake.contains(p)) empty.add(p)
            }
        }
        return if (empty.isNotEmpty()) empty[Random.nextInt(empty.size)] else Point(1, 1)
    }

    fun setDirection(dir: Direction) {
        // Prevent reversing
        if ((direction == Direction.UP && dir == Direction.DOWN) ||
            (direction == Direction.DOWN && dir == Direction.UP) ||
            (direction == Direction.LEFT && dir == Direction.RIGHT) ||
            (direction == Direction.RIGHT && dir == Direction.LEFT)) {
            return
        }
        nextDirection = dir
        if (waitingForStart) {
            waitingForStart = false
            post(tickRunnable)
            invalidate()
        }
    }

    fun getScore() = score
    fun getTimeSeconds() = timeSeconds
    fun isGameOver() = isGameOver

    fun resetGame() {
        snake = mutableListOf(Point(numCols / 2, numRows / 2))
        direction = Direction.RIGHT
        nextDirection = Direction.RIGHT
        food = randomFood()
        isGameOver = false
        score = 0
        timeSeconds = 0
        waitingForStart = true
        invalidate()
    }

    fun setGameOverCallback(callback: (() -> Unit)?) {
        gameOverCallback = callback
    }

    private fun drawSnakeHead(canvas: Canvas, rect: RectF) {
        val path = createPolygonPath(rect, 6)
        canvas.drawPath(path, snakePaint)
        canvas.drawPath(path, snakeEdgePaint)
        drawSnakeEyes(canvas, rect)
    }

    private fun drawSnakeBody(canvas: Canvas, rect: RectF) {
        val path = createPolygonPath(rect, 6)
        canvas.drawPath(path, snakePaint)
        canvas.drawPath(path, snakeEdgePaint)
    }

    enum class Direction { UP, DOWN, LEFT, RIGHT }

    data class Point(val x: Int, val y: Int)

    // Call this when snake eats food
    private fun onEatFood() {
        playEatSound()
    }
    // Call this when game is over
    private fun onGameOver() {
        playGameOverSound()
        stopBackgroundMusic()
    }
    // Call this to start background music
    private fun startBackgroundMusic() {
        try {
            mediaPlayer?.start()
        } catch (_: Exception) {}
    }
    // Call this to stop background music
    private fun stopBackgroundMusic() {
        try {
            mediaPlayer?.pause()
            mediaPlayer?.seekTo(0)
        } catch (_: Exception) {}
    }
    private fun playEatSound() {
        soundPool?.play(eatSoundId, 1f, 1f, 1, 0, 1f)
    }
    private fun playGameOverSound() {
        soundPool?.play(gameOverSoundId, 1f, 1f, 1, 0, 1f)
    }
    // private fun playMoveSound() {
    //     soundPool?.play(moveSoundId, 0.7f, 0.7f, 1, 0, 1f)
    // }

    fun pauseGame() {
        removeCallbacks(tickRunnable)
        mediaPlayer?.pause()
    }
    fun resumeGame() {
        if (!isGameOver && !waitingForStart) {
            post(tickRunnable)
        }
        mediaPlayer?.start()
    }
} 