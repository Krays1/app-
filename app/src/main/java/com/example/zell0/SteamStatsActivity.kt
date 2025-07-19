package com.example.zell0

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import android.os.Handler
import android.os.Looper
import android.widget.ImageButton
import android.widget.ImageView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.graphics.BitmapFactory
import android.graphics.Bitmap
import android.util.Base64
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.URL

class SteamStatsActivity : AppCompatActivity() {
    private val handler = Handler(Looper.getMainLooper())
    private var pollRunnable: Runnable? = null
    private var lastUserStatsCount = 0
    
    // UI references
    private lateinit var contentLayout: LinearLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_steam_stats)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Steam Profile Stats"

        contentLayout = findViewById<LinearLayout>(R.id.contentLayout)
        progressBar = findViewById<ProgressBar>(R.id.progressBar)
        errorText = findViewById<TextView>(R.id.errorText)

        // Refresh button setup
        val btnRefresh = findViewById<ImageButton>(R.id.btnRefreshStats)
        btnRefresh.setOnClickListener {
            forceRefreshAllStats()
        }

        // Initial load from intent (may be empty)
        try {
            val initialUsersWithStats = (intent.getSerializableExtra("usersWithStats") as? ArrayList<ConnectedUser>)?.filter { it.steamStats != null } ?: emptyList()
            lastUserStatsCount = initialUsersWithStats.size
            android.util.Log.d("SteamStatsActivity", "Initial load: ${initialUsersWithStats.size} users with Steam stats")
            updateStatsUI(initialUsersWithStats)
            if (lastUserStatsCount == 0) progressBar.visibility = View.VISIBLE
        } catch (e: Exception) {
            android.util.Log.e("SteamStatsActivity", "Error loading initial users: ${e.message}", e)
            progressBar.visibility = View.VISIBLE
            errorText.visibility = View.VISIBLE
            contentLayout.visibility = View.GONE
        }

        // Start polling for updates (but don't auto-refresh on every poll to avoid API spam)
        pollRunnable = object : Runnable {
            override fun run() {
                try {
                    val latestUsers = com.example.zell0.MainActivity.getLatestUserList()
                    // Show ALL users who have Steam stats (not just online ones)
                    val usersWithStats = latestUsers.filter { it.steamStats != null }
                    
                    // Debug logging
                    android.util.Log.d("SteamStatsActivity", "Polling: ${latestUsers.size} total users, ${usersWithStats.size} with Steam stats")
                    for (user in latestUsers) {
                        android.util.Log.d("SteamStatsActivity", "User: ${user.username}, isOnline: ${user.isOnline}, hasSteamStats: ${user.steamStats != null}")
                        if (user.steamStats != null) {
                            android.util.Log.d("SteamStatsActivity", "  Steam stats for ${user.username}: ${user.steamStats.getFormattedStats()}")
                        }
                    }
                    
                    // Only update UI if we have users with stats (don't auto-refresh on every poll)
                    if (usersWithStats.isNotEmpty()) {
                        updateStatsUI(usersWithStats)
                    }
                    
                    // If we have more users with stats than before, show a brief message
                    if (usersWithStats.size > lastUserStatsCount && lastUserStatsCount > 0) {
                        android.widget.Toast.makeText(this@SteamStatsActivity, 
                            "Found ${usersWithStats.size - lastUserStatsCount} more users with Steam stats!", 
                            android.widget.Toast.LENGTH_SHORT).show()
                    }
                    lastUserStatsCount = usersWithStats.size
                    
                } catch (e: Exception) {
                    android.util.Log.e("SteamStatsActivity", "Error in polling: ${e.message}", e)
                    // Don't crash the polling, just log the error
                }
                
                handler.postDelayed(this, 5000) // Poll every 5 seconds (less frequent to avoid API spam)
            }
        }
        handler.post(pollRunnable!!)

        // Auto-refresh Steam stats for all users when entering the screen
        forceRefreshAllStats()
    }

    private fun updateStatsUI(usersWithStats: List<ConnectedUser>) {
        android.util.Log.d("SteamStatsActivity", "updateStatsUI called with ${usersWithStats.size} users")
        contentLayout.removeAllViews()
        
        var addedCard = false
        for (user in usersWithStats) {
            try {
                if (user.steamStats != null) {
                    android.util.Log.d("SteamStatsActivity", "Creating Steam stats card for user: ${user.username}")
                    
                    // Create the main Steam stats card
                    val card = createSteamStatsCard(user)
                    // Add margin to card for separation
                    val params = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    params.setMargins(0, 0, 0, 32)
                    card.layoutParams = params
                    contentLayout.addView(card)
                    addedCard = true
                    android.util.Log.d("SteamStatsActivity", "Successfully added Steam stats card for ${user.username}")
                } else {
                    android.util.Log.w("SteamStatsActivity", "User ${user.username} has no steamStats despite being in filtered list")
                }
            } catch (e: Exception) {
                android.util.Log.e("SteamStatsActivity", "Error creating Steam stats card for ${user.username}: ${e.message}", e)
                android.widget.Toast.makeText(this, "Error creating Steam card for ${user.username}: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
            }
        }
        
        android.util.Log.d("SteamStatsActivity", "updateStatsUI completed: addedCard=$addedCard")
        if (addedCard) {
            progressBar.visibility = View.GONE
            contentLayout.visibility = View.VISIBLE
            errorText.visibility = View.GONE
            android.util.Log.d("SteamStatsActivity", "Showing content layout")
        } else {
            progressBar.visibility = View.GONE
            contentLayout.visibility = View.GONE
            errorText.visibility = View.VISIBLE
            android.util.Log.d("SteamStatsActivity", "No Steam stats found, showing error text")
            android.widget.Toast.makeText(this, "No Steam stats found for any users", android.widget.Toast.LENGTH_LONG).show()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        pollRunnable?.let { handler.removeCallbacks(it) }
    }
    
    private fun forceRefreshAllStats() {
        android.util.Log.d("SteamStatsActivity", "=== FORCE REFRESHING ALL STEAM STATS ===")
        android.widget.Toast.makeText(this, "Refreshing all Steam stats...", android.widget.Toast.LENGTH_SHORT).show()
        
        // Show progress bar while refreshing
        progressBar.visibility = android.view.View.VISIBLE
        contentLayout.visibility = android.view.View.GONE
        errorText.visibility = android.view.View.GONE
        
        // Fetch Steam stats for ALL mapped users (not just connected ones)
        fetchAllMappedUsersSteamStats()
    }
    
    private fun fetchAllMappedUsersSteamStats() {
        android.util.Log.d("SteamStatsActivity", "=== FETCHING STEAM STATS FOR ALL MAPPED USERS ===")
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val steamAPI = SteamStatsManager(this@SteamStatsActivity)
                
                // Get all Steam ID mappings (both stored and hardcoded)
                val storedMappings = steamAPI.getSteamIdMappings()
                val allMappedUsernames = mutableSetOf<String>()
                
                // Add stored mappings
                allMappedUsernames.addAll(storedMappings.keys)
                
                // Add hardcoded mappings (krays1, Abbhi, bzar81314, LilMissClo, etc.)
                allMappedUsernames.addAll(listOf("krays1", "Abbhi", "bzar81314", "LilMissClo", "player2", "test"))
                
                android.util.Log.d("SteamStatsActivity", "Found ${allMappedUsernames.size} mapped usernames: ${allMappedUsernames.joinToString(", ")}")
                
                // Get current connected users first
                val currentConnectedUsers = com.example.zell0.MainActivity.getLatestUserList()
                val connectedUsernames = currentConnectedUsers.map { it.username }.toSet()
                
                android.util.Log.d("SteamStatsActivity", "Current connected users: ${connectedUsernames.joinToString(", ")}")
                
                val allUsersWithStats = mutableListOf<ConnectedUser>()
                
                // First, add all connected users who already have Steam stats
                for (connectedUser in currentConnectedUsers) {
                    if (connectedUser.steamStats != null) {
                        allUsersWithStats.add(connectedUser)
                        android.util.Log.d("SteamStatsActivity", "Added connected user with existing stats: ${connectedUser.username}")
                    }
                }
                
                // Then fetch stats for ALL mapped users (including connected ones who might not have stats yet)
                for (username in allMappedUsernames) {
                    // Check if this user is already connected and has stats
                    val connectedUser = currentConnectedUsers.find { it.username == username }
                    if (connectedUser != null && connectedUser.steamStats != null) {
                        android.util.Log.d("SteamStatsActivity", "Skipping $username - already connected with existing stats")
                        continue
                    }
                    
                    try {
                        android.util.Log.d("SteamStatsActivity", "Fetching Steam stats for mapped user: $username")
                        val stats = steamAPI.getPlayerStats(username)
                        
                        if (stats != null) {
                            android.util.Log.d("SteamStatsActivity", "✅ Found Steam stats for '$username': ${stats.getFormattedStats()}")
                            
                            // Check if this user is currently connected
                            val connectedUser = currentConnectedUsers.find { it.username == username }
                            if (connectedUser != null) {
                                // User is connected - update their existing object with Steam stats
                                val updatedConnectedUser = connectedUser.copy(steamStats = stats)
                                allUsersWithStats.add(updatedConnectedUser)
                                android.util.Log.d("SteamStatsActivity", "Updated connected user $username with Steam stats")
                            } else {
                                // User is not connected - create a mapped user object
                                val mappedUser = ConnectedUser(
                                    deviceId = "mapped_$username", // Use a special device ID for mapped users
                                    username = username,
                                    isOnline = false, // These users are not necessarily online
                                    profilePicBase64 = null,
                                    battlefieldStats = null,
                                    steamStats = stats
                                )
                                allUsersWithStats.add(mappedUser)
                                android.util.Log.d("SteamStatsActivity", "Added mapped user $username with Steam stats")
                            }
                            
                            // Update UI on main thread with combined list
                            runOnUiThread {
                                android.util.Log.d("SteamStatsActivity", "Adding Steam stats for mapped user: $username")
                                updateStatsUI(allUsersWithStats)
                            }
                        } else {
                            android.util.Log.d("SteamStatsActivity", "❌ No Steam stats found for mapped user: $username")
                        }
                        
                        // Small delay between requests to avoid overwhelming the API
                        kotlinx.coroutines.delay(300)
                        
                    } catch (e: Exception) {
                        android.util.Log.e("SteamStatsActivity", "Error fetching Steam stats for '$username': ${e.message}", e)
                    }
                }
                
                runOnUiThread {
                    if (allUsersWithStats.isNotEmpty()) {
                        android.util.Log.d("SteamStatsActivity", "Successfully fetched Steam stats for ${allUsersWithStats.size} total users")
                        android.widget.Toast.makeText(this@SteamStatsActivity, 
                            "Found Steam stats for ${allUsersWithStats.size} users", 
                            android.widget.Toast.LENGTH_SHORT).show()
                    } else {
                        android.util.Log.d("SteamStatsActivity", "No Steam stats found for any users")
                        android.widget.Toast.makeText(this@SteamStatsActivity, 
                            "No Steam stats found for any users", 
                            android.widget.Toast.LENGTH_SHORT).show()
                    }
                }
                
            } catch (e: Exception) {
                android.util.Log.e("SteamStatsActivity", "Error in fetchAllMappedUsersSteamStats: ${e.message}", e)
                runOnUiThread {
                    android.widget.Toast.makeText(this@SteamStatsActivity, 
                        "Error fetching Steam stats: ${e.message}", 
                        android.widget.Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun createSteamStatsCard(user: ConnectedUser): View {
        if (user.steamStats == null) throw IllegalArgumentException("User has no steamStats")
        val inflater = LayoutInflater.from(this)
        val card = inflater.inflate(R.layout.steam_stats_card, null) as androidx.cardview.widget.CardView

        try {
            val nameText = card.findViewById<TextView>(R.id.steam_card_playerName)
            val statusText = card.findViewById<TextView>(R.id.steam_card_status)
            val avatarView = card.findViewById<ImageView>(R.id.steam_card_avatar)
            val lastOnlineText = card.findViewById<TextView>(R.id.steam_card_lastOnline)
            val totalGamesText = card.findViewById<TextView>(R.id.steam_card_totalGames)
            val totalPlaytimeText = card.findViewById<TextView>(R.id.steam_card_totalPlaytime)
            val recentGamesRecyclerView = card.findViewById<RecyclerView>(R.id.steam_card_recentGamesList)

            val stats = user.steamStats!!
            nameText.text = stats.username
            statusText.text = stats.status
            lastOnlineText.text = stats.lastOnline
            totalGamesText.text = "${stats.totalGames} games"
            totalPlaytimeText.text = stats.totalPlaytime
            
            // Load Steam avatar
            loadSteamAvatar(avatarView, stats.avatarUrl)
            
            // Setup recent games list
            if (stats.recentlyPlayedGames.isNotEmpty()) {
                val gamesAdapter = SteamGamesAdapter(stats.recentlyPlayedGames)
                recentGamesRecyclerView.layoutManager = LinearLayoutManager(this)
                recentGamesRecyclerView.adapter = gamesAdapter
                recentGamesRecyclerView.visibility = View.VISIBLE
            } else {
                recentGamesRecyclerView.visibility = View.GONE
            }
            
            android.util.Log.d("SteamStatsActivity", "Successfully created Steam stats card for ${user.username}")
            
        } catch (e: Exception) {
            android.util.Log.e("SteamStatsActivity", "Error setting up Steam stats card for ${user.username}: ${e.message}", e)
            throw e
        }
        
        return card
    }
    
    private fun loadSteamAvatar(imageView: ImageView, avatarUrl: String) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url = URL(avatarUrl)
                val bitmap = BitmapFactory.decodeStream(url.openConnection().getInputStream())
                
                runOnUiThread {
                    imageView.setImageBitmap(bitmap)
                }
            } catch (e: Exception) {
                android.util.Log.e("SteamStatsActivity", "Error loading Steam avatar: ${e.message}")
                runOnUiThread {
                    imageView.setImageResource(R.drawable.ic_person_placeholder)
                }
            }
        }
    }
}

class SteamGamesAdapter(private val games: List<SteamGame>) : RecyclerView.Adapter<SteamGamesAdapter.GameViewHolder>() {
    
    class GameViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val gameName: TextView = view.findViewById(R.id.gameName)
        val gamePlaytime: TextView = view.findViewById(R.id.gamePlaytime)
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): GameViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_steam_game, parent, false)
        return GameViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: GameViewHolder, position: Int) {
        val game = games[position]
        holder.gameName.text = game.name
        holder.gamePlaytime.text = game.getFormattedPlaytime()
    }
    
    override fun getItemCount(): Int = games.size
} 