# ♟️ Chess Resume Game Feature

## **Overview**
The chess resume game feature allows players to continue unfinished games when they reconnect to the server. This prevents games from being lost when players disconnect or leave the app.

## **How It Works**

### **🔄 Game Saving Process**
1. **Automatic Save**: When a player leaves a game that has moves, it's automatically saved as "unfinished"
2. **Game State**: The entire game state is preserved including:
   - Board position
   - Move history
   - Current player's turn
   - Game start time
   - Player information

### **🎯 Resume Process**
1. **Player Reconnects**: When a player connects and looks for a game
2. **Check for Unfinished**: Server checks if player has any unfinished games
3. **Offer Resume**: If unfinished games exist, player is notified
4. **Opponent Check**: Server verifies if the opponent is online
5. **Resume Game**: If both players are online, game resumes from exact position

## **Server Events**

### **New Socket Events**
- `chess:unfinished_games_found` - Sent when unfinished games are found
- `chess:resume_game` - Client requests to resume a specific game
- `chess:game_resumed` - Game successfully resumed
- `chess:resume_failed` - Resume failed (opponent offline, etc.)
- `chess:start_new_game` - Ignore unfinished games and start fresh
- `chess:game_saved_unfinished` - Notify remaining player that game was saved

### **API Endpoints**
- `GET /api/chess/unfinished/:username` - Get unfinished games for a player
- `GET /api/chess/unfinished` - Get all unfinished games (admin)

## **Client Implementation**

### **Android App Flow**
1. **Connect to Server**: Player connects and registers
2. **Find Game**: Player requests to find a game
3. **Check Response**: 
   - If `chess:unfinished_games_found` received → Show resume options
   - If no unfinished games → Continue with normal game finding
4. **Resume Options**: Show dialog with:
   - "Resume Game vs [Opponent]" button
   - "Start New Game" button
5. **Resume Game**: Send `chess:resume_game` with game ID
6. **Handle Resume**: Receive `chess:game_resumed` with game state

### **Example Client Code**
```javascript
// Listen for unfinished games
socket.on('chess:unfinished_games_found', (data) => {
    if (data.games.length > 0) {
        showResumeDialog(data.games);
    }
});

// Resume a specific game
function resumeGame(gameId) {
    socket.emit('chess:resume_game', { gameId });
}

// Handle resumed game
socket.on('chess:game_resumed', (data) => {
    // Load game state
    loadGameState(data.board, data.moves);
    setPlayerColor(data.color);
    setCurrentTurn(data.isMyTurn);
    // Continue game...
});

// Start new game (ignore unfinished)
function startNewGame() {
    socket.emit('chess:start_new_game');
}
```

## **Data Storage**

### **Unfinished Games File**
- Location: `chess-saves/unfinished-games.json`
- Format: JSON object with game IDs as keys
- Structure:
```json
{
  "gameId": {
    "whitePlayer": "player1",
    "blackPlayer": "player2", 
    "currentPlayer": "white",
    "board": [...],
    "moves": [...],
    "startTime": "2025-01-20T10:00:00Z",
    "lastUpdated": "2025-01-20T10:30:00Z",
    "isUnfinished": true,
    "playerKey": "player1_vs_player2"
  }
}
```

## **Features**

### **✅ Automatic Saving**
- Games are saved automatically when players leave
- No manual save required
- Preserves exact game state

### **✅ Smart Resume**
- Only offers resume if opponent is online
- Prevents orphaned games
- Maintains game integrity

### **✅ Flexible Options**
- Players can choose to resume or start fresh
- Multiple unfinished games supported
- Clean game history management

### **✅ Real-time Sync**
- Both players notified when game resumes
- Exact board state restored
- Turn order maintained

## **Testing**

### **Test Script**
Run `test-resume-game.js` to test the complete resume flow:
```bash
node test-resume-game.js
```

### **Manual Testing**
1. Start a chess game between two players
2. Make some moves
3. Have one player leave/disconnect
4. Have that player reconnect and look for game
5. Verify resume option appears
6. Test resuming the game

## **Benefits**

- **🔄 No Lost Games**: Players never lose progress due to disconnections
- **⏰ Flexible Play**: Can pause and resume games at any time
- **👥 Better UX**: Seamless experience for players
- **📊 Accurate Stats**: Games are properly recorded when completed
- **🛡️ Data Integrity**: Game state is preserved exactly

## **Future Enhancements**

- **⏰ Auto-cleanup**: Remove old unfinished games after X days
- **📱 Push Notifications**: Notify players when opponent returns
- **🎮 Game History**: Show resume options in game history
- **⚙️ Settings**: Allow players to disable auto-save
- **📊 Analytics**: Track resume vs new game preferences 