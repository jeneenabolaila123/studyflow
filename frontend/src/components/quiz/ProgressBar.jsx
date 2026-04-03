import React from "react";
import { motion } from "framer-motion";

const ProgressBar = ({ progress }) => {
    return (
        <div className="w-full relative h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
            <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 relative rounded-full shadow-lg"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent rounded-full"
                    animate={{
                        x: [-100, 200],
                        opacity: [0, 1, 0],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </motion.div>
            <motion.div
                className="absolute right-4 -top-10 bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-white/30"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
            >
                <span className="text-white font-bold text-sm tracking-wide">
                    {Math.round(progress)}%
                </span>
            </motion.div>
        </div>
    );
};

export default ProgressBar;
