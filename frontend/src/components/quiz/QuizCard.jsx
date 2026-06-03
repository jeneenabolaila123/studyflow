import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import QuizCard from "../components/QuizCard";
import { uploadPdfToRag, generateRagMcq } from "../services/ollamaPdfRagApi";
import QuizCard from "../components/quiz/QuizCard";
export default function QuizPage() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfId, setPdfId] = useState("");

  const [quiz, setQuiz] = useState([]);
  const [rawQuiz, setRawQuiz] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  const [timer, setTimer] = useState(30);
  const maxTimer = 30;

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

  useEffect(() => {
    if (quiz.length === 0) return;
    if (showAnswer) return;

    if (timer === 0) {
      setShowAnswer(true);
      return;
    }

    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, showAnswer, quiz.length]);

  const parseMcqText = (text) => {
    if (!text) return [];

    const blocks = text
      .split(/(?=Q\d+\s*\()/i)
      .map((b) => b.trim())
      .filter(Boolean);

    return blocks.map((block, index) => {
      const questionMatch = block.match(/Q\d+\s*\((.*?)\):\s*([\s\S]*?)(?=\nA\.)/i);
      const difficulty = questionMatch?.[1]?.trim() || (index < 3 ? "Hard" : "Medium");
      const questionText = questionMatch?.[2]?.trim() || "";

      const optionA = block.match(/\nA\.\s*(.*)/i)?.[1]?.trim() || "";
      const optionB = block.match(/\nB\.\s*(.*)/i)?.[1]?.trim() || "";
      const optionC = block.match(/\nC\.\s*(.*)/i)?.[1]?.trim() || "";
      const optionD = block.match(/\nD\.\s*(.*)/i)?.[1]?.trim() || "";

      const correctAnswer =
        block.match(/Correct answer:\s*([A-D])/i)?.[1]?.trim().toUpperCase() || "";

      const explanation =
        block.match(/Explanation:\s*([\s\S]*)/i)?.[1]?.trim() || "";

      return {
        id: index + 1,
        difficulty,
        question: questionText,
        options: {
          A: optionA,
          B: optionB,
          C: optionC,
          D: optionD,
        },
        correct_answer: correctAnswer,
        correctAnswer,
        explanation,
      };
    });
  };

  const handleUploadPdf = async () => {
    if (!selectedFile) {
      alert("Please select a PDF first");
      return;
    }

    try {
      setLoading(true);

      const data = await uploadPdfToRag(selectedFile);
      setPdfId(data.pdf_id);

      alert("PDF uploaded successfully");
    } catch (error) {
      console.error(error);
      alert(error.message || "PDF upload failed");
    } finally {
      setLoading(false);
    }
  };

  const generatePdfQuiz = async () => {
    if (!pdfId) {
      alert("Please upload a PDF first");
      return;
    }

    try {
      setLoading(true);

      const data = await generateRagMcq(pdfId);
      const quizText = data.quiz || "";

      setRawQuiz(quizText);

      const parsedQuestions = parseMcqText(quizText);
      setQuiz(parsedQuestions);

      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setTimer(maxTimer);
    } catch (error) {
      console.error(error);
      alert(error.message || "Quiz generation failed");
    } finally {
      setLoading(false);
    }
  };

  const generateQuizFromNote = async () => {
    if (!selectedNote) return;

    try {
      setLoading(true);

      const res = await axiosClient.post("/ai/quiz", {
        note_id: selectedNote,
        count: 5,
        difficulty: "easy",
      });

      setQuiz(res.data.questions || []);
      setRawQuiz("");

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

  const handleSelect = (option) => {
    if (showAnswer) return;
    setSelectedAnswer(option);
    setShowAnswer(true);
  };

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

  const handleExplain = async (q) => {
    try {
      const res = await axiosClient.post("/ai/chat", {
        prompt: `Explain the correct answer for: ${q.question}`,
      });

      alert(res.data.answer || q.explanation || "No explanation");
    } catch (err) {
      alert(q.explanation || "Explain failed");
    }
  };

  if (quiz.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold mb-4">Generate Quiz</h1>

          <div className="mb-6 rounded-xl border p-4">
            <h2 className="mb-3 text-lg font-semibold">Generate from PDF</h2>

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="mb-3 w-full rounded border p-3"
            />

            <div className="flex gap-3">
              <button
                onClick={handleUploadPdf}
                disabled={!selectedFile || loading}
                className="rounded bg-gray-800 px-5 py-2 text-white disabled:opacity-50"
              >
                Upload PDF
              </button>

              <button
                onClick={generatePdfQuiz}
                disabled={!pdfId || loading}
                className="rounded bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
              >
                Generate PDF Quiz
              </button>
            </div>

            {pdfId && (
              <p className="mt-3 text-sm text-green-700">
                PDF uploaded. Ready to generate quiz.
              </p>
            )}
          </div>

          <div className="rounded-xl border p-4">
            <h2 className="mb-3 text-lg font-semibold">Generate from Saved Note</h2>

            <select
              value={selectedNote}
              onChange={(e) => setSelectedNote(e.target.value)}
              className="mb-4 w-full rounded border p-3"
            >
              <option value="">Select Note</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>

            <button
              onClick={generateQuizFromNote}
              disabled={!selectedNote || loading}
              className="rounded bg-blue-600 px-6 py-2 text-white disabled:opacity-50"
            >
              Generate Quiz
            </button>
          </div>

          {loading && (
            <p className="mt-4 text-blue-700">
              Processing... this may take a few minutes.
            </p>
          )}

          {rawQuiz && (
            <pre className="mt-4 whitespace-pre-wrap rounded bg-gray-100 p-4 text-sm">
              {rawQuiz}
            </pre>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = quiz[currentIndex];

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
      difficulty={currentQuestion?.difficulty || "easy"}
      onHint={handleHint}
      onExplain={handleExplain}
    />
  );
}