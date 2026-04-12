import { useState } from "react";
import QuestionEditorDialog from "../components/QuestionEditorDialog";

export default function QuizTab() {
  const [questions, setQuestions] = useState([]);
  const [showEditor, setShowEditor] = useState(false);

  const handleSaveQuestion = (newQuestion) => {
    setQuestions((prev) => [...prev, newQuestion]);
    setShowEditor(false);
  };

  return (
    <div>
      <button onClick={() => setShowEditor(true)}>Add Question</button>

      <QuestionEditorDialog
        open={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={handleSaveQuestion}
      />
    </div>
  );
}