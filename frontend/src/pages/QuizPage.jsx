import { useState } from "react";

export default function QuizPage() {
  const [pdfFile, setPdfFile] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [quiz, setQuiz] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});
  const [hasStartedAnswering, setHasStartedAnswering] = useState(false);

  const saveWrongAnswerForRecommendations = (question, selectedLabel, quizMeta) => {
    try {
      const key = "studyflow_wrong_answers";
      const oldItems = JSON.parse(localStorage.getItem(key) || "[]");

      const item = {
        file_name: quizMeta?.file_name || "",
        title: quizMeta?.title || "",
        difficulty: quizMeta?.difficulty || difficulty,
        question: question.question,
        options: question.options,
        selected_answer: selectedLabel,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        saved_at: new Date().toISOString(),
      };

      const exists = oldItems.some(
        (x) =>
          x.question === item.question &&
          x.file_name === item.file_name &&
          x.correct_answer === item.correct_answer
      );

      if (!exists) {
        const updated = [item, ...oldItems].slice(0, 100);
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {
      console.error("Failed to save wrong answer:", e);
    }
  };

  const handleAnswerSelect = (questionIndex, optionLabel) => {
    if (!quiz || !quiz.questions?.[questionIndex]) return;
    if (answers[questionIndex]) return;

    const question = quiz.questions[questionIndex];
    const isCorrect = optionLabel === question.correct_answer;

    setHasStartedAnswering(true);
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: {
        selected: optionLabel,
        isCorrect,
      },
    }));

    if (!isCorrect) {
      saveWrongAnswerForRecommendations(question, optionLabel, quiz);
    }
  };

  const getOptionStyle = (questionIndex, optionLabel) => {
    const answerState = answers[questionIndex];
    const question = quiz?.questions?.[questionIndex];

    const baseStyle = {
      width: "100%",
      textAlign: "left",
      padding: "12px 14px",
      borderRadius: "12px",
      border: "1px solid #d8cdf7",
      background: "#fff",
      color: "#222",
      fontSize: "15px",
      cursor: answerState ? "default" : "pointer",
      marginBottom: "10px",
      transition: "0.2s",
    };

    if (!answerState || !question) {
      return baseStyle;
    }

    const isSelected = answerState.selected === optionLabel;
    const isCorrect = question.correct_answer === optionLabel;

    if (isSelected && isCorrect) {
      return {
        ...baseStyle,
        background: "#e8f8ec",
        border: "1px solid #32a852",
        color: "#1f7a36",
        fontWeight: "bold",
      };
    }

    if (isSelected && !isCorrect) {
      return {
        ...baseStyle,
        background: "#fdeaea",
        border: "1px solid #d93025",
        color: "#b42318",
        fontWeight: "bold",
      };
    }

    if (answerState.selected && isCorrect) {
      return {
        ...baseStyle,
        background: "#e8f8ec",
        border: "1px solid #32a852",
        color: "#1f7a36",
        fontWeight: "bold",
      };
    }

    return {
      ...baseStyle,
      opacity: 0.92,
    };
  };

  const generateQuiz = async () => {
    try {
      setLoading(true);
      setError("");

      if (!pdfFile) {
        throw new Error("Please select a PDF file first.");
      }

      if (hasStartedAnswering) {
        throw new Error("You cannot generate more questions after starting to answer.");
      }

      if (allQuestions.length >= 10) {
        throw new Error("Maximum 10 questions reached.");
      }

      const remaining = 10 - allQuestions.length;
      const batchCount = Math.min(5, remaining);

      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("difficulty", difficulty);
      formData.append("count", String(batchCount));
      formData.append("existing_questions", JSON.stringify(allQuestions));

      const response = await fetch("http://127.0.0.1:8000/api/ai/quiz", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to generate quiz");
      }

      const newQuestions = data.data?.questions || [];
      const merged = [...allQuestions, ...newQuestions].slice(0, 10);

      setAllQuestions(merged);
      setQuiz({
        ...data.data,
        count: merged.length,
        questions: merged,
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetQuizState = (file) => {
    setPdfFile(file);
    setQuiz(null);
    setAllQuestions([]);
    setAnswers({});
    setHasStartedAnswering(false);
    setError("");
  };

  const canGenerateMore =
    pdfFile && !loading && !hasStartedAnswering && allQuestions.length < 10;

  const buttonLabel = loading
    ? "Generating..."
    : allQuestions.length === 0
      ? "Generate First 5"
      : allQuestions.length < 10
        ? "Generate 5 More"
        : "Max Reached";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f5ff",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginBottom: "10px", color: "#4b2aad" }}>
          Generate Quiz from PDF
        </h1>

        <p style={{ marginBottom: "25px", color: "#666" }}>
          Upload a PDF. First click generates 5 questions, second click generates 5 more. Maximum 10 questions before answering starts.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: "15px",
            marginBottom: "25px",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              PDF File
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => resetQuizState(e.target.files?.[0] || null)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                fontSize: "16px",
                background: "#fff",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={allQuestions.length > 0}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #ccc",
                fontSize: "16px",
                background: allQuestions.length > 0 ? "#f3f3f3" : "#fff",
              }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button
              onClick={generateQuiz}
              disabled={!canGenerateMore}
              style={{
                width: "100%",
                padding: "12px 18px",
                border: "none",
                borderRadius: "10px",
                background: canGenerateMore ? "#6c3bff" : "#999",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: canGenerateMore ? "pointer" : "not-allowed",
              }}
            >
              {buttonLabel}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#ffe6e6",
              color: "#b30000",
              padding: "12px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            style={{
              background: "#f3edff",
              color: "#5a31cc",
              padding: "14px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            AI is generating your quiz...
          </div>
        )}

        {quiz && (
          <div>
            <div
              style={{
                background: "#f7f3ff",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "20px",
              }}
            >
              <p><strong>File Name:</strong> {quiz.file_name}</p>
              <p><strong>Title:</strong> {quiz.title}</p>
              <p><strong>Difficulty:</strong> {quiz.difficulty}</p>
              <p><strong>Total Questions:</strong> {allQuestions.length} / 10</p>
            </div>

            {allQuestions.map((q, index) => {
              const answerState = answers[index];

              return (
                <div
                  key={index}
                  style={{
                    border: "1px solid #e3d9ff",
                    borderRadius: "14px",
                    padding: "20px",
                    marginBottom: "18px",
                    background: "#fff",
                  }}
                >
                  <h3 style={{ color: "#4b2aad", marginBottom: "10px" }}>
                    Question {index + 1}
                  </h3>

                  <p style={{ fontSize: "17px", fontWeight: "bold", marginBottom: "15px" }}>
                    {q.question}
                  </p>

                  <button onClick={() => handleAnswerSelect(index, "A")} style={getOptionStyle(index, "A")}>
                    <strong>A:</strong> {q.options?.A}
                  </button>

                  <button onClick={() => handleAnswerSelect(index, "B")} style={getOptionStyle(index, "B")}>
                    <strong>B:</strong> {q.options?.B}
                  </button>

                  <button onClick={() => handleAnswerSelect(index, "C")} style={getOptionStyle(index, "C")}>
                    <strong>C:</strong> {q.options?.C}
                  </button>

                  <button onClick={() => handleAnswerSelect(index, "D")} style={getOptionStyle(index, "D")}>
                    <strong>D:</strong> {q.options?.D}
                  </button>

                  {answerState && (
                    <div style={{ marginTop: "14px" }}>
                      <p
                        style={{
                          fontWeight: "bold",
                          color: answerState.isCorrect ? "#1f7a36" : "#b42318",
                          marginBottom: "8px",
                        }}
                      >
                        {answerState.isCorrect ? "Correct answer ✅" : "Wrong answer ❌"}
                      </p>

                      <p style={{ color: "#555" }}>
                        <strong>Explanation:</strong> {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}