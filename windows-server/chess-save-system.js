// Chess Save System
const fs = require('fs');
const path = require('path');

class ChessSaveSystem {
    constructor() {
        this.statsFile = path.join(__dirname, 'chess-saves', 'chess-stats.json');
        this.gamesFile = path.join(__dirname, 'chess-saves', 'chess-games.json');
        this.unfinishedGamesFile = path.join(__dirname, 'chess-saves', 'unfinished-games.json');
        
        // Ensure directories exist
        const savesDir = path.dirname(this.statsFile);
        if (!fs.existsSync(savesDir)) {
            fs.mkdirSync(savesDir, { recursive: true });
        }
        
        this.loadStats();
        this.loadGames();
        this.loadUnfinishedGames();
    }

    loadStats() {
        try {
            if (fs.existsSync(this.statsFile)) {
                this.stats = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
            } else {
                this.stats = {
                    overall: { totalGames: 0, totalWins: 0, totalDraws: 0, uniquePlayers: 0 },
                    topPlayers: [],
                    recentGames: [],
                    players: {}
                };
            }
            
            // Ensure required fields exist
            if (!this.stats.players) this.stats.players = {};
            if (!this.stats.overall) this.stats.overall = { totalGames: 0, totalWins: 0, totalDraws: 0, uniquePlayers: 0 };
            if (!this.stats.topPlayers) this.stats.topPlayers = [];
            if (!this.stats.recentGames) this.stats.recentGames = [];
        } catch (error) {
            console.error('[Chess Save] Error loading stats:', error);
            this.stats = {
                overall: { totalGames: 0, totalWins: 0, totalDraws: 0, uniquePlayers: 0 },
                topPlayers: [],
                recentGames: [],
                players: {}
            };
        }
    }

    loadGames() {
        try {
            if (fs.existsSync(this.gamesFile)) {
                this.games = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
            } else {
                this.games = [];
            }
        } catch (error) {
            console.error('[Chess Save] Error loading games:', error);
            this.games = [];
        }
    }

    loadUnfinishedGames() {
        try {
            if (fs.existsSync(this.unfinishedGamesFile)) {
                this.unfinishedGames = JSON.parse(fs.readFileSync(this.unfinishedGamesFile, 'utf8'));
            } else {
                this.unfinishedGames = {};
            }
        } catch (error) {
            console.error('[Chess Save] Error loading unfinished games:', error);
            this.unfinishedGames = {};
        }
    }

    saveStats() {
        try {
            // Update overall stats from actual games data
            const playerNames = Object.keys(this.stats.players);
            this.stats.overall.uniquePlayers = playerNames.length;
            
            // Calculate totals from actual games
            this.stats.overall.totalGames = this.games.length;
            this.stats.overall.totalWins = this.stats.totalWins || 0;
            this.stats.overall.totalDraws = this.stats.totalDraws || 0;
            
            // Update top players - include player name
            this.stats.topPlayers = playerNames
                .map(name => ({
                    name: name, // 🔧 ADD PLAYER NAME
                    ...this.stats.players[name]
                }))
                .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
                .slice(0, 10);
            
            this.stats.lastUpdated = new Date().toISOString();
            fs.writeFileSync(this.statsFile, JSON.stringify(this.stats, null, 2));
            console.log('[Chess Save] Stats saved successfully');
        } catch (error) {
            console.error('[Chess Save] Error saving stats:', error);
        }
    }

    saveGames() {
        try {
            fs.writeFileSync(this.gamesFile, JSON.stringify(this.games, null, 2));
            console.log('[Chess Save] Games saved successfully');
        } catch (error) {
            console.error('[Chess Save] Error saving games:', error);
        }
    }

    saveUnfinishedGames() {
        try {
            fs.writeFileSync(this.unfinishedGamesFile, JSON.stringify(this.unfinishedGames, null, 2));
            console.log('[Chess Save] Unfinished games saved successfully');
        } catch (error) {
            console.error('[Chess Save] Error saving unfinished games:', error);
        }
    }

    // NEW: Save unfinished game
    saveUnfinishedGame(gameId, gameData) {
        try {
            this.unfinishedGames[gameId] = {
                ...gameData,
                lastUpdated: new Date().toISOString(),
                isUnfinished: true
            };
            this.saveUnfinishedGames();
            console.log(`[Chess Save] Unfinished game saved: ${gameId}`);
            return true;
        } catch (error) {
            console.error('[Chess Save] Error saving unfinished game:', error);
            return false;
        }
    }

    // NEW: Get unfinished game
    getUnfinishedGame(gameId) {
        return this.unfinishedGames[gameId] || null;
    }

    // NEW: Check for existing unfinished game between players
    findUnfinishedGameBetweenPlayers(player1, player2) {
        const playerKey = this.getPlayerKey(player1, player2);
        
        for (const [gameId, gameData] of Object.entries(this.unfinishedGames)) {
            if (gameData.playerKey === playerKey && gameData.isUnfinished) {
                return {
                    gameId,
                    gameData
                };
            }
        }
        return null;
    }

    // NEW: Get unique key for player pair
    getPlayerKey(player1, player2) {
        const sorted = [player1, player2].sort();
        return `${sorted[0]}_vs_${sorted[1]}`;
    }

    // NEW: Remove unfinished game (when game is completed)
    removeUnfinishedGame(gameId) {
        if (this.unfinishedGames[gameId]) {
            delete this.unfinishedGames[gameId];
            this.saveUnfinishedGames();
            console.log(`[Chess Save] Unfinished game removed: ${gameId}`);
            return true;
        }
        return false;
    }

    // NEW: Get all unfinished games for a player
    getUnfinishedGamesForPlayer(playerName) {
        const playerGames = [];
        
        for (const [gameId, gameData] of Object.entries(this.unfinishedGames)) {
            if ((gameData.whitePlayer === playerName || gameData.blackPlayer === playerName) && gameData.isUnfinished) {
                playerGames.push({
                    gameId,
                    ...gameData
                });
            }
        }
        
        return playerGames;
    }

    recordGame(gameData) {
        try {
            // Add game to history
            this.games.push(gameData);
            
            // Update player stats
            this.updatePlayerStats(gameData.whitePlayer, gameData.winner === 'white' ? 'win' : gameData.winner === 'draw' ? 'draw' : 'loss');
            this.updatePlayerStats(gameData.blackPlayer, gameData.winner === 'black' ? 'win' : gameData.winner === 'draw' ? 'draw' : 'loss');
            
            // Add to recent games
            this.addRecentGame(gameData);
            
            // Remove from unfinished games if it was there
            this.removeUnfinishedGame(gameData.gameId);
            
            // Save everything
            this.saveGames();
            this.saveStats();
            
            console.log(`[Chess Save] Game recorded: ${gameData.whitePlayer} vs ${gameData.blackPlayer}, Winner: ${gameData.winner}`);
            return true;
        } catch (error) {
            console.error('[Chess Save] Error recording game:', error);
            return false;
        }
    }

    updatePlayerStats(playerName, result) {
        if (!this.stats.players[playerName]) {
            this.stats.players[playerName] = {
                games: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                winRate: '0.0',
                firstGame: new Date().toISOString(),
                lastGame: new Date().toISOString()
            };
        }
        
        const player = this.stats.players[playerName];
        player.games++;
        player.lastGame = new Date().toISOString();
        
        if (result === 'win') {
            player.wins++;
            this.stats.totalWins = (this.stats.totalWins || 0) + 1;
        } else if (result === 'loss') {
            player.losses++;
        } else if (result === 'draw') {
            player.draws++;
            this.stats.totalDraws = (this.stats.totalDraws || 0) + 1;
        }
        
        // Calculate win rate
        const totalGames = player.wins + player.losses + player.draws;
        player.winRate = totalGames > 0 ? ((player.wins / totalGames) * 100).toFixed(1) : '0.0';
        
        this.stats.totalGames = (this.stats.totalGames || 0) + 1;
    }

    addRecentGame(gameData) {
        const recentGame = {
            whitePlayer: gameData.whitePlayer,
            blackPlayer: gameData.blackPlayer,
            winner: gameData.winner === 'white' ? gameData.whitePlayer : 
                   gameData.winner === 'black' ? gameData.blackPlayer : 'Draw',
            duration: gameData.duration || 'Unknown',
            endTime: new Date(gameData.endTime).toLocaleString()
        };
        
        this.stats.recentGames.unshift(recentGame);
        
        // Keep only last 10 games
        if (this.stats.recentGames.length > 10) {
            this.stats.recentGames = this.stats.recentGames.slice(0, 10);
        }
    }

    getStats() {
        return this.stats;
    }

    getGames() {
        return this.games;
    }

    getUnfinishedGames() {
        return this.unfinishedGames;
    }

    getPlayerStats(playerName) {
        return this.stats.players[playerName] || null;
    }

    getPlayerGameHistory(playerName) {
        return this.games.filter(game => 
            game.whitePlayer === playerName || game.blackPlayer === playerName
        ).map(game => ({
            opponent: game.whitePlayer === playerName ? game.blackPlayer : game.whitePlayer,
            result: game.whitePlayer === playerName ? 
                   (game.winner === 'white' ? 'Win' : game.winner === 'black' ? 'Loss' : 'Draw') :
                   (game.winner === 'black' ? 'Win' : game.winner === 'white' ? 'Loss' : 'Draw'),
            duration: game.duration || 'Unknown',
            date: new Date(game.endTime).toLocaleString()
        }));
    }
}

module.exports = ChessSaveSystem; 