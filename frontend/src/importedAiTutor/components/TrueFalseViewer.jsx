import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_AI_TUTOR_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

export default function TrueFalseViewer({ quiz, chapterNumber, book }) {
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loadingNewQuiz, setLoadingNewQuiz] = useState(false);
  const [error, setError] = useState(null);
  const [generationTime, setGenerationTime] = useState(
    quiz?.generation_time || null
  );

  useEffect(() => {
    if (quiz?.questions?.length) {
      setGenerationTime(quiz.generation_time || null);
      resetQuiz(quiz.questions);
    }
  }, [quiz]);

  const resetQuiz = (questions) => {
    const selected = questions.slice(0, 5);
    setVisibleQuestions(selected);
    setUserAnswers({});
    setSubmitted(false);
    setScore(0);
    setError(null);
  };

  const normalizeAnswer = (value) => {
    if (value === true || value === "true" || value === "True") return "True";
    if (value === false || value === "false" || value === "False")
      return "False";
    return String(value || "");
  };

  const handleSelect = (questionIdx, answer) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionIdx]: answer,
    }));
  };

  const handleSubmit = () => {
    let calculatedScore = 0;

    visibleQuestions.forEach((q, idx) => {
      const userAnswer = userAnswers[idx];
      const correctAnswer = normalizeAnswer(q.answer);

      if (userAnswer === correctAnswer) {
        calculatedScore += 1;
      }
    });

    setScore(calculatedScore);
    setSubmitted(true);
  };

  const regenerateTrueFalseQuiz = async () => {
    if (!book || chapterNumber == null) return;

    setError(null);

    try {
      setLoadingNewQuiz(true);

      const res = await axios.post(
        `${API_BASE}/api/quiz/true-false/chapter?book=${encodeURIComponent(
          book
        )}&chapter_number=${chapterNumber}`
      );

      setGenerationTime(res.data.generation_time || null);
      resetQuiz(res.data.questions || []);
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to regenerate True/False quiz.";
      setError(detail);
    } finally {
      setLoadingNewQuiz(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">✅ True/False Quiz</h2>
          <p className="text-sm text-gray-500">
            3 False + 2 True • Local Ollama polishing with backend answer safety
            {generationTime && ` • Generation Time: ${generationTime}s`}
          </p>
        </div>

        <button
          onClick={regenerateTrueFalseQuiz}
          disabled={loadingNewQuiz}
          className="bg-purple-600 text-white px-4 py-1 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {loadingNewQuiz ? "Loading..." : "Generate New True/False"}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">⚠️ {error}</p>}

      <ul className="space-y-6">
        {visibleQuestions.map((q, idx) => {
          const correctAnswer = normalizeAnswer(q.answer);
          const userAnswer = userAnswers[idx];
          const isCorrect = submitted && userAnswer === correctAnswer;

          return (
            <li
              key={idx}
              className={`bg-gray-50 p-4 rounded border ${
                submitted
                  ? isCorrect
                    ? "border-green-500"
                    : "border-red-500"
                  : "border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-medium">
                  Q{idx + 1} ({q.difficulty || "Medium"}):{" "}
                  {q.question || q.statement}
                </p>

                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  True/False
                </span>
              </div>

              <div className="flex gap-3 mt-3">
                {["True", "False"].map((option) => (
                  <label
                    key={option}
                    className={`inline-flex items-center px-4 py-2 border rounded cursor-pointer ${
                      userAnswer === option
                        ? "bg-purple-100 border-purple-500"
                        : "bg-white border-gray-300"
                    } ${submitted ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`tf-question-${idx}`}
                      value={option}
                      disabled={submitted}
                      checked={userAnswer === option}
                      onChange={() => handleSelect(idx, option)}
                      className="mr-2"
                    />
                    {option}
                  </label>
                ))}
              </div>

              {submitted && (
                <div
                  className={`mt-3 text-sm font-semibold ${
                    isCorrect ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isCorrect ? "✅ Correct" : "❌ Wrong"}

                  <div className="text-gray-700 font-normal mt-1">
                    Answer: {correctAnswer}
                  </div>

                  {q.explanation && (
                    <div className="text-gray-700 font-normal mt-1">
                      Explanation: {q.explanation}
                    </div>
                  )}

                  {q.polish_safety && (
                    <div className="text-xs text-gray-500 mt-1">
                      Safety: {q.polish_safety}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={visibleQuestions.length === 0}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Submit
        </button>
      ) : (
        <div className="mt-6 text-lg font-bold text-purple-700">
          🎯 Your Score: {score} / {visibleQuestions.length}
        </div>
      )}
    </div>
  );
}
