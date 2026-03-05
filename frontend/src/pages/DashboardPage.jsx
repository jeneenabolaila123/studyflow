import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import NoteForm from "../components/NoteForm.jsx";

export default function DashboardPage() {

  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [txtFile, setTxtFile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {

    try {

      const res = await axiosClient.get("/notes");
      setNotes(res.data?.data || []);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {

    load();

  }, [load]);

  return (

    <div className="row">

      {/* LEFT SIDE */}
      <div className="col">

        <h2>Study Assistant</h2>

        {loading ? (
          <div className="card">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="card">No notes yet.</div>
        ) : (
          notes.map((n) => (
            <div className="card" key={n.id}>
              <h4>{n.title}</h4>
              <Link to={`/notes/${n.id}`}>View</Link>
            </div>
          ))
        )}

        <hr />

        <h3>Add Note (Optional)</h3>

        <textarea
          placeholder="Write or paste your note text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <br /><br />

        <label>TXT file</label>

        <input
          type="file"
          accept=".txt"
          onChange={(e) => setTxtFile(e.target.files[0])}
        />

        <br /><br />

       
      </div>

      {/* RIGHT SIDE */}
      <div className="col">

        <h3>Upload</h3>

        <NoteForm onCreated={load} />

      </div>

    </div>

  );
}