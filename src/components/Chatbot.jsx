import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, BrainCircuit, CalendarCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: '¡Hola! Soy Goyi, Especialista en Performance Marketing de Godzilla Consulting. ¿Estás listo para optimizar tu embudo y llevar tu ROAS al siguiente nivel? ¿Cómo puedo ayudarte hoy?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const API_URL = import.meta.env.VITE_API_URL || '';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newMessages = [...messages, { role: 'user', text: inputValue }];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: newMessages }),
            });

            if (!response.ok) {
                throw new Error('Error al conectar con el servidor.');
            }

            const data = await response.json();

            setMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
        } catch (error) {
            console.error('Error in chat:', error);
            setMessages((prev) => [...prev, { role: 'model', text: 'Lo siento, ha ocurrido un error al conectar con Goyi. Intenta recargar la página.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Chatbot Toggle Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="bg-[#CC0000] hover:bg-red-700 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center border-2 border-brand-black"
                >
                    {isOpen ? <X size={28} /> : <BrainCircuit size={28} />}
                </button>
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
                                <BrainCircuit size={24} />
                                <span>Goyi - Asistente IA</span>
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
                                        className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
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
