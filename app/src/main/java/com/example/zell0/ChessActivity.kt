package com.example.zell0

import android.content.Context
import android.graphics.Color
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.LayoutInflater
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

// 🔧 UNFINISHED GAME DATA CLASS
data class UnfinishedGame(
    val gameId: String,
    val opponent: String,
    val playerColor: String,
    val lastUpdated: String,
    val moveCount: Int
)

class ChessActivity : AppCompatActivity() {
    private var socket: Socket? = null
    private lateinit var chessBoardView: ChessBoardView
    private lateinit var gameStatusText: TextView
    private lateinit var playerInfoText: TextView
    private lateinit var moveHistoryRecyclerView: RecyclerView
    private lateinit var joinGameButton: LinearLayout
    private lateinit var resumeGameButton: LinearLayout
    private lateinit var saveGameButton: LinearLayout
    private lateinit var leaveGameButton: LinearLayout
    private lateinit var resignButton: LinearLayout
    private lateinit var refreshGameButton: LinearLayout
    private lateinit var statsButton: Button
    
    private var gameId: String? = null
    private var playerColor: String? = null
    private var isMyTurn = false
    private var gameStarted = false
    private var waitingForDiceRoll = false
    private var moveHistory = mutableListOf<ChessMove>()
    private lateinit var moveHistoryAdapter: MoveHistoryAdapter
    private lateinit var networkManager: NetworkManager
    private var socketReady = false
    private var loadingDialog: AlertDialog? = null
    private var connectionTimeoutHandler: android.os.Handler? = null
    private var connectionTimeoutRunnable: Runnable? = null
    
    // 🔧 OPPONENT TRACKING
    private var opponentName: String? = null
    private var opponentColor: String? = null
    private var myUsername: String? = null
    
    // 🔧 CONNECTION STABILITY IMPROVEMENTS
    private var connectionMonitorHandler: android.os.Handler? = null
    private var connectionMonitorRunnable: Runnable? = null
    private var lastPingTime = 0L
    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 5
    private var isReconnecting = false
    
    companion object {
        private const val TAG = "ChessActivity"
        private const val PING_INTERVAL = 30000L // 30 seconds
        private const val CONNECTION_TIMEOUT = 45000L // 45 seconds
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chess)
        
        // 🔧 USE EXISTING NETWORK MANAGER FROM MAIN ACTIVITY
        // Instead of creating a new NetworkManager, use the existing one
        // This prevents creating a new socket connection that would register as a new user
        networkManager = MainActivity.getNetworkManager() ?: NetworkManager()
        
        showLoadingDialog()
        
        // Get current user and device ID
        val currentUser = LoginActivity.getCurrentUser(this)
        val username = currentUser?.username ?: "anonymous"
        
        // Debug logging for username
        Log.d(TAG, "=== CHESS ACTIVITY STARTUP ===")
        Log.d(TAG, "Current user: ${currentUser?.username ?: "NULL"}")
        Log.d(TAG, "Username identifier: $username")
        Log.d(TAG, "User has profile pic: ${currentUser?.hasProfilePicture()}")
        Log.d(TAG, "Using existing NetworkManager: ${MainActivity.getNetworkManager() != null}")
        
        // 🔧 CHECK IF ALREADY CONNECTED
        val existingSocket = MainActivity.getNetworkManager()?.getSocket()
        if (existingSocket != null && existingSocket.connected()) {
            Log.d(TAG, "✅ Using existing socket connection from MainActivity")
            socket = existingSocket
            socketReady = true
            loadingDialog?.dismiss()
            initializeViews()
            setupSocketListeners()
            setupChessBoard()
            startConnectionMonitoring()
            
            Log.d(TAG, "=== CHESS SOCKET READY (EXISTING) ===")
            Log.d(TAG, "Socket connected, requesting games list")
            
            // Use new simple matchmaking system
            socket!!.emit("chess:find_game")
            Log.d(TAG, "Requested to find/join game")
        } else {
            Log.d(TAG, "⚠️ No existing socket connection, creating new one")
            
            // Set up network listener for new connection
            networkManager.setNetworkListener(object : NetworkManager.NetworkListener {
                override fun onConnected() {
                    runOnUiThread {
                        socket = networkManager.getSocket()
                        if (socket != null) {
                            socketReady = true
                            connectionTimeoutHandler?.removeCallbacks(connectionTimeoutRunnable!!)
                            loadingDialog?.dismiss()
                            initializeViews()
                            setupSocketListeners()
                            setupChessBoard()
                            startConnectionMonitoring() // 🔧 Start connection monitoring
                            
                            Log.d(TAG, "=== CHESS SOCKET READY (NEW) ===")
                            Log.d(TAG, "Socket connected, requesting games list")
                            
                            // Use new simple matchmaking system
                            socket!!.emit("chess:find_game")
                            Log.d(TAG, "Requested to find/join game")
                        }
                    }
                }
                
                override fun onDisconnected() {
                    runOnUiThread {
                        socketReady = false
                        stopConnectionMonitoring() // 🔧 Stop connection monitoring
                        Toast.makeText(this@ChessActivity, "Disconnected from server", Toast.LENGTH_SHORT).show()
                        
                        // 🔧 Auto-reconnect if in active game
                        if (gameId != null && gameStarted && !isReconnecting) {
                            Log.d(TAG, "Auto-reconnecting due to disconnect during active game")
                            attemptReconnection()
                        }
                    }
                }
                
                override fun onConnectionError(error: String) {
                    runOnUiThread {
                        connectionTimeoutHandler?.removeCallbacks(connectionTimeoutRunnable!!)
                        loadingDialog?.dismiss()
                        stopConnectionMonitoring() // 🔧 Stop connection monitoring
                        showConnectionErrorDialog()
                    }
                }
                
                // Empty implementations for required methods
                override fun onTextMessageReceived(message: String, senderId: String, senderName: String, senderProfilePic: String?, timestamp: Long) {}
                override fun onAudioMessageReceived(audioData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?, duration: Long, timestamp: Long) {}
                override fun onImageMessageReceived(imageData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?, caption: String, timestamp: Long) {}
                override fun onLiveAudioChunkReceived(audioData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?) {}
                override fun onUserJoined(userId: String) {}
                override fun onUserLeft(userId: String) {}
                override fun onUserListUpdated(users: List<ConnectedUser>) {}
                override fun onFileShared(fileId: String, fileName: String, fileType: String, fileSize: Long, uploadedBy: String) {}
                override fun onFileListUpdated(files: List<SharedFile>) {}
                override fun onFileUploadSuccess(fileId: String, fileName: String) {}
                override fun onFileDownloadResponse(fileId: String, fileName: String, fileType: String, fileData: ByteArray) {}
                override fun onFileMessageReceived(fileData: ByteArray, fileName: String, fileSize: Long, mimeType: String, senderId: String, senderName: String, senderProfilePic: String?, timestamp: Long) {}
            })
            
            // Connect to server in coroutine (only if not already connected)
            CoroutineScope(Dispatchers.IO).launch {
                networkManager.connect(username, currentUser)
            }
        }
        
        waitForSocketAndInit()
    }

    private fun waitForSocketAndInit() {
        // Set up connection timeout as fallback
        connectionTimeoutHandler = android.os.Handler(android.os.Looper.getMainLooper())
        connectionTimeoutRunnable = Runnable {
            loadingDialog?.dismiss()
            showConnectionErrorDialog()
        }
        connectionTimeoutHandler?.postDelayed(connectionTimeoutRunnable!!, 15000) // 15 second timeout
    }

    // 🔧 CONNECTION MONITORING METHODS
    private fun startConnectionMonitoring() {
        stopConnectionMonitoring() // Stop any existing monitoring
        
        connectionMonitorHandler = android.os.Handler(android.os.Looper.getMainLooper())
        connectionMonitorRunnable = Runnable {
            if (socketReady && socket?.connected() == true) {
                // Send ping to server
                socket?.emit("ping")
                lastPingTime = System.currentTimeMillis()
                Log.d(TAG, "Sent ping to server")
                
                // Schedule next ping
                connectionMonitorHandler?.postDelayed(connectionMonitorRunnable!!, PING_INTERVAL)
            } else {
                Log.w(TAG, "Socket not ready or disconnected during monitoring")
                stopConnectionMonitoring()
            }
        }
        
        // Start monitoring
        connectionMonitorHandler?.postDelayed(connectionMonitorRunnable!!, PING_INTERVAL)
        Log.d(TAG, "Started connection monitoring")
    }
    
    private fun stopConnectionMonitoring() {
        connectionMonitorHandler?.removeCallbacks(connectionMonitorRunnable!!)
        connectionMonitorHandler = null
        connectionMonitorRunnable = null
        Log.d(TAG, "Stopped connection monitoring")
    }
    
    private fun attemptReconnection() {
        if (isReconnecting || reconnectAttempts >= maxReconnectAttempts) {
            Log.w(TAG, "Reconnection limit reached or already reconnecting")
            return
        }
        
        isReconnecting = true
        reconnectAttempts++
        
        Log.d(TAG, "Attempting reconnection #$reconnectAttempts")
        Toast.makeText(this, "Reconnecting... (Attempt $reconnectAttempts/$maxReconnectAttempts)", Toast.LENGTH_SHORT).show()
        
        // Disconnect and reconnect
        socket?.disconnect()
        
        // Wait a moment then reconnect
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            try {
                val currentUser = LoginActivity.getCurrentUser(this)
                val username = currentUser?.username ?: "anonymous"
                networkManager.connect(username, currentUser)
                
                // Reset reconnection attempts on successful connection
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    if (socketReady) {
                        reconnectAttempts = 0
                        isReconnecting = false
                        Log.d(TAG, "Reconnection successful")
                        Toast.makeText(this, "Reconnected successfully!", Toast.LENGTH_SHORT).show()
                    } else {
                        isReconnecting = false
                        Log.w(TAG, "Reconnection failed")
                        Toast.makeText(this, "Reconnection failed", Toast.LENGTH_SHORT).show()
                    }
                }, 5000) // Wait 5 seconds to see if connection is established
                
            } catch (e: Exception) {
                Log.e(TAG, "Error during reconnection", e)
                isReconnecting = false
            }
        }, 2000) // Wait 2 seconds before reconnecting
    }

    private fun showLoadingDialog() {
        if (loadingDialog == null) {
            loadingDialog = AlertDialog.Builder(this)
                .setTitle("Connecting")
                .setMessage("Connecting to server...")
                .setCancelable(false)
                .create()
        }
        loadingDialog?.show()
    }
    
    private fun initializeViews() {
        chessBoardView = findViewById(R.id.chessBoardView)
        gameStatusText = findViewById(R.id.gameStatusText)
        playerInfoText = findViewById(R.id.playerInfoText)
        moveHistoryRecyclerView = findViewById(R.id.moveHistoryRecyclerView)
        joinGameButton = findViewById(R.id.joinGameButton)
        resumeGameButton = findViewById(R.id.resumeGameButton)
        saveGameButton = findViewById(R.id.saveGameButton)
        leaveGameButton = findViewById(R.id.leaveGameButton)
        resignButton = findViewById(R.id.resignButton)
        refreshGameButton = findViewById(R.id.refreshGameButton)
        statsButton = findViewById(R.id.statsButton)
        
        moveHistoryAdapter = MoveHistoryAdapter(moveHistory)
        moveHistoryRecyclerView.layoutManager = LinearLayoutManager(this)
        moveHistoryRecyclerView.adapter = moveHistoryAdapter
        
        joinGameButton.setOnClickListener { 
            Log.d(TAG, "Refresh Games button clicked")
            refreshAndFindGames()
        }
        resumeGameButton.setOnClickListener { 
            Log.d(TAG, "Resume Game button clicked")
            socket?.emit("chess:find_game") // This will trigger unfinished games check
        }
        leaveGameButton.setOnClickListener { 
            Log.d(TAG, "Leave Game button clicked")
            showLeaveGameConfirmationDialog() // 🔧 Add confirmation dialog
        }
        resignButton.setOnClickListener { 
            Log.d(TAG, "Resign button clicked")
            showResignGameConfirmationDialog() 
        }
        saveGameButton.setOnClickListener { 
            Log.d(TAG, "Save Game button clicked")
            saveGame() 
        }
        
        // 🔧 IN-GAME REFRESH BUTTON - FOR RECONNECTING TO ONGOING GAMES
        refreshGameButton.setOnClickListener {
            Log.d(TAG, "In-game refresh button clicked - reconnecting to ongoing games")
            reconnectToOngoingGames()
        }
        
        // Add refresh button functionality to save button (long press)
        saveGameButton.setOnLongClickListener {
            Log.d(TAG, "Long press on save button - REFRESHING GAME STATE")
            refreshGameState()
            Toast.makeText(this, "Refreshing game state...", Toast.LENGTH_SHORT).show()
            true
        }
        
        // Add double-tap on save button to show debug info
        var lastTapTime = 0L
        saveGameButton.setOnClickListener { 
            val currentTime = System.currentTimeMillis()
            if (currentTime - lastTapTime < 300) { // Double tap detected
                Log.d(TAG, "Double tap on save button - SHOWING DEBUG INFO")
                showDebugInfo()
            } else {
                Log.d(TAG, "Save Game button clicked")
                saveGame() 
            }
            lastTapTime = currentTime
        }
        
        // Add triple-tap to reset board
        var tripleTapTime = 0L
        saveGameButton.setOnTouchListener { _, event ->
            if (event.action == android.view.MotionEvent.ACTION_DOWN) {
                val currentTime = System.currentTimeMillis()
                if (currentTime - tripleTapTime < 200) { // Triple tap detected
                    Log.d(TAG, "Triple tap on save button - RESETTING BOARD")
                    chessBoardView.resetBoard()
                    chessBoardView.debugBoardState()
                    Toast.makeText(this, "Board reset!", Toast.LENGTH_SHORT).show()
                    tripleTapTime = 0L
                } else {
                    tripleTapTime = currentTime
                }
            }
            false
        }

        // Add long press to sync turn state
        saveGameButton.setOnLongClickListener {
            Log.d(TAG, "Long press on save button - SYNCING TURN STATE")
            syncTurnStateWithServer()
            Toast.makeText(this, "Syncing turn state with server...", Toast.LENGTH_SHORT).show()
            true
        }
        
        // Stats button click handler
        statsButton.setOnClickListener {
            Log.d(TAG, "Stats button clicked")
            val intent = android.content.Intent(this, ChessStatsActivity::class.java)
            startActivity(intent)
        }
        
        updateUI()
    }
    
    private fun setupSocketListeners() {
        // Add error listener
        socket?.on("error") { args ->
            runOnUiThread {
                val error = if (args.isNotEmpty()) args[0].toString() else "Unknown error"
                Log.e(TAG, "Socket error: $error")
                Toast.makeText(this, "Error: $error", Toast.LENGTH_LONG).show()
                
                // If it's a "Not your turn" error, force a complete game state refresh
                if (error.contains("Not your turn", ignoreCase = true)) {
                    Log.d(TAG, "Turn error detected, forcing complete game refresh...")
                    forceGameStateRefresh()
                }
            }
        }
        
        // Add specific chess error listener
        socket?.on("chess:error") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val errorMessage = data.getString("message")
                    Log.e(TAG, "Chess Error: $errorMessage")
                    
                    // 🔧 IMPROVED ERROR HANDLING
                    when {
                        errorMessage.contains("Username required") -> {
                            Log.e(TAG, "Username validation failed - reconnecting...")
                            Toast.makeText(this, "Connection issue - reconnecting...", Toast.LENGTH_LONG).show()
                            // Force reconnection to fix username issue
                            forceGameStateRefresh()
                        }
                        errorMessage.contains("Not your turn") -> {
                            Toast.makeText(this, "Not your turn! Refreshing game state...", Toast.LENGTH_SHORT).show()
                            syncTurnStateWithServer()
                        }
                        errorMessage.contains("Game not found") -> {
                            Toast.makeText(this, "Game not found - creating new game...", Toast.LENGTH_LONG).show()
                            resetGame()
                            socket?.emit("chess:find_game")
                        }
                        errorMessage.contains("Game not started") -> {
                            Toast.makeText(this, "Game not started yet!", Toast.LENGTH_SHORT).show()
                        }
                        else -> {
                            Toast.makeText(this, "Chess Error: $errorMessage", Toast.LENGTH_LONG).show()
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing chess error", e)
                    Toast.makeText(this, "Unknown chess error occurred", Toast.LENGTH_SHORT).show()
                }
            }
        }
        
        // Removed old games_list handler - using new matchmaking system
        
        // 🔧 REFRESH GAMES - HANDLERS
        socket?.on("chess:games_list") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val gamesArray = data.getJSONArray("games")
                    val username = LoginActivity.getCurrentUser(this)?.username
                    
                    Log.d(TAG, "Received games list with ${gamesArray.length()} games")
                    
                    // Check if we're already in any of these games
                    for (i in 0 until gamesArray.length()) {
                        val game = gamesArray.getJSONObject(i)
                        val gameId = game.getString("id")
                        val whitePlayer = game.optString("whitePlayer", "")
                        val blackPlayer = game.optString("blackPlayer", "")
                        val started = game.getBoolean("started")
                        
                        if ((whitePlayer == username || blackPlayer == username) && started) {
                            Log.d(TAG, "Found active game we're in: $gameId")
                            // Join this game
                            socket?.emit("chess:join_game", JSONObject().apply {
                                put("gameId", gameId)
                            })
                            return@runOnUiThread
                        }
                    }
                    
                    // If no active games found, continue with normal find_game flow
                    Log.d(TAG, "No active games found, continuing with find_game")
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing games list", e)
                }
            }
        }
        
        socket?.on("chess:game_state") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    Log.d(TAG, "Received game state update")
                    
                    // Update game state with received data
                    val currentPlayer = data.optString("currentPlayer", "")
                    val isMyTurn = data.optBoolean("isMyTurn", false)
                    val board = data.optJSONObject("board")
                    val moves = data.optJSONArray("moves")
                    
                    // Update turn state
                    this.isMyTurn = isMyTurn
                    chessBoardView.setTurnState(isMyTurn)
                    
                    // Update board if provided
                    if (board != null) {
                        chessBoardView.loadBoardState(board)
                    }
                    
                    // Update move history if provided
                    if (moves != null) {
                        moveHistory.clear()
                        for (i in 0 until moves.length()) {
                            val moveData = moves.getJSONObject(i)
                            val move = ChessMove(
                                from = moveData.getString("from"),
                                to = moveData.getString("to"),
                                piece = moveData.getString("piece"),
                                color = moveData.getString("color"),
                                isCapture = moveData.optBoolean("isCapture", false),
                                playerName = moveData.getString("username"),
                                isCheck = moveData.optBoolean("isCheck", false),
                                isCheckmate = false,
                                isKingCapture = false
                            )
                            moveHistory.add(move)
                        }
                        moveHistoryAdapter.notifyDataSetChanged()
                    }
                    
                    updateUI()
                    Toast.makeText(this, "Game state refreshed", Toast.LENGTH_SHORT).show()
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game state", e)
                }
            }
        }
        
        socket?.on("chess:game_joined") { args ->
            try {
                val data = args[0] as JSONObject
                gameId = data.getString("gameId")
                playerColor = data.optString("color", null)
                gameStarted = data.getBoolean("started")
                isMyTurn = data.getBoolean("isMyTurn")
                
                Log.d(TAG, "=== GAME JOINED ===")
                Log.d(TAG, "Game ID: $gameId")
                Log.d(TAG, "Player Color: $playerColor")
                Log.d(TAG, "Game Started: $gameStarted")
                Log.d(TAG, "Is My Turn: $isMyTurn")
                Log.d(TAG, "Raw data: $data")
                Log.d(TAG, "==================")
                
                // 🔧 SET PLAYER NAMES IMMEDIATELY
                myUsername = LoginActivity.getCurrentUser(this)?.username
                Log.d(TAG, "My username set to: $myUsername")
                
                runOnUiThread {
                    updateUI()
                    if (gameStarted) {
                        chessBoardView.setTurnState(isMyTurn)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error handling game_joined", e)
            }
        }
        
        // 🔧 PING/PONG CONNECTION MONITORING
        socket?.on("pong") {
            Log.d(TAG, "Received pong from server")
            lastPingTime = System.currentTimeMillis()
        }
        
        socket?.on("ping") {
            Log.d(TAG, "Received ping from server, sending pong")
            socket?.emit("pong")
        }
        
        socket?.on("chess:game_started") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    gameStarted = true
                    waitingForDiceRoll = false
                    playerColor = if (data.getString("whitePlayer") == LoginActivity.getCurrentUser(this)?.username) "white" else "black"
                    
                    // 🔧 TRACK OPPONENT INFORMATION
                    val whitePlayer = data.getString("whitePlayer")
                    val blackPlayer = data.getString("blackPlayer")
                    myUsername = LoginActivity.getCurrentUser(this)?.username
                    
                    if (playerColor == "white") {
                        opponentName = blackPlayer
                        opponentColor = "black"
                    } else {
                        opponentName = whitePlayer
                        opponentColor = "white"
                    }
                    
                    // SIMPLE CHESS LOGIC: White always goes first
                    isMyTurn = playerColor == "white"
                    
                    Log.d(TAG, "=== CHESS GAME STARTED ===")
                    Log.d(TAG, "White: $whitePlayer, Black: $blackPlayer")
                    Log.d(TAG, "My color: $playerColor, My turn: $isMyTurn")
                    Log.d(TAG, "My username: $myUsername")
                    Log.d(TAG, "Opponent: $opponentName (${opponentColor})")
                    Log.d(TAG, "Raw data: $data")
                    Log.d(TAG, "=========================")
                    
                    // Update the chess board view with the turn state
                    chessBoardView.setTurnState(isMyTurn)
                    
                    // Ensure board is properly initialized
                    chessBoardView.resetBoard()
                    chessBoardView.debugBoardState()
                    
                    Toast.makeText(this, "Game started! You are playing as ${playerColor?.replaceFirstChar { it.uppercase() }}", Toast.LENGTH_LONG).show()
                    updateUI()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game started", e)
                }
            }
        }
        
        // 🔧 SIMPLIFIED CHESS MOVE MADE HANDLER (ONLY ONE)
        socket?.on("chess_move_made") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val from = data.getString("from")
                    val to = data.getString("to")
                    val piece = data.getString("piece")
                    val color = data.getString("color")
                    val isCapture = data.optBoolean("capture", false)
                    val playerName = data.optString("playerName", "")
                    val nextPlayer = data.optString("nextPlayer", "")
                    val isCheck = data.optBoolean("isCheck", false)
                    val isCheckmate = data.optBoolean("isCheckmate", false)
                    val isStalemate = data.optBoolean("isStalemate", false)
                    
                    Log.d(TAG, "=== SIMPLIFIED CHESS MOVE MADE ===")
                    Log.d(TAG, "Move: $from to $to by $color ($playerName)")
                    Log.d(TAG, "My color: $playerColor")
                    Log.d(TAG, "Next player: $nextPlayer")
                    Log.d(TAG, "Check: $isCheck, Checkmate: $isCheckmate, Stalemate: $isStalemate")
                    Log.d(TAG, "🔍 DEBUG: Raw check data - isCheck: $isCheck")
                    
                    val move = ChessMove(from, to, piece, color, isCapture, playerName, isCheck, isCheckmate, false)
                    moveHistory.add(move)
                    moveHistoryAdapter.notifyItemInserted(moveHistory.size - 1)
                    
                    chessBoardView.makeMove(from, to, piece, color)
                    
                    // Update turn state based on next player
                    val myUsername = LoginActivity.getCurrentUser(this)?.username
                    isMyTurn = (nextPlayer == playerColor && playerName != myUsername) || 
                               (nextPlayer != playerColor && playerName == myUsername)
                    
                    Log.d(TAG, "Updated turn state: isMyTurn = $isMyTurn")
                    
                    // Update the chess board view with the new turn state
                    chessBoardView.setTurnState(isMyTurn)
                    
                    // 🔧 HANDLE CHECK AND CHECKMATE DISPLAY
                    if (isCheckmate) {
                        val winner = if (color == "white") "White" else "Black"
                        val winnerName = if (playerName.isNotEmpty()) playerName else winner
                        showGameOverDialog(winner, "Checkmate by $winnerName")
                    } else if (isStalemate) {
                        showGameOverDialog(null, "Stalemate - Draw")
                    } else if (isCheck) {
                        val checkMessage = if (isMyTurn) "You are in check!" else "$playerName put you in check!"
                        Toast.makeText(this, checkMessage, Toast.LENGTH_LONG).show()
                        
                        // 🔧 HIGHLIGHT CHECK STATE IN UI
                        gameStatusText.text = "♔ CHECK! ♔"
                        gameStatusText.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                    }
                    
                    updateUI()
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing simplified chess move made", e)
                }
            }
        }
        
        // 🔧 SIMPLIFIED CHESS ERROR HANDLER (ONLY ONE)
        socket?.on("chess_error") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val errorMessage = data.getString("message")
                    Log.e(TAG, "Simplified Chess Error: $errorMessage")
                    
                    // Re-enable the board since move was rejected
                    chessBoardView.setTurnState(true)
                    
                    Toast.makeText(this, "Chess Error: $errorMessage", Toast.LENGTH_LONG).show()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing simplified chess error", e)
                    // Re-enable the board on error
                    chessBoardView.setTurnState(true)
                }
            }
        }
        
        socket?.on("chess:game_over") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val winner = data.optString("winner", null)
                    val reason = data.getString("reason")
                    val winnerName = data.optString("winnerName", "")
                    
                    Log.d(TAG, "Game over: $winner wins by $reason")
                    
                    // 🔧 ENHANCED GAME OVER DISPLAY
                    val displayMessage = when {
                        winner != null && winnerName.isNotEmpty() -> "$winnerName wins by $reason!"
                        winner != null -> "$winner wins by $reason!"
                        else -> "Game ended: $reason"
                    }
                    
                    showGameOverDialog(winner, displayMessage)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game over", e)
                }
            }
        }

        // 🔧 RESUME GAME FEATURE - NEW SOCKET HANDLERS
        socket?.on("chess:unfinished_games_found") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val gamesArray = data.getJSONArray("games")
                    val unfinishedGames = mutableListOf<UnfinishedGame>()
                    
                    for (i in 0 until gamesArray.length()) {
                        val game = gamesArray.getJSONObject(i)
                        unfinishedGames.add(UnfinishedGame(
                            gameId = game.getString("gameId"),
                            opponent = game.getString("opponent"),
                            playerColor = game.getString("playerColor"),
                            lastUpdated = game.getString("lastUpdated"),
                            moveCount = game.getInt("moveCount")
                        ))
                    }
                    
                    Log.d(TAG, "Found ${unfinishedGames.size} unfinished games")
                    showUnfinishedGamesDialog(unfinishedGames)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing unfinished games", e)
                }
            }
        }

        socket?.on("chess:game_resumed") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    gameId = data.getString("gameId")
                    playerColor = data.getString("playerColor")
                    gameStarted = true
                    isMyTurn = data.getBoolean("isMyTurn")
                    
                    // Load the saved game state
                    val board = data.getJSONObject("board")
                    val moves = data.getJSONArray("moves")
                    
                    Log.d(TAG, "=== GAME RESUMED ===")
                    Log.d(TAG, "Game ID: $gameId")
                    Log.d(TAG, "Player Color: $playerColor")
                    Log.d(TAG, "Is My Turn: $isMyTurn")
                    Log.d(TAG, "Move count: ${moves.length()}")
                    
                    // Restore the board state
                    chessBoardView.loadBoardState(board)
                    
                    // Restore move history
                    moveHistory.clear()
                    for (i in 0 until moves.length()) {
                        val moveData = moves.getJSONObject(i)
                        val move = ChessMove(
                            from = moveData.getString("from"),
                            to = moveData.getString("to"),
                            piece = moveData.getString("piece"),
                            color = moveData.getString("color"),
                            isCapture = moveData.optBoolean("isCapture", false),
                            playerName = moveData.getString("username"),
                            isCheck = moveData.optBoolean("isCheck", false),
                            isCheckmate = false,
                            isKingCapture = false
                        )
                        moveHistory.add(move)
                    }
                    moveHistoryAdapter.notifyDataSetChanged()
                    
                    // Update UI
                    chessBoardView.setTurnState(isMyTurn)
                    updateUI()
                    
                    Toast.makeText(this, "Game resumed! You are playing as ${playerColor?.replaceFirstChar { it.uppercase() }}", Toast.LENGTH_LONG).show()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game resumed", e)
                }
            }
        }

        socket?.on("chess:unfinished_games_cleared") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val message = data.getString("message")
                    val count = data.getInt("count")
                    
                    Log.d(TAG, "Unfinished games cleared: $message")
                    Toast.makeText(this, "Cleared $count unfinished games", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing unfinished games cleared", e)
                }
            }
        }
        
        socket?.on("chess:draw_offered") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val offeringPlayer = data.getString("player")
                    Log.d(TAG, "Draw offered by $offeringPlayer")
                    showDrawOfferDialog(offeringPlayer)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing draw offered", e)
                }
            }
        }
        
        socket?.on("chess:draw_accepted") { args ->
            runOnUiThread {
                Log.d(TAG, "Draw accepted")
                showGameOverDialog(null, "Draw by agreement")
            }
        }
        
        socket?.on("chess:draw_declined") { args ->
            runOnUiThread {
                Log.d(TAG, "Draw declined")
                Toast.makeText(this, "Draw offer declined", Toast.LENGTH_SHORT).show()
            }
        }
        
        socket?.on("chess:player_resigned") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val resignedPlayer = data.getString("player")
                    val winner = if (resignedPlayer == "white") "black" else "white"
                    Log.d(TAG, "Player resigned: $resignedPlayer, winner: $winner")
                    showGameOverDialog(winner, "Resignation")
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing player resigned", e)
                }
            }
        }
        
        socket?.on("chess:game_reset") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val message = data.getString("message")
                    Log.d(TAG, "Game reset: $message")
                    
                    // Reset game state
                    gameStarted = false
                    playerColor = null
                    isMyTurn = false
                    
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                    updateUI()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game reset", e)
                }
            }
        }
        
        socket?.on("chess:game_saved") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val savedBy = data.getString("savedBy")
                    val message = data.getString("message")
                    Log.d(TAG, "Game saved by $savedBy: $message")
                    
                    Toast.makeText(this, "Game saved by $savedBy", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game saved", e)
                }
            }
        }
        
        // 🔧 DEBUG HANDLERS
        socket?.on("chess:debug_response") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    Log.d(TAG, "=== DEBUG RESPONSE ===")
                    Log.d(TAG, "Debug info: $data")
                    
                    if (data.has("error")) {
                        val error = data.getString("error")
                        Log.e(TAG, "Debug error: $error")
                        Toast.makeText(this, "Debug Error: $error", Toast.LENGTH_LONG).show()
                    } else {
                        val gameId = data.optString("gameId", "")
                        val whitePlayer = data.optString("whitePlayer", "")
                        val blackPlayer = data.optString("blackPlayer", "")
                        val started = data.optBoolean("started", false)
                        val ended = data.optBoolean("ended", false)
                        val currentPlayer = data.optString("currentPlayer", "")
                        val playerColor = data.optString("playerColor", "")
                        val isMyTurn = data.optBoolean("isMyTurn", false)
                        val moveCount = data.optInt("moveCount", 0)
                        
                        Log.d(TAG, "Game ID: $gameId")
                        Log.d(TAG, "White: $whitePlayer, Black: $blackPlayer")
                        Log.d(TAG, "Started: $started, Ended: $ended")
                        Log.d(TAG, "Current Player: $currentPlayer")
                        Log.d(TAG, "My Color: $playerColor")
                        Log.d(TAG, "Is My Turn: $isMyTurn")
                        Log.d(TAG, "Move Count: $moveCount")
                        
                        val debugMessage = """
                            Game State Debug:
                            White: $whitePlayer
                            Black: $blackPlayer
                            Started: $started
                            Current: $currentPlayer
                            My Color: $playerColor
                            My Turn: $isMyTurn
                            Moves: $moveCount
                        """.trimIndent()
                        
                        Toast.makeText(this, debugMessage, Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing debug response", e)
                }
            }
        }
        
        socket?.on("chess:turn_state_sync") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val serverIsMyTurn = data.getBoolean("isMyTurn")
                    val serverCurrentPlayer = data.getString("currentPlayer")
                    val serverPlayerColor = data.getString("playerColor")
                    val serverGameStarted = data.optBoolean("gameStarted", true)
                    
                    Log.d(TAG, "=== FORCE SYNC RESPONSE ===")
                    Log.d(TAG, "Server says: isMyTurn=$serverIsMyTurn, currentPlayer=$serverCurrentPlayer")
                    Log.d(TAG, "Client had: isMyTurn=$isMyTurn, playerColor=$playerColor")
                    
                    // Update client state to match server
                    isMyTurn = serverIsMyTurn
                    playerColor = serverPlayerColor
                    gameStarted = serverGameStarted
                    
                    // Update UI
                    chessBoardView.setTurnState(isMyTurn)
                    updateUI()
                    
                    Toast.makeText(this, "Turn state synced: isMyTurn=$isMyTurn", Toast.LENGTH_SHORT).show()
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing turn state sync", e)
                }
            }
        }

        // 🔧 CHESS LEFT GAME CONFIRMATION
        socket?.on("chess:left_game_confirmation") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val message = data.getString("message")
                    val gameId = data.getString("gameId")
                    val username = data.getString("username")
                    
                    Log.d(TAG, "=== CHESS LEFT GAME CONFIRMATION ===")
                    Log.d(TAG, "Message: $message")
                    Log.d(TAG, "Game ID: $gameId")
                    Log.d(TAG, "Username: $username")
                    Log.d(TAG, "================================")
                    
                    // Show confirmation to user
                    Toast.makeText(this@ChessActivity, message, Toast.LENGTH_LONG).show()
                    
                    // Reset game state
                    resetGame()
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing left game confirmation", e)
                }
            }
        }
        
        // 🔧 CHESS GAME SAVED UNFINISHED
        socket?.on("chess:game_saved_unfinished") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val gameId = data.getString("gameId")
                    val opponent = data.getString("opponent")
                    val message = data.getString("message")
                    
                    Log.d(TAG, "=== GAME SAVED UNFINISHED ===")
                    Log.d(TAG, "Game ID: $gameId")
                    Log.d(TAG, "Opponent: $opponent")
                    Log.d(TAG, "Message: $message")
                    Log.d(TAG, "============================")
                    
                    Toast.makeText(this@ChessActivity, message, Toast.LENGTH_LONG).show()
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game saved unfinished", e)
                }
            }
        }
    }
    
    private fun setupChessBoard() {
        chessBoardView.setOnMoveListener { from, to ->
            Log.d(TAG, "=== CHESS MOVE ATTEMPT ===")
            Log.d(TAG, "From: $from, To: $to")
            Log.d(TAG, "Game ID: $gameId")
            Log.d(TAG, "Username: ${LoginActivity.getCurrentUser(this@ChessActivity)?.username}")
            Log.d(TAG, "=========================")
            
            // 🔧 SIMPLIFIED CHESS MOVE - JUST SEND IT LIKE AUDIO/TEXT
            if (gameId != null) {
                Log.d(TAG, "Sending chess move: $from to $to")
                
                val moveData = JSONObject().apply {
                    put("gameId", gameId)
                    put("from", from)
                    put("to", to)
                    put("username", LoginActivity.getCurrentUser(this@ChessActivity)?.username ?: "anonymous")
                    put("timestamp", System.currentTimeMillis())
                    put("type", "chess_move")
                }
                
                socket?.emit("chess_move", moveData)
                Log.d(TAG, "Chess move sent successfully")
                
                // 🔧 TEMPORARILY DISABLE BOARD TO PREVENT DOUBLE MOVES
                chessBoardView.setTurnState(false)
                
                // Re-enable after a short delay
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    chessBoardView.setTurnState(true)
                }, 1000)
                
            } else {
                Log.w(TAG, "No game ID available for move")
                Toast.makeText(this, "No active game", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    private fun forceGameStateRefresh() {
        Log.d(TAG, "=== FORCING COMPLETE GAME STATE REFRESH ===")
        
        // Stop any ongoing sync operations
        
        // Force reconnect to server
        socket?.disconnect()
        socket?.connect()
        
        // Wait a moment then rejoin game
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            Log.d(TAG, "Rejoining game after force refresh...")
            socket?.emit("chess:find_game")
            
            // Show debug info after rejoin
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                showDebugInfo()
            }, 3000)
        }, 1000)
    }
    
    // 🔧 REFRESH GAMES FEATURE
    private fun refreshAndFindGames() {
        Log.d(TAG, "=== REFRESHING GAMES ===")
        
        // Show loading indicator
        Toast.makeText(this, "Refreshing games...", Toast.LENGTH_SHORT).show()
        
        // First, check if we're already in an active game
        if (gameId != null && gameStarted) {
            Log.d(TAG, "Already in active game, syncing game state")
            syncGameState()
            return
        }
        
        // Check for unfinished games first
        socket?.emit("chess:find_game")
        
        // Also check for any active games we might be in
        socket?.emit("chess:get_games")
        
        Log.d(TAG, "Emitted find_game and get_games events")
    }
    
    // 🔧 IN-GAME RECONNECT FEATURE
    private fun reconnectToOngoingGames() {
        Log.d(TAG, "=== RECONNECTING TO ONGOING GAMES ===")
        
        // Show loading indicator
        Toast.makeText(this, "Reconnecting to ongoing games...", Toast.LENGTH_SHORT).show()
        
        // Get current user info
        val username = LoginActivity.getCurrentUser(this)?.username
        if (username == null) {
            Toast.makeText(this, "User not logged in", Toast.LENGTH_SHORT).show()
            return
        }
        
        // Check for any active games we're in
        socket?.emit("chess:get_games")
        
        // Also check for unfinished games
        socket?.emit("chess:find_game")
        
        Log.d(TAG, "Emitted get_games and find_game for reconnection")
    }
    
    private fun syncGameState() {
        Log.d(TAG, "Syncing current game state")
        if (gameId != null) {
            // Request current game state from server
            socket?.emit("chess:get_game_state", JSONObject().apply {
                put("gameId", gameId)
            })
        }
    }
    
    // Removed showAvailableGames - using new matchmaking system
    
    // Removed old join game dialogs - using new matchmaking system
    
    private fun leaveGame() {
        gameId?.let { id ->
            Log.d(TAG, "=== USER VOLUNTARILY LEAVING GAME ===")
            Log.d(TAG, "Game ID: $id")
            Log.d(TAG, "Player: ${LoginActivity.getCurrentUser(this)?.username}")
            Log.d(TAG, "Player Color: $playerColor")
            Log.d(TAG, "Game Started: $gameStarted")
            Log.d(TAG, "================================")
            
            socket?.emit("chess:leave_game", JSONObject().apply {
                put("gameId", id)
            })
        }
        resetGame()
    }
    
    private fun resignGame() {
        gameId?.let { id ->
            socket?.emit("chess:resign_game", JSONObject().apply {
                put("gameId", id)
            })
        }
    }
    
    private fun saveGame() {
        gameId?.let { id ->
            socket?.emit("chess:save_game", JSONObject().apply {
                put("gameId", id)
                put("playerName", LoginActivity.getCurrentUser(this@ChessActivity)?.username ?: "anonymous")
            })
            Toast.makeText(this, "Game saved!", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun refreshGameState() {
        Log.d(TAG, "=== REFRESHING GAME STATE ===")
        
        // 🔧 FIXED: Don't disconnect/reconnect - this causes user to be removed from connected users
        // Instead, just request fresh game state from server
        
        if (gameId != null) {
            // Request current game state from server
            socket?.emit("chess:get_game_state", JSONObject().apply {
                put("gameId", gameId)
            })
            Log.d(TAG, "Requested fresh game state from server")
        } else {
            // If no active game, just find a new game
            socket?.emit("chess:find_game")
            Log.d(TAG, "No active game, finding new game")
        }
        
        Toast.makeText(this, "Refreshing game state...", Toast.LENGTH_SHORT).show()
    }

    private fun showDebugInfo() {
        Log.d(TAG, "=== CLIENT DEBUG INFO ===")
        Log.d(TAG, "Game ID: $gameId")
        Log.d(TAG, "Game Started: $gameStarted")
        Log.d(TAG, "Player Color: $playerColor")
        Log.d(TAG, "Is My Turn: $isMyTurn")
        Log.d(TAG, "My Username: ${LoginActivity.getCurrentUser(this)?.username}")
        Log.d(TAG, "Opponent: $opponentName")
        Log.d(TAG, "Move Count: ${moveHistory.size}")
        Log.d(TAG, "=========================")
        
        // Request debug info from server
        if (gameId != null) {
            socket?.emit("chess:debug_state", JSONObject().apply {
                put("gameId", gameId)
            })
        } else {
            Toast.makeText(this, "No active game to debug", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun forceSyncTurnState() {
        Log.d(TAG, "=== FORCE SYNC TURN STATE ===")
        if (gameId != null) {
            socket?.emit("chess:force_sync", JSONObject().apply {
                put("gameId", gameId)
            })
        } else {
            Toast.makeText(this, "No active game to sync", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun syncTurnStateWithServer() {
        Log.d(TAG, "=== REQUESTING TURN STATE SYNC ===")
        Log.d(TAG, "Current client state:")
        Log.d(TAG, "  isMyTurn: $isMyTurn")
        Log.d(TAG, "  playerColor: $playerColor")
        Log.d(TAG, "  gameStarted: $gameStarted")
        Log.d(TAG, "  gameId: $gameId")
        
        // Request current turn state from server
        gameId?.let { id ->
            socket?.emit("chess:sync_turn_state", JSONObject().apply {
                put("gameId", id)
                put("playerName", LoginActivity.getCurrentUser(this@ChessActivity)?.username ?: "anonymous")
            })
            Log.d(TAG, "Sent turn state sync request to server")
        } ?: run {
            Log.w(TAG, "No game ID available for turn state sync")
            Toast.makeText(this, "No active game for sync", Toast.LENGTH_SHORT).show()
        }
        
        Log.d(TAG, "================================")
    }


    
    private fun showDrawOfferDialog(offeringPlayer: String) {
        AlertDialog.Builder(this)
            .setTitle("Draw Offer")
            .setMessage("$offeringPlayer has offered a draw. Do you accept?")
            .setPositiveButton("Accept") { _, _ ->
                gameId?.let { id ->
                    socket?.emit("chess:respond_draw", JSONObject().apply {
                        put("gameId", id)
                        put("accepted", true)
                    })
                }
            }
            .setNegativeButton("Decline") { _, _ ->
                gameId?.let { id ->
                    socket?.emit("chess:respond_draw", JSONObject().apply {
                        put("gameId", id)
                        put("accepted", false)
                    })
                }
            }
            .setCancelable(false)
            .show()
    }
    
    private fun showGameOverDialog(winner: String?, reason: String) {
        val message = if (winner != null) {
            "$winner wins by $reason"
        } else {
            "Game ended: $reason"
        }
        
        AlertDialog.Builder(this)
            .setTitle("Game Over")
            .setMessage(message)
            .setPositiveButton("New Game") { _, _ ->
                resetGame()
                socket?.emit("chess:get_games")
            }
            .setNegativeButton("Back to Menu") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .show()
    }
    
    private fun resetGame() {
        gameId = null
        playerColor = null
        isMyTurn = false
        gameStarted = false
        waitingForDiceRoll = false
        moveHistory.clear()
        moveHistoryAdapter.notifyDataSetChanged()
        chessBoardView.resetBoard()
        
        // 🔧 CLEAR OPPONENT INFORMATION
        opponentName = null
        opponentColor = null
        myUsername = null
        
        updateUI()
    }
    
    private fun updateUI() {
        if (gameId == null) {
            gameStatusText.text = "♔ Chess Game ♔"
            playerInfoText.text = "Ready to play"
            joinGameButton.visibility = View.VISIBLE
            resumeGameButton.visibility = View.VISIBLE // Show resume button when not in game
            leaveGameButton.visibility = View.GONE
            resignButton.visibility = View.GONE
            saveGameButton.visibility = View.GONE
            refreshGameButton.visibility = View.GONE
            // Disable board interaction when not in game
            chessBoardView.setTurnState(false)
        } else {
            if (gameStarted) {
                // Game is active - show opponent information
                val colorText = playerColor?.replaceFirstChar { it.uppercase() } ?: "Spectator"
                
                // 🔧 FALLBACK PLAYER NAMES
                val myName = myUsername ?: "You"
                val opponentName = opponentName ?: "Opponent"
                
                // 🔧 ENHANCED PLAYER DISPLAY WITH CHECK STATE
                if (isMyTurn) {
                    // Check if we're in check (this would be set by the move handler)
                    val currentStatus = gameStatusText.text.toString()
                    if (currentStatus.contains("CHECK")) {
                        gameStatusText.text = "♔ YOUR TURN - IN CHECK! ♔"
                        gameStatusText.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                    } else {
                        gameStatusText.text = "♟ Your turn"
                        gameStatusText.setTextColor(resources.getColor(android.R.color.holo_green_dark, null))
                    }
                    playerInfoText.text = "$myName (${colorText}) vs $opponentName"
                } else {
                    gameStatusText.text = "♙ $opponentName's turn"
                    gameStatusText.setTextColor(resources.getColor(android.R.color.holo_red_dark, null))
                    playerInfoText.text = "$myName (${colorText}) vs $opponentName"
                }
                
                joinGameButton.visibility = View.GONE
                resumeGameButton.visibility = View.GONE
                leaveGameButton.visibility = View.VISIBLE
                leaveGameButton.alpha = 1.0f // Full opacity for waiting state
                resignButton.visibility = View.VISIBLE
                saveGameButton.visibility = View.VISIBLE
                refreshGameButton.visibility = View.VISIBLE
                // Update board turn state
                chessBoardView.setTurnState(isMyTurn)
                
                // 🔧 Add visual indicator for active game
                leaveGameButton.alpha = 0.8f // Slightly transparent to indicate it's a "dangerous" action
            } else {
                // Waiting for opponent to join
                gameStatusText.text = "♔ Waiting for opponent ♔"
                gameStatusText.setTextColor(resources.getColor(android.R.color.holo_orange_dark, null))
                playerInfoText.text = "Another player will join automatically"
                joinGameButton.visibility = View.GONE
                resumeGameButton.visibility = View.GONE
                leaveGameButton.visibility = View.VISIBLE
                leaveGameButton.alpha = 1.0f // Full opacity for waiting state
                resignButton.visibility = View.GONE
                saveGameButton.visibility = View.GONE
                refreshGameButton.visibility = View.VISIBLE
                // Disable board interaction while waiting
                chessBoardView.setTurnState(false)
            }
        }
        
        // Show refresh hint
        if (gameStarted) {
            saveGameButton.alpha = 0.8f // Slightly transparent to indicate it's also a refresh button
        } else {
            saveGameButton.alpha = 1.0f
        }
    }
    
    private fun showConnectionErrorDialog() {
        AlertDialog.Builder(this)
            .setTitle("Connection Failed")
            .setMessage("Could not connect to the server. Please check your internet connection and try again.")
            .setPositiveButton("Retry") { _, _ ->
                showLoadingDialog()
                waitForSocketAndInit()
            }
            .setNegativeButton("Cancel") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .show()
    }

    private fun showLeaveGameConfirmationDialog() {
        AlertDialog.Builder(this)
            .setTitle("Leave & Save Game")
            .setMessage("Are you sure you want to leave the game? The game will be automatically saved and you can resume it later.")
            .setPositiveButton("Leave & Save") { _, _ ->
                leaveGame()
            }
            .setNegativeButton("Cancel") { _, _ ->
                // User cancelled leaving, do nothing
            }
            .setCancelable(true) // Allow dismissing with back button
            .show()
    }
    
    private fun showResignGameConfirmationDialog() {
        AlertDialog.Builder(this)
            .setTitle("Resign Game")
            .setMessage("Are you sure you want to resign? This will end the game and your opponent will win.")
            .setPositiveButton("Resign") { _, _ ->
                resignGame()
            }
            .setNegativeButton("Cancel") { _, _ ->
                // User cancelled resigning, do nothing
            }
            .setCancelable(true)
            .show()
    }

    // 🔧 RESUME GAME FEATURE - DIALOG METHODS
    private fun showUnfinishedGamesDialog(unfinishedGames: List<UnfinishedGame>) {
        val builder = AlertDialog.Builder(this)
        builder.setTitle("Unfinished Games Found")
        
        if (unfinishedGames.size == 1) {
            val game = unfinishedGames[0]
            val message = "You have an unfinished game against ${game.opponent}.\n" +
                         "Moves played: ${game.moveCount}\n" +
                         "Your color: ${game.playerColor.replaceFirstChar { it.uppercase() }}\n" +
                         "Last updated: ${formatDate(game.lastUpdated)}\n\n" +
                         "Would you like to resume this game or start a new one?"
            
            builder.setMessage(message)
                .setPositiveButton("Resume Game") { _, _ ->
                    socket?.emit("chess:resume_game", JSONObject().apply {
                        put("gameId", game.gameId)
                    })
                }
                .setNegativeButton("Start New Game") { _, _ ->
                    socket?.emit("chess:start_new_game")
                }
                .setNeutralButton("Clear & Start New") { _, _ ->
                    socket?.emit("chess:clear_unfinished_games")
                    socket?.emit("chess:start_new_game")
                }
        } else {
            // Multiple unfinished games
            val gameList = unfinishedGames.joinToString("\n") { game ->
                "• ${game.opponent} (${game.playerColor.replaceFirstChar { it.uppercase() }}, ${game.moveCount} moves)"
            }
            
            val message = "You have ${unfinishedGames.size} unfinished games:\n\n$gameList\n\n" +
                         "What would you like to do?"
            
            builder.setMessage(message)
                .setPositiveButton("Resume Latest") { _, _ ->
                    val latestGame = unfinishedGames.maxByOrNull { it.lastUpdated }
                    latestGame?.let { game ->
                        socket?.emit("chess:resume_game", JSONObject().apply {
                            put("gameId", game.gameId)
                        })
                    }
                }
                .setNegativeButton("Start New Game") { _, _ ->
                    socket?.emit("chess:start_new_game")
                }
                .setNeutralButton("Clear All & Start New") { _, _ ->
                    socket?.emit("chess:clear_unfinished_games")
                    socket?.emit("chess:start_new_game")
                }
        }
        
        builder.setCancelable(false).show()
    }

    private fun formatDate(dateString: String): String {
        return try {
            val inputFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            val outputFormat = java.text.SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
            val date = inputFormat.parse(dateString)
            outputFormat.format(date ?: Date())
        } catch (e: Exception) {
            dateString
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        stopConnectionMonitoring() // 🔧 Stop connection monitoring
        connectionTimeoutHandler?.removeCallbacks(connectionTimeoutRunnable!!)
        networkManager.disconnect()
    }
}

data class ChessMove(
    val from: String,
    val to: String,
    val piece: String,
    val color: String,
    val isCapture: Boolean,
    val playerName: String = "",
    val isCheck: Boolean = false,
    val isCheckmate: Boolean = false,
    val isKingCapture: Boolean = false
)

class MoveHistoryAdapter(private val moves: List<ChessMove>) : 
    RecyclerView.Adapter<MoveHistoryAdapter.ViewHolder>() {
    
    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val moveText: TextView = view.findViewById(R.id.moveText)
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_chess_move, parent, false)
        return ViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val move = moves[position]
        val moveNumber = (position / 2) + 1
        val isWhiteMove = position % 2 == 0
        
        // Convert piece symbols to proper chess notation
        val pieceSymbol = when (move.piece) {
            "P" -> ""
            "R" -> "R"
            "N" -> "N"
            "B" -> "B"
            "Q" -> "Q"
            "K" -> "K"
            else -> move.piece
        }
        
        // Build move notation
        var moveText = if (isWhiteMove) {
            "$moveNumber. "
        } else {
            ""
        }
        
        // Add player name if available
        if (move.playerName.isNotEmpty()) {
            moveText += "${move.playerName}: "
        }
        
        // Add piece and move
        moveText += "${pieceSymbol}${move.from}-${move.to}"
        
        // Add special indicators
        if (move.isCapture) {
            moveText += "x"
        }
        if (move.isCheckmate) {
            moveText += "#"
        } else if (move.isCheck) {
            moveText += "+"
        }
        
        holder.moveText.text = moveText
        
        // Color coding based on player
        val textColor = when {
            move.color == "white" -> Color.rgb(255, 255, 255) // White
            move.color == "black" -> Color.rgb(200, 200, 200) // Light gray for black
            else -> Color.rgb(150, 150, 150) // Default gray
        }
        holder.moveText.setTextColor(textColor)
    }
    
    override fun getItemCount() = moves.size
}

data class ChessGameInfo(
    val id: String,
    val whitePlayer: String,
    val blackPlayer: String,
    val started: Boolean,
    val createdAt: String
) 