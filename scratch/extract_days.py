import openpyxl
import json
import os

def main():
    xlsx_path = 'Calendario_Marketing_30_Dias_Prompts_Detallados.xlsx'
    if not os.path.exists(xlsx_path):
        print(f"Error: {xlsx_path} not found")
        return

    wb = openpyxl.load_workbook(xlsx_path)
    ws = wb.active
    
    # Headers are:
    # 0: #
    # 1: Tema
    # 2: NARRACION ESCENA 1
    # 3: VISUAL ESCENA 1 (Prompt Imagen Detallado)
    # 4: VIDEO ESCENA 1 (Prompt Movimiento Detallado)
    # 5: NARRACION ESCENA 2
    # 6: VISUAL ESCENA 2 (Prompt Imagen Detallado)
    # 7: VIDEO ESCENA 2 (Prompt Movimiento Detallado)
    # 8: NARRACION ESCENA 3
    # 9: VISUAL ESCENA 3 (Prompt Imagen Detallado)
    # 10: VIDEO ESCENA 3 (Prompt Movimiento Detallado)
    # 11: NARRACION ESCENA 4
    # 12: VISUAL ESCENA 4 (Prompt Imagen Detallado)
    # 13: VIDEO ESCENA 4 (Prompt Movimiento Detallado)
    # 14: NARRACION ESCENA 5 (CTA)
    # 15: VISUAL ESCENA 5 (Prompt Imagen Detallado)
    # 16: VIDEO ESCENA 5 (Prompt Movimiento Detallado)

    tasks = []
    
    # Iterate rows starting from row 2 (index 2 in 1-based index)
    # We want exactly 8 days (Day 1 to 8, which correspond to rows 2 to 9)
    for row_idx in range(2, 10):
        row = ws[row_idx]
        if not row[1].value:
            continue
            
        tema = row[1].value
        
        scenes = {}
        scenes['NARRACION ESCENA 1'] = row[2].value
        scenes['VISUAL ESCENA 1 (Prompt Imagen Detallado)'] = row[3].value
        
        scenes['NARRACION ESCENA 2'] = row[5].value
        scenes['VISUAL ESCENA 2 (Prompt Imagen Detallado)'] = row[6].value
        
        scenes['NARRACION ESCENA 3'] = row[8].value
        scenes['VISUAL ESCENA 3 (Prompt Imagen Detallado)'] = row[9].value
        
        scenes['NARRACION ESCENA 4'] = row[11].value
        scenes['VISUAL ESCENA 4 (Prompt Imagen Detallado)'] = row[12].value
        
        scenes['NARRACION ESCENA 5 (CTA)'] = row[14].value
        scenes['VISUAL ESCENA 5 (Prompt Imagen Detallado)'] = row[15].value
        
        task_data = {
            'day_number': row[0].value,
            'title': f"Día {int(row[0].value)}: {tema}",
            'prompt': f"Calendario de Marketing B2B - Tema: {tema}",
            'scenes': scenes
        }
        tasks.append(task_data)
        
    out_path = 'scratch/extracted_tasks.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully extracted {len(tasks)} tasks to {out_path}")

if __name__ == '__main__':
    main()
