import React, { useState, useEffect } from 'react';
import { VodSource } from '../types';
import { getVodSources, addVodSource, deleteVodSource, resetVodSources, initVodSources } from '../services/vodService';

interface SettingsModalProps { isOpen: boolean; onClose: () => void; }

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [sources, setSources] = useState<VodSource[]>([]);
    const [newName, setNewName] = useState('');
    const [newApi, setNewApi] = useState('');
    
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Check session storage for persistence during session
            const cachedAuth = sessionStorage.getItem('admin_auth');
            if (cachedAuth === 'true') {
                setIsAuthenticated(true);
                initVodSources().then(() => setSources(getVodSources()));
            } else {
                setIsAuthenticated(false);
                setPassword('');
                setAuthError('');
            }
        }
    }, [isOpen]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === '5573108') {
            setIsAuthenticated(true);
            setAuthError('');
            sessionStorage.setItem('admin_auth', 'true');
            initVodSources().then(() => setSources(getVodSources()));
        } else {
            setAuthError('密码错误，无权访问');
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newApi) return;
        await addVodSource(newName, newApi);
        setSources(getVodSources());
        setNewName(''); setNewApi('');
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this source?')) {
            await deleteVodSource(id);
            setSources(getVodSources());
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#121620] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                {!isAuthenticated ? (
                    <div className="p-8 flex flex-col items-center">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">管理员验证</h2>
                        <p className="text-gray-500 text-sm mb-6">请输入密码以管理资源接口</p>
                        
                        <form onSubmit={handleLogin} className="w-full space-y-4">
                            <div>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="输入密码" 
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all"
                                    autoFocus
                                />
                                {authError && <p className="text-red-500 text-xs text-center mt-2">{authError}</p>}
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-colors text-sm font-medium">取消</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-brand text-black font-bold hover:bg-brand-hover transition-colors text-sm">解锁</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">资源站管理</h2>
                            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        
                        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar bg-black/20 p-2 rounded-lg border border-white/5">
                            {sources.length === 0 && <p className="text-gray-500 text-center py-4 text-sm">暂无自定义源</p>}
                            {sources.map(source => (
                                <div key={source.id} className="bg-gray-800/50 hover:bg-gray-800 p-3 rounded border border-white/5 flex justify-between items-center group transition-colors">
                                    <div className="overflow-hidden mr-3">
                                        <div className="font-bold text-white text-sm truncate">{source.name}</div>
                                        <div className="text-xs text-gray-500 truncate">{source.api}</div>
                                    </div>
                                    {source.canDelete && (
                                        <button onClick={() => handleDelete(source.id)} className="text-red-400 hover:text-red-300 p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t border-white/10">
                            <p className="text-xs text-gray-500 mb-2">添加新资源 (支持 Maccms 格式)</p>
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="资源站名称" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand/50 focus:outline-none" required />
                            <input type="url" value={newApi} onChange={e => setNewApi(e.target.value)} placeholder="API 地址 (例如: https://.../api.php/provide/vod)" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-brand/50 focus:outline-none" required />
                            <button type="submit" className="w-full bg-brand hover:bg-brand-hover text-black font-bold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-brand/20">添加源</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsModal;