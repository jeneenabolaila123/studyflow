import React from "react";
import { motion } from "framer-motion";

const ScoreScreen = ({ score, totalQuestions, onRestart }) => {
    const percentage = Math.round((score / totalQuestions) * 100);

    const getMotivationalMessage = (percentage) => {
        if (percentage >= 90) return "🏆 Outstanding! You're a quiz champion!";
        if (percentage >= 80)
            return "🌟 Excellent work! You really know your stuff!";
        if (percentage >= 70) return "🎉 Great job! You did really well!";
        if (percentage >= 60) return "👍 Good effort! Keep practicing!";
        if (percentage >= 50) return "💪 Not bad! You're getting there!";
        return "📚 Keep studying! Practice makes perfect!";
    };

    const getGradeColor = (percentage) => {
        if (percentage >= 90) return "from-yellow-400 to-orange-500";
        if (percentage >= 80) return "from-green-400 to-emerald-500";
        if (percentage >= 70) return "from-blue-400 to-indigo-500";
        if (percentage >= 60) return "from-purple-400 to-pink-500";
        return "from-gray-400 to-gray-600";
    };

    const getGradeEmoji = (percentage) => {
        if (percentage >= 90) return "🏆";
        if (percentage >= 80) return "🌟";
        if (percentage >= 70) return "🎉";
        if (percentage >= 60) return "👍";
        return "📚";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background particles */}
            <motion.div
                animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="absolute -top-96 -left-96 w-[800px] h-[800px] bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full blur-3xl"
            />
            <motion.div
                animate={{
                    rotate: [360, 0],
                    scale: [1.2, 1, 1.2],
                }}
                transition={{
                    duration: 35,
                    repeat: Infinity,
                    ease: "linear",
                }}
                className="absolute -bottom-96 -right-96 w-[800px] h-[800px] bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl"
            />

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-3xl relative z-10"
            >
                <motion.div
                    initial={{ y: 80, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{
                        duration: 0.8,
                        ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    className="bg-white/95 backdrop-blur-xl rounded-3xl p-10 md:p-12 shadow-2xl text-center border border-white/30 relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl" />

                    {/* Grade Emoji with enhanced animation */}
                    <motion.div
                        initial={{ scale: 0, rotateY: 0 }}
                        animate={{
                            scale: [0, 1.3, 1],
                            rotateY: [0, 180, 360],
                        }}
                        transition={{
                            delay: 0.5,
                            duration: 1.2,
                            ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        className="text-8xl md:text-9xl mb-8 relative z-10"
                    >
                        {getGradeEmoji(percentage)}
                    </motion.div>

                    <motion.h1
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 relative z-10"
                    >
                        Quiz Complete! 🎊
                    </motion.h1>

                    <motion.p
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1.0 }}
                        className="text-xl md:text-2xl text-gray-600 mb-10 relative z-10 leading-relaxed"
                    >
                        {getMotivationalMessage(percentage)}
                    </motion.p>

                    {/* Enhanced Score Circle */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                            delay: 1.2,
                            type: "spring",
                            stiffness: 100,
                        }}
                        className="relative mx-auto mb-10"
                        style={{ width: "220px", height: "220px" }}
                    >
                        <svg
                            className="w-full h-full transform -rotate-90"
                            viewBox="0 0 100 100"
                        >
                            <circle
                                cx="50"
                                cy="50"
                                r="38"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                className="text-gray-200"
                            />
                            <motion.circle
                                cx="50"
                                cy="50"
                                r="38"
                                stroke="url(#scoreGradient)"
                                strokeWidth="6"
                                fill="none"
                                strokeLinecap="round"
                                initial={{
                                    strokeDasharray: `0 ${2 * Math.PI * 38}`,
                                }}
                                animate={{
                                    strokeDasharray: `${
                                        (percentage / 100) * (2 * Math.PI * 38)
                                    } ${2 * Math.PI * 38}`,
                                }}
                                transition={{
                                    duration: 2.5,
                                    delay: 1.5,
                                    ease: "easeOut",
                                }}
                                style={{
                                    filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
                                }}
                            />
                            <defs>
                                <linearGradient
                                    id="scoreGradient"
                                    x1="0%"
                                    y1="0%"
                                    x2="100%"
                                    y2="0%"
                                >
                                    <stop
                                        offset="0%"
                                        className="stop-emerald-400"
                                    />
                                    <stop
                                        offset="50%"
                                        className="stop-blue-500"
                                    />
                                    <stop
                                        offset="100%"
                                        className="stop-purple-500"
                                    />
                                </linearGradient>
                            </defs>
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 2.0, type: "spring" }}
                                className="text-4xl md:text-5xl font-bold text-gray-800"
                            >
                                {percentage}%
                            </motion.span>
                            <span className="text-gray-600 font-medium text-lg">
                                Score
                            </span>
                        </div>
                    </motion.div>

                    {/* Enhanced Grade Badge */}
                    <motion.div
                        initial={{ scale: 0, y: 30 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{
                            delay: 1.8,
                            type: "spring",
                            stiffness: 200,
                        }}
                        className={`inline-block bg-gradient-to-r ${getGradeColor(
                            percentage
                        )} text-white px-8 py-4 rounded-2xl font-bold text-xl mb-10 shadow-xl relative z-10`}
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        >
                            Final Score: {score}/{totalQuestions}
                        </motion.div>
                    </motion.div>

                    {/* Enhanced Restart Button */}
                    <motion.button
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 2.2 }}
                        whileHover={{
                            scale: 1.05,
                            y: -3,
                            transition: { duration: 0.2 },
                        }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onRestart}
                        className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 hover:from-purple-600 hover:via-indigo-600 hover:to-blue-700 text-white font-bold py-5 px-10 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 relative z-10 text-lg"
                    >
                        <motion.span
                            animate={{
                                rotate: [0, 360],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="inline-block mr-3"
                        >
                            🔄
                        </motion.span>
                        Take Quiz Again
                    </motion.button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default ScoreScreen;
