import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
    // Aquí se podría enviar a un servicio de reporte de errores como Sentry
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#050505] text-white p-6">
          <main className="max-w-xl w-full bg-[#111111] p-8 rounded-[2rem] border-2 border-[#CC0000] shadow-[0_0_30px_rgba(204,0,0,0.3)]">
            <h1 className="text-3xl font-black text-[#CC0000] mb-4">ALERTA DE SISTEMA</h1>
            <p className="text-gray-300 font-medium mb-6">
              El panel administrativo ha fallado. El cortafuegos de Godzilla Consulting ha aislado el error para no afectar la navegación principal.
            </p>
            {this.state.error && (
              <pre className="bg-black text-gray-400 p-4 rounded-lg overflow-x-auto text-xs font-mono mb-6 border border-gray-800">
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={() => window.location.href = '/'}
              className="bg-[#CC0000] hover:bg-white hover:text-[#CC0000] font-black tracking-widest text-white px-8 py-4 rounded-full transition-all w-full"
            >
              VOLVER AL INICIO
            </button>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
