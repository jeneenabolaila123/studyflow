import { useState } from "react";

export default function HomeFrame({
  onLoadDocument,
  onGenerateQuiz,
  documentLoaded = false,
  fileName = "",
}) {
  const [qualityMode, setQualityMode] = useState("fast");
  const [status, setStatus] = useState("⏳ No document loaded");

  const handleLoadDocument = () => {
    setStatus("⚡ Opening file dialogue...");
    onLoadDocument?.();
  };

  const handleGenerateQuiz = () => {
    const modeText =
      qualityMode === "higher_quality" ? "🎯 Higher Quality" : "⚡ Fast";

    if (qualityMode === "higher_quality") {
      setStatus(`🧠 Generating quiz... ${modeText}`);
    } else {
      setStatus(`⚡ Generating quiz... ${modeText}`);
    }

    onGenerateQuiz?.(qualityMode);
  };

  const currentStatus = documentLoaded
    ? `✅ Loaded: ${fileName || "document"} | Mode: ${
        qualityMode === "higher_quality" ? "🎯 Higher Quality" : "⚡ Fast"
      }`
    : status;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900">🚀 Memma AI</h1>
          <p className="mt-3 text-xl text-gray-600">
            Turn your notes into quizzes instantly ⚡
          </p>
        </div>

        <div className="flex-1" />

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Load Document</h2>
            <p className="mt-1 text-sm text-gray-500">PDF / TXT</p>

            <div className="mt-6 text-center text-gray-700">
              📄 Upload your document
            </div>

            <button
              type="button"
              onClick={handleLoadDocument}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Browse Files
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Generate Quiz</h2>
            <p className="mt-1 text-sm text-gray-500">AI Powered</p>

            <div className="mt-6 text-center text-gray-700">{currentStatus}</div>

            <label className="mt-6 block text-center text-base font-semibold text-gray-900">
              Quiz Mode
            </label>

            <select
              value={qualityMode}
              onChange={(e) => setQualityMode(e.target.value)}
              className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="fast">⚡ Fast</option>
              <option value="higher_quality">🎯 Higher Quality</option>
            </select>

            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={!documentLoaded}
              className={`mt-6 w-full rounded-xl px-4 py-3 font-medium text-white transition ${
                documentLoaded
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "cursor-not-allowed bg-gray-400"
              }`}
            >
              Generate Quiz ⚡
            </button>
          </div>
        </div>

        <div className="flex-[2]" />
      </div>
    </div>
  );
}