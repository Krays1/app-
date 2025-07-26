package com.example.zell0

import android.content.Intent
import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import android.view.View

class PacmanActivity : AppCompatActivity() {
    
    private lateinit var pacmanGameView: PacmanGameView
    private lateinit var scoreText: TextView
    private lateinit var levelText: TextView
    private lateinit var livesText: TextView
    private lateinit var newGameButton: Button
    private lateinit var scoreboardButton: Button
    private lateinit var pauseButton: Button
    private lateinit var volumeSeekBar: SeekBar
    private lateinit var muteButton: Button
    private lateinit var upButton: ImageButton
    private lateinit var downButton: ImageButton
    private lateinit var leftButton: ImageButton
    private lateinit var rightButton: ImageButton

    private var networkManager: NetworkManager? = null
    private var isMuted = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pacman)

        initializeViews()
        setupClickListeners()
        setupVolumeControl()
        setupGameView()
        setupNetworkManager()
        startGameLoop()
    }

    private fun initializeViews() {
        pacmanGameView = findViewById(R.id.pacmanGameView)
        scoreText = findViewById(R.id.scoreText)
        levelText = findViewById(R.id.levelText)
        livesText = findViewById(R.id.livesText)
        newGameButton = findViewById(R.id.newGameButton)
        scoreboardButton = findViewById(R.id.scoreboardButton)
        pauseButton = findViewById(R.id.pauseButton)
        volumeSeekBar = findViewById(R.id.volumeSeekBar)
        muteButton = findViewById(R.id.muteButton)
        upButton = findViewById(R.id.upButton)
        downButton = findViewById(R.id.downButton)
        leftButton = findViewById(R.id.leftButton)
        rightButton = findViewById(R.id.rightButton)
    }

    private fun setupClickListeners() {
        // Control buttons
        newGameButton.setOnClickListener {
            pacmanGameView.newGame()
            updateUI()
        }

        scoreboardButton.setOnClickListener {
            val intent = Intent(this, PacmanScoreboardActivity::class.java)
            startActivity(intent)
        }

        pauseButton.setOnClickListener {
            pacmanGameView.pauseGame()
            updatePauseButton()
        }



        // Directional controls
        upButton.setOnClickListener {
            android.util.Log.d("PacmanActivity", "Up button pressed")
            pacmanGameView.setNextDirection(PacmanGameView.Direction.UP)
        }

        downButton.setOnClickListener {
            android.util.Log.d("PacmanActivity", "Down button pressed")
            pacmanGameView.setNextDirection(PacmanGameView.Direction.DOWN)
        }

        leftButton.setOnClickListener {
            android.util.Log.d("PacmanActivity", "Left button pressed")
            pacmanGameView.setNextDirection(PacmanGameView.Direction.LEFT)
        }

        rightButton.setOnClickListener {
            android.util.Log.d("PacmanActivity", "Right button pressed")
            pacmanGameView.setNextDirection(PacmanGameView.Direction.RIGHT)
        }

        // Mute button
        muteButton.setOnClickListener {
            isMuted = !isMuted
            pacmanGameView.setMuted(isMuted)
            updateMuteButton()
        }
    }

    private fun setupVolumeControl() {
        volumeSeekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser) {
                    val volume = progress / 100f
                    pacmanGameView.setVolume(volume)
                }
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {}
        })
    }

    private fun setupGameView() {
        // Set up game view callbacks
        pacmanGameView.setOnGameStateChangeListener(object : PacmanGameView.OnGameStateChangeListener {
            override fun onScoreChanged(score: Int) {
                runOnUiThread {
                    scoreText.text = "SCORE: $score"
                }
            }

            override fun onLevelChanged(level: Int) {
                runOnUiThread {
                    levelText.text = "LEVEL: $level"
                }
            }

            override fun onLivesChanged(lives: Int) {
                runOnUiThread {
                    livesText.text = "LIVES: $lives"
                }
            }

            override fun onGameOver(score: Int, level: Int, dotsEaten: Int) {
                runOnUiThread {
                    submitScore(score, level, dotsEaten)
                    showGameOverDialog(score, level)
                }
            }
        })
    }

    private fun setupNetworkManager() {
        networkManager = MainActivity.getNetworkManager() ?: NetworkManager()
    }

    private fun startGameLoop() {
        // Update UI every 100ms
        val uiUpdateRunnable = object : Runnable {
            override fun run() {
                updateUI()
                handler.postDelayed(this, 100)
            }
        }
        handler.post(uiUpdateRunnable)
    }

    private fun updateUI() {
        scoreText.text = "SCORE: ${pacmanGameView.getScore()}"
        levelText.text = "LEVEL: ${pacmanGameView.getLevel()}"
        livesText.text = "LIVES: ${pacmanGameView.getLives()}"
        updatePauseButton()
    }

    private fun updatePauseButton() {
        if (pacmanGameView.isPaused()) {
            pauseButton.text = "RESUME"
        } else {
            pauseButton.text = "PAUSE"
        }
    }

    private fun updateMuteButton() {
        if (isMuted) {
            muteButton.text = "UNMUTE"
        } else {
            muteButton.text = "MUTE"
        }
    }

    private fun submitScore(score: Int, level: Int, dotsEaten: Int) {
        networkManager?.submitPacmanScore(
            username = "Player", // TODO: Get actual username
            score = score,
            level = level,
            dotsEaten = dotsEaten
        ) { success ->
            if (success) {
                runOnUiThread {
                    Toast.makeText(this, "Score submitted successfully!", Toast.LENGTH_SHORT).show()
                }
            } else {
                runOnUiThread {
                    Toast.makeText(this, "Failed to submit score", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun showGameOverDialog(score: Int, level: Int) {
        val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("Game Over!")
            .setMessage("Final Score: $score\nLevel: $level")
            .setPositiveButton("New Game") { _, _ ->
                pacmanGameView.newGame()
            }
            .setNegativeButton("Main Menu") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .create()
        
        dialog.show()
    }

    override fun onResume() {
        super.onResume()
        // Resume game if it was paused
        if (pacmanGameView.isPaused()) {
            pacmanGameView.pauseGame()
        }
    }

    override fun onPause() {
        super.onPause()
        // Pause game when activity is paused
        if (!pacmanGameView.isPaused()) {
            pacmanGameView.pauseGame()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // Clean up resources
        networkManager?.disconnect()
    }

    companion object {
        private val handler = android.os.Handler(android.os.Looper.getMainLooper())
    }
} 