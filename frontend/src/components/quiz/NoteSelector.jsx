import React, { useState } from "react";
import { motion } from "framer-motion";
import { PageSpinner } from "../Spinner";

const NoteSelector = ({ notes, onSelectNote, loading }) => {
    const [selectedNoteId, setSelectedNoteId] = useState(null);

    if (loading) return <PageSpinner />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background particles */}
            <motion.div
                animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="absolute -top-96 -left-96 w-[800px] h-[800px] bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl"
            />
            <motion.div
                animate={{
                    rotate: [360, 0],
                    scale: [1.1, 1, 1.1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="absolute -bottom-96 -right-96 w-[800px] h-[800px] bg-gradient-to-tr from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl"
            />

            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-5xl relative z-10"
            >
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-10 md:p-12 shadow-2xl border border-white/30 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl" />

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-center mb-10 relative z-10"
                    >
                        <motion.h1
                            className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 tracking-tight"
                            animate={{
                                textShadow: [
                                    "0 0 0px rgba(0,0,0,0.1)",
                                    "0 4px 8px rgba(0,0,0,0.2)",
                                    "0 0 0px rgba(0,0,0,0.1)",
                                ],
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                        >
                            🧠 Quiz Challenge
                        </motion.h1>
                        <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                            Select a note to generate quiz questions from:
                        </p>
                    </motion.div>

                    {notes.length === 0 ? (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-center py-16 relative z-10"
                        >
                            <motion.div
                                className="text-8xl mb-6"
                                animate={{
                                    y: [0, -10, 0],
                                    rotate: [0, 5, -5, 0],
                                }}
                                transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                }}
                            >
                                📚
                            </motion.div>
                            <p className="text-gray-500 text-2xl mb-4 font-semibold">
                                No notes available
                            </p>
                            <p className="text-gray-400 text-lg">
                                Upload some study material first to create
                                quizzes! ✨
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="grid gap-5 max-h-96 overflow-y-auto relative z-10 pr-2"
                            style={{ scrollbarWidth: "thin" }}
                        >
                            {notes.map((note, index) => (
                                <motion.div
                                    key={note.id}
                                    initial={{ x: -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 + index * 0.1 }}
                                    whileHover={{
                                        scale: 1.02,
                                        y: -2,
                                        transition: { duration: 0.2 },
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedNoteId(note.id)}
                                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 backdrop-blur-sm ${
                                        selectedNoteId === note.id
                                            ? "border-blue-400 bg-blue-50/80 shadow-lg shadow-blue-200/50"
                                            : "border-gray-200/60 hover:border-gray-300/80 hover:bg-gray-50/80 hover:shadow-md"
                                    }`}
                                >
                                    <h3 className="font-bold text-xl text-gray-800 mb-2 leading-tight">
                                        {note.title}
                                    </h3>
                                    {note.description && (
                                        <p className="text-gray-600 text-base mb-4 leading-relaxed">
                                            {note.description}
                                        </p>
                                    )}
                                    <div className="flex gap-3 flex-wrap">
                                        {note.source_type && (
                                            <motion.span
                                                whileHover={{ scale: 1.05 }}
                                                className="px-3 py-1 bg-blue-100/80 text-blue-800 rounded-full text-sm font-medium"
                                            >
                                                {note.source_type.toUpperCase()}
                                            </motion.span>
                                        )}
                                        {note.ai_summary && (
                                            <motion.span
                                                whileHover={{ scale: 1.05 }}
                                                className="px-3 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-sm font-medium"
                                            >
                                                ✨ AI Summary
                                            </motion.span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {selectedNoteId && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            transition={{
                                duration: 0.4,
                                ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                            className="mt-10 text-center relative z-10"
                        >
                            <motion.button
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                whileHover={{
                                    scale: 1.05,
                                    y: -3,
                                    transition: { duration: 0.2 },
                                }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onSelectNote(selectedNoteId)}
                                className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 hover:from-purple-600 hover:via-indigo-600 hover:to-blue-700 text-white font-bold py-5 px-10 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-lg"
                            >
                                🚀 Continue to Quiz Setup
                            </motion.button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default NoteSelector;
