import { useState } from "react";

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isAnswerCorrect(userAnswer, question) {
  const user = normalizeAnswer(userAnswer);

  const acceptedAnswers = [
    question.answer,
    ...(question.accepted_answers || []),
  ].map(normalizeAnswer);

  return acceptedAnswers.includes(user);
}

export default function FillBlankViewer({ quiz, onGenerateNew }) {
  const questions = quiz?.questions || [];

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswerChange = (index, value) => {
    setAnswers((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const score = questions.reduce((total, question, index) => {
    return total + (isAnswerCorrect(answers[index], question) ? 1 : 0);
  }, 0);

  if (!questions.length) {
    return null;
  }

  return (
    <section className="fill-blank-quiz">
      <div className="fill-blank-header">
        <div>
          <h2>✅ Fill in the Blank Quiz</h2>
          <p>5 questions • Local Ollama selection with backend answer safety</p>
        </div>

        {onGenerateNew && (
          <button className="generate-fill-btn" onClick={onGenerateNew}>
            Generate New Fill in the Blank
          </button>
        )}
      </div>

      <div className="fill-blank-exam-card">
        <div className="exam-title-row">
          <h3>Exam Style Questions</h3>
          <span>{questions.length} Questions</span>
        </div>

        {questions.map((question, index) => {
          const userAnswer = answers[index] || "";
          const correct = isAnswerCorrect(userAnswer, question);

          return (
            <div className="fill-question-card" key={index}>
              <div className="fill-question-top">
                <h4>
                  Q{index + 1} ({question.difficulty || "Medium"})
                </h4>
                <span>Fill in the Blank</span>
              </div>

              <p className="fill-question-text">{question.question}</p>

              <label className="fill-answer-label">
                Your Answer
                <input
                  type="text"
                  value={userAnswer}
                  disabled={submitted}
                  placeholder="Write your answer here..."
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                />
              </label>

              {submitted && (
                <div
                  className={
                    correct ? "fill-result correct" : "fill-result wrong"
                  }
                >
                  <strong>{correct ? "✅ Correct" : "❌ Wrong"}</strong>

                  <p>
                    <b>Answer:</b> {question.answer}
                  </p>

                  {question.explanation && (
                    <p>
                      <b>Explanation:</b> {question.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!submitted ? (
          <button className="submit-fill-btn" onClick={handleSubmit}>
            Submit Answers
          </button>
        ) : (
          <div className="fill-score-box">
            🎯 Your Score: {score} / {questions.length}
          </div>
        )}
      </div>
    </section>
  );
}
