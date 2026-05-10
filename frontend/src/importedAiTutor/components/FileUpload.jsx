import { useDropzone } from 'react-dropzone';
import { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_AI_TUTOR_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8001';

export default function FileUpload({ onChaptersDetected }) {
  const [uploading, setUploading] = useState(false);
  const [filename, setFilename] = useState(null);
  const [error, setError] = useState(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      setUploading(true);
      setError(null);
      const file = acceptedFiles[0];
      setFilename(file.name);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await axios.post(`${API_BASE}/upload/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data?.chapters) {
          onChaptersDetected(res.data);
        } else {
          setError('Upload succeeded but no chapters were detected.');
        }
      } catch (err) {
        const detail = err.response?.data?.detail || 'Upload failed or backend is down.';
        setError(detail);
      }
      setUploading(false);
    },
  });

  return (
    <div>
      <div {...getRootProps()} className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer bg-white hover:bg-gray-50 transition">
        <input {...getInputProps()} />
        <p className="text-gray-600">📂 Drag & drop a PDF/Word file here, or click to upload</p>
        {filename && <p className="mt-2 text-sm">Uploaded: {filename}</p>}
        {uploading && <p className="text-blue-500 animate-pulse">Processing...</p>}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">⚠️ {error}</p>}
    </div>
  );
}