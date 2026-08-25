import os
from PIL import Image, ImageDraw, ImageFont

CANVAS_W = 1080
font_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Oswald-Bold.ttf")
try:
    font = ImageFont.truetype(font_path, 52)
except Exception as e:
    print(f"FAILED TO LOAD OSWALD: {e}")
    font = ImageFont.truetype("impact.ttf", 52)

text = "EL SECTOR ENERGÉTICO ESTÁ SUFRIENDO UNA TRANSFORMACIÓN MASIVA Y ESTA PLANTA ACABA DE DAR EL GOLPE SOBRE LA MESA. LA EMPRESA IMPLEMENTÓ UN SISTEMA DE INTELIGENCIA ARTIFICIAL PREDICTIVA DE ÚLTIMA GENERACIÓN QUE LOGRÓ REDUCIR SUS COSTOS DE MANTENIMIENTO EN UN <COLOR>40%</COLOR> DURANTE EL ÚLTIMO SEMESTRE Y EVITÓ APAGONES MASIVOS EN LA REGIÓN."
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

img = Image.new('RGB', (1080, 1350))
draw = ImageDraw.Draw(img)
space_w = draw.textlength(" ", font=font)

lines = []
current_line = []
current_line_w = 0
max_w = CANVAS_W - 100

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

print(f"Total lines generated: {len(lines)}")
for i, line in enumerate(lines):
    print(f"Line {i+1}: {line}")
