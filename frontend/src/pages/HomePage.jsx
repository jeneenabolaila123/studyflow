import { useState } from "react";

export default function HomePage() {
  const [status, setStatus] = useState("No document loaded");
  const [qualityMode, setQualityMode] = useState("fast");
  const [loadedFile, setLoadedFile] = useState("");

  const handleBrowseFiles = () => {
    setStatus("Opening file dialog...");
    // هنا بعدين بتربطي file input أو upload flow الحقيقي
  };

  const handleGenerateQuiz = () => {
    const modeText = qualityMode === "higher_quality" ? "Higher Quality" : "Fast";

    if (!loadedFile) {
      setStatus("No document loaded");
      return;
    }

    if (qualityMode === "higher_quality") {
      setStatus(`Generating quiz... ${modeText}`);
    } else {
      setStatus(`Generating quiz... ${modeText}`);
    }

    // هون بعدين بتربطي generate quiz الحقيقي
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex min-h-[70vh] flex-col">
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-gray-900">Memma AI</h1>
            <p className="mt-3 text-lg text-gray-600">
              Turn your notes into quizzes instantly
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Load Document</h2>
              <p className="mt-1 text-sm text-gray-500">PDF / TXT</p>

              <div className="mt-6 text-center text-gray-700">
                <p className="mb-4">Upload your document</p>

                <button
                  onClick={handleBrowseFiles}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
                >
                  Browse Files
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Generate Quiz</h2>
              <p className="mt-1 text-sm text-gray-500">AI Powered</p>

              <div className="mt-6">
                <p className="mb-4 text-center font-medium text-gray-700">
                  {loadedFile ? `Loaded: ${loadedFile}` : status}
                </p>

                <label className="mb-2 block text-center text-sm font-medium text-gray-700">
                  Quiz Mode
                </label>

                <select
                  value={qualityMode}
                  onChange={(e) => setQualityMode(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
                >
                  <option value="fast">Fast</option>
                  <option value="higher_quality">Higher Quality</option>
                </select>

                <button
                  onClick={handleGenerateQuiz}
                  disabled={!loadedFile}
                  className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Generate Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}