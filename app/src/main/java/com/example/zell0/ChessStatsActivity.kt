package com.example.zell0

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.android.volley.Request
import com.android.volley.toolbox.JsonObjectRequest
import com.android.volley.toolbox.Volley
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class ChessStatsActivity : AppCompatActivity() {
    private lateinit var overallStatsLayout: LinearLayout
    private lateinit var topPlayersRecyclerView: RecyclerView
    private lateinit var recentGamesRecyclerView: RecyclerView
    private lateinit var loadingSpinner: ProgressBar
    private lateinit var errorText: TextView
    private lateinit var refreshButton: Button
    
    private val serverUrl = "https://app--dependable-unity-production.up.railway.app"
    private val dateFormat = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_chess_stats)
        
        initializeViews()
        loadChessStats()
    }

    private fun initializeViews() {
        overallStatsLayout = findViewById(R.id.overallStatsLayout)
        topPlayersRecyclerView = findViewById(R.id.topPlayersRecyclerView)
        recentGamesRecyclerView = findViewById(R.id.recentGamesRecyclerView)
        loadingSpinner = findViewById(R.id.loadingSpinner)
        errorText = findViewById(R.id.errorText)
        refreshButton = findViewById(R.id.refreshButton)
        
        // Setup RecyclerViews
        topPlayersRecyclerView.layoutManager = LinearLayoutManager(this)
        recentGamesRecyclerView.layoutManager = LinearLayoutManager(this)
        
        refreshButton.setOnClickListener {
            loadChessStats()
        }
    }

    private fun loadChessStats() {
        showLoading(true)
        
        val request = JsonObjectRequest(
            Request.Method.GET,
            "$serverUrl/api/chess/stats",
            null,
            { response ->
                showLoading(false)
                displayStats(response)
            },
            { error ->
                showLoading(false)
                showError("Failed to load chess stats: ${error.message}")
            }
        )
        
        Volley.newRequestQueue(this).add(request)
    }

    private fun displayStats(response: JSONObject) {
        try {
            // Display overall stats
            val overall = response.getJSONObject("overall")
            displayOverallStats(overall)
            
            // Display top players
            val topPlayers = response.getJSONArray("topPlayers")
            displayTopPlayers(topPlayers)
            
            // Display recent games
            val recentGames = response.getJSONArray("recentGames")
            displayRecentGames(recentGames)
            
        } catch (e: Exception) {
            showError("Error parsing stats: ${e.message}")
        }
    }

    private fun displayOverallStats(overall: JSONObject) {
        val totalGames = overall.getInt("totalGames")
        val totalWins = overall.getInt("totalWins")
        val totalDraws = overall.getInt("totalDraws")
        val uniquePlayers = overall.getInt("uniquePlayers")
        
        // Create stats cards
        overallStatsLayout.removeAllViews()
        
        addStatCard("Total Games", totalGames.toString(), R.color.blue)
        addStatCard("Total Wins", totalWins.toString(), R.color.green)
        addStatCard("Total Draws", totalDraws.toString(), R.color.orange)
        addStatCard("Unique Players", uniquePlayers.toString(), R.color.purple)
    }

    private fun addStatCard(title: String, value: String, colorRes: Int) {
        val cardView = layoutInflater.inflate(R.layout.chess_stat_card, overallStatsLayout, false)
        
        cardView.findViewById<TextView>(R.id.statTitle).text = title
        cardView.findViewById<TextView>(R.id.statValue).text = value
        cardView.findViewById<View>(R.id.statColorBar).setBackgroundResource(colorRes)
        
        overallStatsLayout.addView(cardView)
    }

    private fun displayTopPlayers(topPlayers: org.json.JSONArray) {
        val players = mutableListOf<ChessPlayer>()
        
        for (i in 0 until topPlayers.length()) {
            val player = topPlayers.getJSONObject(i)
            players.add(
                ChessPlayer(
                    name = player.getString("name"),
                    wins = player.getInt("wins"),
                    losses = player.getInt("losses"),
                    draws = player.getInt("draws"),
                    winRate = player.getString("winRate")
                )
            )
        }
        
        topPlayersRecyclerView.adapter = ChessPlayerAdapter(players)
    }

    private fun displayRecentGames(recentGames: org.json.JSONArray) {
        val games = mutableListOf<ChessGame>()
        
        for (i in 0 until recentGames.length()) {
            val game = recentGames.getJSONObject(i)
            val winner = when (game.getString("winner")) {
                "white" -> game.getString("whitePlayer")
                "black" -> game.getString("blackPlayer")
                else -> "Draw"
            }
            
            games.add(
                ChessGame(
                    whitePlayer = game.getString("whitePlayer"),
                    blackPlayer = game.getString("blackPlayer"),
                    winner = winner,
                    duration = game.getString("duration"),
                    endTime = game.getString("endTime")
                )
            )
        }
        
        recentGamesRecyclerView.adapter = ChessGameAdapter(games)
    }

    private fun showLoading(show: Boolean) {
        loadingSpinner.visibility = if (show) View.VISIBLE else View.GONE
        errorText.visibility = View.GONE
    }

    private fun showError(message: String) {
        errorText.text = message
        errorText.visibility = View.VISIBLE
        loadingSpinner.visibility = View.GONE
    }

    data class ChessPlayer(
        val name: String,
        val wins: Int,
        val losses: Int,
        val draws: Int,
        val winRate: String
    )

    data class ChessGame(
        val whitePlayer: String,
        val blackPlayer: String,
        val winner: String,
        val duration: String,
        val endTime: String
    )

    inner class ChessPlayerAdapter(private val players: List<ChessPlayer>) : 
        RecyclerView.Adapter<ChessPlayerAdapter.ViewHolder>() {

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val rankText: TextView = view.findViewById(R.id.rankText)
            val nameText: TextView = view.findViewById(R.id.playerNameText)
            val statsText: TextView = view.findViewById(R.id.playerStatsText)
            val winRateText: TextView = view.findViewById(R.id.winRateText)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_chess_player, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val player = players[position]
            
            holder.rankText.text = "#${position + 1}"
            holder.nameText.text = player.name
            holder.statsText.text = "${player.wins}W/${player.losses}L/${player.draws}D"
            holder.winRateText.text = "${player.winRate}%"
            
            // Color code based on rank
            when (position) {
                0 -> holder.rankText.setTextColor(0xFFFFD700.toInt()) // Gold
                1 -> holder.rankText.setTextColor(0xFFC0C0C0.toInt()) // Silver
                2 -> holder.rankText.setTextColor(0xFFCD7F32.toInt()) // Bronze
                else -> holder.rankText.setTextColor(0xFF000000.toInt()) // Black
            }
        }

        override fun getItemCount() = players.size
    }

    inner class ChessGameAdapter(private val games: List<ChessGame>) : 
        RecyclerView.Adapter<ChessGameAdapter.ViewHolder>() {

        inner class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val gameText: TextView = view.findViewById(R.id.gameText)
            val resultText: TextView = view.findViewById(R.id.resultText)
            val durationText: TextView = view.findViewById(R.id.durationText)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_chess_game, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val game = games[position]
            
            holder.gameText.text = "${game.whitePlayer} vs ${game.blackPlayer}"
            holder.resultText.text = game.winner
            holder.durationText.text = game.duration
            
            // Color code the result
            when (game.winner) {
                "Draw" -> holder.resultText.setTextColor(0xFFFFA500.toInt()) // Orange
                else -> holder.resultText.setTextColor(0xFF00FF00.toInt()) // Green for wins
            }
        }

        override fun getItemCount() = games.size
    }
} 