import React, { useState, useEffect } from 'react';
import { VodSource } from '../types';
import { getVodSources, addVodSource, deleteVodSource, resetVodSources, initVodSources } from '../services/vodService';

interface SettingsModalProps { isOpen: boolean; onClose: () => void; }

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [sources, setSources] = useState<VodSource[]>([]);
    const [newName, setNewName] = useState('');
    const [newApi, setNewApi] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            initVodSources().then(() => setSources(getVodSources()));
        }
    }, [isOpen]);

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#121620] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">资源站管理</h2>
                <div className="space-y-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                    {sources.map(source => (
                        <div key={source.id} className="bg-gray-800 p-3 rounded flex justify-between items-center">
                            <div><div className="font-bold text-white text-sm">{source.name}</div><div className="text-xs text-gray-500 truncate w-48">{source.api}</div></div>
                            {source.canDelete && <button onClick={() => handleDelete(source.id)} className="text-red-400 text-xs">删除</button>}
                        </div>
                    ))}
                </div>
                <form onSubmit={handleAdd} className="space-y-3">
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="名称" className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm" required />
                    <input type="url" value={newApi} onChange={e => setNewApi(e.target.value)} placeholder="API URL (Maccms)" className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm" required />
                    <button type="submit" className="w-full bg-brand text-black font-bold py-2 rounded">添加源</button>
                </form>
                <button onClick={onClose} className="mt-4 text-gray-400 text-sm hover:text-white w-full">关闭</button>
            </div>
        </div>
    );
};

export default SettingsModal;