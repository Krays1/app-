package com.example.zell0

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.provider.Settings
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.UUID
import android.media.MediaRecorder
import android.widget.RadioGroup
import android.widget.ProgressBar
import android.widget.ArrayAdapter
import android.widget.ToggleButton
import android.widget.Switch
import android.content.Intent
import android.provider.MediaStore
import android.net.Uri
import androidx.activity.result.contract.ActivityResultContracts
import android.graphics.BitmapFactory
import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import android.app.Activity
import android.util.Log
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import java.util.Locale

class MainActivity : AppCompatActivity(), TextToSpeech.OnInitListener {
    
    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.INTERNET,
            Manifest.permission.ACCESS_NETWORK_STATE,
            Manifest.permission.MODIFY_AUDIO_SETTINGS
        )
        private var staticPreviousUserList: List<ConnectedUser>? = null
        private var instance: MainActivity? = null
        
        fun getLatestUserList(): List<ConnectedUser> {
            val result = staticPreviousUserList ?: emptyList()
            android.util.Log.d("MainActivity", "getLatestUserList called: ${result.size} users, ${result.count { it.battlefieldStats != null }} with stats")
            return result
        }
        
        fun forceRefreshAllStats() {
            instance?.forceRefreshAllStats()
        }
        
        fun forceRefreshAllSteamStats() {
            instance?.forceRefreshAllSteamStats()
        }
    }
    
    // Button states for different mic conditions
    enum class MicButtonState {
        IDLE,       // Default state - gray glow
        ACTIVE,     // Mic is active/ready - green glow
        BUSY,       // Currently recording - red glow
        INCOMING,   // Receiving audio - blue glow
        WAITING     // Processing/waiting - orange glow
    }
    
    // UI Components
    private lateinit var messagesList: LinearLayout  // Changed from RecyclerView to LinearLayout
    private lateinit var pushToTalkButton: FrameLayout
    private lateinit var pushToTalkButtonRing: ImageView
    private lateinit var pushToTalkButtonText: TextView
    private lateinit var pushToTalkTimerText: TextView
    private lateinit var messageInput: EditText
    private lateinit var sendButton: ImageButton
    private lateinit var imageButton: ImageButton
    private lateinit var btnTopUserCount: FrameLayout
    private lateinit var topUserCountBadge: TextView
    private lateinit var btnSettings: ImageButton
    private lateinit var settingsText: TextView
    private lateinit var btnToggleMode: ImageButton
    private lateinit var toggleText: TextView
    private lateinit var audioVisualizerContainer: FrameLayout
    
    // Simple settings dialog components (no longer using tabs)
    private var isVoiceAnnouncementsEnabled = true // voice announcements setting
    
    // These views are no longer in the new layout
    // private lateinit var connectionStatus: ImageView
    // private lateinit var connectionText: TextView
    // private lateinit var audioVisualizerLayout: LinearLayout
    // private lateinit var recordingStatus: TextView
    
    // Core managers
    private lateinit var audioManager: AudioManager
    private lateinit var networkManager: NetworkManager
    private lateinit var messageAdapter: MessageAdapter
    private lateinit var userListAdapter: UserListAdapter
    private lateinit var battlefieldAPI: BattlefieldStatsManager
    private lateinit var steamAPI: SteamStatsManager
    // Removed: private lateinit var psnAPI: PSNStatsManager
    
    // Settings
    private var microphoneSettings: MicrophoneSettings = MicrophoneSettings()
    
    // State variables
    private var deviceId: String = ""
    private var isRecording = false
    private var isConnected = false
    private var isMicEnabled = true // Microphone enabled by default
    private var isLiveStreamingEnabled = false // Live audio streaming state
    private var isPushToTalkMode = true // true = push-to-talk, false = toggle mode
    private var isLiveToggleActive = false // For toggle mode
    private var isToggleMode = false // true = toggle mode, false = push-to-talk mode
    private var isGroupChatActive = false // Live group chat when toggle mode is enabled
    private var recordingStartTime = 0L
    private val messages = mutableListOf<Message>()
    private var currentUser: User? = null
    
    // Live audio streaming buffers removed - no longer needed
    // Messages now come through onAudioMessageReceived directly
    
    // Live playback timeout handling
    private val livePlaybackTimeoutHandler = Handler(Looper.getMainLooper())
    private var livePlaybackTimeoutRunnable: Runnable? = null
    private val LIVE_PLAYBACK_TIMEOUT = 2000L // 2 seconds
    
    // Text-to-Speech for announcing user joins
    private lateinit var textToSpeech: TextToSpeech
    private var isTTSInitialized = false
    private val pendingAnnouncements = mutableListOf<String>()
    
    // Track user list changes for voice announcements
    private var previousUserList = mutableListOf<ConnectedUser>()
    
    // Push-to-talk timer variables
    private var pushToTalkTimer: Handler? = null
    private var pushToTalkTimerRunnable: Runnable? = null
    private var pushToTalkTimeRemaining = 0
    private val MAX_PUSH_TO_TALK_SECONDS = 20
    private var isPushToTalkLiveStreaming = false
    
    // Live audio receiving state
    private var currentLiveReceivingUsers = mutableMapOf<String, View>() // userId -> temporary message view
    
    // Image picker launcher
    private val imagePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            result.data?.data?.let { uri ->
                handleImageSelection(uri)
            }
        }
    }

    // Add this property at the top with other UI components
    private lateinit var globalGunShootingView: GunShootingView
    private var gunAnimationStopHandler: Handler? = null
    private var gunAnimationStopRunnable: Runnable? = null
    

    


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Set instance for static access
        instance = this
        
        // Check if user is logged in
        currentUser = LoginActivity.getCurrentUser(this)
        if (currentUser == null) {
            // Redirect to login if not authenticated
            LoginActivity.logout(this)
            return
        }
        
        enableEdgeToEdge()
        setContentView(R.layout.activity_main)
        
        // ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
        //     val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
        //     v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
        //     insets
        // }
        
        initializeViews()
        setupPermissions()
        setupManagers()
        setupUI()
        
        // Load microphone settings
        microphoneSettings = MicrophoneSettings.load(this)
        
        // Use username as primary identifier instead of device ID
        // This allows users to access their data from any device
        deviceId = currentUser?.username ?: "anonymous"
        Log.d("MainActivity", "Using username as identifier: $deviceId")
        
        // Display current user info
        setupUserInfo()
        
        // Initialize Text-to-Speech
        initializeTextToSpeech()
        
        // Auto-connect to server
        connectToServer()
        
        // REMOVED: Automatic server user clearing - this was causing users to disappear
        // The server should maintain the user list properly without manual clearing
    }
    
    // Update toggle button appearance based mode
    private fun updateToggleButtonAppearance() {
        if (isToggleMode) {
            // GREEN when toggle mode is ON
            btnToggleMode.setBackgroundResource(R.drawable.circle_button_green)
            toggleText.setTextColor(0xFF00FF00.toInt()) // Green text
            Log.d("ToggleButton", "Toggle mode ON - showing green button and text")
        } else {
            // RED when toggle mode is OFF (default push-to-talk)
            btnToggleMode.setBackgroundResource(R.drawable.circle_button_red)
            toggleText.setTextColor(0xFFFF0000.toInt()) // Red text
            Log.d("ToggleButton", "Toggle mode OFF - showing red button and text")
        }
    }
    
    // Audio Visualizer Functions
    private fun showAudioVisualizer() {
        Log.d("AudioVisualizer", "showAudioVisualizer called")
        runOnUiThread {
            Log.d("AudioVisualizer", "Making visualizer visible")
            audioVisualizerContainer.visibility = View.VISIBLE
            animateAudioBars()
        }
    }
    
    private fun hideAudioVisualizer() {
        runOnUiThread {
            audioVisualizerContainer.visibility = View.GONE
        }
    }
    
    private fun animateAudioBars() {
        // The custom AudioVisualizerView handles its own animation
        // Just show the container and let the view animate itself
        Log.d("AudioVisualizer", "Audio visualizer animation started")
        
        // Hide after a delay
        Handler(Looper.getMainLooper()).postDelayed({
            if (audioVisualizerContainer.visibility == View.VISIBLE) {
                Log.d("AudioVisualizer", "Animation finished, hiding visualizer")
                hideAudioVisualizer()
            }
        }, 3000) // Show for 3 seconds
    }
    

    
    // Update microphone button appearance based on state
    private fun updateMicButtonState(state: MicButtonState) {
        val ringResource = when (state) {
            MicButtonState.IDLE -> R.drawable.mic_button_idle
            MicButtonState.ACTIVE -> R.drawable.mic_button_active
            MicButtonState.BUSY -> R.drawable.mic_button_busy
            MicButtonState.INCOMING -> R.drawable.mic_button_incoming
            MicButtonState.WAITING -> R.drawable.mic_button_waiting
        }
        
        val buttonText = when (state) {
            MicButtonState.IDLE -> if (isToggleMode) "TAP TO\nTALK" else "PUSH TO\nTALK"
            MicButtonState.ACTIVE -> if (isToggleMode) "READY" else "READY"
            MicButtonState.BUSY -> if (isToggleMode) "TALKING..." else "RECORDING..."
            MicButtonState.INCOMING -> "RECEIVING"
            MicButtonState.WAITING -> "PROCESSING"
        }
        
        pushToTalkButtonRing.setImageResource(ringResource)
        pushToTalkButtonText.text = buttonText
        
        // Debug info
        Log.d("MicButton", "State changed to: $state")
    }
    
    private fun initializeViews() {
        // Update with new layout IDs
        messagesList = findViewById(R.id.messagesContainer)
        pushToTalkButton = findViewById(R.id.btnPushToTalk)
        pushToTalkButtonRing = findViewById(R.id.btnPushToTalkRing)
        pushToTalkButtonText = findViewById(R.id.btnPushToTalkText)
        pushToTalkTimerText = findViewById(R.id.pushToTalkTimer)
        messageInput = findViewById(R.id.messageInput)
        sendButton = findViewById(R.id.btnSendMessage)
        imageButton = findViewById(R.id.btnImageUpload)
        // Top user count button (removed old settings button)
        btnTopUserCount = findViewById(R.id.btnTopUserCount)
        topUserCountBadge = findViewById(R.id.topUserCountBadge)
        btnSettings = findViewById(R.id.btnSettings)
        settingsText = findViewById(R.id.settingsText)
        btnToggleMode = findViewById(R.id.btnToggleMode)
        toggleText = findViewById(R.id.toggleText)
        audioVisualizerContainer = findViewById(R.id.audioVisualizerContainer)
        globalGunShootingView = findViewById(R.id.globalGunShootingView)
        

    }
    
    private fun setupPermissions() {
        val missingPermissions = REQUIRED_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        
        if (missingPermissions.isNotEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                missingPermissions.toTypedArray(),
                PERMISSION_REQUEST_CODE
            )
        }
    }
    
    private fun setupManagers() {
        // Initialize AudioManager
        audioManager = AudioManager(this)
        audioManager.updateMicrophoneSettings(microphoneSettings)
        
            // Initialize Battlefield Stats Manager
        battlefieldAPI = BattlefieldStatsManager(this)
        
        // Initialize Steam Stats Manager
        steamAPI = SteamStatsManager(this)
        
        // Initialize PSN Stats Manager
        // Removed: psnAPI = PSNStatsManager(this)
        audioManager.setRecordingListener(object : AudioManager.AudioRecordingListener {
            override fun onRecordingStarted() {
                runOnUiThread {
                    isRecording = true
                    updateMicButtonState(MicButtonState.BUSY)
                    
                    // Show audio visualizer when user starts talking
                    showAudioVisualizer()
                    
                    // Start showing recording duration
                    showRecordingDuration()
                }
            }
            
            override fun onRecordingStopped(audioData: ByteArray) {
                runOnUiThread {
                    isRecording = false
                    updateMicButtonState(
                        if (isMicEnabled) MicButtonState.ACTIVE else MicButtonState.IDLE
                    )
                }
                
                // Send audio message
                if (isConnected && audioData.isNotEmpty()) {
                    runOnUiThread {
                        updateMicButtonState(MicButtonState.WAITING)
                    }
                    
                    networkManager.sendAudioMessage(audioData)
                    
                    // Add to local messages
                    val message = Message(
                        id = UUID.randomUUID().toString(),
                        type = Message.MessageType.AUDIO,
                        content = "Voice message",
                        audioData = audioData,
                        senderId = deviceId,
                        senderName = currentUser?.getDisplayName() ?: "You",
                        senderProfilePic = currentUser?.profilePicBase64,
                        timestamp = System.currentTimeMillis(),
                        duration = calculateAudioDuration(audioData),
                        isFromCurrentUser = true
                    )
                    
                    runOnUiThread {
                        messages.add(message)
                        addMessageToUI(message)
                        scrollToBottom()
                        
                        // Reset to appropriate state after processing
                        updateMicButtonState(
                            if (isMicEnabled) MicButtonState.ACTIVE else MicButtonState.IDLE
                        )
                    }
                }
            }
            
            override fun onRecordingError(error: String) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Recording error: $error", Toast.LENGTH_SHORT).show()
                    isRecording = false
                    updateMicButtonState(
                        if (isMicEnabled) MicButtonState.ACTIVE else MicButtonState.IDLE
                    )
                }
            }
            
            override fun onAudioLevel(level: Int) {
                // Update audio visualizer here if needed
            }
        })
        
        audioManager.setPlaybackListener(object : AudioManager.AudioPlaybackListener {
            override fun onPlaybackStarted() {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Playing audio...", Toast.LENGTH_SHORT).show()
                }
            }
            
            override fun onPlaybackStopped() {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Playback stopped", Toast.LENGTH_SHORT).show()
                }
            }
            
            override fun onPlaybackError(error: String) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Playback error: $error", Toast.LENGTH_SHORT).show()
                }
            }
        })
        
        // Initialize NetworkManager
        networkManager = NetworkManager()
        networkManager.setNetworkListener(object : NetworkManager.NetworkListener {
            override fun onConnected() {
                runOnUiThread {
                    isConnected = true
                    updateConnectionStatus(true)
                    Toast.makeText(this@MainActivity, "Connected to server", Toast.LENGTH_SHORT).show()
                    
                    // Request user list after connection to ensure we get the current users
                    Handler(Looper.getMainLooper()).postDelayed({
                        if (isConnected) {
                            Log.d("UserList", "Requesting user list after connection")
                            networkManager.sendGetUserList()
                            
                            // Also fetch stats for all users after initial connection
                            Handler(Looper.getMainLooper()).postDelayed({
                                if (isConnected && previousUserList.isNotEmpty()) {
                                    Log.d("UserList", "Fetching stats for all users after initial connection")
                                    fetchStatsForAllUsers()
                                }
                            }, 3000) // Wait 3 seconds for user list to be processed
                        }
                    }, 1000) // Wait 1 second for registration to complete
                }
            }
            
            override fun onDisconnected() {
                runOnUiThread {
                    isConnected = false
                    updateConnectionStatus(false)
                    Toast.makeText(this@MainActivity, "Disconnected from server", Toast.LENGTH_SHORT).show()
                }
            }
            
            override fun onConnectionError(error: String) {
                runOnUiThread {
                    isConnected = false
                    updateConnectionStatus(false)
                    
                    // Show retry dialog for connection errors
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle("Connection Error")
                        .setMessage("Failed to connect to server:\n$error\n\nWould you like to retry?")
                        .setPositiveButton("Retry") { _, _ ->
                            Toast.makeText(this@MainActivity, "Retrying connection...", Toast.LENGTH_SHORT).show()
                            CoroutineScope(Dispatchers.IO).launch {
                                networkManager.reconnect()
                            }
                        }
                        .setNegativeButton("Cancel", null)
                        .show()
                }
            }
            
            override fun onTextMessageReceived(message: String, senderId: String, senderName: String, senderProfilePic: String?, timestamp: Long) {
                val msg = Message(
                    id = UUID.randomUUID().toString(),
                    type = Message.MessageType.TEXT,
                    content = message,
                    senderId = senderId,
                    senderName = senderName,
                    senderProfilePic = senderProfilePic,
                    timestamp = timestamp,
                    isFromCurrentUser = false
                )
                
                runOnUiThread {
                    messages.add(msg)
                    addMessageToUI(msg)
                    scrollToBottom()
                }
            }
            
            override fun onAudioMessageReceived(audioData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?, duration: Long, timestamp: Long) {
                val msg = Message(
                    id = UUID.randomUUID().toString(),
                    type = Message.MessageType.AUDIO,
                    content = "Voice message",
                    audioData = audioData,
                    senderId = senderId,
                    senderName = senderName,
                    senderProfilePic = senderProfilePic,
                    timestamp = timestamp,
                    duration = duration,
                    isFromCurrentUser = false
                )
                
                runOnUiThread {
                    // Remove temporary receiving message (if any)
                    removeReceivingMessage(senderId)
                    
                    // Show audio visualizer for received voice message
                    showAudioVisualizer()
                    
                    // Show incoming state briefly
                    updateMicButtonState(MicButtonState.INCOMING)
                    
                    messages.add(msg)
                    addMessageToUI(msg)
                    scrollToBottom()
                    
                    // Reset to appropriate state after 1 second
                    pushToTalkButton.postDelayed({
                        updateMicButtonState(
                            if (isMicEnabled) MicButtonState.ACTIVE else MicButtonState.IDLE
                        )
                    }, 1000)
                }
            }
            
            override fun onUserJoined(userId: String) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "$userId joined", Toast.LENGTH_SHORT).show()
                    // Voice announcement will be handled when user list is updated
                    Log.d("UserJoin", "User joined: $userId, waiting for user list update for announcement")
                }
            }
            
            override fun onUserListUpdated(users: List<ConnectedUser>) {
                runOnUiThread {
                    Log.d("UserList", "onUserListUpdated called with ${users.size} users")
                    for (user in users) {
                        Log.d("UserList", "User: ${user.username} (${user.deviceId})")
                    }
                    
                    // Store the current user list BEFORE clearing it
                    val oldUserList = previousUserList.toList()
                    
                    // Check for new users by comparing with the old list
                    val newUsers = users.filter { newUser ->
                        !oldUserList.any { prevUser -> prevUser.deviceId == newUser.deviceId }
                    }
                    
                    Log.d("UserList", "Found ${newUsers.size} new users: ${newUsers.map { it.username }}")
                    
                    // Announce new users (but not on first connection when we get the full list)
                    if (oldUserList.isNotEmpty() && newUsers.isNotEmpty()) {
                        for (newUser in newUsers) {
                            Log.d("UserJoin", "Announcing new user: ${newUser.username}")
                            announceUserJoined(newUser.username)
                        }
                    }
                    
                    // Update the previous user list
                    previousUserList.clear()
                    previousUserList.addAll(users)
                    staticPreviousUserList = previousUserList.map { it.copy() } // Defensive copy
                    
                    // Update the UI with the current user list
                    userListAdapter.updateUsers(users)
                    updateUserCount(users.size)
                    
                    // Fetch stats for new users only (more efficient)
                    if (newUsers.isNotEmpty()) {
                        Log.d("UserList", "Fetching stats for ${newUsers.size} new users")
                        CoroutineScope(Dispatchers.IO).launch {
                            for (newUser in newUsers) {
                                try {
                                    Log.d("UserList", "Fetching stats for new user: ${newUser.username}")
                                    fetchBattlefieldStatsForUser(newUser)
                                    fetchSteamStatsForUser(newUser)
                                    // Small delay between users to prevent overwhelming the API
                                    kotlinx.coroutines.delay(200)
                                } catch (e: Exception) {
                                    Log.e("UserList", "Error fetching stats for new user ${newUser.username}: ${e.message}")
                                }
                            }
                        }
                    } else {
                        Log.d("UserList", "No new users, skipping stats fetch")
                    }
                }
            }
            
            override fun onImageMessageReceived(imageData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?, caption: String, timestamp: Long) {
                val msg = Message(
                    id = UUID.randomUUID().toString(),
                    type = Message.MessageType.IMAGE,
                    content = caption.ifEmpty { "Photo" },
                    imageData = imageData,
                    senderId = senderId,
                    senderName = senderName,
                    senderProfilePic = senderProfilePic,
                    timestamp = timestamp,
                    isFromCurrentUser = false
                )
                
                runOnUiThread {
                    messages.add(msg)
                    addMessageToUI(msg)
                    scrollToBottom()
                }
            }
            
            override fun onLiveAudioChunkReceived(audioData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?) {
                Log.d("LiveStreaming", "=== LIVE AUDIO CHUNK RECEIVED ===")
                Log.d("LiveStreaming", "Sender: $senderName (ID: $senderId)")
                Log.d("LiveStreaming", "Audio chunk size: ${audioData.size} bytes")
                Log.d("LiveStreaming", "Current receiving users: ${currentLiveReceivingUsers.keys}")
                
                // Play live audio chunk using streaming playback
                audioManager.playLiveAudioChunk(audioData)
                
                // Show audio visualizer when receiving live audio
                showAudioVisualizer()
                
                // Update mic button state to show incoming audio
                runOnUiThread {
                    updateMicButtonState(MicButtonState.INCOMING)
                    
                    // Show temporary "receiving" message if not already showing
                    if (!currentLiveReceivingUsers.containsKey(senderId)) {
                        Log.d("LiveStreaming", "✅ Showing receiving message for $senderName")
                        showReceivingMessage(senderId, senderName, senderProfilePic)
                    } else {
                        Log.d("LiveStreaming", "⏭️ Already showing receiving message for $senderName, skipping")
                    }
                }
                
                // Reset timeout for stopping live playback
                livePlaybackTimeoutRunnable?.let {
                    livePlaybackTimeoutHandler.removeCallbacks(it)
                }
                
                livePlaybackTimeoutRunnable = Runnable {
                    Log.d("LiveStreaming", "Live playback timeout - stopping playback")
                    stopLivePlayback()
                    
                    // Remove temporary receiving message
                    runOnUiThread {
                        removeReceivingMessage(senderId)
                        hideAudioVisualizer()
                        // Stop gun animation after 3 seconds
                        gunAnimationStopHandler = Handler(Looper.getMainLooper())
                        gunAnimationStopRunnable = Runnable {
                            globalGunShootingView.stopShooting()
                        }
                        gunAnimationStopRunnable?.let { gunAnimationStopHandler?.postDelayed(it, 3000) }
                    }
                }
                
                livePlaybackTimeoutHandler.postDelayed(livePlaybackTimeoutRunnable!!, LIVE_PLAYBACK_TIMEOUT)
                
                // Don't accumulate live audio for history - this was causing mini messages
                // The final audio message will come through onAudioMessageReceived
            }
            

            
            override fun onUserLeft(userId: String) {
                runOnUiThread {
                    // Find the username from the previous user list
                    val userName = previousUserList.find { it.deviceId == userId }?.username ?: userId
                    Toast.makeText(this@MainActivity, "$userName left", Toast.LENGTH_SHORT).show()
                    
                    // Announce user left with female voice
                    Log.d("UserLeft", "Announcing user left: $userName")
                    announceUserLeft(userName)
                }
            }
            
            override fun onFileShared(fileId: String, fileName: String, fileType: String, fileSize: Long, uploadedBy: String) {
                // Not implemented - file sharing removed
            }
            
            override fun onFileListUpdated(files: List<SharedFile>) {
                // Not implemented - file sharing removed
            }
            
            override fun onFileUploadSuccess(fileId: String, fileName: String) {
                // Not implemented - file sharing removed
            }
            
            override fun onFileDownloadResponse(fileId: String, fileName: String, fileType: String, fileData: ByteArray) {
                // Not implemented - file sharing removed
            }
            
            override fun onFileMessageReceived(fileData: ByteArray, fileName: String, fileSize: Long, mimeType: String, senderId: String, senderName: String, senderProfilePic: String?, timestamp: Long) {
                // Not implemented - file sharing removed
            }
        })
    }
    
    private fun setupUI() {
        // Setup message adapter (still used for message structure)
        messageAdapter = MessageAdapter(messages) { message ->
            // Play audio message
            message.audioData?.let { audioData ->
                audioManager.playAudio(audioData)
            }
        }
        
        // messagesList is now a LinearLayout, not RecyclerView
        // messagesList.layoutManager = LinearLayoutManager(this)
        // messagesList.adapter = messageAdapter
        
        // Setup user list adapter
        userListAdapter = UserListAdapter()
        
        // Setup toggle mode button
        btnToggleMode.setOnClickListener {
            isToggleMode = !isToggleMode
            
            if (isToggleMode) {
                // Enable live group chat when toggle mode is enabled
                isGroupChatActive = true
                startLiveGroupChat()
                Toast.makeText(this, "Toggle Mode - Live Group Chat Enabled", Toast.LENGTH_LONG).show()
            } else {
                // Disable live group chat when switching back to push-to-talk
                isGroupChatActive = false
                stopLiveGroupChat()
                Toast.makeText(this, "Push-to-Talk Mode", Toast.LENGTH_SHORT).show()
            }
            
            updateToggleButtonAppearance()
            updateMicButtonState(if (isMicEnabled) MicButtonState.ACTIVE else MicButtonState.IDLE)
        }
        
        // Setup audio button with dual mode support
        pushToTalkButton.setOnTouchListener { _, event ->
            if (!isToggleMode) {
                // Push-to-Talk Mode: Hold to talk with live streaming
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        if (isConnected && !isRecording && isMicEnabled) {
                            startPushToTalkWithLiveStreaming()
                        } else if (!isMicEnabled) {
                            Toast.makeText(this, "Microphone is OFF", Toast.LENGTH_SHORT).show()
                        }
                        true
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        if (isRecording) {
                            stopPushToTalkWithLiveStreaming()
                        }
                        true
                    }
                    else -> false
                }
            } else {
                false // Let click listener handle live toggle mode
            }
        }
        
        // Setup click listener for toggle mode
        pushToTalkButton.setOnClickListener {
            Log.d("ToggleMode", "Button clicked - isToggleMode: $isToggleMode")
            
            if (isToggleMode) {
                // Toggle Mode: Tap to start/stop talking
                Log.d("ToggleMode", "In toggle mode - isMicEnabled: $isMicEnabled, isConnected: $isConnected, isLiveToggleActive: $isLiveToggleActive")
                
                if (!isMicEnabled) {
                    Toast.makeText(this, "Microphone is OFF", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                
                if (!isConnected) {
                    Toast.makeText(this, "Not connected to server", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                
                if (isLiveToggleActive) {
                    // Stop talking
                    Log.d("ToggleMode", "Stopping toggle talk...")
                    stopPushToTalkWithLiveStreaming()
                    isLiveToggleActive = false
                    updateMicButtonState(MicButtonState.ACTIVE)
                    Toast.makeText(this, "Stopped talking", Toast.LENGTH_SHORT).show()
                } else {
                    // Start talking
                    Log.d("ToggleMode", "Starting toggle talk...")
                    startPushToTalkWithLiveStreaming()
                    isLiveToggleActive = true
                    updateMicButtonState(MicButtonState.BUSY)
                    Toast.makeText(this, "Started talking - tap to stop", Toast.LENGTH_SHORT).show()
                }
            } else {
                Log.d("ToggleMode", "In push-to-talk mode - ignoring click")
            }
        }
        
        // Setup send button
        sendButton.setOnClickListener {
            val message = messageInput.text.toString().trim()
            if (message.isNotEmpty() && isConnected) {
                sendTextMessage(message)
                messageInput.text.clear()
            }
        }
        
        // Setup message input
        messageInput.setOnEditorActionListener { _, _, _ ->
            val message = messageInput.text.toString().trim()
            if (message.isNotEmpty() && isConnected) {
                sendTextMessage(message)
                messageInput.text.clear()
            }
            true
        }
        
        // Setup top user count button click
        btnTopUserCount.setOnClickListener {
            showUserListDialog()
        }
        

        
        // Setup settings button click
        btnSettings.setOnClickListener {
            showSettingsMenu()
        }
        
        // Setup Battlefield stats button click
        findViewById<ImageButton>(R.id.btnBattlefieldStats).setOnClickListener {
            try {
                // Filter users with stats
                val usersWithStats = previousUserList.filter { it.hasBattlefieldStats() }
                val intent = Intent(this, BattlefieldStatsActivity::class.java)
                // Pass as a serializable extra
                intent.putExtra("usersWithStats", ArrayList(usersWithStats))
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "Error opening Battlefield stats: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
        
        // Setup Steam stats button click
        findViewById<ImageButton>(R.id.btnSteamStats).setOnClickListener {
            // Filter users with Steam stats
            val usersWithSteamStats = previousUserList.filter { it.hasSteamStats() }
            val intent = Intent(this, SteamStatsActivity::class.java)
            // Pass as a serializable extra
            intent.putExtra("usersWithStats", ArrayList(usersWithSteamStats))
            startActivity(intent)
        }
        
        // Setup Videos button click
        findViewById<ImageButton>(R.id.videosButton).setOnClickListener {
            try {
                val intent = Intent(this, VideosActivity::class.java)
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "Error opening Videos: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
        
        // Setup Chess button click
        findViewById<ImageButton>(R.id.chessButton).setOnClickListener {
            try {
                val intent = Intent(this, ChessActivity::class.java)
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(this, "Error opening Chess: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
        

        
        // Initialize user count badge
        topUserCountBadge.text = "0"
        topUserCountBadge.visibility = View.VISIBLE
        
        // Audio mode is now fixed to Push-to-Talk mode
        // Mode selector removed - app uses push-to-talk with live streaming by default
        
        // Microphone toggle switch removed - microphone is always enabled
        // App now uses push-to-talk with live streaming by default
        
        // Setup image button
        imageButton.setOnClickListener {
            openImagePicker()
        }
        
        // Initialize button state - microphone is enabled by default
        updateMicButtonState(MicButtonState.ACTIVE)
        updateToggleButtonAppearance()
    }
    
    private fun connectToServer() {
        CoroutineScope(Dispatchers.IO).launch {
            networkManager.connect(deviceId, currentUser)
        }
    }
    
    private fun initializeTextToSpeech() {
        textToSpeech = TextToSpeech(this, this)
    }
    
    override fun onInit(status: Int) {
        Log.d("TTS", "TTS onInit called with status: $status")
        
        if (status == TextToSpeech.SUCCESS) {
            val result = textToSpeech.setLanguage(Locale.US)
            Log.d("TTS", "Set language result: $result")
            
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.e("TTS", "Language not supported")
                isTTSInitialized = false
            } else {
                isTTSInitialized = true
                
                // Configure TTS settings for better voice quality
                textToSpeech.setPitch(1.1f) // Slightly higher pitch for female voice
                textToSpeech.setSpeechRate(0.9f) // Slightly slower for clarity
                
                // Try to set a female voice if available
                val voices = textToSpeech.voices
                Log.d("TTS", "Available voices: ${voices?.size ?: 0}")
                
                val femaleVoice = voices?.find { voice ->
                    Log.d("TTS", "Checking voice: ${voice.name} - ${voice.locale}")
                    voice.name.contains("female", ignoreCase = true) || 
                    voice.name.contains("woman", ignoreCase = true) ||
                    voice.name.contains("girl", ignoreCase = true) ||
                    (voice.locale == Locale.US && voice.quality >= 300)
                }
                
                femaleVoice?.let { voice ->
                    textToSpeech.voice = voice
                    Log.d("TTS", "Selected female voice: ${voice.name}")
                } ?: run {
                    Log.d("TTS", "No female voice found, using default voice")
                }
                
                Log.d("TTS", "Text-to-Speech initialized successfully")
                
                // Play any pending announcements
                runOnUiThread {
                    Handler(Looper.getMainLooper()).postDelayed({
                        if (isTTSInitialized) {
                            Log.d("TTS", "TTS initialized - playing pending announcements")
                            playPendingAnnouncements()
                        }
                    }, 1000) // Wait 1 second before processing pending announcements
                }
            }
        } else {
            Log.e("TTS", "Text-to-Speech initialization failed with status: $status")
            isTTSInitialized = false
        }
    }
    
    private fun announceUserJoined(userName: String) {
        Log.d("TTS", "announceUserJoined called - TTS initialized: $isTTSInitialized, Voice announcements: $isVoiceAnnouncementsEnabled")
        
        if (isVoiceAnnouncementsEnabled) {
            val message = "$userName joined the room"
            
            if (isTTSInitialized) {
                val result = textToSpeech.speak(message, TextToSpeech.QUEUE_ADD, null, "user_join_$userName")
                Log.d("TTS", "Speaking: $message, Result: $result")
            } else {
                Log.w("TTS", "TTS not initialized yet, queueing announcement...")
                pendingAnnouncements.add(message)
            }
        } else {
            Log.d("TTS", "Voice announcements disabled by user")
        }
    }
    
    private fun announceUserLeft(userName: String) {
        Log.d("TTS", "announceUserLeft called - TTS initialized: $isTTSInitialized, Voice announcements: $isVoiceAnnouncementsEnabled")
        
        if (isVoiceAnnouncementsEnabled) {
            val message = "$userName left the room"
            
            if (isTTSInitialized) {
                val result = textToSpeech.speak(message, TextToSpeech.QUEUE_ADD, null, "user_left_$userName")
                Log.d("TTS", "Speaking: $message, Result: $result")
            } else {
                Log.w("TTS", "TTS not initialized yet, queueing announcement...")
                pendingAnnouncements.add(message)
            }
        } else {
            Log.d("TTS", "Voice announcements disabled by user")
        }
    }
    
    private fun fetchBattlefieldStatsForUser(user: ConnectedUser) {
        try {
            Log.d("BattlefieldAPI", "=== FETCHING STATS FOR USER ===")
            Log.d("BattlefieldAPI", "User deviceId: ${user.deviceId}")
            Log.d("BattlefieldAPI", "User username: '${user.username}'")
            Log.d("BattlefieldAPI", "User isOnline: ${user.isOnline}")
            
            // Use a timeout to prevent hanging
            val stats = kotlinx.coroutines.runBlocking {
                kotlinx.coroutines.withTimeout(5000) {
                    battlefieldAPI.getPlayerStats(user.username)
                }
            }
            
            if (stats != null) {
                Log.d("BattlefieldAPI", "✅ Found stats for '${user.username}': ${stats.getFormattedStats()}")
                Log.d("BattlefieldAPI", "Stats username: '${stats.username}'")
                Log.d("BattlefieldAPI", "Stats platform: ${stats.platform}")
                
                // Update the user with Battlefield stats
                val updatedUser = user.copy(battlefieldStats = stats)
                
                runOnUiThread {
                    Log.d("BattlefieldAPI", "Updating UI for user '${user.username}' with stats")
                    
                    // Update the user in the adapter immediately
                    userListAdapter.updateUserWithStats(updatedUser)
                    
                    // Update the user in the previous user list to maintain consistency
                    val previousIndex = previousUserList.indexOfFirst { it.deviceId == user.deviceId }
                    if (previousIndex != -1) {
                        Log.d("BattlefieldAPI", "Updating user in previousUserList at index $previousIndex")
                        previousUserList[previousIndex] = updatedUser
                    } else {
                        Log.d("BattlefieldAPI", "User not found in previousUserList, adding new user")
                        previousUserList.add(updatedUser)
                    }
                    
                    // CRITICAL: Update staticPreviousUserList immediately after stats update
                    staticPreviousUserList = previousUserList.map { it.copy() }
                    android.util.Log.d("MainActivity", "Updated staticPreviousUserList: ${staticPreviousUserList?.size} users, ${staticPreviousUserList?.count { it.battlefieldStats != null }} with stats")
                    
                    // Show a toast with the stats for new users only
                    val isNewUser = !previousUserList.any { it.deviceId == user.deviceId }
                    if (isNewUser) {
                        val statsMessage = "${user.username} joined with Battlefield stats: ${stats.getFormattedStats()}"
                        Toast.makeText(this@MainActivity, statsMessage, Toast.LENGTH_LONG).show()
                        
                        // Announce the Battlefield stats
                        if (isVoiceAnnouncementsEnabled && isTTSInitialized) {
                            val announcement = "${user.username} joined with Battlefield stats: Rank ${stats.rank}, ${stats.kills} kills, ${String.format("%.1f", stats.kdr)} KDR"
                            textToSpeech.speak(announcement, TextToSpeech.QUEUE_ADD, null, "battlefield_stats_${user.username}")
                        }
                    }
                }
            } else {
                Log.d("BattlefieldAPI", "❌ No Battlefield stats found for user: '${user.username}'")
                
                // Even if no stats found, ensure user is properly updated in lists
                runOnUiThread {
                    Log.d("BattlefieldAPI", "Updating UI for user '${user.username}' without stats")
                    userListAdapter.updateUserWithStats(user)
                    
                    // Ensure user is in previousUserList
                    val previousIndex = previousUserList.indexOfFirst { it.deviceId == user.deviceId }
                    if (previousIndex != -1) {
                        previousUserList[previousIndex] = user
                    } else {
                        previousUserList.add(user)
                    }
                    
                    // CRITICAL: Update staticPreviousUserList immediately
                    staticPreviousUserList = previousUserList.map { it.copy() }
                }
            }
            
        } catch (e: Exception) {
            Log.e("BattlefieldAPI", "Error fetching Battlefield stats for '${user.username}': ${e.message}", e)
            
            // On error, still update the user to show "Online" status
            runOnUiThread {
                userListAdapter.updateUserWithStats(user)
                
                // Ensure user is in previousUserList
                val previousIndex = previousUserList.indexOfFirst { it.deviceId == user.deviceId }
                if (previousIndex != -1) {
                    previousUserList[previousIndex] = user
                } else {
                    previousUserList.add(user)
                }
                
                // CRITICAL: Update staticPreviousUserList immediately
                staticPreviousUserList = previousUserList.map { it.copy() }
            }
        }
    }
    
    private fun playPendingAnnouncements() {
        if (isTTSInitialized && pendingAnnouncements.isNotEmpty()) {
            Log.d("TTS", "Playing ${pendingAnnouncements.size} pending announcements")
            
            for (message in pendingAnnouncements) {
                textToSpeech.speak(message, TextToSpeech.QUEUE_ADD, null, "pending_${System.currentTimeMillis()}")
                Log.d("TTS", "Playing pending: $message")
            }
            
            pendingAnnouncements.clear()
        }
    }
    
    private fun setupUserInfo() {
        currentUser?.let { user ->
            // Update connection text to show username
            runOnUiThread {
                // connectionText.text = "Connecting as ${user.getDisplayName()}"
            }
        }
    }
    
    private fun sendTextMessage(message: String) {
        networkManager.sendTextMessage(message)
        
        // Add to local messages
        val msg = Message(
            id = UUID.randomUUID().toString(),
            type = Message.MessageType.TEXT,
            content = message,
            senderId = deviceId,
            senderName = currentUser?.getDisplayName() ?: "You",
            senderProfilePic = currentUser?.profilePicBase64,
            timestamp = System.currentTimeMillis(),
            isFromCurrentUser = true
        )
        
        runOnUiThread {
            messages.add(msg)
            addMessageToUI(msg)
            scrollToBottom()
        }
    }
    
    private fun updateConnectionStatus(connected: Boolean) {
        isConnected = connected
        // Connection status updates are simplified now that tabs are removed
    }
    
    private fun scrollToBottom() {
        // Updated for LinearLayout instead of RecyclerView
        val scrollView = findViewById<android.widget.ScrollView>(R.id.messagesScrollView)
        scrollView.post {
            scrollView.fullScroll(android.view.View.FOCUS_DOWN)
        }
    }
    
    private fun startLiveAudioStreaming() {
        if (!isConnected) {
            Log.d("LiveStreaming", "Cannot start: not connected to server")
            Toast.makeText(this, "Not connected to server", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (!isMicEnabled) {
            Log.d("LiveStreaming", "Cannot start: microphone is disabled")
            return
        }
        
        Log.d("LiveStreaming", "Starting live audio streaming...")
        
        // Start continuous audio streaming
        audioManager.startLiveStreaming { audioChunk ->
            // Send real-time audio chunks to server
            Log.d("LiveStreaming", "Sending audio chunk: ${audioChunk.size} bytes")
            networkManager.sendLiveAudioChunk(audioChunk)
        }
        
        Log.d("LiveStreaming", "Live streaming started successfully")
    }
    
    private fun stopLiveAudioStreaming() {
        Log.d("LiveStreaming", "Stopping live audio streaming...")
        audioManager.stopLiveStreaming()
        Log.d("LiveStreaming", "Live streaming stopped")
    }
    
    private fun startPushToTalkWithLiveStreaming() {
        Log.d("PushToTalk", "Starting push-to-talk with live streaming...")
        
        recordingStartTime = System.currentTimeMillis()
        isPushToTalkLiveStreaming = true
        
        // Start recording for message history
        audioManager.startRecording()
        
        // Start live streaming for real-time audio
        audioManager.startLiveStreaming { audioChunk ->
            if (isPushToTalkLiveStreaming) {
                Log.d("PushToTalk", "Sending live audio chunk: ${audioChunk.size} bytes")
                networkManager.sendLiveAudioChunk(audioChunk)
            }
        }
        
        // Update UI
        updateMicButtonState(MicButtonState.BUSY)
        
        // Only show timer in push-to-talk mode, not in toggle mode
        if (!isToggleMode) {
            pushToTalkTimeRemaining = MAX_PUSH_TO_TALK_SECONDS
            showTimer()
            startPushToTalkTimer()
        }
        
        Log.d("PushToTalk", "Push-to-talk with live streaming started")
        

        // Start gun animation
        globalGunShootingView.startShooting()
        gunAnimationStopRunnable?.let { gunAnimationStopHandler?.removeCallbacks(it) }
    }
    
    private fun stopPushToTalkWithLiveStreaming() {
        Log.d("PushToTalk", "Stopping push-to-talk with live streaming...")
        
        isPushToTalkLiveStreaming = false
        
        // Stop recording (this will save the message)
        audioManager.stopRecording()
        
        // Stop live streaming
        audioManager.stopLiveStreaming()
        
        // Stop timer only in push-to-talk mode
        if (!isToggleMode) {
            stopPushToTalkTimer()
            hideTimer()
        }
        
        // In toggle mode, reset the toggle state
        if (isToggleMode) {
            isLiveToggleActive = false
        }
        
        // Update UI
        updateMicButtonState(if (isMicEnabled) MicButtonState.ACTIVE else MicButtonState.IDLE)
        
        Log.d("PushToTalk", "Push-to-talk with live streaming stopped")
        
        // Stop gun animation after 3 seconds
        gunAnimationStopHandler = Handler(Looper.getMainLooper())
        gunAnimationStopRunnable = Runnable {
            globalGunShootingView.stopShooting()
        }
        gunAnimationStopRunnable?.let { gunAnimationStopHandler?.postDelayed(it, 3000) }
    }
    
    private fun startPushToTalkTimer() {
        pushToTalkTimer = Handler(Looper.getMainLooper())
        pushToTalkTimerRunnable = object : Runnable {
            override fun run() {
                if (isPushToTalkLiveStreaming && pushToTalkTimeRemaining > 0) {
                    pushToTalkTimeRemaining--
                    updateTimerDisplay()
                    
                    if (pushToTalkTimeRemaining <= 0) {
                        // Time's up - automatically stop recording
                        Log.d("PushToTalk", "20-second timer expired, stopping recording")
                        stopPushToTalkWithLiveStreaming()
                        Toast.makeText(this@MainActivity, "20-second limit reached", Toast.LENGTH_SHORT).show()
                    } else {
                        pushToTalkTimer?.postDelayed(this, 1000)
                    }
                }
            }
        }
        pushToTalkTimer?.postDelayed(pushToTalkTimerRunnable!!, 1000)
    }
    
    private fun stopPushToTalkTimer() {
        pushToTalkTimerRunnable?.let { runnable ->
            pushToTalkTimer?.removeCallbacks(runnable)
        }
        pushToTalkTimer = null
        pushToTalkTimerRunnable = null
    }
    
    private fun showTimer() {
        runOnUiThread {
            pushToTalkTimerText.visibility = View.VISIBLE
            pushToTalkTimerText.text = pushToTalkTimeRemaining.toString()
        }
    }
    
    private fun hideTimer() {
        runOnUiThread {
            pushToTalkTimerText.visibility = View.GONE
        }
    }
    
    private fun updateTimerDisplay() {
        runOnUiThread {
            pushToTalkTimerText.text = pushToTalkTimeRemaining.toString()
            
            // Change color based on time remaining
            when {
                pushToTalkTimeRemaining <= 5 -> {
                    pushToTalkTimerText.setBackgroundResource(R.drawable.circle_background_red)
                }
                pushToTalkTimeRemaining <= 10 -> {
                    pushToTalkTimerText.setBackgroundResource(R.drawable.circle_background_small) // Orange/yellow
                }
                else -> {
                    pushToTalkTimerText.setBackgroundResource(R.drawable.circle_background_red)
                }
            }
        }
    }
    
    private fun stopLivePlayback() {
        Log.d("LiveStreaming", "Stopping live playback...")
        audioManager.stopLivePlayback()
        runOnUiThread {
            updateMicButtonState(if (isMicEnabled) MicButtonState.ACTIVE else MicButtonState.IDLE)
        }
    }
    
    private fun startLiveGroupChat() {
        if (!isConnected) {
            Log.d("GroupChat", "Cannot start live group chat: not connected")
            return
        }
        
        if (!isMicEnabled) {
            Log.d("GroupChat", "Cannot start live group chat: microphone disabled")
            return
        }
        
        Log.d("GroupChat", "Starting live group chat...")
        
        // Start continuous live streaming for group chat
        audioManager.startLiveStreaming { audioChunk ->
            if (isGroupChatActive) {
                Log.d("GroupChat", "Sending group chat audio chunk: ${audioChunk.size} bytes")
                networkManager.sendLiveAudioChunk(audioChunk)
            }
        }
        
        // Start live playback for receiving audio from others
        audioManager.startLivePlayback()
        
        Log.d("GroupChat", "Live group chat started successfully")
    }
    
    private fun stopLiveGroupChat() {
        Log.d("GroupChat", "Stopping live group chat...")
        
        // Stop live streaming
        audioManager.stopLiveStreaming()
        
        // Stop live playback
        audioManager.stopLivePlayback()
        
        Log.d("GroupChat", "Live group chat stopped")
    }
    
    // Removed accumulateLiveAudioForHistory and saveLiveAudioToHistory methods
    // These were causing mini messages during live streaming
    // The final audio message now comes through onAudioMessageReceived directly
    
    private fun calculateAudioDuration(audioData: ByteArray): Long {
        // Use the actual sample rate from current audio settings
        val sampleRate = microphoneSettings.audioQuality.sampleRate
        val bytesPerSample = 2
        val samples = audioData.size / bytesPerSample
        return (samples * 1000L) / sampleRate
    }
    
    private fun showUserListDialog() {
        val dialog = AlertDialog.Builder(this)
            .setView(R.layout.dialog_user_list)
            .create()
        
        dialog.show()
        
        val userListRecyclerView = dialog.findViewById<RecyclerView>(R.id.userListRecyclerView)
        val closeButton = dialog.findViewById<ImageButton>(R.id.closeButton)
        
        userListRecyclerView?.layoutManager = LinearLayoutManager(this)
        userListRecyclerView?.adapter = userListAdapter
        
        // Force refresh stats for all current users when dialog opens
        Log.d("UserList", "Dialog opened, force refreshing stats for all users")
        fetchStatsForAllUsers()
        
        closeButton?.setOnClickListener {
            dialog.dismiss()
        }
    }
    
    private fun updateUserCount(count: Int) {
        runOnUiThread {
            topUserCountBadge.text = count.toString()
            topUserCountBadge.visibility = View.VISIBLE // Always visible to show count
            

        }
    }

    

    
    private fun testBattlefieldStats() {
        // Test with current connected users
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d("BattlefieldTest", "Testing Battlefield stats for current users")
                
                for (user in previousUserList) {
                    Log.d("BattlefieldTest", "Testing stats for user: ${user.username}")
                    val stats = battlefieldAPI.getPlayerStats(user.username)
                    
                    if (stats != null) {
                        runOnUiThread {
                            val statsMessage = "${user.username}: ${stats.getFormattedStats()}"
                            Toast.makeText(this@MainActivity, statsMessage, Toast.LENGTH_LONG).show()
                            Log.d("BattlefieldTest", "Found stats for '${user.username}': $statsMessage")
                        }
                    } else {
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "No stats found for '${user.username}'", Toast.LENGTH_LONG).show()
                            Log.d("BattlefieldTest", "No stats found for '${user.username}'")
                        }
                    }
                    
                    // Wait a bit between tests
                    kotlinx.coroutines.delay(500)
                }
                
            } catch (e: Exception) {
                Log.e("BattlefieldTest", "Error testing Battlefield stats", e)
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    private fun forceRefreshAllStats() {
        Log.d("BattlefieldAPI", "=== FORCE REFRESHING ALL STATS ===")
        Toast.makeText(this, "Refreshing all Battlefield stats...", Toast.LENGTH_SHORT).show()
        fetchStatsForAllUsers()
    }
    
    private fun fetchStatsForAllUsers() {
        Log.d("BattlefieldAPI", "=== FETCHING STATS FOR ALL USERS ===")
        
        // Filter users that don't have stats yet
        val usersWithoutStats = previousUserList.filter { !it.hasBattlefieldStats() }
        Log.d("BattlefieldAPI", "Total users: ${previousUserList.size}, Users without stats: ${usersWithoutStats.size}")
        
        if (usersWithoutStats.isEmpty()) {
            Log.d("BattlefieldAPI", "All users already have stats, skipping fetch")
            runOnUiThread {
                Toast.makeText(this@MainActivity, "All users already have stats", Toast.LENGTH_SHORT).show()
            }
            return
        }
        
        CoroutineScope(Dispatchers.IO).launch {
            for (user in usersWithoutStats) {
                try {
                    Log.d("BattlefieldAPI", "Fetching stats for: ${user.username}")
                    fetchBattlefieldStatsForUser(user)
                    kotlinx.coroutines.delay(300) // Delay to prevent overwhelming
                } catch (e: Exception) {
                    Log.e("BattlefieldAPI", "Error fetching stats for ${user.username}: ${e.message}")
                }
            }
            
            runOnUiThread {
                Toast.makeText(this@MainActivity, "Stats fetch completed for ${usersWithoutStats.size} users", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun fetchSteamStatsForUser(user: ConnectedUser) {
        try {
            Log.d("SteamAPI", "=== FETCHING STEAM STATS FOR USER ===")
            Log.d("SteamAPI", "User deviceId: ${user.deviceId}")
            Log.d("SteamAPI", "User username: '${user.username}'")
            Log.d("SteamAPI", "User isOnline: ${user.isOnline}")
            
            // Use a timeout to prevent hanging
            val stats = kotlinx.coroutines.runBlocking {
                kotlinx.coroutines.withTimeout(5000) {
                    steamAPI.getPlayerStats(user.username)
                }
            }
            
            if (stats != null) {
                Log.d("SteamAPI", "✅ Found Steam stats for '${user.username}': ${stats.getFormattedStats()}")
                Log.d("SteamAPI", "Steam username: '${stats.username}'")
                Log.d("SteamAPI", "Steam status: ${stats.status}")
                
                // Update the user with Steam stats
                val updatedUser = user.copy(steamStats = stats)
                
                runOnUiThread {
                    Log.d("SteamAPI", "Updating UI for user '${user.username}' with Steam stats")
                    
                    // Update the user in the adapter immediately
                    userListAdapter.updateUserWithStats(updatedUser)
                    
                    // Update the user in the previous user list to maintain consistency
                    val previousIndex = previousUserList.indexOfFirst { it.deviceId == user.deviceId }
                    if (previousIndex != -1) {
                        Log.d("SteamAPI", "Updating user in previousUserList at index $previousIndex")
                        previousUserList[previousIndex] = updatedUser
                    } else {
                        Log.d("SteamAPI", "User not found in previousUserList, adding new user")
                        previousUserList.add(updatedUser)
                    }
                    
                    // CRITICAL: Update staticPreviousUserList immediately after stats update
                    staticPreviousUserList = previousUserList.map { it.copy() }
                    android.util.Log.d("MainActivity", "Updated staticPreviousUserList: ${staticPreviousUserList?.size} users, ${staticPreviousUserList?.count { it.steamStats != null }} with Steam stats")
                    
                    // Show a toast with the stats for new users only
                    val isNewUser = !previousUserList.any { it.deviceId == user.deviceId }
                    if (isNewUser) {
                        val statsMessage = "${user.username} joined with Steam stats: ${stats.getFormattedStats()}"
                        Toast.makeText(this@MainActivity, statsMessage, Toast.LENGTH_LONG).show()
                        
                        // Announce the Steam stats
                        if (isVoiceAnnouncementsEnabled && isTTSInitialized) {
                            val announcement = "${user.username} joined with Steam stats: ${stats.username} - ${stats.status}"
                            textToSpeech.speak(announcement, TextToSpeech.QUEUE_ADD, null, "steam_stats_${user.username}")
                        }
                    }
                }
            } else {
                Log.d("SteamAPI", "❌ No Steam stats found for user: '${user.username}'")
                
                // Even if no stats found, ensure user is properly updated in lists
                runOnUiThread {
                    Log.d("SteamAPI", "Updating UI for user '${user.username}' without Steam stats")
                    userListAdapter.updateUserWithStats(user)
                    
                    // Ensure user is in previousUserList
                    val previousIndex = previousUserList.indexOfFirst { it.deviceId == user.deviceId }
                    if (previousIndex != -1) {
                        previousUserList[previousIndex] = user
                    } else {
                        previousUserList.add(user)
                    }
                    
                    // CRITICAL: Update staticPreviousUserList immediately
                    staticPreviousUserList = previousUserList.map { it.copy() }
                }
            }
            
        } catch (e: Exception) {
            Log.e("SteamAPI", "Error fetching Steam stats for '${user.username}': ${e.message}", e)
            
            // On error, still update the user to show "Online" status
            runOnUiThread {
                userListAdapter.updateUserWithStats(user)
                
                // Ensure user is in previousUserList
                val previousIndex = previousUserList.indexOfFirst { it.deviceId == user.deviceId }
                if (previousIndex != -1) {
                    previousUserList[previousIndex] = user
                } else {
                    previousUserList.add(user)
                }
                
                // CRITICAL: Update staticPreviousUserList immediately
                staticPreviousUserList = previousUserList.map { it.copy() }
            }
        }
    }
    
    private fun fetchAllSteamStatsForUsers() {
        Log.d("SteamAPI", "=== FETCHING STEAM STATS FOR ALL USERS ===")
        
        // Filter users that don't have Steam stats yet
        val usersWithoutSteamStats = previousUserList.filter { !it.hasSteamStats() }
        Log.d("SteamAPI", "Total users: ${previousUserList.size}, Users without Steam stats: ${usersWithoutSteamStats.size}")
        
        if (usersWithoutSteamStats.isEmpty()) {
            Log.d("SteamAPI", "All users already have Steam stats, skipping fetch")
            runOnUiThread {
                Toast.makeText(this@MainActivity, "All users already have Steam stats", Toast.LENGTH_SHORT).show()
            }
            return
        }
        
        CoroutineScope(Dispatchers.IO).launch {
            for (user in usersWithoutSteamStats) {
                try {
                    Log.d("SteamAPI", "Fetching Steam stats for: ${user.username}")
                    fetchSteamStatsForUser(user)
                    kotlinx.coroutines.delay(300) // Delay to prevent overwhelming
                } catch (e: Exception) {
                    Log.e("SteamAPI", "Error fetching Steam stats for ${user.username}: ${e.message}")
                }
            }
            
            runOnUiThread {
                Toast.makeText(this@MainActivity, "Steam stats fetch completed for ${usersWithoutSteamStats.size} users", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun forceRefreshAllSteamStats() {
        Log.d("SteamAPI", "=== FORCE REFRESHING ALL STEAM STATS ===")
        Toast.makeText(this, "Refreshing all Steam stats...", Toast.LENGTH_SHORT).show()
        fetchAllSteamStatsForUsers()
    }
    
    // All PSN/PlayStation functions removed - PlayStation functionality disabled
    

    
    private fun addMessageToUI(message: Message) {
        val messageView = layoutInflater.inflate(R.layout.item_message, messagesList, false)
        
        // Get layout elements
        val sentMessageLayout = messageView.findViewById<LinearLayout>(R.id.sentMessageLayout)
        val receivedMessageLayout = messageView.findViewById<LinearLayout>(R.id.receivedMessageLayout)
        val audioMessageLayout = messageView.findViewById<LinearLayout>(R.id.audioMessageLayout)
        val messageTimestamp = messageView.findViewById<TextView>(R.id.messageTimestamp)
        
        // Set timestamp
        messageTimestamp?.text = formatTimestamp(message.timestamp)
        
        when (message.type) {
            Message.MessageType.TEXT -> {
                if (message.isFromCurrentUser) {
                    // Sent message
                    sentMessageLayout?.visibility = View.VISIBLE
                    val sentMessage = messageView.findViewById<TextView>(R.id.sentMessage)
                    val sentProfilePic = messageView.findViewById<ImageView>(R.id.sentProfilePic)
                    
                    sentMessage?.text = message.content
                    setProfilePicture(sentProfilePic, message.senderProfilePic)
                } else {
                    // Received message
                    receivedMessageLayout?.visibility = View.VISIBLE
                    val receivedMessage = messageView.findViewById<TextView>(R.id.receivedMessage)
                    val receivedSenderName = messageView.findViewById<TextView>(R.id.receivedSenderName)
                    val receivedProfilePic = messageView.findViewById<ImageView>(R.id.receivedProfilePic)
                    
                    receivedMessage?.text = message.content
                    receivedSenderName?.text = message.senderName
                    setProfilePicture(receivedProfilePic, message.senderProfilePic)
                }
            }
            Message.MessageType.AUDIO -> {
                audioMessageLayout?.visibility = View.VISIBLE
                val playButton = messageView.findViewById<ImageButton>(R.id.playButton)
                val audioSenderName = messageView.findViewById<TextView>(R.id.audioSenderName)
                val audioDuration = messageView.findViewById<TextView>(R.id.audioDuration)
                val audioProfilePic = messageView.findViewById<ImageView>(R.id.audioProfilePic)
                
                audioSenderName?.text = message.senderName
                audioDuration?.text = formatDuration(message.duration)
                
                // Set profile picture for audio message
                setProfilePicture(audioProfilePic, message.senderProfilePic)
                
                playButton?.setOnClickListener {
                    message.audioData?.let { audioData ->
                        // Play audio
                        audioManager.playAudio(audioData)
                    }
                }
            }
            Message.MessageType.IMAGE -> {
                if (message.isFromCurrentUser) {
                    sentMessageLayout?.visibility = View.VISIBLE
                    val sentMessage = messageView.findViewById<TextView>(R.id.sentMessage)
                    val sentProfilePic = messageView.findViewById<ImageView>(R.id.sentProfilePic)
                    
                    sentMessage?.text = "📷 Photo (tap to view)"
                    setProfilePicture(sentProfilePic, message.senderProfilePic)
                    
                    // Add click listener to view image
                    sentMessage?.setOnClickListener {
                        viewImageMessage(message)
                    }
                } else {
                    receivedMessageLayout?.visibility = View.VISIBLE
                    val receivedMessage = messageView.findViewById<TextView>(R.id.receivedMessage)
                    val receivedSenderName = messageView.findViewById<TextView>(R.id.receivedSenderName)
                    val receivedProfilePic = messageView.findViewById<ImageView>(R.id.receivedProfilePic)
                    
                    receivedMessage?.text = "📷 Photo (tap to view)"
                    receivedSenderName?.text = message.senderName
                    setProfilePicture(receivedProfilePic, message.senderProfilePic)
                    
                    // Add click listener to view image
                    receivedMessage?.setOnClickListener {
                        viewImageMessage(message)
                    }
                }
            }
        }
        
        messagesList.addView(messageView)
    }
    
    private fun formatTimestamp(timestamp: Long): String {
        val formatter = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
        return formatter.format(java.util.Date(timestamp))
    }
    
    private fun showReceivingMessage(senderId: String, senderName: String, senderProfilePic: String?) {
        Log.d("ReceivingMessage", "=== SHOW RECEIVING MESSAGE ===")
        Log.d("ReceivingMessage", "Sender ID: $senderId")
        Log.d("ReceivingMessage", "Sender Name: $senderName")
        Log.d("ReceivingMessage", "Current receiving users: ${currentLiveReceivingUsers.keys}")
        
        // Check if we already have a receiving message for this sender
        if (currentLiveReceivingUsers.containsKey(senderId)) {
            Log.d("ReceivingMessage", "❌ Already showing receiving message for $senderName, skipping")
            return
        }
        
        Log.d("ReceivingMessage", "✅ Creating new receiving message for $senderName")
        
        // Create temporary message view
        val messageView = layoutInflater.inflate(R.layout.item_message, messagesList, false)
        
        // Set up as a receiving message
        val receivedMessageLayout = messageView.findViewById<LinearLayout>(R.id.receivedMessageLayout)
        val receivedMessage = messageView.findViewById<TextView>(R.id.receivedMessage)
        val receivedSenderName = messageView.findViewById<TextView>(R.id.receivedSenderName)
        val receivedProfilePic = messageView.findViewById<ImageView>(R.id.receivedProfilePic)
        val messageTimestamp = messageView.findViewById<TextView>(R.id.messageTimestamp)
        
        receivedMessageLayout?.visibility = View.VISIBLE
        receivedMessage?.text = "🎙️ Receiving voice message..."
        receivedSenderName?.text = senderName
        messageTimestamp?.text = formatTimestamp(System.currentTimeMillis())
        setProfilePicture(receivedProfilePic, senderProfilePic)
        
        // Add pulsing animation to show it's active
        receivedMessage?.alpha = 0.7f
        receivedMessage?.animate()?.alpha(1.0f)?.setDuration(800)?.withEndAction {
            receivedMessage.animate().alpha(0.7f).setDuration(800).withEndAction {
                // Continue pulsing if still receiving
                if (currentLiveReceivingUsers.containsKey(senderId)) {
                    receivedMessage.animate().alpha(1.0f).setDuration(800).start()
                }
            }.start()
        }?.start()
        
        // Store the view for this sender BEFORE adding to messages list
        currentLiveReceivingUsers[senderId] = messageView
        
        // Add to messages list
        messagesList.addView(messageView)
        scrollToBottom()
        
        Log.d("ReceivingMessage", "✅ Successfully added receiving message for $senderName")
        Log.d("ReceivingMessage", "Total receiving users now: ${currentLiveReceivingUsers.size}")
    }
    
    private fun removeReceivingMessage(senderId: String) {
        Log.d("ReceivingMessage", "=== REMOVE RECEIVING MESSAGE ===")
        Log.d("ReceivingMessage", "Sender ID: $senderId")
        Log.d("ReceivingMessage", "Current receiving users: ${currentLiveReceivingUsers.keys}")
        
        currentLiveReceivingUsers[senderId]?.let { messageView ->
            // Remove from messages list
            messagesList.removeView(messageView)
            currentLiveReceivingUsers.remove(senderId)
            Log.d("ReceivingMessage", "✅ Successfully removed receiving message for $senderId")
            Log.d("ReceivingMessage", "Total receiving users now: ${currentLiveReceivingUsers.size}")
        } ?: run {
            Log.d("ReceivingMessage", "❌ No receiving message found for $senderId")
        }
    }
    
    private fun formatDuration(durationMs: Long): String {
        val seconds = durationMs / 1000
        return if (seconds < 60) "${seconds}s" else "${seconds / 60}m ${seconds % 60}s"
    }
    
    private fun showRecordingDuration() {
        val startTime = recordingStartTime
        Thread {
            while (isRecording && recordingStartTime == startTime) {
                val currentTime = System.currentTimeMillis()
                val durationSeconds = (currentTime - startTime) / 1000
                
                runOnUiThread {
                    if (isRecording) {
                        pushToTalkButtonText.text = "RECORDING...\n${durationSeconds}s"
                    }
                }
                
                try {
                    Thread.sleep(100) // Update every 100ms
                } catch (e: InterruptedException) {
                    break
                }
            }
        }.start()
    }

    private fun viewImageMessage(message: Message) {
        message.imageData?.let { imageData ->
            try {
                val bitmap = BitmapFactory.decodeByteArray(imageData, 0, imageData.size)
                
                // Create a dialog to show the image
                val dialog = AlertDialog.Builder(this)
                val imageView = ImageView(this)
                imageView.setImageBitmap(bitmap)
                imageView.adjustViewBounds = true
                imageView.scaleType = ImageView.ScaleType.FIT_CENTER
                
                dialog.setView(imageView)
                dialog.setTitle("Image from ${message.senderName}")
                dialog.setPositiveButton("Close") { d, _ -> d.dismiss() }
                dialog.show()
                
            } catch (e: Exception) {
                Log.e("MainActivity", "Error displaying image", e)
                Toast.makeText(this, "Error displaying image", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun decodeBase64ToBitmap(base64: String): Bitmap {
        val decodedBytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT)
        return BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
    }
    
    private fun openImagePicker() {
        val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
        intent.type = "image/*"
        imagePickerLauncher.launch(intent)
    }


    
    private fun handleImageSelection(uri: Uri) {
        try {
            val inputStream = contentResolver.openInputStream(uri)
            val bitmap = BitmapFactory.decodeStream(inputStream)
            
            // Resize bitmap to reasonable size (max 800x600)
            val resizedBitmap = resizeBitmap(bitmap, 800, 600)
            
            // Convert to byte array
            val outputStream = ByteArrayOutputStream()
            resizedBitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
            val imageData = outputStream.toByteArray()
            
            // Send image message
            if (isConnected) {
                networkManager.sendImageMessage(imageData, "")
                
                // Add to local messages
                val message = Message(
                    id = UUID.randomUUID().toString(),
                    type = Message.MessageType.IMAGE,
                    content = "Photo",
                    imageData = imageData,
                    senderId = deviceId,
                    senderName = currentUser?.getDisplayName() ?: "You",
                    senderProfilePic = currentUser?.profilePicBase64,
                    timestamp = System.currentTimeMillis(),
                    isFromCurrentUser = true
                )
                
                runOnUiThread {
                    messages.add(message)
                    addMessageToUI(message)
                    scrollToBottom()
                }
            }
            
        } catch (e: Exception) {
            Log.e("MainActivity", "Error handling image selection", e)
            Toast.makeText(this, "Error loading image", Toast.LENGTH_SHORT).show()
        }
    }


    
    private fun resizeBitmap(bitmap: Bitmap, maxWidth: Int, maxHeight: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        
        val scaleWidth = maxWidth.toFloat() / width
        val scaleHeight = maxHeight.toFloat() / height
        val scale = minOf(scaleWidth, scaleHeight, 1.0f)
        
        val newWidth = (width * scale).toInt()
        val newHeight = (height * scale).toInt()
        
        return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
    }
    
    private fun showSettingsMenu() {
        val options = arrayOf(
            "\ud83d\udc64 Profile Settings",
            "\ud83c\udfa4 Microphone Settings",
            "\ud83c\udfae Battlefield Stats Settings",
            "\ud83c\udfae Steam Stats Settings",
            "\ud83d\uddd1\ufe0f Clear All Data & Logout"
        )
        
        AlertDialog.Builder(this)
            .setTitle("Settings")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> openProfileSettings()
                    1 -> showMicSettingsDialog()
                    2 -> showBattlefieldStatsSettings()
                    3 -> showSteamStatsSettings()
                    4 -> showClearDataDialog()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun openProfileSettings() {
        val intent = Intent(this, ProfileSettingsActivity::class.java)
        startActivity(intent)
    }
    
    private fun showBattlefieldStatsSettings() {
        val options = arrayOf(
            "➕ Add Username Mapping",
            "📋 View Current Mappings", 
            "🧪 Test Stats for All Users",
            "🔄 Force Refresh All Stats"
        )
        
        AlertDialog.Builder(this)
            .setTitle("🎮 Battlefield Stats Settings")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> showAddMappingDialog()
                    1 -> showMappingsList()
                    2 -> testBattlefieldStats()
                    3 -> forceRefreshAllStats()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showSteamStatsSettings() {
        val options = arrayOf(
            "➕ Add Steam ID Mapping",
            "📋 View Current Mappings", 
            "🧪 Test Steam Stats for All Users",
            "🔄 Force Refresh All Steam Stats",
            "👤 Test Current User Steam Stats"
        )
        
        AlertDialog.Builder(this)
            .setTitle("🎮 Steam Stats Settings")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> showAddSteamMappingDialog()
                    1 -> showSteamMappingsList()
                    2 -> testSteamStats()
                    3 -> forceRefreshAllSteamStats()
                    4 -> testCurrentUserSteamStats()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    // PSN Stats Settings removed - PlayStation functionality disabled
    
    private fun showAddMappingDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_add_mapping, null)
        val appUsernameInput = dialogView.findViewById<EditText>(R.id.appUsernameInput)
        val battlefieldUsernameInput = dialogView.findViewById<EditText>(R.id.battlefieldUsernameInput)
        
        AlertDialog.Builder(this)
            .setTitle("Add Username Mapping")
            .setView(dialogView)
            .setPositiveButton("Add") { _, _ ->
                val appUsername = appUsernameInput.text.toString().trim()
                val battlefieldUsername = battlefieldUsernameInput.text.toString().trim()
                
                if (appUsername.isNotEmpty() && battlefieldUsername.isNotEmpty()) {
                    battlefieldAPI.addUsernameMapping(appUsername, battlefieldUsername)
                    Toast.makeText(this, "Mapping added: $appUsername → $battlefieldUsername", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "Please enter both usernames", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showMappingsList() {
        val mappings = battlefieldAPI.getUsernameMappings()
        if (mappings.isEmpty()) {
            Toast.makeText(this, "No username mappings found", Toast.LENGTH_SHORT).show()
            return
        }
        
        val mappingList = mappings.map { "${it.key} → ${it.value}" }.joinToString("\n")
        
        AlertDialog.Builder(this)
            .setTitle("Current Mappings")
            .setMessage(mappingList)
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun showAddSteamMappingDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_add_steam_mapping, null)
        val appUsernameInput = dialogView.findViewById<EditText>(R.id.appUsernameInput)
        val steamIdInput = dialogView.findViewById<EditText>(R.id.steamIdInput)
        
        // Pre-fill with current user's username if available
        currentUser?.let { user ->
            appUsernameInput.setText(user.username)
        }
        
        // Pre-fill Steam ID for krays1
        if (currentUser?.username == "krays1") {
            steamIdInput.setText("76561198009391170")
        }
        
        AlertDialog.Builder(this)
            .setTitle("Add Steam ID Mapping")
            .setView(dialogView)
            .setPositiveButton("Add") { _, _ ->
                val appUsername = appUsernameInput.text.toString().trim()
                val steamId = steamIdInput.text.toString().trim()
                
                if (appUsername.isNotEmpty() && steamId.isNotEmpty()) {
                    steamAPI.addSteamIdMapping(appUsername, steamId)
                    Toast.makeText(this, "Mapping added: $appUsername → $steamId", Toast.LENGTH_SHORT).show()
                    
                    // Test the mapping immediately
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val stats = steamAPI.getPlayerStats(appUsername)
                            if (stats != null) {
                                runOnUiThread {
                                    Toast.makeText(this@MainActivity, "✅ Mapping works! Found stats for $appUsername", Toast.LENGTH_LONG).show()
                                }
                            } else {
                                runOnUiThread {
                                    Toast.makeText(this@MainActivity, "⚠️ Mapping added but no stats found. Check Steam ID.", Toast.LENGTH_LONG).show()
                                }
                            }
                        } catch (e: Exception) {
                            runOnUiThread {
                                Toast.makeText(this@MainActivity, "❌ Error testing mapping: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                        }
                    }
                } else {
                    Toast.makeText(this, "Please enter both username and Steam ID", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun showSteamMappingsList() {
        val mappings = steamAPI.getSteamIdMappings()
        if (mappings.isEmpty()) {
            Toast.makeText(this, "No Steam ID mappings found", Toast.LENGTH_SHORT).show()
            return
        }
        
        val mappingList = mappings.map { "${it.key} → ${it.value}" }.joinToString("\n")
        
        AlertDialog.Builder(this)
            .setTitle("Current Steam ID Mappings")
            .setMessage(mappingList)
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun testSteamStats() {
        // Test with current connected users and update UI
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d("SteamTest", "Testing Steam stats for current users")
                
                for (user in previousUserList) {
                    Log.d("SteamTest", "Testing Steam stats for user: ${user.username}")
                    val stats = steamAPI.getPlayerStats(user.username)
                    
                    if (stats != null) {
                        runOnUiThread {
                            val statsMessage = "${user.username}: ${stats.getFormattedStats()}"
                            Toast.makeText(this@MainActivity, statsMessage, Toast.LENGTH_LONG).show()
                            Log.d("SteamTest", "Found Steam stats for '${user.username}': $statsMessage")
                            
                            // Update the user with Steam stats in the UI
                            val updatedUser = user.copy(steamStats = stats)
                            userListAdapter.updateUserWithStats(updatedUser)
                            
                            // Update in previousUserList
                            val previousIndex = previousUserList.indexOfFirst { it.deviceId == user.deviceId }
                            if (previousIndex != -1) {
                                previousUserList[previousIndex] = updatedUser
                            }
                            
                            // Update staticPreviousUserList
                            staticPreviousUserList = previousUserList.map { it.copy() }
                        }
                    } else {
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "No Steam stats found for '${user.username}'", Toast.LENGTH_LONG).show()
                            Log.d("SteamTest", "No Steam stats found for '${user.username}'")
                        }
                    }
                    
                    // Wait a bit between tests
                    kotlinx.coroutines.delay(500)
                }
                
                // Also test current user if logged in
                currentUser?.let { user ->
                    Log.d("SteamTest", "Testing Steam stats for current user: ${user.username}")
                    val stats = steamAPI.getPlayerStats(user.username)
                    
                    if (stats != null) {
                        runOnUiThread {
                            val statsMessage = "Current user ${user.username}: ${stats.getFormattedStats()}"
                            Toast.makeText(this@MainActivity, statsMessage, Toast.LENGTH_LONG).show()
                            Log.d("SteamTest", "Found Steam stats for current user '${user.username}': $statsMessage")
                        }
                    } else {
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "No Steam stats found for current user '${user.username}'", Toast.LENGTH_LONG).show()
                            Log.d("SteamTest", "No Steam stats found for current user '${user.username}'")
                        }
                    }
                }
                
            } catch (e: Exception) {
                Log.e("SteamTest", "Error testing Steam stats", e)
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }
    
    private fun testCurrentUserSteamStats() {
        currentUser?.let { user ->
            Log.d("SteamTest", "Testing Steam stats for current user: ${user.username}")
            Toast.makeText(this, "Testing Steam stats for ${user.username}...", Toast.LENGTH_SHORT).show()
            
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val stats = steamAPI.getPlayerStats(user.username)
                    
                    if (stats != null) {
                        runOnUiThread {
                            val statsMessage = "${user.username}: ${stats.getFormattedStats()}"
                            Toast.makeText(this@MainActivity, statsMessage, Toast.LENGTH_LONG).show()
                            Log.d("SteamTest", "✅ Found Steam stats for current user '${user.username}': $statsMessage")
                            
                            // Show detailed stats in a dialog
                            showSteamStatsDialog(user.username, stats)
                        }
                    } else {
                        runOnUiThread {
                            Toast.makeText(this@MainActivity, "❌ No Steam stats found for '${user.username}'. Check Steam ID mapping.", Toast.LENGTH_LONG).show()
                            Log.d("SteamTest", "❌ No Steam stats found for current user '${user.username}'")
                            
                            // Show mapping help dialog
                            showSteamMappingHelpDialog(user.username)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("SteamTest", "Error testing Steam stats for current user", e)
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Error: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        } ?: run {
            Toast.makeText(this, "No current user logged in", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun showSteamStatsDialog(username: String, stats: SteamStats) {
        val message = """
            Steam Stats for $username:
            
            🎮 Username: ${stats.username}
            📊 Status: ${stats.status}
            🕒 Last Online: ${stats.lastOnline}
            🎯 Total Games: ${stats.totalGames}
            ⏱️ Total Playtime: ${stats.totalPlaytime}
            
            🎮 Recently Played Games:
            ${stats.recentlyPlayedGames.joinToString("\n") { "  • ${it.name}: ${it.getFormattedPlaytime()}" }}
            
            🔗 Profile: ${stats.profileUrl}
        """.trimIndent()
        
        AlertDialog.Builder(this)
            .setTitle("🎮 Steam Stats - $username")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .setNegativeButton("Open Profile") { _, _ ->
                try {
                    val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(stats.profileUrl))
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Could not open profile", Toast.LENGTH_SHORT).show()
                }
            }
            .show()
    }
    
    private fun showSteamMappingHelpDialog(username: String) {
        val message = """
            No Steam stats found for '$username'
            
            To fix this:
            
            1. Go to Settings → 🎮 Steam Stats Settings
            2. Tap "➕ Add Steam ID Mapping"
            3. Enter App Username: $username
            4. Enter Steam ID: 76561198009391170
            5. Tap "Add"
            6. Try testing again
            
            Or use the "🧪 Test Steam Stats for All Users" option to test all mappings at once.
        """.trimIndent()
        
        AlertDialog.Builder(this)
            .setTitle("🔧 Steam Stats Setup Help")
            .setMessage(message)
            .setPositiveButton("Add Mapping Now") { _, _ ->
                showAddSteamMappingDialog()
            }
            .setNegativeButton("OK", null)
            .show()
    }
    
    // PSN Add Mapping Dialog removed - PlayStation functionality disabled
    
    // PSN Mappings List removed - PlayStation functionality disabled
    
    // PSN Test Stats removed - PlayStation functionality disabled
    
    // PSN Test Current User Stats removed - PlayStation functionality disabled
    
    // PSN Stats Dialog removed - PlayStation functionality disabled
    
    // PSN Mapping Help Dialog removed - PlayStation functionality disabled
    
    private fun showClearDataDialog() {
        AlertDialog.Builder(this)
            .setTitle("Clear All Data & Logout")
            .setMessage("This will clear all saved data including:\n\n• Login credentials\n• Profile pictures\n• Battlefield stats cache\n• Microphone settings\n• All app preferences\n\nYou'll be logged out and need to create a new username. This action cannot be undone.")
            .setPositiveButton("Clear All & Logout") { _, _ ->
                clearAllDataAndLogout()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun clearAllDataAndLogout() {
        // Clear all SharedPreferences data
        LoginActivity.clearAllData(this)
        
        // Clear microphone settings
        val micPrefs = getSharedPreferences("MicrophoneSettings", Context.MODE_PRIVATE)
        micPrefs.edit().clear().apply()
        
        Toast.makeText(this, "All data cleared. Logging out...", Toast.LENGTH_LONG).show()
        
        // Logout and return to login screen
        LoginActivity.logout(this)
    }
    
    private fun showMicSettingsDialog() {
        Log.d("MainActivity", "showMicSettingsDialog called")
        try {
            val dialog = AlertDialog.Builder(this)
                .setView(R.layout.dialog_mic_settings)
                .create()
            
            dialog.show()
            Log.d("MainActivity", "Settings dialog shown successfully")
            
            // Get views from dialog
        val microphoneSpinner = dialog.findViewById<Spinner>(R.id.microphoneSpinner)
        val inputVolumeSeekBar = dialog.findViewById<SeekBar>(R.id.inputVolumeSeekBar)
        val inputVolumeText = dialog.findViewById<TextView>(R.id.inputVolumeText)
        val sensitivitySeekBar = dialog.findViewById<SeekBar>(R.id.sensitivitySeekBar)
        val sensitivityText = dialog.findViewById<TextView>(R.id.sensitivityText)
        val audioQualityGroup = dialog.findViewById<RadioGroup>(R.id.audioQualityGroup)
        val testMicButton = dialog.findViewById<Button>(R.id.testMicButton)
        val audioLevelBar = dialog.findViewById<ProgressBar>(R.id.audioLevelBar)
        val resetButton = dialog.findViewById<Button>(R.id.resetButton)
        val saveButton = dialog.findViewById<Button>(R.id.saveButton)
        val closeMicButton = dialog.findViewById<Button>(R.id.closeMicButton)
        
        // Setup microphone sources
        val micSources = arrayOf(
            "Default Microphone" to MediaRecorder.AudioSource.MIC,
            "Voice Recognition" to MediaRecorder.AudioSource.VOICE_RECOGNITION,
            "Voice Communication" to MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            "Camcorder" to MediaRecorder.AudioSource.CAMCORDER,
            "Unprocessed" to MediaRecorder.AudioSource.UNPROCESSED
        )
        
        val micAdapter = ArrayAdapter(this, android.R.layout.simple_spinner_item, micSources.map { it.first })
        micAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        microphoneSpinner?.adapter = micAdapter
        
        // Set current values
        val currentMicIndex = micSources.indexOfFirst { it.second == microphoneSettings.selectedMicrophoneSource }
        microphoneSpinner?.setSelection(if (currentMicIndex >= 0) currentMicIndex else 0)
        
        inputVolumeSeekBar?.progress = microphoneSettings.inputVolume
        inputVolumeText?.text = "${microphoneSettings.inputVolume}%"
        
        sensitivitySeekBar?.progress = microphoneSettings.sensitivity
        sensitivityText?.text = "${microphoneSettings.sensitivity}%"
        
        // Set audio quality radio button
        when (microphoneSettings.audioQuality) {
            MicrophoneSettings.AudioQuality.LOW -> audioQualityGroup?.check(R.id.qualityLow)
            MicrophoneSettings.AudioQuality.MEDIUM -> audioQualityGroup?.check(R.id.qualityMedium)
            MicrophoneSettings.AudioQuality.HIGH -> audioQualityGroup?.check(R.id.qualityHigh)
        }
        
        // Setup seekbar listeners
        inputVolumeSeekBar?.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                inputVolumeText?.text = "$progress%"
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })
        
        sensitivitySeekBar?.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                sensitivityText?.text = "$progress%"
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })
        
        // Test microphone button
        var isTestingMic = false
        testMicButton?.setOnClickListener {
            if (!isTestingMic) {
                isTestingMic = true
                testMicButton.text = "Stop Test"
                // TODO: Start mic test and update audioLevelBar
                Toast.makeText(this, "Testing microphone...", Toast.LENGTH_SHORT).show()
            } else {
                isTestingMic = false
                testMicButton.text = "🎤 Test Microphone"
                audioLevelBar?.progress = 0
                Toast.makeText(this, "Mic test stopped", Toast.LENGTH_SHORT).show()
            }
        }
        
        // Reset button
        resetButton?.setOnClickListener {
            val defaultSettings = MicrophoneSettings.reset()
            microphoneSpinner?.setSelection(0)
            inputVolumeSeekBar?.progress = defaultSettings.inputVolume
            inputVolumeText?.text = "${defaultSettings.inputVolume}%"
            sensitivitySeekBar?.progress = defaultSettings.sensitivity
            sensitivityText?.text = "${defaultSettings.sensitivity}%"
            audioQualityGroup?.check(R.id.qualityMedium)
            Toast.makeText(this, "Settings reset to defaults", Toast.LENGTH_SHORT).show()
        }
        
        // Save button
        saveButton?.setOnClickListener {
            val selectedMicSource = micSources[microphoneSpinner?.selectedItemPosition ?: 0].second
            val selectedQuality = when (audioQualityGroup?.checkedRadioButtonId) {
                R.id.qualityLow -> MicrophoneSettings.AudioQuality.LOW
                R.id.qualityHigh -> MicrophoneSettings.AudioQuality.HIGH
                else -> MicrophoneSettings.AudioQuality.MEDIUM
            }
            
            microphoneSettings = MicrophoneSettings(
                selectedMicrophoneSource = selectedMicSource,
                inputVolume = inputVolumeSeekBar?.progress ?: 80,
                sensitivity = sensitivitySeekBar?.progress ?: 50,
                audioQuality = selectedQuality
            )
            
            MicrophoneSettings.save(this, microphoneSettings)
            
            // Update AudioManager with new settings
            audioManager.updateMicrophoneSettings(microphoneSettings)
            
            Toast.makeText(this, "Microphone settings saved!", Toast.LENGTH_SHORT).show()
            dialog.dismiss()
        }
        
        // Close button
        closeMicButton?.setOnClickListener {
            dialog.dismiss()
        }
        
        } catch (e: Exception) {
            Log.e("MainActivity", "Error showing settings dialog", e)
            Toast.makeText(this, "Error opening settings: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val allPermissionsGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }
            
            if (!allPermissionsGranted) {
                Toast.makeText(
                    this,
                    "Audio recording permission is required for push-to-talk functionality",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        
        // Clear instance
        instance = null
        
        // Clean up timeout handler
        livePlaybackTimeoutRunnable?.let {
            livePlaybackTimeoutHandler.removeCallbacks(it)
        }
        
        // Clean up push-to-talk timer
        stopPushToTalkTimer()
        
        // Clean up temporary receiving messages
        currentLiveReceivingUsers.clear()
        
        // Clean up Text-to-Speech resources
        if (::textToSpeech.isInitialized) {
            textToSpeech.stop()
            textToSpeech.shutdown()
        }
        
        audioManager.cleanup()
        networkManager.cleanup()
    }
    
    override fun onPause() {
        super.onPause()
        if (isRecording) {
            audioManager.stopRecording()
        }
        
        // Stop push-to-talk live streaming if active
        if (isPushToTalkLiveStreaming) {
            stopPushToTalkWithLiveStreaming()
        }
    }

    private fun setProfilePicture(imageView: ImageView?, profilePicBase64: String?) {
        if (profilePicBase64 != null) {
            try {
                val bitmap = decodeBase64ToBitmap(profilePicBase64)
                imageView?.setImageBitmap(bitmap)
            } catch (e: Exception) {
                imageView?.setImageResource(R.drawable.ic_person_placeholder)
            }
        } else {
            imageView?.setImageResource(R.drawable.ic_person_placeholder)
        }
    }


}