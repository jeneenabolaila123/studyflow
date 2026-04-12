import { useRef, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient.js';
import Spinner from './ui/Spinner.jsx';
import confetti from "canvas-confetti";

function normalizeQuestions(payload) {
  if (!payload) return [];

  // إذا MCQ
  if (Array.isArray(payload) && typeof payload[0] === 'object') {
    return payload
      .map((q) => {
        if (!q || typeof q !== 'object') return null;

        const question = typeof q.question === 'string' ? q.question : '';
        const topic = typeof q.topic === 'string' ? q.topic : '';

        const options = Array.isArray(q.options)
          ? q.options.map((o) => String(o)).filter(Boolean)
          : [];

        let answer = typeof q.answer === 'string' ? q.answer : '';
        if (!answer && Number.isInteger(q.correct_index) && options[q.correct_index]) {
          answer = String(options[q.correct_index]);
        }

        const correctIndex = Number.isInteger(q.correct_index)
          ? q.correct_index
          : (answer && options.length === 4 ? options.indexOf(answer) : null);

        return {
          topic: topic || 'General',
          question,
          options,
          answer,
          correct_index: correctIndex,
        };
      })
      .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length);
  }

  // fallback text
  if (Array.isArray(payload)) return payload.map(String).filter(Boolean);

  if (typeof payload === 'string') {
    return payload
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  return [];
}

export default function QuizPanel({ noteId }) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');

  const resultsRef = useRef([]);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [time, setTime] = useState(10);

  // ⏱️ TIMER
  useEffect(() => {
    if (!questions.length || finished) return;

    const timer = setInterval(() => {
      setTime((t) => {
        if (t === 1) {
          setCurrent((c) => {
            if (c + 1 < questions.length) return c + 1;
            setFinished(true);
            return c;
          });
          return 10;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [current, questions, finished]);

  // 🎉 CONFETTI
  useEffect(() => {
    if (finished) {
      confetti({
        particleCount: 120,
        spread: 70,
      });
    }
  }, [finished]);

  const generate = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await axiosClient.post('/ai/quiz', {
        note_id: Number(noteId),
      });

      const q = res.data?.data?.questions ?? res.data?.questions;
      const normalized = normalizeQuestions(q);

      setQuestions(normalized);

      resultsRef.current = [];

      // reset
      setCurrent(0);
      setSelected(null);
      setScore(0);
      setFinished(false);
      setTime(10);

    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* HEADER */}
      <div className="sectionHeader">
        <div>
          <div className="eyebrow">AI quiz</div>
          <h3 className="sectionTitle">Generate quick revision questions</h3>
        </div>
        <span className="pill">/ai/quiz</span>
      </div>

      {/* BUTTON */}
      <button className="button buttonAccent" onClick={generate} disabled={loading}>
        {loading ? 'Generating quiz…' : questions.length ? 'Regenerate quiz' : 'Generate quiz'}
      </button>

      {error ? <div className="errorBox">{error}</div> : null}

      {/* LOADING */}
      {loading && (
        <div className="thinkingCard">
          <div className="thinkingPulse" />
          <div>
            <div className="thinkingTitle">Building quiz questions</div>
            <div className="muted">Reading the study material...</div>
          </div>
        </div>
      )}

      {/* ================= QUIZ ================= */}
      {questions.length ? (
        typeof questions[0] === 'object' ? (
          finished ? (
            <div className="text-center">
              <h2>🎉 Quiz Finished</h2>
              <p>Score: {score} / {questions.length}</p>
            </div>
          ) : (
            <div>

              {/* progress */}
              <div className="w-full bg-gray-700 h-2 rounded mb-3">
                <div
                  className="bg-blue-500 h-2 rounded"
                  style={{
                    width: `${((current + 1) / questions.length) * 100}%`
                  }}
                />
              </div>

              <h3>
                Question {current + 1} / {questions.length}
              </h3>

              {/* timer */}
              <div className="text-sm text-gray-400 mb-2">
                ⏱️ {time}s
              </div>

              <p>{questions[current].question}</p>

              <div className="flex flex-col gap-2 mt-3">
                {questions[current].options.map((opt, i) => {
                  const isCorrect = opt === questions[current].answer;
                  const isSelected = opt === selected;

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        setSelected(opt);

                        if (isCorrect) setScore(score + 1);

                        resultsRef.current.push({
                          topic: questions[current].topic || 'General',
                          selected_answer: opt,
                          correct_answer: questions[current].answer,
                        });

                        setTimeout(() => {
                          if (current + 1 < questions.length) {
                            setCurrent(current + 1);
                            setSelected(null);
                            setTime(10);
                          } else {
                            setFinished(true);

                            axiosClient
                              .post('/quiz-results', { results: resultsRef.current })
                              .catch(() => {});
                          }
                        }, 700);
                      }}
                      className={`p-2 rounded ${
                        selected
                          ? isCorrect
                            ? "bg-green-500"
                            : isSelected
                            ? "bg-red-500"
                            : "bg-gray-700"
                          : "bg-gray-800"
                      }`}
                      disabled={!!selected}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        ) : (
          // fallback text
          <ol className="quizList">
            {questions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ol>
        )
      ) : (
        <div className="muted">
          Generate a quiz first
        </div>
      )}

      {/* FOOTER */}
      {questions.length && (
        <div className="muted">
          <span>Score: {score}</span>
        </div>
      )}

    </section>
  );
}