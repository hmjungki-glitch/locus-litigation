import { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://piianthaxklcpqoyylkv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpaWFudGhheGtsY3Bxb3l5bGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0Mjg0NDUsImV4cCI6MjA5MDAwNDQ0NX0.uYGQ3UTQJ3eyFaMay8UhXPHM6enXjJhukGiVlJEfwrQ",
  {
    global: {
      headers: {
        "Content-Type": "application/json",
      },
    },
  }
);

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const [cases, setCases] = useState([]);
  const [selectedLand, setSelectedLand] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    land: "",
    type: "",
    status: "",
    next_date: "",
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
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setCases(data || []);
  };

  const addCase = async () => {
    if (!form.land || !form.type || !form.status) {
      alert("지번, 소송종류, 진행상황은 입력해주세요.");
      return;
    }

    const { error } = await supabase.from("cases").insert([form]);

    if (error) {
      alert(error.message);
    } else {
      setForm({
        land: "",
        type: "",
        status: "",
        next_date: "",
      });
      fetchCases();
    }
  };

  useEffect(() => {
    if (loggedIn) fetchCases();
  }, [loggedIn]);

  const grouped = cases.reduce((acc, cur) => {
    acc[cur.land] = acc[cur.land] || [];
    acc[cur.land].push(cur);
    return acc;
  }, {});

  const total = cases.length;
  const inProgress = cases.filter((c) => c.status !== "종결").length;
  const done = cases.filter((c) => c.status === "종결").length;
  const urgent = cases.filter((c) => {
    if (!c.next_date) return false;
    return new Date(c.next_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  }).length;

  const chartData = [
    { name: "진행중", value: inProgress },
    { name: "종결", value: done },
  ];

  const COLORS = ["#FF0000", "#00C49F"];

  if (!loggedIn) {
    return (
      <div style={{ padding: 40 }}>
        <h2>로그인</h2>
        <input
          placeholder="ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <br />
        <input
          placeholder="PW"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <br />
        <button onClick={login}>로그인</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>지번별 소송 관리</h2>

      <PieChart width={300} height={300}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={100}
          dataKey="value"
          label
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ border: "1px solid black", padding: 10 }}>
          📊 전체: {total}
        </div>
        <div style={{ border: "1px solid blue", padding: 10 }}>
          🔵 진행중: {inProgress}
        </div>
        <div style={{ border: "1px solid green", padding: 10 }}>
          🟢 종결: {done}
        </div>
        <div style={{ border: "1px solid orange", padding: 10 }}>
          ⚠️ 임박: {urgent}
        </div>
      </div>

      <input
        placeholder="지번 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10, display: "block" }}
      />

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="지번"
          value={form.land}
          onChange={(e) => setForm({ ...form, land: e.target.value })}
        />
        <input
          placeholder="소송종류"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        />
        <input
          type="date"
          value={form.next_date}
          onChange={(e) => setForm({ ...form, next_date: e.target.value })}
        />
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
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

      <h3>지번 목록</h3>
      {Object.keys(grouped)
        .filter((land) => land.includes(search))
        .map((land) => (
          <div
            key={land}
            style={{
              cursor: "pointer",
              marginBottom: 10,
              color: grouped[land].some((c) => c.status !== "종결")
                ? "red"
                : "green",
            }}
            onClick={() => setSelectedLand(land)}
          >
            👉 {land} ({grouped[land].length}건)
          </div>
        ))}

      <hr />

      {selectedLand && (
        <div>
          <h3>{selectedLand} 소송 목록</h3>
          <table border="1" cellPadding="10" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>소송종류</th>
                <th>진행상황</th>
                <th>다음기일</th>
              </tr>
            </thead>
            <tbody>
              {grouped[selectedLand].map((c, i) => (
                <tr key={i}>
                  <td>{c.type}</td>
                  <td
                    style={{
                      color:
                        c.status === "종결"
                          ? "green"
                          : c.status === "진행중"
                          ? "red"
                          : "black",
                    }}
                  >
                    {c.status}
                  </td>
                  <td
                    style={{
                      color:
                        c.next_date &&
                        new Date(c.next_date) <
                          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                          ? "orange"
                          : "black",
                    }}
                  >
                    {c.next_date || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
