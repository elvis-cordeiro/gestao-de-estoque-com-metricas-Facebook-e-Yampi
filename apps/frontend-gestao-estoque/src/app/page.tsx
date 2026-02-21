'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function Dashboard() {
  const [instagramMetrics, setInstagramMetrics] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>(null); // dados de vendas
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  // Função para sincronizar Instagram Ads
  const syncInstagram = async () => {
    setSyncLoading(true);
    try {
      const response = await api.get('/sync-instagram-metrics');
      setInstagramMetrics(response.data);
    } catch (error) {
      console.error('Erro ao sincronizar Instagram Ads:', error);
      setInstagramMetrics({ message: 'Erro ao sincronizar' });
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Produtos para estoque/lucro
        const prodResponse = await api.get('/products?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
        setProducts(prodResponse.data);

        // Vendas Hoje
        const salesResponse = await api.get('/sales?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
        setSalesSummary(salesResponse.data);

        // Instagram Ads
        await syncInstagram();
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Cálculos reais
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalLucroEstimado = products.reduce((sum, p) => {
    const cost = parseFloat(p.costPrice) || 0;
    const price = parseFloat(p.sellPrice) || 0;
    const lucroUnitario = price - cost;
    return sum + (lucroUnitario * (p.stock || 0));
  }, 0);

  // Cálculo de margem real (opcional)
  const valorTotalVenda = products.reduce((sum, p) => sum + (parseFloat(p.sellPrice) || 0) * (p.stock || 0), 0);
  const margemReal = valorTotalVenda > 0 ? ((totalLucroEstimado / valorTotalVenda) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Vendas Hoje - real */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Vendas Hoje</h3>
          {loading ? (
            <p className="text-xl">Carregando...</p>
          ) : salesSummary ? (
            <div>
              <p className="text-3xl font-bold text-green-600 mt-2">
                R$ {salesSummary.totalToday?.toFixed(2) || '0,00'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {salesSummary.variationToday ? `${salesSummary.variationToday}% em relação a ontem` : 'Sem variação disponível'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {salesSummary.countToday || 0} vendas
              </p>
            </div>
          ) : (
            <p className="text-xl text-red-600 mt-2">Erro ao carregar vendas</p>
          )}
        </div>

        {/* Lucro Estimado - real, com formato PT-BR */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-700">Lucro Estimado</h3>
        <p className="text-3xl font-bold text-blue-600 mt-2">
          {totalLucroEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Margem real: {margemReal}%
        </p>
      </div>

        {/* Estoque Atual - real */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Estoque Atual</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">
            {totalStock} Prod
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {totalStock < 50 ? `${totalStock} itens com estoque baixo` : 'Estoque saudável'}
          </p>
        </div>

        {/* Instagram Ads - real */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Instagram Ads</h3>
          {loading || syncLoading ? (
            <p className="text-xl text-purple-600">Sincronizando...</p>
          ) : instagramMetrics ? (
            <div className="mt-2">
              <p className="text-2xl font-bold text-purple-600">
                {instagramMetrics.message || 'Dados sincronizados'}
              </p>
              {instagramMetrics.metrics && instagramMetrics.metrics.length > 0 ? (
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <p>Impressões: <span className="font-bold">{instagramMetrics.metrics[0].impressions || 0}</span></p>
                  <p>Cliques: <span className="font-bold">{instagramMetrics.metrics[0].clicks || 0}</span></p>
                  <p>Gasto: <span className="font-bold">R$ {instagramMetrics.metrics[0].spend || 0}</span></p>
                  <p className="text-xs text-gray-500 mt-2">Última sincronização</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 mt-2">Nenhuma métrica nos últimos 30 dias</p>
              )}
            </div>
          ) : (
            <p className="text-xl text-red-600 mt-2">Erro ao carregar</p>
          )}
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="flex space-x-4">
          <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
            Sincronizar Yampi
          </button>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
            Sincronizar Visitas
          </button>
          <button
            onClick={syncInstagram}
            disabled={syncLoading}
            className={`bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 ${syncLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {syncLoading ? 'Sincronizando...' : 'Sincronizar Instagram Ads'}
          </button>
        </div>
      </div>
    </div>
  );
}