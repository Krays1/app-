# 🎲 Chess Dice Roll System

## 📋 Overview

The Zell0 chess game now uses a dice roll system to fairly determine who gets to play as white or black pieces. This ensures both players have an equal chance and prevents the "both players as white" issue.

## 🎯 How It Works

### 1. Game Creation
- First player creates a game
- Game starts in "waiting for dice roll" state
- No color assignment yet

### 2. Second Player Joins
- Second player joins the game
- Both players are now present
- Dice roll process begins automatically

### 3. Dice Roll Phase
- Both players see "Roll the dice to determine who gets white!"
- Each player clicks "Roll Dice" button
- Server generates random number (1-6) for each player
- Both players see each other's rolls

### 4. Color Assignment
- **Higher roll gets WHITE pieces**
- **Lower roll gets BLACK pieces**
- If tie, both players roll again
- Game starts with white going first

## 🎮 User Experience

### For Players
1. **Create/Join Game**: Normal process
2. **See Dice Roll Prompt**: "Roll the dice to determine who gets white!"
3. **Click Roll Dice**: Button appears when both players are present
4. **See Results**: Both players see each other's rolls
5. **Game Starts**: Colors assigned, white goes first

### UI States
- **Waiting for Opponent**: "Waiting for opponent..."
- **Dice Roll Phase**: "Roll the dice to determine who gets white!"
- **Game Active**: "Your turn" / "Opponent's turn"

## 🔧 Technical Implementation

### Server Side (`server-vpn.js`)
```javascript
// Game state includes dice roll data
const game = {
    id: gameId,
    whitePlayer: '', // Assigned after dice roll
    blackPlayer: '', // Assigned after dice roll
    waitingForDiceRoll: true,
    diceRolls: {}, // username -> roll value
    started: false
};

// Dice roll handler
socket.on('chess:roll_dice', (data) => {
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    game.diceRolls[username] = diceRoll;
    
    // Check if both players rolled
    if (allRolled) {
        // Assign colors based on higher roll
        if (player1Roll > player2Roll) {
            whitePlayer = player1;
            blackPlayer = player2;
        }
        // Start game
    }
});
```

### Android App (`ChessActivity.kt`)
```kotlin
// Dice roll state variables
private var waitingForDiceRoll = false
private var myDiceRolled = false
private var diceRolls = mutableMapOf<String, Int>()

// Dice roll button handler
private fun rollDice() {
    if (waitingForDiceRoll && !myDiceRolled && gameId != null) {
        socket?.emit("chess:roll_dice", JSONObject().apply {
            put("gameId", gameId)
        })
        myDiceRolled = true
        rollDiceButton.isEnabled = false
    }
}
```

## 🎲 Dice Roll Events

### Server Events
- `chess:start_dice_roll` - Both players present, start dice roll
- `chess:dice_rolled` - Player rolled dice, show result
- `chess:dice_tie` - Tie detected, need to roll again
- `chess:game_started` - Colors assigned, game begins

### Client Events
- `chess:roll_dice` - Player requests dice roll

## 🧪 Testing

### Test the Dice Roll System
```bash
# In windows-server folder
TEST-DICE-ROLL.bat
```

This will simulate multiple dice roll scenarios to verify the logic works correctly.

## 🐛 Problem Solved

### Before (Issue)
- Both players were assigned as white
- "Waiting for opponent" even with two players
- No fair way to determine who gets white

### After (Solution)
- ✅ Fair dice roll determines colors
- ✅ Both players see each other
- ✅ Clear game state progression
- ✅ No more "both white" issue

## 🎯 Benefits

1. **Fair Play**: Equal chance for both players to get white
2. **Clear Progression**: Players know exactly what's happening
3. **No Confusion**: Clear UI states and messages
4. **Automatic**: No manual intervention needed
5. **Tie Handling**: Automatic re-roll on ties

## 🚀 Usage

1. **Start Server**: `START-VPN-SERVER.bat`
2. **Open Chess**: Both players open chess game
3. **Create/Join**: One creates, other joins
4. **Roll Dice**: Both click "Roll Dice"
5. **Play**: Higher roll gets white, game starts!

The dice roll system ensures every chess game starts fairly and both players can see each other properly! 