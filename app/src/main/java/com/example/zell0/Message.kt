package com.example.zell0

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class Message(
    val id: String,
    val type: MessageType,
    val content: String,
    val audioData: ByteArray? = null,
    val imageData: ByteArray? = null,
    val senderId: String,
    val senderName: String = "Anonymous",
    val senderProfilePic: String? = null, // Base64 encoded image
    val timestamp: Long,
    val duration: Long = 0, // for audio messages in milliseconds
    val isFromCurrentUser: Boolean = false
) {
    enum class MessageType {
        TEXT, AUDIO, IMAGE
    }
    
    fun getFormattedTimestamp(): String {
        val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
        return sdf.format(Date(timestamp))
    }
    
    fun getFormattedDuration(): String {
        val seconds = duration / 1000
        val minutes = seconds / 60
        val remainingSeconds = seconds % 60
        return String.format("%02d:%02d", minutes, remainingSeconds)
    }
    
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        
        other as Message
        
        if (id != other.id) return false
        if (type != other.type) return false
        if (content != other.content) return false
        if (audioData != null) {
            if (other.audioData == null) return false
            if (!audioData.contentEquals(other.audioData)) return false
        } else if (other.audioData != null) return false
        if (imageData != null) {
            if (other.imageData == null) return false
            if (!imageData.contentEquals(other.imageData)) return false
        } else if (other.imageData != null) return false
        if (senderId != other.senderId) return false
        if (senderName != other.senderName) return false
        if (senderProfilePic != other.senderProfilePic) return false
        if (timestamp != other.timestamp) return false
        if (duration != other.duration) return false
        if (isFromCurrentUser != other.isFromCurrentUser) return false
        
        return true
    }
    
    override fun hashCode(): Int {
        var result = id.hashCode()
        result = 31 * result + type.hashCode()
        result = 31 * result + content.hashCode()
        result = 31 * result + (audioData?.contentHashCode() ?: 0)
        result = 31 * result + (imageData?.contentHashCode() ?: 0)
        result = 31 * result + senderId.hashCode()
        result = 31 * result + senderName.hashCode()
        result = 31 * result + (senderProfilePic?.hashCode() ?: 0)
        result = 31 * result + timestamp.hashCode()
        result = 31 * result + duration.hashCode()
        result = 31 * result + isFromCurrentUser.hashCode()
        return result
    }
} 