import React, { useState } from "react";
import { FileText } from "lucide-react";

export function CitationCard({ citation }) {
  const [showFull, setShowFull] = useState(false);

  return (
    <>
      <button
        type="button"
        className="cursor-pointer border rounded-full px-3 py-1 text-xs flex items-center gap-1.5 hover:bg-gray-100 transition-colors"
        onClick={() => setShowFull(true)}
      >
        <FileText size={14} />
        <span>Page {citation.page}</span>
      </button>

      {showFull && (
        <div
          onClick={() => setShowFull(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "700px",
              maxHeight: "85vh",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                padding: "18px 20px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
                Citation Details
              </h3>

              <button
                type="button"
                onClick={() => setShowFull(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", maxHeight: "70vh" }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                  Page
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  {citation.page}
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                  Document ID
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    background: "#f3f4f6",
                    padding: "10px",
                    borderRadius: "8px",
                    wordBreak: "break-all",
                  }}
                >
                  {citation.documentId}
                </div>
              </div>

              {citation.source && citation.source !== citation.documentId && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                    Source
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      background: "#f3f4f6",
                      padding: "10px",
                      borderRadius: "8px",
                      wordBreak: "break-word",
                    }}
                  >
                    {citation.source}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                  Source Text
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    background: "#f3f4f6",
                    padding: "12px",
                    borderRadius: "8px",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {citation.fullText || citation.snippet}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}