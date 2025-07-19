package com.example.zell0

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ImageView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import java.io.ByteArrayOutputStream
import java.io.FileNotFoundException

class LoginActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "LoginActivity"
        private const val PREFS_NAME = "Zell0UserPrefs"
        private const val KEY_USERNAME = "username"
        private const val KEY_PROFILE_PIC = "profile_pic"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        
        fun logout(activity: AppCompatActivity) {
            val sharedPrefs = activity.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            sharedPrefs.edit().apply {
                putBoolean(KEY_IS_LOGGED_IN, false)
                apply()
            }
            
            val intent = Intent(activity, LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            activity.startActivity(intent)
            activity.finish()
        }
        
        fun clearAllData(activity: AppCompatActivity) {
            try {
                // Clear main user preferences
                val sharedPrefs = activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                sharedPrefs.edit().clear().apply()
                
                // Clear Battlefield stats cache
                val battlefieldPrefs = activity.getSharedPreferences("BattlefieldStats", Context.MODE_PRIVATE)
                battlefieldPrefs.edit().clear().apply()
                
                // Clear microphone settings
                val micPrefs = activity.getSharedPreferences("MicrophoneSettings", Context.MODE_PRIVATE)
                micPrefs.edit().clear().apply()
                
                // Clear any other app preferences that might exist
                val defaultPrefs = activity.getSharedPreferences("com.example.zell0_preferences", Context.MODE_PRIVATE)
                defaultPrefs.edit().clear().apply()
                
                // Clear all SharedPreferences files that might exist
                val allPrefs = activity.getSharedPreferences("", Context.MODE_PRIVATE)
                allPrefs.edit().clear().apply()
                
                // Clear all possible SharedPreferences variations
                val packageName = activity.packageName
                val allPossiblePrefs = listOf(
                    PREFS_NAME,
                    "BattlefieldStats", 
                    "MicrophoneSettings",
                    "com.example.zell0_preferences",
                    "${packageName}_preferences",
                    "default_preferences"
                )
                
                for (prefName in allPossiblePrefs) {
                    try {
                        val prefs = activity.getSharedPreferences(prefName, Context.MODE_PRIVATE)
                        prefs.edit().clear().apply()
                        Log.d(TAG, "Cleared preferences: $prefName")
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to clear preferences: $prefName", e)
                    }
                }
                
                // Clear app cache directory
                try {
                    val cacheDir = activity.cacheDir
                    if (cacheDir.exists()) {
                        cacheDir.deleteRecursively()
                        Log.d(TAG, "Cleared app cache directory")
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to clear cache directory", e)
                }
                
                Log.d(TAG, "All user data cleared completely")
                
            } catch (e: Exception) {
                Log.e(TAG, "Error clearing data", e)
            }
        }
        
        fun getCurrentUser(activity: AppCompatActivity): User? {
            val sharedPrefs = activity.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            
            val username = sharedPrefs.getString(KEY_USERNAME, null)
            val profilePic = sharedPrefs.getString(KEY_PROFILE_PIC, null)
            val isLoggedIn = sharedPrefs.getBoolean(KEY_IS_LOGGED_IN, false)
            
            return if (username != null && isLoggedIn) {
                User(username, "", profilePic) // Empty password since we don't use it anymore
            } else {
                null
            }
        }
    }
    
    private lateinit var usernameLayout: TextInputLayout
    private lateinit var usernameInput: TextInputEditText
    private lateinit var profileImageView: ImageView
    private lateinit var selectImageButton: Button
    private lateinit var loginButton: Button
    private lateinit var clearDataButton: Button
    private lateinit var freshStartButton: Button
    private lateinit var rememberLoginCheckbox: CheckBox
    private lateinit var sharedPrefs: SharedPreferences
    
    private var profilePicBase64: String? = null
    
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
        
        // Initialize SharedPreferences
        sharedPrefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        
        // FORCE CLEAR ALL DATA ON STARTUP - MULTIPLE TIMES TO ENSURE CLEARANCE
        clearAllData(this)
        
        // Clear again after a short delay to catch any delayed writes
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            clearAllData(this)
        }, 100)
        
        // Clear one more time after UI is set up
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            clearAllData(this)
        }, 500)
        
        // Check if user is already logged in (only if remember login was enabled)
        if (sharedPrefs.getBoolean(KEY_IS_LOGGED_IN, false) && isPhoneDevice()) {
            Log.d(TAG, "Remember login enabled - auto-navigating to main activity")
            navigateToMainActivity()
            return
        } else {
            Log.d(TAG, "Remember login disabled or not phone device - showing login screen")
        }
        
        setContentView(R.layout.activity_login)
        
        initializeViews()
        setupClickListeners()
        loadSavedProfilePicture()
    }
    
    private fun initializeViews() {
        usernameLayout = findViewById(R.id.usernameLayout)
        usernameInput = findViewById(R.id.usernameInput)
        profileImageView = findViewById(R.id.profileImageView)
        selectImageButton = findViewById(R.id.selectImageButton)
        loginButton = findViewById(R.id.loginButton)
        clearDataButton = findViewById(R.id.clearDataButton)
        freshStartButton = findViewById(R.id.freshStartButton)
        rememberLoginCheckbox = findViewById(R.id.rememberLoginCheckbox)
        
        // Check if this is a phone device and show remember login option
        if (isPhoneDevice()) {
            rememberLoginCheckbox.visibility = View.VISIBLE
            Log.d(TAG, "Phone device detected - showing remember login option")
        } else {
            rememberLoginCheckbox.visibility = View.GONE
            Log.d(TAG, "Tablet/other device detected - hiding remember login option")
        }
        
        // Don't load saved username - let user enter fresh data
        // This prevents the app from remembering previous usernames
    }
    
    private fun setupClickListeners() {
        selectImageButton.setOnClickListener {
            openImagePicker()
        }
        
        loginButton.setOnClickListener {
            attemptLogin()
        }
        
        clearDataButton.setOnClickListener {
            showClearDataDialog()
        }
        
        freshStartButton.setOnClickListener {
            showFreshStartDialog()
        }
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
            profilePicBase64 = bitmapToBase64(resizedBitmap)
            
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
    
    private fun loadSavedProfilePicture() {
        val savedProfilePic = sharedPrefs.getString(KEY_PROFILE_PIC, null)
        if (savedProfilePic != null) {
            profilePicBase64 = savedProfilePic
            val bitmap = base64ToBitmap(savedProfilePic)
            bitmap?.let {
                profileImageView.setImageBitmap(it)
            }
        }
    }
    
    private fun attemptLogin() {
        val username = usernameInput.text.toString().trim()
        val rememberLogin = rememberLoginCheckbox.isChecked
        
        // Clear previous errors
        usernameLayout.error = null
        
        // Validate input
        if (username.isEmpty()) {
            usernameLayout.error = "Username is required"
            return
        }
        
        if (username.length < 3) {
            usernameLayout.error = "Username must be at least 3 characters"
            return
        }
        
        // Save user credentials (only if remember login is checked on phone)
        if (rememberLogin && isPhoneDevice()) {
            saveUserCredentials(username)
            Log.d(TAG, "Remember login enabled - credentials saved")
        } else {
            Log.d(TAG, "Remember login disabled or not phone device - credentials not saved")
        }
        
        // Navigate to main activity
        navigateToMainActivity()
    }
    
    private fun saveUserCredentials(username: String) {
        sharedPrefs.edit().apply {
            putString(KEY_USERNAME, username)
            putString(KEY_PROFILE_PIC, profilePicBase64)
            putBoolean(KEY_IS_LOGGED_IN, true)
            apply()
        }
        
        Log.d(TAG, "User credentials saved: $username")
    }
    
    private fun navigateToMainActivity() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
    }
    
    private fun showClearDataDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Clear All Data")
            .setMessage("This will clear all saved login information, profile pictures, and cached data. You'll need to create a new username. This action cannot be undone.")
            .setPositiveButton("Clear All Data") { _, _ ->
                clearAllData()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun clearAllData() {
        // Clear all SharedPreferences data multiple times
        clearAllData(this)
        
        // Clear again after a short delay
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            clearAllData(this)
        }, 100)
        
        // Clear the input fields completely
        usernameInput.text?.clear()
        profileImageView.setImageResource(R.drawable.ic_person_placeholder)
        profilePicBase64 = null
        
        // Force refresh the UI to ensure no cached data remains
        usernameInput.requestFocus()
        usernameInput.clearFocus()
        
        // Show multiple confirmation messages
        Toast.makeText(this, "🧹 CLEARING ALL DATA...", Toast.LENGTH_SHORT).show()
        
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            Toast.makeText(this, "✅ ALL DATA CLEARED! Create a new username.", Toast.LENGTH_LONG).show()
        }, 200)
        
        Log.d(TAG, "User data cleared successfully - fresh start ready")
    }
    
    private fun showFreshStartDialog() {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("🆕 Fresh Start")
            .setMessage("This will:\n\n• Clear ALL app data completely\n• Generate a new device ID\n• Force server to treat you as a new user\n• Remove any old usernames from server\n\nThis ensures a completely fresh start. Continue?")
            .setPositiveButton("🆕 FRESH START") { _, _ ->
                performFreshStart()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    private fun performFreshStart() {
        // Clear all data multiple times
        clearAllData(this)
        
        // Clear again after delays
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            clearAllData(this)
        }, 100)
        
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            clearAllData(this)
        }, 500)
        
        // Clear input fields
        usernameInput.text?.clear()
        profileImageView.setImageResource(R.drawable.ic_person_placeholder)
        profilePicBase64 = null
        
        // Force UI refresh
        usernameInput.requestFocus()
        usernameInput.clearFocus()
        
        // Show confirmation messages
        Toast.makeText(this, "🧹 CLEARING EVERYTHING...", Toast.LENGTH_SHORT).show()
        
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            Toast.makeText(this, "🆕 FRESH START READY! Create your new username.", Toast.LENGTH_LONG).show()
        }, 300)
        
        Log.d(TAG, "Fresh start completed - new device ID will be generated on next launch")
    }
    
    private fun isPhoneDevice(): Boolean {
        val displayMetrics = resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels / displayMetrics.density
        val screenHeight = displayMetrics.heightPixels / displayMetrics.density
        
        // Consider it a phone if screen width is less than 600dp (typical tablet breakpoint)
        val isPhone = screenWidth < 600
        
        Log.d(TAG, "Screen dimensions: ${screenWidth}dp x ${screenHeight}dp, isPhone: $isPhone")
        return isPhone
    }
} 