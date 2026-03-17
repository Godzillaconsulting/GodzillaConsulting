# Godzilla Consulting: Playbook de Servidores 24/7 🚀
*(Guía Oficial para desplegar bots de WhatsApp en cualquier Servidor o PC Física)*

Este manual es tu "receta" para clonar este entorno de servidor para tus **prospectos y clientes futuros**, asegurando un ecosistema 24/7 sin pagos de nube adicionales.

## 🛠️ Fase 1: Arquitectura Base
Ya sea una Laptop Frankenstein en la oficina o un servidor Dell real, el entorno principal siempre será **Windows** o **Linux (Ubuntu)** con los mismos ingredientes:

1. **Configuración de Energía Infalible (Windows):**
   - Win + R > `control`
   - Opciones de Energía > "Elegir cuándo se apaga la pantalla".
   - ✔️ Apagar la pantalla: Nunca.
   - ✔️ Poner al equipo en suspensión: Nunca.
   - *Si es Laptop:* Clic en "Elegir la acción del cierre de tapa" > Selecciona "No hacer nada" para que puedas cerrarla sin apagar el bot.

2. **Instalar el Entorno Backend:**
   - [Descargar e Instalar Node.js LTS](https://nodejs.org/) (Siguiente, Siguiente... Todo por defecto).

## 📂 Fase 2: Instalar el Proyecto
Puedes hacerlo usando **GitHub** (recomendado para control) o por **USB**.

**Método GitHub (Recomendado para Clientes):**
1. Abre tu terminal (CMD o PowerShell).
2. Clona el repositorio del cliente: `git clone https://github.com/tu_agencia/proyecto_cliente.git`
3. Entra a la subcarpeta del backend: `cd proyecto_cliente/server`
4. Pega el archivo `.env` que contenga las contraseñas secretas (OpenAI, Gemini, Neon DB).
5. Ejecuta: `npm install` (Esto lee el package.json y descarga todo).

## 🦾 Fase 3: La Magia de PM2 (El Despliegue)
PM2 es un administrador de procesos industriales. Es lo que mantiene a Chrome (Puppeteer) respirando.

1. Instala PM2 globalmente (solo se hace 1 vez por servidor):
   ```bash
   npm install pm2 -g
   ```
2. Levanta a Zilla (o al bot del cliente):
   ```bash
   pm2 start index.js --name "bot-cliente-1"
   ```
3. Para escanear el Código QR y conectar el WhatsApp:
   ```bash
   pm2 logs bot-cliente-1
   ```
   *(Abre tu celular, escanea el QR que dibuja la terminal, y cuando diga "Listo/Conectado", presiona `Ctrl + C` para salir del log. El bot seguirá vivo en el fondo).*

## 🛡️ Comandos de Supervivencia PM2
Guarda esta lista para administrar tus futuros servidores:

- `pm2 list` 👉 Te muestra una tabla con todos los bots/clientes que tienes corriendo en esta computadora (y cuánta RAM gastan).
- `pm2 stop all` 👉 Apaga todos los bots de emergencia.
- `pm2 restart bot-cliente-1` 👉 Útil cuando modificas el código y quieres que el bot tome los cambios.
- `pm2 flush` 👉 Borra toda la basura de logs acumulados para limpiar el disco duro cada cierto tiempo.
- `pm2 startup` y luego `pm2 save` 👉 **¡TRUCO MAESTRO!** Ejecutar esto hace que los bots se enciendan *automáticamente* si la casa/oficina se queda sin luz y la computadora se reinicia sola.

---
> **Nota de Arquitecto:** Para futuros clientes de Godzilla Consulting, simplemente creas una nueva carpeta (ej. `cd Desktop/bot-dentista/server`), le pasas su propio `.env`, haces `npm install` y lo levantas con `pm2 start index.js --name "bot-dentista"`. 
> ¡Una sola Laptop o Servidor puede aguantar de 10 a 15 bots (empresas) corriendo simultáneamente si la RAM lo permite!
