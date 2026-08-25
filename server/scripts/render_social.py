import os
import sys
import json
import urllib.request
from PIL import Image, ImageDraw, ImageFont

CANVAS_W, CANVAS_H = 1080, 1350

def get_premium_font(size, is_condensed=False):
    if is_condensed:
        font_name = "Oswald-Bold.ttf"
        url = f"https://github.com/google/fonts/raw/main/ofl/oswald/static/Oswald-Bold.ttf"
    else:
        font_name = "Montserrat-Medium.ttf"
        url = f"https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-Medium.ttf"
        
    font_path = os.path.join(os.path.dirname(__file__), font_name)
    
    if not os.path.exists(font_path):
        try:
            print(f"Downloading {font_name}...")
            urllib.request.urlretrieve(url, font_path)
        except Exception as e:
            print(f"Error downloading font: {e}")
            pass

    try:
        return ImageFont.truetype(font_path, size)
    except:
        try:
            return ImageFont.truetype(r"C:\Windows\Fonts\impact.ttf", size)
        except:
            return ImageFont.load_default()

def draw_text_with_highlights(draw, text, cx, bottom_y, max_w, font, highlight_color):
    text = text.upper()
    parts = []
    current = ""
    in_color = False
    
    i = 0
    while i < len(text):
        if text[i:i+7] == "<COLOR>":
            if current: parts.append((current, False))
            current = ""
            in_color = True
            i += 7
        elif text[i:i+8] == "</COLOR>":
            if current: parts.append((current, True))
            current = ""
            in_color = False
            i += 8
        else:
            current += text[i]
            i += 1
    if current: parts.append((current, False))
    
    space_w = draw.textlength(" ", font=font)
    lines = []
    current_line = []
    current_line_w = 0
    
    for text_part, is_hl in parts:
        words = text_part.split(" ")
        for idx, word in enumerate(words):
            if word == "" and idx > 0:
                current_line_w += space_w
                if current_line: current_line[-1][0] += " "
                continue
                
            word_w = draw.textlength(word, font=font)
            needs_space = False
            if current_line and current_line[-1][0] != "" and not current_line[-1][0].endswith(" "):
                needs_space = True
                
            w_added = word_w + (space_w if needs_space else 0)
            
            if current_line_w + w_added > max_w and current_line:
                lines.append(current_line)
                current_line = [[word, is_hl]]
                current_line_w = word_w
            else:
                if needs_space:
                    current_line[-1][0] += " "
                    current_line_w += space_w
                current_line.append([word, is_hl])
                current_line_w += word_w

    if current_line:
        lines.append(current_line)
        
    line_h = font.getbbox("AYG")[3] * 1.15  
    total_text_height = len(lines) * line_h
    
    start_y = bottom_y - total_text_height
    y = start_y
    
    for line in lines:
        line_w = 0
        for seg, _ in line:
            line_w += draw.textlength(seg, font=font)
            
        start_x = cx - (line_w / 2)
        draw_cx = start_x
        
        for seg, is_hl in line:
            col = highlight_color if is_hl else "#ffffff"
            draw.text((draw_cx, y), seg, font=font, fill=col)
            draw_cx += draw.textlength(seg, font=font)
        
        y += line_h
        
    return start_y

def render_image(item):
    base_path = item["baseImagePath"]
    out_path = item["outPath"]
    
    base = Image.open(base_path).convert("RGBA")
    w, h = base.size
    scale = max(CANVAS_W/w, CANVAS_H/h)
    new_w, new_h = int(w * scale), int(h * scale)
    base = base.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - CANVAS_W)/2
    top = 0
    canvas = base.crop((left, top, left + CANVAS_W, top + CANVAS_H))
    
    dark_overlay = Image.new("RGBA", canvas.size, (10, 10, 15, 80)) 
    canvas = Image.alpha_composite(canvas, dark_overlay)
    
    gradient = Image.new('RGBA', (CANVAS_W, CANVAS_H))
    draw_grad = ImageDraw.Draw(gradient)
    for y in range(CANVAS_H):
        if y < CANVAS_H * 0.4:
            alpha = 0
        else:
            alpha = int(220 * ((y - CANVAS_H * 0.4) / (CANVAS_H * 0.6)))
        draw_grad.line([(0, y), (CANVAS_W, y)], fill=(0, 0, 0, alpha))
    canvas = Image.alpha_composite(canvas, gradient)
    
    canvas = canvas.convert("RGB")
    draw = ImageDraw.Draw(canvas)
    
    # Margin and spacing rules:
    # Text block is drawn anchored to bottom_margin (60px from bottom edge).
    # Header graphic (white lines + hollow circle + GODZILLA CO.) must sit nicely ABOVE the text block with zero overlap.
    
    font_main = get_premium_font(46, is_condensed=True)
    bottom_margin = CANVAS_H - 60
    
    # Draw text anchored to bottom_margin (CANVAS_H - 60)
    text_top_y = draw_text_with_highlights(draw, item["text"], CANVAS_W//2, bottom_margin, CANVAS_W - 120, font_main, "#d20808")
    
    # Place GODZILLA CO. text 35px above the main text block
    font_small = get_premium_font(16, is_condensed=False)
    godzilla_text_y = text_top_y - 35
    draw.text((CANVAS_W//2, godzilla_text_y), "GODZILLA CO.", font=font_small, fill="#ffffff", anchor="mm")
    
    # Place hollow red circle 35px above GODZILLA CO. text
    cx = CANVAS_W // 2
    circle_r = 20
    circle_y = godzilla_text_y - 35
    gap = 15
    
    # Draw horizontal white lines aligned with the center of the circle
    draw.line([(80, circle_y), (cx - circle_r - gap, circle_y)], fill="#ffffff", width=2)
    draw.line([(cx + circle_r + gap, circle_y), (CANVAS_W - 80, circle_y)], fill="#ffffff", width=2)
    
    # Draw completely hollow red circle
    draw.ellipse([(cx - circle_r, circle_y - circle_r), (cx + circle_r, circle_y + circle_r)], fill=None, outline="#d20808", width=3)
    
    final_overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 20))
    canvas.paste(final_overlay, (0, 0), final_overlay)
    
    canvas.save(out_path, quality=95)
    print(f"Saved: {out_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python render_social.py <data.json>")
        sys.exit(1)
        
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for item in data:
        render_image(item)
