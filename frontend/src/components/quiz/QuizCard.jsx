import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import QuizCard from "../components/QuizCard";

export default function QuizPage() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  const [timer, setTimer] = useState(30);
  const maxTimer = 30;

  // =========================
  // LOAD NOTES
  // =========================
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const res = await axiosClient.get("/notes");
        setNotes(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    loadNotes();
  }, []);

  // =========================
  // TIMER
  // =========================
  useEffect(() => {
    if (showAnswer) return;

    if (timer === 0) {
      setShowAnswer(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, showAnswer]);

  // =========================
  // GENERATE QUIZ
  // =========================
  const generateQuiz = async () => {
    if (!selectedNote) return;

    try {
      setLoading(true);

      const res = await axiosClient.post("/ai/quiz", {
        note_id: selectedNote,
        count: 5,
        difficulty: "easy",
      });

      setQuiz(res.data.questions || []);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setTimer(maxTimer);
    } catch (err) {
      console.error(err);
      alert("Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SELECT ANSWER
  // =========================
  const handleSelect = (option) => {
    if (showAnswer) return;
    setSelectedAnswer(option);
    setShowAnswer(true);
  };

  // =========================
  // NEXT QUESTION
  // =========================
  const handleNext = () => {
    if (currentIndex + 1 >= quiz.length) {
      alert("Quiz finished 🎉");
      return;
    }

    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setTimer(maxTimer);
  };

  // =========================
  // HINT
  // =========================
  const handleHint = async (q) => {
    try {
      const res = await axiosClient.post("/ai/chat", {
        prompt: `Give a short hint for this question: ${q.question}`,
      });

      alert(res.data.answer || "No hint");
    } catch (err) {
      alert("Hint failed");
    }
  };

  // =========================
  // EXPLAIN
  // =========================
  const handleExplain = async (q) => {
    try {
      const res = await axiosClient.post("/ai/chat", {
        prompt: `Explain the correct answer for: ${q.question}`,
      });

      alert(res.data.answer || "No explanation");
    } catch (err) {
      alert("Explain failed");
    }
  };

  // =========================
  // UI BEFORE QUIZ
  // =========================
  if (quiz.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold mb-4">Generate Quiz</h1>

          <select
            value={selectedNote}
            onChange={(e) => setSelectedNote(e.target.value)}
            className="w-full p-3 border rounded mb-4"
          >
            <option value="">Select Note</option>
            {notes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>

          <button
            onClick={generateQuiz}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            Generate Quiz
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz[currentIndex];

  // =========================
  // QUIZ UI
  // =========================
  return (
    <QuizCard
      question={currentQuestion}
      questionNumber={currentIndex + 1}
      totalQuestions={quiz.length}
      selectedAnswer={selectedAnswer}
      showAnswer={showAnswer}
      timer={timer}
      maxTimer={maxTimer}
      onAnswerSelect={handleSelect}
      onNextQuestion={handleNext}
      difficulty="easy"
      onHint={handleHint}
      onExplain={handleExplain}
    />
  );
}