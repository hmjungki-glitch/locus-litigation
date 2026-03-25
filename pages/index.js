import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://piianthaxklcpqoyylkv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpaWFudGhheGtsY3Bxb3l5bGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjg0NDUsImV4cCI6MjA5MDAwNDQ0NX0.uYGQ3UTQJ3eyFaMay8UhXPHM6enXjJhukGiVlJEfwrQ",
  {
    global: {
      headers: {
        "Content-Type": "application/json"
      }
    }
  }
);

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const [cases, setCases] = useState([]);
  const [selectedLand, setSelectedLand] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    land: "",
    type: "",
    status: ""
  });

  const login = () => {
    if (id === "adminlocus" && pw === "Locus123!@#") {
      setLoggedIn(true);
      fetchCases();
    } else {
      alert("로그인 실패");
    }
  };

  const fetchCases = async () => {
    const { data } = await supabase.from("cases").select("*");
    setCases(data || []);
  };

  const addCase = async () => {
    const { error } = await supabase.from("cases").insert([form]);
    if (error) {
      alert(error.message);
    } else {
      fetchCases();
    }
  };

  useEffect(() => {
    if (loggedIn) fetchCases();
  }, [loggedIn]);

  // 🔥 지번별 그룹화
  const grouped = cases.reduce((acc, cur) => {
    acc[cur.land] = acc[cur.land] || [];
    acc[cur.land].push(cur);
    return acc;
  }, {});

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
      <h2>지번별 소송 관리</h2>
<input
  placeholder="지번 검색"
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{ marginBottom: 10 }}
/>

      {/* 입력 */}
      <div>
        <input placeholder="지번" value={form.land} onChange={e => setForm({...form, land: e.target.value})} />
        <input placeholder="소송종류" value={form.type} onChange={e => setForm({...form, type: e.target.value})} />
        <select
  value={form.status}
  onChange={e => setForm({ ...form, status: e.target.value })}
>
  <option value="">진행상황 선택</option>
  <option value="진행중">진행중</option>
  <option value="1심">1심</option>
  <option value="2심">2심</option>
  <option value="3심">3심</option>
  <option value="항소">항소</option>
  <option value="종결">종결</option>
</select>
        <button onClick={addCase}>추가</button>
      </div>

      <hr />

      {/* 지번 리스트 */}
      <h3>지번 목록</h3>
      {Object.keys(grouped)
  .filter((land) => land.includes(search))
  .map((land) => (
        <div key={land} style={{ cursor: "pointer", marginBottom: 10 }}
          onClick={() => setSelectedLand(land)}>
          👉 {land} ({grouped[land].length}건)
        </div>
      ))}

      <hr />

      {/* 선택된 지번 상세 */}
      {selectedLand && (
        <div>
          <h3>{selectedLand} 소송 목록</h3>
          <table border="1" cellPadding="10" style={{ marginTop: 10 }}>
  <thead>
    <tr>
      <th>소송종류</th>
      <th>진행상황</th>
    </tr>
  </thead>
  <tbody>
    {grouped[selectedLand].map((c, i) => (
      <tr key={i}>
        <td>{c.type}</td>
        <td>{c.status}</td>
      </tr>
    ))}
  </tbody>
</table>
        </div>
      )}
    </div>
  );
}
