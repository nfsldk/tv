
import React, { useState, useEffect } from 'react';
import { VodSource } from '../types';
import { getVodSources, addVodSource, deleteVodSource, resetVodSources, saveVodSources, initVodSources, getGlobalProxy } from '../services/vodService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [sources, setSources] = useState<VodSource[]>([]);
    const [newName, setNewName] = useState('');
    const [newApi, setNewApi] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'sources' | 'ai'>('sources');
    
    // AI Proxy State
    const [aiProxy, setAiProxy] = useState(getGlobalProxy());

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            const syncAndLoad = async () => {
                setIsLoading(true);
                await initVodSources();
                setSources(getVodSources());
                setIsLoading(false);
            };
            syncAndLoad();
            setAiProxy(getGlobalProxy());
        }
    }, [isOpen]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === '5573108') {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('密码错误');
            setPassword('');
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newApi) return;
        setIsLoading(true);
        await addVodSource(newName.trim(), newApi.trim());
        setSources(getVodSources());
        setIsLoading(false);
        setNewName(''); setNewApi(''); setShowAdd(false);
    };

    const handleDelete = async (id: string) => {
        if (confirm('确定删除此源吗？')) {
            setIsLoading(true);
            await deleteVodSource(id);
            setSources(getVodSources());
            setIsLoading(false);
        }
    };

    const handleToggle = (id: string) => {
        const updated = sources.map(s => s.id === id ? { ...s, active: !s.active } : s);
        setSources(updated);
        saveVodSources(updated);
    };

    const saveAiProxy = () => {
        localStorage.setItem('cine_ai_proxy', aiProxy);
        alert('AI 代理设置已保存！');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#121620] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gray-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">设置</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {!isAuthenticated ? (
                    <div className="p-8 flex flex-col items-center">
                        <h3 className="text-white font-bold mb-4">身份验证</h3>
                        <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="管理密码" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white text-center" />
                            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                            <button type="submit" className="w-full bg-brand text-black font-bold py-3 rounded-lg">登录</button>
                        </form>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex border-b border-white/10">
                            <button onClick={() => setActiveTab('sources')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'sources' ? 'text-brand bg-white/5' : 'text-gray-500'}`}>资源源站</button>
                            <button onClick={() => setActiveTab('ai')} className={`flex-1 py-3 text-sm font-bold ${activeTab === 'ai' ? 'text-brand bg-white/5' : 'text-gray-500'}`}>AI 代理</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {activeTab === 'sources' ? (
                                <div className="space-y-4">
                                    {sources.map(source => (
                                        <div key={source.id} className="bg-gray-800/50 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                                            <div className="min-w-0 flex-1 mr-4">
                                                <h4 className="text-white font-bold truncate">{source.name}</h4>
                                                <p className="text-[10px] text-gray-500 truncate">{source.api}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input type="checkbox" checked={source.active} onChange={() => handleToggle(source.id)} className="w-4 h-4 accent-brand" />
                                                {source.canDelete && <button onClick={() => handleDelete(source.id)} className="text-red-400 text-xs">删除</button>}
                                            </div>
                                        </div>
                                    ))}
                                    {showAdd ? (
                                        <div className="p-4 border border-brand/30 rounded-xl bg-brand/5 space-y-3">
                                            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="源站名称" className="w-full bg-black/50 border border-white/10 p-2 text-sm text-white" />
                                            <input value={newApi} onChange={e => setNewApi(e.target.value)} placeholder="API 地址" className="w-full bg-black/50 border border-white/10 p-2 text-sm text-white" />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => setShowAdd(false)} className="text-xs text-gray-400">取消</button>
                                                <button onClick={handleAdd} className="bg-brand text-black px-4 py-1 rounded font-bold text-xs">添加</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setShowAdd(true)} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 text-sm hover:text-brand transition-colors">+ 添加新资源站</button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                        <h4 className="text-blue-400 font-bold text-sm mb-2">💡 大陆环境提示</h4>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            由于 Gemini 接口在部分地区无法直接访问，我们需要一个代理中转。如果你有自己的 Cloudflare Worker 代理，请在下方填写。
                                            格式：https://your-worker.workers.dev/?url=
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-2 uppercase font-bold">AI 接口代理地址</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={aiProxy} 
                                                onChange={e => setAiProxy(e.target.value)}
                                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:border-brand focus:outline-none"
                                            />
                                            <button onClick={saveAiProxy} className="bg-brand text-black font-bold px-4 py-2 rounded-lg text-sm">保存</button>
                                        </div>
                                    </div>
                                    <button onClick={() => { setAiProxy('https://daili.laidd.de5.net/?url='); localStorage.removeItem('cine_ai_proxy'); }} className="text-xs text-gray-500 underline">恢复默认公共代理</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-white/10 flex justify-end bg-gray-900/50">
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg text-sm font-medium">关闭</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
