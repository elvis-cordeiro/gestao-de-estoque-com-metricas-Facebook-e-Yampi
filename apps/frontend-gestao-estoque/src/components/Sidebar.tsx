import { LayoutDashboard, Package, ShoppingCart, DollarSign, Eye, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestão King</h1>
      </div>
      <nav className="mt-6">
        <ul className="space-y-1 px-3">
          <li>
            <Link href="/" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard
            </Link>
          </li>
          <li>
            <Link href="/produtos" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              <Package className="mr-3 h-5 w-5" />
              Produtos
            </Link>
          </li>
          <li>
            <Link href="/vendas" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              <ShoppingCart className="mr-3 h-5 w-5" />
              Vendas
            </Link>
          </li>
          <li>
            <Link href="/lucro" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              <DollarSign className="mr-3 h-5 w-5" />
              Lucro
            </Link>
          </li>
          <li>
            <Link href="/visitas" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              <Eye className="mr-3 h-5 w-5" />
              Visitas
            </Link>
          </li>
          <li>
            <Link href="/instagram-ads" className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md">
              <BarChart3 className="mr-3 h-5 w-5" />
              Instagram Ads
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}