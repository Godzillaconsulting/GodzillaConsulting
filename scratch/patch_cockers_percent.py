import re

with open('src/components/CockersStudio.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Target block in handlePurifyVideo
target_block = """                          if (stData.status === 'succeed') {
                              clearInterval(pollTimer);
                              setPurifyingStatus(null);
                              setPurifiedResult(stData.result_url);
                          }"""

replace_block = """                          if (stData.status === 'succeed') {
                              clearInterval(pollTimer);
                              setPurifyingStatus(null);
                              setPurifyPercent(100);
                              setPurifiedResult(stData.result_url);
                          } else if (stData.status === 'processing') {
                              setPurifyPercent(stData.progress || 0);
                          }"""

c = c.replace(target_block, replace_block)


# Also update the UI to show the percentage
ui_target = """<span className="text-[10px] text-white font-bold uppercase tracking-widest">{purifyingStatus === 'uploading' ? 'Subiendo 300MB/s...' : 'Destruyendo Marca en CPU...'}</span>"""
ui_replace = """<span className="text-[10px] text-white font-bold uppercase tracking-widest">{purifyingStatus === 'uploading' ? 'Subiendo 300MB/s...' : `Destruyendo Marca... ${purifyPercent}%`}</span>"""

c = c.replace(ui_target, ui_replace)

with open('src/components/CockersStudio.jsx', 'w', encoding='utf-8') as f:
    f.write(c)
