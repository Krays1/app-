package com.example.zell0

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import kotlin.math.sin
import kotlin.random.Random

class AudioVisualizerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var animationTime = 0f
    private val animationSpeed = 0.05f
    
    // Number of bars in the equalizer
    private val barCount = 15
    
    // Bar properties
    private val barWidth = 12f
    private val barSpacing = 4f
    private val maxBarHeight = 80f
    private val minBarHeight = 8f
    
    // Colors for gradient effect
    private val colors = intArrayOf(
        Color.parseColor("#FF0000"), // Red
        Color.parseColor("#FF6600"), // Orange
        Color.parseColor("#FFCC00"), // Yellow
        Color.parseColor("#00FF00"), // Green
        Color.parseColor("#0066FF"), // Blue
        Color.parseColor("#9900FF")  // Purple
    )
    
    // Individual bar heights and phases
    private val barHeights = FloatArray(barCount) { minBarHeight }
    private val barPhases = FloatArray(barCount) { Random.nextFloat() }
    private val barTargets = FloatArray(barCount) { minBarHeight }
    
    // Smoothing factor for bar height transitions
    private val smoothingFactor = 0.15f
    
    init {
        // Initialize random phases for each bar
        for (i in barHeights.indices) {
            barPhases[i] = Random.nextFloat()
        }
    }
    
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        invalidate()
    }
    
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val centerX = width / 2f
        val centerY = height / 2f
        
        // Calculate total width of all bars
        val totalWidth = barCount * barWidth + (barCount - 1) * barSpacing
        val startX = centerX - totalWidth / 2
        
        // Update animation time
        animationTime += animationSpeed
        if (animationTime > 1.0f) animationTime -= 1.0f
        
        // Update bar heights with smooth transitions
        for (i in barHeights.indices) {
            // Calculate target height based on sine wave with random phase
            val phase = (animationTime + barPhases[i]) % 1.0f
            val waveIntensity = (sin(phase * 2 * Math.PI) * 0.6 + 0.4).toFloat()
            
            // Add some randomness to make it more realistic
            val randomFactor = 0.3f + 0.7f * sin(phase * 3 * Math.PI).toFloat()
            val targetHeight = minBarHeight + (maxBarHeight - minBarHeight) * waveIntensity * randomFactor
            
            barTargets[i] = targetHeight
            
            // Smooth transition to target height
            barHeights[i] += (barTargets[i] - barHeights[i]) * smoothingFactor
        }
        
        // Draw each bar
        for (i in barHeights.indices) {
            val barX = startX + i * (barWidth + barSpacing)
            val barHeight = barHeights[i]
            
            // Create gradient for each bar
            val gradient = LinearGradient(
                barX, centerY + barHeight / 2,
                barX + barWidth, centerY - barHeight / 2,
                colors,
                null,
                Shader.TileMode.CLAMP
            )
            
            paint.shader = gradient
            
            // Draw the bar with rounded corners effect
            val rect = android.graphics.RectF(barX, centerY - barHeight / 2, barX + barWidth, centerY + barHeight / 2)
            canvas.drawRoundRect(rect, barWidth / 2, barWidth / 2, paint)
            
            // Add glow effect
            paint.shader = null
            paint.color = Color.parseColor("#40FF0000")
            paint.setShadowLayer(8f, 0f, 0f, Color.parseColor("#80FF0000"))
            canvas.drawRoundRect(rect, barWidth / 2, barWidth / 2, paint)
            
            // Reset paint
            paint.setShadowLayer(0f, 0f, 0f, Color.TRANSPARENT)
        }
        
        // Continue animation
        invalidate()
    }
    
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val desiredWidth = (barCount * barWidth + (barCount - 1) * barSpacing).toInt() + 40
        val desiredHeight = maxBarHeight.toInt() + 40
        
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
} 