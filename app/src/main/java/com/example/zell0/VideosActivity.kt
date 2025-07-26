package com.example.zell0

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.asRequestBody
import org.json.JSONArray
import java.io.File
import java.io.IOException

class VideosActivity : AppCompatActivity() {
    private val serverUrl = "https://app--dependable-unity-production.up.railway.app" // Your Railway cloud server
    private val PICK_VIDEO_REQUEST = 1
    private lateinit var adapter: VideoAdapter
    private val videos = mutableListOf<Video>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_videos)

        try {
            val recyclerView = findViewById<RecyclerView>(R.id.videosRecyclerView)
            val uploadButton = findViewById<Button>(R.id.uploadButton)

            adapter = VideoAdapter(videos) { video ->
                try {
                    val intent = Intent(this, VideoPlayerActivity::class.java)
                    intent.putExtra("video_url", video.url)
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Error playing video: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
            recyclerView.layoutManager = LinearLayoutManager(this)
            recyclerView.adapter = adapter

            uploadButton.setOnClickListener {
                try {
                    val intent = Intent(Intent.ACTION_GET_CONTENT)
                    intent.type = "video/*"
                    startActivityForResult(intent, PICK_VIDEO_REQUEST)
                } catch (e: Exception) {
                    Toast.makeText(this, "Error opening file picker: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }

            // Show loading message
            Toast.makeText(this, "Loading videos from server...", Toast.LENGTH_SHORT).show()
            fetchVideos()
        } catch (e: Exception) {
            Toast.makeText(this, "Error initializing videos: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun fetchVideos() {
        try {
            // Show loading state
            runOnUiThread {
                findViewById<android.widget.ProgressBar>(R.id.loadingProgressBar)?.visibility = android.view.View.VISIBLE
            }
            
            val client = OkHttpClient.Builder()
                .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
                .build()
                
            val request = Request.Builder()
                .url("$serverUrl/api/videos")
                .build()
            
            Log.d("VideosActivity", "Fetching videos from: $serverUrl/api/videos")
            
            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    Log.e("VideosActivity", "Network failure: ${e.message}", e)
                    runOnUiThread {
                        findViewById<android.widget.ProgressBar>(R.id.loadingProgressBar)?.visibility = android.view.View.GONE
                        Toast.makeText(this@VideosActivity, "Failed to load videos: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
                override fun onResponse(call: Call, response: Response) {
                    try {
                        Log.d("VideosActivity", "Response code: ${response.code}")
                        
                        response.body?.let { body ->
                            val jsonString = body.string()
                            Log.d("VideosActivity", "Response body: $jsonString")
                            
                            if (jsonString.isNotEmpty()) {
                                val json = JSONArray(jsonString)
                                videos.clear()
                                
                                for (i in 0 until json.length()) {
                                    val videoObj = json.getJSONObject(i)
                                    val filename = videoObj.getString("filename")
                                    val url = "$serverUrl${videoObj.getString("url")}"
                                    val thumbnailUrl = "$serverUrl${videoObj.getString("thumbnailUrl")}"
                                    val size = videoObj.optLong("size", 0)
                                    val modified = videoObj.optString("modified", "")
                                    
                                    videos.add(Video(filename, url, thumbnailUrl))
                                    Log.d("VideosActivity", "Added video: $filename -> $url (${size} bytes)")
                                }
                                
                                runOnUiThread { 
                                    findViewById<android.widget.ProgressBar>(R.id.loadingProgressBar)?.visibility = android.view.View.GONE
                                    adapter.notifyDataSetChanged()
                                    Toast.makeText(this@VideosActivity, "Loaded ${videos.size} videos", Toast.LENGTH_SHORT).show()
                                }
                            } else {
                                Log.d("VideosActivity", "Empty response body")
                                runOnUiThread {
                                    findViewById<android.widget.ProgressBar>(R.id.loadingProgressBar)?.visibility = android.view.View.GONE
                                    Toast.makeText(this@VideosActivity, "No videos found", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Log.e("VideosActivity", "Error parsing response: ${e.message}", e)
                        runOnUiThread {
                            findViewById<android.widget.ProgressBar>(R.id.loadingProgressBar)?.visibility = android.view.View.GONE
                            Toast.makeText(this@VideosActivity, "Error parsing videos: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            })
        } catch (e: Exception) {
            Log.e("VideosActivity", "Error in fetchVideos: ${e.message}", e)
            runOnUiThread {
                findViewById<android.widget.ProgressBar>(R.id.loadingProgressBar)?.visibility = android.view.View.GONE
                Toast.makeText(this@VideosActivity, "Error fetching videos: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == PICK_VIDEO_REQUEST && resultCode == Activity.RESULT_OK) {
            data?.data?.let { uri ->
                uploadVideo(uri)
            }
        }
    }

    private fun uploadVideo(uri: Uri) {
        val file = FileUtil.from(this, uri)
        val client = OkHttpClient()
        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("video", file.name, file.asRequestBody("video/*".toMediaType()))
            .build()
        val request = Request.Builder()
            .url("$serverUrl/api/upload")
            .post(requestBody)
            .build()
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread {
                    Toast.makeText(this@VideosActivity, "Upload failed", Toast.LENGTH_SHORT).show()
                }
            }
            override fun onResponse(call: Call, response: Response) {
                runOnUiThread {
                    Toast.makeText(this@VideosActivity, "Upload successful", Toast.LENGTH_SHORT).show()
                    fetchVideos()
                }
            }
        })
    }
} 