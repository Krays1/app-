package com.example.zell0

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.net.URL
import java.net.URLEncoder

data class BattlefieldStats(
    val username: String,
    val platform: String,
    val rank: Int,
    val kills: Int,
    val deaths: Int,
    val kdr: Double,
    val timePlayed: String,
    val wins: Int,
    val losses: Int,
    val winRate: Double,
    val isOnline: Boolean,
    val lastSeen: String,
    val favoriteWeapon: String = "Unknown",
    val avatarUrl: String? = null,
    val assists: Int = 0,
    val headshotPercent: Double = 0.0,
    val multiKills: Int = 0,
    val roadKills: Int = 0,
    val meleeKills: Int = 0,
    val vehicleKills: Int = 0,
    val gadgetKills: Int = 0,
    val scopedKills: Int = 0,
    val hipfireKills: Int = 0,
    val humanKills: Int = 0,
    val aiKills: Int = 0,
    val objectiveTime: String = "",
    val armedObjectives: Int = 0,
    val disarmedObjectives: Int = 0,
    val destroyedObjectives: Int = 0,
    val capturedObjectives: Int = 0,
    val objectivesDefended: Int = 0,
    val sectorsDefended: Int = 0,
    val intelPickedUp: Int = 0,
    val intelExtracted: Int = 0,
    val topWeapons: List<String> = emptyList(),
    val topVehicles: List<String> = emptyList(),
    val topSpecialists: List<String> = emptyList()
) : java.io.Serializable {
    fun getFormattedStats(): String {
        return "Rank $rank • $kills kills • ${String.format("%.2f", kdr)} KDR • $timePlayed played"
    }
    
    fun getShortStats(): String {
        return "Rank $rank • $kills kills • ${String.format("%.1f", kdr)} KDR"
    }
    
    fun getDisplayName(): String {
        return "$username [Rank $rank • $kills kills • ${deaths} deaths • $timePlayed • $favoriteWeapon]"
    }
    
    fun getCompactDisplayName(): String {
        return "$username [Rank $rank • $kills kills • ${deaths} deaths • $timePlayed • $favoriteWeapon]"
    }
}

class BattlefieldStatsManager(private val context: Context) {
    
    companion object {
        private const val TAG = "BattlefieldStatsManager"
        private const val PREFS_NAME = "BattlefieldStats"
        private const val KEY_USERNAME_MAPPINGS = "username_mappings"
        private const val KEY_CACHED_STATS = "cached_stats"
        private const val CACHE_DURATION = 300000L // 5 minutes
    }
    
    private val sharedPrefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    // Manual username mappings for your group
    private val manualUsernameMappings = mapOf(
        "Craze One" to "CrazeOne", // Example: app username -> Battlefield username
        "CrazeOne" to "CrazeOne", // Also try exact match
        "Player1" to "BattlefieldPlayer1",
        "Player2" to "BF2042Player2",
        "test" to "CrazeOne", // Test mapping
        "admin" to "CrazeOne", // Test mapping
        "krays1" to "krays1", // Added krays1 mapping
        "mijnbattlefield3" to "mijnbattlefield3", // Added mijnbattlefield3 mapping
        "ODB_2025" to "ODB_2025", // Added ODB_2025 mapping
        "0DB_2025" to "0DB_2025", // Alternative mapping with zero
        "abbhi86" to "abbhi86", // Added abbhi86 mapping
        "Pacmanisgod7" to "Pacmanisgod7", // Added Pacmanisgod7 mapping
        "DJDELBOY23" to "DJDELBOY23", // Added DJDELBOY23 mapping
        // Add more mappings as needed
    )
    
    suspend fun getPlayerStats(appUsername: String): BattlefieldStats? {
        return withContext(Dispatchers.IO) {
            // Always return placeholder stats for any user
            val battlefieldUsername = getBattlefieldUsername(appUsername) ?: appUsername
            val placeholderStats = createPlaceholderStats(appUsername, battlefieldUsername)
            if (placeholderStats != null) {
                Log.d(TAG, "[ROLLBACK] Returning placeholder stats for $appUsername")
                return@withContext placeholderStats
            }
            Log.d(TAG, "[ROLLBACK] No placeholder stats found for $appUsername, returning null")
            return@withContext null
        }
    }
    
    private fun getBattlefieldUsername(appUsername: String): String? {
        Log.d(TAG, "=== GETTING BATTLEFIELD USERNAME ===")
        Log.d(TAG, "App username: '$appUsername'")
        
        // First check stored mappings
        val storedMappings = getUsernameMappings()
        Log.d(TAG, "Stored mappings: $storedMappings")
        val storedMapping = storedMappings[appUsername]
        if (storedMapping != null) {
            Log.d(TAG, "✅ Found stored mapping: '$appUsername' -> '$storedMapping'")
            return storedMapping
        }
        
        // Fall back to hardcoded mappings
        val hardcodedMapping = manualUsernameMappings[appUsername]
        Log.d(TAG, "Hardcoded mapping for '$appUsername': $hardcodedMapping")
        
        if (hardcodedMapping != null) {
            Log.d(TAG, "✅ Found hardcoded mapping: '$appUsername' -> '$hardcodedMapping'")
            return hardcodedMapping
        }
        
        // If no mapping found, try using the app username directly as Battlefield username
        // This allows any username to work without needing explicit mappings
        Log.d(TAG, "🔄 No mapping found for '$appUsername', trying username directly")
        return appUsername
    }
    
    private suspend fun fetchFromBattlefieldTracker(battlefieldUsername: String): BattlefieldStats? {
        return withContext(Dispatchers.IO) {
            try {
                // Try different platforms
                val platforms = listOf("origin", "xbl", "psn")
                
                for (platform in platforms) {
                    try {
                        val stats = scrapeStatsFromProfile(battlefieldUsername, platform)
                        if (stats != null) {
                            Log.d(TAG, "Found stats for $battlefieldUsername on $platform")
                            return@withContext stats
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to fetch stats for $battlefieldUsername on $platform: ${e.message}")
                        continue
                    }
                }
                
                return@withContext null
                
            } catch (e: Exception) {
                Log.w(TAG, "Error fetching from Battlefield Tracker for $battlefieldUsername: ${e.message}")
                return@withContext null
            }
        }
    }
    
    private suspend fun scrapeStatsFromProfile(username: String, platform: String): BattlefieldStats? {
        return withContext(Dispatchers.IO) {
            try {
                val encodedUsername = URLEncoder.encode(username, "UTF-8")
                val url = URL("https://battlefieldtracker.com/bf2042/profile/$platform/$encodedUsername/overview")
                
                Log.d(TAG, "Scraping profile: $url")
                
                val connection = url.openConnection()
                connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                val response = connection.getInputStream().bufferedReader().use { it.readText() }
                
                // Check if profile exists
                if (response.contains("Profile Not Found") || response.contains("404")) {
                    return@withContext null
                }
                
                // Parse stats from HTML
                parseStatsFromHTML(response, username, platform)
                
            } catch (e: Exception) {
                Log.w(TAG, "Error scraping from platform $platform for $username: ${e.message}")
                null
            }
        }
    }
    
    private fun parseStatsFromHTML(html: String, username: String, platform: String): BattlefieldStats? {
        try {
            // Extract rank
            var rank = 1
            val rankMatch = Regex("""Rank\s*(\d+)""", RegexOption.IGNORE_CASE).find(html)
            if (rankMatch != null) {
                rank = rankMatch.groupValues[1].toIntOrNull() ?: 1
            }
            // Extract kills
            var kills = 0
            val killsMatch = Regex("""Kills\s*(\d+)""", RegexOption.IGNORE_CASE).find(html)
            if (killsMatch != null) {
                kills = killsMatch.groupValues[1].toIntOrNull() ?: 0
            }
            // Extract deaths
            var deaths = 0
            val deathsMatch = Regex("""Deaths\s*(\d+)""", RegexOption.IGNORE_CASE).find(html)
            if (deathsMatch != null) {
                deaths = deathsMatch.groupValues[1].toIntOrNull() ?: 0
            }
            // Calculate KDR
            val kdr = if (deaths > 0) kills.toDouble() / deaths else kills.toDouble()
            // Extract time played
            var timePlayed = "Unknown"
            val timeMatch = Regex("""Time Played\s*([^<\n]+)""", RegexOption.IGNORE_CASE).find(html)
            if (timeMatch != null) {
                timePlayed = timeMatch.groupValues[1].trim()
            }
            // Extract wins
            var wins = 0
            val winsMatch = Regex("""Wins\s*(\d+)""", RegexOption.IGNORE_CASE).find(html)
            if (winsMatch != null) {
                wins = winsMatch.groupValues[1].toIntOrNull() ?: 0
            }
            // Extract losses
            var losses = 0
            val lossesMatch = Regex("""Losses\s*(\d+)""", RegexOption.IGNORE_CASE).find(html)
            if (lossesMatch != null) {
                losses = lossesMatch.groupValues[1].toIntOrNull() ?: 0
            }
            // Calculate win rate
            val winRate = if (wins + losses > 0) (wins.toDouble() / (wins + losses)) * 100 else 0.0
            // Extract favorite weapon
            var favoriteWeapon = "Unknown"
            val weaponMatch = Regex("""Weapon\s*([^<\n]+)""", RegexOption.IGNORE_CASE).find(html)
            if (weaponMatch != null) {
                favoriteWeapon = weaponMatch.groupValues[1].trim()
            }
            // Extract assists
            var assists = 0
            val assistsMatch = Regex("""Assists\s*(\d+)""", RegexOption.IGNORE_CASE).find(html)
            if (assistsMatch != null) {
                assists = assistsMatch.groupValues[1].toIntOrNull() ?: 0
            }
            // Extract headshot percent
            var headshotPercent = 0.0
            val hsMatch = Regex("""HS%\s*(\d+\.\d+|\d+)""", RegexOption.IGNORE_CASE).find(html)
            if (hsMatch != null) {
                headshotPercent = hsMatch.groupValues[1].toDoubleOrNull() ?: 0.0
            }
            // Extract multiKills, roadKills, meleeKills, vehicleKills, gadgetKills, scopedKills, hipfireKills, humanKills, aiKills
            fun extractInt(label: String): Int {
                val m = Regex("""$label\s*(\d+)""", RegexOption.IGNORE_CASE).find(html)
                return m?.groupValues?.get(1)?.toIntOrNull() ?: 0
            }
            val multiKills = extractInt("Multi Kills")
            val roadKills = extractInt("Road Kills")
            val meleeKills = extractInt("Melee Kills")
            val vehicleKills = extractInt("Vehicle Kills")
            val gadgetKills = extractInt("Gadget Kills")
            val scopedKills = extractInt("Scoped Kills")
            val hipfireKills = extractInt("Hipfire Kills")
            val humanKills = extractInt("Human Kills")
            val aiKills = extractInt("AI Kills")
            // Objective stats
            var objectiveTime = ""
            val objTimeMatch = Regex("""Objective Time\s*([^<\n]+)""", RegexOption.IGNORE_CASE).find(html)
            if (objTimeMatch != null) objectiveTime = objTimeMatch.groupValues[1].trim()
            val armedObjectives = extractInt("Armed Objectives")
            val disarmedObjectives = extractInt("Disarmed Objectives")
            val destroyedObjectives = extractInt("Destroyed Objectives")
            val capturedObjectives = extractInt("Captured Objectives")
            val objectivesDefended = extractInt("Objectives Defended")
            val sectorsDefended = extractInt("Sectors Defended")
            val intelPickedUp = extractInt("Intel Picked Up")
            val intelExtracted = extractInt("Intel Extracted")
            // Top weapons, vehicles, specialists (simple extraction by name, can be improved)
            val topWeapons = Regex("""Weapon\s*([^<\n]+)""", RegexOption.IGNORE_CASE).findAll(html).map { it.groupValues[1].trim() }.toList().distinct()
            val topVehicles = Regex("""Vehicle\s*([^<\n]+)""", RegexOption.IGNORE_CASE).findAll(html).map { it.groupValues[1].trim() }.toList().distinct()
            val topSpecialists = Regex("""Specialist\s*([^<\n]+)""", RegexOption.IGNORE_CASE).findAll(html).map { it.groupValues[1].trim() }.toList().distinct()
            return BattlefieldStats(
                username = username,
                platform = platform.uppercase(),
                rank = rank,
                kills = kills,
                deaths = deaths,
                kdr = kdr,
                timePlayed = timePlayed,
                wins = wins,
                losses = losses,
                winRate = winRate,
                isOnline = false,
                lastSeen = "Unknown",
                favoriteWeapon = favoriteWeapon,
                assists = assists,
                headshotPercent = headshotPercent,
                multiKills = multiKills,
                roadKills = roadKills,
                meleeKills = meleeKills,
                vehicleKills = vehicleKills,
                gadgetKills = gadgetKills,
                scopedKills = scopedKills,
                hipfireKills = hipfireKills,
                humanKills = humanKills,
                aiKills = aiKills,
                objectiveTime = objectiveTime,
                armedObjectives = armedObjectives,
                disarmedObjectives = disarmedObjectives,
                destroyedObjectives = destroyedObjectives,
                capturedObjectives = capturedObjectives,
                objectivesDefended = objectivesDefended,
                sectorsDefended = sectorsDefended,
                intelPickedUp = intelPickedUp,
                intelExtracted = intelExtracted,
                topWeapons = topWeapons,
                topVehicles = topVehicles,
                topSpecialists = topSpecialists
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing HTML for $username", e)
            return null
        }
    }
    
    private fun createPlaceholderStats(appUsername: String, battlefieldUsername: String): BattlefieldStats? {
        Log.d(TAG, "Creating placeholder stats for app username: '$appUsername' -> Battlefield: '$battlefieldUsername'")
        
        // Create placeholder stats for known users who don't have public profiles
        val result = when (appUsername.lowercase()) {
            "craze one" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "ORIGIN",
                rank = 85,
                kills = 1250,
                deaths = 980,
                kdr = 1.28,
                timePlayed = "45h 30m",
                wins = 67,
                losses = 43,
                winRate = 60.9,
                isOnline = false,
                lastSeen = "2 hours ago",
                favoriteWeapon = "M5A3",
                assists = 280,
                headshotPercent = 32.1,
                multiKills = 38,
                roadKills = 15,
                meleeKills = 12,
                vehicleKills = 89,
                gadgetKills = 45,
                scopedKills = 750,
                hipfireKills = 320,
                humanKills = 1100,
                aiKills = 150,
                objectiveTime = "22h 15m",
                armedObjectives = 25,
                disarmedObjectives = 12,
                destroyedObjectives = 5,
                capturedObjectives = 120,
                objectivesDefended = 180,
                sectorsDefended = 35,
                intelPickedUp = 18,
                intelExtracted = 12,
                topWeapons = listOf("M5A3", "SFAR-M GL", "AK-24", "LCMG"),
                topVehicles = listOf("LATV4", "MAV", "M1A5", "AH-64G Apache"),
                topSpecialists = listOf("Mackay", "Falck", "Sundance", "Boris")
            )
            "player1" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "XBL",
                rank = 72,
                kills = 890,
                deaths = 750,
                kdr = 1.19,
                timePlayed = "32h 15m",
                wins = 45,
                losses = 38,
                winRate = 54.2,
                isOnline = false,
                lastSeen = "1 hour ago",
                favoriteWeapon = "AK-24"
            )
            "player2" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "PSN",
                rank = 95,
                kills = 2100,
                deaths = 1200,
                kdr = 1.75,
                timePlayed = "78h 45m",
                wins = 89,
                losses = 52,
                winRate = 63.1,
                isOnline = false,
                lastSeen = "30 minutes ago",
                favoriteWeapon = "SFAR-M GL"
            )
            "test" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "ORIGIN",
                rank = 50,
                kills = 500,
                deaths = 400,
                kdr = 1.25,
                timePlayed = "20h 15m",
                wins = 25,
                losses = 20,
                winRate = 55.6,
                isOnline = false,
                lastSeen = "1 hour ago",
                favoriteWeapon = "M5A3"
            )
            "admin" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "ORIGIN",
                rank = 100,
                kills = 3000,
                deaths = 1500,
                kdr = 2.0,
                timePlayed = "100h 30m",
                wins = 150,
                losses = 75,
                winRate = 66.7,
                isOnline = false,
                lastSeen = "30 minutes ago",
                favoriteWeapon = "SFAR-M GL"
            )
            "krays1" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "ORIGIN",
                rank = 78,
                kills = 1450,
                deaths = 1100,
                kdr = 1.32,
                timePlayed = "52h 20m",
                wins = 78,
                losses = 45,
                winRate = 63.4,
                isOnline = false,
                lastSeen = "1 hour ago",
                favoriteWeapon = "SFAR-M GL",
                assists = 320,
                headshotPercent = 28.5,
                multiKills = 45,
                roadKills = 12,
                meleeKills = 8,
                vehicleKills = 67,
                gadgetKills = 23,
                scopedKills = 890,
                hipfireKills = 234,
                humanKills = 1200,
                aiKills = 250,
                objectiveTime = "18h 45m",
                armedObjectives = 15,
                disarmedObjectives = 8,
                destroyedObjectives = 3,
                capturedObjectives = 89,
                objectivesDefended = 156,
                sectorsDefended = 23,
                intelPickedUp = 12,
                intelExtracted = 8,
                topWeapons = listOf("SFAR-M GL", "M5A3", "AK-24", "LCMG"),
                topVehicles = listOf("LATV4", "MAV", "M1A5", "AH-64G Apache"),
                topSpecialists = listOf("Mackay", "Falck", "Sundance", "Boris")
            )
            "mijnbattlefield3" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "ORIGIN",
                rank = 92,
                kills = 1850,
                deaths = 1200,
                kdr = 1.54,
                timePlayed = "68h 45m",
                wins = 95,
                losses = 58,
                winRate = 62.1,
                isOnline = false,
                lastSeen = "45 minutes ago",
                favoriteWeapon = "M5A3"
            )
            "0db_2025" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "ORIGIN",
                rank = 65,
                kills = 980,
                deaths = 850,
                kdr = 1.15,
                timePlayed = "38h 10m",
                wins = 52,
                losses = 42,
                winRate = 55.3,
                isOnline = false,
                lastSeen = "2 hours ago",
                favoriteWeapon = "AK-24"
            )
            "abbhi86" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "ORIGIN",
                rank = 88,
                kills = 1650,
                deaths = 1150,
                kdr = 1.43,
                timePlayed = "62h 30m",
                wins = 88,
                losses = 55,
                winRate = 61.5,
                isOnline = false,
                lastSeen = "30 minutes ago",
                favoriteWeapon = "SFAR-M GL"
            )
            "pacmanisgod7" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "ORIGIN",
                rank = 75,
                kills = 1200,
                deaths = 950,
                kdr = 1.26,
                timePlayed = "48h 15m",
                wins = 72,
                losses = 48,
                winRate = 60.0,
                isOnline = false,
                lastSeen = "1 hour ago",
                favoriteWeapon = "M5A3"
            )
            "djdelboy23" -> BattlefieldStats(
                username = battlefieldUsername,
                platform = "ORIGIN",
                rank = 82,
                kills = 1350,
                deaths = 1050,
                kdr = 1.29,
                timePlayed = "55h 20m",
                wins = 82,
                losses = 52,
                winRate = 61.2,
                isOnline = false,
                lastSeen = "1 hour ago",
                favoriteWeapon = "AK-24"
            )
            else -> null
        }
        
        Log.d(TAG, "Placeholder stats result for '$appUsername': ${result != null}")
        return result
    }
    
    private fun getCachedStats(username: String): BattlefieldStats? {
        try {
            val cachedData = sharedPrefs.getString(KEY_CACHED_STATS, "{}")
            val cache = JSONObject(cachedData)
            
            if (cache.has(username)) {
                val userCache = cache.getJSONObject(username)
                val timestamp = userCache.getLong("timestamp")
                
                if (System.currentTimeMillis() - timestamp < CACHE_DURATION) {
                    val statsData = userCache.getJSONObject("stats")
                    return BattlefieldStats(
                        username = statsData.getString("username"),
                        platform = statsData.getString("platform"),
                        rank = statsData.getInt("rank"),
                        kills = statsData.getInt("kills"),
                        deaths = statsData.getInt("deaths"),
                        kdr = statsData.getDouble("kdr"),
                        timePlayed = statsData.getString("timePlayed"),
                        wins = statsData.getInt("wins"),
                        losses = statsData.getInt("losses"),
                        winRate = statsData.getDouble("winRate"),
                        isOnline = statsData.getBoolean("isOnline"),
                        lastSeen = statsData.getString("lastSeen"),
                        favoriteWeapon = statsData.optString("favoriteWeapon", "Unknown"),
                        avatarUrl = if (statsData.has("avatarUrl")) statsData.getString("avatarUrl") else null
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading cached stats", e)
        }
        return null
    }
    
    private fun cacheStats(username: String, stats: BattlefieldStats) {
        try {
            val cachedData = sharedPrefs.getString(KEY_CACHED_STATS, "{}")
            val cache = JSONObject(cachedData)
            
            val statsData = JSONObject().apply {
                put("username", stats.username)
                put("platform", stats.platform)
                put("rank", stats.rank)
                put("kills", stats.kills)
                put("deaths", stats.deaths)
                put("kdr", stats.kdr)
                put("timePlayed", stats.timePlayed)
                put("wins", stats.wins)
                put("losses", stats.losses)
                put("winRate", stats.winRate)
                put("isOnline", stats.isOnline)
                put("lastSeen", stats.lastSeen)
                put("favoriteWeapon", stats.favoriteWeapon)
                stats.avatarUrl?.let { put("avatarUrl", it) }
            }
            
            val userCache = JSONObject().apply {
                put("timestamp", System.currentTimeMillis())
                put("stats", statsData)
            }
            
            cache.put(username, userCache)
            sharedPrefs.edit().putString(KEY_CACHED_STATS, cache.toString()).apply()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error caching stats", e)
        }
    }
    
    fun addUsernameMapping(appUsername: String, battlefieldUsername: String) {
        try {
            val mappingsData = sharedPrefs.getString(KEY_USERNAME_MAPPINGS, "{}")
            val mappings = JSONObject(mappingsData)
            mappings.put(appUsername, battlefieldUsername)
            sharedPrefs.edit().putString(KEY_USERNAME_MAPPINGS, mappings.toString()).apply()
            
            Log.d(TAG, "Added username mapping: $appUsername -> $battlefieldUsername")
        } catch (e: Exception) {
            Log.e(TAG, "Error adding username mapping", e)
        }
    }
    
    private fun saveUsernameMapping(appUsername: String, battlefieldUsername: String) {
        try {
            val mappingsData = sharedPrefs.getString(KEY_USERNAME_MAPPINGS, "{}")
            val mappings = JSONObject(mappingsData)
            mappings.put(appUsername, battlefieldUsername)
            sharedPrefs.edit().putString(KEY_USERNAME_MAPPINGS, mappings.toString()).apply()
            
            Log.d(TAG, "Auto-saved username mapping: $appUsername -> $battlefieldUsername")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving username mapping", e)
        }
    }
    
    fun getUsernameMappings(): Map<String, String> {
        try {
            val mappingsData = sharedPrefs.getString(KEY_USERNAME_MAPPINGS, "{}")
            val mappings = JSONObject(mappingsData)
            val result = mutableMapOf<String, String>()
            
            val keys = mappings.keys()
            while (keys.hasNext()) {
                val key = keys.next() as String
                val value = mappings.optString(key, "")
                result[key] = value
            }
            
            return result
        } catch (e: Exception) {
            Log.e(TAG, "Error reading username mappings", e)
            return emptyMap()
        }
    }
    
    fun clearCache() {
        sharedPrefs.edit().remove(KEY_CACHED_STATS).apply()
        Log.d(TAG, "Battlefield stats cache cleared")
    }
    
    fun removeFromCache(username: String) {
        try {
            val cachedData = sharedPrefs.getString(KEY_CACHED_STATS, "{}")
            val cache = JSONObject(cachedData)
            cache.remove(username)
            sharedPrefs.edit().putString(KEY_CACHED_STATS, cache.toString()).apply()
            
            Log.d(TAG, "Removed $username from Battlefield stats cache")
        } catch (e: Exception) {
            Log.e(TAG, "Error removing from cache", e)
        }
    }
    
    // Test function for debugging
    suspend fun testStats(username: String): String {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Testing stats for username: $username")
                
                val battlefieldUsername = getBattlefieldUsername(username)
                if (battlefieldUsername == null) {
                    return@withContext "No Battlefield username mapping found for: $username"
                }
                
                val stats = getPlayerStats(username)
                if (stats != null) {
                    return@withContext "Found stats: ${stats.getFormattedStats()}"
                } else {
                    return@withContext "No stats found for: $username (Battlefield: $battlefieldUsername)"
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Test stats error", e)
                return@withContext "Error: ${e.message}"
            }
        }
    }
} 