#!/bin/bash
# Create simple SVG icons and convert to PNG

# Create base SVG
cat > icon.svg << 'SVGEOF'
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#grad)"/>
  <text x="64" y="85" font-size="64" text-anchor="middle" fill="white" font-family="Arial">💰</text>
</svg>
SVGEOF

# Check if ImageMagick is available
if command -v convert &> /dev/null; then
    convert -background none icon.svg -resize 16x16 icon16.png
    convert -background none icon.svg -resize 32x32 icon32.png
    convert -background none icon.svg -resize 48x48 icon48.png
    convert -background none icon.svg -resize 128x128 icon128.png
    echo "Icons created with ImageMagick"
else
    echo "ImageMagick not available, creating placeholder PNGs"
    # Create simple colored PNG placeholders using Python
    python3 << 'PYEOF'
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    img = Image.new('RGB', (size, size), color=(102, 126, 234))
    draw = ImageDraw.Draw(img)
    
    # Draw a simple $ symbol
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size * 0.6))
    except:
        font = ImageFont.load_default()
    
    text = "$"
    # Get text size using textbbox
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    position = ((size - text_width) // 2, (size - text_height) // 2 - bbox[1])
    draw.text(position, text, fill=(255, 255, 255), font=font)
    
    return img

for size in [16, 32, 48, 128]:
    img = create_icon(size)
    img.save(f'icon{size}.png')
    print(f"Created icon{size}.png")
PYEOF
fi
