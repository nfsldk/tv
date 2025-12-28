
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { VodDetail, ChatMessage } from '../types';
import { getGlobalProxy } from '../services/vodService';

interface GeminiChatProps {
  currentMovie: VodDetail | null;
}

/**
 * 劫持全局 fetch 以支持 Gemini API 在受限网络下的代理访问。
 */
const setupGeminiProxy = () => {
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
        if (url.includes('generativelanguage.googleapis.com')) {
            const proxiedUrl = `${getGlobalProxy()}${encodeURIComponent(url)}`;
            return originalFetch(proxiedUrl, init);
        }
        return originalFetch(input, init);
    };
};

// 执行代理设置
setupGeminiProxy();

const GeminiChat: React.FC<GeminiChatProps> = ({ currentMovie }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: '你好！我是你的观影 AI 助手。' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  useEffect(() => {
      if (isOpen && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [messages, isOpen]);

  useEffect(() => {
      const apiKey = process.env.API_KEY;
      if (!apiKey) return;

      try {
          const ai = new GoogleGenAI({ apiKey });
          let systemInstruction = "你是一个幽默、知识渊博的电影助手。请用中文简练地回答。不要使用 Markdown 列表，尽量用段落。";
          if (currentMovie) {
              const cleanContent = currentMovie.vod_content ? currentMovie.vod_content.replace(/<[^>]+>/g, '') : '暂无';
              systemInstruction += `\n当前上下文：正在观看《${currentMovie.vod_name}》。简介：${cleanContent.slice(0, 100)}`;
          }
          chatSessionRef.current = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { systemInstruction }
          });
      } catch (e) {
          console.error("AI Init failed", e);
      }
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
           setIsLoading(false);
           return;
      }

      try {
          if (!chatSessionRef.current) {
               const ai = new GoogleGenAI({ apiKey });
               chatSessionRef.current = ai.chats.create({ model: 'gemini-3-flash-preview' });
          }
          const response = await chatSessionRef.current.sendMessage({ message: userText });
          setMessages(prev => [...prev, { role: 'model', text: response.text || "理解失败。" }]);
      } catch (error: any) {
          setMessages(prev => [...prev, { role: 'model', text: "网络请求失败，请检查 AI 代理配置。" }]);
      } finally {
          setIsLoading(false);
      }
  };

  return (
      <>
          <button onClick={() => setIsOpen(!isOpen)} className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-300 ring-2 ring-white/20 active:scale-95">
              {isOpen ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
          </button>
          {isOpen && (
              <div className="fixed bottom-24 right-4 md:right-6 w-[calc(100vw-32px)] md:w-[380px] h-[500px] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-up">
                  <div className="p-3 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 flex justify-between items-center">
                      <h3 className="font-bold text-white text-sm">Gemini AI 助手</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
                      {messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-brand text-black font-medium rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'}`}>
                                  {msg.text}
                              </div>
                          </div>
                      ))}
                      <div ref={messagesEndRef} />
                  </div>
                  <div className="p-3 border-t border-white/10 bg-gray-900">
                      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入消息..." className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                          <button type="submit" disabled={isLoading || !input.trim()} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-50"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg></button>
                      </form>
                  </div>
              </div>
          )}
      </>
  );
};

export default GeminiChat;
