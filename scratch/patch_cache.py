import re

with open('src/components/CockersStudio.jsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace all occurrences of /api/studio/status/ calls to include cache-buster
# 1. purifyVideo poll
c = c.replace("const stRes = await fetch(`${'' || ''}/api/studio/status/${data.job_id}`, {", "const stRes = await fetch(`${'' || ''}/api/studio/status/${data.job_id}?t=${Date.now()}`, {")
# 2. task status poll  (if there are multiple matches, it will replace all)
c = c.replace("const statusRes = await fetch(`${'' || ''}/api/studio/status/${encodedJobId}`, {", "const statusRes = await fetch(`${'' || ''}/api/studio/status/${encodedJobId}?t=${Date.now()}`, {")

with open('src/components/CockersStudio.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

# We should also ensure the Node backend explicitly avoids cache headers
with open('server/routes/aiStudio.js', 'r', encoding='utf-8') as f:
    ai = f.read()

# aiStudioController is where checkRenderStatus is. Actually, just adding it to verify.
with open('server/controllers/aiStudioController.js', 'r', encoding='utf-8') as f:
    ctrl = f.read()

ctrl = ctrl.replace("export const checkRenderStatus = async (req, res) => {", "export const checkRenderStatus = async (req, res) => { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); ")

with open('server/controllers/aiStudioController.js', 'w', encoding='utf-8') as f:
    f.write(ctrl)
