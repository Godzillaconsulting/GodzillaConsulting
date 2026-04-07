import os
import time
import json
import asyncio
import threading
from datetime import datetime, timedelta
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths (apuntando a la misma ruta que la web app usa)
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "server", "uploads", "assets")
ARCHIVE_LOG = os.path.join(ASSETS_DIR, "sora_generations_log.json")

# Asegurar directorios
os.makedirs(ASSETS_DIR, exist_ok=True)

class SoraRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    resolution: str = "1080p"
    diffusion_steps: int = 50
    cfg_scale: float = 7.5
    sampler: str = "DPM++"
    seed: int = -1
    upscale: bool = False

def init_log():
    if not os.path.exists(ARCHIVE_LOG):
        with open(ARCHIVE_LOG, "w") as f:
            json.dump([], f)

init_log()

def save_metadata(entry):
    with open(ARCHIVE_LOG, "r") as f:
        data = json.load(f)
    data.append(entry)
    with open(ARCHIVE_LOG, "w") as f:
        json.dump(data, f, indent=4)

def garbage_collector_loop():
    """ Runs every hour to clean up .mp4 files older than 24 hours """
    while True:
        try:
            now = time.time()
            deleted_count = 0
            for filename in os.listdir(ASSETS_DIR):
                if filename.endswith(".mp4") and filename.startswith("sora_"):
                    filepath = os.path.join(ASSETS_DIR, filename)
                    file_modified = os.path.getmtime(filepath)
                    # Si el archivo tiene más de 24 horas (86400 segundos)
                    if now - file_modified > 86400:
                        os.remove(filepath)
                        deleted_count += 1
            if deleted_count > 0:
                print(f"[Garbage Collector] Eliminados {deleted_count} videos que superaron las 24 horas.")
        except Exception as e:
            print(f"[Garbage Collector Error] {e}")
        
        # Dormir 1 hora (3600 seg)
        time.sleep(3600)

# Lanzar el Hilo del Garbage Collector en el Background
gc_thread = threading.Thread(target=garbage_collector_loop, daemon=True)
gc_thread.start()

async def mock_cluster_generation(req: SoraRequest, task_id: str):
    # Simulamos el tiempo de espera del motor DiT
    await asyncio.sleep(5)
    
    video_filename = f"sora_{task_id}.mp4"
    thumb_filename = f"sora_thumb_{task_id}.jpg"
    
    video_path = os.path.join(ASSETS_DIR, video_filename)
    thumb_path = os.path.join(ASSETS_DIR, thumb_filename)
    
    # 1. Crear un video mock temporal (Para evitar explotar el disco, de pocos bytes)
    with open(video_path, "wb") as f:
        f.write(b"MOCK_MP4_CONTENT")
        
    # 2. Crear una miniatura falsa ("Captura de lo que se creó" que guardaremos por siempre)
    with open(thumb_path, "wb") as f:
        f.write(b"MOCK_JPG_THUMBNAIL_CONTENT")

    print(f"[SORA CLUSTER] DiT Render completado. Video guardado en {video_path}")
    print(f"[SORA ARCHIVE] Miniatura Permanente guardada en {thumb_path}")

    # Escribimos en el Ledger histórico
    metadata = {
        "task_id": task_id,
        "prompt": req.prompt,
        "resolution": req.resolution,
        "steps": req.diffusion_steps,
        "cfg": req.cfg_scale,
        "created_at": datetime.now().isoformat(),
        "video_url": f"/api/media/assets/{video_filename}",
        "thumbnail_url": f"/api/media/assets/{thumb_filename}"
    }
    save_metadata(metadata)


@app.post("/api/generate_video")
async def generate_video(req: SoraRequest, background_tasks: BackgroundTasks):
    task_id = str(int(time.time() * 1000))
    print(f"[SORA INTERFACE] Ingestion de tarea recibida: {req.prompt[:30]}... Params: CFG {req.cfg_scale}, Steps {req.diffusion_steps}")
    
    # Enviar al cluster de forma asíncrona (como si fuera ComfyUI/GPU local)
    background_tasks.add_task(mock_cluster_generation, req, task_id)
    
    return {
        "success": True,
        "status": "PROCESSING",
        "task_id": task_id,
        "estimated_time": req.diffusion_steps * 0.2
    }


if __name__ == "__main__":
    import uvicorn
    print("[SORA BRIDGE] Iniciando Godzilla Sora In-House Python Bridge on Port 5000...")
    uvicorn.run(app, host="0.0.0.0", port=5000)
