package com.example.zell0

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class MessageAdapter(
    private val messages: MutableList<Message>,
    private val onAudioPlayClick: (Message) -> Unit
) : RecyclerView.Adapter<MessageAdapter.MessageViewHolder>() {
    
    class MessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val sentMessageLayout: LinearLayout = itemView.findViewById(R.id.sentMessageLayout)
        val receivedMessageLayout: LinearLayout = itemView.findViewById(R.id.receivedMessageLayout)
        val audioMessageLayout: LinearLayout = itemView.findViewById(R.id.audioMessageLayout)
        
        val sentMessage: TextView = itemView.findViewById(R.id.sentMessage)
        val sentProfilePic: ImageView = itemView.findViewById(R.id.sentProfilePic)
        
        val receivedMessage: TextView = itemView.findViewById(R.id.receivedMessage)
        val receivedProfilePic: ImageView = itemView.findViewById(R.id.receivedProfilePic)
        val receivedSenderName: TextView = itemView.findViewById(R.id.receivedSenderName)
        
        val playButton: ImageButton = itemView.findViewById(R.id.playButton)
        val audioSenderName: TextView = itemView.findViewById(R.id.audioSenderName)
        val audioDuration: TextView = itemView.findViewById(R.id.audioDuration)
        val audioProfilePic: ImageView = itemView.findViewById(R.id.audioProfilePic)
        
        val messageTimestamp: TextView = itemView.findViewById(R.id.messageTimestamp)
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_message, parent, false)
        return MessageViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        val message = messages[position]
        
        // Hide all layouts first
        holder.sentMessageLayout.visibility = View.GONE
        holder.receivedMessageLayout.visibility = View.GONE
        holder.audioMessageLayout.visibility = View.GONE
        
        when (message.type) {
            Message.MessageType.TEXT -> {
                if (message.isFromCurrentUser) {
                    holder.sentMessageLayout.visibility = View.VISIBLE
                    holder.sentMessage.text = message.content
                    loadProfilePicture(holder.sentProfilePic, message.senderProfilePic)
                } else {
                    holder.receivedMessageLayout.visibility = View.VISIBLE
                    holder.receivedMessage.text = message.content
                    holder.receivedSenderName.text = message.senderName
                    loadProfilePicture(holder.receivedProfilePic, message.senderProfilePic)
                }
            }
            
            Message.MessageType.AUDIO -> {
                holder.audioMessageLayout.visibility = View.VISIBLE
                holder.audioSenderName.text = if (message.isFromCurrentUser) {
                    "You"
                } else {
                    message.senderName
                }
                holder.audioDuration.text = message.getFormattedDuration()
                
                // Load profile picture for audio message
                loadProfilePicture(holder.audioProfilePic, message.senderProfilePic)
                
                holder.playButton.setOnClickListener {
                    onAudioPlayClick(message)
                }
            }
            
            Message.MessageType.IMAGE -> {
                if (message.isFromCurrentUser) {
                    holder.sentMessageLayout.visibility = View.VISIBLE
                    holder.sentMessage.text = "📷 Photo"
                    loadProfilePicture(holder.sentProfilePic, message.senderProfilePic)
                } else {
                    holder.receivedMessageLayout.visibility = View.VISIBLE
                    holder.receivedMessage.text = "📷 Photo"
                    holder.receivedSenderName.text = message.senderName
                    loadProfilePicture(holder.receivedProfilePic, message.senderProfilePic)
                }
            }
            

        }
        
        holder.messageTimestamp.text = message.getFormattedTimestamp()
    }
    
    override fun getItemCount(): Int = messages.size
    
    fun addMessage(message: Message) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }
    
    fun clearMessages() {
        messages.clear()
        notifyDataSetChanged()
    }
    
    fun getMessages(): List<Message> = messages.toList()
    
    private fun loadProfilePicture(imageView: ImageView, base64String: String?) {
        if (base64String.isNullOrEmpty()) {
            // Use default placeholder
            imageView.setImageResource(R.drawable.ic_person_placeholder)
        } else {
            try {
                val bitmap = base64ToBitmap(base64String)
                if (bitmap != null) {
                    imageView.setImageBitmap(bitmap)
                } else {
                    imageView.setImageResource(R.drawable.ic_person_placeholder)
                }
            } catch (e: Exception) {
                // Fallback to placeholder on error
                imageView.setImageResource(R.drawable.ic_person_placeholder)
            }
        }
    }
    
    private fun base64ToBitmap(base64String: String): Bitmap? {
        return try {
            val bytes = Base64.decode(base64String, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        } catch (e: Exception) {
            null
        }
    }
} 