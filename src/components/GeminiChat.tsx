import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { VodDetail, ChatMessage } from '../types';

interface GeminiChatProps {
  currentMovie: VodDetail | null;
}

const GeminiChat: React.FC<GeminiChatProps> = ({ currentMovie }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: '你好！我是你的观影 AI 助手。' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  useEffect(() => {
      if (isOpen && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
      const apiKey = process.env.API_KEY;
      if (!apiKey) return;
      try {
          const ai = new GoogleGenAI({ apiKey });
          let systemInstruction = "你是一个幽默、知识渊博的电影助手。";
          if (currentMovie) systemInstruction += ` 当前正在观看: ${currentMovie.vod_name}。`;
          chatSessionRef.current = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
      } catch (e) {}
  }, [currentMovie]);

  const handleSend = async () => {
      if (!input.trim() || isLoading) return;
      const userText = input.trim();
      setInput('');
      setMessages(prev => [...prev, { role: 'user', text: userText }]);
      setIsLoading(true);
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
           setMessages(prev => [...prev, { role: 'model', text: "请配置 API Key。" }]);
           setIsLoading(false); return;
      }
      try {
          if (!chatSessionRef.current) {
               const ai = new GoogleGenAI({ apiKey });
               chatSessionRef.current = ai.chats.create({ model: 'gemini-2.5-flash' });
          }
          const response = await chatSessionRef.current.sendMessage({ message: userText });
          setMessages(prev => [...prev, { role: 'model', text: response.text || "..." }]);
      } catch (error) {
          setMessages(prev => [...prev, { role: 'model', text: "服务暂不可用。" }]);
      } finally { setIsLoading(false); }
  };

  return (
      <>
          <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
          </button>
          {isOpen && (
              <div className="fixed bottom-20 right-4 w-[350px] h-[450px] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-up">
                  <div className="p-3 border-b border-white/10 bg-indigo-900/20"><h3 className="font-bold text-white text-sm">Gemini AI</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-brand text-black' : 'bg-white/10 text-white'}`}>{msg.text}</div>
                          </div>
                      ))}
                      <div ref={messagesEndRef} />
                  </div>
                  <div className="p-3 bg-gray-900 border-t border-white/10">
                      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Say something..." className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none" />
                          <button type="submit" disabled={isLoading} className="bg-brand text-black rounded px-3 py-1.5 text-sm font-bold">Send</button>
                      </form>
                  </div>
              </div>
          )}
      </>
  );
};

export default GeminiChat;