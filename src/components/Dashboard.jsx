import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Edit3, Image, FileText, Database, ShieldAlert } from 'lucide-react';
import logo from '../assets/Godzilla Consulting.png';

const Dashboard = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/');
    };

    const modules = [
        { icon: <Edit3 size={32} />, title: "Editor de Textos", desc: "Modifica títulos y párrafos en vivo.", status: "Próximamente" },
        { icon: <Image size={32} />, title: "Gestor de Medios", desc: "Sube imágenes y videos a tus componentes.", status: "Próximamente" },
        { icon: <FileText size={32} />, title: "Gestor de Recursos", desc: "Sube y administra PDFs y plantillas.", status: "Próximamente" },
        { icon: <Database size={32} />, title: "Base de Leads (CRM)", desc: "Consulta contactos recolectados.", status: "Próximamente" },
    ];

    return (
        <section className="min-h-screen bg-[#111111] flex bg-[url('https://images.unsplash.com/photo-1635830625698-3b9bd74671ca?auto=format&fit=crop&q=80')] bg-cover bg-fixed">
            <div className="absolute inset-0 bg-[#0d0d0d]/90 backdrop-blur-sm z-0"></div>

            {/* Sidebar */}
            <aside className="relative z-10 w-64 bg-[#1a1a1a] shadow-2xl border-r border-gray-800 flex flex-col p-6 hidden md:flex">
                <img src={logo} alt="Godzilla" className="h-8 object-contain mb-12 self-start" />
                <nav className="flex-grow space-y-4">
                    <a href="#" className="flex items-center gap-3 text-white bg-[#CC0000] p-3 rounded-lg font-bold">
                        <Settings size={20} /> Dashboard
                    </a>
                </nav>
                <div className="mt-auto border-t border-gray-800 pt-6">
                    <button onClick={handleLogout} className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors w-full">
                        <LogOut size={20} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="relative z-10 flex-grow p-8 md:p-12 overflow-y-auto">
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Panel de Control</h1>
                        <p className="text-gray-400">Bienvenido. Aquí podrás gestionar tu aplicación (CMS en construcción).</p>
                    </div>
                    {/* Mobile menu button here if needed */}
                </header>

                {/* Info Card */}
                <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6 mb-12 flex gap-4 items-start shadow-lg">
                    <Database size={28} className="text-green-500 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">¡Sanity CMS Conectado!</h3>
                        <p className="text-gray-300 text-sm leading-relaxed mb-4">
                            El proyecto ha sido enlazado exitosamente a tu base de datos de Sanity (Project ID: u5v5sn7d). El código fuente ya está recibiendo señal.
                            Ahora debes crear tus "Esquemas" y manejar tu contenido directamente desde tu Panel de Sanity Oficial.
                        </p>
                        <a href="https://sanity.io/manage/project/u5v5sn7d" target="_blank" rel="noopener noreferrer" className="inline-block bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg transition-colors text-sm">
                            Ir a mi Sanity Studio Oficial
                        </a>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    {modules.map((mod, idx) => (
                        <div key={idx} className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 hover:border-[#CC0000] transition-colors group cursor-not-allowed relative overflow-hidden flex flex-col h-full">
                            <div className="absolute top-4 right-4 bg-[#CC0000]/20 text-[#CC0000] text-xs font-bold px-2 py-1 rounded-sm border border-[#CC0000]/50">
                                {mod.status}
                            </div>
                            <div className="mb-6 text-gray-500 group-hover:text-white transition-colors">
                                {mod.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{mod.title}</h3>
                            <p className="text-gray-400 text-sm flex-grow">
                                {mod.desc}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Mobile Logout */}
                <div className="mt-12 w-full md:hidden">
                    <button onClick={handleLogout} className="flex items-center justify-center gap-3 text-white bg-gray-800 p-4 rounded-xl hover:bg-gray-700 transition-colors w-full font-bold">
                        <LogOut size={20} /> Cerrar Sesión
                    </button>
                </div>
            </main>
        </section>
    );
};

export default Dashboard;
