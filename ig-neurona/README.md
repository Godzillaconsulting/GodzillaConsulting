# Godzilla/Accrual - IG Neurona (Instagram DM Automation)

Esta sub-aplicación actúa como un **Bypass Headless** para leer y responder DMs de Instagram automáticamente como si fuera un humano, evitando la API oficial de Meta y conectando el feed crudo al Cerebro Central.

## Instrucciones de Lanzamiento

### 1. Instalación de Dependencias
Dentro de esta carpeta (`ig-neurona`), instala las librerías requeridas:
```bash
npm install
```

### 2. Login Inicial y Persistencia (Headful Mode)
Instagram cuenta con fuertes sistemas anti-bots y requiere un login humano para anclar las Cookies y LocalStorage.
Ejecuta:
```bash
npm run setup
```
Se abrirá un navegador de Chromium visible. **Ingresa tu usuario, contraseña, y resuelve cualquier 2FA (SMS, Authenticator, etc).**
Una vez que veas la página principal del Feed, cierra la ventana del navegador. Los datos de sesión se habrán guardado localmente en `session_data/`.

### 3. Ejecución Permanente (Headless Mode)
Una vez guardada la sesión, iniciamos el bot de monitoreo constante a través de PM2, que trabajará invisible en segundo plano buscando el "punto azul" de no leídos.
```bash
npm start
```
*(Es un alias para `pm2 start ecosystem.neurona-ig.cjs`)*

### 4. Monitoreo
Para ver en tiempo real cómo la Neurona detecta chats y escribe:
```bash
npm run log
```
*(Alias para `pm2 logs ig-neurona`)*

Para detenerlo:
```bash
npm run stop
```

## Arquitectura Anti-Bot Integrada
- Usa `puppeteer-extra-plugin-stealth` para evadir firmas y huellas de automatización.
- Inyecta demoras aleatorias `randomDelay` (30s-60s) en el escaneo de bandeja.
- `humanType`: Teclea letra por letra con demoras erráticas reales de milisegundos simulando pulsaciones humanas.
- `randomMouseMove`: Desplaza el mouse por la pantalla para inyectar actividad mientras hace scraping.

**Requisito de Integración:** Actualiza la variable `AI_API_URL` en el archivo `ecosystem.neurona-ig.cjs` para que apunte al endpoint local real de tu Cerebro de la IA.
