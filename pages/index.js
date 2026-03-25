import { useState } from "react";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const login = () => {
    if (id === "adminlocus" && pw === "Locus123!@#") {
      setLoggedIn(true);
    } else {
      alert("로그인 실패");
    }
  };

  const [cases, setCases] = useState([]);
  const [form, setForm] = useState({
    land: "",
    type: "",
    status: ""
  });

  const addCase = () => {
    setCases([...cases, form]);
    setForm({ land: "", type: "", status: "" });
  };

  if (!loggedIn) {
    return (
      <div style={{ padding: 40 }}>
        <h2>로그인</h2>
        <input placeholder="ID" onChange={e => setId(e.target.value)} /><br/>
        <input placeholder="PW" type="password" onChange={e => setPw(e.target.value)} /><br/>
        <button onClick={login}>로그인</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>소송 관리</h2>

      <input placeholder="지번" value={form.land} onChange={e => setForm({...form, land: e.target.value})} />
      <input placeholder="소송종류" value={form.type} onChange={e => setForm({...form, type: e.target.value})} />
      <input placeholder="진행상황" value={form.status} onChange={e => setForm({...form, status: e.target.value})} />
      <button onClick={addCase}>추가</button>

      <ul>
        {cases.map((c, i) => (
          <li key={i}>{c.land} / {c.type} / {c.status}</li>
        ))}
      </ul>
    </div>
  );
}
