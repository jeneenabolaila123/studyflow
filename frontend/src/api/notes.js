import axiosClient from './axiosClient';

export function createNote({ title, description, file, textContent }) {
  const formData = new FormData();

  formData.append('title', title);

  if (description?.trim()) {
    formData.append('description', description.trim());
  }

  if (file) {
    formData.append('file', file);
  }

  if (textContent?.trim()) {
    formData.append('text_content', textContent.trim());
  }

  return axiosClient.post('/notes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function summarizeNote(noteId, mode) {
  return axiosClient.post('/ai/summarize', {
    note_id: Number(noteId),
    mode,
  });
}