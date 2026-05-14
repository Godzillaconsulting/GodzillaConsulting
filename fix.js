const fs = require('fs');
let c = fs.readFileSync('server/whatsappBot.js', 'utf8');

const newTryBlock = \
            try {
                // LÓGICA DIRECTA DE GEMINI SIN CASCADA
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const config = {
                    model: 'gemini-2.5-flash',
                    systemInstruction: finalSystemPrompt + systemPromptContexto,
                    generationConfig: { temperature: 0.5, maxOutputTokens: hasBookingIntent ? 768 : 256 }
                };
                if (hasBookingIntent && chatTools && chatTools.length > 0) {
                    config.tools = [{ functionDeclarations: chatTools.map(t => ({ name: t.name, description: t.description, parameters: t.parameters })) }];
                }
                const model = genAI.getGenerativeModel(config);

                let contents = [];
                let lastRole = null;
                groqMessages.filter(m => m.role !== 'system').forEach(m => {
                    let role = (m.role === 'assistant' || m.role === 'model' || (m.tool_calls && m.tool_calls.length > 0)) ? 'model' : 'user';
                    let parts = [];
                    if (m.tool_calls && m.tool_calls.length > 0) {
                        parts = m.tool_calls.map(tc => {
                            let args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                            return { functionCall: { name: tc.function.name, args: args } };
                        });
                    } else if (m.role === 'tool') {
                        let resultData = { result: 'ok' };
                        try { resultData = JSON.parse(m.content); } catch(e) { resultData = { result: m.content || 'ok' }; }
                        parts = [{ functionResponse: { name: m.name || 'unknown_tool', response: resultData } }];
                    } else if (m.content) {
                        parts = [{ text: m.content }];
                    }
                    if (parts.length > 0) {
                        if (lastRole === role && contents.length > 0) {
                            contents[contents.length - 1].parts.push(...parts);
                        } else {
                            contents.push({ role, parts });
                        }
                        lastRole = role;
                    }
                });
                if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Hola' }] });

                const result = await model.generateContent({ contents });
                const responseMessage = result.response;
                let finalContent = '';
                try { finalContent = responseMessage.text(); } catch(e) {}
                const fc = responseMessage.functionCalls();
                
                let geminiToolCalls = [];
                if (fc && fc.length > 0) {
                    geminiToolCalls = fc.map(c => ({
                        id: 'call_' + Math.random().toString(36).substring(2, 9),
                        type: 'function',
                        function: { name: c.name, arguments: JSON.stringify(c.args) }
                    }));
                }

                botReply = finalContent && finalContent.trim() ? finalContent.trim() : 'Entendido, ¿en qué más te puedo ayudar? ??';

                if (geminiToolCalls.length > 0) {
                    botReply = 'Un momento, estoy consultando el sistema... ?';
                    groqMessages.push({
                        role: 'assistant',
                        content: finalContent || null,
                        tool_calls: geminiToolCalls
                    });
                    functionCalls = geminiToolCalls.map(tc => {
                        let parsedArgs = {};
                        try { parsedArgs = JSON.parse(tc.function.arguments); } catch(e){}
                        return { name: tc.function.name, args: parsedArgs, id: tc.id };
                    });
                }
            } catch(error) {\;

c = c.replace(/try\s*\{\s*\/\/\s*Si es saludo.*?catch\s*\(error\)\s*\{/s, newTryBlock);

const newSecondCall = \
                // Segunda llamada directa
                try {
                    let contents2 = [];
                    let lastRole2 = null;
                    groqMessages.filter(m => m.role !== 'system').forEach(m => {
                        let role = (m.role === 'assistant' || m.role === 'model' || (m.tool_calls && m.tool_calls.length > 0)) ? 'model' : 'user';
                        let parts = [];
                        if (m.tool_calls && m.tool_calls.length > 0) {
                            parts = m.tool_calls.map(tc => {
                                let args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                                return { functionCall: { name: tc.function.name, args: args } };
                            });
                        } else if (m.role === 'tool') {
                            let resultData = { result: 'ok' };
                            try { resultData = JSON.parse(m.content); } catch(e) { resultData = { result: m.content || 'ok' }; }
                            parts = [{ functionResponse: { name: m.name || 'unknown_tool', response: resultData } }];
                        } else if (m.content) {
                            parts = [{ text: m.content }];
                        }
                        if (parts.length > 0) {
                            if (lastRole2 === role && contents2.length > 0) {
                                contents2[contents2.length - 1].parts.push(...parts);
                            } else {
                                contents2.push({ role, parts });
                            }
                            lastRole2 = role;
                        }
                    });
                    
                    const genAI2 = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                    const model2 = genAI2.getGenerativeModel({
                        model: 'gemini-2.5-flash',
                        systemInstruction: finalSystemPrompt + systemPromptContexto,
                        generationConfig: { temperature: 0.5, maxOutputTokens: 512 }
                    });
                    
                    const result2 = await model2.generateContent({ contents: contents2 });
                    botReply = result2.response.text() || 'Reserva procesada.';
                } catch(e) {\;

c = c.replace(/\/\/\s*Segunda llamada.*?try\s*\{.*?catch\s*\(e\)\s*\{/s, newSecondCall);

fs.writeFileSync('server/whatsappBot.js', c);
console.log('Done!');

