import { useMemo, useState } from "react";

export default function DocumentViewerPage() {
  const [text, setText] = useState("");

  const wordCount = useMemo(() => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [text]);

  const handleLoadDocument = () => {
    const sampleText =
      "Flowers are the reproductive structures of flowering plants. They are often colorful and attract pollinators such as bees and butterflies.";
    setText(sampleText);
  };

  const handleGenerateQuiz = () => {
    alert("Generate Quiz clicked");
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Viewer</h1>
            <p className="mt-2 text-gray-600">Analyze your document</p>
          </div>

          <div className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
            {wordCount} words
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Document Content</h2>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-gray-300 p-4 text-gray-900 outline-none focus:border-blue-500"
            placeholder="Document text will appear here..."
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handleLoadDocument}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 hover:bg-gray-100"
          >
            Load Document
          </button>

          <button
            onClick={handleGenerateQuiz}
            disabled={!text.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Generate Quiz
          </button>
        </div>
      </div>
    </div>
  );
}