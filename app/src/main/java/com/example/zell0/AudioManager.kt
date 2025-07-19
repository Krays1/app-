package com.example.zell0

import android.content.Context
import android.media.AudioFormat
import android.media.AudioManager as AndroidAudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.isActive
import java.io.ByteArrayOutputStream
import java.io.IOException

class AudioManager(private val context: Context) {
    
    companion object {
        private const val TAG = "AudioManager"
        private const val DEFAULT_SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }
    
    private var audioRecord: AudioRecord? = null
    private var audioTrack: AudioTrack? = null
    private var isRecording = false
    private var recordingJob: Job? = null
    private var recordingData = ByteArrayOutputStream()
    
    // Live streaming properties
    private var liveStreamingAudioRecord: AudioRecord? = null
    private var isLiveStreaming = false
    private var liveStreamingJob: Job? = null
    private var liveStreamingCallback: ((ByteArray) -> Unit)? = null
    
    // Live audio playback properties
    private var livePlaybackAudioTrack: AudioTrack? = null
    private var isLivePlaybackActive = false
    
    // Microphone settings
    private var microphoneSettings: MicrophoneSettings = MicrophoneSettings()
    private var currentSampleRate = DEFAULT_SAMPLE_RATE
    private var bufferSize = 0
    
    interface AudioRecordingListener {
        fun onRecordingStarted()
        fun onRecordingStopped(audioData: ByteArray)
        fun onRecordingError(error: String)
        fun onAudioLevel(level: Int)
    }
    
    interface AudioPlaybackListener {
        fun onPlaybackStarted()
        fun onPlaybackStopped()
        fun onPlaybackError(error: String)
    }
    
    private var recordingListener: AudioRecordingListener? = null
    private var playbackListener: AudioPlaybackListener? = null
    
    init {
        updateSampleRateAndBuffer()
    }
    
    fun setRecordingListener(listener: AudioRecordingListener) {
        recordingListener = listener
    }
    
    fun setPlaybackListener(listener: AudioPlaybackListener) {
        playbackListener = listener
    }
    
    fun updateMicrophoneSettings(settings: MicrophoneSettings) {
        microphoneSettings = settings
        updateSampleRateAndBuffer()
        Log.d(TAG, "Microphone settings updated: source=${settings.selectedMicrophoneSource}, " +
                "volume=${settings.inputVolume}%, sensitivity=${settings.sensitivity}%, " +
                "quality=${settings.audioQuality}")
    }
    
    private fun updateSampleRateAndBuffer() {
        currentSampleRate = microphoneSettings.audioQuality.sampleRate
        bufferSize = AudioRecord.getMinBufferSize(currentSampleRate, CHANNEL_CONFIG, AUDIO_FORMAT)
        
        // Ensure buffer size is valid
        if (bufferSize == AudioRecord.ERROR || bufferSize == AudioRecord.ERROR_BAD_VALUE) {
            Log.w(TAG, "Invalid buffer size, falling back to default")
            currentSampleRate = DEFAULT_SAMPLE_RATE
            bufferSize = AudioRecord.getMinBufferSize(currentSampleRate, CHANNEL_CONFIG, AUDIO_FORMAT)
        }
    }
    
    fun startRecording() {
        if (isRecording) return
        
        try {
            // Update sample rate and buffer size based on current settings
            updateSampleRateAndBuffer()
            
            audioRecord = AudioRecord(
                microphoneSettings.selectedMicrophoneSource,
                currentSampleRate,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize * 2 // Use larger buffer for better quality
            )
            
            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord initialization failed")
                recordingListener?.onRecordingError("AudioRecord initialization failed")
                return
            }
            
            recordingData.reset()
            audioRecord?.startRecording()
            isRecording = true
            
            recordingListener?.onRecordingStarted()
            
            recordingJob = CoroutineScope(Dispatchers.IO).launch {
                val buffer = ByteArray(bufferSize)
                
                while (isActive && isRecording) {
                    val bytesRead = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    
                    if (bytesRead > 0) {
                        // Apply volume and sensitivity adjustments
                        val adjustedBuffer = applyVolumeAndSensitivity(buffer, bytesRead)
                        recordingData.write(adjustedBuffer, 0, bytesRead)
                        
                        // Calculate audio level for visualization
                        val level = calculateAudioLevel(adjustedBuffer, bytesRead)
                        recordingListener?.onAudioLevel(level)
                    }
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting recording", e)
            recordingListener?.onRecordingError("Failed to start recording: ${e.message}")
        }
    }
    
    private fun applyVolumeAndSensitivity(buffer: ByteArray, bytesRead: Int): ByteArray {
        val adjustedBuffer = ByteArray(bytesRead)
        val volumeMultiplier = microphoneSettings.getVolumeMultiplier()
        val sensitivityMultiplier = microphoneSettings.getSensitivityMultiplier()
        val combinedMultiplier = volumeMultiplier * (0.5f + sensitivityMultiplier * 0.5f)
        
        for (i in 0 until bytesRead step 2) {
            // Convert bytes to 16-bit sample
            var sample = ((buffer[i + 1].toInt() and 0xFF) shl 8) or (buffer[i].toInt() and 0xFF)
            if (sample > 32767) sample -= 65536 // Convert to signed
            
            // Apply volume and sensitivity adjustment
            sample = (sample * combinedMultiplier).toInt()
            
            // Clamp to 16-bit range
            sample = sample.coerceIn(-32768, 32767)
            
            // Convert back to bytes
            adjustedBuffer[i] = (sample and 0xFF).toByte()
            adjustedBuffer[i + 1] = ((sample shr 8) and 0xFF).toByte()
        }
        
        return adjustedBuffer
    }
    
    fun stopRecording() {
        if (!isRecording) return
        
        isRecording = false
        recordingJob?.cancel()
        
        try {
            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            
            val audioData = recordingData.toByteArray()
            recordingListener?.onRecordingStopped(audioData)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping recording", e)
            recordingListener?.onRecordingError("Failed to stop recording: ${e.message}")
        }
    }
    
    fun playAudio(audioData: ByteArray) {
        try {
            // Use the same sample rate that was used for recording
            val playbackSampleRate = currentSampleRate
            val minBufferSize = AudioTrack.getMinBufferSize(
                playbackSampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AUDIO_FORMAT
            )
            
            audioTrack = AudioTrack(
                AndroidAudioManager.STREAM_MUSIC,
                playbackSampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AUDIO_FORMAT,
                minBufferSize,
                AudioTrack.MODE_STREAM
            )
            
            audioTrack?.play()
            playbackListener?.onPlaybackStarted()
            
            CoroutineScope(Dispatchers.IO).launch {
                audioTrack?.write(audioData, 0, audioData.size)
                audioTrack?.stop()
                audioTrack?.release()
                audioTrack = null
                
                playbackListener?.onPlaybackStopped()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error playing audio", e)
            playbackListener?.onPlaybackError("Failed to play audio: ${e.message}")
        }
    }
    
    fun stopPlayback() {
        try {
            audioTrack?.stop()
            audioTrack?.release()
            audioTrack = null
            playbackListener?.onPlaybackStopped()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping playback", e)
            playbackListener?.onPlaybackError("Failed to stop playback: ${e.message}")
        }
    }
    
    private fun calculateAudioLevel(buffer: ByteArray, bytesRead: Int): Int {
        var sum = 0L
        for (i in 0 until bytesRead step 2) {
            var sample = ((buffer[i + 1].toInt() and 0xFF) shl 8) or (buffer[i].toInt() and 0xFF)
            if (sample > 32767) sample -= 65536 // Convert to signed
            sum += sample * sample
        }
        val rms = Math.sqrt(sum.toDouble() / (bytesRead / 2))
        return (rms / 327.67).toInt().coerceIn(0, 100)
    }
    
    fun getCurrentSampleRate(): Int = currentSampleRate
    
    fun isRecording(): Boolean = isRecording
    
    fun startLiveStreaming(callback: (ByteArray) -> Unit) {
        if (isLiveStreaming) {
            Log.d(TAG, "Live streaming already active")
            return
        }
        
        Log.d(TAG, "Starting live streaming...")
        liveStreamingCallback = callback
        
        try {
            updateSampleRateAndBuffer()
            Log.d(TAG, "Live streaming buffer size: $bufferSize, sample rate: $currentSampleRate")
            
            liveStreamingAudioRecord = AudioRecord(
                microphoneSettings.selectedMicrophoneSource,
                currentSampleRate,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize * 2
            )
            
            if (liveStreamingAudioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "Live streaming AudioRecord initialization failed, state: ${liveStreamingAudioRecord?.state}")
                return
            }
            
            liveStreamingAudioRecord?.startRecording()
            isLiveStreaming = true
            Log.d(TAG, "Live streaming AudioRecord started")
            
            liveStreamingJob = CoroutineScope(Dispatchers.IO).launch {
                val chunkSize = bufferSize / 4 // Smaller chunks for real-time streaming
                val buffer = ByteArray(chunkSize)
                Log.d(TAG, "Live streaming loop started, chunk size: $chunkSize")
                
                while (isActive && isLiveStreaming) {
                    val bytesRead = liveStreamingAudioRecord?.read(buffer, 0, buffer.size) ?: 0
                    
                    if (bytesRead > 0) {
                        // Apply volume and sensitivity adjustments
                        val adjustedBuffer = applyVolumeAndSensitivity(buffer, bytesRead)
                        
                        // Send audio chunk to callback
                        Log.d(TAG, "Live streaming: captured ${bytesRead} bytes, sending to callback")
                        liveStreamingCallback?.invoke(adjustedBuffer.copyOf(bytesRead))
                    } else {
                        Log.w(TAG, "Live streaming: no bytes read ($bytesRead)")
                    }
                }
                Log.d(TAG, "Live streaming loop ended")
            }
            
            Log.d(TAG, "Live audio streaming started successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting live streaming", e)
            stopLiveStreaming()
        }
    }
    
    fun stopLiveStreaming() {
        if (!isLiveStreaming) {
            Log.d(TAG, "Live streaming not active, nothing to stop")
            return
        }
        
        Log.d(TAG, "Stopping live streaming...")
        isLiveStreaming = false
        liveStreamingJob?.cancel()
        
        try {
            liveStreamingAudioRecord?.stop()
            liveStreamingAudioRecord?.release()
            liveStreamingAudioRecord = null
            liveStreamingCallback = null
            
            Log.d(TAG, "Live audio streaming stopped successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping live streaming", e)
        }
    }
    
    fun isLiveStreaming(): Boolean = isLiveStreaming
    
    fun startLivePlayback() {
        if (isLivePlaybackActive) {
            Log.d(TAG, "Live playback already active")
            return
        }
        
        try {
            Log.d(TAG, "Starting live playback...")
            
            // Use the same sample rate that was used for recording
            val playbackSampleRate = currentSampleRate
            val minBufferSize = AudioTrack.getMinBufferSize(
                playbackSampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AUDIO_FORMAT
            )
            
            livePlaybackAudioTrack = AudioTrack(
                AndroidAudioManager.STREAM_MUSIC,
                playbackSampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AUDIO_FORMAT,
                minBufferSize * 2, // Larger buffer for streaming
                AudioTrack.MODE_STREAM
            )
            
            if (livePlaybackAudioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                Log.e(TAG, "Live playback AudioTrack initialization failed")
                return
            }
            
            livePlaybackAudioTrack?.play()
            isLivePlaybackActive = true
            Log.d(TAG, "Live playback started successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting live playback", e)
            stopLivePlayback()
        }
    }
    
    fun stopLivePlayback() {
        if (!isLivePlaybackActive) {
            Log.d(TAG, "Live playback not active, nothing to stop")
            return
        }
        
        try {
            Log.d(TAG, "Stopping live playback...")
            isLivePlaybackActive = false
            
            livePlaybackAudioTrack?.stop()
            livePlaybackAudioTrack?.release()
            livePlaybackAudioTrack = null
            
            Log.d(TAG, "Live playback stopped successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping live playback", e)
        }
    }
    
    fun playLiveAudioChunk(audioData: ByteArray) {
        if (!isLivePlaybackActive) {
            Log.d(TAG, "Starting live playback for incoming chunk")
            startLivePlayback()
        }
        
        try {
            if (livePlaybackAudioTrack?.state == AudioTrack.STATE_INITIALIZED) {
                val bytesWritten = livePlaybackAudioTrack?.write(audioData, 0, audioData.size) ?: 0
                Log.d(TAG, "Live playback: wrote ${bytesWritten}/${audioData.size} bytes")
            } else {
                Log.w(TAG, "Live playback AudioTrack not initialized")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error playing live audio chunk", e)
        }
    }
    
    fun isLivePlaybackActive(): Boolean = isLivePlaybackActive
    
    fun cleanup() {
        stopRecording()
        stopPlayback()
        stopLiveStreaming()
        stopLivePlayback()
    }
} 