import os
import sys
import time
import ctypes
import threading
import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ========================================================
# 1. ENLACE CTYPES: DOBLE PUNTERO Y ESTRUCTURAS
# ========================================================

# Load the Native DLL (so/dll support cross-platform)
lib_ext = '.dll' if os.name == 'nt' else '.so'
lib_path = os.path.abspath(os.path.join(os.path.dirname(__file__), f'godzilla_tensor_manager{lib_ext}'))

try:
    c_engine = ctypes.CDLL(lib_path)
    
    # void* CreateTimeline()
    c_engine.CreateTimeline.restype = ctypes.c_void_p
    
    # void DestroyTimeline(void* timeline_ptr)
    c_engine.DestroyTimeline.argtypes = [ctypes.c_void_p]
    
    # void AppendFrameToTimeline(void* timeline, float** tensor, int c, int w, int h)
    # We must properly type the double pointer Float**
    c_float_p = ctypes.POINTER(ctypes.c_float)
    c_float_pp = ctypes.POINTER(c_float_p)
    c_engine.AppendFrameToTimeline.argtypes = [ctypes.c_void_p, c_float_pp, ctypes.c_int, ctypes.c_int, ctypes.c_int]
    
    # int GetTimelineFrameCount(void* timeline)
    c_engine.GetTimelineFrameCount.argtypes = [ctypes.c_void_p]
    c_engine.GetTimelineFrameCount.restype = ctypes.c_int
    print("[SYSTEM] C++ Tensor Engine C-Bindings Loaded successfully.")
except Exception as e:
    print(f"[WARNING] Native Engine DLL not found at {lib_path}. Please recompile. Error: {e}")
    c_engine = None

# ========================================================
# 2. DEFINICIÓN DEL SERVIDOR WEBSOCKET
# ========================================================
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI(title="Godzilla AI Local GPU Node")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_headers=["*"], allow_methods=["*"])
app_asgi = socketio.ASGIApp(sio, app)

@sio.event
async def connect(sid, environ):
    print(f"[WS] Vercel Dashboard Conectado al Master Cluster: {sid}")

@sio.event
async def disconnect(sid):
    print(f"[WS] Vercel Dashboard Desconectado: {sid}")

# ========================================================
# 3. GESTIÓN DE RAM Y CONVERSIÓN DE TENSORES
# ========================================================
def generate_frame_tensor(channels, width, height):
    """
    Simulates a PyTorch tensor extraction. 
    Instead of passing a fat numpy array, it crafts the low-level double pointer (float**) in C memory
    to pass directly without garbage-collector overhead.
    """
    # Create array of float pointers
    RowArrayType = c_float_p * channels
    rows = RowArrayType()
    
    for i in range(channels):
        # Allocate the exact block size in C-space for height*width
        ColArrayType = ctypes.c_float * (width * height)
        cols = ColArrayType()
        # In a real PyTorch scenario: ptr = tensor_data.data_ptr()
        # and cast directly. Here we just set up an empty array block
        rows[i] = ctypes.cast(cols, c_float_p)
    
    return ctypes.cast(rows, c_float_pp)

async def sampling_pipeline_simulation(task_id: str, steps: int, mode: str):
    """
    La arquitectura C++ procesando Stable Diffusion generación de forma manual.
    """
    if c_engine is None:
        await sio.emit("render_progress", {"task_id": task_id, "error": "C++ Engine Offline."})
        return
        
    print(f"\n[ENGINE START] Initiating HPC Pipeline -> Mode: {mode}")
    await sio.emit("render_progress", {"task_id": task_id, "status": "RENDERING", "msg": f"C++ Nodes Initialized for {mode} mode", "step": 0})
    
    # 1. Initialize Doubly Linked List in native C++
    timeline_ptr = c_engine.CreateTimeline()
    
    CHANNELS, WIDTH, HEIGHT = 3, 1024, 1024 # Standard 1024 base 
    
    try:
        for i in range(1, steps + 1):
            import asyncio
            await asyncio.sleep(0.1) # Simulate high GPU inference crunching time
            
            # 2. Extract Memory raw pointer mapped to Tensor 
            raw_c_tensor = generate_frame_tensor(CHANNELS, WIDTH, HEIGHT)
            
            # 3. Inject tensor pointer directly through FFI to the C++ Node
            c_engine.AppendFrameToTimeline(timeline_ptr, raw_c_tensor, CHANNELS, WIDTH, HEIGHT)
            
            nodes_count = c_engine.GetTimelineFrameCount(timeline_ptr)
            
            # 4. Stream back state to Vercel/GodzillaSora over WebSockets
            if i % 10 == 0 or i == steps:
                print(f"[Sampling {i}/{steps}] Active Double-Linked Nodes: {nodes_count}")
                await sio.emit("render_progress", {
                    "task_id": task_id, 
                    "status": "RENDERING", 
                    "msg": f"Sampling step {i}/{steps}. VRAM Stable.", 
                    "step": i,
                    "max_steps": steps
                })
        
        # Simula compresión / encodeo usando FFMPEG dentro de C++
        await sio.emit("render_progress", {"task_id": task_id, "status": "DONE", "msg": "Compresión Terminada. Media lista."})
        print("[ENGINE COMPLETE] Tensor Matrix finalized and packed.")
        
    finally:
        # 5. Crucial: The custom Destructors trigger here destroying Double Linked Pointers row by row
        c_engine.DestroyTimeline(timeline_ptr)
        print("[GC OVERRIDE] C++ memory explicitly destroyed. Preventing generic Python Memory Leaks.\n")

@app.post("/sora-start")
async def start_generation(payload: dict):
    # This is the endpoint Vercel pings to start the heavy cluster
    mode = payload.get("mode", "photo")
    steps = payload.get("diffusion_steps", 50)
    task_id = "sora_live_" + str(int(time.time()))
    
    import asyncio
    asyncio.create_task(sampling_pipeline_simulation(task_id, steps, mode))
    
    return {"success": True, "task_id": task_id, "msg": "Master Cluster GPU activado."}

if __name__ == "__main__":
    print("""
      --------------------------------------------------
      [GODZILLA AI] LOCAL HPC INFERENCE NODE ONLINE
      [TECH] CTYPES DOUBLE-POINTER BINDING + ASGI
      --------------------------------------------------
    """)
    uvicorn.run("godzilla_inference_bridge:app_asgi", host="127.0.0.1", port=5000, reload=True)
