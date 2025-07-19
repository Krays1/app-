package com.example.zell0

data class User(
    val username: String,
    val password: String,
    val profilePicBase64: String? = null,
    val deviceId: String = "",
    val isOnline: Boolean = false,
    val lastSeen: Long = System.currentTimeMillis()
) {
    
    companion object {
        fun fromRegistrationData(username: String, password: String, profilePic: String?, deviceId: String): User {
            return User(
                username = username,
                password = password,
                profilePicBase64 = profilePic,
                deviceId = deviceId,
                isOnline = true,
                lastSeen = System.currentTimeMillis()
            )
        }
    }
    
    fun toRegistrationData(): Map<String, Any> {
        val data = mutableMapOf<String, Any>(
            "username" to username,
            "deviceId" to deviceId,
            "deviceName" to "Android-${android.os.Build.MODEL}",
            "timestamp" to System.currentTimeMillis(),
            "userInfo" to mapOf(
                "platform" to "Android",
                "version" to android.os.Build.VERSION.RELEASE,
                "model" to android.os.Build.MODEL,
                "hasProfilePic" to (profilePicBase64 != null)
            )
        )
        
        profilePicBase64?.let {
            data["profilePic"] = it
        }
        
        return data
    }
    
    fun getDisplayName(): String {
        return if (username.isNotEmpty()) username else "Anonymous User"
    }
    
    fun hasProfilePicture(): Boolean {
        return !profilePicBase64.isNullOrEmpty()
    }
} 