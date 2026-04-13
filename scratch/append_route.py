import re

with open('server/routes/aiStudio.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Add purifyVideo to imports
c = c.replace('generateScriptChat } from', 'generateScriptChat, purifyVideo } from')

# Add multer import
c = c.replace("import express from 'express';", "import express from 'express';\nimport multer from 'multer';\nimport os from 'os';\n\nconst upload = multer({ dest: os.tmpdir() });")

# Add route
route_hook = """router.post('/refine', authenticateToken, refineRenderJob);"""
route_injection = """router.post('/refine', authenticateToken, refineRenderJob);
router.post('/purify-video', authenticateToken, upload.single('file'), purifyVideo);"""

c = c.replace(route_hook, route_injection)

with open('server/routes/aiStudio.js', 'w', encoding='utf-8') as f:
    f.write(c)
