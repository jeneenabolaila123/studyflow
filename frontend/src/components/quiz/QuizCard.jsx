import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const QuizCard = ({
    question,
    questionNumber,
    totalQuestions,
    selectedAnswer,
    showAnswer,
    timer,
    maxTimer,
    onAnswerSelect,
    onNextQuestion,
    difficulty,
}) => {
    if (!question || !question.question || !question.options) {
        return (
            <div className="text-white text-center text-2xl mt-20">
                Loading question...
            </div>
        );
    }

    const timerPercentage = (timer / maxTimer) * 100;
    const isCorrect = selectedAnswer === question.answer;

    const getDifficultyColor = () => {
        switch (difficulty) {
            case "easy":
                return "from-green-400 to-emerald-500";
            case "medium":
                return "from-yellow-400 to-orange-500";
            case "hard":
                return "from-red-400 to-pink-500";
            default:
                return "from-blue-400 to-indigo-500";
        }
    };

    const getTimerColor = () => {
        if (timer > maxTimer * 0.6) return "text-green-500";
        if (timer > maxTimer * 0.3) return "text-yellow-500";
        return "text-red-500";
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                    duration: 0.6,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    staggerChildren: 0.1,
                }}
                className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl border border-white/30 relative overflow-hidden"
            >
                {/* Animated Background Elements */}
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-blue-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl" />

                {/* Header */}
                <motion.div
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex justify-between items-center mb-10 relative z-10"
                >
                    <div className="flex items-center space-x-4">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className={`bg-gradient-to-r ${getDifficultyColor()} text-white px-5 py-2 rounded-full font-bold capitalize shadow-lg border border-white/20`}
                        >
                            {difficulty}
                        </motion.div>
                        <span className="text-gray-700 font-semibold text-lg">
                            Question {questionNumber} of {totalQuestions}
                        </span>
                    </div>

                    {/* Enhanced Timer */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                            delay: 0.4,
                            type: "spring",
                            stiffness: 200,
                        }}
                        className="flex items-center space-x-3"
                    >
                        <div className="relative w-20 h-20">
                            <svg
                                className="w-20 h-20 transform -rotate-90"
                                viewBox="0 0 100 100"
                            >
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="none"
                                    className="text-gray-200"
                                />
                                <motion.circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="none"
                                    strokeLinecap="round"
                                    className={getTimerColor()}
                                    animate={{
                                        strokeDasharray: `${
                                            (timerPercentage / 100) *
                                            (2 * Math.PI * 42)
                                        } ${2 * Math.PI * 42}`,
                                    }}
                                    transition={{ duration: 0.3 }}
                                    style={{
                                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
                                    }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <motion.span
                                    key={timer}
                                    initial={{ scale: 1.2 }}
                                    animate={{ scale: 1 }}
                                    className={`text-xl font-bold ${getTimerColor()}`}
                                >
                                    {timer}
                                </motion.span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Question */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-10 relative z-10"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-800 leading-relaxed tracking-tight">
                        {question.question}
                    </h2>
                </motion.div>

                {/* Answer Options */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid gap-5 mb-10 relative z-10"
                >
                    {question.options.map((option, index) => {
                        const isSelected = selectedAnswer === option;
                        const isCorrectOption = option === question.answer;

                        let buttonStyle =
                            "bg-gray-50/80 hover:bg-gray-100/80 text-gray-800 border-gray-200/60 hover:border-gray-300/80";

                        if (showAnswer) {
                            if (isCorrectOption) {
                                buttonStyle =
                                    "bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-400 shadow-emerald-200/50";
                            } else if (isSelected && !isCorrectOption) {
                                buttonStyle =
                                    "bg-gradient-to-r from-red-500 to-pink-500 text-white border-red-400 shadow-red-200/50";
                            } else {
                                buttonStyle =
                                    "bg-gray-100/60 text-gray-500 border-gray-200/60";
                            }
                        } else if (isSelected) {
                            buttonStyle = `bg-gradient-to-r ${getDifficultyColor()} text-white border-transparent shadow-lg`;
                        }

                        return (
                            <motion.button
                                key={index}
                                initial={{ x: -30, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{
                                    delay: 0.5 + index * 0.1,
                                    type: "spring",
                                    stiffness: 100,
                                }}
                                whileHover={
                                    !showAnswer
                                        ? {
                                              scale: 1.02,
                                              y: -3,
                                              transition: { duration: 0.2 },
                                          }
                                        : {}
                                }
                                whileTap={
                                    !showAnswer
                                        ? {
                                              scale: 0.98,
                                              transition: { duration: 0.1 },
                                          }
                                        : {}
                                }
                                onClick={() => onAnswerSelect(option)}
                                disabled={showAnswer}
                                className={`w-full p-5 md:p-6 rounded-2xl border-2 text-left font-semibold transition-all duration-300 backdrop-blur-sm ${buttonStyle} ${
                                    showAnswer
                                        ? "cursor-default"
                                        : "cursor-pointer hover:shadow-lg"
                                } ${
                                    !showAnswer && !isSelected
                                        ? "hover:shadow-md transform-gpu"
                                        : ""
                                }`}
                            >
                                <div className="flex items-center space-x-5">
                                    <motion.span
                                        className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center font-bold text-lg shadow-sm"
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        {String.fromCharCode(65 + index)}
                                    </motion.span>
                                    <span className="text-lg leading-relaxed">
                                        {option}
                                    </span>
                                    {showAnswer && isCorrectOption && (
                                        <motion.span
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{
                                                delay: 0.2,
                                                type: "spring",
                                            }}
                                            className="ml-auto text-2xl"
                                        >
                                            ✓
                                        </motion.span>
                                    )}
                                    {showAnswer &&
                                        isSelected &&
                                        !isCorrectOption && (
                                            <motion.span
                                                initial={{
                                                    scale: 0,
                                                    rotate: 180,
                                                }}
                                                animate={{
                                                    scale: 1,
                                                    rotate: 0,
                                                }}
                                                transition={{
                                                    delay: 0.2,
                                                    type: "spring",
                                                }}
                                                className="ml-auto text-2xl"
                                            >
                                                ✗
                                            </motion.span>
                                        )}
                                </div>
                            </motion.button>
                        );
                    })}
                </motion.div>

                {/* Next Button */}
                <AnimatePresence>
                    {showAnswer && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            transition={{ delay: 0.3 }}
                            className="flex justify-center relative z-10"
                        >
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onNextQuestion}
                                className={`bg-gradient-to-r ${getDifficultyColor()} text-white font-bold py-4 px-8 md:px-10 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300`}
                            >
                                {questionNumber === totalQuestions
                                    ? "🏁 Finish Quiz"
                                    : "➡️ Next Question"}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Enhanced Result Indicator */}
                <AnimatePresence>
                    {showAnswer && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0, y: -20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 20,
                            }}
                            className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20"
                        >
                            <motion.div
                                animate={{
                                    rotateY: [0, 10, -10, 0],
                                }}
                                transition={{ duration: 0.6 }}
                                className={`px-6 py-3 rounded-2xl font-bold text-white shadow-xl backdrop-blur-sm border border-white/30 ${
                                    isCorrect
                                        ? "bg-gradient-to-r from-emerald-500 to-green-500"
                                        : "bg-gradient-to-r from-red-500 to-pink-500"
                                }`}
                            >
                                {isCorrect ? "🎉 Perfect!" : "💪 Keep trying!"}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default QuizCard;
