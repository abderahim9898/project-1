import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { ArrowLeft, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DeparteursRecord {
  qz: string;
  month: string | number;
  sexo: string;
  department: string;
  contado: string;
  nbBaja: number;
}

interface MonthData {
  month: string | number;
  [key: string]: string | number;
}

export default function Departeurs() {
  const [data, setData] = useState<DeparteursRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [filterContrado, setFilterContrado] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeparteursData = async () => {
      try {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        console.log("Fetching departeurs data...");
        const response = await fetch("/api/depateurs", {
          signal: controller.signal,
          headers: { "Accept": "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch departeurs data: ${response.status}`);
        }

        const rawData = await response.json();
        console.log("Departeurs data received:", rawData);

        if (Array.isArray(rawData) && rawData.length > 1) {
          const processedData: DeparteursRecord[] = [];

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

          console.log("Processed departeurs records:", processedData.length);
          setData(processedData);
        } else {
          console.warn("No departeurs data received from server");
          setData([]);
        }
      } catch (err) {
        console.error("Error fetching departeurs data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load departeurs data";
        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeparteursData();
  }, [retryKey]);

  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.department))).sort();
  }, [data]);

  const uniqueContrados = useMemo(() => {
    return Array.from(new Set(data.map((r) => r.contado))).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((record) => {
      if (filterDepartment && record.department !== filterDepartment) return false;
      if (filterContrado && record.contado !== filterContrado) return false;
      return true;
    });
  }, [data, filterDepartment, filterContrado]);

  const uniqueQZs = useMemo(() => {
    return Array.from(new Set(filteredData.map((r) => r.qz))).sort();
  }, [filteredData]);

  const sortedAndGroupedData = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
      const monthA = parseInt(String(a.month)) || 0;
      const monthB = parseInt(String(b.month)) || 0;
      if (monthA !== monthB) return monthA - monthB;

      if (a.qz !== b.qz) return a.qz.localeCompare(b.qz);

      if (a.sexo !== b.sexo) return a.sexo.localeCompare(b.sexo);

      return a.contado.localeCompare(b.contado);
    });

    const grouped = new Map<string, Map<string, Map<string, DeparteursRecord[]>>>();

    sorted.forEach((record) => {
      const monthKey = String(record.month);
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, new Map());
      }

      const monthGroup = grouped.get(monthKey)!;
      if (!monthGroup.has(record.qz)) {
        monthGroup.set(record.qz, new Map());
      }

      const qzGroup = monthGroup.get(record.qz)!;
      if (!qzGroup.has(record.sexo)) {
        qzGroup.set(record.sexo, []);
      }

      qzGroup.get(record.sexo)!.push(record);
    });

    return { sorted, grouped };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const monthMap = new Map<string | number, MonthData>();

    for (let i = 1; i <= 12; i++) {
      const monthData: MonthData = { month: `Mois ${i}` };
      uniqueQZs.forEach((qz) => {
        monthData[qz] = 0;
      });
      monthMap.set(i, monthData);
    }

    filteredData.forEach((record) => {
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
  }, [filteredData, uniqueQZs]);

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const qzColors = uniqueQZs.reduce(
    (acc, qz, idx) => {
      acc[qz] = colors[idx % colors.length];
      return acc;
    },
    {} as Record<string, string>
  );

  const summaryStats = useMemo(() => {
    const totalDepartures = filteredData.reduce((sum, r) => sum + r.nbBaja, 0);
    const uniqueMonths = new Set(filteredData.map((r) => r.month)).size;
    const departuresByGender = new Map<string, number>();
    const departuresByDepartment = new Map<string, number>();

    filteredData.forEach((record) => {
      departuresByGender.set(record.sexo, (departuresByGender.get(record.sexo) || 0) + record.nbBaja);
      departuresByDepartment.set(record.department, (departuresByDepartment.get(record.department) || 0) + record.nbBaja);
    });

    // Count QZ occurrences per month
    const qzPerMonth = new Map<string | number, Set<string>>();
    filteredData.forEach((record) => {
      if (!qzPerMonth.has(record.month)) {
        qzPerMonth.set(record.month, new Set());
      }
      qzPerMonth.get(record.month)!.add(record.qz);
    });

    // Calculate average per QZ based on actual QZ occurrences per month
    let totalQZCount = 0;
    qzPerMonth.forEach((qzSet) => {
      totalQZCount += qzSet.size;
    });

    const avgPerQZ = totalQZCount > 0 ? Math.round(totalDepartures / totalQZCount) : 0;
    const avgPerMonth = uniqueMonths > 0 ? Math.round(totalDepartures / uniqueMonths) : 0;

    return {
      totalDepartures,
      avgPerQZ,
      avgPerMonth,
      totalMonths: uniqueMonths,
      departuresByGender: Array.from(departuresByGender.entries()).sort((a, b) => b[1] - a[1]),
      departuresByDepartment: Array.from(departuresByDepartment.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [filteredData]);

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📤 Départeurs
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
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filtres</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Département</label>
                  <select
                    value={filterDepartment || ""}
                    onChange={(e) => setFilterDepartment(e.target.value ? e.target.value : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous les départements</option>
                    {uniqueDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contrat</label>
                  <select
                    value={filterContrado || ""}
                    onChange={(e) => setFilterContrado(e.target.value ? e.target.value : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tous les contrats</option>
                    {uniqueContrados.map((contrado) => (
                      <option key={contrado} value={contrado}>
                        {contrado}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(filterDepartment || filterContrado) && (
                <button
                  onClick={() => {
                    setFilterDepartment(null);
                    setFilterContrado(null);
                  }}
                  className="mt-4 px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Départs</h3>
                <p className="text-4xl font-bold text-red-600">{summaryStats.totalDepartures}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Moyenne par QZ</h3>
                <p className="text-4xl font-bold text-blue-600">{summaryStats.avgPerQZ}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Moyenne par Mois</h3>
                <p className="text-4xl font-bold text-green-600">{summaryStats.avgPerMonth}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Mois</h3>
                <p className="text-4xl font-bold text-orange-600">{summaryStats.totalMonths}</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Départs par Genre</h3>
                <div className="space-y-2">
                  {summaryStats.departuresByGender.map(([gender, count]) => (
                    <div key={gender} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{gender === "H" ? "Hommes" : "Femmes"}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Départs par Département</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {summaryStats.departuresByDepartment.slice(0, 5).map(([dept, count]) => (
                    <div key={dept} className="flex justify-between items-center">
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{dept}</span>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{count}</span>
                    </div>
                  ))}
                  {summaryStats.departuresByDepartment.length > 5 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-slate-700">
                      +{summaryStats.departuresByDepartment.length - 5} autres
                    </div>
                  )}
                </div>
              </div>
            </div>

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

            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Données Détaillées des Départs
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
                      <th className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">Nombre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                          Aucune donnée ne correspond aux filtres sélectionnés
                        </td>
                      </tr>
                    ) : (() => {
                      const rows: React.ReactNode[] = [];
                      let rowIndex = 0;
                      const monthHeaderRendered = new Set<string>();

                      Array.from(sortedAndGroupedData.grouped.entries()).forEach(([monthKey, monthGroup]) => {
                        Array.from(monthGroup.entries()).forEach(([qz, qzGroup]) => {
                          Array.from(qzGroup.entries()).forEach(([sexo, records]) => {
                            if (!monthHeaderRendered.has(monthKey)) {
                              rows.push(
                                <tr key={`month-${monthKey}-header`} className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-800">
                                  <td colSpan={6} className="px-4 py-3 font-bold text-blue-900 dark:text-blue-100">
                                    📅 Mois {monthKey}
                                  </td>
                                </tr>
                              );
                              monthHeaderRendered.add(monthKey);
                            }

                            rows.push(
                              <tr key={`qz-${monthKey}-${qz}-${sexo}-header`} className="bg-gray-100 dark:bg-slate-700 border-b border-gray-300 dark:border-slate-600">
                                <td colSpan={6} className="px-4 py-2 font-semibold text-gray-800 dark:text-gray-200 text-sm">
                                  └─ {qz} | Sexo: {sexo}
                                </td>
                              </tr>
                            );

                            records.forEach((record) => {
                              rows.push(
                                <tr
                                  key={`row-${rowIndex++}`}
                                  className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{record.qz}</td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Mois {record.month}</td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.sexo}</td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.contado}</td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{record.department}</td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded font-semibold">
                                      {record.nbBaja}
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          });
                        });
                      });

                      return rows;
                    })()}
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
