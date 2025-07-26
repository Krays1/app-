package com.example.zell0

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import android.util.Log

class OpenArenaActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "OpenArenaActivity"
        private const val OPENARENA_PACKAGE = "org.openarena.openarena"
    }
    
    private lateinit var networkManager: NetworkManager
    private lateinit var serverStatusText: TextView
    private lateinit var playerCountText: TextView
    private lateinit var launchButton: Button
    private lateinit var webButton: Button
    private lateinit var serverButton: Button
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_openarena)
        
        initializeViews()
        setupClickListeners()
        setupNetworkManager()
        checkOpenArenaInstallation()
        updateServerStatus()
    }
    
    private fun initializeViews() {
        serverStatusText = findViewById(R.id.serverStatusText)
        playerCountText = findViewById(R.id.playerCountText)
        launchButton = findViewById(R.id.launchButton)
        webButton = findViewById(R.id.webButton)
        serverButton = findViewById(R.id.serverButton)
    }
    
    private fun setupClickListeners() {
        launchButton.setOnClickListener {
            launchOpenArena()
        }
        
        webButton.setOnClickListener {
            val intent = Intent(this, OpenArenaGameActivity::class.java)
            startActivity(intent)
        }
        
        serverButton.setOnClickListener {
            showServerInfo()
        }
    }
    
    private fun setupNetworkManager() {
        networkManager = MainActivity.getNetworkManager() ?: NetworkManager()
        
        // Get initial server status
        networkManager.getOpenArenaServerStatus { success, status, players ->
            runOnUiThread {
                updateServerStatus(status, players)
            }
        }
    }
    
    private fun checkOpenArenaInstallation() {
        try {
            packageManager.getPackageInfo(OPENARENA_PACKAGE, 0)
            launchButton.text = "LAUNCH OPENARENA"
            launchButton.isEnabled = true
            Log.d(TAG, "OpenArena is installed")
        } catch (e: Exception) {
            launchButton.text = "INSTALL OPENARENA"
            launchButton.isEnabled = true
            Log.d(TAG, "OpenArena is not installed")
        }
    }
    
    private fun launchOpenArena() {
        try {
            // Try to launch OpenArena app
            val intent = packageManager.getLaunchIntentForPackage(OPENARENA_PACKAGE)
            if (intent != null) {
                startActivity(intent)
            } else {
                // OpenArena not installed, redirect to download
                showInstallDialog()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error launching OpenArena", e)
            showInstallDialog()
        }
    }
    
    private fun launchWebVersion() {
        // Launch web-based OpenArena version
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://openarena.ws"))
        startActivity(intent)
    }
    
    private fun showServerInfo() {
        AlertDialog.Builder(this)
            .setTitle("OpenArena Server Information")
            .setMessage("""
                🎮 OpenArena Server Details:
                
                📡 Server: Zell0 OpenArena Hub
                🌐 Address: 172.94.3.216:27960
                🎯 Game Modes: Deathmatch, CTF, Team DM
                👥 Max Players: 16
                🏆 Features: Custom maps, tournaments
                
                🔗 Connect directly to our server for the best experience!
            """.trimIndent())
            .setPositiveButton("Connect") { _, _ ->
                connectToServer()
            }
            .setNegativeButton("Close", null)
            .show()
    }
    
    private fun showInstallDialog() {
        AlertDialog.Builder(this)
            .setTitle("Install OpenArena")
            .setMessage("""
                🎮 OpenArena is a free, open-source first-person shooter game.
                
                To play OpenArena, you need to install it first:
                
                📱 Android: Available on Google Play Store
                💻 PC: Download from openarena.ws
                🐧 Linux: Available in package managers
                
                Would you like to open the download page?
            """.trimIndent())
            .setPositiveButton("Download") { _, _ ->
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://openarena.ws"))
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun connectToServer() {
        // Connect to our OpenArena server
        val serverAddress = "172.94.3.216:27960"
        
        // Try to launch OpenArena with server parameter
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("openarena://$serverAddress"))
            startActivity(intent)
        } catch (e: Exception) {
            // Fallback to manual connection
            Toast.makeText(this, "Server: $serverAddress", Toast.LENGTH_LONG).show()
            Log.d(TAG, "Server address: $serverAddress")
        }
    }
    
    private fun updateServerStatus(status: String = "Checking...", players: Int = 0) {
        serverStatusText.text = "Server Status: $status"
        playerCountText.text = "Players Online: $players"
        
        // Update button states based on server status
        when (status.lowercase()) {
            "online" -> {
                serverButton.isEnabled = true
                serverButton.text = "CONNECT TO SERVER"
            }
            "offline" -> {
                serverButton.isEnabled = false
                serverButton.text = "SERVER OFFLINE"
            }
            else -> {
                serverButton.isEnabled = false
                serverButton.text = "CHECKING SERVER..."
            }
        }
    }
    
    override fun onResume() {
        super.onResume()
        // Refresh server status when returning to the activity
        networkManager.getOpenArenaServerStatus { success, status, players ->
            runOnUiThread {
                updateServerStatus(status, players)
            }
        }
    }
} 