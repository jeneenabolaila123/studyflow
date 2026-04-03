import React, { useState, useEffect, useRef } from "react";
import axiosClient from "../api/axiosClient";

const TOTAL = 10;

export default function QuizPage() {
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [nextQuestionData, setNextQuestionData] = useState(null);

    const historyRef = useRef([]);
    const answersRef = useRef([]);

    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [count, setCount] = useState(1);
    const [finished, setFinished] = useState(false);
    const [noteId, setNoteId] = useState(null);

    // RESET AI
    useEffect(() => {
        axiosClient.post("/ai/reset");
    }, []);

    // LOAD NOTE
    useEffect(() => {
        const init = async () => {
            try {
                const res = await axiosClient.get("/notes");
                const notes = res.data?.data || [];

                if (!notes.length) {
                    setError("No notes found.");
                    return;
                }

                setNoteId(notes[0].id);
            } catch {
                setError("Failed to load notes.");
            }
        };

        init();
    }, []);

    // FETCH QUESTION
    const fetchBetterQuestion = async () => {
        try {
            const [q1, q2] = await Promise.all([
                axiosClient.post("/ai/generate-one", { note_id: noteId }),
                axiosClient.post("/ai/generate-one", { note_id: noteId }),
            ]);

            const question1 = q1.data?.question;
            const question2 = q2.data?.question;

            if (!question1) return question2;
            if (!question2) return question1;

            return question1.length > question2.length ? question1 : question2;
        } catch {
            return null;
        }
    };

    // INITIAL LOAD
    useEffect(() => {
        if (!noteId) return;

        const init = async () => {
            setLoading(true);

            const first = await fetchBetterQuestion();
            const second = await fetchBetterQuestion();

            if (!first) {
                setError("AI failed");
                setLoading(false);
                return;
            }

            setCurrentQuestion(first);
            setNextQuestionData(second);

            historyRef.current = [first];

            setLoading(false);
        };

        init();
    }, [noteId]);

    // NEXT QUESTION
    const nextQuestion = async () => {
        if (!answer.trim()) return;

        answersRef.current.push({
            question: currentQuestion,
            answer: answer,
        });

        if (count >= TOTAL) {
            setFinished(true);
            console.log("ALL ANSWERS:", answersRef.current);
            return;
        }

        if (!nextQuestionData) {
            setError("Loading next...");
            return;
        }

        const newCurrent = nextQuestionData;

        setCurrentQuestion(newCurrent);
        setCount((c) => c + 1);

        historyRef.current.push(newCurrent);

        setAnswer("");

        fetchBetterQuestion().then((q) => {
            if (q) setNextQuestionData(q);
        });
    };

    // UI
    if (error) return <p>{error}</p>;

    if (finished) {
        return (
            <div style={{ textAlign: "center" }}>
                <h2>Finished 🎉</h2>
                <p>Total Questions: {TOTAL}</p>

                <button onClick={() => console.log(answersRef.current)}>
                    Show Answers
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 600, margin: "auto" }}>
            <h2>Question {count}</h2>

            {loading && <p>AI thinking...</p>}

            <p>{currentQuestion}</p>

            <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                style={{ width: "100%", minHeight: 80 }}
            />

            <br />

            <button onClick={nextQuestion}>Next</button>
        </div>
    );
}
