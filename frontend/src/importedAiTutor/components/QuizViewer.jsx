import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_AI_TUTOR_URL || import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getQuestionText(question) {
  return question.question || question.question_text || "";
}

function getCorrectAnswer(question) {
  return (
    question.answer || question.answer_text || question.correct_answer || ""
  );
}

function getQuestionType(question, quizMode) {
  const rawType = String(
    question.type || question.question_type || quizMode || ""
  ).toLowerCase();

  if (
    rawType.includes("fill") ||
    rawType.includes("blank") ||
    String(question.question || "").includes("________")
  ) {
    return "fill_blank";
  }

  if (rawType.includes("mcq") || question.options?.length) {
    return "mcq";
  }

  return rawType || "written";
}

function getOptions(question) {
  if (Array.isArray(question.options) && question.options.length) {
    return question.options;
  }

  const optionList = [
    question.option_a,
    question.option_b,
    question.option_c,
    question.option_d,
  ].filter(Boolean);

  return optionList;
}

function isFillBlankCorrect(userAnswer, question) {
  const user = normalizeAnswer(userAnswer);

  const acceptedAnswers = [
    question.answer,
    question.answer_text,
    ...(question.accepted_answers || []),
  ]
    .filter(Boolean)
    .map(normalizeAnswer);

  return acceptedAnswers.includes(user);
}

function isNormalAnswerCorrect(userAnswer, question) {
  const user = normalizeAnswer(userAnswer);
  const correct = normalizeAnswer(getCorrectAnswer(question));
  return Boolean(user && correct && user === correct);
}

export default function QuizViewer({
  quiz,
  chapterNumber,
  book,
  quizType,
  onQuizGenerated,
}) {
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [loadingNewQuiz, setLoadingNewQuiz] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timer;
    if (loadingNewQuiz) {
      setElapsedTime(0);
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(timer);
  }, [loadingNewQuiz]);

  const detectedQuizMode = useMemo(() => {
    const mode = String(
      quiz?.quiz_mode || quiz?.model || quizType || ""
    ).toLowerCase();

    if (mode.includes("fill") || mode.includes("blank")) {
      return "fill_blank";
    }

    const firstQuestion = quiz?.questions?.[0];
    if (firstQuestion) {
      return getQuestionType(firstQuestion, mode);
    }

    return quizType || "mcq";
  }, [quiz, quizType]);

  const isFillBlankQuiz = detectedQuizMode === "fill_blank";

  useEffect(() => {
    if (quiz?.questions?.length) {
      pickRandomFive(quiz.questions);
    }
  }, [quiz]);

  const pickRandomFive = (allQuestions) => {
    const selected =
      allQuestions.length <= 5
        ? [...allQuestions]
        : [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);

    setVisibleQuestions(selected);
    setUserAnswers({});
    setSubmitted(false);
    setScore(0);
    setError(null);
  };

  const handleAnswerChange = (questionIdx, value) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionIdx]: value,
    }));
  };

  const checkAnswer = (question, index) => {
    const userAnswer = userAnswers[index] || "";
    const type = getQuestionType(question, detectedQuizMode);

    if (type === "fill_blank") {
      return isFillBlankCorrect(userAnswer, question);
    }

    return isNormalAnswerCorrect(userAnswer, question);
  };

  const handleSubmit = () => {
    setSubmitting(true);

    let calculatedScore = 0;

    visibleQuestions.forEach((question, index) => {
      if (checkAnswer(question, index)) {
        calculatedScore += 1;
      }
    });

    setScore(calculatedScore);
    setSubmitted(true);
    setSubmitting(false);
  };

  const regenerateQuiz = async () => {
    if (!book || chapterNumber == null) return;

    setError(null);

    try {
      setLoadingNewQuiz(true);

      let url = `${API_BASE}/generate-quiz/?book=${encodeURIComponent(
        book
      )}&chapter_number=${chapterNumber}`;

      if (isFillBlankQuiz || quizType === "fill_blank") {
        url = `${API_BASE}/api/quiz/fill-blank/chapter?book=${encodeURIComponent(
          book
        )}&chapter_number=${chapterNumber}`;
      }

      const res = await axios.post(url);
      pickRandomFive(res.data.questions || []);

      if (onQuizGenerated) {
        onQuizGenerated(res.data);
      }
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to regenerate quiz.";
      setError(detail);
    } finally {
      setLoadingNewQuiz(false);
    }
  };

  if (!visibleQuestions.length) {
    return null;
  }

  return (
    <section className="mt-8 w-full">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isFillBlankQuiz
              ? "📝 Fill in the Blank Quiz"
              : "🧠 Generated Quiz"}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {isFillBlankQuiz
              ? "5 questions • Exam style • Backend answer safety"
              : "5 questions • Local quiz generation"}
          </p>
        </div>

        <button
          onClick={regenerateQuiz}
          disabled={loadingNewQuiz}
          className="rounded-lg bg-purple-600 px-5 py-2.5 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 min-w-[200px]"
        >
          {loadingNewQuiz
            ? `Generating... (${elapsedTime}s)`
            : isFillBlankQuiz
            ? "Generate New Fill in the Blank"
            : "Generate New Quiz"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          ⚠️ {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-gray-900">Exam Questions</h3>

          <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">
            {visibleQuestions.length} Questions
          </span>
        </div>

        <ul className="space-y-5">
          {visibleQuestions.map((question, index) => {
            const questionType = getQuestionType(question, detectedQuizMode);
            const options = getOptions(question);
            const userAnswer = userAnswers[index] || "";
            const correctAnswer = getCorrectAnswer(question);
            const isCorrect = submitted && checkAnswer(question, index);

            return (
              <li
                key={index}
                className={`rounded-xl border p-4 transition sm:p-5 ${
                  submitted
                    ? isCorrect
                      ? "border-green-400 bg-green-50"
                      : "border-red-400 bg-red-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-bold leading-relaxed text-gray-900">
                    Q{index + 1} ({question.difficulty || "Medium"}):{" "}
                    {getQuestionText(question)}
                  </p>

                  <span className="w-fit rounded-md bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                    {questionType === "fill_blank"
                      ? "Fill in the Blank"
                      : questionType.toUpperCase()}
                  </span>
                </div>

                {questionType === "fill_blank" ? (
                  <div className="mt-4">
                    <label className="block text-sm font-bold text-gray-700">
                      Your Answer
                    </label>

                    <input
                      type="text"
                      placeholder="Write your answer here..."
                      value={userAnswer}
                      disabled={submitted}
                      onChange={(e) =>
                        handleAnswerChange(index, e.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                    />
                  </div>
                ) : options.length ? (
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {options.map((option, optionIndex) => (
                      <li key={optionIndex}>
                        <label
                          className={`flex cursor-pointer items-center rounded-lg border bg-white px-4 py-3 text-sm font-medium transition ${
                            userAnswers[index] === option
                              ? "border-blue-500 ring-2 ring-blue-100"
                              : "border-gray-200 hover:border-blue-300"
                          } ${
                            submitted ? "cursor-not-allowed opacity-90" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={option}
                            disabled={submitted}
                            checked={userAnswers[index] === option}
                            onChange={() => handleAnswerChange(index, option)}
                            className="mr-3"
                          />
                          {option}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <textarea
                    rows={3}
                    placeholder="Type your answer here..."
                    value={userAnswer}
                    disabled={submitted}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    className="mt-3 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                  />
                )}

                {submitted && (
                  <div
                    className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                      isCorrect
                        ? "border-green-200 bg-green-100 text-green-800"
                        : "border-red-200 bg-red-100 text-red-800"
                    }`}
                  >
                    <p className="font-bold">
                      {isCorrect ? "✅ Correct" : "❌ Wrong"}
                    </p>

                    <p className="mt-2">
                      <span className="font-bold">Answer:</span> {correctAnswer}
                    </p>

                    {question.explanation && (
                      <p className="mt-2 leading-relaxed">
                        <span className="font-bold">Explanation:</span>{" "}
                        {question.explanation}
                      </p>
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
            disabled={submitting}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Answers"}
          </button>
        ) : (
          <div className="mt-6 rounded-xl bg-indigo-50 px-5 py-4 text-center text-xl font-extrabold text-indigo-700">
            🎯 Your Score: {score} / {visibleQuestions.length}
          </div>
        )}
      </div>
    </section>
  );
}
