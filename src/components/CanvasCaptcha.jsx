import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw } from 'lucide-react';

const CanvasCaptcha = forwardRef(({ onValidate, height = 50, length = 5 }, ref) => {
    const canvasRef = useRef(null);
    const [captchaText, setCaptchaText] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [isValid, setIsValid] = useState(null);

    const generateCaptcha = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // Avoid ambiguous chars
        let text = '';
        for (let i = 0; i < length; i++) {
            text += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCaptchaText(text);
        drawCaptcha(text);
        setInputValue('');
        setIsValid(null);
        if (onValidate) onValidate(false);
    };

    const drawCaptcha = (text) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, width, height);

        // Add noise lines
        for (let i = 0; i < 5; i++) {
            ctx.strokeStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.5)`;
            ctx.beginPath();
            ctx.moveTo(Math.random() * width, Math.random() * height);
            ctx.lineTo(Math.random() * width, Math.random() * height);
            ctx.stroke();
        }

        // Add noise dots
        for (let i = 0; i < 30; i++) {
            ctx.fillStyle = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.5)`;
            ctx.beginPath();
            ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw text
        const fontSize = height * 0.6;
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.textBaseline = 'middle';
        
        const totalTextWidth = ctx.measureText(text).width;
        const startX = (width - totalTextWidth) / 2;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const x = startX + (i * (fontSize * 0.7));
            const y = height / 2;

            ctx.save();
            ctx.translate(x, y);
            // Rotate between -20 and 20 degrees
            const angle = (Math.random() - 0.5) * 0.4; 
            ctx.rotate(angle);
            ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 60%)`;
            ctx.fillText(char, 0, 0);
            ctx.restore();
        }
    };

    useEffect(() => {
        generateCaptcha();
    }, []);

    useImperativeHandle(ref, () => ({
        refresh: generateCaptcha,
        isValid: () => captchaText.toLowerCase() === inputValue.toLowerCase(),
        reset: () => {
            generateCaptcha();
            setInputValue('');
        }
    }));

    const handleChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        const valid = val.toLowerCase() === captchaText.toLowerCase();
        if (val.length >= length) {
            setIsValid(valid);
        } else {
            setIsValid(null);
        }
        if (onValidate) onValidate(valid);
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center gap-3">
                <div className="relative flex-1 bg-[#111] rounded-xl border border-gray-700 overflow-hidden flex items-center justify-center p-1 cursor-pointer" onClick={generateCaptcha} title="Clic para generar otro">
                    <canvas 
                        ref={canvasRef} 
                        width={150} 
                        height={height}
                        className="rounded-lg w-full max-w-[150px]"
                    />
                </div>
                <button 
                    type="button" 
                    onClick={generateCaptcha}
                    className="w-10 h-10 shrink-0 bg-black/40 border border-gray-700 hover:border-white/40 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                    <RefreshCw size={16} />
                </button>
            </div>
            
            <div className="relative">
                <input 
                    type="text" 
                    value={inputValue}
                    onChange={handleChange}
                    placeholder="Escribe las letras que ves"
                    className={`w-full bg-[#111] border ${isValid === false ? 'border-red-500' : isValid === true ? 'border-green-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#CC0000] transition-colors uppercase font-mono tracking-widest`}
                    maxLength={length}
                    autoComplete="off"
                />
            </div>
            {isValid === false && inputValue.length > 0 && (
                <p className="text-red-500 text-xs font-bold px-1">Código incorrecto. Intenta de nuevo.</p>
            )}
        </div>
    );
});

export default CanvasCaptcha;
