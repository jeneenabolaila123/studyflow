<<<<<<< HEAD
import { useEffect } from "react";

export default function Dashboard() {

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/ping")
      .then(res => res.json())
      .then(data => console.log("Response:", data))
      .catch(err => console.error("Error:", err));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
=======
import { useState, useEffect } from "react";
import axios from "axios";

export default function Dashboard() {

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [notes, setNotes] = useState([]);

  const token = localStorage.getItem("token");

  const fetchNotes = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/notes", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setNotes(res.data.data);

    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pdfFile) {
      alert("Please select a PDF file");
      return;
    }

    try {

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("pdf", pdfFile);
      formData.append("text", text);

      await axios.post(
        "http://127.0.0.1:8000/api/notes",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Upload success");

      setTitle("");
      setDescription("");
      setText("");
      setPdfFile(null);

      fetchNotes();

    } catch (error) {

      console.error(error.response?.data || error);
      alert("Upload failed");

    }
  };

  return (
    <div style={{display:"flex", gap:"40px"}}>

      {/* LEFT SIDE */}
      <div style={{flex:1}}>

        <h1>Dashboard</h1>

        <h2>Your Notes</h2>

        {notes.length === 0 && <p>No notes yet.</p>}

        {notes.map((note) => (
          <div key={note.id} style={{border:"1px solid gray", padding:"10px", margin:"10px"}}>

            <h3>{note.title}</h3>

            <p>{note.description}</p>

            <p>Status: {note.status}</p>

            <p>Type: {note.source_type}</p>

          </div>
        ))}

        <hr />

        <h2>Add Note (Optional)</h2>

        <textarea
          placeholder="Write or paste your note text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{width:"100%", height:"100px"}}
        />

      </div>


      {/* RIGHT SIDE */}
      <div style={{flex:1}}>

        <h2>Upload a PDF</h2>

        <form onSubmit={handleSubmit}>

          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <br /><br />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <br /><br />

          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files[0])}
          />

          <br /><br />

          <button type="submit">
            Upload PDF
          </button>

        </form>

      </div>

>>>>>>> 2f30f7bb1a249b844be9157f2da9601516d21379
    </div>
  );
}