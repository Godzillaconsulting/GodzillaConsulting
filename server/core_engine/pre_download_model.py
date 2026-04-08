import os
import torch
from diffusers import DiffusionPipeline

print("==================================================")
print("[GODZILLA SORA] Iniciando Descarga del Núcleo Crítico Oculto...")
print("Modelo: stabilityai/stable-diffusion-xl-base-1.0")
print("Esto tomará varios minutos dependiendo del Ancho de Banda.")
print("Descargando ~7 GB a la bóveda caché...")
print("==================================================")

try:
    pipe = DiffusionPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0", 
        torch_dtype=torch.float16, 
        use_safetensors=True, 
        variant="fp16"
    )
    print("\n[GODZILLA SORA] DESCARGA FOTORREALISTA ORO FINALIZADA CON ÉXITO.")
    print("El servidor principal iniciará sin bloqueos desde este momento.")
except Exception as e:
    print(f"\n[ERROR CRÍCTICO EN DESCARGA]: {e}")
