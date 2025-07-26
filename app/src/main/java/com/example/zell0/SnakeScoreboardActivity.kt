package com.example.zell0

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.util.Log

class SnakeScoreboardActivity : AppCompatActivity() {
    private lateinit var overallStatsLayout: LinearLayout
    private lateinit var topPlayersRecyclerView: RecyclerView
    private lateinit var loadingSpinner: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var emptyStateText: TextView
    private lateinit var refreshButton: Button
    private lateinit var networkManager: NetworkManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_snake_scoreboard)
        
        Log.d("SnakeScoreboard", "Activity created")
        networkManager = MainActivity.getNetworkManager() ?: NetworkManager()
        initializeViews()
        loadSnakeStats()
    }

    private fun initializeViews() {
        overallStatsLayout = findViewById(R.id.overallStatsLayout)
        topPlayersRecyclerView = findViewById(R.id.topPlayersRecyclerView)
        loadingSpinner = findViewById(R.id.loadingSpinner)
        errorText = findViewById(R.id.errorText)
        emptyStateText = findViewById(R.id.emptyStateText)
        refreshButton = findViewById(R.id.refreshButton)
        
        // Setup RecyclerView
        topPlayersRecyclerView.layoutManager = LinearLayoutManager(this)
        
        refreshButton.setOnClickListener {
            Log.d("SnakeScoreboard", "Refresh button clicked")
            loadSnakeStats()
        }
    }

    private fun loadSnakeStats() {
        Log.d("SnakeScoreboard", "Loading Snake stats...")
        showLoading(true)
        
        networkManager.getSnakeLeaderboard { scores ->
            Log.d("SnakeScoreboard", "Received ${scores.size} scores from server")
            runOnUiThread {
                showLoading(false)
                if (scores.isEmpty()) {
                    Log.d("SnakeScoreboard", "No scores found, showing empty state")
                    showEmptyState()
                } else {
                    Log.d("SnakeScoreboard", "Displaying stats for ${scores.size} scores")
                    displayStats(scores)
                }
            }
        }
    }

    private fun displayStats(scores: List<NetworkManager.SnakeScore>) {
        // Group by username to get user stats
        val userStatsMap = mutableMapOf<String, UserStats>()
        for (score in scores) {
            val stats = userStatsMap.getOrPut(score.username) { 
                UserStats(score.username, 0, 0, 0) 
            }
            stats.gamesPlayed++
            if (score.score > stats.highestScore) {
                stats.highestScore = score.score
            }
            stats.totalPieces += score.pieces
        }
        
        val userStats = userStatsMap.values.sortedByDescending { it.highestScore }
        
        // Display overall stats
        displayOverallStats(scores, userStats)
        
        // Display top players
        displayTopPlayers(userStats)
    }

    private fun displayOverallStats(scores: List<NetworkManager.SnakeScore>, userStats: List<UserStats>) {
        val totalGames = scores.size
        val uniquePlayers = userStats.size
        val highestScore = scores.maxOfOrNull { it.score } ?: 0
        val totalPieces = scores.sumOf { it.pieces }
        
        overallStatsLayout.removeAllViews()
        
        addStatCard("Total Games", totalGames.toString(), R.color.blue)
        addStatCard("Unique Players", uniquePlayers.toString(), R.color.purple)
        addStatCard("Highest Score", highestScore.toString(), R.color.green)
        addStatCard("Total Pieces", totalPieces.toString(), R.color.orange)
    }

    private fun addStatCard(title: String, value: String, colorRes: Int) {
        val cardView = layoutInflater.inflate(R.layout.snake_stat_card, overallStatsLayout, false)
        
        cardView.findViewById<TextView>(R.id.statTitle).text = title
        cardView.findViewById<TextView>(R.id.statValue).text = value
        cardView.findViewById<View>(R.id.statColorBar).setBackgroundResource(colorRes)
        
        overallStatsLayout.addView(cardView)
    }

    private fun displayTopPlayers(userStats: List<UserStats>) {
        topPlayersRecyclerView.adapter = SnakePlayerAdapter(userStats)
    }

    private fun showLoading(show: Boolean) {
        loadingSpinner.visibility = if (show) View.VISIBLE else View.GONE
        errorText.visibility = View.GONE
        emptyStateText.visibility = View.GONE
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
        loadingSpinner.visibility = View.GONE
        emptyStateText.visibility = View.GONE
    }

    private fun showEmptyState() {
        emptyStateText.visibility = View.VISIBLE
        loadingSpinner.visibility = View.GONE
        errorText.visibility = View.GONE
    }

    data class UserStats(
        val username: String,
        var gamesPlayed: Int,
        var highestScore: Int,
        var totalPieces: Int
    )

    inner class SnakePlayerAdapter(private val players: List<UserStats>) : 
        RecyclerView.Adapter<SnakePlayerAdapter.ViewHolder>() {

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val rankText: TextView = view.findViewById(R.id.rankText)
            val nameText: TextView = view.findViewById(R.id.playerNameText)
            val statsText: TextView = view.findViewById(R.id.playerStatsText)
            val highestScoreText: TextView = view.findViewById(R.id.highestScoreText)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.snake_player_row, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val player = players[position]
            val rank = position + 1
            
            holder.rankText.text = rank.toString()
            holder.nameText.text = player.username
            holder.statsText.text = "Games: ${player.gamesPlayed}"
            holder.highestScoreText.text = "Score: ${player.highestScore}"
        }

        override fun getItemCount() = players.size
    }
} 