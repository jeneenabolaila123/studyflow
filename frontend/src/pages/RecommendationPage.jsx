import { useEffect, useMemo, useState } from "react";

export default function RecommendationsPage() {
  const [wrongAnswers, setWrongAnswers] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("studyflow_wrong_answers") || "[]");
      setWrongAnswers(Array.isArray(saved) ? saved : []);
    } catch (error) {
      console.error("Failed to load recommendations data:", error);
      setWrongAnswers([]);
    }
  }, []);

  const extractFocusArea = (question = "", explanation = "") => {
    const clean = (question || "")
      .replace(/^what\s+is\s+/i, "")
      .replace(/^what\s+does\s+/i, "")
      .replace(/^which\s+/i, "")
      .replace(/^how\s+/i, "")
      .replace(/^why\s+/i, "")
      .replace(/^when\s+/i, "")
      .replace(/^where\s+/i, "")
      .replace(/\?+$/g, "")
      .trim();

    if (clean.length > 0) {
      return clean;
    }

    return explanation?.trim() || "Review this concept again.";
  };

  const groupedRecommendations = useMemo(() => {
    const groups = {};

    wrongAnswers.forEach((item) => {
      const title = item.title || item.file_name || "Untitled Material";

      if (!groups[title]) {
        groups[title] = {
          title,
          file_name: item.file_name || "",
          difficulty: item.difficulty || "medium",
          totalWrong: 0,
          items: [],
        };
      }

      groups[title].totalWrong += 1;
      groups[title].items.push({
        ...item,
        focus_area: extractFocusArea(item.question, item.explanation),
      });
    });

    return Object.values(groups).sort((a, b) => b.totalWrong - a.totalWrong);
  }, [wrongAnswers]);

  const clearRecommendations = () => {
    localStorage.removeItem("studyflow_wrong_answers");
    setWrongAnswers([]);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f5ff",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "950px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: "#4b2aad" }}>Recommendations</h1>
            <p style={{ marginTop: "8px", color: "#666" }}>
              Based on your wrong answers, here is what you should focus on studying.
            </p>
          </div>

          {wrongAnswers.length > 0 && (
            <button
              onClick={clearRecommendations}
              style={{
                padding: "10px 16px",
                border: "none",
                borderRadius: "10px",
                background: "#d93025",
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Clear Recommendations
            </button>
          )}
        </div>

        {wrongAnswers.length === 0 ? (
          <div
            style={{
              background: "#f7f3ff",
              borderRadius: "14px",
              padding: "20px",
              color: "#555",
            }}
          >
            No recommendations yet. Answer quiz questions first, and your weak areas will appear here.
          </div>
        ) : (
          <>
            <div
              style={{
                background: "#f3edff",
                borderRadius: "14px",
                padding: "18px",
                marginBottom: "24px",
              }}
            >
              <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#4b2aad" }}>
                Study Advice
              </p>
              <p style={{ margin: 0, color: "#444" }}>
                Focus first on the files or concepts where you made the most mistakes.
                Review the correct answers and explanations carefully before trying a new quiz.
              </p>
            </div>

            {groupedRecommendations.map((group, groupIndex) => (
              <div
                key={groupIndex}
                style={{
                  border: "1px solid #e3d9ff",
                  borderRadius: "16px",
                  padding: "22px",
                  marginBottom: "22px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    background: "#f7f3ff",
                    borderRadius: "12px",
                    padding: "14px",
                    marginBottom: "18px",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#4b2aad" }}>
                    Material: {group.title}
                  </p>
                  <p style={{ margin: "0 0 6px 0", color: "#444" }}>
                    <strong>Wrong Answers:</strong> {group.totalWrong}
                  </p>
                  <p style={{ margin: 0, color: "#444" }}>
                    <strong>Recommendation:</strong> Review this material first because it has your highest mistakes.
                  </p>
                </div>

                {group.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: "12px",
                      padding: "16px",
                      marginBottom: "14px",
                      background: "#fcfbff",
                    }}
                  >
                    <p style={{ margin: "0 0 10px 0", fontWeight: "bold", color: "#222" }}>
                      Wrong Question:
                    </p>
                    <p style={{ margin: "0 0 12px 0", color: "#333" }}>
                      {item.question}
                    </p>

                    <p style={{ margin: "0 0 8px 0", color: "#b42318", fontWeight: "bold" }}>
                      Your Answer: {item.selected_answer}
                    </p>

                    <p style={{ margin: "0 0 8px 0", color: "#1f7a36", fontWeight: "bold" }}>
                      Correct Answer: {item.correct_answer}
                    </p>

                    <p style={{ margin: "0 0 8px 0", color: "#444" }}>
                      <strong>Focus On:</strong> {item.focus_area}
                    </p>

                    <p style={{ margin: "0 0 8px 0", color: "#444" }}>
                      <strong>What to Study:</strong> Read again the part related to this concept and understand why the correct answer is right.
                    </p>

                    <p style={{ margin: 0, color: "#555" }}>
                      <strong>Explanation:</strong> {item.explanation}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}