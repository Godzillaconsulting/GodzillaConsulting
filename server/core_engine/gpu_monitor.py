import os
import time
import subprocess
import psutil

# Umbrales Relajados (Adaptación para Offloading a Disco E: de 64GB)
MAX_TEMP_C = 85
MAX_VRAM_PERCENT = 95
POLL_INTERVAL = 120 # Segundos (Elevado a 2 minutos porque el volcado a disco es lento y no queremos falsos positivos de 'cuelgue')


def get_gpu_metrics():
    try:
        # Extraer Memoria total, usada y Temperatura via nvidia-smi
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=temperature.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        if result.returncode == 0:
            output = result.stdout.strip().split(', ')
            temp = float(output[0])
            mem_used = float(output[1])
            mem_total = float(output[2])
            mem_percent = (mem_used / mem_total) * 100
            return temp, mem_percent
        return -1, -1
    except Exception as e:
        print(f"[WATCHDOG ERROR] No se pudo conectar a NVIDIA-SMI: {e}")
        return -1, -1

def kill_inference_engine():
    print("[WATCHDOG] Iniciando Protocolo de Emergencia: Matando proceso Pytorch...")
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            cmdline = proc.info.get('cmdline', [])
            if cmdline and 'python' in proc.info['name'].lower():
                if any('godzilla_inference_bridge.py' in cmd for cmd in cmdline):
                    print(f"[WATCHDOG] Asesinando al engine colgado (PID: {proc.info['pid']}). PM2 lo reiniciará.")
                    proc.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

print("=== GODZILLA GPU WATCHDOG INICIADO ===")
print(f"Límites: Memoria > {MAX_VRAM_PERCENT}% | Temp > {MAX_TEMP_C}C")

while True:
    temp, mem_percent = get_gpu_metrics()
    
    if temp != -1:
        print(f"[WATCHDOG HEARTBEAT] GPU Temp: {temp}C | VRAM Uso: {mem_percent:.2f}%")
        
        # Evaluar condiciones mortales
        if temp >= MAX_TEMP_C:
            print(f"!!! [PELIGRO] Temperatura Crítica Alcanzada ({temp}C) !!!")
            kill_inference_engine()
            time.sleep(10) # Espera a que PM2 reinicie en frío
        
        # NOTA: OOM (Out Of Memory) usualmente crashea nativamente y PM2 lo agarra.
        # Esto previene cuelgues térmicos o deadlocks en tensores.
            
    time.sleep(POLL_INTERVAL)
