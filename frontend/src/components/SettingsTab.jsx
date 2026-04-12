import { useEffect, useState } from "react";

export default function SettingsTab({
  onSaveSettings,
  onThemeChange,
}) {
  const [spacedRepetition, setSpacedRepetition] = useState(false);
  const [difficulty, setDifficulty] = useState("Easy");
  const [darkMode, setDarkMode] = useState(false);

  const [status, setStatus] = useState("Checking...");
  const [statusColor, setStatusColor] = useState("text-gray-600");

  const [url, setUrl] = useState("http://127.0.0.1:11434");
  const [generatorModel, setGeneratorModel] = useState("qwen3:1.7b");
  const [evaluatorModel, setEvaluatorModel] = useState("qwen3:1.7b");

  const [mcqEnabled, setMcqEnabled] = useState(true);
  const [tfEnabled, setTfEnabled] = useState(true);
  const [shortEnabled, setShortEnabled] = useState(true);

  const testOllamaConnection = async () => {
    setStatus("Checking...");
    setStatusColor("text-gray-600");

    try {
      const response = await fetch(`${url}/api/tags`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Connection failed");
      }

      setStatus("✅ Connected");
      setStatusColor("text-green-600");
    } catch (error) {
      setStatus("❌ Disconnected");
      setStatusColor("text-red-600");
      console.error(error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      testOllamaConnection();
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const saveSettings = () => {
    if (!url.startsWith("http")) {
      alert("Invalid URL");
      return;
    }

    const settings = {
      spacedRepetition,
      difficulty: difficulty.toLowerCase(),
      darkMode,
      url,
      generatorModel,
      evaluatorModel,
      questionTypes: {
        mcq: mcqEnabled,
        trueFalse: tfEnabled,
        shortAnswer: shortEnabled,
      },
    };

    if (onSaveSettings) {
      onSaveSettings(settings);
    }

    alert("Settings saved");
    testOllamaConnection();
  };

  const resetSettings = () => {
    setUrl("http://127.0.0.1:11434");
    setGeneratorModel("qwen3:1.7b");
    setEvaluatorModel("qwen3:1.7b");
    setMcqEnabled(true);
    setTfEnabled(true);
    setShortEnabled(true);
    setSpacedRepetition(false);
    setDifficulty("Easy");

    alert("Defaults restored");
  };

  const handleDarkModeChange = (checked) => {
    setDarkMode(checked);

    if (onThemeChange) {
      onThemeChange(checked ? "dark" : "light");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Learning */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Learning</h2>

          <label className="mb-4 flex items-center gap-3">
            <input
              type="checkbox"
              checked={spacedRepetition}
              onChange={(e) => setSpacedRepetition(e.target.checked)}
            />
            <span className="text-gray-700">Spaced Repetition</span>
          </label>

          <div className="flex items-center gap-3">
            <label className="text-gray-700 font-medium">Difficulty:</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">Appearance</h2>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={darkMode}
              onChange={(e) => handleDarkModeChange(e.target.checked)}
            />
            <span className="text-gray-700">Dark Mode</span>
          </label>
        </div>

        {/* AI Settings */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">AI Settings</h2>

          <div className="mb-4 flex items-center gap-3">
            <span className="font-medium text-gray-700">Status:</span>
            <span className={statusColor}>{status}</span>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              API URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Generator Model
            </label>
            <select
              value={generatorModel}
              onChange={(e) => setGeneratorModel(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="qwen3:1.7b">qwen3:1.7b</option>
              <option value="phi3:mini">phi3:mini</option>
            </select>
          </div>

          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Evaluator Model
            </label>
            <select
              value={evaluatorModel}
              onChange={(e) => setEvaluatorModel(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="qwen3:1.7b">qwen3:1.7b</option>
            </select>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-gray-700">Question Types</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mcqEnabled}
                  onChange={(e) => setMcqEnabled(e.target.checked)}
                />
                <span>MCQ</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tfEnabled}
                  onChange={(e) => setTfEnabled(e.target.checked)}
                />
                <span>TF</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={shortEnabled}
                  onChange={(e) => setShortEnabled(e.target.checked)}
                />
                <span>Short</span>
              </label>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={testOllamaConnection}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-gray-700 transition hover:bg-gray-50"
          >
            Test
          </button>

          <div className="flex-1" />

          <button
            onClick={saveSettings}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-white transition hover:bg-blue-700"
          >
            Save
          </button>

          <button
            onClick={resetSettings}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-gray-700 transition hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}