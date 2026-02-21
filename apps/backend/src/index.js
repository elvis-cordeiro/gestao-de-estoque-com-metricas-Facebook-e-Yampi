// src/index.js
import 'dotenv/config';  // Carrega .env automaticamente

import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import axios from 'axios';
import cron from 'node-cron';

// Debug: Mostra se a URL foi lida
console.log('DATABASE_URL lida do .env:', process.env.DATABASE_URL || 'NÃO DEFINIDA!');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL não está definida no arquivo .env na raiz do projeto!');
}

// Cria o pool de conexão
const pool = new Pool({ connectionString });

// Cria o PrismaClient com o adapter pg
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const app = express();

app.use(cors());
app.use(express.json());

// Função separada para sincronização automática
async function syncYampiProducts() {
  console.log('Iniciando sync automática com Yampi...');

  const YAMPI_ALIAS = 'esportes-mania';
  const YAMPI_USER_TOKEN = process.env.YAMPI_USER_TOKEN;
  const YAMPI_USER_SECRET = process.env.YAMPI_USER_SECRET;

  if (!YAMPI_USER_TOKEN || !YAMPI_USER_SECRET) {
    console.error('Credenciais Yampi não encontradas no .env');
    return;
  }

  const baseUrl = `https://api.dooki.com.br/v2/${YAMPI_ALIAS}/catalog/products`;
  const paramsBase = {
    per_page: 50,
    include: 'skus,images',
    skipCache: true,
  };

  let page = 1;
  let totalPages = 1;
  let syncedCount = 0;
  const errors = [];

  try {
    while (page <= totalPages) {
      const url = `${baseUrl}?${new URLSearchParams({ ...paramsBase, page }).toString()}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'User-Token': YAMPI_USER_TOKEN,
          'User-Secret-Key': YAMPI_USER_SECRET,
        },
      });

      const productsPage = response.data.data || [];
      const meta = response.data.meta?.pagination;
      if (meta) {
        totalPages = meta.total_pages || 1;
      }

      for (const yampiProd of productsPage) {
        try {
          const skuData = yampiProd.skus?.data?.[0];

          const data = {
            externalId: yampiProd.id.toString(),
            name: yampiProd.name,
            slug: yampiProd.slug,
            description: yampiProd.description || null,
            sellPrice: skuData?.price_discount || skuData?.price_sale || 0,
            costPrice: skuData?.price_cost || 0,
            stock: skuData?.total_in_stock || 0,
            externalSku: skuData?.sku || null,
            images: yampiProd.images?.data?.map(img => img.large.url).filter(Boolean) || [],
            lastSyncedAt: new Date(),
          };

          await prisma.product.upsert({
            where: { externalId: data.externalId },
            update: data,
            create: {
              ...data,
              tenantId: "3ed33a32-9759-48fe-be2f-99dadb1dc7b0",
            },
          });

          syncedCount++;
        } catch (innerError) {
          console.error(`Erro no produto ${yampiProd.id}:`, innerError.message);
          errors.push({ productId: yampiProd.id, error: innerError.message });
        }
      }

      page++;
    }

    console.log(`Sync automática concluída: ${syncedCount} produtos sincronizados, ${errors.length} erros`);
    if (errors.length > 0) {
      console.log('Erros detalhados:', errors);
    }

  } catch (error) {
    console.error('Erro grave na sync automática:', error.message || error);
  }
}
// Função separada para sincronização automática de vendas
async function syncYampiOrders() {
  console.log('Iniciando sync automática de vendas Yampi...');

  const YAMPI_ALIAS = 'esportes-mania';
  const YAMPI_USER_TOKEN = process.env.YAMPI_USER_TOKEN;
  const YAMPI_USER_SECRET = process.env.YAMPI_USER_SECRET;

  if (!YAMPI_USER_TOKEN || !YAMPI_USER_SECRET) {
    console.error('Credenciais Yampi não encontradas no .env');
    return;
  }

  const baseUrl = `https://api.dooki.com.br/v2/${YAMPI_ALIAS}/orders`;
  const paramsBase = {
    per_page: 50,
    include: 'items,customer',
  };

  let page = 1;
  let totalPages = 1;
  let syncedCount = 0;
  const errors = [];

  try {
    while (page <= totalPages) {
      const url = `${baseUrl}?${new URLSearchParams({ ...paramsBase, page }).toString()}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'User-Token': YAMPI_USER_TOKEN,
          'User-Secret-Key': YAMPI_USER_SECRET,
        },
      });

      const ordersPage = response.data.data || [];
      const meta = response.data.meta?.pagination;
      if (meta) {
        totalPages = meta.total_pages || 1;
      }

      for (const order of ordersPage) {
        try {
          const externalId = order.id.toString();

          const existing = await prisma.sale.findUnique({ where: { externalId } });
          if (existing) continue;

          const customer = order.customer?.data || {};

          await prisma.sale.create({
            data: {
              externalId,
              total: order.total || 0,
              date: new Date(order.created_at?.date || Date.now()),
              tenantId: "3ed33a32-9759-48fe-be2f-99dadb1dc7b0",
              customerName: customer.name || 'Cliente não identificado',
              customerEmail: customer.email || null,
              status: order.status || 'unknown',
              externalItems: order.items?.data || [],
            },
          });

          for (const item of order.items?.data || []) {
            const productExternalId = item.product_id?.toString();
            if (productExternalId) {
              await prisma.product.updateMany({
                where: { externalId: productExternalId },
                data: { stock: { decrement: item.quantity || 0 } },
              });

              await prisma.stockMovement.create({
                data: {
                  type: 'saida',
                  quantity: -(item.quantity || 0),
                  reason: `Venda Yampi - Pedido ${externalId}`,
                  productId: productExternalId,
                  tenantId: "3ed33a32-9759-48fe-be2f-99dadb1dc7b0",
                },
              });
            }
          }

          syncedCount++;
        } catch (innerError) {
          console.error(`Erro ao sincronizar pedido ${order.id}:`, innerError.message);
          errors.push({ orderId: order.id, error: innerError.message });
        }
      }

      page++;
    }

    console.log(`Sync vendas automática concluída: ${syncedCount} vendas sincronizadas, ${errors.length} erros`);
    if (errors.length > 0) {
      console.log('Erros detalhados:', errors);
    }

  } catch (error) {
    console.error('Erro grave na sync vendas automática:', error.message || error);
  }
}

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Back-end rodando com Prisma e adapter!' });
});

// Rota para listar tenants
app.get('/tenants', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany();
    res.json(tenants);
  } catch (error) {
    console.error('Erro ao listar tenants:', error.message || error);
    res.status(500).json({ error: 'Erro ao listar tenants', details: error.message });
  }
});

// Rota para criar tenant
app.post('/tenants', async (req, res) => {
  try {
    const { name, email, plan } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        email,
        plan: plan || 'basico',
      },
    });

    res.status(201).json(tenant);
  } catch (error) {
    console.error('Erro ao criar tenant:', error.message || error);
    res.status(500).json({ error: 'Erro ao criar tenant', details: error.message });
  }
});

// Rota para criar um produto
app.post('/products', async (req, res) => {
  try {
    const { name, costPrice, sellPrice, stock, size, color, tenantId } = req.body;

    if (!name || !costPrice || !sellPrice || !stock || !tenantId) {
      return res.status(400).json({ error: 'Nome, costPrice, sellPrice, stock e tenantId são obrigatórios' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        costPrice,
        sellPrice,
        stock,
        size,
        color,
        tenantId,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ error: 'Erro ao criar produto', details: error.message });
  }
});

// Rota para listar produtos
app.get('/products', async (req, res) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId é obrigatório para listar produtos' });
    }

    const products = await prisma.product.findMany({
      where: { tenantId },
    });

    res.json(products);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro ao listar produtos', details: error.message });
  }
});

// Rota para sincronizar produtos da Yampi (manual)
app.get('/sync-yampi', async (req, res) => {
  const YAMPI_ALIAS = 'esportes-mania';
  const YAMPI_USER_TOKEN = process.env.YAMPI_USER_TOKEN;
  const YAMPI_USER_SECRET = process.env.YAMPI_USER_SECRET;

  if (!YAMPI_USER_TOKEN || !YAMPI_USER_SECRET) {
    return res.status(500).json({ error: 'Credenciais Yampi não encontradas no .env' });
  }

  const baseUrl = `https://api.dooki.com.br/v2/${YAMPI_ALIAS}/catalog/products`;
  const paramsBase = {
    per_page: 50,
    include: 'skus,images',
    skipCache: true,
  };

  let page = 1;
  let allProducts = [];
  let totalPages = 1;
  let syncedCount = 0;
  const errors = [];

  try {
    while (page <= totalPages) {
      const url = `${baseUrl}?${new URLSearchParams({ ...paramsBase, page }).toString()}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'User-Token': YAMPI_USER_TOKEN,
          'User-Secret-Key': YAMPI_USER_SECRET,
        },
      });

      const productsPage = response.data.data || [];
      allProducts = allProducts.concat(productsPage);

      const meta = response.data.meta?.pagination;
      if (meta) {
        totalPages = meta.total_pages || 1;
      }

      for (const yampiProd of productsPage) {
        try {
          const skuData = yampiProd.skus?.data?.[0];

          const data = {
            externalId: yampiProd.id.toString(),
            name: yampiProd.name,
            slug: yampiProd.slug,
            description: yampiProd.description || null,
            sellPrice: skuData?.price_discount || skuData?.price_sale || 0,
            costPrice: skuData?.price_cost || 0,
            stock: skuData?.total_in_stock || 0,
            externalSku: skuData?.sku || null,
            images: yampiProd.images?.data?.map(img => img.large.url).filter(Boolean) || [],
            lastSyncedAt: new Date(),
          };

          await prisma.product.upsert({
            where: { externalId: data.externalId },
            update: data,
            create: {
              ...data,
              tenantId: "3ed33a32-9759-48fe-be2f-99dadb1dc7b0",
            },
          });

          syncedCount++;
        } catch (innerError) {
          console.error(`Erro no produto ${yampiProd.id}:`, innerError.message);
          errors.push({ productId: yampiProd.id, error: innerError.message });
        }
      }

      page++;
    }

    console.log(`Sync manual concluída: ${syncedCount} produtos sincronizados, ${errors.length} erros`);

    res.status(200).json({
      message: 'Sincronização completa de todas as páginas',
      totalProdutosRecebidos: allProducts.length,
      syncedCount,
      totalPagesProcessadas: page - 1,
      errors: errors.length > 0 ? errors : undefined,
      sampleProducts: allProducts.slice(0, 3).map(p => ({
        name: p.name,
        stock: p.skus?.data?.[0]?.total_in_stock || 0,
        sellPrice: p.skus?.data?.[0]?.price_discount || 0,
        primeiraImagem: p.images?.data?.[0]?.large?.url || null
      }))
    });
  } catch (error) {
    console.error('Erro na Yampi/Prisma:', error.message || error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Falha na sincronização completa',
        details: error.response?.data || error.message || error.toString(),
      });
    }
  }
});

// Rota para calcular custos/lucro
app.get('/calculate-profit', async (req, res) => {
  try {
    const { tenantId, productId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId é obrigatório' });
    }

    let products;
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId, tenantId },
      });
      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      products = [product];
    } else {
      products = await prisma.product.findMany({
        where: { tenantId },
      });
    }

    const profits = products.map(prod => ({
      productId: prod.id,
      name: prod.name,
      costPrice: prod.costPrice,
      sellPrice: prod.sellPrice,
      stock: prod.stock,
      profitPerUnit: (prod.sellPrice - prod.costPrice).toFixed(2),
      totalEstimatedProfit: ((prod.sellPrice - prod.costPrice) * prod.stock).toFixed(2),
    }));

    res.json({
      message: 'Cálculo de custos/lucro concluído',
      totalProducts: products.length,
      profits,
    });
  } catch (error) {
    console.error('Erro na calculadora de custos:', error.message);
    res.status(500).json({ error: 'Falha no cálculo', details: error.message });
  }
});

// ==================== CRON AUTOMÁTICO ====================

// Sync produtos: todo dia às 03:00
cron.schedule('* * * * *', async () => {
  console.log('🔄 [CRON] Sync produtos Yampi às 03:00');
  await syncYampiProducts();
}, { timezone: "America/Sao_Paulo" });

// Sync vendas: todo dia às 04:00 (depois dos produtos)
cron.schedule('0 4 * * *', async () => {
  console.log('🔄 [CRON] Sync vendas Yampi às 04:00');
  await syncYampiOrders();
}, { timezone: "America/Sao_Paulo" });


// Teste rápido (comente depois)
// cron.schedule('*/5 * * * *', async () => {
//   console.log('🔄 [TESTE] Sync Clarity a cada 5 min');
//   await syncClarityVisits();
// }, { timezone: "America/Sao_Paulo" });
// Desconectar ao fechar o servidor

// Teste rápido (comente depois)
// cron.schedule('*/5 * * * *', async () => {
//   console.log('🔄 [TESTE] Sync vendas a cada 5 min');
//   await syncYampiOrders();
// }, { timezone: "America/Sao_Paulo" });

// ==================== TESTE RÁPIDO (COMENTE DEPOIS) ====================
// Para testar a cada 5 minutos durante desenvolvimento:
// cron.schedule('*/5 * * * *', async () => {
//   console.log('🔄 [TESTE] Sync a cada 5 minutos às', new Date().toLocaleString('pt-BR'));
//   await syncYampiProducts();
// }, { timezone: "America/Sao_Paulo" });

// ========================================================
// ========================================================
// ROTA PARA SINCRO DE MÉTRICAS DO INSTAGRAM ADS (FACEBOOK ADS)
// ========================================================

// Função para sincronizar métricas
async function syncInstagramMetrics() {
  console.log('Iniciando sync de métricas Instagram Ads...');

  const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
  const AD_ACCOUNT_ID = process.env.FACEBOOK_AD_ACCOUNT_ID;

  if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
    console.error('Credenciais Facebook Ads não encontradas no .env');
    return;
  }

  try {
    const response = await axios.get(`https://graph.facebook.com/v20.0/${AD_ACCOUNT_ID}/insights`, {
      params: {
        access_token: ACCESS_TOKEN,
        fields: 'campaign_name,adset_name,ad_name,impressions,reach,clicks,spend,inline_link_clicks,cpm,cpc,ctr,objective,date_start,date_stop',
        date_preset: 'this_year',  // todo o historico (pode mudar para 'last_7d', 'this_month')
        level: 'ad',  // pode mudar para 'campaign' ou 'adset'
        time_increment: '1',  // dados por dia
      },
    });

    const metrics = response.data.data || [];

    // Salva cada métrica no banco (model Metric)
    for (const metric of metrics) {
      await prisma.metric.create({
        data: {
          type: 'instagram_ads',
          data: metric,
          date: new Date(metric.date_start || new Date()),
          tenantId: "3ed33a32-9759-48fe-be2f-99dadb1dc7b0",
        },
      });
    }

    console.log(`Sync Instagram Ads concluída: ${metrics.length} métricas capturadas`);
  } catch (error) {
    console.error('Erro na sync Instagram Ads:', error.response?.data || error.message);
  }
}

// Rota manual para testar (GET /sync-instagram-metrics)
app.get('/sync-instagram-metrics', async (req, res) => {
  try {
    await syncInstagramMetrics(); // executa a sincronização

    // Busca as métricas mais recentes salvas no banco
    const latestMetrics = await prisma.metric.findFirst({
      where: { type: 'instagram_ads' },
      orderBy: { date: 'desc' },
    });

    res.status(200).json({
      message: 'Sincronização de métricas Instagram Ads manual concluída',
      metrics: latestMetrics ? latestMetrics.data : [], // retorna o array real de métricas
    });
  } catch (error) {
    res.status(500).json({ error: 'Falha na sync Instagram Ads', details: error.message });
  }
});

// Cron automático (todo dia às 08:00)
cron.schedule('0 8 * * *', async () => {
  console.log('🔄 [CRON] Sync Instagram Ads às 08:00');
  await syncInstagramMetrics();
}, { timezone: "America/Sao_Paulo" });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor back-end rodando na porta ${PORT}`);
});
// ========================================================
// NOVA ROTA: Sincronizar vendas/pedidos da Yampi (GET /sync-yampi-orders)
// ========================================================

app.get('/sync-yampi-orders', async (req, res) => {
  const YAMPI_ALIAS = 'esportes-mania';
  const YAMPI_USER_TOKEN = process.env.YAMPI_USER_TOKEN;
  const YAMPI_USER_SECRET = process.env.YAMPI_USER_SECRET;

  if (!YAMPI_USER_TOKEN || !YAMPI_USER_SECRET) {
    return res.status(500).json({ error: 'Credenciais Yampi não encontradas no .env' });
  }

  const baseUrl = `https://api.dooki.com.br/v2/${YAMPI_ALIAS}/orders`;
  const paramsBase = {
    per_page: 50,
    include: 'items,customer',
  };

  let page = 1;
  let totalPages = 1;
  let syncedCount = 0;
  const errors = [];

  try {
    while (page <= totalPages) {
      const url = `${baseUrl}?${new URLSearchParams({ ...paramsBase, page }).toString()}`;

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'User-Token': YAMPI_USER_TOKEN,
          'User-Secret-Key': YAMPI_USER_SECRET,
        },
      });

      const ordersPage = response.data.data || [];
      const meta = response.data.meta?.pagination;
      if (meta) {
        totalPages = meta.total_pages || 1;
      }

      for (const order of ordersPage) {
        try {
          const externalId = order.id.toString();

          // Evita duplicatas
          const existing = await prisma.sale.findUnique({ where: { externalId } });
          if (existing) continue;

          const customer = order.customer?.data || {};

          await prisma.sale.create({
            data: {
              externalId,
              total: order.total || 0,
              date: new Date(order.created_at?.date || Date.now()),
              tenantId: "3ed33a32-9759-48fe-be2f-99dadb1dc7b0",
              customerName: customer.name || 'Cliente não identificado',
              customerEmail: customer.email || null,
              status: order.status || 'unknown',
              externalItems: order.items?.data || [],
            },
          });

          // Baixa estoque
          for (const item of order.items?.data || []) {
            const productExternalId = item.product_id?.toString();
            if (productExternalId) {
              await prisma.product.updateMany({
                where: { externalId: productExternalId },
                data: { stock: { decrement: item.quantity || 0 } },
              });

              await prisma.stockMovement.create({
                data: {
                  type: 'saida',
                  quantity: -(item.quantity || 0),
                  reason: `Venda Yampi - Pedido ${externalId}`,
                  productId: productExternalId,
                  tenantId: "3ed33a32-9759-48fe-be2f-99dadb1dc7b0",
                },
              });
            }
          }

          syncedCount++;
        } catch (innerError) {
          console.error(`Erro ao sincronizar pedido ${order.id}:`, innerError.message);
          errors.push({ orderId: order.id, error: innerError.message });
        }
      }

      page++;
    }

    res.status(200).json({
      message: 'Sincronização de vendas da Yampi concluída',
      syncedCount,
      totalPagesProcessadas: page - 1,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Erro na sync de vendas Yampi:', error.message || error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Falha na sincronização de vendas',
        details: error.response?.data || error.message || error.toString(),
      });
    }
  }
});
// Rota para listar vendas de um tenant (GET /sales?tenantId=uuid)
app.get('/sales', async (req, res) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId é obrigatório para listar vendas' });
    }

    const sales = await prisma.sale.findMany({
      where: { tenantId },
      include: { items: true }, // inclui os itens da venda (SaleItem)
      orderBy: { date: 'desc' }, // mais recente primeiro
    });

    res.json(sales);
  } catch (error) {
    console.error('Erro ao listar vendas:', error.message || error);
    res.status(500).json({ error: 'Erro ao listar vendas', details: error.message });
  }
});

// Rota para atualizar um produto (PUT /products/:id)
app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, costPrice, sellPrice, stock, size, color, tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId é obrigatório' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        costPrice,
        sellPrice,
        stock,
        size,
        color,
        tenantId,
      },
    });

    res.json(product);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto', details: error.message });
  }
});

// Rota para deletar um produto
app.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id },
    });

    res.status(204).send(); // 204 No Content
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    res.status(500).json({ error: 'Erro ao deletar produto', details: error.message });
  }
});

// Rota para registrar uma venda (PDV básico)
app.post('/sales', async (req, res) => {
  try {
    const { tenantId, items } = req.body; // items: array de { productId, quantity }

    if (!tenantId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'tenantId e items (array) são obrigatórios' });
    }

    let total = 0;
    const saleItemsData = [];

    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Cada item precisa de productId e quantity > 0' });
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return res.status(404).json({ error: `Produto ${productId} não encontrado` });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ error: `Estoque insuficiente para ${product.name}` });
      }

      const priceAtSale = product.sellPrice;
      total += priceAtSale * quantity;

      saleItemsData.push({
        quantity,
        priceAtSale,
        productId,
      });

      // Atualiza estoque
      await prisma.product.update({
        where: { id: productId },
        data: { stock: product.stock - quantity },
      });

      // Registra movimentação de estoque
      await prisma.stockMovement.create({
        data: {
          type: 'saida',
          quantity: -quantity,
          reason: 'Venda',
          productId,
          tenantId,
        },
      });
    }

    // Cria a venda
    const sale = await prisma.sale.create({
      data: {
        total,
        tenantId,
        items: {
          create: saleItemsData,
        },
      },
      include: { items: true },
    });

    res.status(201).json(sale);
  } catch (error) {
    console.error('Erro ao registrar venda:', error);
    res.status(500).json({ error: 'Erro ao registrar venda', details: error.message });
  }
});
