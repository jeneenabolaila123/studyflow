import { useState } from "react";

export default function AnalyticsPage() {
  const [output, setOutput] = useState("");

  const handleRefresh = () => {
    setOutput(`📊 ANALYTICS
========================================

Total Reviews: 0
Avg Time: 0 sec

🔥 Weak Topics:
- No data yet

✅ Strong Topics:
- No data yet

⚠️ Hard Questions:
- No data yet

🧠 Advice:
No feedback yet.`);
  };

  const handleGeneratePlan = () => {
    setOutput(`🎯 STUDY PLAN

- Topic 1: 10 cards (15 min)
- Topic 2: 8 cards (12 min)

Total Time: 27 min`);
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
        <p className="mt-2 text-gray-600">Analyze your quiz performance and generate a study plan.</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleRefresh}
            className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Refresh Analytics
          </button>

          <button
            onClick={handleGeneratePlan}
            className="rounded-xl bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700"
          >
            Generate Study Plan
          </button>
        </div>

        <div className="mt-6 rounded-2xl border bg-gray-50 p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-800">
            {output || "No analytics loaded yet."}
          </pre>
        </div>
      </div>
    </div>
  );
}