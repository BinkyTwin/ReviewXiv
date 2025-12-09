import { useState, useEffect } from 'react';
import { uploadPDF } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, BookOpen, Loader2, Trash2 } from 'lucide-react';

export default function Dashboard({ onNavigate }) {
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('deepread_files');
        if (stored) {
            setFiles(JSON.parse(stored));
        }
    }, []);

    const saveFiles = (newFiles) => {
        setFiles(newFiles);
        localStorage.setItem('deepread_files', JSON.stringify(newFiles));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        try {
            const data = await uploadPDF(file);
            const newFile = {
                id: data.id,
                filename: data.filename,
                date: new Date().toISOString(),
            };
            saveFiles([newFile, ...files]);
        } catch (err) {
            setError("Erreur lors de l'upload. Vérifiez que le backend est lancé.");
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = (id, e) => {
        e.stopPropagation();
        const newFiles = files.filter(f => f.id !== id);
        saveFiles(newFiles);
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <header className="mb-12 text-center">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent mb-4"
                >
                    DeepRead
                </motion.h1>
                <p className="text-neutral-400 text-lg">Votre assistant de lecture scientifique augmenté par l'IA.</p>
            </header>

            {/* Upload Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-16"
            >
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-neutral-700 rounded-2xl bg-neutral-900/50 hover:bg-neutral-800/50 hover:border-indigo-500/50 transition-all cursor-pointer group relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isUploading ? (
                            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
                        ) : (
                            <Upload className="w-10 h-10 text-neutral-500 group-hover:text-indigo-400 transition-colors mb-3" />
                        )}
                        <p className="mb-2 text-sm text-neutral-400">
                            <span className="font-semibold text-neutral-300">Cliquez pour uploader</span> ou glissez un PDF
                        </p>
                        <p className="text-xs text-neutral-500">PDF jusqu'à 50MB</p>
                    </div>
                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={isUploading} />
                    {isUploading && <div className="absolute inset-0 bg-neutral-950/20 backdrop-blur-[1px]" />}
                </label>
                {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}
            </motion.div>

            {/* Library Grid */}
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-neutral-100 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-indigo-400" />
                    Bibliothèque
                </h2>

                {files.length === 0 ? (
                    <div className="text-center py-12 bg-neutral-900/30 rounded-xl border border-neutral-800/50">
                        <p className="text-neutral-500">Aucun document importé.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {files.map((file) => (
                                <motion.div
                                    key={file.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -4 }}
                                    onClick={() => onNavigate(file.id)}
                                    className="group relative bg-neutral-900 border border-neutral-800 hover:border-indigo-500/30 rounded-xl p-6 cursor-pointer transition-all shadow-lg hover:shadow-indigo-500/10"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <button
                                            onClick={(e) => removeFile(file.id, e)}
                                            className="p-2 text-neutral-600 hover:text-red-400 transition-colors rounded-full hover:bg-neutral-800"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <h3 className="text-lg font-medium text-neutral-200 group-hover:text-white truncate mb-2" title={file.filename}>
                                        {file.filename}
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-mono">
                                        {new Date(file.date).toLocaleDateString()}
                                    </p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
