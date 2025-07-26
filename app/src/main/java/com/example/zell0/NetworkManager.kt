package com.example.zell0

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URI
import java.util.Base64

class NetworkManager {
    
    companion object {
        private const val TAG = "NetworkManager"
        
        // ========================================
        // 🔧 SERVER CONFIGURATION - RAILWAY CLOUD
        // ========================================
        // This app is configured to use Railway cloud server
        // 
        // Server is deployed on Railway at:
        // https://app--dependable-unity-production.up.railway.app
        // 
        // Features enabled:
        // - Real-time text messaging
        // - Push-to-talk voice messaging
        // - Multiple Android device support
        // - Secure HTTPS connection
        // ========================================
        
        private const val SERVER_URL = "https://app--dependable-unity-production.up.railway.app" // ✅ Using Railway cloud server
        
        // Port configuration (usually don't need to change these)
        private const val AUDIO_PORT = 8080
        private const val TEXT_PORT = 8081
    }
    
    private var socket: Socket? = null
    private var isConnected = false
    private var username: String = "" // Changed from deviceId to username
    
    interface NetworkListener {
        fun onConnected()
        fun onDisconnected()
        fun onConnectionError(error: String)
        fun onTextMessageReceived(message: String, senderId: String, senderName: String, senderProfilePic: String?, timestamp: Long)
        fun onAudioMessageReceived(audioData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?, duration: Long, timestamp: Long)
        fun onImageMessageReceived(imageData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?, caption: String, timestamp: Long)
        fun onLiveAudioChunkReceived(audioData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?)
        fun onUserJoined(userId: String)
        fun onUserLeft(userId: String)
        fun onUserListUpdated(users: List<ConnectedUser>)
        fun onFileShared(fileId: String, fileName: String, fileType: String, fileSize: Long, uploadedBy: String)
        fun onFileListUpdated(files: List<SharedFile>)
        fun onFileUploadSuccess(fileId: String, fileName: String)
        fun onFileDownloadResponse(fileId: String, fileName: String, fileType: String, fileData: ByteArray)
        fun onFileMessageReceived(fileData: ByteArray, fileName: String, fileSize: Long, mimeType: String, senderId: String, senderName: String, senderProfilePic: String?, timestamp: Long)
    }
    
    private var networkListener: NetworkListener? = null
    
    fun setNetworkListener(listener: NetworkListener) {
        networkListener = listener
    }
    
    fun connect(username: String, user: User?) {
        this.username = username // Store username instead of deviceId
        Log.d(TAG, "Connecting to server with username: $username")
        
        try {
            val options = IO.Options().apply {
                transports = arrayOf("polling") // Force polling only, no websocket
                timeout = 20000
                forceNew = true
            }
            
            socket = IO.socket(URI(SERVER_URL), options)
            
            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Connected to server")
                isConnected = true
                
                // Register user with server (using username as primary identifier)
                val registrationData = JSONObject().apply {
                    put("username", username) // Primary identifier
                    put("deviceId", username) // Keep for backward compatibility
                    put("deviceName", "Android-${android.os.Build.MODEL}")
                    put("timestamp", System.currentTimeMillis())
                    
                    // Add user information if available
                    if (user != null) {
                        put("hasProfilePic", user.hasProfilePicture())
                        if (user.hasProfilePicture()) {
                            put("profilePic", user.profilePicBase64)
                        }
                    }
                    
                    put("userInfo", JSONObject().apply {
                        put("platform", "Android")
                        put("version", android.os.Build.VERSION.RELEASE)
                        put("model", android.os.Build.MODEL)
                        put("username", username)
                    })
                }
                socket?.emit("register", registrationData)
                
                networkListener?.onConnected()
            }
            
            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "Disconnected from server")
                isConnected = false
                networkListener?.onDisconnected()
            }
            
            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                val errorDetail = if (args.isNotEmpty()) args[0].toString() else "Unknown error"
                Log.e(TAG, "Connection error: $errorDetail")
                Log.e(TAG, "Attempting to connect to: $SERVER_URL")
                Log.e(TAG, "Network info - Device: ${android.os.Build.MODEL}, Android: ${android.os.Build.VERSION.RELEASE}")
                networkListener?.onConnectionError("Connection failed: $errorDetail")
            }
            
            socket?.on("text_message_received") { args ->
                try {
                    val messageData = args[0] as JSONObject
                    val message = messageData.getString("text")
                    val senderId = messageData.getString("senderId")
                    val senderName = messageData.getString("senderName")
                    val senderProfilePic = if (messageData.has("senderProfilePic")) messageData.getString("senderProfilePic") else null
                    val timestamp = messageData.getLong("timestamp")
                    
                    networkListener?.onTextMessageReceived(message, senderId, senderName, senderProfilePic, timestamp)
                } catch (e: Exception) {
                    Log.e(TAG, "Error handling text message", e)
                }
            }
            
            socket?.on("voice_message_received") { args ->
                try {
                    val messageData = args[0] as JSONObject
                    val audioDataBase64 = messageData.getString("audioData")
                    val audioData = Base64.getDecoder().decode(audioDataBase64)
                    val senderId = messageData.getString("senderId")
                    val senderName = messageData.getString("senderName")
                    val senderProfilePic = if (messageData.has("senderProfilePic")) messageData.getString("senderProfilePic") else null
                    val duration = messageData.getLong("duration")
                    val timestamp = messageData.getLong("timestamp")
                    
                    networkListener?.onAudioMessageReceived(audioData, senderId, senderName, senderProfilePic, duration, timestamp)
                } catch (e: Exception) {
                    Log.e(TAG, "Error handling voice message", e)
                }
            }
            
            socket?.on("image-message") { args ->
                try {
                    val data = args[0] as JSONObject
                    val imageDataBase64 = data.getString("imageData")
                    val fromId = data.getString("from")
                    val fromName = data.getString("fromName")
                    val caption = data.optString("caption", "")
                    val profilePic = data.optString("profilePic", null)
                    val imageSize = data.optLong("imageSize", 0)
                    
                    val imageData = Base64.getDecoder().decode(imageDataBase64)
                    Log.d(TAG, "Image message received from $fromName (${imageSize} bytes)")
                    networkListener?.onImageMessageReceived(imageData, fromId, fromName, profilePic, caption, System.currentTimeMillis())
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing image message", e)
                }
            }
            
            socket?.on("live_audio_chunk_received") { args ->
                try {
                    val chunkData = args[0] as JSONObject
                    val audioDataBase64 = chunkData.getString("audioData")
                    val audioData = Base64.getDecoder().decode(audioDataBase64)
                    val senderId = chunkData.getString("senderId")
                    val senderName = chunkData.getString("senderName")
                    val senderProfilePic = if (chunkData.has("senderProfilePic")) chunkData.getString("senderProfilePic") else null
                    
                    networkListener?.onLiveAudioChunkReceived(audioData, senderId, senderName, senderProfilePic)
                } catch (e: Exception) {
                    Log.e(TAG, "Error handling live audio chunk", e)
                }
            }
            

            
            socket?.on("user_joined") { args ->
                try {
                    val data = args[0] as JSONObject
                    val userId = data.getString("userId") // This is now the username
                    Log.d(TAG, "User joined: $userId")
                    networkListener?.onUserJoined(userId)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing user joined", e)
                }
            }
            
            socket?.on("user_left") { args ->
                try {
                    val data = args[0] as JSONObject
                    val userId = data.getString("userId") // This is now the username
                    Log.d(TAG, "User left: $userId")
                    networkListener?.onUserLeft(userId)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing user left", e)
                }
            }
            
            socket?.on("user_list_updated") { args ->
                try {
                    val data = args[0] as JSONObject
                    val usersArray = data.getJSONArray("users")
                    val users = mutableListOf<ConnectedUser>()
                    
                    for (i in 0 until usersArray.length()) {
                        val userData = usersArray.getJSONObject(i)
                        val username = userData.getString("username")
                        val profilePic = if (userData.has("profilePic")) userData.getString("profilePic") else null
                        val isOnline = userData.getBoolean("isOnline")
                        val lastSeen = userData.getLong("lastSeen")
                        
                        val user = ConnectedUser(
                            deviceId = username, // Use username as deviceId for compatibility
                            username = username,
                            profilePicBase64 = profilePic,
                            isOnline = isOnline,
                            lastSeen = lastSeen
                        )
                        users.add(user)
                    }
                    
                    Log.d(TAG, "User list updated: ${users.size} users")
                    networkListener?.onUserListUpdated(users)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing user list", e)
                }
            }
            
            socket?.on("file_shared") { args ->
                try {
                    val data = args[0] as JSONObject
                    val fileId = data.getString("fileId")
                    val fileName = data.getString("fileName")
                    val fileType = data.getString("fileType")
                    val fileSize = data.getLong("fileSize")
                    val uploadedBy = data.getString("uploadedBy") // This is now the username
                    
                    Log.d(TAG, "File shared: $fileName by $uploadedBy")
                    networkListener?.onFileShared(fileId, fileName, fileType, fileSize, uploadedBy)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing file shared", e)
                }
            }
            
            socket?.on("file_list_updated") { args ->
                try {
                    val data = args[0] as JSONObject
                    val filesArray = data.getJSONArray("files")
                    val files = mutableListOf<SharedFile>()
                    
                    for (i in 0 until filesArray.length()) {
                        val fileObj = filesArray.getJSONObject(i)
                        val file = SharedFile(
                            id = fileObj.getString("id"),
                            name = fileObj.getString("name"),
                            type = fileObj.getString("type"),
                            size = fileObj.getLong("size"),
                            uploadedBy = fileObj.getString("uploadedBy"),
                            uploadedAt = fileObj.getString("uploadedAt")
                        )
                        files.add(file)
                    }
                    
                    networkListener?.onFileListUpdated(files)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing file list update", e)
                }
            }
            
            socket?.on("file_upload_success") { args ->
                try {
                    val data = args[0] as JSONObject
                    val fileId = data.getString("fileId")
                    val fileName = data.getString("fileName")
                    
                    Log.d(TAG, "File upload success: $fileName")
                    networkListener?.onFileUploadSuccess(fileId, fileName)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing file upload success", e)
                }
            }
            
            socket?.on("file-download-response") { args ->
                try {
                    val data = args[0] as JSONObject
                    val fileId = data.getString("fileId")
                    val fileName = data.getString("fileName")
                    val fileType = data.getString("fileType")
                    val fileDataBase64 = data.getString("fileData")
                    
                    val fileData = Base64.getDecoder().decode(fileDataBase64)
                    Log.d(TAG, "File download response: $fileName (${fileData.size} bytes)")
                    networkListener?.onFileDownloadResponse(fileId, fileName, fileType, fileData)
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing file download response", e)
                }
            }
            
            // Handle pong response for keep-alive
            socket?.on("pong") {
                Log.d(TAG, "Pong received from server")
            }
            
            // Handle server responses
            socket?.on("registered") { args ->
                try {
                    val data = args[0] as JSONObject
                    val success = data.getBoolean("success")
                    val connectedUsers = data.getInt("connectedUsers")
                    val message = data.optString("message", "")
                    
                    Log.d(TAG, "Registration response: success=$success, users=$connectedUsers, message=$message")
                    
                    // Request current user list after successful registration
                    if (success) {
                        Log.d(TAG, "Requesting current user list after registration")
                        socket?.emit("get-user-list")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing registration response", e)
                }
            }
            
            // Handle profile update success
            socket?.on("profile-update-success") { args ->
                try {
                    val data = args[0] as JSONObject
                    val message = data.optString("message", "Profile updated successfully")
                    
                    Log.d(TAG, "Profile update success: $message")
                    // TODO: Notify UI about successful profile update
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing profile update response", e)
                }
            }
            
            socket?.connect()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting to server", e)
            networkListener?.onConnectionError("Failed to connect: ${e.message}")
        }
    }
    
    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        isConnected = false
    }
    
    fun reconnect() {
        Log.d(TAG, "Manual reconnection attempt...")
        disconnect()
        Thread.sleep(2000) // Wait 2 seconds before reconnecting
        // Reconnect with the same username, as the server will use it for identification
        // The user object might be null or need to be re-fetched if it's not persistent
        // For now, we'll pass null for user as it's not directly used for registration
        connect(username, null) 
    }
    
    fun sendTextMessage(message: String) {
        if (!isConnected) {
            Log.w(TAG, "Cannot send text message: not connected")
            return
        }
        
        try {
            val messageData = JSONObject().apply {
                put("message", message)
                put("username", username) // Use username for text messages
                put("timestamp", System.currentTimeMillis())
                put("type", "text")
            }
            
            socket?.emit("text-message", messageData)
            Log.d(TAG, "Text message sent: $message")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending text message", e)
        }
    }
    
    fun sendAudioMessage(audioData: ByteArray) {
        if (!isConnected) {
            Log.w(TAG, "Cannot send audio message: not connected")
            return
        }
        
        try {
            val audioDataBase64 = Base64.getEncoder().encodeToString(audioData)
            val duration = calculateAudioDuration(audioData)
            
            val messageData = JSONObject().apply {
                put("audioData", audioDataBase64)
                put("username", username) // Use username for audio messages
                put("timestamp", System.currentTimeMillis())
                put("type", "voice")
                put("duration", duration)
            }
            
            socket?.emit("voice-message", messageData)
            Log.d(TAG, "Voice message sent, size: ${audioData.size} bytes, duration: ${duration}ms")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending voice message", e)
        }
    }
    
    fun sendLiveAudioChunk(audioData: ByteArray) {
        if (!isConnected) {
            Log.w(TAG, "Cannot send live audio chunk: not connected")
            return
        }
        
        try {
            val audioDataBase64 = Base64.getEncoder().encodeToString(audioData)
            
            val chunkData = JSONObject().apply {
                put("audioData", audioDataBase64)
                put("username", username) // Use username for live audio chunks
                put("timestamp", System.currentTimeMillis())
                put("chunkSize", audioData.size)
            }
            
            socket?.emit("live-audio-chunk", chunkData)
            Log.d(TAG, "Live audio chunk sent: ${audioData.size} bytes")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending live audio chunk", e)
        }
    }
    
    fun sendImageMessage(imageData: ByteArray, caption: String = "") {
        if (!isConnected) {
            Log.w(TAG, "Cannot send image message: not connected")
            return
        }
        
        try {
            val imageBase64 = Base64.getEncoder().encodeToString(imageData)
            val messageData = JSONObject().apply {
                put("imageData", imageBase64)
                put("caption", caption)
                put("username", username) // Use username for image messages
                put("timestamp", System.currentTimeMillis())
                put("type", "image")
                put("imageSize", imageData.size)
            }
            
            socket?.emit("image-message", messageData)
            Log.d(TAG, "Image message sent (${imageData.size} bytes)")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending image message", e)
        }
    }
    
    fun sendProfileUpdate(username: String?, profilePic: String?) {
        if (!isConnected) {
            Log.w(TAG, "Cannot send profile update: not connected")
            return
        }
        
        try {
            val updateData = JSONObject().apply {
                username?.let { put("username", it) }
                profilePic?.let { put("profilePic", it) }
                put("username", username) // Use username for profile updates
                put("timestamp", System.currentTimeMillis())
            }
            
            socket?.emit("profile-update", updateData)
            Log.d(TAG, "Profile update sent")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending profile update", e)
        }
    }
    
    fun sendKeepAlive() {
        if (!isConnected) return
        
        try {
            // Use ping/pong for keep-alive as implemented in server
            socket?.emit("ping")
            Log.d(TAG, "Ping sent to server")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending ping", e)
        }
    }
    
    private fun calculateAudioDuration(audioData: ByteArray): Long {
        // Calculate duration based on audio format
        // 16-bit PCM mono = 2 bytes per sample
        // Use the actual sample rate from the current audio settings
        val sampleRate = 8000 // Default to LOW quality (8kHz) as per current settings
        val bytesPerSample = 2
        val samples = audioData.size / bytesPerSample
        return (samples * 1000L) / sampleRate
    }
    
    fun isConnected(): Boolean = isConnected
    
    fun getDeviceId(): String = username // Return username as deviceId
    
    fun uploadFile(fileName: String, fileData: ByteArray, fileType: String) {
        if (!isConnected) {
            Log.w(TAG, "Cannot upload file: not connected")
            return
        }
        
        try {
            val fileBase64 = Base64.getEncoder().encodeToString(fileData)
            val uploadData = JSONObject().apply {
                put("fileName", fileName)
                put("fileData", fileBase64)
                put("fileType", fileType)
                put("fileSize", fileData.size)
                put("username", username) // Use username for file uploads
                put("timestamp", System.currentTimeMillis())
            }
            
            socket?.emit("file-upload", uploadData)
            Log.d(TAG, "File upload initiated: $fileName (${fileData.size} bytes)")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error uploading file", e)
        }
    }
    
    fun downloadFile(fileId: String) {
        if (!isConnected) {
            Log.w(TAG, "Cannot download file: not connected")
            return
        }
        
        try {
            val requestData = JSONObject().apply {
                put("fileId", fileId)
                put("username", username) // Use username for file downloads
            }
            
            socket?.emit("file-download", requestData)
            Log.d(TAG, "File download requested: $fileId")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting file download", e)
        }
    }
    
    fun requestFileList() {
        if (!isConnected) {
            Log.w(TAG, "Cannot request file list: not connected")
            return
        }
        
        try {
            socket?.emit("get-file-list")
            Log.d(TAG, "File list requested")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting file list", e)
        }
    }
    
    fun sendGetUserList() {
        if (!isConnected) {
            Log.w(TAG, "Cannot request user list: not connected")
            return
        }
        
        try {
            socket?.emit("get-user-list")
            Log.d(TAG, "User list requested")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error requesting user list", e)
        }
    }
    
    fun sendClearConnectedUsers() {
        if (!isConnected) {
            Log.w(TAG, "Cannot clear connected users: not connected")
            return
        }
        
        try {
            socket?.emit("clear-connected-users")
            Log.d(TAG, "Clear connected users request sent")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing connected users", e)
        }
    }
    

    
    fun cleanup() {
        disconnect()
    }

    fun getSocket(): Socket? {
        return socket
    }

    // SNAKE: Submit score
    fun submitSnakeScore(username: String, score: Int, time: Int, pieces: Int, callback: (Boolean, String?) -> Unit) {
        Log.d(TAG, "Submitting Snake score: username=$username, score=$score, time=$time, pieces=$pieces, connected=$isConnected")
        if (!isConnected) {
            Log.e(TAG, "Not connected to server, cannot submit score")
            callback(false, "Not connected")
            return
        }
        try {
            val data = JSONObject().apply {
                put("username", username)
                put("score", score)
                put("time", time)
                put("pieces", pieces)
            }
            Log.d(TAG, "Emitting snake:submit_score with data: $data")
            socket?.emit("snake:submit_score", data)
            socket?.once("snake:submit_result") { args ->
                val obj = args[0] as JSONObject
                val success = obj.optBoolean("success", false)
                val error = obj.optString("error", null)
                Log.d(TAG, "Received snake:submit_result: success=$success, error=$error")
                callback(success, error)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error submitting Snake score", e)
            callback(false, e.message)
        }
    }

    // SNAKE: Get leaderboard
    fun getSnakeLeaderboard(callback: (List<SnakeScore>) -> Unit) {
        Log.d(TAG, "Getting Snake leaderboard, connected=$isConnected")
        if (!isConnected) {
            Log.e(TAG, "Not connected to server, cannot get leaderboard")
            callback(emptyList())
            return
        }
        try {
            Log.d(TAG, "Emitting snake:get_leaderboard")
            socket?.emit("snake:get_leaderboard")
            socket?.once("snake:leaderboard") { args ->
                val obj = args[0] as JSONObject
                val arr = obj.optJSONArray("leaderboard")
                val result = mutableListOf<SnakeScore>()
                if (arr != null) {
                    for (i in 0 until arr.length()) {
                        val item = arr.getJSONObject(i)
                        result.add(
                            SnakeScore(
                                username = item.optString("username", ""),
                                score = item.optInt("score", 0),
                                time = item.optInt("time", 0),
                                pieces = item.optInt("pieces", 0),
                                timestamp = item.optString("timestamp", "")
                            )
                        )
                    }
                }
                Log.d(TAG, "Received snake:leaderboard with ${result.size} scores")
                callback(result)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting Snake leaderboard", e)
            callback(emptyList())
        }
    }

    // SNAKE: Listen for leaderboard updates
    fun setSnakeLeaderboardListener(listener: (List<SnakeScore>) -> Unit) {
        socket?.on("snake:leaderboard_updated") { args ->
            val obj = args[0] as JSONObject
            val arr = obj.optJSONArray("leaderboard")
            val result = mutableListOf<SnakeScore>()
            if (arr != null) {
                for (i in 0 until arr.length()) {
                    val item = arr.getJSONObject(i)
                    result.add(
                        SnakeScore(
                            username = item.optString("username", ""),
                            score = item.optInt("score", 0),
                            time = item.optInt("time", 0),
                            pieces = item.optInt("pieces", 0),
                            timestamp = item.optString("timestamp", "")
                        )
                    )
                }
            }
            listener(result)
        }
    }

    data class SnakeScore(
        val username: String,
        val score: Int,
        val time: Int,
        val pieces: Int,
        val timestamp: String
    )

    // PACMAN: Submit score
    fun submitPacmanScore(username: String, score: Int, level: Int, dotsEaten: Int, callback: (Boolean) -> Unit = {}) {
        Log.d(TAG, "Submitting Pac-Man score: username=$username, score=$score, level=$level, dotsEaten=$dotsEaten, connected=$isConnected")
        if (!isConnected) {
            Log.e(TAG, "Not connected to server, cannot submit score")
            callback(false)
            return
        }
        try {
            val data = JSONObject().apply {
                put("username", username)
                put("score", score)
                put("level", level)
                put("dotsEaten", dotsEaten)
            }
            Log.d(TAG, "Emitting pacman:submit_score with data: $data")
            socket?.emit("pacman:submit_score", data)
            
            // Listen for response
            socket?.once("pacman:score_submitted") { args ->
                val obj = args[0] as JSONObject
                val success = obj.optBoolean("success", false)
                Log.d(TAG, "Received pacman:score_submitted: success=$success")
                callback(success)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error submitting Pac-Man score", e)
            callback(false)
        }
    }

    // PACMAN: Get leaderboard
    fun getPacmanLeaderboard(callback: (Boolean, String?) -> Unit) {
        Log.d(TAG, "Getting Pac-Man leaderboard, connected=$isConnected")
        if (!isConnected) {
            Log.e(TAG, "Not connected to server, cannot get leaderboard")
            callback(false, "Not connected")
            return
        }
        try {
            Log.d(TAG, "Emitting pacman:get_leaderboard")
            socket?.emit("pacman:get_leaderboard")
            socket?.once("pacman:leaderboard") { args ->
                val obj = args[0] as JSONObject
                val success = obj.optBoolean("success", false)
                val data = obj.optString("data", "[]")
                Log.d(TAG, "Received pacman:leaderboard: success=$success, data=$data")
                callback(success, data)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting Pac-Man leaderboard", e)
            callback(false, e.message)
        }
    }

    // PACMAN: Listen for leaderboard updates
    fun setPacmanLeaderboardListener(listener: (String) -> Unit) {
        socket?.on("pacman:leaderboard_updated") { args ->
            val obj = args[0] as JSONObject
            val data = obj.optString("data", "[]")
            listener(data)
        }
    }

    data class PacmanScore(
        val username: String,
        val score: Int,
        val level: Int,
        val dotsEaten: Int,
        val timestamp: Long = System.currentTimeMillis()
    )

    data class PacmanUserStats(
        val username: String,
        val totalScore: Int,
        val gamesPlayed: Int,
        val highestScore: Int,
        val totalDotsEaten: Int,
        val highestLevel: Int
    )

    // OPENARENA: Submit match result
    fun submitOpenArenaResult(username: String, kills: Int, deaths: Int, score: Int, gameMode: String, map: String, callback: (Boolean) -> Unit = {}) {
        Log.d(TAG, "Submitting OpenArena result: username=$username, kills=$kills, deaths=$deaths, score=$score, mode=$gameMode, map=$map")
        if (!isConnected) {
            Log.e(TAG, "Not connected to server, cannot submit result")
            callback(false)
            return
        }
        try {
            val data = JSONObject().apply {
                put("username", username)
                put("kills", kills)
                put("deaths", deaths)
                put("score", score)
                put("gameMode", gameMode)
                put("map", map)
                put("timestamp", System.currentTimeMillis())
            }
            Log.d(TAG, "Emitting openarena:submit_result with data: $data")
            socket?.emit("openarena:submit_result", data)
            
            // Listen for response
            socket?.once("openarena:result_submitted") { args ->
                val obj = args[0] as JSONObject
                val success = obj.optBoolean("success", false)
                Log.d(TAG, "Received openarena:result_submitted: success=$success")
                callback(success)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error submitting OpenArena result", e)
            callback(false)
        }
    }

    // OPENARENA: Get leaderboard
    fun getOpenArenaLeaderboard(callback: (Boolean, String?) -> Unit) {
        Log.d(TAG, "Getting OpenArena leaderboard, connected=$isConnected")
        if (!isConnected) {
            Log.e(TAG, "Not connected to server, cannot get leaderboard")
            callback(false, "Not connected")
            return
        }
        try {
            Log.d(TAG, "Emitting openarena:get_leaderboard")
            socket?.emit("openarena:get_leaderboard")
            socket?.once("openarena:leaderboard") { args ->
                val obj = args[0] as JSONObject
                val success = obj.optBoolean("success", false)
                val data = obj.optString("data", "[]")
                Log.d(TAG, "Received openarena:leaderboard: success=$success, data=$data")
                callback(success, data)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting OpenArena leaderboard", e)
            callback(false, e.message)
        }
    }

    // OPENARENA: Get server status
    fun getOpenArenaServerStatus(callback: (Boolean, String, Int) -> Unit) {
        Log.d(TAG, "Getting OpenArena server status, connected=$isConnected")
        if (!isConnected) {
            Log.e(TAG, "Not connected to server, cannot get server status")
            callback(false, "Offline", 0)
            return
        }
        try {
            Log.d(TAG, "Emitting openarena:get_status")
            socket?.emit("openarena:get_status")
            socket?.once("openarena:server_status") { args ->
                val obj = args[0] as JSONObject
                val status = obj.optString("status", "Unknown")
                val players = obj.optInt("players", 0)
                Log.d(TAG, "Received openarena:server_status: status=$status, players=$players")
                callback(true, status, players)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting OpenArena server status", e)
            callback(false, "Error", 0)
        }
    }

    data class OpenArenaResult(
        val username: String,
        val kills: Int,
        val deaths: Int,
        val score: Int,
        val gameMode: String,
        val map: String,
        val timestamp: Long = System.currentTimeMillis()
    )

    data class OpenArenaUserStats(
        val username: String,
        val totalKills: Int,
        val totalDeaths: Int,
        val totalScore: Int,
        val gamesPlayed: Int,
        val favoriteGameMode: String,
        val favoriteMap: String,
        val kdr: Float
    )
} 