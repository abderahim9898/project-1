import CategoryPlaceholder from "@/components/CategoryPlaceholder";
import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { ArrowLeft, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DepartureRecord {
  qz: string;
  month: string | number;
  sexo: string;
  department: string;
  contado: string;
  nbBaja: number;
}

interface MonthData {
  month: string | number;
  [key: string]: string | number; // Dynamic QZ bars
}

export default function Departures() {
  const [data, setData] = useState<DepartureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const fetchDepartureData = async () => {
      try {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        console.log("Fetching departure data...");
        const response = await fetch("/api/turnover", {
          signal: controller.signal,
          headers: { "Accept": "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch departure data: ${response.status}`);
        }

        const rawData = await response.json();
        console.log("Departure data received:", rawData);

        // Parse the data - assuming format: [headers, [qz, month, sexo, department, nbBaja], ...]
        if (Array.isArray(rawData) && rawData.length > 1) {
          const processedData: DepartureRecord[] = [];

          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || !Array.isArray(row) || row.length < 5) continue;

            const qz = (row[0] || "").toString().trim();
            const month = row[1] || "";
            const sexo = (row[2] || "").toString().trim();
            const department = (row[4] || "").toString().trim();
            const contado = (row[3] || "").toString().trim();
            const nbBaja = parseInt(row[5]) || 0;

            if (qz && month && department) {
              processedData.push({
                qz,
                month,
                sexo,
                contado,
                department,
                nbBaja,
              });
            }
          }

          console.log("Processed departure records:", processedData.length);
          setData(processedData);
        } else {
          console.warn("No departure data received from server");
          setData([]);
        }
      } catch (err) {
        console.error("Error fetching departure data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load departure data";
        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartureData();
  }, [retryKey]);

  // Get unique QZs and months
  const uniqueQZs = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.qz))).sort();
  }, [data]);

  const uniqueMonths = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.month))).sort(
      (a, b) => (parseInt(String(a)) || 0) - (parseInt(String(b)) || 0)
    );
  }, [data]);

  // Prepare chart data - group by month with QZ as bars
  const chartData = useMemo(() => {
    const monthMap = new Map<string | number, MonthData>();

    // Initialize all months with 0 values
    for (let i = 1; i <= 12; i++) {
      const monthData: MonthData = { month: `Mois ${i}` };
      uniqueQZs.forEach((qz) => {
        monthData[qz] = 0;
      });
      monthMap.set(i, monthData);
    }

    // Fill in the data
    data.forEach((record) => {
      const monthNum = parseInt(String(record.month)) || 0;
      if (monthMap.has(monthNum)) {
        const monthData = monthMap.get(monthNum)!;
        monthData[record.qz] = (monthData[record.qz] as number || 0) + record.nbBaja;
      }
    });

    return Array.from(monthMap.values()).sort((a, b) => {
      const aMonth = parseInt(String(a.month).replace("Mois ", "")) || 0;
      const bMonth = parseInt(String(b.month).replace("Mois ", "")) || 0;
      return aMonth - bMonth;
    });
  }, [data, uniqueQZs]);

  // Color palette for QZ bars
  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const qzColors = uniqueQZs.reduce(
    (acc, qz, idx) => {
      acc[qz] = colors[idx % colors.length];
      return acc;
    },
    {} as Record<string, string>
  );

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📤 Suivi des Départs ou Sortie
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
            <AlertDescription>Aucune donnée de départ disponible</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Départs par Mois et QZ
              </h2>
              <div className="w-full h-96 bg-white dark:bg-slate-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Nombre de Départs", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        border: "none",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    {uniqueQZs.map((qz) => (
                      <Bar
                        key={qz}
                        dataKey={qz}
                        fill={qzColors[qz]}
                        name={qz}
                        stackId="a"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Données Détaillées du Recrutement
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">QZ</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Mois</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Sexo</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Contrado</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Département</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Nombre Baja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                          Aucune donnée disponible
                        </td>
                      </tr>
                    ) : (
                      data.map((record, idx) => (
                        <tr
                          key={`${record.qz}-${record.month}-${record.sexo}-${idx}`}
                          className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{record.qz}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Mois {record.month}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.sexo}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.contado}</td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.department}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded font-semibold">
                              {record.nbBaja}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
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
