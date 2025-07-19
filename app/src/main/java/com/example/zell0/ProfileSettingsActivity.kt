package com.example.zell0

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.widget.Button
import android.widget.ImageView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import java.io.ByteArrayOutputStream
import java.io.FileNotFoundException

class ProfileSettingsActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "ProfileSettingsActivity"
        private const val PREFS_NAME = "Zell0UserPrefs"
        private const val KEY_USERNAME = "username"
        private const val KEY_PASSWORD = "password"
        private const val KEY_PROFILE_PIC = "profile_pic"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
    }
    
    private lateinit var profileImageView: ImageView
    private lateinit var changeImageButton: Button
    private lateinit var usernameLayout: TextInputLayout
    private lateinit var usernameInput: TextInputEditText
    private lateinit var saveButton: Button
    private lateinit var cancelButton: Button
    private lateinit var logoutButton: Button
    
    private var currentUser: User? = null
    private var updatedProfilePic: String? = null
    private var networkManager: NetworkManager? = null
    
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
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile_settings)
        
        initializeViews()
        loadCurrentUser()
        setupUI()
        setupClickListeners()
        setupNetworkManager()
    }
    
    private fun initializeViews() {
        profileImageView = findViewById(R.id.profileImageView)
        changeImageButton = findViewById(R.id.changeImageButton)
        usernameLayout = findViewById(R.id.usernameLayout)
        usernameInput = findViewById(R.id.usernameInput)
        saveButton = findViewById(R.id.saveButton)
        cancelButton = findViewById(R.id.cancelButton)
        logoutButton = findViewById(R.id.logoutButton)
    }
    
    private fun loadCurrentUser() {
        currentUser = LoginActivity.getCurrentUser(this)
        if (currentUser == null) {
            LoginActivity.logout(this)
            return
        }
    }
    
    private fun setupUI() {
        currentUser?.let { user ->
            // Set current username
            usernameInput.setText(user.username)
            
            // Set current profile picture
            if (user.hasProfilePicture()) {
                val bitmap = base64ToBitmap(user.profilePicBase64!!)
                bitmap?.let { profileImageView.setImageBitmap(it) }
            }
        }
    }
    
    private fun setupClickListeners() {
        changeImageButton.setOnClickListener {
            openImagePicker()
        }
        
        saveButton.setOnClickListener {
            saveProfileChanges()
        }
        
        cancelButton.setOnClickListener {
            finish()
        }
        
        logoutButton.setOnClickListener {
            showLogoutConfirmDialog()
        }
    }
    
    private fun setupNetworkManager() {
        networkManager = NetworkManager()
        networkManager?.setNetworkListener(object : NetworkManager.NetworkListener {
            override fun onConnected() {
                Log.d(TAG, "Connected to server for profile updates")
            }
            
            override fun onDisconnected() {
                Log.d(TAG, "Disconnected from server")
            }
            
            override fun onConnectionError(error: String) {
                Log.e(TAG, "Connection error: $error")
            }
            
            // Profile update events could be handled here
            
            // Empty implementations for required methods
            override fun onTextMessageReceived(message: String, senderId: String, senderName: String, senderProfilePic: String?, timestamp: Long) {}
            override fun onAudioMessageReceived(audioData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?, duration: Long, timestamp: Long) {}
            override fun onImageMessageReceived(imageData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?, caption: String, timestamp: Long) {}
            override fun onLiveAudioChunkReceived(audioData: ByteArray, senderId: String, senderName: String, senderProfilePic: String?) {}
            override fun onUserJoined(userId: String) {}
            override fun onUserListUpdated(users: List<ConnectedUser>) {}
            override fun onUserLeft(userId: String) {}
            override fun onFileShared(fileId: String, fileName: String, fileType: String, fileSize: Long, uploadedBy: String) {}
            override fun onFileListUpdated(files: List<SharedFile>) {}
            override fun onFileUploadSuccess(fileId: String, fileName: String) {}
            override fun onFileDownloadResponse(fileId: String, fileName: String, fileType: String, fileData: ByteArray) {}
            override fun onFileMessageReceived(fileData: ByteArray, fileName: String, fileSize: Long, mimeType: String, senderId: String, senderName: String, senderProfilePic: String?, timestamp: Long) {}
        })
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
            
            // Resize bitmap to reasonable size (max 200x200)
            val resizedBitmap = resizeBitmap(bitmap, 200, 200)
            
            // Convert to Base64
            updatedProfilePic = bitmapToBase64(resizedBitmap)
            
            // Display in ImageView
            profileImageView.setImageBitmap(resizedBitmap)
            
            Log.d(TAG, "Profile picture selected and converted to Base64")
            
        } catch (e: FileNotFoundException) {
            Log.e(TAG, "Error loading image", e)
            Toast.makeText(this, "Error loading image", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun resizeBitmap(bitmap: Bitmap, maxWidth: Int, maxHeight: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        
        val scaleWidth = maxWidth.toFloat() / width
        val scaleHeight = maxHeight.toFloat() / height
        val scale = minOf(scaleWidth, scaleHeight)
        
        val newWidth = (width * scale).toInt()
        val newHeight = (height * scale).toInt()
        
        return Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true)
    }
    
    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val bytes = outputStream.toByteArray()
        return Base64.encodeToString(bytes, Base64.DEFAULT)
    }
    
    private fun base64ToBitmap(base64String: String): Bitmap? {
        return try {
            val bytes = Base64.decode(base64String, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        } catch (e: Exception) {
            Log.e(TAG, "Error converting Base64 to bitmap", e)
            null
        }
    }
    
    private fun saveProfileChanges() {
        val newUsername = usernameInput.text.toString().trim()
        
        // Clear previous errors
        usernameLayout.error = null
        
        // Validate inputs
        if (newUsername.isEmpty()) {
            usernameLayout.error = "Username cannot be empty"
            return
        }
        
        if (newUsername.length < 3) {
            usernameLayout.error = "Username must be at least 3 characters"
            return
        }
        
        // Create updated user object
        val updatedUser = User(
            username = newUsername,
            password = "", // Empty password since we don't use passwords anymore
            profilePicBase64 = updatedProfilePic ?: currentUser?.profilePicBase64,
            deviceId = currentUser?.deviceId ?: "",
            isOnline = currentUser?.isOnline ?: true,
            lastSeen = System.currentTimeMillis()
        )
        
        // Save changes locally
        saveUserCredentials(updatedUser)
        
        // Send profile update to server
        sendProfileUpdateToServer(updatedUser)
        
        Toast.makeText(this, "Profile updated successfully", Toast.LENGTH_SHORT).show()
        finish()
    }
    
    private fun saveUserCredentials(user: User) {
        val sharedPrefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        sharedPrefs.edit().apply {
            putString(KEY_USERNAME, user.username)
            putString(KEY_PASSWORD, user.password) // Keep for compatibility but empty
            putString(KEY_PROFILE_PIC, user.profilePicBase64)
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
        
        Log.d(TAG, "User credentials updated: ${user.username}")
    }
    
    private fun sendProfileUpdateToServer(user: User) {
        networkManager?.sendProfileUpdate(
            username = user.username,
            profilePic = user.profilePicBase64
        )
        Log.d(TAG, "Profile update sent to server: ${user.username}")
    }
    
    private fun showLogoutConfirmDialog() {
        AlertDialog.Builder(this)
            .setTitle("Logout")
            .setMessage("Are you sure you want to logout?")
            .setPositiveButton("Yes") { _, _ ->
                LoginActivity.logout(this)
            }
            .setNegativeButton("No", null)
            .show()
    }
} 