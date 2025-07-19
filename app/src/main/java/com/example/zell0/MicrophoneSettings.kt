package com.example.zell0

import android.content.Context
import android.content.SharedPreferences
import android.media.MediaRecorder

data class MicrophoneSettings(
    val selectedMicrophoneSource: Int = MediaRecorder.AudioSource.MIC,
    val inputVolume: Int = 80,        // 0-100%
    val sensitivity: Int = 50,        // 0-100%
    val audioQuality: AudioQuality = AudioQuality.LOW  // Changed to LOW for better performance
) {
    
    enum class AudioQuality(val sampleRate: Int, val displayName: String) {
        LOW(8000, "Low (8kHz)"),
        MEDIUM(16000, "Medium (16kHz)"),
        HIGH(44100, "High (44kHz)")
    }

    companion object {
        private const val PREFS_NAME = "MicrophoneSettings"
        private const val KEY_MIC_SOURCE = "mic_source"
        private const val KEY_INPUT_VOLUME = "input_volume"
        private const val KEY_SENSITIVITY = "sensitivity"
        private const val KEY_AUDIO_QUALITY = "audio_quality"

        fun load(context: Context): MicrophoneSettings {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return MicrophoneSettings(
                selectedMicrophoneSource = prefs.getInt(KEY_MIC_SOURCE, MediaRecorder.AudioSource.MIC),
                inputVolume = prefs.getInt(KEY_INPUT_VOLUME, 80),
                sensitivity = prefs.getInt(KEY_SENSITIVITY, 50),
                audioQuality = AudioQuality.values()[prefs.getInt(KEY_AUDIO_QUALITY, AudioQuality.LOW.ordinal)]
            )
        }

        fun save(context: Context, settings: MicrophoneSettings) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().apply {
                putInt(KEY_MIC_SOURCE, settings.selectedMicrophoneSource)
                putInt(KEY_INPUT_VOLUME, settings.inputVolume)
                putInt(KEY_SENSITIVITY, settings.sensitivity)
                putInt(KEY_AUDIO_QUALITY, settings.audioQuality.ordinal)
                apply()
            }
        }

        fun reset(): MicrophoneSettings {
            return MicrophoneSettings()
        }
    }

    fun getVolumeMultiplier(): Float {
        return inputVolume / 100f
    }

    fun getSensitivityMultiplier(): Float {
        return sensitivity / 100f
    }
} 