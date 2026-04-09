import os
import sys

# ========================================================
# CONFIGURACIONES DE DEEP STORAGE (DISCO SECONDARIO E:)
# ========================================================
# Esto previene que el SSD Principal C: sufra desgaste y colapso por modelos gigantes

MODELS_DIR = r"E:\GodzillaSora_Models"
OUTPUTS_DIR = r"E:\GodzillaSora_Outputs"
OFFLOAD_DIR = r"E:\GodzillaSora_Offload"

def apply_storage_directives():
    print(f"[CONFIG] Inicializando Enrutamiento Deep Storage en {MODELS_DIR}...")
    
    # Asegurar que las carpetas maestras existen físicamente
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(os.path.join(MODELS_DIR, "torch"), exist_ok=True)
    os.makedirs(os.path.join(MODELS_DIR, "huggingface"), exist_ok=True)
    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    os.makedirs(OFFLOAD_DIR, exist_ok=True)
    
    # Inyectar Variables de Entorno de Bajo Nivel antes de importar PyTorch o Diffusers
    os.environ["HF_HOME"] = os.path.join(MODELS_DIR, "huggingface")
    os.environ["HUGGINGFACE_HUB_CACHE"] = os.path.join(MODELS_DIR, "huggingface")
    os.environ["TORCH_HOME"] = os.path.join(MODELS_DIR, "torch")
    
    # Evitar problemas asíncronos en Windows (Proactor vs Selector)
    if sys.platform == 'win32':
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    print(f"[CONFIG] Variables Core (HF_HOME y TORCH_HOME) aseguradas apuntando al Disco E:")

# Se expone un ejecutor rápido por si otro modulo lo llama
if __name__ == "__main__":
    apply_storage_directives()
    print("[CONFIG] Rutas Verificadas Estables.")
