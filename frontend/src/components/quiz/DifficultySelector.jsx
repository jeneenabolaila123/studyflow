import React from "react";
import { motion } from "framer-motion";

const DifficultySelector = ({ onStartQuiz, loading, error }) => {
    const difficulties = [
        {
            level: "easy",
            title: "Easy",
            description: "Perfect for beginners",
            time: "15 seconds per question",
            icon: "🌱",
            color: "from-green-400 to-emerald-500",
            buttonColor: "bg-green-500 hover:bg-green-600",
        },
        {
            level: "medium",
            title: "Medium",
            description: "For intermediate learners",
            time: "12 seconds per question",
            icon: "🏃‍♂️",
            color: "from-yellow-400 to-orange-500",
            buttonColor: "bg-yellow-500 hover:bg-yellow-600",
        },
        {
            level: "hard",
            title: "Hard",
            description: "Challenge yourself!",
            time: "10 seconds per question",
            icon: "🔥",
            color: "from-red-400 to-pink-500",
            buttonColor: "bg-red-500 hover:bg-red-600",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <motion.div
                animate={{
                    rotate: [0, 360],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 25,
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
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="absolute -bottom-96 -right-96 w-[800px] h-[800px] bg-gradient-to-tr from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl"
            />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-7xl relative z-10"
            >
                <motion.div
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        delay: 0.2,
                        duration: 0.8,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="text-center mb-16"
                >
                    <motion.h1
                        className="text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight"
                        animate={{
                            textShadow: [
                                "0 0 20px rgba(255,255,255,0.3)",
                                "0 0 40px rgba(255,255,255,0.5)",
                                "0 0 20px rgba(255,255,255,0.3)",
                            ],
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        Choose Difficulty
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-xl md:text-2xl text-white/90 leading-relaxed"
                    >
                        Select your challenge level to start the quiz! 🚀
                    </motion.p>
                </motion.div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-100 p-6 rounded-2xl mb-12 text-center shadow-xl"
                    >
                        <div className="text-3xl mb-2">⚠️</div>
                        <div className="text-lg font-semibold">{error}</div>
                    </motion.div>
                )}

                {loading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-white text-center text-2xl"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="inline-block w-12 h-12 border-4 border-white/30 border-t-white rounded-full mr-4"
                        />
                        <div className="font-semibold">
                            Generating quiz questions...
                        </div>
                        <div className="text-white/80 text-lg mt-2">
                            This may take a moment ⏳
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="grid md:grid-cols-3 gap-8 lg:gap-10"
                    >
                        {difficulties.map((diff, index) => (
                            <motion.div
                                key={diff.level}
                                initial={{ y: 60, opacity: 0, scale: 0.9 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                transition={{
                                    delay: 0.6 + index * 0.15,
                                    duration: 0.6,
                                    type: "spring",
                                    stiffness: 100,
                                }}
                                whileHover={{
                                    scale: 1.05,
                                    y: -15,
                                    transition: { duration: 0.3 },
                                }}
                                whileTap={{ scale: 0.95 }}
                                className="group cursor-pointer"
                                onClick={() => onStartQuiz(diff.level)}
                            >
                                <div
                                    className={`bg-gradient-to-br ${diff.color} p-8 lg:p-10 rounded-3xl shadow-2xl relative overflow-hidden border border-white/20 hover:border-white/40 transition-all duration-300`}
                                >
                                    {/* Enhanced background effects */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <motion.div
                                        className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-xl"
                                        animate={{
                                            scale: [1, 1.2, 1],
                                            opacity: [0.3, 0.6, 0.3],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            delay: index * 0.5,
                                        }}
                                    />

                                    <div className="relative z-10">
                                        <motion.div
                                            className="text-5xl lg:text-6xl mb-6"
                                            whileHover={{
                                                scale: 1.2,
                                                rotate: [0, -10, 10, 0],
                                            }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {diff.icon}
                                        </motion.div>

                                        <h3 className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">
                                            {diff.title}
                                        </h3>

                                        <p className="text-white/95 mb-6 text-lg lg:text-xl leading-relaxed">
                                            {diff.description}
                                        </p>

                                        <motion.div
                                            className="bg-white/20 rounded-2xl p-4 mb-8 backdrop-blur-sm border border-white/30"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            <p className="text-white font-semibold text-lg">
                                                ⏱️ {diff.time}
                                            </p>
                                        </motion.div>

                                        <motion.button
                                            className={`w-full ${diff.buttonColor} text-white font-bold py-5 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl text-lg relative overflow-hidden`}
                                            whileHover={{
                                                scale: 1.02,
                                                boxShadow:
                                                    "0 20px 40px rgba(0,0,0,0.2)",
                                            }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
                                                initial={{ x: "-100%" }}
                                                whileHover={{ x: "100%" }}
                                                transition={{ duration: 0.6 }}
                                            />
                                            <span className="relative z-10">
                                                🚀 Start {diff.title} Quiz
                                            </span>
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default DifficultySelector;
