package com.example.zell0

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class UserListAdapter : RecyclerView.Adapter<UserListAdapter.UserViewHolder>() {

    private val users = mutableListOf<ConnectedUser>()

    class UserViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val userProfileImage: ImageView = view.findViewById(R.id.userProfileImage)
        val userName: TextView = view.findViewById(R.id.userName)
        val userStatus: TextView = view.findViewById(R.id.userStatus)
        val connectionIndicator: ImageView = view.findViewById(R.id.connectionIndicator)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UserViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_user, parent, false)
        return UserViewHolder(view)
    }

    override fun onBindViewHolder(holder: UserViewHolder, position: Int) {
        val user = users[position]
        
        Log.d("UserListAdapter", "=== BINDING USER VIEW ===")
        Log.d("UserListAdapter", "Position: $position")
        Log.d("UserListAdapter", "User deviceId: ${user.deviceId}")
        Log.d("UserListAdapter", "User username: '${user.username}'")
        Log.d("UserListAdapter", "User has stats: ${user.hasBattlefieldStats()}")
        
        // Display username with Battlefield stats permanently attached
        if (user.hasBattlefieldStats()) {
            val stats = user.battlefieldStats!!
            Log.d("UserListAdapter", "Stats username: '${stats.username}'")
            Log.d("UserListAdapter", "Stats platform: ${stats.platform}")
            Log.d("UserListAdapter", "Stats rank: ${stats.rank}")
            
            holder.userName.text = stats.getCompactDisplayName()
            holder.userName.setTextColor(0xFFFF6600.toInt()) // Orange for users with stats
            Log.d("UserListAdapter", "✅ Displaying stats for '${user.username}': ${stats.getCompactDisplayName()}")
        } else {
            holder.userName.text = user.username
            holder.userName.setTextColor(0xFFFFFFFF.toInt()) // White for users without stats
            Log.d("UserListAdapter", "❌ No stats for '${user.username}', showing username only")
        }
        
        // Display simple online/offline status
        holder.userStatus.text = if (user.isOnline) "🟢 Online" else "🔴 Offline"
        holder.userStatus.setTextColor(
            if (user.isOnline) 0xFF00FF00.toInt() else 0xFF888888.toInt()
        )
        
        // Set connection indicator
        holder.connectionIndicator.setImageResource(
            if (user.isOnline) R.drawable.ic_signal_connected 
            else R.drawable.ic_signal_disconnected
        )
        
        // Load profile picture (prefer Battlefield avatar if available)
        if (user.battlefieldStats?.avatarUrl != null) {
            // TODO: Load Battlefield avatar from URL
            holder.userProfileImage.setImageResource(R.drawable.ic_person_placeholder)
        } else if (user.profilePicBase64 != null) {
            val bitmap = base64ToBitmap(user.profilePicBase64)
            if (bitmap != null) {
                holder.userProfileImage.setImageBitmap(bitmap)
            } else {
                holder.userProfileImage.setImageResource(R.drawable.ic_person_placeholder)
            }
        } else {
            holder.userProfileImage.setImageResource(R.drawable.ic_person_placeholder)
        }
    }

    override fun getItemCount(): Int = users.size

    fun updateUsers(newUsers: List<ConnectedUser>) {
        Log.d("UserListAdapter", "=== UPDATE USERS ===")
        Log.d("UserListAdapter", "New users count: ${newUsers.size}")
        
        users.clear()
        users.addAll(newUsers)
        
        Log.d("UserListAdapter", "Users list updated, total users: ${users.size}")
        for (user in users) {
            Log.d("UserListAdapter", "User in list: '${user.username}' (${user.deviceId}) - has stats: ${user.hasBattlefieldStats()}")
        }
        
        // Force UI update
        notifyDataSetChanged()
        
        // If no users are showing, log a warning
        if (users.isEmpty()) {
            Log.w("UserListAdapter", "⚠️ No users in the list after update!")
        } else {
            Log.d("UserListAdapter", "✅ Successfully updated user list with ${users.size} users")
        }
    }

    fun addUser(user: ConnectedUser) {
        val existingIndex = users.indexOfFirst { it.deviceId == user.deviceId }
        if (existingIndex != -1) {
            users[existingIndex] = user
            notifyItemChanged(existingIndex)
        } else {
            users.add(user)
            notifyItemInserted(users.size - 1)
        }
    }

    fun removeUser(deviceId: String) {
        val index = users.indexOfFirst { it.deviceId == deviceId }
        if (index != -1) {
            users.removeAt(index)
            notifyItemRemoved(index)
        }
    }
    
    fun updateUserWithStats(updatedUser: ConnectedUser) {
        Log.d("UserListAdapter", "=== UPDATE USER WITH STATS ===")
        Log.d("UserListAdapter", "Updated user deviceId: ${updatedUser.deviceId}")
        Log.d("UserListAdapter", "Updated user username: '${updatedUser.username}'")
        Log.d("UserListAdapter", "Updated user has stats: ${updatedUser.hasBattlefieldStats()}")
        
        if (updatedUser.hasBattlefieldStats()) {
            val stats = updatedUser.battlefieldStats!!
            Log.d("UserListAdapter", "Stats username: '${stats.username}'")
            Log.d("UserListAdapter", "Stats platform: ${stats.platform}")
        }
        
        val index = users.indexOfFirst { it.deviceId == updatedUser.deviceId }
        if (index != -1) {
            Log.d("UserListAdapter", "✅ Found user at index $index, updating...")
            val oldUser = users[index]
            Log.d("UserListAdapter", "Old user username: '${oldUser.username}'")
            Log.d("UserListAdapter", "Old user has stats: ${oldUser.hasBattlefieldStats()}")
            
            users[index] = updatedUser
            notifyItemChanged(index)
            Log.d("UserListAdapter", "✅ Updated user '${updatedUser.username}' with stats: ${updatedUser.hasBattlefieldStats()}")
        } else {
            Log.w("UserListAdapter", "❌ User '${updatedUser.username}' not found in list for stats update")
            Log.d("UserListAdapter", "Current users in list:")
            users.forEachIndexed { i, user ->
                Log.d("UserListAdapter", "  [$i] ${user.username} (${user.deviceId})")
            }
        }
    }

    fun getUserCount(): Int = users.size

    private fun base64ToBitmap(base64String: String): Bitmap? {
        return try {
            val bytes = Base64.decode(base64String, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        } catch (e: Exception) {
            Log.e("UserListAdapter", "Error converting Base64 to bitmap", e)
            null
        }
    }
    

} 