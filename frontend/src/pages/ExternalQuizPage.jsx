import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = "http://127.0.0.1:8000/api";

export default function ExternalQuizPage() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentQuestion = questions[currentIndex] ?? null;
  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round(((currentIndex + 1) / questions.length) * 100);
  }, [currentIndex, questions.length]);

  useEffect(() => {
    fetchQuiz();
  }, []);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      setError("");
      setShowResult(false);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setScore(0);

      const res = await axios.get(`${API_BASE}/external-quiz`, {
        params: {
          amount: 5,
          difficulty: "easy",
        },
      });

      const fetchedQuestions = res.data?.questions || [];

      if (!fetchedQuestions.length) {
        setError("No questions returned.");
        setQuestions([]);
        return;
      }

      setQuestions(fetchedQuestions);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load quiz."
      );
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerClick = (option) => {
    if (submitting) return;
    setSelectedAnswer(option);
  };

  const handleNext = () => {
    if (!currentQuestion || selectedAnswer === null) return;

    setSubmitting(true);

    const isCorrect = selectedAnswer === currentQuestion.correct_answer;
    const newScore = isCorrect ? score + 1 : score;

    if (isCorrect) {
      setScore(newScore);
    }

    const isLastQuestion = currentIndex === questions.length - 1;

    if (isLastQuestion) {
      setShowResult(true);
      setSubmitting(false);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setSubmitting(false);
  };

  const handleRestart = () => {
    fetchQuiz();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center w-full max-w-xl">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Loading Quiz...</h2>
          <p className="text-gray-600">Fetching fast MCQ questions from API.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center w-full max-w-xl">
          <h2 className="text-2xl font-bold text-red-600 mb-3">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={fetchQuiz}
            className="px-6 py-3 rounded-xl bg-black text-white hover:opacity-90 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Finished</h1>
          <p className="text-lg text-gray-700 mb-2">
            Your Score
          </p>
          <p className="text-5xl font-extrabold text-black mb-6">
            {score} / {questions.length}
          </p>

          <button
            onClick={handleRestart}
            className="px-6 py-3 rounded-xl bg-black text-white hover:opacity-90 transition"
          >
            Restart Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  const isAnswered = selectedAnswer !== null;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Multiple Choice Quiz</h1>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Score</p>
            <p className="text-2xl font-bold text-black">{score}</p>
          </div>
        </div>

        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-black transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mb-8">
          <p className="text-xl font-semibold text-gray-800 leading-8">
            {currentQuestion.question}
          </p>
        </div>

        <div className="space-y-4">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === option;

            return (
              <button
                key={`${option}-${index}`}
                onClick={() => handleAnswerClick(option)}
                className={`w-full text-left px-5 py-4 rounded-2xl border transition font-medium
                  ${
                    isSelected
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white text-gray-800 hover:border-black"
                  }
                `}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleNext}
            disabled={!isAnswered}
            className={`px-6 py-3 rounded-xl transition ${
              isAnswered
                ? "bg-black text-white hover:opacity-90"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {currentIndex === questions.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}