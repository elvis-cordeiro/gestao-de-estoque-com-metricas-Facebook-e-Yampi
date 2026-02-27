'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

// Tipagem flexível (aceita qualquer campo que venha do backend)
interface Sale {
  id: string;
  createdAt: string;
  [key: string]: any; // permite qualquer outro campo (total, total_amount, status, etc.)
}

export default function Vendas() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await api.get('/sales?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
        setSales(response.data || []);
      } catch (err) {
        setError('Erro ao carregar vendas');
        console.error('Erro no fetch de vendas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  const syncSales = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    setError(null);

    try {
      const response = await api.get('/sync-yampi');
      setSyncMessage(response.data.message || 'Sincronização de vendas concluída!');

      const refreshed = await api.get('/sales?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
      setSales(refreshed.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Falha ao sincronizar vendas');
      console.error('Erro no sync de vendas:', err);
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return <p className="text-center text-xl mt-10 text-gray-600">Carregando vendas...</p>;
  }

  if (error && sales.length === 0) {
    return <p className="text-center text-red-600 text-xl mt-10">{error}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Vendas Sincronizadas</h1>
        <button
          onClick={syncSales}
          disabled={syncLoading}
          className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
            syncLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {syncLoading ? 'Sincronizando...' : 'Sincronizar Vendas'}
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

      {sales.length === 0 ? (
        <p className="text-center text-gray-600 text-xl py-20">
          Nenhuma venda encontrada. Clique em "Sincronizar Vendas" para atualizar.
        </p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Nº</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Itens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale, index) => {
                // Total: tenta vários nomes comuns + fallback 0
                const totalRaw = sale.total ?? sale.total_amount ?? sale.amount ?? sale.grand_total ?? sale.value ?? 0;
                const total = parseFloat(totalRaw.toString()) || 0;

                return (
                  <tr key={sale.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('pt-BR') : 'Data desconhecida'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.id ? sale.id.substring(0, 8) + '...' : 'ID desconhecido'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customerName || sale.customer_name || 'Cliente não identificado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.itemsCount ?? sale.quantity ?? sale.items?.length ?? '?'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        sale.status === 'paid' || sale.status === 'Pago' ? 'bg-green-100 text-green-800' :
                        sale.status === 'pending' || sale.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sale.status || 'Desconhecido'}
                      </span>
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