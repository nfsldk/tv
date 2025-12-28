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
  
  // Use a ref to persist the chat session across renders
  const chatSessionRef = useRef<Chat | null>(null);

  useEffect(() => {
      if (isOpen && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [messages, isOpen]);

  // Re-initialize chat session when the movie context changes
  useEffect(() => {
      const apiKey = process.env.API_KEY;
      if (!apiKey) return;

      try {
          const ai = new GoogleGenAI({ apiKey });
          
          let systemInstruction = "你是一个幽默、知识渊博的电影助手。请用中文简练地回答。";
          if (currentMovie) {
              const cleanContent = currentMovie.vod_content ? currentMovie.vod_content.replace(/<[^>]+>/g, '') : '暂无';
              systemInstruction += `
              当前上下文 - 用户正在观看影片：
              名称: ${currentMovie.vod_name}
              类型: ${currentMovie.type_name}
              年份: ${currentMovie.vod_year}
              地区: ${currentMovie.vod_area}
              主演: ${currentMovie.vod_actor}
              简介: ${cleanContent}
              `;
          } else {
              systemInstruction += "用户目前在首页浏览。";
          }

          chatSessionRef.current = ai.chats.create({
              model: 'gemini-2.5-flash',
              config: { systemInstruction }
          });
          
          // Reset chat history visually when context changes
          setMessages([{ role: 'model', text: currentMovie ? `已切换到《${currentMovie.vod_name}》的讨论模式。` : '你好！我是你的观影 AI 助手。' }]);

      } catch (e) {
          console.error("Failed to init chat session", e);
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
           setMessages(prev => [...prev, { role: 'model', text: "请配置 API Key 以使用此功能。" }]);
           setIsLoading(false);
           return;
      }

      try {
          // Fallback init if ref is null (e.g. first render race condition or error)
          if (!chatSessionRef.current) {
               const ai = new GoogleGenAI({ apiKey });
               chatSessionRef.current = ai.chats.create({
                  model: 'gemini-2.5-flash',
                  config: { systemInstruction: "你是一个幽默、知识渊博的电影助手。" }
               });
          }

          const response = await chatSessionRef.current.sendMessage({
              message: userText
          });

          const reply = response.text || "抱歉，我没有理解您的问题。";
          setMessages(prev => [...prev, { role: 'model', text: reply }]);
      } catch (error: any) {
          console.error("AI Error", error);
          let errorMsg = "AI 服务暂时不可用。";
          
          if (error.message?.includes('403') || error.toString().includes('403')) {
              errorMsg = "API Key 无效或无权限。";
          } else if (error.message?.includes('429')) {
              errorMsg = "请求过多，请稍后再试。";
          } else if (error.message) {
              // Show detailed error in dev, simplified in prod if needed, but here giving a hint is good
              errorMsg = `错误: ${error.message.slice(0, 50)}...`;
          }

          setMessages(prev => [...prev, { role: 'model', text: errorMsg }]);
      } finally {
          setIsLoading(false);
      }
  };

  return (
      <>
          <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform duration-300 ring-2 ring-white/20 group active:scale-95"
          >
              {isOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              )}
          </button>
          {isOpen && (
              <div className="fixed bottom-24 right-4 md:right-6 w-[calc(100vw-32px)] md:w-[380px] h-[500px] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-up">
                  <div className="p-3 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 flex justify-between items-center">
                      <h3 className="font-bold text-white text-sm">Gemini 助手</h3>
                      <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded">{currentMovie ? '已关联影片' : '闲聊模式'}</span>
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
                          <input 
                              type="text" 
                              value={input} 
                              onChange={(e) => setInput(e.target.value)} 
                              placeholder="输入消息..." 
                              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500" 
                          />
                          <button type="submit" disabled={isLoading || !input.trim()} className="bg-purple-600 hover:bg-purple-500 text-white rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-50">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                          </button>
                      </form>
                  </div>
              </div>
          )}
      </>
  );
};

export default GeminiChat;