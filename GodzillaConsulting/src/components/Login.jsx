import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import logo from '../assets/Godzilla Consulting.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        // Simulación de validación
        if (email && password) {
            navigate('/dashboard');
        } else {
            alert('Por favor, ingresa tus credenciales.');
        }
    };

    return (
        <section className="min-h-screen bg-[#111111] flex flex-col items-center justify-center pt-24 pb-12 px-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#CC0000] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#CC0000] rounded-full mix-blend-multiply filter blur-[128px] opacity-10 pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10 bg-[#1a1a1a] p-10 rounded-[30px] border border-gray-800 shadow-2xl">
                <div className="flex justify-center mb-8">
                    <img src={logo} alt="Godzilla Consulting" className="h-12 object-contain" />
                </div>

                <h2 className="text-3xl font-black text-center text-white mb-2">Bienvenido</h2>
                <p className="text-gray-400 text-center mb-8">Ingresa al portal de administración</p>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">Correo Electrónico</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail size={18} className="text-gray-500" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#111] border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors"
                                placeholder="tu@correo.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">Contraseña</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={18} className="text-gray-500" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#111] border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-white text-white hover:text-[#CC0000] py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl mt-4"
                    >
                        Iniciar Sesión <ArrowRight size={18} />
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-6">
                        Este acceso es exclusivo para el equipo y clientes autorizados.
                    </p>
                </form>
            </div>
        </section>
    );
};

export default Login;
