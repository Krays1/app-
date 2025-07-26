package com.example.zell0

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import org.json.JSONArray
import org.json.JSONObject

class PacmanScoreboardActivity : AppCompatActivity() {
    private lateinit var networkManager: NetworkManager
    private lateinit var recyclerView: RecyclerView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pacman_scoreboard)

        networkManager = MainActivity.getNetworkManager() ?: NetworkManager()
        recyclerView = findViewById(R.id.topPlayersRecyclerView)
        recyclerView.layoutManager = LinearLayoutManager(this)

        loadPacmanStats()
    }

    private fun loadPacmanStats() {
        networkManager.getPacmanLeaderboard { success, data ->
            runOnUiThread {
                if (success && data != null) {
                    displayStats(data)
                } else {
                    // Show error or empty state
                    displayStats("[]")
                }
            }
        }
    }

    private fun displayStats(data: String) {
        try {
            val jsonArray = JSONArray(data)
            val stats = mutableListOf<PacmanUserStats>()
            val userStatsMap = mutableMapOf<String, PacmanUserStats>()

            // Parse all scores and aggregate by user
            for (i in 0 until jsonArray.length()) {
                val scoreObj = jsonArray.getJSONObject(i)
                val username = scoreObj.getString("username")
                val score = scoreObj.getInt("score")
                val level = scoreObj.getInt("level")
                val dotsEaten = scoreObj.getInt("dotsEaten")

                val userStats = userStatsMap.getOrPut(username) {
                    PacmanUserStats(username, 0, 0, 0, 0, 0)
                }

                userStats.totalScore += score
                userStats.gamesPlayed++
                userStats.highestScore = maxOf(userStats.highestScore, score)
                userStats.highestLevel = maxOf(userStats.highestLevel, level)
                userStats.totalDotsEaten += dotsEaten
            }

            // Convert to list and sort by total score
            stats.addAll(userStatsMap.values)
            stats.sortByDescending { it.totalScore }

            // Display overall stats
            displayOverallStats(stats)

            // Display top players
            val topPlayers = stats.take(10)
            recyclerView.adapter = PacmanPlayerAdapter(topPlayers)

        } catch (e: Exception) {
            // Handle parsing errors
        }
    }

    private fun displayOverallStats(stats: List<PacmanUserStats>) {
        if (stats.isNotEmpty()) {
            val totalGames = stats.sumOf { it.gamesPlayed }
            val totalScore = stats.sumOf { it.totalScore }
            val avgScore = if (totalGames > 0) totalScore / totalGames else 0
            val highestScore = stats.maxOfOrNull { it.highestScore } ?: 0

            findViewById<TextView>(R.id.totalGamesText).text = "Total Games: $totalGames"
            findViewById<TextView>(R.id.totalScoreText).text = "Total Score: $totalScore"
            findViewById<TextView>(R.id.avgScoreText).text = "Average Score: $avgScore"
            findViewById<TextView>(R.id.highestScoreText).text = "Highest Score: $highestScore"
            findViewById<TextView>(R.id.highestLevelText).text = "Highest Level: ${stats.maxOfOrNull { it.highestLevel } ?: 0}"
        }
    }

    data class PacmanUserStats(
        val username: String,
        var totalScore: Int,
        var gamesPlayed: Int,
        var highestScore: Int,
        var highestLevel: Int,
        var totalDotsEaten: Int
    )

    class PacmanPlayerAdapter(private val players: List<PacmanUserStats>) :
        RecyclerView.Adapter<PacmanPlayerAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val rankText: TextView = view.findViewById(R.id.rankText)
            val usernameText: TextView = view.findViewById(R.id.usernameText)
            val totalScoreText: TextView = view.findViewById(R.id.totalScoreText)
            val gamesPlayedText: TextView = view.findViewById(R.id.gamesPlayedText)
            val highestScoreText: TextView = view.findViewById(R.id.highestScoreText)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_pacman_player, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val player = players[position]
            holder.rankText.text = "${position + 1}"
            holder.usernameText.text = player.username
            holder.totalScoreText.text = "Total Score: ${player.totalScore}"
            holder.gamesPlayedText.text = "Games: ${player.gamesPlayed}"
            holder.highestScoreText.text = "Best: ${player.highestScore}"

            // Color coding for top 3
            when (position) {
                0 -> holder.rankText.setTextColor(android.graphics.Color.parseColor("#FFD700")) // Gold
                1 -> holder.rankText.setTextColor(android.graphics.Color.parseColor("#C0C0C0")) // Silver
                2 -> holder.rankText.setTextColor(android.graphics.Color.parseColor("#CD7F32")) // Bronze
                else -> holder.rankText.setTextColor(android.graphics.Color.WHITE)
            }
        }

        override fun getItemCount() = players.size
    }
} 