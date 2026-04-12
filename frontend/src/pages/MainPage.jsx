import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function MainPage() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white overflow-hidden">

      {/* 🌌 Background Glow */}
      <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-purple-600 rounded-full blur-3xl opacity-30"></div>
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-blue-600 rounded-full blur-3xl opacity-30"></div>

      {/* 🔥 Navbar */}
      <nav className="flex justify-between items-center px-8 py-4 backdrop-blur-md bg-white/5 sticky top-0 z-50 border-b border-white/10">
        <h1 className="text-2xl font-bold">StudyFlow</h1>

        <div className="flex items-center gap-4">
          <span className="text-green-400 text-sm">● Connected</span>

          <Link to="/login" className="hover:text-purple-400 transition">
            Login
          </Link>

          <Link
            to="/register"
            className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg hover:scale-105 transition"
          >
            Register
          </Link>
        </div>
      </nav>

      {/* 🚀 HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24">

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-5xl md:text-6xl font-bold leading-tight bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent"
        >
          Study Smarter with AI 🚀
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-lg text-gray-300 max-w-xl"
        >
          Upload notes, generate summaries, and test yourself with intelligent AI quizzes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4 mt-8"
        >
          <Link
            to="/register"
            className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-xl font-semibold hover:scale-110 transition shadow-lg"
          >
            Get Started
          </Link>

          <Link
            to="/login"
            className="border border-white/20 px-6 py-3 rounded-xl hover:bg-white/10 transition"
          >
            Login
          </Link>
        </motion.div>
      </section>

      {/* 🧩 FEATURES */}
      <section className="px-6 pb-24 max-w-6xl mx-auto grid md:grid-cols-3 gap-6">

        {[
          {
            title: "Upload Notes",
            desc: "Upload PDFs or text easily.",
            icon: "📄",
          },
          {
            title: "AI Summary",
            desc: "Instant smart summaries.",
            icon: "🧠",
          },
          {
            title: "Quiz Generator",
            desc: "Create quizzes from your notes.",
            icon: "❓",
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-lg hover:shadow-purple-500/20 transition"
          >
            <div className="text-3xl">{item.icon}</div>
            <h3 className="text-xl font-semibold mt-4">{item.title}</h3>
            <p className="text-gray-400 mt-2">{item.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* 🎯 FOOTER */}
      <footer className="text-center py-6 text-gray-500 border-t border-white/10">
        © 2026 StudyFlow — AI Powered Learning 🚀
      </footer>
    </div>
  );
}