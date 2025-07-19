package com.example.zell0

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.drawable.Drawable
import android.util.AttributeSet
import android.view.View
import android.view.animation.Animation
import android.view.animation.TranslateAnimation
import android.widget.ImageView
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*
import java.util.*
import android.util.Log

class GunShootingView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val gunDrawable: Drawable? = ContextCompat.getDrawable(context, R.drawable.ic_gun_black)
    private val bulletDrawable: Drawable? = ContextCompat.getDrawable(context, R.drawable.ic_bullet_black)
    private val fireDrawable: Drawable? = ContextCompat.getDrawable(context, R.drawable.ic_fire_orange)
    
    private val paint = Paint().apply {
        color = Color.BLACK
        isAntiAlias = true
    }
    
    private val bullets = mutableListOf<Bullet>()
    private val fires = mutableListOf<Fire>()
    private var isShooting = false
    private var shootingJob: Job? = null
    
    private val random = Random()
    
    data class Bullet(
        var x: Float,
        var y: Float,
        var velocityX: Float,
        var velocityY: Float,
        var alpha: Float = 1f
    )
    
    data class Fire(
        var x: Float,
        var y: Float,
        var scale: Float = 1f,
        var alpha: Float = 1f
    )
    
    fun startShooting() {
        Log.d("GunShootingView", "startShooting called - isShooting: $isShooting")
        if (isShooting) return
        
        isShooting = true
        Log.d("GunShootingView", "Starting gun shooting animation")
        shootingJob = CoroutineScope(Dispatchers.Main).launch {
            val startTime = System.currentTimeMillis()
            while (isShooting && System.currentTimeMillis() - startTime < 3000) { // Force 3 seconds for testing
                Log.d("GunShootingView", "Shooting bullet and creating muzzle flash")
                shootBullet()
                createMuzzleFlash()
                delay(200) // Shoot every 200ms
            }
            Log.d("GunShootingView", "Auto-stopping shooting after 3 seconds")
            stopShooting()
        }
        invalidate()
    }
    
    fun stopShooting() {
        Log.d("GunShootingView", "stopShooting called")
        isShooting = false
        shootingJob?.cancel()
        bullets.clear()
        fires.clear()
        invalidate()
    }
    
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        // Draw background for visibility (semi-transparent black)
        canvas.drawColor(Color.parseColor("#33000000"))
        
        // Draw a large, clear gun shape (rectangle + barrel)
        paint.color = Color.BLACK
        paint.style = Paint.Style.FILL
        // Gun body
        val gunBodyLeft = 10f
        val gunBodyTop = height / 2f - 18f
        val gunBodyRight = 70f
        val gunBodyBottom = height / 2f + 18f
        canvas.drawRect(gunBodyLeft, gunBodyTop, gunBodyRight, gunBodyBottom, paint)
        // Gun barrel
        val barrelLeft = gunBodyRight
        val barrelTop = height / 2f - 6f
        val barrelRight = gunBodyRight + 40f
        val barrelBottom = height / 2f + 6f
        canvas.drawRect(barrelLeft, barrelTop, barrelRight, barrelBottom, paint)
        // Gun handle (angled)
        val handleLeft = gunBodyLeft + 10f
        val handleTop = gunBodyBottom - 8f
        val handleRight = gunBodyLeft + 28f
        val handleBottom = gunBodyBottom + 18f
        canvas.save()
        canvas.rotate(-20f, handleLeft, handleTop)
        canvas.drawRect(handleLeft, handleTop, handleRight, handleBottom, paint)
        canvas.restore()
        
        // Draw muzzle flash (animated)
        fires.forEach { fire ->
            // Outer orange/yellow flash
            val flashPaint = Paint().apply {
                color = Color.rgb(255, 180, 40) // Orangey yellow
                style = Paint.Style.FILL
                alpha = (fire.alpha * 255).toInt()
            }
            val size = (32 * fire.scale)
            canvas.drawOval(
                barrelRight - 4f,
                height / 2f - size / 2,
                barrelRight + size,
                height / 2f + size / 2,
                flashPaint
            )
            // Inner red core
            val redPaint = Paint().apply {
                color = Color.RED
                style = Paint.Style.FILL
                alpha = ((fire.alpha * 0.7f) * 255).toInt()
            }
            val redSize = size * 0.45f
            canvas.drawOval(
                barrelRight + size * 0.15f,
                height / 2f - redSize / 2,
                barrelRight + size * 0.15f + redSize,
                height / 2f + redSize / 2,
                redPaint
            )
        }
        
        // Draw animated bullets (orangey yellow)
        bullets.forEach { bullet ->
            val bulletPaint = Paint().apply {
                color = Color.rgb(255, 200, 60)
                style = Paint.Style.FILL
                alpha = (bullet.alpha * 255).toInt()
                setShadowLayer(8f, 0f, 0f, Color.YELLOW)
            }
            canvas.drawOval(
                bullet.x - 10f,
                bullet.y - 4f,
                bullet.x + 10f,
                bullet.y + 4f,
                bulletPaint
            )
            // Update bullet position
            bullet.x += bullet.velocityX
            bullet.y += bullet.velocityY
            bullet.alpha -= 0.02f
        }
        paint.setShadowLayer(0f, 0f, 0f, Color.TRANSPARENT)
        
        // Remove old bullets
        bullets.removeAll { it.x > width + 50f || it.alpha <= 0f }
        // Remove old fires
        fires.removeAll { it.alpha <= 0f }
        
        // Continue animation
        if (isShooting || bullets.isNotEmpty() || fires.isNotEmpty()) {
            invalidate()
        }
    }
    
    private fun shootBullet() {
        val gunX = 70f + 40f // End of barrel
        val gunY = height / 2f
        val bullet = Bullet(
            x = gunX,
            y = gunY,
            velocityX = 18f + random.nextFloat() * 6f,
            velocityY = (random.nextFloat() - 0.5f) * 2f
        )
        bullets.add(bullet)
    }
    
    private fun createMuzzleFlash() {
        val gunX = 70f + 40f // End of barrel
        val gunY = height / 2f
        val fire = Fire(
            x = gunX,
            y = gunY
        )
        fires.add(fire)
        // Animate fire
        CoroutineScope(Dispatchers.Main).launch {
            repeat(8) {
                fire.scale = 1f + it * 0.18f
                fire.alpha = 1f - it * 0.13f
                invalidate()
                delay(30)
            }
            fire.alpha = 0f
            invalidate()
        }
    }
    
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val desiredWidth = 200
        val desiredHeight = 60
        
        val widthMode = MeasureSpec.getMode(widthMeasureSpec)
        val widthSize = MeasureSpec.getSize(widthMeasureSpec)
        val heightMode = MeasureSpec.getMode(heightMeasureSpec)
        val heightSize = MeasureSpec.getSize(heightMeasureSpec)
        
        val width = when (widthMode) {
            MeasureSpec.EXACTLY -> widthSize
            MeasureSpec.AT_MOST -> minOf(desiredWidth, widthSize)
            else -> desiredWidth
        }
        
        val height = when (heightMode) {
            MeasureSpec.EXACTLY -> heightSize
            MeasureSpec.AT_MOST -> minOf(desiredHeight, heightSize)
            else -> desiredHeight
        }
        
        setMeasuredDimension(width, height)
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopShooting()
    }
} 