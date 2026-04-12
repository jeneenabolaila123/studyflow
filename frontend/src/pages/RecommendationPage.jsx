import { useState } from "react";
import axios from "axios";

export default function RecommendationPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecommend = async () => {
    try {
      setLoading(true);

      const res = await axios.post(
        "http://127.0.0.1:8002/recommend",
        { text }
      );

      setResult(res.data.recommendation);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 text-white">

      <h1 className="text-2xl font-bold mb-4">
        🔥 AI Recommendations
      </h1>

      <textarea
        className="w-full p-4 bg-black/30 rounded"
        rows={6}
        placeholder="Paste your study text..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        onClick={handleRecommend}
        className="mt-4 px-6 py-2 bg-purple-500 rounded"
      >
        Generate
      </button>

      {loading && <p>Loading...</p>}

      {result && (
        <div className="mt-6 bg-white/5 p-4 rounded">
          {result}
        </div>
      )}
    </div>
  );
}