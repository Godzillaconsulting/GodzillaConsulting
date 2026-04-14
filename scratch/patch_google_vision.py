import re

with open('server/controllers/aiStudioController.js', 'r', encoding='utf-8') as f:
    c = f.read()

# Locate the fallback block
fallback_regex = r"(\/\/ Para no romper la experiencia si se usa el SDK sin capacidades.*?return res\.status\(500\)\.json\(\{ error: \"GotSora no disponible.*?\n              \})"

google_native_logic = """              // Nativamente utilizamos la API Top de Google (Gemini Image Models) ya que contamos con la llave.
              const taskId = 'googleimg_' + Date.now();
              postProcessJobs.set(taskId, { status: 'working', progress: 0 });

              // Proceso asíncrono robusto
              (async () => {
                  try {
                      const ai = genAI.getGenerativeModel({ model: "gemini-3.1-flash-image-preview" });
                      const result = await ai.generateContent(optimizedPrompt || prompt);
                      const candidates = result.response.candidates;
                      if (candidates && candidates.length > 0) {
                          const parts = candidates[0].content.parts;
                          if (parts && parts.length > 0 && parts[0].inlineData) {
                              const b64 = parts[0].inlineData.data;
                              const mime = parts[0].inlineData.mimeType || "image/png";
                              postProcessJobs.set(taskId, { status: 'done', localUrl: `data:${mime};base64,${b64}` });
                              return;
                          }
                      }
                      postProcessJobs.set(taskId, { status: 'failed', error: "Google no arrojó InlineData en su respuesta" });
                  } catch (e) {
                      console.error("[GOOGLE-VISION] Error Generando Imagen:", e.message);
                      postProcessJobs.set(taskId, { status: 'failed', error: e.message });
                  }
              })();
              
              return res.status(200).json({ job_id: taskId, status: "processing", provider: "Google Vision API" });"""

if re.search(fallback_regex, c, flags=re.DOTALL):
    c = re.sub(fallback_regex, google_native_logic, c, flags=re.DOTALL)
else:
    print("FALLBACK REGEX NO MATCH")

# Also fix CockersStudio.jsx so instead of Sora (LCM) it showcases Google Vision Top Model
with open('src/components/CockersStudio.jsx', 'r', encoding='utf-8') as f:
    ui = f.read()

ui = ui.replace("['Imagen 4.0 (Express)', 'Imagen 3.0 (Ultra)', 'Sora (LCM)']", "['Google Imagen 3 (Ultra)', 'Google Vision (Pro)', 'Google Vision (Fast)']")

with open('server/controllers/aiStudioController.js', 'w', encoding='utf-8') as f:
    f.write(c)
    
with open('src/components/CockersStudio.jsx', 'w', encoding='utf-8') as f:
    f.write(ui)
