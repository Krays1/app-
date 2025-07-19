package com.example.zell0

import android.content.Context
import android.net.Uri
import java.io.File
import java.io.FileOutputStream

object FileUtil {
    fun from(context: Context, uri: Uri): File {
        val inputStream = context.contentResolver.openInputStream(uri)
        val file = File(context.cacheDir, "upload_${System.currentTimeMillis()}")
        val outputStream = FileOutputStream(file)
        inputStream?.copyTo(outputStream)
        inputStream?.close()
        outputStream.close()
        return file
    }
} 