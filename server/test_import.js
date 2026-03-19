// Test rápido de si el server arranca correctamente
try {
    const mod = await import('./index.js');
    console.log('✅ server/index.js cargó correctamente');
} catch (e) {
    console.error('❌ Error al cargar server:', e.message);
}
