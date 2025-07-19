# Manual Steam Background Setup

## Option 1: Using ImageMagick (Recommended)

1. **Install ImageMagick** from: https://imagemagick.org/script/download.php#windows
2. **Run the PowerShell script:**
   ```powershell
   .\resize-steam-background.ps1
   ```
3. **Follow the prompts** to enter the path to your Steam logo image

## Option 2: Manual Setup (No ImageMagick)

### Step 1: Copy and Rename
1. Copy your Steam logo image from Downloads to: `app/src/main/res/drawable/`
2. Rename it to: `steam_background.png`

### Step 2: Resize Manually
You can resize the image using any image editor (Paint, GIMP, Photoshop, etc.):
- **Recommended size:** 720x720 pixels
- **Format:** PNG
- **Save as:** `steam_background.png` in the drawable folder

### Step 3: Update Layout
After placing the image, I'll update the layout file to use your new image.

## What the script does:
- Resizes your image for different Android screen densities
- Creates multiple versions (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
- Maintains aspect ratio and centers the image
- Places all files in the correct Android drawable folder

## After setup:
The layout will automatically use your new Steam background image instead of the old one. 