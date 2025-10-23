"use client";
import { useEffect, useMemo, useState } from "react";

type Repo = { full_name: string; name: string; owner: { login: string; type?: string } };
type Org = { login: string };

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [sinceDate, setSinceDate] = useState<string>("");
  const [untilDate, setUntilDate] = useState<string>("");
  const [commitLimit, setCommitLimit] = useState<number>(50);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisType, setAnalysisType] = useState<'repo' | 'org'>('repo');
  const backend = useMemo(() => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const urlSession = url.searchParams.get("session");
    if (urlSession) {
      localStorage.setItem("session_id", urlSession);
      setSessionId(urlSession);
      url.searchParams.delete("session");
      window.history.replaceState({}, "", url.toString());
    } else {
      const saved = localStorage.getItem("session_id");
      if (saved) setSessionId(saved);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    fetch(`${backend}/github/orgs`, {
      headers: { 'X-Session-ID': sessionId },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setOrgs(data || []))
      .catch(() => setOrgs([]));

    fetch(`${backend}/github/me`, {
      headers: { 'X-Session-ID': sessionId },
    })
      .then((r) => r.ok ? r.json() : {})
      .then((u: any) => setOwner(u.login || u.name || 'Bilinmeyen'))
      .catch(() => setOwner("Bilinmeyen"));

    fetch(`${backend}/github/repos`, {
      headers: { 'X-Session-ID': sessionId },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setRepos(data || []))
      .catch(() => setRepos([]));
  }, [sessionId, backend]);

  const login = () => {
    window.location.href = `${backend}/auth/github/login`;
  };

  const loadOrgRepos = async (org: string) => {
    if (!sessionId) return;
    setSelectedOrg(org);
    const res = await fetch(`${backend}/github/repos?org=${org}`, {
      headers: { 'X-Session-ID': sessionId },
    });
    const data = await res.json();
    setRepos(data || []);
  };

  const runAnalysis = async () => {
    if (!sessionId) return;
    setIsAnalyzing(true);

    try {
      let res;
      if (analysisType === 'repo' && selectedRepo) {
        const [own, repo] = selectedRepo.split("/");
        res = await fetch(`${backend}/analysis/repo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: own,
            repo,
            sessionId,
            since: sinceDate || undefined,
            until: untilDate || undefined,
            commitLimit
          }),
        });
      } else if (analysisType === 'org' && selectedOrg) {
        res = await fetch(`${backend}/analysis/organization`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org: selectedOrg,
            sessionId,
            since: sinceDate || undefined,
            until: untilDate || undefined,
            commitLimit
          }),
        });
      } else {
        throw new Error('Lütfen repo veya organizasyon seçin');
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      alert('Analiz sırasında hata oluştu');
    } finally {
      setIsAnalyzing(false);
    }
  };

const logout = async () => {
  try {
    if (sessionId) {
      await fetch(`${backend}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    }
  } catch (error) {
    console.error('Logout sırasında hata:', error);
  } finally {

    localStorage.removeItem("session_id");
    sessionStorage.clear();
    setSessionId(null);
    setOwner("");
    setOrgs([]);
    setRepos([]);
    setAnalysis(null);
    setSelectedOrg("");
    setSelectedRepo("");

    const logoutTab = window.open("https://github.com/logout", "_blank");

    setTimeout(() => {

      if (logoutTab && !logoutTab.closed) logoutTab.close();
      window.location.href = "http://localhost:3001";
    }, 4000);
  }
};





  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">AI vs Human Code Analyzer</h1>

      {!sessionId ? (
        <div className="text-center">
          <button
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            onClick={login}
          >
            GitHub ile Giriş Yap
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">
              {owner && owner !== "Bilinmeyen" ? (
                <span>Giriş yapan: <strong>{owner}</strong></span>
              ) : (
                <span className="text-orange-600">Kullanıcı bilgisi yükleniyor...</span>
              )}
            </div>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              onClick={logout}
            >
              Çıkış Yap
            </button>
          </div>

          {/* Analiz türü ve filtreler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Analiz türü */}
            <div>
              <h2 className="font-semibold mb-3">Analiz Türü</h2>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="analysisType"
                    value="repo"
                    checked={analysisType === 'repo'}
                    onChange={(e) => setAnalysisType(e.target.value as 'repo')}
                    className="mr-2"
                  />
                  Tek Repo Analizi
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="analysisType"
                    value="org"
                    checked={analysisType === 'org'}
                    onChange={(e) => setAnalysisType(e.target.value as 'org')}
                    className="mr-2"
                  />
                  Organizasyon Geneli Analiz
                </label>
              </div>
            </div>

            {/* Filtreler */}
            <div>
              <h2 className="font-semibold mb-3">Filtreler</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={sinceDate}
                    onChange={(e) => setSinceDate(e.target.value)}
                    className="border px-3 py-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={untilDate}
                    onChange={(e) => setUntilDate(e.target.value)}
                    className="border px-3 py-2 rounded w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Commit Limiti</label>
                  <input
                    type="number"
                    value={commitLimit}
                    onChange={(e) => setCommitLimit(Number(e.target.value))}
                    min="1"
                    max="200"
                    className="border px-3 py-2 rounded w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Organizasyon ve repo seçimi */}
          <div>
            <h2 className="font-semibold mb-3">Organizasyonlar</h2>
            <div className="flex gap-2 flex-wrap">
              {orgs.map((o) => (
                <button
                  key={o.login}
                  className={`px-4 py-2 border rounded-lg transition-colors ${selectedOrg === o.login ? "bg-black text-white" : "border-gray-300 hover:bg-gray-50"}`}
                  onClick={() => loadOrgRepos(o.login)}
                >
                  {o.login}
                </button>
              ))}
            </div>
          </div>

          {analysisType === 'repo' && (
            <div>
              <h2 className="font-semibold mb-3">Repo Seç</h2>
              <select
                className="border px-3 py-2 rounded w-full"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
              >
                <option value="">Seçiniz</option>
                {repos.map((r) => (
                  <option key={r.full_name} value={r.full_name}>
                    {r.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Analiz başlat butonu */}
          <div className="flex gap-4">
            <button
              disabled={isAnalyzing || (analysisType === 'repo' && !selectedRepo) || (analysisType === 'org' && !selectedOrg)}
              onClick={runAnalysis}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {isAnalyzing ? 'Analiz Ediliyor...' : 'Analizi Çalıştır'}
            </button>
          </div>

          {/* Analiz sonuçları */}
          {analysis && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="font-semibold mb-4 text-lg">Analiz Sonuçları</h2>
              <div className="space-y-4">
                {analysis.users?.map((u: any) => (
                  <div key={u.user} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">{u.user}</div>
                      <div className="text-sm text-gray-600">
                        AI: {u.aiPercent}% • Human: {u.humanPercent}% • Commits: {u.commitsAnalyzed}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 h-3 rounded-full">
                      <div
                        className="bg-green-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${u.humanPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
