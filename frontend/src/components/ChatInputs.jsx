import React, { useRef } from "react";

export default function ChatInput({
  question,
  setQuestion,
  onAsk,
  onFileChange,
  disabled,
  asking,
  uploadedPdf,
}) {
  const fileInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      onAsk();
    }
  };

  return (
    <div className="border-t px-5 py-4">
      {!uploadedPdf && (
        <div className="mb-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
          Please upload a PDF first.
        </div>
      )}

      <div className="flex items-end gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        >
          PDF
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={onFileChange}
          className="hidden"
        />

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder={
            disabled ? "Processing..." : "Ask something about your PDF..."
          }
          disabled={disabled}
          className="flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100"
        />

        <button
          type="button"
          onClick={onAsk}
          disabled={disabled || !question.trim()}
          className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {asking ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}