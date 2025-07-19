package com.example.zell0

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.io.Serializable
import java.net.URL
import java.net.URLEncoder

data class SteamStats(
    val steamId: String,
    val username: String,
    val profileUrl: String,
    val avatarUrl: String,
    val status: String,
    val lastOnline: String,
    val recentlyPlayedGames: List<SteamGame> = emptyList(),
    val totalGames: Int = 0,
    val totalPlaytime: String = "0h"
) : Serializable {
    fun getFormattedStats(): String {
        return "$username - $status - ${recentlyPlayedGames.size} recent games"
    }
    
    fun getCompactDisplayName(): String {
        return "$username [$status]"
    }
}

data class SteamGame(
    val appId: Int,
    val name: String,
    val playtime: Int, // in minutes
    val iconUrl: String = ""
) : Serializable {
    fun getFormattedPlaytime(): String {
        val hours = playtime / 60
        val minutes = playtime % 60
        return if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"
    }
}

class SteamStatsManager(private val context: Context) {
    companion object {
        private const val TAG = "SteamStatsManager"
        private const val PREFS_NAME = "SteamStatsPrefs"
        private const val KEY_STEAM_ID_MAPPINGS = "steam_id_mappings"
        private const val KEY_CACHED_STATS = "cached_steam_stats"
        private const val STEAM_API_KEY = "F555BBBB72C5EDBF664C862A33B1E2CC" // Steam API Key
    }
    
    private val sharedPrefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    // Manual Steam ID mappings (app username -> Steam ID)
    private val manualSteamIdMappings = mapOf(
        "krays1" to "76561198009391170", // KRAYS1 Steam ID
        "player2" to "76561198087654321",
        "test" to "76561198011111111",
        "Abbhi" to "76561198195889450", // Abbhi Steam ID
        "bzar81314" to "76561199645780164", // bzar81314 Steam ID
        "LilMissClo" to "76561198012345678" // LilMissClo Steam ID (placeholder - needs real Steam ID)
    )
    
    suspend fun getPlayerStats(appUsername: String): SteamStats? {
        return withContext(Dispatchers.IO) {
            try {
                val steamId = getSteamId(appUsername) ?: return@withContext null
                Log.d(TAG, "Fetching Steam stats for $appUsername (Steam ID: $steamId)")
                
                val profileStats = fetchSteamProfile(steamId)
                val gamesStats = fetchRecentlyPlayedGames(steamId)
                
                if (profileStats != null) {
                    val stats = SteamStats(
                        steamId = steamId,
                        username = profileStats.getString("personaname"),
                        profileUrl = profileStats.getString("profileurl"),
                        avatarUrl = profileStats.getString("avatarfull"),
                        status = getStatusText(profileStats.getInt("personastate")),
                        lastOnline = getLastOnlineText(profileStats.getLong("lastlogoff")),
                        recentlyPlayedGames = gamesStats ?: emptyList(),
                        totalGames = gamesStats?.size ?: 0,
                        totalPlaytime = calculateTotalPlaytime(gamesStats)
                    )
                    
                    // Cache the stats
                    cacheStats(appUsername, stats)
                    Log.d(TAG, "✅ Found Steam stats for '$appUsername': ${stats.getFormattedStats()}")
                    return@withContext stats
                } else {
                    Log.d(TAG, "❌ No Steam profile found for '$appUsername'")
                    return@withContext null
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching Steam stats for '$appUsername': ${e.message}", e)
                return@withContext null
            }
        }
    }
    
    private fun getSteamId(appUsername: String): String? {
        Log.d(TAG, "=== GETTING STEAM ID ===")
        Log.d(TAG, "App username: '$appUsername'")
        
        // First check stored mappings
        val storedMappings = getSteamIdMappings()
        Log.d(TAG, "Stored mappings: $storedMappings")
        val storedMapping = storedMappings[appUsername]
        if (storedMapping != null) {
            Log.d(TAG, "✅ Found stored mapping: '$appUsername' -> '$storedMapping'")
            return storedMapping
        }
        
        // Fall back to hardcoded mappings
        val hardcodedMapping = manualSteamIdMappings[appUsername]
        Log.d(TAG, "Hardcoded mapping for '$appUsername': $hardcodedMapping")
        
        if (hardcodedMapping != null) {
            Log.d(TAG, "✅ Found hardcoded mapping: '$appUsername' -> '$hardcodedMapping'")
            return hardcodedMapping
        }
        
        Log.d(TAG, "❌ No Steam ID mapping found for '$appUsername'")
        return null
    }
    
    private suspend fun fetchSteamProfile(steamId: String): JSONObject? {
        return withContext(Dispatchers.IO) {
            try {
                val url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=$STEAM_API_KEY&steamids=$steamId"
                Log.d(TAG, "Fetching Steam profile: $url")
                
                val response = URL(url).readText()
                val json = JSONObject(response)
                val responseObj = json.getJSONObject("response")
                val players = responseObj.getJSONArray("players")
                
                if (players.length() > 0) {
                    players.getJSONObject(0)
                } else {
                    null
                }
                
            } catch (e: Exception) {
                Log.w(TAG, "Error fetching Steam profile for $steamId: ${e.message}")
                null
            }
        }
    }
    
    private suspend fun fetchRecentlyPlayedGames(steamId: String): List<SteamGame>? {
        return withContext(Dispatchers.IO) {
            try {
                val url = "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=$STEAM_API_KEY&steamid=$steamId&count=10&format=json"
                Log.d(TAG, "Fetching recently played games: $url")
                
                val response = URL(url).readText()
                val json = JSONObject(response)
                val responseObj = json.getJSONObject("response")
                
                if (responseObj.has("games")) {
                    val gamesArray = responseObj.getJSONArray("games")
                    val games = mutableListOf<SteamGame>()
                    
                    for (i in 0 until gamesArray.length()) {
                        val gameObj = gamesArray.getJSONObject(i)
                        val game = SteamGame(
                            appId = gameObj.getInt("appid"),
                            name = gameObj.getString("name"),
                            playtime = gameObj.getInt("playtime_2weeks")
                        )
                        games.add(game)
                    }
                    
                    games
                } else {
                    emptyList()
                }
                
            } catch (e: Exception) {
                Log.w(TAG, "Error fetching recently played games for $steamId: ${e.message}")
                null
            }
        }
    }
    
    private fun getStatusText(personaState: Int): String {
        return when (personaState) {
            0 -> "Offline"
            1 -> "Online"
            2 -> "Busy"
            3 -> "Away"
            4 -> "Snooze"
            5 -> "Looking to Trade"
            6 -> "Looking to Play"
            else -> "Unknown"
        }
    }
    
    private fun getLastOnlineText(lastLogoff: Long): String {
        val currentTime = System.currentTimeMillis() / 1000
        val diffSeconds = currentTime - lastLogoff
        
        return when {
            diffSeconds < 60 -> "Just now"
            diffSeconds < 3600 -> "${diffSeconds / 60} minutes ago"
            diffSeconds < 86400 -> "${diffSeconds / 3600} hours ago"
            else -> "${diffSeconds / 86400} days ago"
        }
    }
    
    private fun calculateTotalPlaytime(games: List<SteamGame>?): String {
        if (games == null) return "0h"
        
        val totalMinutes = games.sumOf { it.playtime }
        val hours = totalMinutes / 60
        return "${hours}h"
    }
    
    // Username mapping functions
    fun addSteamIdMapping(appUsername: String, steamId: String) {
        try {
            val mappingsData = sharedPrefs.getString(KEY_STEAM_ID_MAPPINGS, "{}")
            val mappings = JSONObject(mappingsData)
            mappings.put(appUsername, steamId)
            sharedPrefs.edit().putString(KEY_STEAM_ID_MAPPINGS, mappings.toString()).apply()
            
            Log.d(TAG, "Saved Steam ID mapping: $appUsername -> $steamId")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving Steam ID mapping", e)
        }
    }
    
    fun getSteamIdMappings(): Map<String, String> {
        try {
            val mappingsData = sharedPrefs.getString(KEY_STEAM_ID_MAPPINGS, "{}")
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
            Log.e(TAG, "Error reading Steam ID mappings", e)
            return emptyMap()
        }
    }
    
    // Caching functions
    private fun cacheStats(username: String, stats: SteamStats) {
        try {
            val cachedData = sharedPrefs.getString(KEY_CACHED_STATS, "{}")
            val cache = JSONObject(cachedData)
            
            // Convert stats to JSON (simplified for now)
            val statsJson = JSONObject().apply {
                put("steamId", stats.steamId)
                put("username", stats.username)
                put("status", stats.status)
                put("lastOnline", stats.lastOnline)
                put("totalGames", stats.totalGames)
                put("totalPlaytime", stats.totalPlaytime)
            }
            
            cache.put(username, statsJson)
            sharedPrefs.edit().putString(KEY_CACHED_STATS, cache.toString()).apply()
            
            Log.d(TAG, "Cached Steam stats for $username")
        } catch (e: Exception) {
            Log.e(TAG, "Error caching Steam stats", e)
        }
    }
    
    fun clearCache() {
        sharedPrefs.edit().remove(KEY_CACHED_STATS).apply()
        Log.d(TAG, "Steam stats cache cleared")
    }
} 