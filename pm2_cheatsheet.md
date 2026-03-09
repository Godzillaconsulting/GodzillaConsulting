# Godzilla Bot - Operación con PM2

Esta guía rápida contiene los comandos esenciales para administrar el ecosistema de tu bot (Backend Node + ngrok) con PM2.

### 🚀 Iniciar el Ecosistema
Para levantar tanto el bot como el túnel ngrok al mismo tiempo:
```bash
pm2 start ecosystem.config.js
```
*(Nota: Si quieres que PM2 inicie automáticamente cuando prendas el servidor, investiga `pm2 startup` y `pm2 save`, aunque en tu entorno local Windows esto puede variar).*

### 📊 Ver el Estatus
Para ver qué procesos están corriendo, su uso de memoria, CPU y si se han reiniciado (reinicios frecuentes indican errores):
```bash
pm2 status
# o usando la interfaz en tiempo real de PM2:
pm2 monit
```

### 📋 Ver los Logs (Console.log)
Si necesitas ver qué está imprimiendo el bot (para debugging o ver interacciones con la base de datos):
```bash
# Ver los últimos logs combinados
pm2 logs

# Ver los logs específicamente del bot
pm2 logs godzilla-bot-redes

# Ver logs de ngrok
pm2 logs ngrok-tunnel
```

### 🔄 Control de Procesos
Si hiciste cambios y quieres reiniciar, o necesitas detener el sistema:
```bash
# Reiniciar el bot (lee cambios recientes)
pm2 restart godzilla-bot-redes

# Detener los procesos
pm2 stop all

# Borrar los procesos del administrador de PM2
pm2 delete all
```

### 🧪 Probar el Sistema
Para verificar de forma "ciega" que el bot reacciona correctamente sin necesidad de abrir Meta:
```bash
node test-pm2.js
```
