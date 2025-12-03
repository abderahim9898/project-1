import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { ArrowLeft, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface EffectifRecord {
  id: string;
  name: string;
  department: string;
  position: string;
  status: string;
  joinDate?: string;
}

interface DepartmentData {
  department: string;
  count: number;
}

export default function Effectif() {
  const [data, setData] = useState<EffectifRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const fetchEffectifData = async () => {
      try {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        console.log("Fetching effectif data...");
        const response = await fetch("/api/effectif", {
          signal: controller.signal,
          headers: { "Accept": "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch effectif data: ${response.status}`);
        }

        const rawData = await response.json();
        console.log("Effectif data received:", rawData);

        if (Array.isArray(rawData) && rawData.length > 1) {
          const processedData: EffectifRecord[] = [];

          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row) || row.length < 4) continue;

            const id = (row[0] || "").toString().trim();
            const name = (row[1] || "").toString().trim();
            const department = (row[11] || "").toString().trim();
            const position = (row[3] || "").toString().trim();
            const status = (row[13] || "Actif").toString().trim();

            if (id && name) {
              processedData.push({
                id,
                name,
                department,
                position,
                status,
              });
            }
          }

          console.log("Processed effectif records:", processedData.length);
          setData(processedData);
        } else {
          console.warn("No effectif data received from server");
          setData([]);
        }
      } catch (err) {
        console.error("Error fetching effectif data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load effectif data";
        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEffectifData();
  }, [retryKey]);

  const departmentStats = useMemo(() => {
    const stats = new Map<string, number>();
    data.forEach((record) => {
      const dept = record.department || "Non défini";
      stats.set(dept, (stats.get(dept) || 0) + 1);
    });
    return Array.from(stats.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const totalEffectif = data.length;

  const statusStats = useMemo(() => {
    const stats = new Map<string, number>();
    data.forEach((record) => {
      const status = record.status || "Non défini";
      stats.set(status, (stats.get(status) || 0) + 1);
    });
    return Array.from(stats.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            👥 Effectif
          </h1>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button onClick={() => setRetryKey((k) => k + 1)} size="sm" className="ml-auto">
              <RotateCcw size={16} /> Réessayer
            </Button>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des données...</p>
          </div>
        ) : data.length === 0 ? (
          <Alert>
            <AlertDescription>Aucune donnée d'effectif disponible</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Effectif</h3>
                <p className="mt-2 text-4xl font-bold text-blue-600">{totalEffectif}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Départements</h3>
                <p className="mt-2 text-4xl font-bold text-green-600">{departmentStats.length}</p>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Statuts</h3>
                <p className="mt-2 text-4xl font-bold text-orange-600">{statusStats.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Effectif par Département
              </h2>
              <div className="w-full h-80 bg-white dark:bg-slate-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Nombre d'employés", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Effectif" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Distribution par Statut
              </h2>
              <div className="space-y-2">
                {statusStats.map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded">
                    <span className="text-gray-900 dark:text-white font-medium">{status}</span>
                    <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full font-semibold">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Liste du Personnel
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Nom</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Département</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Poste</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((record, idx) => (
                      <tr
                        key={`${record.id}-${idx}`}
                        className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{record.id}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.name}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.department || "-"}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.position || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            record.status === "Actif"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                              : "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400"
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
