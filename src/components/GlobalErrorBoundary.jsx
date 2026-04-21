import React from 'react';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("GlobalErrorBoundary atrapó un error crítico:", error, errorInfo);
    
    // Si es un error de Vercel de que no encuentra el JS (ChunkLoadError)
    // Refrescamos la página automáticamente para descargar el nuevo JS
    if (error && error.message && error.message.includes('Failed to fetch dynamically imported module')) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#050505] text-white p-6 z-50 fixed top-0 left-0">
          <main className="max-w-xl w-full bg-[#111111] p-8 rounded-[2rem] border-2 border-[#CC0000] shadow-[0_0_30px_rgba(204,0,0,0.3)]">
            <h1 className="text-3xl font-black text-[#CC0000] mb-4">ERROR DEL SISTEMA</h1>
            <p className="text-gray-300 font-medium mb-6">
              El entorno virtual ha colapsado. Esto suele suceder cuando hay una actualización crítica en progreso o un bloqueo de idioma en tu navegador.
            </p>
            <button
              onClick={() => {
                // Forzar limpieza de caches de idioma por si ese fue el origen
                localStorage.removeItem('i18nextLng');
                window.location.href = '/';
              }}
              className="bg-[#CC0000] hover:bg-white hover:text-[#CC0000] font-black tracking-widest text-white px-8 py-4 rounded-full transition-all w-full"
            >
              REINICIAR SISTEMA
            </button>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
