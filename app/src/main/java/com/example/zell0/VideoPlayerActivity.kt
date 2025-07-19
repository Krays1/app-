package com.example.zell0

import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.MediaController
import android.widget.VideoView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import java.util.HashMap

class VideoPlayerActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "VideoPlayerActivity"
    }
    
    private lateinit var videoView: VideoView
    private var videoUrl: String? = null
    private var videoTitle: String? = null
    private var videoType: String? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Enable fullscreen mode
        enableFullscreen()
        
        // Get video details from intent
        videoUrl = intent.getStringExtra("video_url")
        videoTitle = intent.getStringExtra("video_title")
        videoType = intent.getStringExtra("video_type")
        
        Log.d(TAG, "Video URL: $videoUrl")
        Log.d(TAG, "Video Title: $videoTitle")
        Log.d(TAG, "Video Type: $videoType")
        
        if (videoUrl.isNullOrEmpty()) {
            showError("No video URL provided")
            return
        }
        
        setupVideoPlayer()
    }
    
    private fun setupVideoPlayer() {
        videoView = VideoView(this)
        setContentView(videoView)
        
        // Set up media controller
        val mediaController = MediaController(this)
        mediaController.setAnchorView(videoView)
        videoView.setMediaController(mediaController)
        
        // Set up error listeners
        videoView.setOnErrorListener { mp, what, extra ->
            Log.e(TAG, "Video error: what=$what, extra=$extra")
            showError("Video playback error: $what")
            true
        }
        
        videoView.setOnPreparedListener { mp ->
            Log.d(TAG, "Video prepared successfully")
            Toast.makeText(this, "Playing: $videoTitle", Toast.LENGTH_SHORT).show()
        }
        
        videoView.setOnCompletionListener { mp ->
            Log.d(TAG, "Video completed")
            Toast.makeText(this, "Playback completed", Toast.LENGTH_SHORT).show()
        }
        
        // Start video playback
        startVideoPlayback()
    }
    
    private fun startVideoPlayback() {
        try {
            Log.d(TAG, "Playing video: $videoUrl")
            val uri = Uri.parse(videoUrl)
            videoView.setVideoURI(uri)
            videoView.start()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting video playback", e)
            showError("Error starting playback: ${e.message}")
        }
    }
    
    private fun showError(message: String) {
        Log.e(TAG, "Video player error: $message")
        
        AlertDialog.Builder(this)
            .setTitle("Playback Error")
            .setMessage("""
                $message
                
                **Troubleshooting:**
                • Check your network connection
                • Try copying the URL and using an external player
                • Verify the video URL is accessible
            """.trimIndent())
            .setPositiveButton("Copy URL") { _, _ ->
                copyVideoUrlToClipboard()
            }
            .setNegativeButton("Close") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .show()
    }
    
    private fun copyVideoUrlToClipboard() {
        try {
            val clipboard = getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
            val clip = android.content.ClipData.newPlainText("Video URL", videoUrl)
            clipboard.setPrimaryClip(clip)
            Toast.makeText(this, "Video URL copied to clipboard", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error copying URL", e)
            Toast.makeText(this, "Error copying URL", Toast.LENGTH_SHORT).show()
        }
    }
    
    override fun onPause() {
        super.onPause()
        if (videoView.isPlaying) {
            videoView.pause()
        }
    }
    
    override fun onResume() {
        super.onResume()
        if (!videoView.isPlaying && videoView.canPause()) {
            videoView.start()
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        videoView.stopPlayback()
    }
    
    private fun enableFullscreen() {
        // Keep screen on during video playback
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // Hide system bars
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
    }
} 