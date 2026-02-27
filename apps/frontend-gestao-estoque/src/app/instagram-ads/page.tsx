'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

// Tipagem flexível para evitar erros de TS
interface Metric {
  id: string;
  date: string;
  impressions: number | string;
  clicks: number | string;
  spend: number | string;
  ctr?: number | string;
  roas?: number | string;
}

export default function InstagramAds() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get('/sync-instagram-metrics');
        setMetrics(response.data.metrics || response.data || []);
      } catch (err) {
        setError('Erro ao carregar métricas do Instagram Ads');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const syncInstagram = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    setError(null);

    try {
      const response = await api.get('/sync-instagram-metrics');
      setSyncMessage(response.data.message || 'Sincronização de Instagram Ads concluída!');

      const refreshed = await api.get('/sync-instagram-metrics');
      setMetrics(refreshed.data.metrics || refreshed.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha ao sincronizar Instagram Ads');
      console.error(err);
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) return <p className="text-center text-xl mt-10 text-gray-600">Carregando métricas...</p>;
  if (error && metrics.length === 0) return <p className="text-center text-red-600 text-xl mt-10">{error}</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Instagram Ads - Histórico</h1>
        <button
          onClick={syncInstagram}
          disabled={syncLoading}
          className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
            syncLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {syncLoading ? 'Sincronizando...' : 'Sincronizar Instagram Ads'}
        </button>
      </div>

      {syncMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
          {syncMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      {metrics.length === 0 ? (
        <p className="text-center text-gray-600 text-xl py-20">
          Nenhuma métrica sincronizada. Clique em "Sincronizar Instagram Ads" para atualizar.
        </p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressões</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliques</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gasto (R$)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTR (%)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROAS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((metric, index) => {
                // Converte tudo para número com fallback
                const impressions = parseInt(metric.impressions?.toString() || '0', 10) || 0;
                const clicks = parseInt(metric.clicks?.toString() || '0', 10) || 0;
                const spend = parseFloat(metric.spend?.toString() || '0') || 0;

                const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
                const roas = spend > 0 ? (clicks / spend).toFixed(2) : '0.00';

                return (
                  <tr key={metric.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(metric.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {impressions.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {clicks.toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(spend)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ctr}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {roas}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}