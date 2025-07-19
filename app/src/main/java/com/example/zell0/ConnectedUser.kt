package com.example.zell0

import java.io.Serializable

data class ConnectedUser(
    val deviceId: String,
    val username: String,
    val profilePicBase64: String? = null,
    val isOnline: Boolean = true,
    val lastSeen: Long = System.currentTimeMillis(),
    val battlefieldStats: BattlefieldStats? = null,
    val steamStats: SteamStats? = null
) : Serializable {
    fun getDisplayName(): String {
        return username.ifEmpty { "User" }
    }
    
    fun hasBattlefieldStats(): Boolean {
        return battlefieldStats != null
    }
    
    fun hasSteamStats(): Boolean {
        return steamStats != null
    }
    
    fun getBattlefieldDisplayName(): String {
        return if (battlefieldStats != null) {
            battlefieldStats.getCompactDisplayName()
        } else {
            username
        }
    }
    
    fun getSteamDisplayName(): String {
        return if (steamStats != null) {
            steamStats.getCompactDisplayName()
        } else {
            username
        }
    }
} 