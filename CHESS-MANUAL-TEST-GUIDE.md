# ♔ CHESS MANUAL TEST GUIDE ♔

## 🎯 **How to Test Check and Checkmate Detection**

Since the automated tests are having connection issues, here's a manual test guide to verify that the check and checkmate detection is working properly.

## 📱 **Test Setup**

1. **Start the server** (if not already running):
   ```bash
   cd windows-server
   node server-vpn.js
   ```

2. **Open the Android app** and navigate to the Chess game

3. **Connect two devices** or use two browser tabs to simulate two players

## 🧪 **Test Scenarios**

### **Test 1: Basic Check Detection**
**Goal**: Verify that putting opponent in check shows proper feedback

**Steps**:
1. **Player 1 (White)**: Move pawn e2 to e4
2. **Player 2 (Black)**: Move pawn e7 to e5  
3. **Player 1 (White)**: Move queen d1 to h5
   - **Expected Result**: Should see "CHECK!" message and red text
   - **Expected Result**: Black should be notified they are in check

**What to Look For**:
- ✅ "CHECK!" message appears
- ✅ Game status text turns red
- ✅ Toast notification shows check
- ✅ Opponent sees they are in check

### **Test 2: Check Escape**
**Goal**: Verify that escaping check works properly

**Steps**:
1. Continue from Test 1 (queen at h5, king in check)
2. **Player 2 (Black)**: Move king e8 to e7
   - **Expected Result**: Check should be resolved
   - **Expected Result**: Game continues normally

**What to Look For**:
- ✅ Check message disappears
- ✅ Game status returns to normal
- ✅ Turn continues properly

### **Test 3: Checkmate Detection**
**Goal**: Verify that checkmate ends the game

**Steps**:
1. Continue from Test 2 (queen at h5, king at e7)
2. **Player 1 (White)**: Move queen h5 to e8
   - **Expected Result**: Should see "CHECKMATE!" message
   - **Expected Result**: Game should end with winner announcement

**What to Look For**:
- ✅ "CHECKMATE!" message appears
- ✅ Game over dialog shows
- ✅ Winner is announced
- ✅ Game ends properly

### **Test 4: Illegal Move Prevention**
**Goal**: Verify that moving into check is prevented

**Steps**:
1. Start a new game
2. **Player 1 (White)**: Move pawn e2 to e4
3. **Player 2 (Black)**: Move pawn e7 to e5
4. **Player 1 (White)**: Move queen d1 to h5 (puts black in check)
5. **Player 2 (Black)**: Try to move king e8 to f7 (should be illegal)
   - **Expected Result**: Should get error message "This move would put your king in check"
   - **Expected Result**: Move should be rejected

**What to Look For**:
- ✅ Error message appears
- ✅ Move is rejected
- ✅ Board stays in previous state
- ✅ Turn doesn't change

### **Test 5: Fool's Mate (Fastest Checkmate)**
**Goal**: Test the fastest possible checkmate

**Steps**:
1. **Player 1 (White)**: Move pawn f2 to f4
2. **Player 2 (Black)**: Move pawn e7 to e6
3. **Player 1 (White)**: Move pawn g2 to g4
4. **Player 2 (Black)**: Move queen d8 to h4
   - **Expected Result**: Should be checkmate in 2 moves
   - **Expected Result**: Game should end immediately

**What to Look For**:
- ✅ Checkmate detected immediately
- ✅ Game over with winner
- ✅ No further moves allowed

## 🔍 **Debug Information**

### **Server Logs**
Look for these messages in the server console:
```
[Chess Debug] Checking if black is in check...
[Chess Debug] black king found at e8
[Chess Debug] CHECK! white piece Q at h5 can capture king at e8
[Chess Debug] Broadcasting move with check state: isCheck=true
```

### **Client Logs**
Look for these messages in Android Studio Logcat:
```
=== SIMPLIFIED CHESS MOVE MADE ===
Move: d1 to h5 by white (DJDELBOY23)
Check: true, Checkmate: false
🔍 DEBUG: Raw check data - isCheck: true
```

### **Expected UI Changes**
- **Check State**: Game status text should show "♔ CHECK! ♔" in red
- **Checkmate State**: Game over dialog should appear
- **Error State**: Toast message should show error

## ❌ **Common Issues to Check**

### **If Check Detection Doesn't Work**:
1. **Check server logs** - Look for `[Chess Debug]` messages
2. **Check client logs** - Look for move events and check data
3. **Verify event names** - Should be `chess_move_made`
4. **Check variable names** - Should be `isCheck` not `isCheckmate`

### **If Illegal Moves Are Allowed**:
1. **Check move validation** - Should prevent moves into check
2. **Check temporary board simulation** - Should test moves before applying
3. **Check error handling** - Should show error messages

### **If UI Doesn't Update**:
1. **Check event handling** - Should update UI on check events
2. **Check color changes** - Should show red text for check
3. **Check toast messages** - Should show check notifications

## ✅ **Success Criteria**

The chess system is working correctly if:

1. ✅ **Check Detection**: Moving queen to h5 puts black king in check
2. ✅ **Visual Feedback**: "CHECK!" message appears with red text
3. ✅ **Check Escape**: Moving king to e7 resolves the check
4. ✅ **Checkmate Detection**: Moving queen to e8 results in checkmate
5. ✅ **Game Ending**: Checkmate properly ends the game
6. ✅ **Illegal Move Prevention**: Can't move into check
7. ✅ **Error Messages**: Clear error messages for illegal moves

## 🚀 **Ready to Test**

Follow the test scenarios above to verify that the check and checkmate detection is working properly. Each test should show the expected behavior with proper visual feedback and game state management.

**Start with Test 1 and work through each scenario to ensure everything is functioning correctly!** 