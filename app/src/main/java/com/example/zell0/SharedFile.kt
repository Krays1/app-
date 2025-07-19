package com.example.zell0

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class SharedFile(
    val id: String,
    val name: String,
    val type: String,
    val size: Long,
    val uploadedBy: String,
    val uploadedAt: String
) {
    fun getFormattedSize(): String {
        val kb = size / 1024.0
        val mb = kb / 1024.0
        val gb = mb / 1024.0
        
        return when {
            gb >= 1.0 -> String.format("%.1f GB", gb)
            mb >= 1.0 -> String.format("%.1f MB", mb)
            kb >= 1.0 -> String.format("%.1f KB", kb)
            else -> "$size B"
        }
    }
    
    fun getFormattedDate(): String {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            val date = sdf.parse(uploadedAt)
            val displayFormat = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
            displayFormat.format(date ?: Date())
        } catch (e: Exception) {
            uploadedAt
        }
    }
    
    fun getFileExtension(): String {
        return name.substringAfterLast('.', "").lowercase()
    }
    
    fun getFileIcon(): String {
        return when (getFileExtension()) {
            "jpg", "jpeg", "png", "gif", "bmp" -> "🖼️"
            "mp4", "avi", "mov", "mkv" -> "🎥"
            "mp3", "wav", "flac", "m4a" -> "🎵"
            "pdf" -> "📄"
            "doc", "docx" -> "📝"
            "xls", "xlsx" -> "📊"
            "ppt", "pptx" -> "📎"
            "zip", "rar", "7z" -> "📦"
            "txt" -> "📃"
            "apk" -> "📱"
            else -> "��"
        }
    }
} 