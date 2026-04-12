import { useState } from "react";
import QuestionCard from "../components/QuestionCard";

export default function RevisionTab({
  answerEvaluator,
  revisionAI,
}) {
  const [revisionCards, setRevisionCards] = useState([]);
  const [loading, setLoading] = useState(false);

  const addWrongQuestion = async (question) => {
    setLoading(true);

    try {
      let revised = question;

      if (revisionAI?.generateRevisionQuestion) {
        revised = await revisionAI.generateRevisionQuestion(question);
      }

      setRevisionCards((prev) => [
        ...prev,
        {
          ...revised,
          question_number: prev.length + 1,
        },
      ]);
    } catch (error) {
      setRevisionCards((prev) => [
        ...prev,
        {
          ...question,
          question_number: prev.length + 1,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-4 text-2xl font-bold">Revision</h2>

      <div className="flex-1 overflow-y-auto rounded-2xl border bg-white p-4">
        {loading && (
          <div className="mb-4 rounded-xl bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-700">
            ⚡ Generating revision question...
          </div>
        )}

        {revisionCards.length === 0 && !loading ? (
          <div className="text-gray-500">No revision questions yet.</div>
        ) : (
          <div className="space-y-4">
            {revisionCards.map((question, index) => (
              <QuestionCard
                key={index}
                question={question}
                questionNumber={index + 1}
                answerEvaluator={answerEvaluator}
                flashcardAI={null}
                onWrongAnswer={addWrongQuestion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}