import axios from "axios";
import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_AI_TUTOR_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

export default function ChapterList({ book, chapters, onQuizReady }) {
  const [loadingChapterIndex, setLoadingChapterIndex] = useState(null);
  const [loadingType, setLoadingType] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timer;
    if (loadingChapterIndex !== null) {
      setElapsedTime(0);
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(timer);
  }, [loadingChapterIndex]);

  const generateQuiz = async (chapterIndex) => {
    setLoadingChapterIndex(chapterIndex);
    setLoadingType("subjective");
    setError(null);

    try {
      const res = await axios.post(
        `${API_BASE}/generate-quiz/?book=${encodeURIComponent(
          book
        )}&chapter_number=${chapterIndex + 1}`
      );

      onQuizReady(res.data, chapterIndex + 1, "subjective");
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to generate quiz.";
      setError(detail);
    } finally {
      setLoadingChapterIndex(null);
      setLoadingType(null);
    }
  };

  const generateTrueFalseQuiz = async (chapterIndex) => {
    setLoadingChapterIndex(chapterIndex);
    setLoadingType("true_false");
    setError(null);

    try {
      const res = await axios.post(
        `${API_BASE}/api/quiz/true-false/chapter?book=${encodeURIComponent(
          book
        )}&chapter_number=${chapterIndex + 1}`
      );

      onQuizReady(res.data, chapterIndex + 1, "true_false");
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to generate True/False quiz.";
      setError(detail);
    } finally {
      setLoadingChapterIndex(null);
      setLoadingType(null);
    }
  };

  const generateFillBlankQuiz = async (chapterIndex) => {
    setLoadingChapterIndex(chapterIndex);
    setLoadingType("fill_blank");
    setError(null);

    try {
      const res = await axios.post(
        `${API_BASE}/api/quiz/fill-blank/chapter?book=${encodeURIComponent(
          book
        )}&chapter_number=${chapterIndex + 1}`
      );

      onQuizReady(res.data, chapterIndex + 1, "fill_blank");
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to generate Fill in the Blank quiz.";
      setError(detail);
    } finally {
      setLoadingChapterIndex(null);
      setLoadingType(null);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-4">📘 Detected Chapters</h2>

      {error && <p className="mb-2 text-sm text-red-600">⚠️ {error}</p>}

      <ul className="space-y-2">
        {chapters.map((chapter, index) => (
          <li
            key={index}
            className="bg-white p-4 rounded shadow border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
          >
            <span className="truncate max-w-full sm:max-w-[45%]">
              {chapter.chapter_title || chapter.title || `Chapter ${index + 1}`}
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => generateQuiz(index)}
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50 min-w-[140px]"
                disabled={loadingChapterIndex !== null}
              >
                {loadingChapterIndex === index && loadingType === "subjective"
                  ? `Generating... (${elapsedTime}s)`
                  : "Generate Quiz"}
              </button>

              <button
                onClick={() => generateTrueFalseQuiz(index)}
                className="bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700 disabled:opacity-50 min-w-[140px]"
                disabled={loadingChapterIndex !== null}
              >
                {loadingChapterIndex === index && loadingType === "true_false"
                  ? `Generating... (${elapsedTime}s)`
                  : "True/False"}
              </button>

              <button
                onClick={() => generateFillBlankQuiz(index)}
                className="bg-emerald-600 text-white px-4 py-1 rounded hover:bg-emerald-700 disabled:opacity-50 min-w-[170px]"
                disabled={loadingChapterIndex !== null}
              >
                {loadingChapterIndex === index && loadingType === "fill_blank"
                  ? `Generating... (${elapsedTime}s)`
                  : "Fill in the Blank"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
