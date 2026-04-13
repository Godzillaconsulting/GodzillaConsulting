import re

with open('server/controllers/aiStudioController.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Instead of `public/media/studio_clean`, we save to `E:/assets`
target = """const mediaDir = path.join(process.cwd(), 'public', 'media', 'studio_clean');"""
replacement = """const mediaDir = 'E:/assets';"""
c = c.replace(target, replacement)

target2 = """postProcessJobs.set(taskId, { status: 'done', localUrl: `/api/media/studio_clean/${taskId}_clean.mp4` });"""
replacement2 = """postProcessJobs.set(taskId, { status: 'done', localUrl: `/api/media/videos/${taskId}_clean.mp4` });"""
c = c.replace(target2, replacement2)

with open('server/controllers/aiStudioController.js', 'w', encoding='utf-8') as f:
    f.write(c)
