import React, { useEffect, useMemo, useState } from "react";

const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True/False",
  SHORT_ANSWER: "Short Answer",
};

export default function QuestionEditorDialog({
  open = true,
  existingQuestion = null,
  onClose,
  onSave,
}) {
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState(QUESTION_TYPES.MULTIPLE_CHOICE);
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [trueFalseAnswer, setTrueFalseAnswer] = useState("True");
  const [shortAnswer, setShortAnswer] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!existingQuestion) {
      setQuestionText("");
      setQuestionType(QUESTION_TYPES.MULTIPLE_CHOICE);
      setOptions(["", "", "", ""]);
      setCorrectAnswer("A");
      setTrueFalseAnswer("True");
      setShortAnswer("");
      setError("");
      return;
    }

    const type = existingQuestion.question_type || existingQuestion.type || QUESTION_TYPES.MULTIPLE_CHOICE;
    const text = existingQuestion.question_text || existingQuestion.text || "";
    const existingOptions = existingQuestion.options || [];
    const correctIndex =
      typeof existingQuestion.correct_index === "number"
        ? existingQuestion.correct_index
        : 0;

    setQuestionText(text);
    setQuestionType(type);

    if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
      const normalized = [
        existingOptions[0] || "",
        existingOptions[1] || "",
        existingOptions[2] || "",
        existingOptions[3] || "",
      ];
      setOptions(normalized);
      setCorrectAnswer(String.fromCharCode(65 + Math.min(correctIndex, 3)));
    } else if (type === QUESTION_TYPES.TRUE_FALSE) {
      setTrueFalseAnswer(correctIndex === 1 ? "False" : "True");
    } else if (type === QUESTION_TYPES.SHORT_ANSWER) {
      setShortAnswer(existingOptions[0] || "");
    }

    setError("");
  }, [existingQuestion, open]);

  const charCount = questionText.trim().length;

  const isValid = useMemo(() => {
    const text = questionText.trim();

    if (text.length < 5 || text.length > 500) return false;

    if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
      const filled = options.filter((opt) => opt.trim() !== "");
      if (filled.length !== 4) return false;
    }

    if (questionType === QUESTION_TYPES.SHORT_ANSWER) {
      if (!shortAnswer.trim()) return false;
    }

    return true;
  }, [questionText, questionType, options, shortAnswer]);

  const handleOptionChange = (index, value) => {
    setOptions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const buildQuestion = () => {
    const text = questionText.trim();

    if (questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
      const finalOptions = options.map((o) => o.trim());
      const filled = finalOptions.filter(Boolean);

      if (filled.length !== 4) {
        throw new Error("Need exactly 4 options");
      }

      let correctIndex = correctAnswer.charCodeAt(0) - 65;
      if (correctIndex < 0 || correctIndex > 3) correctIndex = 0;

      return {
        question_text: text,
        options: finalOptions,
        correct_index: correctIndex,
        question_type: QUESTION_TYPES.MULTIPLE_CHOICE,
      };
    }

    if (questionType === QUESTION_TYPES.TRUE_FALSE) {
      return {
        question_text: text,
        options: ["True", "False"],
        correct_index: trueFalseAnswer === "False" ? 1 : 0,
        question_type: QUESTION_TYPES.TRUE_FALSE,
      };
    }

    if (!shortAnswer.trim()) {
      throw new Error("Answer required");
    }

    return {
      question_text: text,
      options: [shortAnswer.trim()],
      correct_index: 0,
      question_type: QUESTION_TYPES.SHORT_ANSWER,
    };
  };

  const handleSave = () => {
    try {
      const result = buildQuestion();
      setError("");
      onSave?.(result);
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {existingQuestion ? "Edit Question" : "Add New Question"}
          </h2>
        </div>

        <div className="max-h-[85vh] overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Question:
            </label>

            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="Enter question..."
            />

            <div className="mt-2 text-right text-sm">
              <span className={charCount > 500 ? "text-red-500" : "text-gray-500"}>
                {charCount}/500
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Type:
            </label>

            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value={QUESTION_TYPES.MULTIPLE_CHOICE}>Multiple Choice</option>
              <option value={QUESTION_TYPES.TRUE_FALSE}>True/False</option>
              <option value={QUESTION_TYPES.SHORT_ANSWER}>Short Answer</option>
            </select>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4">
            <h3 className="mb-4 text-base font-semibold text-gray-800">Options</h3>

            {questionType === QUESTION_TYPES.MULTIPLE_CHOICE && (
              <div className="space-y-4">
                {["A", "B", "C", "D"].map((label, index) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="w-8 text-sm font-medium text-gray-700">
                      {label})
                    </span>
                    <input
                      type="text"
                      value={options[index]}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder={`Option ${label}`}
                    />
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Correct:
                  </label>
                  <select
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </div>
            )}

            {questionType === QUESTION_TYPES.TRUE_FALSE && (
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="tf-answer"
                    value="True"
                    checked={trueFalseAnswer === "True"}
                    onChange={(e) => setTrueFalseAnswer(e.target.value)}
                  />
                  <span className="text-gray-700">True</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="tf-answer"
                    value="False"
                    checked={trueFalseAnswer === "False"}
                    onChange={(e) => setTrueFalseAnswer(e.target.value)}
                  />
                  <span className="text-gray-700">False</span>
                </label>
              </div>
            )}

            {questionType === QUESTION_TYPES.SHORT_ANSWER && (
              <input
                type="text"
                value={shortAnswer}
                onChange={(e) => setShortAnswer(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                placeholder="Enter short answer..."
              />
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className={`rounded-xl px-5 py-2.5 text-white transition ${
              isValid
                ? "bg-blue-600 hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-400"
            }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}