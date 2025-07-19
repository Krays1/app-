package com.example.zell0

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import android.view.animation.Animation
import android.view.animation.AnimationUtils
import android.widget.TextView
import androidx.core.content.ContextCompat
import kotlin.math.sin

class PulsingRingTextView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : TextView(context, attrs, defStyleAttr) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var animationTime = 0f
    private val animationSpeed = 0.02f // Blood dripping speed
    
    // Blood colors
    private val bloodRedColor = Color.parseColor("#8B0000") // Dark blood red
    private val freshBloodColor = Color.parseColor("#DC143C") // Crimson red
    private val drippingBloodColor = Color.parseColor("#B22222") // Fire brick red
    
    // Blood drop properties for each character
    private val bloodDrops = mutableListOf<BloodDrop>()
    private val maxDropsPerChar = 3
    
    // Character positions for blood drops
    private val charPositions = mutableListOf<CharPosition>()
    
    data class BloodDrop(
        val charIndex: Int,
        var x: Float,
        var y: Float,
        val size: Float,
        val speed: Float,
        var phase: Float
    )
    
    data class CharPosition(
        val x: Float,
        val y: Float,
        val width: Float,
        val height: Float
    )
    
    init {
        paint.textSize = textSize
        paint.typeface = typeface
        paint.textAlign = Paint.Align.CENTER
        paint.isFakeBoldText = true // Make text bolder for better effect
        
        // Initialize blood drops
        initializeBloodDrops()
    }
    
    private fun initializeBloodDrops() {
        bloodDrops.clear()
        charPositions.clear()
    }
    
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        // Start animation when view is attached
        invalidate()
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        // Stop animation when view is detached
    }
    
    override fun onDraw(canvas: Canvas) {
        val text = text.toString()
        if (text.isEmpty()) return
        
        val centerX = width / 2f
        val centerY = height / 2f - (paint.descent() + paint.ascent()) / 2
        
        // Calculate character spacing and positions
        val textWidth = paint.measureText(text)
        val charWidths = FloatArray(text.length)
        var totalWidth = 0f
        
        // Measure each character individually
        for (i in text.indices) {
            charWidths[i] = paint.measureText(text[i].toString())
            totalWidth += charWidths[i]
        }
        
        val startX = centerX - totalWidth / 2
        
        // Update character positions for blood drops
        updateCharPositions(startX, centerY, charWidths)
        
        // Draw the base text in dark blood red
        paint.color = bloodRedColor
        paint.setShadowLayer(8f, 0f, 0f, Color.parseColor("#40000000"))
        
        var currentX = startX
        for (i in text.indices) {
            val char = text[i]
            val charX = currentX + charWidths[i] / 2
            canvas.drawText(char.toString(), charX, centerY, paint)
            currentX += charWidths[i]
        }
        
        // Update and draw blood drops
        updateBloodDrops()
        drawBloodDrops(canvas)
        
        // Update animation time
        animationTime += animationSpeed
        if (animationTime > 1.0f) animationTime -= 1.0f
        
        // Trigger next frame
        invalidate()
    }
    
    private fun updateCharPositions(startX: Float, centerY: Float, charWidths: FloatArray) {
        charPositions.clear()
        var currentX = startX
        
        for (i in charWidths.indices) {
            val charX = currentX + charWidths[i] / 2
            val charWidth = charWidths[i]
            val charHeight = paint.textSize
            
            charPositions.add(CharPosition(
                x = charX,
                y = centerY - charHeight / 2,
                width = charWidth,
                height = charHeight
            ))
            
            currentX += charWidth
        }
    }
    
    private fun updateBloodDrops() {
        // Remove drops that have fallen off screen (now: only if past the bottom of the view)
        bloodDrops.removeAll { it.y > height }
        
        // Update existing drops
        for (drop in bloodDrops) {
            drop.y += drop.speed
            drop.phase += 0.05f
        }
        
        // Add new drops randomly
        if (charPositions.isNotEmpty() && bloodDrops.size < charPositions.size * maxDropsPerChar) {
            val randomCharIndex = (Math.random() * charPositions.size).toInt()
            val charPos = charPositions[randomCharIndex]
            
            if (Math.random() < 0.1) { // 10% chance per frame
                val dropX = charPos.x + (Math.random().toFloat() - 0.5f) * charPos.width * 0.8f
                val dropY = charPos.y
                val dropSize = (3f + Math.random().toFloat() * 8f)
                val dropSpeed = (1.5f + Math.random().toFloat() * 2.5f) // Slightly faster for longer drips
                val dropPhase = (Math.random().toFloat() * 2 * Math.PI.toFloat())
                
                bloodDrops.add(BloodDrop(
                    charIndex = randomCharIndex,
                    x = dropX,
                    y = dropY,
                    size = dropSize,
                    speed = dropSpeed,
                    phase = dropPhase
                ))
            }
        }
    }
    
    private fun drawBloodDrops(canvas: Canvas) {
        for (drop in bloodDrops) {
            // Create blood drop effect with varying colors
            val colorIntensity = (sin(drop.phase) * 0.3 + 0.7).toFloat()
            val bloodColor = interpolateColor(bloodRedColor, freshBloodColor, colorIntensity)
            
            paint.color = bloodColor
            paint.setShadowLayer(drop.size * 0.5f, 0f, 0f, Color.parseColor("#80000000"))
            
            // Draw main blood drop
            canvas.drawCircle(drop.x, drop.y, drop.size, paint)
            
            // Draw smaller trailing drops
            val trailCount = 3
            for (i in 1..trailCount) {
                val trailY = drop.y - i * drop.size * 0.8f
                val trailSize = drop.size * (1f - i * 0.3f)
                val trailAlpha = 1f - i * 0.3f
                
                if (trailSize > 1f && trailAlpha > 0f) {
                    paint.alpha = (trailAlpha * 255).toInt()
                    canvas.drawCircle(drop.x, trailY, trailSize, paint)
                }
            }
            
            paint.alpha = 255 // Reset alpha
        }
    }
    
    private fun interpolateColor(color1: Int, color2: Int, ratio: Float): Int {
        val r1 = Color.red(color1)
        val g1 = Color.green(color1)
        val b1 = Color.blue(color1)
        
        val r2 = Color.red(color2)
        val g2 = Color.green(color2)
        val b2 = Color.blue(color2)
        
        val r = (r1 + (r2 - r1) * ratio).toInt()
        val g = (g1 + (g2 - g1) * ratio).toInt()
        val b = (b1 + (b2 - b1) * ratio).toInt()
        
        return Color.rgb(r, g, b)
    }
} 