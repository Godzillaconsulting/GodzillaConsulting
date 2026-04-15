import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Send, CalendarCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import zillaIcon from '../assets/Icono de chatbot.jpeg';
import chatbotIcon from '../assets/icons/icons8-chatbot-64.png';

const Chatbot = () => {
    const { pathname } = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipDismissed, setTooltipDismissed] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: '¡Hola! Soy Zilla, Especialista en Performance Marketing de Godzilla Consulting. ¿Estás listo para optimizar tu embudo y llevar tu ROAS al siguiente nivel? ¿Cómo puedo ayudarte hoy?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const API_URL = 'https://bot.godzillaconsulting.ai';

    useEffect(() => {
        // Initial delay before showing the tooltip for the first time
        const initialTimer = setTimeout(() => setShowTooltip(true), 2000);

        // Cycle showing and hiding the tooltip
        const cycleInterval = setInterval(() => {
            setShowTooltip(prev => !prev);
        }, 15000); // Toggle every 15 seconds

        return () => {
            clearTimeout(initialTimer);
            clearInterval(cycleInterval);
        };
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // En producción llama directo al backend — bypass completo del proxy de Vercel
    const API_BASE = import.meta.env.DEV
        ? 'http://localhost:3000'
        : 'https://bot.godzillaconsulting.ai';

    // Retry automático: si el túnel falla intermitentemente, reintenta hasta 3 veces antes de mostrar error
    const fetchChatWithRetry = async (messages, maxRetries = 3) => {
        const ERROR_MARKER = 'Lo siento, ha ocurrido un error';
        // Filtrar mensajes de error previos del historial — no contaminar el contexto de Gemini
        const cleanMessages = messages.filter(m => !(m.role === 'model' && m.text.startsWith(ERROR_MARKER)));

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(`${API_BASE}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages: cleanMessages }),
                    signal: AbortSignal.timeout(28000), // 28s antes del timeout de Vercel (30s)
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.reply) return data.reply;
                    throw new Error('Respuesta vacía');
                }
                // 502/503: reintenta
                if ((response.status === 502 || response.status === 503) && attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1200 * attempt)); // backoff: 1.2s, 2.4s
                    continue;
                }
                throw new Error(`HTTP ${response.status}`);
            } catch (err) {
                if (attempt < maxRetries && err.name !== 'TimeoutError') {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                    continue;
                }
                throw err;
            }
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newMessages = [...messages, { role: 'user', text: inputValue }];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const reply = await fetchChatWithRetry(newMessages);
            setMessages((prev) => [...prev, { role: 'model', text: reply }]);
        } catch (error) {
            console.error('Error in chat (agotados reintentos):', error);
            setMessages((prev) => [...prev, { role: 'model', text: 'Lo siento, ha ocurrido un error al conectar con Zilla. Intenta recargar la página.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const hiddenRoutes = ['/admin', '/dashboard', '/login'];
    const isHidden = hiddenRoutes.some(route => pathname.startsWith(route) || window.location.pathname.startsWith(route));

    if (isHidden) {
        return null;
    }

    return (
        <>
            {/* Chatbot Toggle Button */}
            <div className="fixed bottom-[240px] md:bottom-[150px] right-6 z-50 flex flex-col items-end pointer-events-none">
                <div
                    className={`relative z-20 mb-4 mr-2 bg-white text-black px-4 py-2.5 pr-7 rounded-2xl shadow-2xl text-xs font-bold text-center leading-snug w-max max-w-[180px] border border-gray-100 transition-all duration-1000 transform origin-bottom-right ${showTooltip && !isOpen && !tooltipDismissed ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}
                >
                    ¡Hola! Soy Zilla. 😊<br />¿Cómo puedo ayudarte?
                    <button onClick={() => setTooltipDismissed(true)} className="absolute top-1 right-1.5 text-gray-400 hover:text-black text-[10px] w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">✕</button>
                    <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white transform rotate-45 border-r border-b border-gray-100"></div>
                </div>
                <div className="relative pointer-events-auto flex items-center justify-center">
                    {/* Halos concéntricos (visibles al estar cerrado) */}
                    {!isOpen && (
                        <>
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ff5e00] to-[#CC0000] pointer-events-none animate-ripple" />
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ff5e00] to-[#CC0000] pointer-events-none animate-ripple animation-delay-1000" />
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#ff5e00] to-[#CC0000] pointer-events-none animate-ripple animation-delay-2000" />
                        </>
                    )}
                    <motion.button
                        onClick={() => setIsOpen(!isOpen)}
                        className={`relative z-10 rounded-full shadow-[0_8px_25px_rgba(204,0,0,0.6)] flex items-center justify-center focus:outline-none bg-gradient-to-br from-[#ff5e00] via-[#CC0000] to-[#4a0000] text-white ${isOpen ? 'p-4' : 'w-[70px] h-[70px]'}`}
                        transition={{ duration: 0.2 }}
                        whileHover={{ scale: 1.1, filter: "brightness(1.1)" }}
                    >
                        {isOpen ? <X size={28} /> : <img src={chatbotIcon} alt="Chatbot" className="w-8 h-8 brightness-0 invert p-0.5" />}
                    </motion.button>
                </div>
            </div>

            {/* Chatbot Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="fixed bottom-24 right-6 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-8rem)] bg-[#1a0000] border border-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-[#CC0000] p-4 flex justify-between items-center text-white">
                            <div className="flex items-center gap-2 font-bold">
                                <img 
                                    src={zillaIcon} 
                                    alt="Zilla" 
                                    className="w-6 h-6 rounded-full object-cover" 
                                />
                                <span>Zilla - Asistente IA</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="hover:text-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-black/95 scrollbar-thin scrollbar-thumb-gray-800">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === 'user'
                                            ? 'bg-[#CC0000] text-white rounded-tr-sm'
                                            : 'bg-[#2a0000] border border-gray-800 text-gray-100 rounded-tl-sm'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-[#2a0000] border border-gray-800 p-4 rounded-2xl rounded-tl-sm flex gap-2 items-center text-red-500">
                                        <div className="w-2 h-2 rounded-full bg-[#CC0000] animate-bounce"></div>
                                        <div className="w-2 h-2 rounded-full bg-[#CC0000] animate-bounce delay-100"></div>
                                        <div className="w-2 h-2 rounded-full bg-[#CC0000] animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-[#1a0000] border-t border-gray-800">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-brand-black border border-gray-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isLoading}
                                    className="bg-[#CC0000] hover:bg-red-700 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;
