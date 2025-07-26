package com.example.zell0

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.util.Log
import android.view.MotionEvent
import android.view.View
import kotlin.math.min

class ChessBoardView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {
    
    private val board = Array(8) { Array(8) { ChessPiece.EMPTY } }
    private val squareSize = 120f // Increased from 80f to 120f for much larger board
    private val pieceSize = 100f // Increased from 80f to 100f for larger pieces
    
    private var selectedSquare: Pair<Int, Int>? = null
    private var validMoves = mutableListOf<Pair<Int, Int>>()
    
    private var onMoveListener: ((String, String) -> Unit)? = null
    private var isMyTurn = false // Add turn state tracking
    
    private val whitePaint = Paint().apply {
        color = Color.rgb(245, 222, 179) // Light wood color (like maple)
        style = Paint.Style.FILL
    }
    
    private val blackPaint = Paint().apply {
        color = Color.rgb(101, 67, 33) // Dark wood color (like walnut)
        style = Paint.Style.FILL
    }
    
    private val selectedPaint = Paint().apply {
        color = Color.rgb(255, 215, 0) // Gold color for selection
        style = Paint.Style.FILL
        alpha = 150
    }
    
    private val validMovePaint = Paint().apply {
        color = Color.rgb(34, 139, 34) // Forest green for valid moves
        style = Paint.Style.FILL
        alpha = 120
    }
    
    private val disabledPaint = Paint().apply {
        color = Color.rgb(128, 128, 128) // Gray overlay when not player's turn
        style = Paint.Style.FILL
        alpha = 100
    }
    
    private val piecePaint = Paint().apply {
        color = Color.rgb(20, 20, 20) // Very dark black for better contrast
        style = Paint.Style.FILL
        textSize = pieceSize * 1.2f // Increased from 0.8f to 1.2f
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true // Make text bolder for better visibility
        setShadowLayer(3f, 0f, 0f, Color.rgb(255, 255, 255)) // White glow for black pieces
    }
    
    private val whitePiecePaint = Paint().apply {
        color = Color.rgb(255, 255, 255) // Pure white for maximum contrast
        style = Paint.Style.FILL
        textSize = pieceSize * 1.2f // Increased from 0.8f to 1.2f
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true // Make text bolder for better visibility
        setShadowLayer(3f, 0f, 0f, Color.rgb(0, 0, 0)) // Black glow for white pieces
    }
    
    init {
        setupInitialBoard()
    }
    
    private fun setupInitialBoard() {
        // Set up initial chess position
        // Black pieces (top)
        board[0][0] = ChessPiece.BLACK_ROOK
        board[0][1] = ChessPiece.BLACK_KNIGHT
        board[0][2] = ChessPiece.BLACK_BISHOP
        board[0][3] = ChessPiece.BLACK_QUEEN
        board[0][4] = ChessPiece.BLACK_KING
        board[0][5] = ChessPiece.BLACK_BISHOP
        board[0][6] = ChessPiece.BLACK_KNIGHT
        board[0][7] = ChessPiece.BLACK_ROOK
        
        for (i in 0..7) {
            board[1][i] = ChessPiece.BLACK_PAWN
        }
        
        // White pieces (bottom)
        board[7][0] = ChessPiece.WHITE_ROOK
        board[7][1] = ChessPiece.WHITE_KNIGHT
        board[7][2] = ChessPiece.WHITE_BISHOP
        board[7][3] = ChessPiece.WHITE_QUEEN
        board[7][4] = ChessPiece.WHITE_KING
        board[7][5] = ChessPiece.WHITE_BISHOP
        board[7][6] = ChessPiece.WHITE_KNIGHT
        board[7][7] = ChessPiece.WHITE_ROOK
        
        for (i in 0..7) {
            board[6][i] = ChessPiece.WHITE_PAWN
        }
    }
    
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        // Use the full width and height of the view
        val boardWidth = width.toFloat()
        val boardHeight = height.toFloat()
        val boardSize = min(boardWidth, boardHeight)
        
        // Center the board in the view
        val offsetX = (boardWidth - boardSize) / 2
        val offsetY = (boardHeight - boardSize) / 2
        
        // Draw board border first
        val borderPaint = Paint().apply {
            color = Color.rgb(139, 69, 19) // Dark brown border
            style = Paint.Style.FILL
        }
        canvas.drawRect(offsetX, offsetY, offsetX + boardSize, offsetY + boardSize, borderPaint)
        
        // Draw board squares with small gap for border effect
        val borderWidth = 6f // Increased from 4f to 6f for more premium look
        val innerBoardSize = boardSize - (borderWidth * 2)
        val innerSquareSize = innerBoardSize / 8
        
        for (row in 0..7) {
            for (col in 0..7) {
                val left = offsetX + borderWidth + (col * innerSquareSize)
                val top = offsetY + borderWidth + (row * innerSquareSize)
                val right = left + innerSquareSize
                val bottom = top + innerSquareSize
                
                val paint = if ((row + col) % 2 == 0) whitePaint else blackPaint
                canvas.drawRect(left, top, right, bottom, paint)
                
                // Draw selection highlight
                if (selectedSquare?.first == row && selectedSquare?.second == col) {
                    canvas.drawRect(left, top, right, bottom, selectedPaint)
                }
                
                // Draw valid move indicators
                if (validMoves.contains(Pair(row, col))) {
                    val centerX = left + innerSquareSize / 2
                    val centerY = top + innerSquareSize / 2
                    val radius = innerSquareSize / 4
                    canvas.drawCircle(centerX, centerY, radius, validMovePaint)
                }
                
                // Draw pieces
                val piece = board[row][col]
                if (piece != ChessPiece.EMPTY) {
                    val centerX = left + innerSquareSize / 2
                    val centerY = top + innerSquareSize / 2 + (innerSquareSize * 0.25f) // Adjusted for better centering
                    
                    val textPaint = if (piece.isWhite()) whitePiecePaint else piecePaint
                    
                    // Draw shadow first
                    val shadowPaint = Paint(textPaint).apply {
                        color = Color.rgb(0, 0, 0)
                        alpha = 80
                    }
                    canvas.drawText(piece.getSymbol(), centerX + 2f, centerY + 2f, shadowPaint)
                    
                    // Draw piece
                    canvas.drawText(piece.getSymbol(), centerX, centerY, textPaint)
                }
            }
        }
        
        // Draw disabled overlay when not player's turn
        if (!isMyTurn) {
            canvas.drawRect(offsetX, offsetY, offsetX + boardSize, offsetY + boardSize, disabledPaint)
        }
    }
    
    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                val boardWidth = width.toFloat()
                val boardHeight = height.toFloat()
                val boardSize = min(boardWidth, boardHeight)
                val offsetX = (boardWidth - boardSize) / 2
                val offsetY = (boardHeight - boardSize) / 2
                val borderWidth = 6f // Updated to match the new border width
                val innerBoardSize = boardSize - (borderWidth * 2)
                val innerSquareSize = innerBoardSize / 8
                
                // Adjust touch coordinates for border and offset
                val adjustedX = event.x - offsetX - borderWidth
                val adjustedY = event.y - offsetY - borderWidth
                
                val col = (adjustedX / innerSquareSize).toInt()
                val row = (adjustedY / innerSquareSize).toInt()
                
                if (row in 0..7 && col in 0..7) {
                    handleSquareClick(row, col)
                    invalidate()
                }
                return true
            }
        }
        return super.onTouchEvent(event)
    }
    
    private fun handleSquareClick(row: Int, col: Int) {
        // Only allow moves when it's the player's turn
        if (!isMyTurn) {
            return
        }
        
        if (selectedSquare == null) {
            // Select piece
            if (board[row][col] != ChessPiece.EMPTY) {
                selectedSquare = Pair(row, col)
                validMoves = getValidMoves(row, col).toMutableList()
            }
        } else {
            val selectedRow = selectedSquare!!.first
            val selectedCol = selectedSquare!!.second
            
            if (Pair(row, col) in validMoves) {
                // Make move
                val fromSquare = "${('a' + selectedCol)}${8 - selectedRow}"
                val toSquare = "${('a' + col)}${8 - row}"
                onMoveListener?.invoke(fromSquare, toSquare)
            }
            
            // Clear selection
            selectedSquare = null
            validMoves.clear()
        }
    }
    
    private fun getValidMoves(row: Int, col: Int): List<Pair<Int, Int>> {
        val piece = board[row][col]
        val moves = mutableListOf<Pair<Int, Int>>()
        
        when (piece) {
            ChessPiece.WHITE_PAWN -> {
                // Pawn moves
                if (row > 0 && board[row - 1][col] == ChessPiece.EMPTY) {
                    moves.add(Pair(row - 1, col))
                    if (row == 6 && board[row - 2][col] == ChessPiece.EMPTY) {
                        moves.add(Pair(row - 2, col))
                    }
                }
                // Captures
                if (row > 0 && col > 0 && board[row - 1][col - 1].isBlack()) {
                    moves.add(Pair(row - 1, col - 1))
                }
                if (row > 0 && col < 7 && board[row - 1][col + 1].isBlack()) {
                    moves.add(Pair(row - 1, col + 1))
                }
            }
            ChessPiece.BLACK_PAWN -> {
                // Pawn moves
                if (row < 7 && board[row + 1][col] == ChessPiece.EMPTY) {
                    moves.add(Pair(row + 1, col))
                    if (row == 1 && board[row + 2][col] == ChessPiece.EMPTY) {
                        moves.add(Pair(row + 2, col))
                    }
                }
                // Captures
                if (row < 7 && col > 0 && board[row + 1][col - 1].isWhite()) {
                    moves.add(Pair(row + 1, col - 1))
                }
                if (row < 7 && col < 7 && board[row + 1][col + 1].isWhite()) {
                    moves.add(Pair(row + 1, col + 1))
                }
            }
            ChessPiece.WHITE_ROOK, ChessPiece.BLACK_ROOK -> {
                // Rook moves (horizontal and vertical)
                val directions = listOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1)
                for ((dRow, dCol) in directions) {
                    var newRow = row + dRow
                    var newCol = col + dCol
                    while (newRow in 0..7 && newCol in 0..7) {
                        val targetPiece = board[newRow][newCol]
                        if (targetPiece == ChessPiece.EMPTY) {
                            moves.add(Pair(newRow, newCol))
                        } else {
                            if (piece.isWhite() != targetPiece.isWhite()) {
                                moves.add(Pair(newRow, newCol))
                            }
                            break
                        }
                        newRow += dRow
                        newCol += dCol
                    }
                }
            }
            ChessPiece.WHITE_KNIGHT, ChessPiece.BLACK_KNIGHT -> {
                // Knight moves
                val knightMoves = listOf(
                    -2 to -1, -2 to 1, -1 to -2, -1 to 2,
                    1 to -2, 1 to 2, 2 to -1, 2 to 1
                )
                for ((dRow, dCol) in knightMoves) {
                    val newRow = row + dRow
                    val newCol = col + dCol
                    if (newRow in 0..7 && newCol in 0..7) {
                        val targetPiece = board[newRow][newCol]
                        if (targetPiece == ChessPiece.EMPTY || piece.isWhite() != targetPiece.isWhite()) {
                            moves.add(Pair(newRow, newCol))
                        }
                    }
                }
            }
            ChessPiece.WHITE_BISHOP, ChessPiece.BLACK_BISHOP -> {
                // Bishop moves (diagonal)
                val directions = listOf(-1 to -1, -1 to 1, 1 to -1, 1 to 1)
                for ((dRow, dCol) in directions) {
                    var newRow = row + dRow
                    var newCol = col + dCol
                    while (newRow in 0..7 && newCol in 0..7) {
                        val targetPiece = board[newRow][newCol]
                        if (targetPiece == ChessPiece.EMPTY) {
                            moves.add(Pair(newRow, newCol))
                        } else {
                            if (piece.isWhite() != targetPiece.isWhite()) {
                                moves.add(Pair(newRow, newCol))
                            }
                            break
                        }
                        newRow += dRow
                        newCol += dCol
                    }
                }
            }
            ChessPiece.WHITE_QUEEN, ChessPiece.BLACK_QUEEN -> {
                // Queen moves (combination of rook and bishop)
                val directions = listOf(
                    -1 to 0, 1 to 0, 0 to -1, 0 to 1,  // Rook directions
                    -1 to -1, -1 to 1, 1 to -1, 1 to 1  // Bishop directions
                )
                for ((dRow, dCol) in directions) {
                    var newRow = row + dRow
                    var newCol = col + dCol
                    while (newRow in 0..7 && newCol in 0..7) {
                        val targetPiece = board[newRow][newCol]
                        if (targetPiece == ChessPiece.EMPTY) {
                            moves.add(Pair(newRow, newCol))
                        } else {
                            if (piece.isWhite() != targetPiece.isWhite()) {
                                moves.add(Pair(newRow, newCol))
                            }
                            break
                        }
                        newRow += dRow
                        newCol += dCol
                    }
                }
            }
            ChessPiece.WHITE_KING, ChessPiece.BLACK_KING -> {
                // King moves (one square in any direction)
                val directions = listOf(
                    -1 to -1, -1 to 0, -1 to 1,
                    0 to -1, 0 to 1,
                    1 to -1, 1 to 0, 1 to 1
                )
                for ((dRow, dCol) in directions) {
                    val newRow = row + dRow
                    val newCol = col + dCol
                    if (newRow in 0..7 && newCol in 0..7) {
                        val targetPiece = board[newRow][newCol]
                        if (targetPiece == ChessPiece.EMPTY || piece.isWhite() != targetPiece.isWhite()) {
                            moves.add(Pair(newRow, newCol))
                        }
                    }
                }
            }
            else -> {}
        }
        
        return moves
    }
    
    fun makeMove(from: String, to: String, piece: String, color: String) {
        val fromCol = from[0] - 'a'
        val fromRow = 8 - from[1].toString().toInt()
        val toCol = to[0] - 'a'
        val toRow = 8 - to[1].toString().toInt()
        
        Log.d("ChessBoardView", "Making move: $from to $to, piece: $piece, color: $color")
        Log.d("ChessBoardView", "From: row=$fromRow, col=$fromCol, To: row=$toRow, col=$toCol")
        
        // Get the piece that's being moved
        val movingPiece = board[fromRow][fromCol]
        Log.d("ChessBoardView", "Moving piece: $movingPiece")
        
        // Move piece
        board[toRow][toCol] = movingPiece
        board[fromRow][fromCol] = ChessPiece.EMPTY
        
        // Handle pawn promotion
        if (piece == "P" && ((color == "white" && toRow == 0) || (color == "black" && toRow == 7))) {
            board[toRow][toCol] = if (color == "white") ChessPiece.WHITE_QUEEN else ChessPiece.BLACK_QUEEN
            Log.d("ChessBoardView", "Pawn promoted to queen")
        }
        
        Log.d("ChessBoardView", "Move completed. Board state updated.")
        invalidate()
    }
    
    fun resetBoard() {
        for (row in 0..7) {
            for (col in 0..7) {
                board[row][col] = ChessPiece.EMPTY
            }
        }
        setupInitialBoard()
        selectedSquare = null
        validMoves.clear()
        invalidate()
    }
    
    fun setOnMoveListener(listener: (String, String) -> Unit) {
        onMoveListener = listener
    }
    
    fun setTurnState(isMyTurn: Boolean) {
        this.isMyTurn = isMyTurn
        // Clear selection when turn changes
        if (!isMyTurn) {
            selectedSquare = null
            validMoves.clear()
            invalidate()
        }
    }

    // 🔧 RESUME GAME FEATURE - LOAD BOARD STATE
    fun loadBoardState(boardState: org.json.JSONObject) {
        Log.d("ChessBoardView", "Loading board state from JSON")
        
        // Clear the board first
        for (row in 0..7) {
            for (col in 0..7) {
                board[row][col] = ChessPiece.EMPTY
            }
        }
        
        // Load pieces from JSON
        for (row in 0..7) {
            for (col in 0..7) {
                val square = "${('a' + col)}${8 - row}"
                val pieceSymbol = boardState.optString(square, "")
                
                if (pieceSymbol.isNotEmpty()) {
                    val piece = when (pieceSymbol) {
                        "P" -> ChessPiece.WHITE_PAWN
                        "R" -> ChessPiece.WHITE_ROOK
                        "N" -> ChessPiece.WHITE_KNIGHT
                        "B" -> ChessPiece.WHITE_BISHOP
                        "Q" -> ChessPiece.WHITE_QUEEN
                        "K" -> ChessPiece.WHITE_KING
                        "p" -> ChessPiece.BLACK_PAWN
                        "r" -> ChessPiece.BLACK_ROOK
                        "n" -> ChessPiece.BLACK_KNIGHT
                        "b" -> ChessPiece.BLACK_BISHOP
                        "q" -> ChessPiece.BLACK_QUEEN
                        "k" -> ChessPiece.BLACK_KING
                        else -> ChessPiece.EMPTY
                    }
                    board[row][col] = piece
                }
            }
        }
        
        // Clear selection and valid moves
        selectedSquare = null
        validMoves.clear()
        
        Log.d("ChessBoardView", "Board state loaded successfully")
        debugBoardState()
        invalidate()
    }
    
    fun debugBoardState() {
        Log.d("ChessBoardView", "=== BOARD STATE DEBUG ===")
        for (row in 0..7) {
            var rowString = ""
            for (col in 0..7) {
                val piece = board[row][col]
                rowString += when (piece) {
                    ChessPiece.EMPTY -> "."
                    ChessPiece.WHITE_PAWN -> "P"
                    ChessPiece.WHITE_ROOK -> "R"
                    ChessPiece.WHITE_KNIGHT -> "N"
                    ChessPiece.WHITE_BISHOP -> "B"
                    ChessPiece.WHITE_QUEEN -> "Q"
                    ChessPiece.WHITE_KING -> "K"
                    ChessPiece.BLACK_PAWN -> "p"
                    ChessPiece.BLACK_ROOK -> "r"
                    ChessPiece.BLACK_KNIGHT -> "n"
                    ChessPiece.BLACK_BISHOP -> "b"
                    ChessPiece.BLACK_QUEEN -> "q"
                    ChessPiece.BLACK_KING -> "k"
                }
                rowString += " "
            }
            Log.d("ChessBoardView", "Row $row: $rowString")
        }
        Log.d("ChessBoardView", "=== END BOARD STATE ===")
    }
}

enum class ChessPiece {
    EMPTY,
    WHITE_PAWN, WHITE_ROOK, WHITE_KNIGHT, WHITE_BISHOP, WHITE_QUEEN, WHITE_KING,
    BLACK_PAWN, BLACK_ROOK, BLACK_KNIGHT, BLACK_BISHOP, BLACK_QUEEN, BLACK_KING;
    
    fun isWhite(): Boolean {
        return this in listOf(WHITE_PAWN, WHITE_ROOK, WHITE_KNIGHT, WHITE_BISHOP, WHITE_QUEEN, WHITE_KING)
    }
    
    fun isBlack(): Boolean {
        return this in listOf(BLACK_PAWN, BLACK_ROOK, BLACK_KNIGHT, BLACK_BISHOP, BLACK_QUEEN, BLACK_KING)
    }
    
    fun getSymbol(): String {
        return when (this) {
            WHITE_PAWN -> "♟"
            WHITE_ROOK -> "♜"
            WHITE_KNIGHT -> "♞"
            WHITE_BISHOP -> "♝"
            WHITE_QUEEN -> "♛"
            WHITE_KING -> "♚"
            BLACK_PAWN -> "♙"
            BLACK_ROOK -> "♖"
            BLACK_KNIGHT -> "♘"
            BLACK_BISHOP -> "♗"
            BLACK_QUEEN -> "♕"
            BLACK_KING -> "♔"
            EMPTY -> ""
        }
    }
} 