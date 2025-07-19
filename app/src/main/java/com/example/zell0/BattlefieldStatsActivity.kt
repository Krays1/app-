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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay

class BattlefieldStatsActivity : AppCompatActivity() {
    private val handler = Handler(Looper.getMainLooper())
    private var pollRunnable: Runnable? = null
    private var lastUserStatsCount = 0
    
    // UI references
    private lateinit var contentLayout: LinearLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_battlefield_stats)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Battlefield 2042 Stats"

        contentLayout = findViewById<LinearLayout>(R.id.contentLayout)
        progressBar = findViewById<ProgressBar>(R.id.progressBar)
        errorText = findViewById<TextView>(R.id.errorText)

        // Refresh button setup
        val btnRefresh = findViewById<ImageButton>(R.id.btnRefreshStats)
        btnRefresh.setOnClickListener {
            forceRefreshAllStats()
        }

        // Initial load from intent (may be empty)
        val initialUsersWithStats = (intent.getSerializableExtra("usersWithStats") as? ArrayList<ConnectedUser>)?.filter { it.battlefieldStats != null } ?: emptyList()
        lastUserStatsCount = initialUsersWithStats.size
        updateStatsUI(initialUsersWithStats)
        if (lastUserStatsCount == 0) progressBar.visibility = View.VISIBLE

        // Start polling for updates
        pollRunnable = object : Runnable {
            override fun run() {
                val latestUsers = com.example.zell0.MainActivity.getLatestUserList()
                // Show ALL users who have stats (not just online ones)
                val usersWithStats = latestUsers.filter { it.battlefieldStats != null }
                
                // Debug logging
                android.util.Log.d("BattlefieldStatsActivity", "Polling: ${latestUsers.size} total users, ${usersWithStats.size} with stats")
                for (user in latestUsers) {
                    android.util.Log.d("BattlefieldStatsActivity", "User: ${user.username}, isOnline: ${user.isOnline}, hasStats: ${user.battlefieldStats != null}")
                    if (user.battlefieldStats != null) {
                        android.util.Log.d("BattlefieldStatsActivity", "  Stats for ${user.username}: ${user.battlefieldStats.getFormattedStats()}")
                    }
                }
                
                // Always update UI if we have users with stats
                updateStatsUI(usersWithStats)
                
                // If we have more users with stats than before, show a brief message
                if (usersWithStats.size > lastUserStatsCount && lastUserStatsCount > 0) {
                    android.widget.Toast.makeText(this@BattlefieldStatsActivity, 
                        "Found ${usersWithStats.size - lastUserStatsCount} more users with stats!", 
                        android.widget.Toast.LENGTH_SHORT).show()
                }
                lastUserStatsCount = usersWithStats.size
                
                handler.postDelayed(this, 1000) // Poll every 1 second
            }
        }
        handler.post(pollRunnable!!)

        // Auto-refresh Battlefield stats for all users when entering the screen
        forceRefreshAllStats()
    }

    private fun updateStatsUI(usersWithStats: List<ConnectedUser>) {
        android.util.Log.d("BattlefieldStatsActivity", "updateStatsUI called with ${usersWithStats.size} users")
        contentLayout.removeAllViews()
        
        var addedCard = false
        for (user in usersWithStats) {
            try {
                if (user.battlefieldStats != null) {
                    android.util.Log.d("BattlefieldStatsActivity", "User: ${user.username}, battlefieldStats: ${user.battlefieldStats}")
                    android.util.Log.d("BattlefieldStatsActivity", "Creating card for user: ${user.username}")
                    android.util.Log.d("BattlefieldStatsActivity", "User stats: ${user.battlefieldStats}")
                    
                    // Create the main rich card
                    val card = createUserStatsCard(user)
                    // Add margin to card for separation
                    val params = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    params.setMargins(0, 0, 0, 32)
                    card.layoutParams = params
                    contentLayout.addView(card)
                    addedCard = true
                    android.util.Log.d("BattlefieldStatsActivity", "Successfully added main card for ${user.username}")
                } else {
                    android.util.Log.w("BattlefieldStatsActivity", "User ${user.username} has no battlefieldStats despite being in filtered list")
                }
            } catch (e: Exception) {
                android.util.Log.e("BattlefieldStatsActivity", "Error creating stats card for ${user.username}: ${e.message}", e)
                android.widget.Toast.makeText(this, "Error creating card for ${user.username}: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
            }
        }
        
        android.util.Log.d("BattlefieldStatsActivity", "updateStatsUI completed: addedCard=$addedCard")
        if (addedCard) {
            progressBar.visibility = View.GONE
            contentLayout.visibility = View.VISIBLE
            errorText.visibility = View.GONE
            android.util.Log.d("BattlefieldStatsActivity", "Showing content layout")
        } else {
            progressBar.visibility = View.GONE
            contentLayout.visibility = View.GONE
            errorText.visibility = View.VISIBLE
            android.util.Log.d("BattlefieldStatsActivity", "No stats found, showing error text")
            android.widget.Toast.makeText(this, "No Battlefield stats found for any users", android.widget.Toast.LENGTH_LONG).show()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        pollRunnable?.let { handler.removeCallbacks(it) }
    }
    
    private fun forceRefreshAllStats() {
        android.util.Log.d("BattlefieldStatsActivity", "=== FORCE REFRESHING ALL STATS ===")
        android.widget.Toast.makeText(this, "Refreshing all Battlefield stats...", android.widget.Toast.LENGTH_SHORT).show()
        
        // Show progress bar while refreshing
        progressBar.visibility = android.view.View.VISIBLE
        contentLayout.visibility = android.view.View.GONE
        errorText.visibility = android.view.View.GONE
        
        // Fetch Battlefield stats for ALL mapped users (not just connected ones)
        fetchAllMappedUsersBattlefieldStats()
    }
    
    private fun fetchAllMappedUsersBattlefieldStats() {
        android.util.Log.d("BattlefieldStatsActivity", "=== FETCHING BATTLEFIELD STATS FOR ALL MAPPED USERS ===")
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val battlefieldAPI = BattlefieldStatsManager(this@BattlefieldStatsActivity)
                
                // Get all Battlefield username mappings
                val storedMappings = battlefieldAPI.getUsernameMappings()
                val allMappedUsernames = mutableSetOf<String>()
                
                // Add stored mappings
                allMappedUsernames.addAll(storedMappings.keys)
                
                // Add hardcoded mappings (krays1, Abbhi, bzar81314, etc.)
                allMappedUsernames.addAll(listOf("krays1", "Abbhi", "bzar81314", "LilMissClo", "player2", "test"))
                
                android.util.Log.d("BattlefieldStatsActivity", "Found ${allMappedUsernames.size} mapped usernames: ${allMappedUsernames.joinToString(", ")}")
                
                // Get current connected users first
                val currentConnectedUsers = com.example.zell0.MainActivity.getLatestUserList()
                val connectedUsernames = currentConnectedUsers.map { it.username }.toSet()
                
                android.util.Log.d("BattlefieldStatsActivity", "Current connected users: ${connectedUsernames.joinToString(", ")}")
                
                val allUsersWithStats = mutableListOf<ConnectedUser>()
                
                // First, add all connected users who already have Battlefield stats
                for (connectedUser in currentConnectedUsers) {
                    if (connectedUser.battlefieldStats != null) {
                        allUsersWithStats.add(connectedUser)
                        android.util.Log.d("BattlefieldStatsActivity", "Added connected user with existing stats: ${connectedUser.username}")
                    }
                }
                
                // Then fetch stats for ALL mapped users (including connected ones who might not have stats yet)
                for (username in allMappedUsernames) {
                    // Check if this user is already connected and has stats
                    val connectedUser = currentConnectedUsers.find { it.username == username }
                    if (connectedUser != null && connectedUser.battlefieldStats != null) {
                        android.util.Log.d("BattlefieldStatsActivity", "Skipping $username - already connected with existing stats")
                        continue
                    }
                    
                    try {
                        android.util.Log.d("BattlefieldStatsActivity", "Fetching Battlefield stats for mapped user: $username")
                        val stats = battlefieldAPI.getPlayerStats(username)
                        
                        if (stats != null) {
                            android.util.Log.d("BattlefieldStatsActivity", "✅ Found Battlefield stats for '$username': ${stats.getFormattedStats()}")
                            
                            // Check if this user is currently connected
                            val connectedUser = currentConnectedUsers.find { it.username == username }
                            if (connectedUser != null) {
                                // User is connected - update their existing object with Battlefield stats
                                val updatedConnectedUser = connectedUser.copy(battlefieldStats = stats)
                                allUsersWithStats.add(updatedConnectedUser)
                                android.util.Log.d("BattlefieldStatsActivity", "Updated connected user $username with Battlefield stats")
                            } else {
                                // User is not connected - create a mapped user object
                                val mappedUser = ConnectedUser(
                                    deviceId = "mapped_$username", // Use a special device ID for mapped users
                                    username = username,
                                    isOnline = false, // These users are not necessarily online
                                    profilePicBase64 = null,
                                    battlefieldStats = stats,
                                    steamStats = null
                                )
                                allUsersWithStats.add(mappedUser)
                                android.util.Log.d("BattlefieldStatsActivity", "Added mapped user $username with Battlefield stats")
                            }
                            
                            // Update UI on main thread with combined list
                            runOnUiThread {
                                android.util.Log.d("BattlefieldStatsActivity", "Adding Battlefield stats for mapped user: $username")
                                updateStatsUI(allUsersWithStats)
                            }
                        } else {
                            android.util.Log.d("BattlefieldStatsActivity", "❌ No Battlefield stats found for mapped user: $username")
                        }
                        
                        // Small delay between requests to avoid overwhelming the API
                        delay(300)
                        
                    } catch (e: Exception) {
                        android.util.Log.e("BattlefieldStatsActivity", "Error fetching Battlefield stats for '$username': ${e.message}", e)
                    }
                }
                
                runOnUiThread {
                    if (allUsersWithStats.isNotEmpty()) {
                        android.util.Log.d("BattlefieldStatsActivity", "Successfully fetched Battlefield stats for ${allUsersWithStats.size} total users")
                        android.widget.Toast.makeText(this@BattlefieldStatsActivity, 
                            "Found Battlefield stats for ${allUsersWithStats.size} users", 
                            android.widget.Toast.LENGTH_SHORT).show()
                    } else {
                        android.util.Log.d("BattlefieldStatsActivity", "No Battlefield stats found for any users")
                        android.widget.Toast.makeText(this@BattlefieldStatsActivity, 
                            "No Battlefield stats found for any users", 
                            android.widget.Toast.LENGTH_SHORT).show()
                    }
                }
                
            } catch (e: Exception) {
                android.util.Log.e("BattlefieldStatsActivity", "Error in fetchAllMappedUsersBattlefieldStats: ${e.message}", e)
                runOnUiThread {
                    android.widget.Toast.makeText(this@BattlefieldStatsActivity, 
                        "Error fetching Battlefield stats: ${e.message}", 
                        android.widget.Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun createUserStatsCard(user: ConnectedUser): View {
        if (user.battlefieldStats == null) throw IllegalArgumentException("User has no battlefieldStats")
        val inflater = LayoutInflater.from(this)
        val card = inflater.inflate(R.layout.battlefield_stats_card, null) as androidx.cardview.widget.CardView

        try {
            val nameText = card.findViewById<TextView>(R.id.bf_card_playerName)
            val platformText = card.findViewById<TextView>(R.id.bf_card_platform)
            val avatarView = card.findViewById<android.widget.ImageView>(R.id.bf_card_avatar)
            val levelText = card.findViewById<TextView>(R.id.bf_card_playerLevel)
            val timePlayedText = card.findViewById<TextView>(R.id.bf_card_timePlayed)
            val kdrText = card.findViewById<TextView>(R.id.bf_card_kdRatioValue)
            val killsText = card.findViewById<TextView>(R.id.bf_card_killsValue)
            val deathsText = card.findViewById<TextView>(R.id.bf_card_deathsValue)
            val assistsText = card.findViewById<TextView>(R.id.bf_card_assistsValue)
            val hsPercentText = card.findViewById<TextView>(R.id.bf_card_headshotPercentValue)
            val winRateText = card.findViewById<TextView>(R.id.bf_card_winPercentValue)
            val multiKillsText = card.findViewById<TextView>(R.id.bf_card_multiKillsValue)
            val roadKillsText = card.findViewById<TextView>(R.id.bf_card_roadKillsValue)
            val vehicleKillsText = card.findViewById<TextView>(R.id.bf_card_vehicleKillsValue)
            val gadgetKillsText = card.findViewById<TextView>(R.id.bf_card_gadgetKillsValue)
            val scopedKillsText = card.findViewById<TextView>(R.id.bf_card_scopedKillsValue)
            val hipfireKillsText = card.findViewById<TextView>(R.id.bf_card_hipfireKillsValue)
            val humanKillsText = card.findViewById<TextView>(R.id.bf_card_humanKillsValue)
            val aiKillsText = card.findViewById<TextView>(R.id.bf_card_aiKillsValue)
            val objectiveTimeText = card.findViewById<TextView>(R.id.bf_card_objectiveTimeValue)
            val armedObjectivesText = card.findViewById<TextView>(R.id.bf_card_armedObjectivesValue)
            val disarmedObjectivesText = card.findViewById<TextView>(R.id.bf_card_disarmedObjectivesValue)
            val destroyedObjectivesText = card.findViewById<TextView>(R.id.bf_card_destroyedObjectivesValue)
            val capturedObjectivesText = card.findViewById<TextView>(R.id.bf_card_capturedObjectivesValue)
            val objectivesDefendedText = card.findViewById<TextView>(R.id.bf_card_objectivesDefendedValue)
            val favoriteWeaponText = card.findViewById<TextView>(R.id.bf_card_favoriteWeaponValue)
            val topWeaponsText = card.findViewById<TextView>(R.id.bf_card_topWeaponsValue)
            val topVehiclesText = card.findViewById<TextView>(R.id.bf_card_topVehiclesValue)
            val topSpecialistsText = card.findViewById<TextView>(R.id.bf_card_topSpecialistsValue)
            val meleeKillsText = card.findViewById<TextView>(R.id.bf_card_meleeKillsValue)
            val sectorsDefendedText = card.findViewById<TextView>(R.id.bf_card_sectorsDefendedValue)
            val intelPickedUpText = card.findViewById<TextView>(R.id.bf_card_intelPickedUpValue)
            val intelExtractedText = card.findViewById<TextView>(R.id.bf_card_intelExtractedValue)
            val lastSeenText = card.findViewById<TextView>(R.id.bf_card_lastSeenValue)
            val winsText = card.findViewById<TextView>(R.id.bf_card_winsValue)
            val lossesText = card.findViewById<TextView>(R.id.bf_card_lossesValue)

            val stats = user.battlefieldStats!!
            nameText.text = user.username
            platformText.text = stats.platform
            levelText.text = "Level ${stats.rank}"
            timePlayedText.text = stats.timePlayed
            
            // Avatar: use profilePicBase64 if available, else placeholder
            if (!user.profilePicBase64.isNullOrEmpty()) {
                try {
                    val decoded = android.util.Base64.decode(user.profilePicBase64, android.util.Base64.DEFAULT)
                    val bmp = android.graphics.BitmapFactory.decodeByteArray(decoded, 0, decoded.size)
                    avatarView.setImageBitmap(bmp)
                } catch (_: Exception) {
                    avatarView.setImageResource(R.drawable.ic_person_placeholder)
                }
            } else {
                avatarView.setImageResource(R.drawable.ic_person_placeholder)
            }
            
            // Set all available stats
            kdrText.text = String.format("%.2f", stats.kdr)
            killsText.text = stats.kills.toString()
            deathsText.text = stats.deaths.toString()
            assistsText.text = stats.assists.toString()
            hsPercentText.text = String.format("%.1f%%", stats.headshotPercent)
            winRateText.text = String.format("%.1f%%", stats.winRate)
            
            // Combat stats
            multiKillsText.text = stats.multiKills.toString()
            roadKillsText.text = stats.roadKills.toString()
            meleeKillsText.text = stats.meleeKills.toString()
            vehicleKillsText.text = stats.vehicleKills.toString()
            gadgetKillsText.text = stats.gadgetKills.toString()
            scopedKillsText.text = stats.scopedKills.toString()
            hipfireKillsText.text = stats.hipfireKills.toString()
            humanKillsText.text = stats.humanKills.toString()
            aiKillsText.text = stats.aiKills.toString()
            
            // Objective stats
            objectiveTimeText.text = stats.objectiveTime.ifEmpty { "-" }
            armedObjectivesText.text = stats.armedObjectives.toString()
            disarmedObjectivesText.text = stats.disarmedObjectives.toString()
            destroyedObjectivesText.text = stats.destroyedObjectives.toString()
            capturedObjectivesText.text = stats.capturedObjectives.toString()
            objectivesDefendedText.text = stats.objectivesDefended.toString()
            sectorsDefendedText.text = stats.sectorsDefended.toString()
            intelPickedUpText.text = stats.intelPickedUp.toString()
            intelExtractedText.text = stats.intelExtracted.toString()
            
            // Player info
            lastSeenText.text = "Last seen: ${stats.lastSeen}"
            winsText.text = "Wins: ${stats.wins}"
            lossesText.text = "Losses: ${stats.losses}"
            
            // Top items
            favoriteWeaponText.text = stats.favoriteWeapon
            topWeaponsText.text = stats.topWeapons.joinToString(", ")
            topVehiclesText.text = stats.topVehicles.joinToString(", ")
            topSpecialistsText.text = stats.topSpecialists.joinToString(", ")
        } catch (e: Exception) {
            android.util.Log.e("BattlefieldStatsActivity", "Error creating stats card for ${user.username}: ${e.message}", e)
            android.widget.Toast.makeText(this, "Error: ${e.message}", android.widget.Toast.LENGTH_LONG).show()
        }
        return card
    }

    private fun refreshBattlefieldStats() {
        progressBar.visibility = View.VISIBLE
        contentLayout.visibility = View.GONE
        errorText.visibility = View.GONE
        android.util.Log.d("BattlefieldStatsActivity", "Manual refresh triggered")
        // Just update the UI with the latest user list; stats fetching is handled by polling in MainActivity
        updateStatsUI(com.example.zell0.MainActivity.getLatestUserList().filter { it.battlefieldStats != null })
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }
} 