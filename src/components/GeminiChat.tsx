
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { VodDetail, ChatMessage } from '../types';

interface GeminiChatProps {
  currentMovie: VodDetail | null;
}

const GeminiChat: React.FC<GeminiChatProps> = ({ currentMovie }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: '你好！我是 CineStream AI。想深度了解剧情或细节吗？' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);

  // Gemini API Initialization
  useEffect(() => {
      // Use process.env.API_KEY directly as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let instruction = "你是一个电影专家。";
      if (currentMovie) {
          instruction += `当前正在讨论影片《${currentMovie.vod_name}》。请提供有趣且深度的见解。`;
      }

      chatSessionRef.current = ai.chats.create({
          model: 'gemini-3-flash-preview',
          config: { systemInstruction: instruction }
      });
  }, [currentMovie]);

  const handleSend = async () => {
      if (!input.trim() || isLoading || !chatSessionRef.current) return;
      const userText = input.trim();
      setInput('');
      setMessages(prev => [...prev, { role: 'user', text: userText }]);
      setIsLoading(true);

      try {
          // sendMessage correctly uses { message: string }
          const result = await chatSessionRef.current.sendMessage({ message: userText });
          // .text is a property, not a method
          const responseText = result.text; 
          setMessages(prev => [...prev, { role: 'model', text: responseText || "我暂时无法回应，请稍后再试。" }]);
      } catch (e) {
          setMessages(prev => [...prev, { role: 'model', text: "AI 服务暂时不可用。" }]);
      } finally {
          setIsLoading(false);
      }
  };

  return (
      <div className="fixed bottom-10 right-10 z-[70] hidden md:block">
          <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 bg-[#22c55e] rounded-full shadow-lg shadow-[#22c55e]/40 flex items-center justify-center text-black font-black hover:scale-110 transition-transform ring-4 ring-white/10">AI</button>
          {isOpen && (
              <div className="absolute bottom-20 right-0 w-[380px] h-[520px] bg-gray-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-slide-up">
                  <div className="p-5 bg-[#22c55e] text-black font-black text-center tracking-widest uppercase text-sm">CineStream 智能助手</div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-black/10">
                      {messages.map((m, i) => (
                          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] p-4 rounded-xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-[#22c55e] text-black font-bold' : 'bg-white/10 text-gray-300'}`}>
                                  {m.text}
                              </div>
                          </div>
                      ))}
                      {isLoading && <div className="text-[#22c55e] animate-pulse text-[10px] font-black uppercase">正在思考...</div>}
                  </div>
                  <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-4 bg-black/40 flex gap-3 border-t border-white/5">
                      <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#22c55e]/60" placeholder="有什么想问的..." />
                      <button type="submit" disabled={isLoading} className="bg-[#22c55e] text-black px-5 rounded-xl font-black text-sm">发送</button>
                  </form>
              </div>
          )}
      </div>
  );
};

export default GeminiChat;
