import { useMemo } from "react";

export default function DocumentFrame({
  currentText = "",
  onLoadDocument,
  onGenerateQuiz,
  setCurrentDocumentText,
}) {
  const wordCount = useMemo(() => {
    if (!currentText.trim()) return 0;
    return currentText.trim().split(/\s+/).length;
  }, [currentText]);

  const hasText = !!currentText.trim();

  const handleGenerateQuiz = () => {
    if (setCurrentDocumentText) {
      setCurrentDocumentText(currentText);
    }
    if (onGenerateQuiz) {
      onGenerateQuiz();
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Document Viewer
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Analyze your document ⚡
          </p>
        </div>

        <div className="text-sm font-medium text-gray-700">
          {wordCount.toLocaleString()} words
        </div>
      </div>

      <div className="flex-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Document Content
        </h2>

        <textarea
          value={currentText}
          readOnly
          className="min-h-[420px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800 outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onLoadDocument}
          className="rounded-xl border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Load Document
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleGenerateQuiz}
          disabled={!hasText}
          className={`rounded-xl px-4 py-2 font-medium text-white transition ${
            hasText
              ? "bg-blue-600 hover:bg-blue-700"
              : "cursor-not-allowed bg-gray-400"
          }`}
        >
          Generate Quiz ⚡
        </button>
      </div>
    </div>
  );
}