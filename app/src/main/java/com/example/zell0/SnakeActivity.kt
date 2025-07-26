package com.example.zell0

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import android.os.Handler
import android.widget.Button
import android.widget.TextView
import android.widget.ListView
import android.widget.ArrayAdapter
import com.example.zell0.NetworkManager.SnakeScore
import android.widget.ImageView
import com.google.android.material.bottomsheet.BottomSheetBehavior
import android.view.View
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.LinearLayoutManager
import android.view.LayoutInflater
import android.view.ViewGroup
import android.content.Intent
import android.util.Log

class SnakeActivity : AppCompatActivity() {
    private lateinit var snakeGameView: SnakeGameView
    private lateinit var scoreText: TextView
    private lateinit var timeText: TextView
    private lateinit var highScoreText: TextView
    private var highScore = 0
    private val handler = Handler()
    private val updateStatsRunnable = object : Runnable {
        override fun run() {
            if (::snakeGameView.isInitialized) {
                val score = snakeGameView.getScore()
                val time = snakeGameView.getTimeSeconds()
                scoreText.text = "Score: $score"
                timeText.text = "Time: ${time}s"
                if (score > highScore) {
                    highScore = score
                    highScoreText.text = "High Score: $highScore"
                }
                if (!snakeGameView.isGameOver()) {
                    handler.postDelayed(this, 200)
                }
            }
        }
    }

    private lateinit var leaderboardRecyclerView: RecyclerView
    private lateinit var leaderboardAdapter: SnakeLeaderboardAdapter
    private var leaderboardData: MutableList<SnakeScore> = mutableListOf()
    private lateinit var networkManager: NetworkManager
    private var username: String = ""
    private lateinit var newGameButton: Button
    private lateinit var bottomSheet: View
    private lateinit var bottomSheetBehavior: BottomSheetBehavior<View>
    private lateinit var pauseResumeButton: Button
    private var isPaused = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_snake)

        // New Game button
        newGameButton = findViewById(R.id.btnNewGame)
        newGameButton.setOnClickListener {
            if (!snakeGameView.isGameOver()) submitScoreIfNeeded()
            resetGame()
        }

        // Bottom sheet setup
        bottomSheet = findViewById(R.id.scoreboardBottomSheet)
        bottomSheetBehavior = BottomSheetBehavior.from(bottomSheet)
        bottomSheetBehavior.state = BottomSheetBehavior.STATE_COLLAPSED
        bottomSheetBehavior.peekHeight = 80 // Show drag handle and title
        // Optionally, set max height or allow full expansion
        // bottomSheetBehavior.isFitToContents = true

        // Optionally, add a click to expand/collapse
        bottomSheet.setOnClickListener {
            if (bottomSheetBehavior.state == BottomSheetBehavior.STATE_EXPANDED) {
                bottomSheetBehavior.state = BottomSheetBehavior.STATE_COLLAPSED
            } else {
                bottomSheetBehavior.state = BottomSheetBehavior.STATE_EXPANDED
            }
        }

        // Pause/Resume button
        pauseResumeButton = findViewById(R.id.btnPauseResume)
        pauseResumeButton.setOnClickListener {
            if (isPaused) {
                snakeGameView.resumeGame()
                isPaused = false
                pauseResumeButton.text = "Pause"
            } else {
                snakeGameView.pauseGame()
                isPaused = true
                pauseResumeButton.text = "Resume"
            }
        }
        pauseResumeButton.text = "Pause"

        // Attach SnakeGameView
        val boardContainer = findViewById<android.widget.FrameLayout>(R.id.snakeGameBoard)
        snakeGameView = SnakeGameView(this)
        boardContainer.addView(
            snakeGameView,
            android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        // D-pad controls
        findViewById<Button>(R.id.btnUp).setOnClickListener { snakeGameView.setDirection(SnakeGameView.Direction.UP) }
        findViewById<Button>(R.id.btnDown).setOnClickListener { snakeGameView.setDirection(SnakeGameView.Direction.DOWN) }
        findViewById<Button>(R.id.btnLeft).setOnClickListener { snakeGameView.setDirection(SnakeGameView.Direction.LEFT) }
        findViewById<Button>(R.id.btnRight).setOnClickListener { snakeGameView.setDirection(SnakeGameView.Direction.RIGHT) }

        // Stats UI
        scoreText = findViewById(R.id.scoreText)
        timeText = findViewById(R.id.timeText)
        highScoreText = findViewById(R.id.highScoreText)
        highScore = 0
        handler.post(updateStatsRunnable)

        // Leaderboard RecyclerView
        leaderboardRecyclerView = findViewById(R.id.leaderboardRecyclerView)
        leaderboardAdapter = SnakeLeaderboardAdapter(leaderboardData)
        leaderboardRecyclerView.layoutManager = LinearLayoutManager(this)
        leaderboardRecyclerView.adapter = leaderboardAdapter

        // Get username from LoginActivity
        val user = LoginActivity.getCurrentUser(this)
        username = user?.username ?: "anonymous"

        // Get network manager
        networkManager = MainActivity.getNetworkManager() ?: NetworkManager().also { it.connect(username, user) }

        // Fetch leaderboard on start
        fetchAndDisplayLeaderboard()
        // Listen for real-time leaderboard updates
        networkManager.setSnakeLeaderboardListener { updateLeaderboardUI(it) }

        // Set up game over callback instead of continuous polling
        snakeGameView.setGameOverCallback {
            runOnUiThread {
                Log.d("SnakeActivity", "Game over detected via callback")
                submitScoreIfNeeded()
            }
        }
    }

    private var scoreSubmitted = false
    private fun submitScoreIfNeeded() {
        if (scoreSubmitted) return
        scoreSubmitted = true
        val score = snakeGameView.getScore()
        val time = snakeGameView.getTimeSeconds()
        val pieces = score // In this game, pieces collected = score
        
        Log.d("SnakeActivity", "Submitting score: username=$username, score=$score, time=$time, pieces=$pieces")
        
        networkManager.submitSnakeScore(username, score, time, pieces) { success, error ->
            Log.d("SnakeActivity", "Score submission result: success=$success, error=$error")
            runOnUiThread {
                if (success) {
                    Log.d("SnakeActivity", "Score submitted successfully, fetching leaderboard")
                    fetchAndDisplayLeaderboard()
                } else {
                    Log.e("SnakeActivity", "Failed to submit score: $error")
                    // Retry submission after a delay
                    handler.postDelayed({
                        scoreSubmitted = false
                        submitScoreIfNeeded()
                    }, 2000)
                }
            }
        }
    }

    private fun fetchAndDisplayLeaderboard() {
        Log.d("SnakeActivity", "Fetching leaderboard...")
        networkManager.getSnakeLeaderboard { scores ->
            Log.d("SnakeActivity", "Received ${scores.size} scores from server")
            runOnUiThread { updateLeaderboardUI(scores) }
        }
    }

    private fun updateLeaderboardUI(scores: List<SnakeScore>) {
        runOnUiThread {
            leaderboardData.clear()
            leaderboardData.addAll(scores.filter {
                val name = it.username.lowercase()
                name != "test" && name != "admin" && name != "anonymous" && name.isNotBlank()
            })
            leaderboardAdapter.notifyDataSetChanged()
        }
    }

    private fun resetGame() {
        scoreSubmitted = false
        snakeGameView.resetGame()
        handler.post(updateStatsRunnable)
        
        // Ensure game over callback is set up for the new game
        snakeGameView.setGameOverCallback {
            runOnUiThread {
                Log.d("SnakeActivity", "Game over detected via callback (after reset)")
                submitScoreIfNeeded()
            }
        }
        
        // Fetch and update leaderboard
        fetchAndDisplayLeaderboard()
    }

    override fun onPause() {
        super.onPause()
        if (snakeGameView.isGameOver()) {
            submitScoreIfNeeded()
        }
        snakeGameView.pauseGame()
        isPaused = true
        pauseResumeButton.text = "Resume"
    }
    override fun onResume() {
        super.onResume()
        if (isPaused) {
            snakeGameView.resumeGame()
            isPaused = false
            pauseResumeButton.text = "Pause"
        }
    }
}

// Adapter for RecyclerView
class SnakeLeaderboardAdapter(private val items: List<NetworkManager.SnakeScore>) : RecyclerView.Adapter<SnakeLeaderboardAdapter.ViewHolder>() {
    class ViewHolder(val view: View) : RecyclerView.ViewHolder(view) {
        val trophyIcon: ImageView = view.findViewById(R.id.trophyIcon)
        val nameText: TextView = view.findViewById(R.id.leaderboardUsername)
        val scoreText: TextView = view.findViewById(R.id.leaderboardScore)
        val timeText: TextView = view.findViewById(R.id.leaderboardTime)
    }
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val v = LayoutInflater.from(parent.context).inflate(R.layout.item_snake_leaderboard, parent, false)
        return ViewHolder(v)
    }
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val s = items[position]
        holder.nameText.text = s.username
        holder.scoreText.text = s.score.toString()
        holder.timeText.text = "${s.time}s"
        // Trophy icons for top 3
        when (position) {
            0 -> {
                holder.trophyIcon.setImageResource(R.drawable.ic_trophy_gold)
                holder.trophyIcon.visibility = View.VISIBLE
            }
            1 -> {
                holder.trophyIcon.setImageResource(R.drawable.ic_trophy_silver)
                holder.trophyIcon.visibility = View.VISIBLE
            }
            2 -> {
                holder.trophyIcon.setImageResource(R.drawable.ic_trophy_bronze)
                holder.trophyIcon.visibility = View.VISIBLE
            }
            else -> {
                holder.trophyIcon.visibility = View.GONE
            }
        }
    }
    override fun getItemCount() = items.size
} 