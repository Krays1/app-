package com.example.zell0

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide

class VideoAdapter(
    private val videos: List<Video>,
    private val onClick: (Video) -> Unit
) : RecyclerView.Adapter<VideoAdapter.VideoViewHolder>() {

    class VideoViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val thumbnail: ImageView = view.findViewById(R.id.videoThumbnail)
        val title: TextView = view.findViewById(R.id.videoTitle)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VideoViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_video, parent, false)
        return VideoViewHolder(view)
    }

    override fun onBindViewHolder(holder: VideoViewHolder, position: Int) {
        val video = videos[position]
        holder.title.text = video.filename
        
        // Load thumbnail first, then fallback to video URL
        if (video.thumbnailUrl.isNotEmpty()) {
            Glide.with(holder.thumbnail.context)
                .load(video.thumbnailUrl)
                .placeholder(android.R.drawable.ic_media_play)
                .error(android.R.drawable.ic_media_play)
                .into(holder.thumbnail)
        } else {
            // Fallback to video URL with thumbnail generation
            Glide.with(holder.thumbnail.context)
                .load(video.url)
                .placeholder(android.R.drawable.ic_media_play)
                .error(android.R.drawable.ic_media_play)
                .thumbnail(0.1f)
                .into(holder.thumbnail)
        }
        
        holder.itemView.setOnClickListener { onClick(video) }
    }

    override fun getItemCount() = videos.size
} 