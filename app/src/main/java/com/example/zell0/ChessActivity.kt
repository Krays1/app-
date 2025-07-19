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

class ChessActivity : AppCompatActivity() {
    private var socket: Socket? = null
    private lateinit var chessBoardView: ChessBoardView
    private lateinit var gameStatusText: TextView
    private lateinit var playerInfoText: TextView
    private lateinit var moveHistoryRecyclerView: RecyclerView
    private lateinit var joinGameButton: LinearLayout
    private lateinit var leaveGameButton: LinearLayout
    private lateinit var resignButton: LinearLayout
    private lateinit var offerDrawButton: LinearLayout
    private lateinit var saveGameButton: LinearLayout
    
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
    
    companion object {
        private const val TAG = "ChessActivity"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chess)
        
        networkManager = NetworkManager()
        showLoadingDialog()
        
        // Get current user and device ID
        val currentUser = LoginActivity.getCurrentUser(this)
        val username = currentUser?.username ?: "anonymous"
        
        // Debug logging for username
        Log.d(TAG, "=== CHESS ACTIVITY STARTUP ===")
        Log.d(TAG, "Current user: ${currentUser?.username ?: "NULL"}")
        Log.d(TAG, "Username identifier: $username")
        Log.d(TAG, "User has profile pic: ${currentUser?.hasProfilePicture()}")
        
        // Set up network listener
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
                        
                        Log.d(TAG, "=== CHESS SOCKET READY ===")
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
                    Toast.makeText(this@ChessActivity, "Disconnected from server", Toast.LENGTH_SHORT).show()
                }
            }
            
            override fun onConnectionError(error: String) {
                runOnUiThread {
                    connectionTimeoutHandler?.removeCallbacks(connectionTimeoutRunnable!!)
                    loadingDialog?.dismiss()
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
        
        // Connect to server in coroutine
        CoroutineScope(Dispatchers.IO).launch {
            networkManager.connect(username, currentUser)
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
        leaveGameButton = findViewById(R.id.leaveGameButton)
        resignButton = findViewById(R.id.resignButton)
        offerDrawButton = findViewById(R.id.offerDrawButton)
        saveGameButton = findViewById(R.id.saveGameButton)
        
        moveHistoryAdapter = MoveHistoryAdapter(moveHistory)
        moveHistoryRecyclerView.layoutManager = LinearLayoutManager(this)
        moveHistoryRecyclerView.adapter = moveHistoryAdapter
        
        joinGameButton.setOnClickListener { 
            Log.d(TAG, "Find Game button clicked")
            socket?.emit("chess:find_game")
        }
        leaveGameButton.setOnClickListener { 
            Log.d(TAG, "Leave Game button clicked")
            leaveGame() 
        }
        resignButton.setOnClickListener { 
            Log.d(TAG, "Resign button clicked")
            resignGame() 
        }
        offerDrawButton.setOnClickListener { 
            Log.d(TAG, "Offer Draw button clicked")
            offerDraw() 
        }
        saveGameButton.setOnClickListener { 
            Log.d(TAG, "Save Game button clicked")
            saveGame() 
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

        
        updateUI()
    }
    
    private fun setupSocketListeners() {
        // Add error listener
        socket?.on("error") { args ->
            runOnUiThread {
                val error = if (args.isNotEmpty()) args[0].toString() else "Unknown error"
                Log.e(TAG, "Socket error: $error")
                Toast.makeText(this, "Error: $error", Toast.LENGTH_LONG).show()
            }
        }
        
        // Add specific chess error listener
        socket?.on("chess:error") { args ->
            runOnUiThread {
                val error = if (args.isNotEmpty()) args[0].toString() else "Unknown chess error"
                Log.e(TAG, "Chess error: $error")
                Toast.makeText(this, "Chess Error: $error", Toast.LENGTH_LONG).show()
            }
        }
        
        // Removed old games_list handler - using new matchmaking system
        
        socket?.on("chess:game_joined") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    gameId = data.getString("gameId")
                    playerColor = data.optString("color", null)
                    gameStarted = data.getBoolean("started")
                    isMyTurn = data.optBoolean("isMyTurn", false)
                    
                    Log.d(TAG, "=== CHESS GAME JOINED ===")
                    Log.d(TAG, "Game ID: $gameId")
                    Log.d(TAG, "Player Color: $playerColor")
                    Log.d(TAG, "Game Started: $gameStarted")
                    Log.d(TAG, "Is My Turn: $isMyTurn")
                    Log.d(TAG, "Raw data: $data")
                    Log.d(TAG, "=========================")
                    
                    updateUI()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game joined", e)
                    Toast.makeText(this, "Error joining game: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
        

        
        socket?.on("chess:game_started") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    gameStarted = true
                    waitingForDiceRoll = false
                    playerColor = if (data.getString("whitePlayer") == LoginActivity.getCurrentUser(this)?.username) "white" else "black"
                    
                    // SIMPLE TURN LOGIC: White always goes first
                    isMyTurn = playerColor == "white"
                    
                    val whitePlayer = data.getString("whitePlayer")
                    val blackPlayer = data.getString("blackPlayer")
                    
                    Log.d(TAG, "=== CHESS GAME STARTED ===")
                    Log.d(TAG, "White: $whitePlayer, Black: $blackPlayer")
                    Log.d(TAG, "My color: $playerColor, My turn: $isMyTurn")
                    Log.d(TAG, "Raw data: $data")
                    Log.d(TAG, "=========================")
                    
                    // Update the chess board view with the turn state
                    chessBoardView.setTurnState(isMyTurn)
                    
                    // Ensure board is properly initialized
                    chessBoardView.resetBoard()
                    chessBoardView.debugBoardState()
                    
                    Toast.makeText(this, "Game started! You are playing as ${playerColor?.capitalize()}", Toast.LENGTH_LONG).show()
                    updateUI()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game started", e)
                }
            }
        }
        
        socket?.on("chess:move_made") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val from = data.getString("from")
                    val to = data.getString("to")
                    val piece = data.getString("piece")
                    val color = data.getString("color")
                    val isCapture = data.optBoolean("capture", false)
                    val playerName = data.optString("playerName", "")
                    val isCheck = data.optBoolean("isCheck", false)
                    val isCheckmate = data.optBoolean("isCheckmate", false)
                    val isKingCapture = data.optBoolean("isKingCapture", false)
                    val currentPlayer = data.optString("currentPlayer", "")
                    
                    Log.d(TAG, "Move made: $from to $to by $color ($playerName)")
                    Log.d(TAG, "Current player after move: $currentPlayer, My color: $playerColor")
                    
                    val move = ChessMove(from, to, piece, color, isCapture, playerName, isCheck, isCheckmate, isKingCapture)
                    moveHistory.add(move)
                    moveHistoryAdapter.notifyItemInserted(moveHistory.size - 1)
                    
                    chessBoardView.makeMove(from, to, piece, color)
                    
                    // Debug board state after move
                    chessBoardView.debugBoardState()
                    
                    // SIMPLE TURN LOGIC: If I just moved, it's not my turn anymore
                    if (color == playerColor) {
                        isMyTurn = false
                        Log.d(TAG, "I just moved, setting isMyTurn = false")
                    } else {
                        isMyTurn = true
                        Log.d(TAG, "Opponent moved, setting isMyTurn = true")
                    }
                    
                    // Update the chess board view with the new turn state
                    chessBoardView.setTurnState(isMyTurn)
                    
                    // Handle special game states
                    if (isCheckmate) {
                        val winner = if (color == "white") "Black" else "White"
                        showGameOverDialog(winner, "Checkmate")
                    } else if (isKingCapture) {
                        val winner = if (color == "white") "White" else "Black"
                        showGameOverDialog(winner, "King captured")
                    } else if (isCheck) {
                        Toast.makeText(this, "Check!", Toast.LENGTH_SHORT).show()
                    }
                    
                    updateUI()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing move made", e)
                }
            }
        }
        
        socket?.on("chess:game_over") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val winner = data.optString("winner", null)
                    val reason = data.getString("reason")
                    
                    Log.d(TAG, "Game over: $winner wins by $reason")
                    showGameOverDialog(winner, reason)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing game over", e)
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
        
        socket?.on("chess:turn_state_sync") { args ->
            runOnUiThread {
                try {
                    val data = args[0] as JSONObject
                    val serverTurnState = data.getBoolean("isMyTurn")
                    val serverCurrentPlayer = data.getString("currentPlayer")
                    val serverPlayerColor = data.getString("playerColor")
                    
                    Log.d(TAG, "=== TURN STATE SYNC RESPONSE ===")
                    Log.d(TAG, "Server says: isMyTurn=$serverTurnState, currentPlayer=$serverCurrentPlayer, playerColor=$serverPlayerColor")
                    Log.d(TAG, "Client had: isMyTurn=$isMyTurn, playerColor=$playerColor")
                    
                    // Update client state to match server
                    isMyTurn = serverTurnState
                    playerColor = serverPlayerColor
                    
                    Log.d(TAG, "Updated client state: isMyTurn=$isMyTurn, playerColor=$playerColor")
                    
                    // Update UI and board
                    chessBoardView.setTurnState(isMyTurn)
                    updateUI()
                    
                    Toast.makeText(this, "Turn state synchronized with server", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing turn state sync", e)
                }
            }
        }
    }
    
    private fun setupChessBoard() {
        chessBoardView.setOnMoveListener { from, to ->
            Log.d(TAG, "=== MOVE ATTEMPT ===")
            Log.d(TAG, "From: $from, To: $to")
            Log.d(TAG, "Is My Turn: $isMyTurn")
            Log.d(TAG, "Game Started: $gameStarted")
            Log.d(TAG, "Game ID: $gameId")
            Log.d(TAG, "Player Color: $playerColor")
            Log.d(TAG, "=========================")
            
            if (isMyTurn && gameStarted) {
                Log.d(TAG, "Sending move to server: $from to $to")
                socket?.emit("chess:make_move", JSONObject().apply {
                    put("gameId", gameId)
                    put("from", from)
                    put("to", to)
                })
            } else {
                Log.d(TAG, "Move blocked: isMyTurn=$isMyTurn, gameStarted=$gameStarted")
                if (!isMyTurn) {
                    Toast.makeText(this, "Not your turn!", Toast.LENGTH_SHORT).show()
                }
                if (!gameStarted) {
                    Toast.makeText(this, "Game not started yet!", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    // Removed showAvailableGames - using new matchmaking system
    
    // Removed old join game dialogs - using new matchmaking system
    
    private fun leaveGame() {
        gameId?.let { id ->
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
    
    private fun offerDraw() {
        gameId?.let { id ->
            socket?.emit("chess:offer_draw", JSONObject().apply {
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
        
        // Force reconnect to server
        socket?.disconnect()
        socket?.connect()
        
        // Wait a moment then rejoin game
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            socket?.emit("chess:find_game")
            Log.d(TAG, "Rejoining game after refresh")
        }, 1000)
    }
    
    private fun showDebugInfo() {
        val debugInfo = """
            === CHESS DEBUG INFO ===
            Game ID: $gameId
            Game Started: $gameStarted
            Player Color: $playerColor
            Is My Turn: $isMyTurn
            Socket Connected: ${socket?.connected()}
            Username: ${LoginActivity.getCurrentUser(this)?.username}
            ========================
        """.trimIndent()
        
        Log.d(TAG, debugInfo)
        Toast.makeText(this, "Debug info logged - check console", Toast.LENGTH_LONG).show()
        
        // Also show a dialog with the info
        AlertDialog.Builder(this)
            .setTitle("Chess Debug Info")
            .setMessage(debugInfo)
            .setPositiveButton("OK", null)
            .show()
    }
    
    private fun syncTurnStateWithServer() {
        gameId?.let { id ->
            Log.d(TAG, "=== SYNCING TURN STATE WITH SERVER ===")
            Log.d(TAG, "Current client state: isMyTurn=$isMyTurn, playerColor=$playerColor")
            
            socket?.emit("chess:sync_turn_state", JSONObject().apply {
                put("gameId", id)
                put("playerName", LoginActivity.getCurrentUser(this@ChessActivity)?.username ?: "anonymous")
                put("expectedTurn", isMyTurn)
                put("playerColor", playerColor)
            })
        }
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
        updateUI()
    }
    
    private fun updateUI() {
        if (gameId == null) {
            gameStatusText.text = "♔ Chess Game ♔"
            playerInfoText.text = "Ready to play"
            joinGameButton.visibility = View.VISIBLE
            leaveGameButton.visibility = View.GONE
            resignButton.visibility = View.GONE
            offerDrawButton.visibility = View.GONE
            saveGameButton.visibility = View.GONE
            // Disable board interaction when not in game
            chessBoardView.setTurnState(false)
        } else {
            if (gameStarted) {
                // Game is active
                val colorText = playerColor?.capitalize() ?: "Spectator"
                playerInfoText.text = "Playing as: $colorText"
                gameStatusText.text = if (isMyTurn) "♟ Your turn" else "♙ Opponent's turn"
                joinGameButton.visibility = View.GONE
                leaveGameButton.visibility = View.VISIBLE
                resignButton.visibility = View.VISIBLE
                offerDrawButton.visibility = View.VISIBLE
                saveGameButton.visibility = View.VISIBLE
                // Update board turn state
                chessBoardView.setTurnState(isMyTurn)
            } else {
                // Waiting for opponent to join
                gameStatusText.text = "♔ Waiting for opponent ♔"
                playerInfoText.text = "Another player will join automatically"
                joinGameButton.visibility = View.GONE
                leaveGameButton.visibility = View.VISIBLE
                resignButton.visibility = View.GONE
                offerDrawButton.visibility = View.GONE
                saveGameButton.visibility = View.GONE
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
    
    override fun onDestroy() {
        super.onDestroy()
        connectionTimeoutHandler?.removeCallbacks(connectionTimeoutRunnable!!)
        loadingDialog?.dismiss()
        leaveGame()
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