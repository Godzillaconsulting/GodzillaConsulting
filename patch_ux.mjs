import fs from 'fs';

let c = fs.readFileSync('src/components/Recursos.jsx', 'utf8');

// 1. Quitar la apertura automática (líneas de window.open y el Link click)
c = c.replace(
    /\/\/ DESCARGA DIRECTA \(Inmediata para mejor UX\)[\s\S]*?if \(slug\) \{/,
    `// EVITAMOS DESCARGA INMEDIATA AQUÍ, SE MOSTRARÁ EN EL MENSAJE DE ÉXITO
                                    if (slug) {`
);

// 2. Modificar el texto del modal de éxito para que incluya el botón de descarga
const uiOld = `                                <h3 className="text-2xl font-bold text-white mb-4">¡Todo listo!</h3>
                                <p className="text-gray-300 text-base leading-relaxed mb-8">
                                    Hemos enviado "{activeItem?.title}" al correo <span className="text-white font-bold">{email}</span>.
                                    <br /><br />
                                    Por favor, espera un par de minutos y revisa tu bandeja de entrada (y la carpeta de spam por si acaso).
                                </p>
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setTimeout(() => {
                                            setIsSubmitted(false);
                                            setEmail('');
                                        }, 300);
                                    }}
                                    className="w-full bg-white hover:bg-gray-200 text-black py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl"
                                >
                                    Entendido
                                </button>`;

const uiNew = `                                <h3 className="text-2xl font-bold text-white mb-4">¡Todo listo!</h3>
                                <p className="text-gray-300 text-base leading-relaxed mb-4">
                                    Hemos enviado "{activeItem?.title}" al correo <span className="text-white font-bold">{email}</span>. Revisa tu bandeja de entrada.
                                </p>

                                {/* Botón de descarga manual aquí mismo */}
                                <a
                                    href={activeItem?.fileName || nodeData[\`recurso\${activeItem?.id || activeItem?.orden || 1}FileUrl\`]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full block text-center mb-4 bg-[#CC0000] hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl shadow-[#CC0000]/30"
                                >
                                    📥 Abrir y Descargar Recurso
                                </a>

                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setTimeout(() => {
                                            setIsSubmitted(false);
                                            setEmail('');
                                        }, 300);
                                    }}
                                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg text-sm"
                                >
                                    Cerrar esta ventana
                                </button>`;

c = c.replace(uiOld, uiNew);

// 3. Update the instruction UI to not say "inmediatamente" anymore
const msgOld = `<p className="text-gray-400 text-sm">
                                        Ingresa tu correo abajo. El archivo se descargará <b>inmediatamente</b> y también te enviaremos una copia de seguridad a tu bandeja de entrada.
                                    </p>`;
const msgNew = `<p className="text-gray-400 text-sm">
                                        Ingresa tu correo abajo para enviarte tu copia de seguridad. Te daremos acceso al archivo inmediatamente al siguiente paso.
                                    </p>`;
c = c.replace(msgOld, msgNew);


fs.writeFileSync('src/components/Recursos.jsx', c);
console.log('Recursos UX updated successfully');
