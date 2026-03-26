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
  const [uploadingId, setUploadingId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    land: "",
    type: "",
    case_number: "",
    claim_amount: "",
    court: "",
    assignee: "",
    status: "",
    next_date: "",
    judgment_result: "",
    memo: "",
    file_url: "",
  };

  const [form, setForm] = useState(emptyForm);

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

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const addCase = async () => {
    if (!form.land || !form.type || !form.status) {
      alert("지번, 소송종류, 진행상황은 입력해주세요.");
      return;
    }

    const payload = {
      land: form.land,
      type: form.type,
      case_number: form.case_number || null,
      claim_amount: form.claim_amount || null,
      court: form.court || null,
      assignee: form.assignee || null,
      status: form.status,
      next_date: form.next_date || null,
      judgment_result: form.judgment_result || null,
      memo: form.memo || null,
      file_url: form.file_url || null,
    };

    const { error } = await supabase.from("cases").insert([payload]);

    if (error) {
      alert(error.message);
    } else {
      resetForm();
      fetchCases();
    }
  };

  const updateCase = async () => {
    if (!editingId) return;

    if (!form.land || !form.type || !form.status) {
      alert("지번, 소송종류, 진행상황은 입력해주세요.");
      return;
    }

    const payload = {
      land: form.land,
      type: form.type,
      case_number: form.case_number || null,
      claim_amount: form.claim_amount || null,
      court: form.court || null,
      assignee: form.assignee || null,
      status: form.status,
      next_date: form.next_date || null,
      judgment_result: form.judgment_result || null,
      memo: form.memo || null,
      file_url: form.file_url || null,
    };

    const { error } = await supabase
      .from("cases")
      .update(payload)
      .eq("id", editingId);

    if (error) {
      alert("수정 실패: " + error.message);
    } else {
      resetForm();
      fetchCases();
      alert("수정 완료");
    }
  };

  const deleteCase = async (caseId) => {
    const ok = confirm("이 소송건을 삭제할까요?");
    if (!ok) return;

    const targetCase = cases.find((c) => c.id === caseId);

    if (targetCase?.file_url) {
      try {
        const parts = targetCase.file_url.split("/case-files/");
        if (parts[1]) {
          await supabase.storage.from("case-files").remove([parts[1]]);
        }
      } catch (e) {}
    }

    const { error } = await supabase.from("cases").delete().eq("id", caseId);

    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      if (editingId === caseId) resetForm();
      fetchCases();
      alert("삭제 완료");
    }
  };

  const startEditCase = (caseItem) => {
    setEditingId(caseItem.id);
    setForm({
      land: caseItem.land || "",
      type: caseItem.type || "",
      case_number: caseItem.case_number || "",
      claim_amount: caseItem.claim_amount || "",
      court: caseItem.court || "",
      assignee: caseItem.assignee || "",
      status: caseItem.status || "",
      next_date: caseItem.next_date || "",
      judgment_result: caseItem.judgment_result || "",
      memo: caseItem.memo || "",
      file_url: caseItem.file_url || "",
    });
    setSelectedLand(caseItem.land || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileUpload = async (caseId, file) => {
    if (!file) return;

    try {
      setUploadingId(caseId);

      const fileExt = file.name.split(".").pop();
      const filePath = `case-${caseId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("case-files")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        alert("파일 업로드 실패: " + uploadError.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("case-files")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("cases")
        .update({ file_url: publicUrl })
        .eq("id", caseId);

      if (updateError) {
        alert("파일 주소 저장 실패: " + updateError.message);
        return;
      }

      await fetchCases();
      alert("파일 업로드 완료");
    } catch (err) {
      alert("오류 발생: " + err.message);
    } finally {
      setUploadingId(null);
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

  const COLORS = ["#ef4444", "#10b981"];

  const filteredLands = Object.keys(grouped).filter((land) =>
    land.toLowerCase().includes(search.toLowerCase())
  );

  const cardStyle = {
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid #e5e7eb",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    background: "#fff",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    fontSize: "13px",
    color: "#475569",
    fontWeight: 600,
  };

  const buttonPrimary = {
    padding: "12px 18px",
    borderRadius: "12px",
    border: "none",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const buttonSecondary = {
    padding: "12px 18px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
  };

  const buttonDanger = {
    padding: "8px 12px",
    borderRadius: "10px",
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const buttonEdit = {
    padding: "8px 12px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };

  if (!loggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #ecfeff 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#fff",
            borderRadius: 24,
            padding: 32,
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "#2563eb", fontWeight: 700, marginBottom: 8 }}>
              LOCUS LEGAL DASHBOARD
            </div>
            <h2 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>
              동작구 본동 개발사업 소송관리
            </h2>
            <p style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>
              공용 계정으로 접속하여 사업장 소송 현황을 관리하세요.
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>아이디</label>
            <input
              style={inputStyle}
              placeholder="ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>비밀번호</label>
            <input
              style={inputStyle}
              placeholder="PW"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>

          <button style={{ ...buttonPrimary, width: "100%" }} onClick={login}>
            로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
        padding: 24,
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        <div
          style={{
            ...cardStyle,
            padding: 28,
            marginBottom: 24,
            background:
              "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,41,59,1) 55%, rgba(37,99,235,1) 100%)",
            color: "#fff",
            border: "none",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 10, fontWeight: 700 }}>
            PROJECT LEGAL MANAGEMENT
          </div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.25 }}>
            동작구 본동 개발사업 소송관리
          </h1>
          <p style={{ marginTop: 10, marginBottom: 0, color: "rgba(255,255,255,0.82)" }}>
            지번별 소송 현황, 기일, 담당자, 첨부파일을 한 화면에서 관리하는 내부 시스템
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>전체 소송</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{total}</div>
          </div>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>진행중</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#ef4444" }}>
              {inProgress}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>종결</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#10b981" }}>
              {done}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>임박 기일</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: "#f59e0b" }}>
              {urgent}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          <div style={{ display: "grid", gap: 24 }}>
            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>진행 현황</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <PieChart width={280} height={280}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
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
              </div>
            </div>

            <div style={{ ...cardStyle, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>지번 검색</div>
              <input
                style={inputStyle}
                placeholder="지번 입력"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div style={{ marginTop: 16, maxHeight: 500, overflowY: "auto" }}>
                {filteredLands.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: 14 }}>검색 결과가 없습니다.</div>
                ) : (
                  filteredLands.map((land) => (
                    <div
                      key={land}
                      onClick={() => setSelectedLand(land)}
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        marginBottom: 10,
                        cursor: "pointer",
                        background: selectedLand === land ? "#e0e7ff" : "#f8fafc",
                        border:
                          selectedLand === land
                            ? "1px solid #818cf8"
                            : "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{land}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          {grouped[land].length}건
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#fff",
                          background: grouped[land].some((c) => c.status !== "종결")
                            ? "#ef4444"
                            : "#10b981",
                        }}
                      >
                        {grouped[land].some((c) => c.status !== "종결") ? "진행중" : "종결"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <div style={{ ...cardStyle, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>
                    {editingId ? "소송 수정" : "소송 등록"}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    실무형 항목을 한 번에 입력할 수 있습니다.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label style={labelStyle}>지번</label>
                  <input
                    style={inputStyle}
                    placeholder="지번"
                    value={form.land}
                    onChange={(e) => setForm({ ...form, land: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>소송종류</label>
                  <input
                    style={inputStyle}
                    placeholder="소송종류"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>사건번호</label>
                  <input
                    style={inputStyle}
                    placeholder="사건번호"
                    value={form.case_number}
                    onChange={(e) => setForm({ ...form, case_number: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>소가액</label>
                  <input
                    style={inputStyle}
                    placeholder="소가액"
                    value={form.claim_amount}
                    onChange={(e) => setForm({ ...form, claim_amount: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>법원</label>
                  <input
                    style={inputStyle}
                    placeholder="법원"
                    value={form.court}
                    onChange={(e) => setForm({ ...form, court: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>담당자</label>
                  <input
                    style={inputStyle}
                    placeholder="담당자"
                    value={form.assignee}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>다음기일</label>
                  <input
                    style={inputStyle}
                    type="date"
                    value={form.next_date}
                    onChange={(e) => setForm({ ...form, next_date: e.target.value })}
                  />
                </div>

                <div>
                  <label style={labelStyle}>진행상황</label>
                  <select
                    style={inputStyle}
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
                </div>

                <div>
                  <label style={labelStyle}>판결결과</label>
                  <input
                    style={inputStyle}
                    placeholder="판결결과"
                    value={form.judgment_result}
                    onChange={(e) => setForm({ ...form, judgment_result: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>메모</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                  placeholder="메모"
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                />
              </div>

              <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
                {!editingId ? (
                  <button style={buttonPrimary} onClick={addCase}>
                    소송 추가
                  </button>
                ) : (
                  <>
                    <button style={buttonPrimary} onClick={updateCase}>
                      수정 저장
                    </button>
                    <button style={buttonSecondary} onClick={resetForm}>
                      취소
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ ...cardStyle, padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>
                    {selectedLand ? `${selectedLand} 소송 목록` : "소송 목록"}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    지번을 선택하면 상세 소송 내역을 볼 수 있습니다.
                  </div>
                </div>
              </div>

              {!selectedLand ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    borderRadius: 16,
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    color: "#64748b",
                  }}
                >
                  왼쪽에서 지번을 선택해주세요.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "separate",
                      borderSpacing: 0,
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={thStyle}>소송종류</th>
                        <th style={thStyle}>사건번호</th>
                        <th style={thStyle}>소가액</th>
                        <th style={thStyle}>법원</th>
                        <th style={thStyle}>담당자</th>
                        <th style={thStyle}>진행상황</th>
                        <th style={thStyle}>다음기일</th>
                        <th style={thStyle}>판결결과</th>
                        <th style={thStyle}>메모</th>
                        <th style={thStyle}>첨부파일</th>
                        <th style={thStyle}>업로드</th>
                        <th style={thStyle}>수정</th>
                        <th style={thStyle}>삭제</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped[selectedLand].map((c) => (
                        <tr key={c.id}>
                          <td style={tdStyle}>{c.type}</td>
                          <td style={tdStyle}>{c.case_number || "-"}</td>
                          <td style={tdStyle}>{c.claim_amount || "-"}</td>
                          <td style={tdStyle}>{c.court || "-"}</td>
                          <td style={tdStyle}>{c.assignee || "-"}</td>
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight: 700,
                              color:
                                c.status === "종결"
                                  ? "#10b981"
                                  : c.status === "진행중"
                                  ? "#ef4444"
                                  : "#0f172a",
                            }}
                          >
                            {c.status}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              color:
                                c.next_date &&
                                new Date(c.next_date) <
                                  new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                                  ? "#f59e0b"
                                  : "#0f172a",
                              fontWeight:
                                c.next_date &&
                                new Date(c.next_date) <
                                  new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                                  ? 700
                                  : 400,
                            }}
                          >
                            {c.next_date || "-"}
                          </td>
                          <td style={tdStyle}>{c.judgment_result || "-"}</td>
                          <td style={{ ...tdStyle, minWidth: 180 }}>{c.memo || "-"}</td>
                          <td style={tdStyle}>
                            {c.file_url ? (
                              <a href={c.file_url} target="_blank" rel="noreferrer">
                                파일 보기
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={tdStyle}>
                            <input
                              type="file"
                              onChange={(e) => handleFileUpload(c.id, e.target.files[0])}
                            />
                            {uploadingId === c.id && (
                              <div style={{ color: "#f59e0b", marginTop: 6, fontSize: 12 }}>
                                업로드 중...
                              </div>
                            )}
                          </td>
                          <td style={tdStyle}>
                            <button style={buttonEdit} onClick={() => startEditCase(c)}>
                              수정
                            </button>
                          </td>
                          <td style={tdStyle}>
                            <button style={buttonDanger} onClick={() => deleteCase(c.id)}>
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "14px 12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "14px 12px",
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "top",
  color: "#0f172a",
  whiteSpace: "nowrap",
};
