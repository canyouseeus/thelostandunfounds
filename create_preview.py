#!/usr/bin/env python3
from PIL import Image
import os

# Create a 1200x1200 black background
preview = Image.new('RGB', (1200, 1200), color='#000000')

# Load the logo
logo_path = 'public/logo.png'
if os.path.exists(logo_path):
    logo = Image.open(logo_path).convert('RGBA')
    
    # Resize logo to fit nicely (80% of the preview size)
    logo_size = int(1200 * 0.8)
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # Calculate position to center the logo
    x = (1200 - logo_size) // 2
    y = (1200 - logo_size) // 2
    
    # Paste logo onto black background
    preview.paste(logo, (x, y), logo)
    
    # Save the preview image
    preview.save('public/og-image.png', 'PNG')
    print(f"Created og-image.png with black background")
else:
    print(f"Logo not found at {logo_path}")

