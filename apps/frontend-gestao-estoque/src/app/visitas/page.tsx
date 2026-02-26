'use client';

import { useEffect, useState } from 'react';

interface ClarityMetric {
  metricName: string;
  information: Array<{
    sessionsCount: string;
    sessionsWithMetricCount?: string;
    sessionsWithMetricPercentage?: string;
    sessionsWithoutMetricCount?: string;
    sessionsWithoutMetricPercentage?: string;
    pagesViews?: string;
    subTotal?: string;
    [key: string]: any;
  }>;
}

const metricTranslations: Record<string, { title: string; mainLabel: string }> = {
  DeadClickCount: { title: 'Cliques Mortos (Dead Clicks)', mainLabel: 'Quantidade de Cliques Mortos' },
  ExcessiveScroll: { title: 'Scroll Excessivo', mainLabel: 'Sessões com Scroll Excessivo' },
  RageClickCount: { title: 'Cliques de Raiva (Rage Clicks)', mainLabel: 'Quantidade de Cliques de Raiva' },
  QuickbackClick: { title: 'Cliques de Volta Rápida', mainLabel: 'Quantidade de Volta Rápida' },
  ScriptErrorCount: { title: 'Erros de Script', mainLabel: 'Quantidade de Erros de Script' },
  ErrorClickCount: { title: 'Cliques com Erro', mainLabel: 'Quantidade de Cliques com Erro' },
  ScrollDepth: { title: 'Profundidade de Scroll', mainLabel: 'Profundidade Média de Scroll' },
  Traffic: { title: 'Tráfego', mainLabel: 'Sessões Totais de Tráfego' },
  EngagementTime: { title: 'Tempo de Engajamento', mainLabel: 'Tempo Médio de Engajamento' },
  DeadClickPercentage: { title: 'Porcentagem de Cliques Mortos', mainLabel: 'Porcentagem' },
  // Adicione mais conforme aparecer na resposta do seu API
};

export default function Visitas() {
  const [insights, setInsights] = useState<ClarityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clarityDashboardUrl = 'https://clarity.microsoft.com/projects/vizt7j97r7/dashboard?...'; // seu link completo
  const umamiUrl = 'https://umami-ruddy-nu.vercel.app/share/zS8mKi0JNz7iHrQ9';

  useEffect(() => {
    const fetchClarityInsights = async () => {
      try {
        const res = await fetch('http://localhost:5000/clarity/live-insights');
        if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
        const data = await res.json();
        setInsights(data.data || data || []);
      } catch (err: any) {
        console.error('Erro ao carregar insights:', err);
        setError('Não foi possível carregar os dados do Clarity. Verifique se o backend está rodando ou tente os links abaixo.');
      } finally {
        setLoading(false);
      }
    };

    fetchClarityInsights();
  }, []);

  const getTranslatedTitle = (metricName: string) => {
    return metricTranslations[metricName]?.title || metricName.replace(/([A-Z])/g, ' $1').trim();
  };

  const getMainValue = (metric: ClarityMetric) => {
    const info = metric.information?.[0];
    if (!info) return '0';

    // Prioriza campos comuns em PT-BR
    return info.sessionsCount ||
           info.pagesViews ||
           info.subTotal ||
           info.sessionsWithMetricPercentage + '%' ||
           '0';
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Visitas e Tráfego</h1>
        <div className="space-x-4">
          <a
            href={clarityDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Abrir Dashboard Clarity Completo
          </a>
          <a
            href={umamiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Abrir Dashboard Umami
          </a>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border p-10 text-center min-h-[400px] flex flex-col items-center justify-center">
          <p className="text-xl">Carregando métricas do Clarity...</p>
          <p className="text-sm mt-2">Puxando dados reais das últimas 24h via sua API</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-xl font-medium text-red-700">{error}</p>
          <p className="mt-4">Use os botões acima para acessar os dashboards diretamente.</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-xl font-medium text-yellow-700">Sem dados recentes ainda</p>
          <p className="mt-2">
            Visite seu site algumas vezes (clique, scroll, navegue) e recarregue a página em 5-30 min. 
            O Clarity precisa de tráfego real pra mostrar números!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {insights.map((metric, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {getTranslatedTitle(metric.metricName)}
              </h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex justify-between">
                  <span>Sessões Totais:</span>
                  <span className="font-bold">{metric.information?.[0]?.sessionsCount || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valor Principal:</span>
                  <span className="font-bold text-blue-600">{getMainValue(metric)}</span>
                </div>
                {metric.information?.[0]?.pagesViews && (
                  <div className="flex justify-between">
                    <span>Páginas Vistas:</span>
                    <span className="font-bold">{metric.information[0].pagesViews}</span>
                  </div>
                )}
                {metric.information?.[0]?.sessionsWithMetricPercentage && (
                  <div className="flex justify-between">
                    <span>Porcentagem com Métrica:</span>
                    <span className="font-bold">{metric.information[0].sessionsWithMetricPercentage}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Dicas para Ver Dados Reais</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>Visite o site agora mesmo em outra aba e interaja (clique rápido pra gerar rage clicks, scroll longo, etc.).</li>
          <li>Recarregue esta página após alguns minutos — os valores vão atualizar!</li>
          <li>No Clarity completo: Veja heatmaps, gravações de sessão e mais detalhes.</li>
          <li>Próximo: Podemos adicionar gráficos bonitos com Chart.js ou integrar vendas do Yampi aqui.</li>
        </ul>
      </div>
    </div>
  );
}