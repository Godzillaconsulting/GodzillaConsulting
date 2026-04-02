import os, json

log_files = [
    r'C:\Users\GODZILLA.IA\.gemini\antigravity\brain\eb825e76-6136-45aa-9c38-9717425cacbd\.system_generated\logs\overview.txt',
    r'C:\Users\GODZILLA.IA\.gemini\antigravity\brain\e3806ff3-aeb7-406a-adf5-d26b4a94c9f3\.system_generated\logs\overview.txt',
    r'C:\Users\GODZILLA.IA\.gemini\antigravity\brain\775b374d-91aa-4e82-8285-e9e7e9128086\.system_generated\logs\overview.txt'
]

import re

for log_path in log_files:
    if not os.path.exists(log_path): continue
    with open(log_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    for block in content.split('Arguments:'):
        if 'TargetFile' in block and 'CodeContent' in block:
            try:
                json_str = block.split('Status:')[0].strip()
                if json_str.startswith('```json'):
                    json_str = json_str[7:]
                if json_str.endswith('```'):
                    json_str = json_str[:-3]
                
                data = json.loads(json_str)
                if 'TargetFile' in data and 'CodeContent' in data:
                    print(f"Restoring {data['TargetFile']}")
                    with open(data['TargetFile'], 'w', encoding='utf-8') as out_f:
                        out_f.write(data['CodeContent'])
            except Exception as e:
                pass
print('Done parsing write_to_file')
