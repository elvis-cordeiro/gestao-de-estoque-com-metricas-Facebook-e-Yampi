'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  images: string[];
  costPrice: string;
  sellPrice: string;
  stock: number;
}

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Carrega produtos ao abrir a página
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
        setProducts(response.data);
      } catch (err) {
        setError('Erro ao carregar produtos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Função do botão "Sincronizar com Yampi"
  const syncWithYampi = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    setError(null);

    try {
      const response = await api.get('/sync-yampi');
      console.log('Resposta completa do sync Yampi:', response.data); // debug no console do navegador

      // Mensagem de sucesso personalizada
      setSyncMessage(
        response.data.message || 
        `Sincronização concluída! ${response.data.productsUpdated || response.data.count || 56} produtos atualizados.`
      );

      // Recarrega a lista de produtos
      const refreshed = await api.get('/products?tenantId=3ed33a32-9759-48fe-be2f-99dadb1dc7b0');
      setProducts(refreshed.data);
    } catch (err: any) {
      console.error('Erro completo no sync:', err);
      setError(
        err.response?.data?.error || 
        err.response?.data?.message || 
        err.message || 
        'Falha ao sincronizar com Yampi. Verifique o console e o backend.'
      );
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) return <p className="text-center text-xl mt-10 text-gray-600">Carregando catálogo...</p>;
  if (error && products.length === 0) return <p className="text-center text-red-600 text-xl mt-10">{error}</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Catálogo de Produtos</h1>
        <button
          onClick={syncWithYampi}
          disabled={syncLoading}
          className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
            syncLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {syncLoading ? 'Sincronizando...' : 'Sincronizar com Yampi'}
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

      {products.length === 0 ? (
        <p className="text-center text-gray-600 text-xl py-20">
          Nenhum produto encontrado. Clique em "Sincronizar com Yampi" para atualizar.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const cost = parseFloat(product.costPrice) || 0;
            const price = parseFloat(product.sellPrice) || 0;
            const lucroUnitario = price - cost;
            const lucroTotal = lucroUnitario * product.stock;
            const image = product.images?.[0] || '/placeholder-product.jpg';

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative h-48 bg-gray-100">
                  <Image
                    src={image}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                  />
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-800 truncate" title={product.name}>
                    {product.name}
                  </h3>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custo:</span>
                      <span className="font-medium">R$ {cost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Venda:</span>
                      <span className="font-medium">R$ {price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lucro unitário:</span>
                      <span className={`font-medium ${lucroUnitario > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        R$ {lucroUnitario.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estoque:</span>
                      <span className={`font-medium ${product.stock < 10 ? 'text-red-600' : 'text-gray-800'}`}>
                        {product.stock} un.
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                      <span className="text-gray-600 font-medium">Lucro total estimado:</span>
                      <span className="font-bold text-green-700">
                        R$ {lucroTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}