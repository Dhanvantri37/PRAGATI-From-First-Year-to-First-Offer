from PIL import Image

def analyze_portrait(path, name):
    img = Image.open(path)
    w, h = img.size
    print(f"--- {name} ({w}x{h}) ---")
    
    # Let's sample key color coordinates to find lips and eyes
    # Since the images are 1024x1024, let's do a search for lips (high redness)
    # and eyes (local dark regions in the upper face area).
    
    # We will print a 2% grid of RGB values around the center of the face
    # to find the exact coordinates manually by analyzing the output.
    # Let's search:
    # Eyes are typically between Y=40% and Y=50%
    # Mouth is typically between Y=60% and Y=75%
    
    # Let's find the lip center (highest red intensity relative to green/blue)
    best_mouth_y = 0
    best_mouth_x = 0
    max_redness = -9999
    
    # Search mouth region: X: 45% to 55%, Y: 58% to 75%
    for y in range(int(h * 0.58), int(h * 0.75)):
        for x in range(int(w * 0.45), int(w * 0.55)):
            r, g, b, *a = img.getpixel((x, y))
            # Lip color has high R and lower G and B
            redness = r - max(g, b)
            if redness > max_redness:
                max_redness = redness
                best_mouth_y = y
                best_mouth_x = x
                
    # Search left eye (viewer's left, X: 32% to 44%, Y: 40% to 50%)
    # Left eye is a dark pupil surrounded by white, let's find the darkest pixel
    min_left_val = 9999
    best_left_x = 0
    best_left_y = 0
    for y in range(int(h * 0.40), int(h * 0.50)):
        for x in range(int(w * 0.32), int(w * 0.44)):
            r, g, b, *a = img.getpixel((x, y))
            val = (r + g + b) / 3
            if val < min_left_val:
                min_left_val = val
                best_left_x = x
                best_left_y = y
                
    # Search right eye (viewer's right, X: 56% to 68%, Y: 40% to 50%)
    min_right_val = 9999
    best_right_x = 0
    best_right_y = 0
    for y in range(int(h * 0.40), int(h * 0.50)):
        for x in range(int(w * 0.56), int(w * 0.68)):
            r, g, b, *a = img.getpixel((x, y))
            val = (r + g + b) / 3
            if val < min_right_val:
                min_right_val = val
                best_right_x = x
                best_right_y = y
                
    print(f"Left Eye (X, Y): {best_left_x/w*100:.2f}%, {best_left_y/h*100:.2f}%")
    print(f"Right Eye (X, Y): {best_right_x/w*100:.2f}%, {best_right_y/h*100:.2f}%")
    print(f"Mouth (X, Y): {best_mouth_x/w*100:.2f}%, {best_mouth_y/h*100:.2f}%")

analyze_portrait("frontend/public/arjun_sharma.png", "Arjun")
analyze_portrait("frontend/public/priya_mehta.png", "Priya")
analyze_portrait("frontend/public/vikram_nair.png", "Vikram")
