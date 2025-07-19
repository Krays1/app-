still not playing also can weuse this as the symbol for plex resizeand placeconst express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Enable CORS for all routes
app.use(cors());

// Serve static files from common media directories
const mediaDirectories = [
    'C:\\Users\\ALLAN\\Videos',
    'C:\\Users\\ALLAN\\Movies',
    'C:\\Users\\ALLAN\\Downloads',
    'C:\\Users\\ALLAN\\Desktop',
    'D:\\Videos',
    'D:\\Movies',
    'E:\\Videos',
    'E:\\Movies'
];

console.log('🎬 Simple Media Server');
console.log('=====================================');
console.log(`📡 Server running on port ${PORT}`);
console.log('🌐 Access via: http://192.168.1.182:8080');
console.log('=====================================\n');

// Function to find media files recursively
function findMediaFiles(dir, maxDepth = 3, currentDepth = 0) {
    const mediaFiles = [];
    
    if (currentDepth >= maxDepth) return mediaFiles;
    
    try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Recursively search subdirectories
                const subFiles = findMediaFiles(fullPath, maxDepth, currentDepth + 1);
                mediaFiles.push(...subFiles);
            } else if (stat.isFile()) {
                // Check if it's a media file
                const ext = path.extname(file).toLowerCase();
                const mediaExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
                
                if (mediaExtensions.includes(ext)) {
                    mediaFiles.push({
                        name: file,
                        path: fullPath,
                        size: stat.size,
                        modified: stat.mtime
                    });
                }
            }
        }
    } catch (error) {
        console.log(`Cannot access directory: ${dir}`);
    }
    
    return mediaFiles;
}

// API endpoint to list all media files
app.get('/api/media', (req, res) => {
    console.log('📋 Requesting media list...');
    
    const allMedia = [];
    
    for (const mediaDir of mediaDirectories) {
        if (fs.existsSync(mediaDir)) {
            console.log(`🔍 Scanning: ${mediaDir}`);
            const files = findMediaFiles(mediaDir);
            allMedia.push(...files);
        }
    }
    
    // Sort by name
    allMedia.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`✅ Found ${allMedia.length} media files`);
    
    res.json({
        success: true,
        count: allMedia.length,
        files: allMedia
    });
});

// Serve media files directly
app.get('/media/:filename', (req, res) => {
    const filename = req.params.filename;
    console.log(`🎬 Requesting file: ${filename}`);
    
    // Find the file in media directories
    let filePath = null;
    
    for (const mediaDir of mediaDirectories) {
        if (fs.existsSync(mediaDir)) {
            const potentialPath = path.join(mediaDir, filename);
            if (fs.existsSync(potentialPath)) {
                filePath = potentialPath;
                break;
            }
            
            // Also check subdirectories
            const files = findMediaFiles(mediaDir, 3);
            const foundFile = files.find(f => f.name === filename);
            if (foundFile) {
                filePath = foundFile.path;
                break;
            }
        }
    }
    
    if (filePath && fs.existsSync(filePath)) {
        console.log(`✅ Serving: ${filePath}`);
        
        // Set appropriate headers for video streaming
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            });
            file.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            });
            fs.createReadStream(filePath).pipe(res);
        }
    } else {
        console.log(`❌ File not found: ${filename}`);
        res.status(404).json({ error: 'File not found' });
    }
});

// Simple web interface
app.get('/', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Simple Media Server</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .file-list { list-style: none; padding: 0; }
            .file-item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
            .file-item:hover { background: #f5f5f5; }
            .play-btn { background: #007bff; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; }
            .play-btn:hover { background: #0056b3; }
            .loading { text-align: center; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎬 Simple Media Server</h1>
                <p>Direct access to your media files without Plex authentication</p>
            </div>
            
            <div id="loading" class="loading">Loading media files...</div>
            <ul id="fileList" class="file-list" style="display: none;"></ul>
        </div>
        
        <script>
            fetch('/api/media')
                .then(response => response.json())
                .then(data => {
                    const fileList = document.getElementById('fileList');
                    const loading = document.getElementById('loading');
                    
                    if (data.success && data.files.length > 0) {
                        loading.style.display = 'none';
                        fileList.style.display = 'block';
                        
                        data.files.forEach(file => {
                            const li = document.createElement('li');
                            li.className = 'file-item';
                            
                            const size = (file.size / (1024 * 1024)).toFixed(1);
                            li.innerHTML = \`
                                <span>\${file.name} (\${size} MB)</span>
                                <button class="play-btn" onclick="playFile('\${file.name}')">Play</button>
                            \`;
                            
                            fileList.appendChild(li);
                        });
                    } else {
                        loading.innerHTML = 'No media files found. Check the media directories in the server configuration.';
                    }
                })
                .catch(error => {
                    document.getElementById('loading').innerHTML = 'Error loading media files: ' + error.message;
                });
                
            function playFile(filename) {
                const url = \`/media/\${encodeURIComponent(filename)}\`;
                window.open(url, '_blank');
            }
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server started on http://192.168.1.182:${PORT}`);
    console.log('📱 Use this URL in your Zell0 app for direct media access');
    console.log('\n📂 Scanning media directories...');
    
    let totalFiles = 0;
    for (const mediaDir of mediaDirectories) {
        if (fs.existsSync(mediaDir)) {
            const files = findMediaFiles(mediaDir);
            console.log(`📁 ${mediaDir}: ${files.length} files`);
            totalFiles += files.length;
        }
    }
    console.log(`\n✅ Total media files found: ${totalFiles}`);
}); 