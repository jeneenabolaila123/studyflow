import { useState } from "react";

export default function QuestionCard({
  question,
  questionNumber,
  answerEvaluator,
  flashcardAI,
  onWrongAnswer,
}) {
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loadingHint, setLoadingHint] = useState(false);
  const [loadingExplain, setLoadingExplain] = useState(false);

  const questionText =
    question?.question_text ??
    question?.question ??
    question?.questionText ??
    "";

  const options = Array.isArray(question?.options)
    ? question.options
    : Array.isArray(question?.choices)
      ? question.choices
      : [];

  const expectedAnswerText =
    typeof question?.answer === "string" ? question.answer : "";

  const correctIndexRaw =
    question?.correct_answer_index ??
    question?.correct_index ??
    question?.correctIndex;

  const correctIndex = Number.isInteger(correctIndexRaw)
    ? correctIndexRaw
    : expectedAnswerText && options.length
      ? options.findIndex((o) => String(o) === expectedAnswerText)
      : -1;

  const handleCheck = () => {
    if (answered) return;

    if (selected === null) {
      setFeedback("Select an answer");
      return;
    }

    const selectedText = options[selected] ?? "";

    const correct = Number.isInteger(correctIndex) && correctIndex >= 0
      ? selected === correctIndex
      : expectedAnswerText
        ? String(selectedText) === String(expectedAnswerText)
        : false;

    setAnswered(true);

    if (correct) {
      setFeedback("✅ Correct");
    } else {
      setFeedback("❌ Wrong");
      onWrongAnswer?.(question);
    }
  };

  const handleHint = async () => {
    if (!answerEvaluator) return;

    setLoadingHint(true);

    try {
      const hint = await answerEvaluator.generateHint({
        question: String(questionText).slice(0, 150),
        type: question?.question_type ?? question?.type ?? "multiple_choice",
        options,
      });

      alert(hint || "No hint");
    } catch {
      alert("Error getting hint");
    }

    setLoadingHint(false);
  };

  const handleExplain = async () => {
    if (!flashcardAI) return;

    setLoadingExplain(true);

    try {
      const correctText =
        correctIndex >= 0 && options[correctIndex]
          ? options[correctIndex]
          : expectedAnswerText;

      const explanation = await flashcardAI.explainAnswer(
        String(questionText).slice(0, 150),
        String(correctText || "")
      );

      alert(explanation || "No explanation");
    } catch {
      alert("Error getting explanation");
    }

    setLoadingExplain(false);
  };

  const reset = () => {
    setSelected(null);
    setAnswered(false);
    setFeedback("");
  };

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      {/* Title */}
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Question {questionNumber}
      </h3>

      {/* Question */}
      <p className="mb-4 text-gray-800">{questionText}</p>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt, i) => (
          <label
            key={i}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 ${
              selected === i ? "border-blue-500 bg-blue-50" : "border-gray-200"
            } ${answered ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name={`q-${questionNumber}`}
              disabled={answered}
              checked={selected === i}
              onChange={() => setSelected(i)}
            />
            <span>
              {String.fromCharCode(65 + i)}) {opt}
            </span>
          </label>
        ))}
      </div>

      {/* Buttons */}
      <div className="mt-4 flex gap-3">
        <button
          onClick={handleCheck}
          disabled={answered}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          Check
        </button>

        <button
          onClick={handleHint}
          disabled={loadingHint}
          className="rounded-xl bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
        >
          {loadingHint ? "⏳..." : "💡 Hint"}
        </button>

        <button
          onClick={handleExplain}
          disabled={loadingExplain}
          className="rounded-xl bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          {loadingExplain ? "⏳..." : "Explain"}
        </button>

        <button
          onClick={reset}
          className="rounded-xl bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
        >
          Reset
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <p className="mt-3 font-medium text-gray-900">{feedback}</p>
      )}
    </div>
  );
}