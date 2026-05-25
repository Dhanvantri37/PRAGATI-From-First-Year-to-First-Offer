from PIL import Image, ImageDraw

def draw_adjusted(image_path, output_path, eye_left, eye_right, eye_top, mouth_x, mouth_y, name):
    img = Image.open(image_path).convert('RGB')
    w, h = img.size
    draw = ImageDraw.Draw(img)
    
    le_x, le_y = int(eye_left * w / 100), int(eye_top * h / 100)
    re_x, re_y = int(eye_right * w / 100), int(eye_top * h / 100)
    m_x, m_y = int(mouth_x * w / 100), int(mouth_y * h / 100)
    
    r = 15
    # Draw eyes
    draw.ellipse([le_x-r, le_y-r, le_x+r, le_y+r], outline='green', width=4)
    draw.ellipse([re_x-r, re_y-r, re_x+r, re_y+r], outline='green', width=4)
    
    # Draw adjusted mouth
    draw.ellipse([m_x-r, m_y-r, m_x+r, m_y+r], outline='yellow', width=5)
    draw.text((le_x, le_y - 25), "Eye Left", fill='green')
    draw.text((re_x, re_y - 25), "Eye Right", fill='green')
    draw.text((m_x, m_y + 15), f"Adjusted Mouth ({mouth_x}%, {mouth_y}%)", fill='yellow')
    
    img.save(output_path)
    print(f"Saved {name} adjusted test to {output_path}")

# Arjun
draw_adjusted("frontend/public/arjun_sharma.png", "C:/Users/Guruprasad/.gemini/antigravity/brain/5b278125-271c-43ab-9301-6f72afa539df/arjun_adjusted.png", 56.35, 66.21, 36.23, 61.5, 45.6, "Arjun")

# Priya
draw_adjusted("frontend/public/priya_mehta.png", "C:/Users/Guruprasad/.gemini/antigravity/brain/5b278125-271c-43ab-9301-6f72afa539df/priya_adjusted.png", 45.31, 54.30, 32.62, 50.0, 42.6, "Priya")

# Vikram
draw_adjusted("frontend/public/vikram_nair.png", "C:/Users/Guruprasad/.gemini/antigravity/brain/5b278125-271c-43ab-9301-6f72afa539df/vikram_adjusted.png", 44.04, 53.61, 30.38, 49.8, 40.5, "Vikram")
