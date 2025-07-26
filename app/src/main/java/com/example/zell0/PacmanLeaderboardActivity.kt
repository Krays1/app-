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

class PacmanLeaderboardActivity : AppCompatActivity() {
    private lateinit var networkManager: NetworkManager
    private lateinit var recyclerView: RecyclerView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pacman_leaderboard)

        networkManager = MainActivity.getNetworkManager() ?: NetworkManager()
        recyclerView = findViewById(R.id.pacmanLeaderboardRecyclerView)
        recyclerView.layoutManager = LinearLayoutManager(this)

        loadLeaderboard()
    }

    private fun loadLeaderboard() {
        networkManager.getPacmanLeaderboard { success, data ->
            runOnUiThread {
                if (success && data != null) {
                    displayLeaderboard(data)
                } else {
                    // Show empty state
                    displayLeaderboard("[]")
                }
            }
        }
    }

    private fun displayLeaderboard(data: String) {
        try {
            val jsonArray = JSONArray(data)
            val scores = mutableListOf<PacmanScore>()

            for (i in 0 until jsonArray.length()) {
                val scoreObj = jsonArray.getJSONObject(i)
                scores.add(PacmanScore(
                    username = scoreObj.getString("username"),
                    score = scoreObj.getInt("score"),
                    level = scoreObj.getInt("level"),
                    dotsEaten = scoreObj.getInt("dotsEaten")
                ))
            }

            // Sort by score (highest first) and take top 10
            val topScores = scores.sortedByDescending { it.score }.take(10)
            recyclerView.adapter = PacmanLeaderboardAdapter(topScores)

        } catch (e: Exception) {
            // Handle parsing errors
        }
    }

    data class PacmanScore(
        val username: String,
        val score: Int,
        val level: Int,
        val dotsEaten: Int
    )

    class PacmanLeaderboardAdapter(private val scores: List<PacmanScore>) :
        RecyclerView.Adapter<PacmanLeaderboardAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val rankText: TextView = view.findViewById(R.id.rankText)
            val usernameText: TextView = view.findViewById(R.id.usernameText)
            val scoreText: TextView = view.findViewById(R.id.scoreText)
            val levelText: TextView = view.findViewById(R.id.levelText)
            val dotsText: TextView = view.findViewById(R.id.dotsText)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_pacman_leaderboard, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val score = scores[position]
            holder.rankText.text = "#${position + 1}"
            holder.usernameText.text = score.username
            holder.scoreText.text = "Score: ${score.score}"
            holder.levelText.text = "Level: ${score.level}"
            holder.dotsText.text = "Dots: ${score.dotsEaten}"

            // Color coding for top 3
            when (position) {
                0 -> holder.rankText.setTextColor(android.graphics.Color.parseColor("#FFD700")) // Gold
                1 -> holder.rankText.setTextColor(android.graphics.Color.parseColor("#C0C0C0")) // Silver
                2 -> holder.rankText.setTextColor(android.graphics.Color.parseColor("#CD7F32")) // Bronze
                else -> holder.rankText.setTextColor(android.graphics.Color.WHITE)
            }
        }

        override fun getItemCount() = scores.size
    }
} 