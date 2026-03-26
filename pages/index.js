import { useState, useEffect, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminId = process.env.NEXT_PUBLIC_ADMIN_ID;
const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
const viewerId = process.env.NEXT_PUBLIC_VIEWER_ID;
const viewerPassword = process.env.NEXT_PUBLIC_VIEWER_PASSWORD;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      "Content-Type": "application/json",
    },
  },
});

const RIGHT_TYPE_OPTIONS = [
  "전체",
  "근저당권",
  "가압류",
  "전세권",
  "가등기",
  "압류",
  "기타",
];

const RIGHT_STATUS_OPTIONS = ["전체", "유효", "말소", "변경", "검토필요"];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginRole, setLoginRole] = useState("");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [rememberId, setRememberId] = useState(false);

  const [activeTab, setActiveTab] = useState("cases");

  const [cases, setCases] = useState([]);
  const [rights, setRights] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [selectedLand, setSelectedLand] = useState("");
  const [search, setSearch] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingRightId, setEditingRightId] = useState(null);
  const [excelUploading, setExcelUploading] = useState(false);

  const [rightLandFilter, setRightLandFilter] = useState("");
  const [rightTypeFilter, setRightTypeFilter] = useState("전체");
  const [rightStatusFilter, setRightStatusFilter] = useState("전체");
  const [rightSort, setRightSort] = useState("rank_asc");

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

  const emptyRightForm = {
    land: "",
    right_holder: "",
    right_type: "",
    rank_order: "",
    amount: "",
    registration_date: "",
    cancellation_date: "",
    status: "유효",
    memo: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [rightForm, setRightForm] = useState(emptyRightForm);

  const isAdmin = loginRole === "admin";
  const isViewer = loginRole === "viewer";

  useEffect(() => {
    const savedId = localStorage.getItem("savedLoginId");
    const savedLoginState = localStorage.getItem("locusLoggedIn");
    const savedRole = localStorage.getItem("locusLoginRole");

    if (savedId) {
      setId(savedId);
      setRememberId(true);
    }

    if (savedLoginState === "true" && savedRole) {
      setLoggedIn(true);
      setLoginRole(savedRole);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) {
      fetchAll();
    }
  }, [loggedIn]);

  const fetchAll = async () => {
    await Promise.all([fetchCases(), fetchRights(), fetchAuditLogs()]);
  };

  const login = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      alert("Vercel 환경변수에 Supabase URL / anon key를 먼저 넣어주세요.");
      return;
    }

    if (!adminId || !adminPassword) {
      alert("Vercel 환경변수에 관리자 아이디/비밀번호를 먼저 넣어주세요.");
      return;
    }

    let role = "";

    if (id === adminId && pw === adminPassword) {
      role = "admin";
    } else if (
      viewerId &&
      viewerPassword &&
      id === viewerId &&
      pw === viewerPassword
    ) {
      role = "viewer";
    } else {
      alert("로그인 실패");
      return;
    }

    if (rememberId) {
      localStorage.setItem("savedLoginId", id);
    } else {
      localStorage.removeItem("savedLoginId");
    }

    localStorage.setItem("locusLoggedIn", "true");
    localStorage.setItem("locusLoginRole", role);

    setLoginRole(role);
    setLoggedIn(true);
    await fetchAll();
  };

  const logout = () => {
    localStorage.removeItem("locusLoggedIn");
    localStorage.removeItem("locusLoginRole");
    setLoggedIn(false);
    setLoginRole("");
    setPw("");
  };

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) {
      alert("cases 조회 실패: " + error.message);
      return;
    }

    setCases(data || []);
  };

  const fetchRights = async () => {
    const { data, error } = await supabase
      .from("rights")
      .select("*")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) {
      alert("rights 조회 실패: " + error.message);
      return;
    }

    setRights(data || []);
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("audit_logs 조회 실패:", error.message);
      return;
    }

    setAuditLogs(data || []);
  };

  const addAuditLog = async ({
    action,
    targetTable,
    targetId,
    land,
    reason = null,
    oldData = null,
    newData = null,
  }) => {
    try {
      await supabase.from("audit_logs").insert([
        {
          actor_id: id,
          actor_role: loginRole,
          action,
          target_table: targetTable,
          target_id: targetId ? String(targetId) : null,
          land: land || null,
          reason,
          old_data: oldData,
          new_data: newData,
        },
      ]);
      fetchAuditLogs();
    } catch (e) {
      console.error("audit log insert error", e);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const resetRightForm = () => {
    setRightForm(emptyRightForm);
    setEditingRightId(null);
  };

  const formatNumberWithComma = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const onlyNum = String(value).replaceAll(",", "");
    if (Number.isNaN(Number(onlyNum))) return value;
    return Number(onlyNum).toLocaleString();
  };

  const parseNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const onlyNum = String(value).replaceAll(",", "");
    if (Number.isNaN(Number(onlyNum))) return null;
    return Number(onlyNum);
  };

  const hasDuplicateCase = () => {
    if (!form.land || !form.case_number) return false;

    return cases.some(
      (item) =>
        item.id !== editingId &&
        (item.land || "").trim() === form.land.trim() &&
        (item.case_number || "").trim() === form.case_number.trim()
    );
  };

  const hasDuplicateRight = () => {
    if (!rightForm.land || !rightForm.right_type) return false;

    return rights.some(
      (item) =>
        item.id !== editingRightId &&
        (item.land || "").trim() === rightForm.land.trim() &&
        (item.right_holder || "").trim() === rightForm.right_holder.trim() &&
        (item.right_type || "").trim() === rightForm.right_type.trim() &&
        String(item.rank_order || "") === String(parseNumber(rightForm.rank_order) || "")
    );
  };

  const addCase = async () => {
    if (!isAdmin) return;

    if (!form.land || !form.type || !form.status) {
      alert("지번, 소송종류, 진행상황은 입력해주세요.");
      return;
    }

    if (hasDuplicateCase()) {
      alert("같은 지번 + 사건번호 조합의 소송이 이미 있습니다.");
      return;
    }

    const payload = {
      land: form.land,
      type: form.type,
      case_number: form.case_number || null,
      claim_amount: parseNumber(form.claim_amount),
      court: form.court || null,
      assignee: form.assignee || null,
      status: form.status,
      next_date: form.next_date || null,
      judgment_result: form.judgment_result || null,
      memo: form.memo || null,
      file_url: form.file_url || null,
    };

    const { data, error } = await supabase.from("cases").insert([payload]).select();

    if (error) {
      alert(error.message);
    } else {
      const inserted = data?.[0];
      await addAuditLog({
        action: "CREATE",
        targetTable: "cases",
        targetId: inserted?.id,
        land: inserted?.land,
        newData: inserted,
      });
      resetForm();
      fetchCases();
    }
  };

  const updateCase = async () => {
    if (!isAdmin || !editingId) return;

    if (!form.land || !form.type || !form.status) {
      alert("지번, 소송종류, 진행상황은 입력해주세요.");
      return;
    }

    if (hasDuplicateCase()) {
      alert("같은 지번 + 사건번호 조합의 소송이 이미 있습니다.");
      return;
    }

    const oldCase = cases.find((item) => item.id === editingId);

    const payload = {
      land: form.land,
      type: form.type,
      case_number: form.case_number || null,
      claim_amount: parseNumber(form.claim_amount),
      court: form.court || null,
      assignee: form.assignee || null,
      status: form.status,
      next_date: form.next_date || null,
      judgment_result: form.judgment_result || null,
      memo: form.memo || null,
      file_url: form.file_url || null,
    };

    const { data, error } = await supabase
      .from("cases")
      .update(payload)
      .eq("id", editingId)
      .select();

    if (error) {
      alert("수정 실패: " + error.message);
    } else {
      const updated = data?.[0];
      await addAuditLog({
        action: "UPDATE",
        targetTable: "cases",
        targetId: updated?.id,
        land: updated?.land,
        oldData: oldCase,
        newData: updated,
      });
      resetForm();
      fetchCases();
      alert("수정 완료");
    }
  };

  const deleteCase = async (caseId) => {
    if (!isAdmin) return;

    const ok = confirm("이 소송건을 삭제할까요?");
    if (!ok) return;

    const reason = prompt("삭제 사유를 입력해주세요.");
    if (!reason || !reason.trim()) {
      alert("삭제 사유를 입력해야 합니다.");
      return;
    }

    const targetCase = cases.find((c) => c.id === caseId);

    const { data, error } = await supabase
      .from("cases")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: id,
        delete_reason: reason.trim(),
      })
      .eq("id", caseId)
      .select();

    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      await addAuditLog({
        action: "DELETE",
        targetTable: "cases",
        targetId: caseId,
        land: targetCase?.land,
        reason: reason.trim(),
        oldData: targetCase,
        newData: data?.[0],
      });
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
      claim_amount: caseItem.claim_amount
        ? Number(caseItem.claim_amount).toLocaleString()
        : "",
      court: caseItem.court || "",
      assignee: caseItem.assignee || "",
      status: caseItem.status || "",
      next_date: caseItem.next_date || "",
      judgment_result: caseItem.judgment_result || "",
      memo: caseItem.memo || "",
      file_url: caseItem.file_url || "",
    });
    setSelectedLand(caseItem.land || "");
    setActiveTab("cases");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileUpload = async (caseId, file) => {
    if (!isAdmin || !file) return;

    try {
      setUploadingId(caseId);

      const targetCase = cases.find((c) => c.id === caseId);

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

      const { data, error: updateError } = await supabase
        .from("cases")
        .update({ file_url: publicUrl })
        .eq("id", caseId)
        .select();

      if (updateError) {
        alert("파일 주소 저장 실패: " + updateError.message);
        return;
      }

      await addAuditLog({
        action: "UPLOAD_FILE",
        targetTable: "cases",
        targetId: caseId,
        land: targetCase?.land,
        oldData: targetCase,
        newData: data?.[0],
      });

      await fetchCases();
      alert("파일 업로드 완료");
    } catch (err) {
      alert("오류 발생: " + err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const addRight = async () => {
    if (!isAdmin) return;

    if (!rightForm.land || !rightForm.right_type || !rightForm.status) {
      alert("지번, 권리종류, 상태는 입력해주세요.");
      return;
    }

    if (hasDuplicateRight()) {
      alert("같은 지번 + 권리자 + 권리종류 + 순위 조합의 권리관계가 이미 있습니다.");
      return;
    }

    const payload = {
      land: rightForm.land,
      right_holder: rightForm.right_holder || null,
      right_type: rightForm.right_type || null,
      rank_order: parseNumber(rightForm.rank_order),
      amount: parseNumber(rightForm.amount),
      registration_date: rightForm.registration_date || null,
      cancellation_date: rightForm.cancellation_date || null,
      status: rightForm.status || "유효",
      memo: rightForm.memo || null,
    };

    const { data, error } = await supabase.from("rights").insert([payload]).select();

    if (error) {
      alert("권리관계 등록 실패: " + error.message);
    } else {
      const inserted = data?.[0];
      await addAuditLog({
        action: "CREATE",
        targetTable: "rights",
        targetId: inserted?.id,
        land: inserted?.land,
        newData: inserted,
      });
      resetRightForm();
      fetchRights();
      alert("권리관계 등록 완료");
    }
  };

  const updateRight = async () => {
    if (!isAdmin || !editingRightId) return;

    if (!rightForm.land || !rightForm.right_type || !rightForm.status) {
      alert("지번, 권리종류, 상태는 입력해주세요.");
      return;
    }

    if (hasDuplicateRight()) {
      alert("같은 지번 + 권리자 + 권리종류 + 순위 조합의 권리관계가 이미 있습니다.");
      return;
    }

    const oldRight = rights.find((item) => item.id === editingRightId);

    const payload = {
      land: rightForm.land,
      right_holder: rightForm.right_holder || null,
      right_type: rightForm.right_type || null,
      rank_order: parseNumber(rightForm.rank_order),
      amount: parseNumber(rightForm.amount),
      registration_date: rightForm.registration_date || null,
      cancellation_date: rightForm.cancellation_date || null,
      status: rightForm.status || "유효",
      memo: rightForm.memo || null,
    };

    const { data, error } = await supabase
      .from("rights")
      .update(payload)
      .eq("id", editingRightId)
      .select();

    if (error) {
      alert("권리관계 수정 실패: " + error.message);
    } else {
      const updated = data?.[0];
      await addAuditLog({
        action: "UPDATE",
        targetTable: "rights",
        targetId: updated?.id,
        land: updated?.land,
        oldData: oldRight,
        newData: updated,
      });
      resetRightForm();
      fetchRights();
      alert("권리관계 수정 완료");
    }
  };

  const deleteRight = async (rightId) => {
    if (!isAdmin) return;

    const ok = confirm("이 권리관계를 삭제할까요?");
    if (!ok) return;

    const reason = prompt("삭제 사유를 입력해주세요.");
    if (!reason || !reason.trim()) {
      alert("삭제 사유를 입력해야 합니다.");
      return;
    }

    const targetRight = rights.find((r) => r.id === rightId);

    const { data, error } = await supabase
      .from("rights")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: id,
        delete_reason: reason.trim(),
      })
      .eq("id", rightId)
      .select();

    if (error) {
      alert("권리관계 삭제 실패: " + error.message);
    } else {
      await addAuditLog({
        action: "DELETE",
        targetTable: "rights",
        targetId: rightId,
        land: targetRight?.land,
        reason: reason.trim(),
        oldData: targetRight,
        newData: data?.[0],
      });
      if (editingRightId === rightId) resetRightForm();
      fetchRights();
      alert("권리관계 삭제 완료");
    }
  };

  const startEditRight = (item) => {
    setEditingRightId(item.id);
    setRightForm({
      land: item.land || "",
      right_holder: item.right_holder || "",
      right_type: item.right_type || "",
      rank_order: item.rank_order ? Number(item.rank_order).toLocaleString() : "",
      amount: item.amount ? Number(item.amount).toLocaleString() : "",
      registration_date: item.registration_date || "",
      cancellation_date: item.cancellation_date || "",
      status: item.status || "유효",
      memo: item.memo || "",
    });
    setSelectedLand(item.land || "");
    setActiveTab("rights");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const normalizeKey = (key) => {
    return String(key || "")
      .trim()
      .toLowerCase()
      .replace(/\s/g, "");
  };

  const getValueByAliases = (row, aliases) => {
    const entries = Object.entries(row || {});
    for (const alias of aliases) {
      const found = entries.find(
        ([key]) => normalizeKey(key) === normalizeKey(alias)
      );
      if (found) return found[1];
    }
    return "";
  };

  const normalizeDateValue = (value) => {
    if (!value) return null;

    if (typeof value === "number") {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        const y = parsed.y;
        const m = String(parsed.m).padStart(2, "0");
        const d = String(parsed.d).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }

    const str = String(value).trim();
    if (!str) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{4}\.\d{2}\.\d{2}$/.test(str)) return str.replaceAll(".", "-");
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) return str.replaceAll("/", "-");

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }

    return str;
  };

  const handleExcelUpload = async (type, file) => {
    if (!isAdmin || !file) return;

    try {
      setExcelUploading(true);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        alert("엑셀에 데이터가 없습니다.");
        return;
      }

      if (type === "cases") {
        const payload = rows
          .map((row) => ({
            land: getValueByAliases(row, ["land", "지번"]),
            type: getValueByAliases(row, ["type", "소송종류"]),
            case_number:
              getValueByAliases(row, ["case_number", "사건번호"]) || null,
            claim_amount: parseNumber(
              getValueByAliases(row, ["claim_amount", "소가액"])
            ),
            court: getValueByAliases(row, ["court", "법원"]) || null,
            assignee: getValueByAliases(row, ["assignee", "담당자"]) || null,
            status: getValueByAliases(row, ["status", "진행상황"]) || null,
            next_date: normalizeDateValue(
              getValueByAliases(row, ["next_date", "다음기일"])
            ),
            judgment_result:
              getValueByAliases(row, ["judgment_result", "판결결과"]) || null,
            memo: getValueByAliases(row, ["memo", "메모"]) || null,
            file_url: getValueByAliases(row, ["file_url", "파일URL"]) || null,
          }))
          .filter((item) => item.land && item.type && item.status);

        if (!payload.length) {
          alert(
            "업로드 가능한 소송 데이터가 없습니다. 필수값: 지번, 소송종류, 진행상황"
          );
          return;
        }

        const { error } = await supabase.from("cases").insert(payload);

        if (error) {
          alert("소송 엑셀 업로드 실패: " + error.message);
          return;
        }

        await addAuditLog({
          action: "EXCEL_UPLOAD",
          targetTable: "cases",
          reason: `소송 ${payload.length}건 업로드`,
          newData: payload,
        });

        await fetchCases();
        alert(`소송 ${payload.length}건 업로드 완료`);
      }

      if (type === "rights") {
        const payload = rows
          .map((row) => ({
            land: getValueByAliases(row, ["land", "지번"]),
            right_holder:
              getValueByAliases(row, ["right_holder", "권리자"]) || null,
            right_type:
              getValueByAliases(row, ["right_type", "권리종류"]) || null,
            rank_order: parseNumber(
              getValueByAliases(row, ["rank_order", "순위"])
            ),
            amount: parseNumber(getValueByAliases(row, ["amount", "금액"])),
            registration_date: normalizeDateValue(
              getValueByAliases(row, [
                "registration_date",
                "설정일자",
                "등록일자",
              ])
            ),
            cancellation_date: normalizeDateValue(
              getValueByAliases(row, ["cancellation_date", "말소일자"])
            ),
            status: getValueByAliases(row, ["status", "상태"]) || "유효",
            memo: getValueByAliases(row, ["memo", "메모"]) || null,
          }))
          .filter((item) => item.land && item.right_type && item.status);

        if (!payload.length) {
          alert(
            "업로드 가능한 권리관계 데이터가 없습니다. 필수값: 지번, 권리종류, 상태"
          );
          return;
        }

        const { error } = await supabase.from("rights").insert(payload);

        if (error) {
          alert("권리관계 엑셀 업로드 실패: " + error.message);
          return;
        }

        await addAuditLog({
          action: "EXCEL_UPLOAD",
          targetTable: "rights",
          reason: `권리관계 ${payload.length}건 업로드`,
          newData: payload,
        });

        await fetchRights();
        alert(`권리관계 ${payload.length}건 업로드 완료`);
      }
    } catch (err) {
      alert("엑셀 처리 오류: " + err.message);
    } finally {
      setExcelUploading(false);
    }
  };

  const grouped = useMemo(() => {
    return cases.reduce((acc, cur) => {
      acc[cur.land] = acc[cur.land] || [];
      acc[cur.land].push(cur);
      return acc;
    }, {});
  }, [cases]);

  const groupedRights = useMemo(() => {
    return rights.reduce((acc, cur) => {
      acc[cur.land] = acc[cur.land] || [];
      acc[cur.land].push(cur);
      return acc;
    }, {});
  }, [rights]);

  const allLands = useMemo(() => {
    return Array.from(
      new Set(
        [...cases.map((c) => c.land), ...rights.map((r) => r.land)].filter(Boolean)
      )
    );
  }, [cases, rights]);

  const total = cases.length;
  const inProgress = cases.filter((c) => c.status !== "종결").length;
  const done = cases.filter((c) => c.status === "종결").length;
  const urgent = cases.filter((c) => {
    if (!c.next_date) return false;
    return new Date(c.next_date) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  }).length;

  const totalRights = rights.length;
  const activeRights = rights.filter((r) => r.status !== "말소").length;
  const canceledRights = rights.filter((r) => r.status === "말소").length;

  const chartData = [
    { name: "진행중", value: inProgress },
    { name: "종결", value: done },
  ];

  const rightsChartData = [
    { name: "유효/기타", value: activeRights },
    { name: "말소", value: canceledRights },
  ];

  const rightTypeChartData = useMemo(() => {
    const map = {};
    rights.forEach((r) => {
      const key = r.right_type || "미분류";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [rights]);

  const landSummaryData = useMemo(() => {
    return allLands.map((land) => ({
      name: land,
      cases: grouped[land]?.length || 0,
      rights: groupedRights[land]?.length || 0,
    }));
  }, [allLands, grouped, groupedRights]);

  const filteredLands = allLands.filter((land) =>
    land.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRightsList = rights
    .filter((item) => {
      const matchesLand =
        !rightLandFilter ||
        (item.land || "").toLowerCase().includes(rightLandFilter.toLowerCase());

      const matchesType =
        rightTypeFilter === "전체" || (item.right_type || "") === rightTypeFilter;

      const matchesStatus =
        rightStatusFilter === "전체" || (item.status || "") === rightStatusFilter;

      return matchesLand && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (rightSort === "rank_asc") {
        return Number(a.rank_order || 999999) - Number(b.rank_order || 999999);
      }
      if (rightSort === "rank_desc") {
        return Number(b.rank_order || 0) - Number(a.rank_order || 0);
      }
      if (rightSort === "amount_desc") {
        return Number(b.amount || 0) - Number(a.amount || 0);
      }
      if (rightSort === "amount_asc") {
        return Number(a.amount || 0) - Number(b.amount || 0);
      }
      return 0;
    });

  const selectedLandRightsFiltered = filteredRightsList.filter(
    (item) => item.land === selectedLand
  );

  const filteredRightsTotalAmount = filteredRightsList.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const selectedLandRightsTotalAmount = selectedLandRightsFiltered.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const selectedLandCases = grouped[selectedLand] || [];

  const COLORS = [
    "#ef4444",
    "#10b981",
    "#2563eb",
    "#f59e0b",
    "#8b5cf6",
    "#14b8a6",
    "#f97316",
  ];

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

  const tabButton = (active) => ({
    padding: "10px 16px",
    borderRadius: "12px",
    border: active ? "none" : "1px solid rgba(255,255,255,0.25)",
    background: active ? "#fff" : "rgba(255,255,255,0.08)",
    color: active ? "#0f172a" : "#fff",
    fontWeight: 700,
    cursor: "pointer",
  });

  const viewerNotice = isViewer ? (
    <div
      style={{
        marginBottom: 16,
        padding: "14px 16px",
        borderRadius: 14,
        background: "#fff7ed",
        border: "1px solid #fdba74",
        color: "#9a3412",
        fontSize: 14,
        fontWeight: 700,
      }}
    >
      조회전용 계정입니다. 등록 / 수정 / 삭제 / 업로드는 관리자만 가능합니다.
    </div>
  ) : null;

  if (!loggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #ecfeff 100%)",
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
            <div
              style={{
                fontSize: 13,
                color: "#2563eb",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              LOCUS LEGAL DASHBOARD
            </div>
            <h2 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>
              동작구 본동 개발사업 소송관리
            </h2>
            <p style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>
              관리자 또는 조회전용 계정으로 로그인하세요.
            </p>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>아이디</label>
            <input
              style={inputStyle}
              placeholder="ID"
              value={id}
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
            />
          </div>

          <div
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              type="checkbox"
              id="rememberId"
              checked={rememberId}
              onChange={(e) => setRememberId(e.target.checked)}
            />
            <label
              htmlFor="rememberId"
              style={{ fontSize: 14, color: "#475569", cursor: "pointer" }}
            >
              아이디 저장
            </label>
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
      <div style={{ maxWidth: 1650, margin: "0 auto" }}>
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.85,
                  marginBottom: 10,
                  fontWeight: 700,
                }}
              >
                PROJECT LEGAL MANAGEMENT
              </div>
              <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.25 }}>
                동작구 본동 개발사업 소송관리
              </h1>
              <p
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                역할분리, 이력관리, 소프트삭제, 중복방지를 포함한 운영 버전
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 800,
                }}
              >
                {isAdmin ? "관리자" : "조회전용"}
              </div>
              <button
                style={tabButton(activeTab === "cases")}
                onClick={() => setActiveTab("cases")}
              >
                소송 관리
              </button>
              <button
                style={tabButton(activeTab === "rights")}
                onClick={() => setActiveTab("rights")}
              >
                권리관계
              </button>
              <button
                style={tabButton(activeTab === "dashboard")}
                onClick={() => setActiveTab("dashboard")}
              >
                대시보드
              </button>
              <button style={{ ...buttonSecondary, background: "#ffffff" }} onClick={logout}>
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {viewerNotice}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
              전체 소송
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {total}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
              진행중
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                marginTop: 8,
                color: "#ef4444",
              }}
            >
              {inProgress}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
              종결
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                marginTop: 8,
                color: "#10b981",
              }}
            >
              {done}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
              임박 기일
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                marginTop: 8,
                color: "#f59e0b",
              }}
            >
              {urgent}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
              전체 권리관계
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {totalRights}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
              최근 이력
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>
              {auditLogs.length}
            </div>
          </div>
        </div>

        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gap: 24 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              <div style={{ ...cardStyle, padding: 24, overflowX: "auto" }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
                  소송 현황
                </div>
                <PieChart width={420} height={300}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>

              <div style={{ ...cardStyle, padding: 24, overflowX: "auto" }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
                  권리 상태 현황
                </div>
                <PieChart width={420} height={300}>
                  <Pie
                    data={rightsChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label
                  >
                    {rightsChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              <div style={{ ...cardStyle, padding: 24, overflowX: "auto" }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
                  권리종류별 건수
                </div>
                <PieChart width={420} height={300}>
                  <Pie
                    data={rightTypeChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label
                  >
                    {rightTypeChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>

              <div style={{ ...cardStyle, padding: 24, overflowX: "auto" }}>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
                  최근 변경 이력
                </div>
                <div style={{ maxHeight: 300, overflowY: "auto", display: "grid", gap: 10 }}>
                  {auditLogs.length === 0 ? (
                    <div style={{ color: "#64748b" }}>이력이 없습니다.</div>
                  ) : (
                    auditLogs.slice(0, 10).map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          background: "#f8fafc",
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>
                          [{log.target_table}] {log.action}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                          {log.actor_id} / {log.actor_role} / {log.land || "-"}
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                          {log.created_at}
                        </div>
                        {log.reason && (
                          <div style={{ fontSize: 13, color: "#b45309", marginTop: 4 }}>
                            사유: {log.reason}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== "dashboard" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "360px 1fr",
              gap: 24,
              alignItems: "start",
            }}
          >
            <div style={{ display: "grid", gap: 24 }}>
              <div style={{ ...cardStyle, padding: 20, overflowX: "auto" }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                  {activeTab === "cases" ? "소송 진행 현황" : "권리관계 현황"}
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <PieChart width={280} height={280}>
                    <Pie
                      data={activeTab === "cases" ? chartData : rightsChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label
                    >
                      {(activeTab === "cases" ? chartData : rightsChartData).map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </div>
              </div>

              <div style={{ ...cardStyle, padding: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800 }}>지번 검색</div>
                  <button style={buttonSecondary} onClick={() => setSelectedLand("")}>
                    선택 해제
                  </button>
                </div>
                <input
                  style={inputStyle}
                  placeholder="지번 입력"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <div style={{ marginTop: 16, maxHeight: 500, overflowY: "auto" }}>
                  {filteredLands.length === 0 ? (
                    <div style={{ color: "#64748b", fontSize: 14 }}>
                      검색 결과가 없습니다.
                    </div>
                  ) : (
                    filteredLands.map((land) => {
                      const caseCount = grouped[land]?.length || 0;
                      const rightCount = groupedRights[land]?.length || 0;
                      const hasProgressCase = (grouped[land] || []).some(
                        (c) => c.status !== "종결"
                      );
                      const hasActiveRight = (groupedRights[land] || []).some(
                        (r) => r.status !== "말소"
                      );

                      return (
                        <div
                          key={land}
                          onClick={() => setSelectedLand(land)}
                          style={{
                            padding: "14px 16px",
                            borderRadius: 14,
                            marginBottom: 10,
                            cursor: "pointer",
                            background:
                              selectedLand === land ? "#e0e7ff" : "#f8fafc",
                            border:
                              selectedLand === land
                                ? "1px solid #818cf8"
                                : "1px solid #e5e7eb",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700 }}>{land}</div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#64748b",
                                  marginTop: 4,
                                }}
                              >
                                소송 {caseCount}건 / 권리 {rightCount}건
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              <div
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#fff",
                                  background: hasProgressCase
                                    ? "#ef4444"
                                    : "#10b981",
                                  textAlign: "center",
                                }}
                              >
                                {hasProgressCase ? "소송 진행" : "소송 종결"}
                              </div>
                              <div
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#fff",
                                  background: hasActiveRight
                                    ? "#2563eb"
                                    : "#94a3b8",
                                  textAlign: "center",
                                }}
                              >
                                {hasActiveRight ? "권리 유효" : "권리 없음/말소"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ ...cardStyle, padding: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                  엑셀 업로드
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>
                      소송 엑셀
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      disabled={!isAdmin}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleExcelUpload("cases", file);
                        e.target.value = "";
                      }}
                    />
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                      헤더 예시: 지번, 소송종류, 사건번호, 소가액, 법원, 담당자, 진행상황, 다음기일, 판결결과, 메모
                    </div>
                  </div>

                  <div>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>
                      권리관계 엑셀
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      disabled={!isAdmin}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        handleExcelUpload("rights", file);
                        e.target.value = "";
                      }}
                    />
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                      헤더 예시: 지번, 권리자, 권리종류, 순위, 금액, 설정일자, 말소일자, 상태, 메모
                    </div>
                  </div>

                  {excelUploading && (
                    <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700 }}>
                      엑셀 업로드 중...
                    </div>
                  )}
                </div>
              </div>

              {selectedLand && (
                <div style={{ ...cardStyle, padding: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
                    선택 지번 통합 요약
                  </div>
                  <div style={{ fontSize: 14, color: "#475569", marginBottom: 10 }}>
                    지번: <b>{selectedLand}</b>
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      소송 수: <b>{selectedLandCases.length}</b>건
                    </div>
                    <div>
                      권리 수: <b>{selectedLandRightsFiltered.length}</b>건
                    </div>
                    <div>
                      권리 총액:{" "}
                      <b>{selectedLandRightsTotalAmount.toLocaleString()}</b>원
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: 24 }}>
              {activeTab === "cases" && (
                <>
                  <div style={{ ...cardStyle, padding: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 18,
                      }}
                    >
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
                          disabled={!isAdmin}
                          onChange={(e) => setForm({ ...form, land: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>소송종류</label>
                        <input
                          style={inputStyle}
                          placeholder="소송종류"
                          value={form.type}
                          disabled={!isAdmin}
                          onChange={(e) => setForm({ ...form, type: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>사건번호</label>
                        <input
                          style={inputStyle}
                          placeholder="사건번호"
                          value={form.case_number}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setForm({ ...form, case_number: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>소가액</label>
                        <input
                          style={inputStyle}
                          placeholder="소가액"
                          value={form.claim_amount}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              claim_amount: formatNumberWithComma(e.target.value),
                            })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>법원</label>
                        <input
                          style={inputStyle}
                          placeholder="법원"
                          value={form.court}
                          disabled={!isAdmin}
                          onChange={(e) => setForm({ ...form, court: e.target.value })}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>담당자</label>
                        <input
                          style={inputStyle}
                          placeholder="담당자"
                          value={form.assignee}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setForm({ ...form, assignee: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>다음기일</label>
                        <input
                          style={inputStyle}
                          type="date"
                          value={form.next_date}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setForm({ ...form, next_date: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>진행상황</label>
                        <select
                          style={inputStyle}
                          value={form.status}
                          disabled={!isAdmin}
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
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setForm({ ...form, judgment_result: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <label style={labelStyle}>메모</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                        placeholder="메모"
                        value={form.memo}
                        disabled={!isAdmin}
                        onChange={(e) => setForm({ ...form, memo: e.target.value })}
                      />
                    </div>

                    {isAdmin && (
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
                    )}
                  </div>

                  <div style={{ ...cardStyle, padding: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>
                          {selectedLand
                            ? `${selectedLand} 소송 목록 (${selectedLandCases.length}건)`
                            : "소송 목록"}
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
                    ) : !selectedLandCases.length ? (
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
                        해당 지번의 소송 데이터가 없습니다.
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
                            {selectedLandCases.map((c) => (
                              <tr key={c.id}>
                                <td style={tdStyle}>{c.type}</td>
                                <td style={tdStyle}>{c.case_number || "-"}</td>
                                <td style={tdStyle}>
                                  {c.claim_amount
                                    ? Number(c.claim_amount).toLocaleString()
                                    : "-"}
                                </td>
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
                                <td style={{ ...tdStyle, minWidth: 180 }}>
                                  {c.memo || "-"}
                                </td>
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
                                    disabled={!isAdmin}
                                    onChange={(e) =>
                                      handleFileUpload(c.id, e.target.files[0])
                                    }
                                  />
                                  {uploadingId === c.id && (
                                    <div
                                      style={{
                                        color: "#f59e0b",
                                        marginTop: 6,
                                        fontSize: 12,
                                      }}
                                    >
                                      업로드 중...
                                    </div>
                                  )}
                                </td>
                                <td style={tdStyle}>
                                  {isAdmin ? (
                                    <button
                                      style={buttonEdit}
                                      onClick={() => startEditCase(c)}
                                    >
                                      수정
                                    </button>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td style={tdStyle}>
                                  {isAdmin ? (
                                    <button
                                      style={buttonDanger}
                                      onClick={() => deleteCase(c.id)}
                                    >
                                      삭제
                                    </button>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeTab === "rights" && (
                <>
                  <div style={{ ...cardStyle, padding: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 18,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>
                          {editingRightId ? "권리관계 수정" : "권리관계 등록"}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                          rights 테이블 기준으로 권리관계를 관리합니다.
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
                          value={rightForm.land}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setRightForm({ ...rightForm, land: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>권리자</label>
                        <input
                          style={inputStyle}
                          placeholder="권리자"
                          value={rightForm.right_holder}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setRightForm({
                              ...rightForm,
                              right_holder: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>권리종류</label>
                        <input
                          style={inputStyle}
                          placeholder="권리종류"
                          value={rightForm.right_type}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setRightForm({
                              ...rightForm,
                              right_type: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>순위</label>
                        <input
                          style={inputStyle}
                          placeholder="순위"
                          value={rightForm.rank_order}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setRightForm({
                              ...rightForm,
                              rank_order: formatNumberWithComma(e.target.value),
                            })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>금액</label>
                        <input
                          style={inputStyle}
                          placeholder="금액"
                          value={rightForm.amount}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setRightForm({
                              ...rightForm,
                              amount: formatNumberWithComma(e.target.value),
                            })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>상태</label>
                        <select
                          style={inputStyle}
                          value={rightForm.status}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setRightForm({ ...rightForm, status: e.target.value })
                          }
                        >
                          <option value="유효">유효</option>
                          <option value="말소">말소</option>
                          <option value="변경">변경</option>
                          <option value="검토필요">검토필요</option>
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>설정일자</label>
                        <input
                          style={inputStyle}
                          type="date"
                          value={rightForm.registration_date}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setRightForm({
                              ...rightForm,
                              registration_date: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>말소일자</label>
                        <input
                          style={inputStyle}
                          type="date"
                          value={rightForm.cancellation_date}
                          disabled={!isAdmin}
                          onChange={(e) =>
                            setRightForm({
                              ...rightForm,
                              cancellation_date: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <label style={labelStyle}>메모</label>
                      <textarea
                        style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
                        placeholder="메모"
                        value={rightForm.memo}
                        disabled={!isAdmin}
                        onChange={(e) =>
                          setRightForm({ ...rightForm, memo: e.target.value })
                        }
                      />
                    </div>

                    {isAdmin && (
                      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
                        {!editingRightId ? (
                          <button style={buttonPrimary} onClick={addRight}>
                            권리관계 추가
                          </button>
                        ) : (
                          <>
                            <button style={buttonPrimary} onClick={updateRight}>
                              수정 저장
                            </button>
                            <button style={buttonSecondary} onClick={resetRightForm}>
                              취소
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ ...cardStyle, padding: 24 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>
                          {selectedLand
                            ? `${selectedLand} 권리관계 목록 (${selectedLandRightsFiltered.length}건)`
                            : "권리관계 목록"}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                          지번을 선택하면 상세 권리관계 내역을 볼 수 있습니다.
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                        gap: 12,
                        marginBottom: 18,
                        padding: 16,
                        background: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                      }}
                    >
                      <div>
                        <label style={labelStyle}>지번 필터</label>
                        <input
                          style={inputStyle}
                          placeholder="지번 검색"
                          value={rightLandFilter}
                          onChange={(e) => setRightLandFilter(e.target.value)}
                        />
                      </div>

                      <div>
                        <label style={labelStyle}>권리종류 필터</label>
                        <select
                          style={inputStyle}
                          value={rightTypeFilter}
                          onChange={(e) => setRightTypeFilter(e.target.value)}
                        >
                          {RIGHT_TYPE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>상태 필터</label>
                        <select
                          style={inputStyle}
                          value={rightStatusFilter}
                          onChange={(e) => setRightStatusFilter(e.target.value)}
                        >
                          {RIGHT_STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>정렬</label>
                        <select
                          style={inputStyle}
                          value={rightSort}
                          onChange={(e) => setRightSort(e.target.value)}
                        >
                          <option value="rank_asc">순위 오름차순</option>
                          <option value="rank_desc">순위 내림차순</option>
                          <option value="amount_desc">금액 큰 순</option>
                          <option value="amount_asc">금액 작은 순</option>
                        </select>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 12,
                        marginBottom: 20,
                      }}
                    >
                      <div
                        style={{
                          padding: 16,
                          borderRadius: 14,
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 700 }}>
                          필터 적용 총 건수
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
                          {filteredRightsList.length}건
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 16,
                          borderRadius: 14,
                          background: "#ecfeff",
                          border: "1px solid #a5f3fc",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#0f766e", fontWeight: 700 }}>
                          필터 적용 총 금액
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
                          {filteredRightsTotalAmount.toLocaleString()}원
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 16,
                          borderRadius: 14,
                          background: "#f5f3ff",
                          border: "1px solid #ddd6fe",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 700 }}>
                          선택 지번 권리 총액
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
                          {selectedLandRightsTotalAmount.toLocaleString()}원
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
                    ) : !selectedLandRightsFiltered.length ? (
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
                        해당 조건의 권리관계 데이터가 없습니다.
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
                              <th style={thStyle}>권리자</th>
                              <th style={thStyle}>권리종류</th>
                              <th style={thStyle}>순위</th>
                              <th style={thStyle}>금액</th>
                              <th style={thStyle}>설정일자</th>
                              <th style={thStyle}>말소일자</th>
                              <th style={thStyle}>상태</th>
                              <th style={thStyle}>메모</th>
                              <th style={thStyle}>수정</th>
                              <th style={thStyle}>삭제</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedLandRightsFiltered.map((r) => (
                              <tr key={r.id}>
                                <td style={tdStyle}>{r.right_holder || "-"}</td>
                                <td style={tdStyle}>{r.right_type || "-"}</td>
                                <td style={tdStyle}>{r.rank_order || "-"}</td>
                                <td style={tdStyle}>
                                  {r.amount ? Number(r.amount).toLocaleString() : "-"}
                                </td>
                                <td style={tdStyle}>{r.registration_date || "-"}</td>
                                <td style={tdStyle}>{r.cancellation_date || "-"}</td>
                                <td
                                  style={{
                                    ...tdStyle,
                                    fontWeight: 700,
                                    color: r.status === "말소" ? "#94a3b8" : "#2563eb",
                                  }}
                                >
                                  {r.status || "-"}
                                </td>
                                <td style={{ ...tdStyle, minWidth: 180 }}>
                                  {r.memo || "-"}
                                </td>
                                <td style={tdStyle}>
                                  {isAdmin ? (
                                    <button
                                      style={buttonEdit}
                                      onClick={() => startEditRight(r)}
                                    >
                                      수정
                                    </button>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td style={tdStyle}>
                                  {isAdmin ? (
                                    <button
                                      style={buttonDanger}
                                      onClick={() => deleteRight(r.id)}
                                    >
                                      삭제
                                    </button>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
