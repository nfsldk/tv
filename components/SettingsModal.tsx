
import React, { useState, useEffect } from 'react';
import { VodSource } from '../types';
import { getVodSources, addVodSource, deleteVodSource, resetVodSources, saveVodSources, initVodSources } from '../services/vodService';

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
    
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Force sync from cloud when opening settings
            const syncAndLoad = async () => {
                setIsLoading(true);
                await initVodSources(); // Pull latest from Supabase
                setSources(getVodSources()); // Read updated local storage
                setIsLoading(false);
            };
            syncAndLoad();

            // Reset auth state on close/open if desired, or keep session
            // For now, simple session reset
            if (!isAuthenticated) {
                setPassword('');
                setError('');
            }
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
        // Add to cloud and local
        await addVodSource(newName.trim(), newApi.trim());
        setSources(getVodSources()); // Refresh list
        setIsLoading(false);
        
        setNewName('');
        setNewApi('');
        setShowAdd(false);
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
        // Note: Toggle currently only syncs active state to local/cloud via toggleVodSource service wrapper
        // If strict cloud sync for 'active' status is needed, update service similarly
    };

    const handleReset = async () => {
        if (confirm('恢复默认设置将清除所有自定义源，确定吗？')) {
            setIsLoading(true);
            const defaults = await resetVodSources();
            setSources(defaults);
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#121620] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center bg-gray-900/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-brand">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                        </svg>
                        资源站管理
                        {isLoading && <span className="text-xs font-normal text-gray-500 animate-pulse ml-2">(同步中...)</span>}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {!isAuthenticated ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
                         <div className="bg-white/5 p-4 rounded-full">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                             </svg>
                         </div>
                         <h3 className="text-lg font-bold text-white">管理员验证</h3>
                         <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
                             <div>
                                 <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="请输入管理密码"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-center text-white tracking-widest focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/50 transition-all"
                                    autoFocus
                                 />
                                 {error && <p className="text-red-500 text-xs text-center mt-2 animate-bounce">{error}</p>}
                             </div>
                             <button type="submit" className="w-full bg-brand text-black font-bold py-3 rounded-lg hover:bg-brand-hover transition-colors">
                                 进入后台
                             </button>
                         </form>
                    </div>
                ) : (
                    <>
                        <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                            
                            {/* Source List */}
                            <div className="space-y-3 mb-6">
                                {sources.map(source => (
                                    <div key={source.id} className="bg-gray-800/50 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-all">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-white truncate">{source.name}</h3>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                  <input type="checkbox" checked={source.active} onChange={() => handleToggle(source.id)} className="sr-only peer" />
                                                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand"></div>
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500 font-mono truncate bg-black/30 p-1.5 rounded border border-white/5">{source.api}</p>
                                        </div>
                                        
                                        {source.canDelete && (
                                            <button 
                                                onClick={() => handleDelete(source.id)}
                                                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 hover:bg-red-500/10 px-3 py-1.5 rounded transition-colors self-start md:self-center"
                                                disabled={isLoading}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                                删除
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Add Form */}
                            {showAdd ? (
                                <form onSubmit={handleAdd} className="bg-gray-800/80 border border-brand/30 rounded-xl p-4 animate-slide-up">
                                    <h3 className="font-bold text-white mb-4">添加新源 (Add New Source)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">名称 (Name)</label>
                                            <input 
                                                type="text" 
                                                value={newName} 
                                                onChange={e => setNewName(e.target.value)}
                                                placeholder="例如：极速资源"
                                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-brand focus:outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">API 地址 (Maccms XML/JSON)</label>
                                            <input 
                                                type="url" 
                                                value={newApi} 
                                                onChange={e => setNewApi(e.target.value)}
                                                placeholder="https://domain.com/api.php/provide/vod"
                                                className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-brand focus:outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-300 hover:text-white">取消</button>
                                        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-brand text-black font-bold rounded hover:bg-brand-hover disabled:opacity-50">
                                            {isLoading ? '添加中...' : '确认添加'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <button 
                                    onClick={() => setShowAdd(true)}
                                    className="w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-brand hover:border-brand/50 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                    添加新资源站
                                </button>
                            )}
                        </div>

                        <div className="p-4 bg-gray-900/80 border-t border-white/10 flex justify-between items-center">
                            <button onClick={handleReset} className="text-xs text-gray-500 hover:text-red-400 underline">恢复默认配置</button>
                            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
                                关闭
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SettingsModal;
