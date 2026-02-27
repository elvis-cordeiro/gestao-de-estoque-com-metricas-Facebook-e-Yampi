'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Product {
  id: string;
  name: string;
  costPrice: string;
  sellPrice: string;
  stock: number;
}

interface Sale {
  id: string;
  total: number | string;
  profit?: number; // se o backend retornar lucro por venda, ótimo
}

export default function Lucro() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodResponse = await api.get('/products?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
        setProducts(prodResponse.data);

        const salesResponse = await api.get('/sales?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
        setSales(salesResponse.data);
      } catch (err) {
        setError('Erro ao carregar dados de lucro');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const syncLucro = async () => {
  setSyncLoading(true);
  setSyncMessage(null);
  setError(null);

  try {
    const response = await api.get('/sync-yampi');
    setSyncMessage(response.data.message || 'Atualização de lucro concluída com sucesso!');

    // Recarrega produtos e vendas (mesmo se sync parcial)
    const prodResponse = await api.get('/products?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
    setProducts(prodResponse.data);

    const salesResponse = await api.get('/sales?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
    setSales(salesResponse.data);
  } catch (err: any) {
    console.error('Erro completo no syncLucro:', err);
    setError(
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Falha ao atualizar lucro. Verifique o backend e tente novamente.'
    );
    // Recarrega mesmo em erro (para atualizar se parcial)
    try {
      const prodResponse = await api.get('/products?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
      setProducts(prodResponse.data);
      const salesResponse = await api.get('/sales?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
      setSales(salesResponse.data);
    } catch (refreshErr) {
      console.error('Erro ao recarregar após falha:', refreshErr);
    }
  } finally {
    setSyncLoading(false);
  }
};
  // Cálculos reais
  const totalLucroEstimado = products.reduce((sum, p) => {
    const cost = parseFloat(p.costPrice) || 0;
    const price = parseFloat(p.sellPrice) || 0;
    const lucroUnitario = price - cost;
    return sum + (lucroUnitario * (p.stock || 0));
  }, 0);

  const totalLucroRealizado = sales.reduce((sum, s) => {
    const totalVenda = parseFloat(s.total?.toString() || '0') || 0;
    // Se backend retornar lucro por venda (profit), use s.profit
    // Caso contrário, estimamos lucro como margem média (ex: 63%)
    const margemEstimada = 0.63;
    const lucroEstimadoVenda = totalVenda * margemEstimada;
    return sum + (s.profit || lucroEstimadoVenda);
  }, 0);

  const margemMedia = totalLucroEstimado > 0 ? ((totalLucroEstimado / products.reduce((sum, p) => sum + (parseFloat(p.sellPrice) || 0) * (p.stock || 0), 0)) * 100).toFixed(0) : 0;

  if (loading) return <p className="text-center text-xl mt-10 text-gray-600">Carregando dados de lucro...</p>;
  if (error) return <p className="text-center text-red-600 text-xl mt-10">{error}</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Lucro Estimado e Realizado</h1>
        <button
          onClick={syncLucro}
          disabled={syncLoading}
          className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
            syncLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {syncLoading ? 'Atualizando...' : 'Atualizar Lucro'}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Lucro Estimado */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Lucro Total Estimado</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLucroEstimado)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Se todo estoque for vendido (margem ~{margemMedia}%)
          </p>
        </div>

        {/* Card Lucro Realizado */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Lucro Realizado</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLucroRealizado)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Lucro das vendas sincronizadas até agora
          </p>
        </div>

        {/* Card Margem Média */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-700">Margem Média</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {margemMedia}%
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Média ponderada do estoque atual
          </p>
        </div>
      </div>

      {/* Breakdown por produto (opcional, pode remover se não quiser) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <h2 className="text-xl font-semibold p-6 pb-0">Lucro por Produto (Estimado)</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro Unitário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lucro Total Estimado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const cost = parseFloat(product.costPrice) || 0;
              const price = parseFloat(product.sellPrice) || 0;
              const lucroUnitario = price - cost;
              const lucroTotal = lucroUnitario * product.stock;

              return (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    R$ {lucroUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.stock} un.
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700">
                    R$ {lucroTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}