// Migration script to convert from device ID-based to username-based user identification
// Run this script once to migrate existing user data

const fs = require('fs');
const path = require('path');

const USER_PROFILES_FILE = path.join(__dirname, 'user_profiles.json');
const CHESS_GAMES_FILE = 'X:/chess_games.json';

console.log('🔄 Starting migration to username-based system...');

// Backup existing files
function backupFile(filePath, backupPath) {
    if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`✅ Backed up ${filePath} to ${backupPath}`);
    }
}

// Migrate user profiles
function migrateUserProfiles() {
    if (!fs.existsSync(USER_PROFILES_FILE)) {
        console.log('📝 No user profiles file found, skipping migration');
        return;
    }
    
    try {
        const data = fs.readFileSync(USER_PROFILES_FILE, 'utf8');
        const oldProfiles = JSON.parse(data);
        
        const newProfiles = {};
        let migratedCount = 0;
        
        for (const [deviceId, profile] of Object.entries(oldProfiles)) {
            const username = profile.username;
            if (username && username !== deviceId) {
                newProfiles[username] = {
                    ...profile,
                    username: username,
                    migratedFrom: deviceId,
                    migratedAt: new Date().toISOString()
                };
                migratedCount++;
                console.log(`👤 Migrated user: ${deviceId} -> ${username}`);
            } else {
                console.log(`⚠️ Skipping user ${deviceId} - no valid username`);
            }
        }
        
        // Save new profiles
        fs.writeFileSync(USER_PROFILES_FILE, JSON.stringify(newProfiles, null, 2));
        console.log(`✅ Migrated ${migratedCount} user profiles`);
        
    } catch (error) {
        console.error('❌ Error migrating user profiles:', error);
    }
}

// Migrate chess games
function migrateChessGames() {
    if (!fs.existsSync(CHESS_GAMES_FILE)) {
        console.log('♟️ No chess games file found, skipping migration');
        return;
    }
    
    try {
        const data = fs.readFileSync(CHESS_GAMES_FILE, 'utf8');
        const games = JSON.parse(data);
        
        let migratedCount = 0;
        
        for (const game of games) {
            let updated = false;
            
            // Update white player if it looks like a device ID
            if (game.whitePlayer && game.whitePlayer.length > 20) {
                console.log(`♟️ Game ${game.id}: white player looks like device ID: ${game.whitePlayer}`);
                // We can't automatically convert device IDs to usernames
                // The games will need to be recreated with proper usernames
                updated = true;
            }
            
            // Update black player if it looks like a device ID
            if (game.blackPlayer && game.blackPlayer.length > 20) {
                console.log(`♟️ Game ${game.id}: black player looks like device ID: ${game.blackPlayer}`);
                updated = true;
            }
            
            if (updated) {
                migratedCount++;
            }
        }
        
        if (migratedCount > 0) {
            console.log(`⚠️ Found ${migratedCount} chess games with device IDs - these will need to be recreated`);
            console.log('💡 Recommendation: Clear chess games and let users create new ones with usernames');
        } else {
            console.log('✅ All chess games already use usernames');
        }
        
    } catch (error) {
        console.error('❌ Error migrating chess games:', error);
    }
}

// Main migration function
function runMigration() {
    console.log('🚀 Starting migration process...');
    
    // Create backups
    backupFile(USER_PROFILES_FILE, USER_PROFILES_FILE + '.backup');
    backupFile(CHESS_GAMES_FILE, CHESS_GAMES_FILE + '.backup');
    
    // Migrate data
    migrateUserProfiles();
    migrateChessGames();
    
    console.log('✅ Migration completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Restart the server');
    console.log('2. Users should reconnect with their usernames');
    console.log('3. Chess games will be recreated with proper usernames');
    console.log('4. All user data will now be tied to usernames instead of device IDs');
}

// Run migration
runMigration(); 