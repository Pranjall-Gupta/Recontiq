import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    UploadCloud,
    FileText,
    X,
    Check,
    Loader2,
    Database,
    Building2,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { uploadInvoices } from '@/api/api-client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const Upload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [source, setSource] = useState<'UPLOADED' | 'GSTR2B'>('UPLOADED');
    const [isSuccess, setIsSuccess] = useState(false);

    const uploadMutation = useMutation({
        mutationFn: uploadInvoices,
        onSuccess: () => {
            setIsSuccess(true);
            setFile(null);
        },
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFile(acceptedFiles[0]);
        setIsSuccess(false);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false,
    });

    return (
        <div className="space-y-8 pb-10 flex flex-col items-center pt-10">
            <div className="w-full max-w-2xl text-center space-y-4 mb-4">
                <span className="bg-indigo-100 text-indigo-800 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">Data Ingestion Engine</span>
                <h1 className="text-4xl font-semibold text-slate-900 tracking-tight">Upload Purchase Register</h1>
                <p className="text-slate-500 max-w-lg mx-auto">Drop your CSV ledgers to generate embeddings and run automatic matching across the GSTR-2B datasets.</p>
            </div>

            <div className="w-full max-w-2xl bg-white/70 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl overflow-hidden">
                {!file && !isSuccess && (
                    <div
                        {...getRootProps()}
                        className={cn(
                            "flex flex-col items-center justify-center p-16 text-center cursor-pointer transition-all duration-300",
                            isDragActive ? "bg-indigo-50 border-2 border-indigo-400 border-dashed m-4 rounded-xl" : "hover:bg-slate-50/50"
                        )}
                    >
                        <input {...getInputProps()} />
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-6 shadow-sm border border-indigo-100">
                            <UploadCloud className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a file to sync</h3>
                        <p className="text-sm text-slate-500 mb-6">or drag and drop it here</p>

                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 font-semibold transition-all">
                            Browse Local Files
                        </button>
                        <p className="text-xs text-slate-400 mt-6 font-mono">Supports: .csv ONLY (Max 50MB)</p>
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {file && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="p-10 flex flex-col items-center"
                        >
                            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-slate-100 flex items-center justify-center text-teal-600">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button onClick={() => setFile(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Dataset Source Selection */}
                            <div className="w-full mb-8 text-left">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Define Dataset Source:
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        disabled={uploadMutation.isPending}
                                        onClick={() => setSource('UPLOADED')}
                                        className={cn(
                                            "flex flex-col text-left p-4 rounded-xl border-2 transition-all w-full",
                                            source === 'UPLOADED'
                                                ? "border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-600/10"
                                                : "border-slate-200 hover:border-slate-300 bg-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center mb-3",
                                            source === 'UPLOADED' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                                        )}>
                                            <Database className="w-4.5 h-4.5" />
                                        </div>
                                        <h4 className="font-semibold text-slate-800 text-sm">Purchase Ledger (ERP)</h4>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            Internal company accounts payable invoices recorded in your accounting ledger.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={uploadMutation.isPending}
                                        onClick={() => setSource('GSTR2B')}
                                        className={cn(
                                            "flex flex-col text-left p-4 rounded-xl border-2 transition-all w-full",
                                            source === 'GSTR2B'
                                                ? "border-teal-600 bg-teal-50/20 shadow-sm ring-2 ring-teal-600/10"
                                                : "border-slate-200 hover:border-slate-300 bg-white"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center mb-3",
                                            source === 'GSTR2B' ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                                        )}>
                                            <Building2 className="w-4.5 h-4.5" />
                                        </div>
                                        <h4 className="font-semibold text-slate-800 text-sm">GSTR-2B Statement</h4>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            External government portal record detailing Input Tax Credit auto-drafted by suppliers.
                                        </p>
                                    </button>
                                </div>
                            </div>

                            <div className="w-full space-y-2 mb-8">
                                <div className="flex justify-between text-sm font-semibold text-slate-600">
                                    <span>{uploadMutation.isPending ? 'Indexing Knowledge Graph...' : 'Ready to parse'}</span>
                                    <span className="font-mono">{uploadMutation.isPending ? '85%' : '0%'}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={cn("h-full bg-teal-500 transition-all duration-300", uploadMutation.isPending ? "w-[85%]" : "w-0")} />
                                </div>
                            </div>

                            <button
                                onClick={() => uploadMutation.mutate({ file, source })}
                                disabled={uploadMutation.isPending}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-4 font-semibold transition-all disabled:opacity-70 flex justify-center items-center gap-2 shadow-md"
                            >
                                {uploadMutation.isPending ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Synchronizing...</>
                                ) : (
                                    <>Start Synchronization</>
                                )}
                            </button>
                        </motion.div>
                    )}

                    {isSuccess && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                            className="p-16 flex flex-col items-center text-center"
                        >
                            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-sm">
                                <Check className="w-12 h-12 stroke-[3]" />
                            </div>
                            <h3 className="text-2xl font-semibold text-slate-800 mb-2">Sync Successful</h3>
                            <p className="text-slate-500 mb-8 max-w-sm">Ledgers have been parsed and embedded into the vector search engine.</p>

                            <button
                                onClick={() => setIsSuccess(false)}
                                className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl px-8 py-3 font-semibold transition-all"
                            >
                                Upload Another Ledger
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Upload;
