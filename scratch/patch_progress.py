import re

with open('server/utils/videoProcessor.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the method signature
c = c.replace('export const removeWatermark = async (inputPath, outputPath) => {', 'export const removeWatermark = async (inputPath, outputPath, onProgress = () => {}) => {')

# Inject progress event just before save
c = c.replace('.save(outputPath)', ".on('progress', (progress) => { if(progress.percent) onProgress(Math.floor(progress.percent)); }).save(outputPath)")

with open('server/utils/videoProcessor.js', 'w', encoding='utf-8') as f:
    f.write(c)

# Also update aiStudioController.js
with open('server/controllers/aiStudioController.js', 'r', encoding='utf-8') as f:
    ctrl = f.read()

# For removeWatermark usages. Line ~142 and Line ~481.
# 1. Native background rendering trigger 
target1 = "await removeWatermark(rawPath, cleanPath);"
replace1 = "await removeWatermark(rawPath, cleanPath, (p) => { postProcessJobs.set(taskId, { status: 'working', progress: p }); });"
ctrl = ctrl.replace(target1, replace1)

# 2. CheckRenderStatus needs to read it
target2 = "return res.json({ status: 'processing', progress: 99 });"
replace2 = "return res.json({ status: 'processing', progress: job.progress || 99 });"
ctrl = ctrl.replace(target2, replace2)

with open('server/controllers/aiStudioController.js', 'w', encoding='utf-8') as f:
    f.write(ctrl)
