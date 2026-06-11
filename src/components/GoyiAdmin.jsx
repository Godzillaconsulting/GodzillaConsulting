import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export default React.memo(function GoyiAdmin() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', text: '¡Hola Jefes! Soy Goyi, su Asistente Administrativo Experto. ¿En qué puedo optimizar el flujo de trabajo o afilar copys el día de hoy?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const API_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    // Listener para cerrar Goyi al presionar la tecla ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const newMessages = [...messages, { role: 'user', text: inputValue }];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ messages: newMessages, isGoyi: true }),
            });

            if (!response.ok) {
                let errDetail = 'Error al conectar con Goyi API';
                try {
                    const errorData = await response.json();
                    errDetail = errorData.details || errorData.error || errDetail;
                } catch(e) {}
                throw new Error(errDetail);
            }

            const data = await response.json();
            
            const rawMarkdown = data.reply || "No entiendo la solicitud.";
            const parsedHtml = await marked.parse(rawMarkdown);
            const textResponse = DOMPurify.sanitize(parsedHtml);
            
            setMessages(prev => [...prev, { role: 'model', text: textResponse }]);
        } catch (error) {
            console.error('Error enviando mensaje a Goyi:', error);
            setMessages(prev => [...prev, { role: 'model', text: 'Error en mis engranajes: ' + error.message + ' - (JareG me está reparando).' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Goyi Floating Button */}
            <button
                onClick={(e) => { e.stopPropagation(); console.log('Goyi Clicked!', !isOpen); setIsOpen(!isOpen); }}
                className="fixed bottom-6 right-6 z-[999999] w-14 h-14 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.5)] border-2 border-yellow-300 hover:scale-110 transition-transform flex items-center justify-center overflow-hidden pointer-events-auto"
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-black" />
                ) : (
                    <MessageSquare className="w-6 h-6 text-black fill-current" />
                )}
            </button>

            {/* Modal/Ventana de Chat */}
            {isOpen && (
                <div className="fixed bottom-24 right-4 sm:right-6 z-[999999] w-[calc(100vw-2rem)] sm:w-[380px] h-[550px] max-h-[75vh] shadow-[0_0_50px_rgba(234,179,8,0.15)] flex flex-col bg-[#111111] border rounded-2xl border-yellow-600/30 overflow-hidden font-sans pointer-events-auto">
                    
                    {/* Header Clickable */}
                    <div 
                        onClick={() => setIsOpen(false)}
                        className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-4 border-b border-yellow-500/30 flex items-center gap-3 shrink-0 relative overflow-hidden cursor-pointer hover:from-yellow-500 hover:to-yellow-600 transition-colors group"
                        title="Clickea aquí o presiona ESC para cerrar a Goyi"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                        
                        <div className="w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center shadow-inner relative z-10 transition-transform group-hover:scale-105">
                            <span className="material-symbols-outlined text-black text-[20px] select-none flex items-center justify-center">smart_toy</span>
                        </div>
                        <div className="relative z-10 flex-1">
                            <h3 className="font-black text-sm text-black tracking-widest uppercase">Goyi Experto</h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-black animate-pulse"></span>
                                <span className="text-[10px] font-bold text-black/80">Guardia Administrativo</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0a0a0a] to-[#010101]">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'model' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`p-3.5 rounded-xl max-w-[85%] text-sm font-bold shadow-lg leading-relaxed ${
                                    msg.role === 'model' 
                                        ? 'bg-[#1a1a1a] text-neutral-300 border border-neutral-800 rounded-tl-sm' 
                                        : 'bg-yellow-600/20 border border-yellow-600/40 text-yellow-500 rounded-tr-sm'
                                }`}>
                                    {msg.role === 'model' ? (
                                        <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                                    ) : (
                                        <p>{msg.text}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-[#1a1a1a] border border-neutral-800 p-4 rounded-xl rounded-tl-sm shadow-md">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></span>
                                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-black/60 backdrop-blur border-t border-yellow-600/20 shrink-0">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Pregunta algo sobre el Panel o Copy..."
                                className="w-full bg-[#111] border border-neutral-800 text-white text-sm rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-yellow-600/50 shadow-inner transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputValue.trim()}
                                className="absolute right-2 p-2 bg-yellow-600/20 hover:bg-yellow-600 text-yellow-500 hover:text-black rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-yellow-600/20 disabled:hover:text-yellow-500"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
});
