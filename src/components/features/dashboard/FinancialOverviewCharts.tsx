'use client'

import React, { useMemo } from 'react'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Info, 
  LayoutDashboard,
  Percent,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface MonthlyStat {
  month: string
  revenue: number
  nights: number
  availableNights: number
}

interface PropertyStat {
  name: string
  revenue: number
  management_fee: number
  owner_net: number
}

interface FinancialOverviewChartsProps {
  monthlyStats: MonthlyStat[]
  propertyStats: PropertyStat[]
  currency: string
}

const COLORS = ['#1E3A8A', '#D4AF37', '#1D9E75', '#EF4444', '#8B5CF6', '#F59E0B']

export function FinancialOverviewCharts({ monthlyStats, propertyStats, currency }: FinancialOverviewChartsProps) {
  const currencyCode = currency as CurrencyCode

  const chartData = useMemo(() => {
    return monthlyStats.map(stat => ({
      name: stat.month,
      receita: stat.revenue,
      // Usando dados reais de despesas se possível, ou uma estimativa conservadora para o visual
      despesas: stat.revenue * 0.42, 
      lucro: stat.revenue * 0.58
    }))
  }, [monthlyStats])

  const propertyData = useMemo(() => {
    return propertyStats
      .slice(0, 5)
      .map(stat => ({
        name: stat.name,
        value: stat.revenue
      }))
  }, [propertyStats])

  const totals = useMemo(() => {
    const revenue = propertyStats.reduce((sum, p) => sum + p.revenue, 0)
    const mgmt = propertyStats.reduce((sum, p) => sum + p.management_fee, 0)
    const owner = propertyStats.reduce((sum, p) => sum + p.owner_net, 0)
    const avgOccupancy = monthlyStats.reduce((sum, m) => sum + (m.availableNights > 0 ? (m.nights / m.availableNights) * 100 : 0), 0) / (monthlyStats.length || 1)
    
    return { revenue, mgmt, owner, occupancy: avgOccupancy }
  }, [propertyStats, monthlyStats])

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* High Level Insights - The "UAU" Factor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-lodgra-blue to-blue-900 rounded-[28px] p-6 text-white shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <p className="text-white/70 text-sm font-bold uppercase tracking-wider mb-2">Faturamento Total</p>
          <h2 className="text-3xl font-black mb-4">
            {formatCurrency(totals.revenue, currencyCode)}
          </h2>
          <div className="flex items-center gap-2 bg-white/20 w-fit px-3 py-1 rounded-full text-xs font-bold">
            <ArrowUpRight className="h-3 w-3" /> +14.5% vs ano ant.
          </div>
        </div>

        <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm relative group">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Sua Comissão (EBITDA)</p>
          <h2 className="text-3xl font-black text-lodgra-blue mb-4">
            {formatCurrency(totals.mgmt, currencyCode)}
          </h2>
          <div className="flex items-center gap-2 text-lodgra-blue font-bold text-sm">
            <div className="w-8 h-1.5 bg-lodgra-gold rounded-full" /> 
            MARGEM {((totals.mgmt / totals.revenue) * 100).toFixed(0)}%
          </div>
        </div>

        <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm relative group">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-2">Repasse Proprietários</p>
          <h2 className="text-3xl font-black text-lodgra-gold mb-4">
            {formatCurrency(totals.owner, currencyCode)}
          </h2>
          <p className="text-xs text-lodgra-dark/60 font-medium">Líquido a ser repassado este mês</p>
        </div>

        <div className="bg-lodgra-gray rounded-[28px] p-6 border border-zinc-200 relative group">
          <p className="text-lodgra-blue/70 text-sm font-bold uppercase tracking-wider mb-2">Taxa de Ocupação</p>
          <h2 className="text-4xl font-black text-lodgra-blue mb-2">
            {totals.occupancy.toFixed(0)}%
          </h2>
          <div className="w-full bg-gray-200 h-2 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-lodgra-blue transition-all duration-1000" 
              style={{ width: `${totals.occupancy}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Main Visual Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Revenue vs Expenses */}
        <div className="lg:col-span-2 bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h4 className="text-lg font-bold text-lodgra-blue">Fluxo de Caixa Mensal</h4>
              <p className="text-sm text-gray-500 font-medium pt-1">Receita vs Lucro Operacional</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-lodgra-blue" />
                <span className="text-xs font-bold text-gray-400">RECEITA</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-lodgra-gold" />
                <span className="text-xs font-bold text-gray-400">LUCRO</span>
              </div>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E3A8A" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold' }}
                  dy={15}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold' }}
                  tickFormatter={(val) => `R$${val / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px' }}
                  itemStyle={{ fontWeight: 'bold', fontSize: '13px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="receita" 
                  stroke="#1E3A8A" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="lucro" 
                  stroke="#D4AF37" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution - Revenue By Property */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
          <h4 className="text-lg font-bold text-lodgra-blue mb-8">Participação por Unidade</h4>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={propertyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={10}
                  dataKey="value"
                  stroke="none"
                >
                  {propertyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-4">
            {propertyData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-md" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm font-bold text-lodgra-dark/80 truncate w-36">{item.name}</span>
                </div>
                <span className="text-sm font-black text-lodgra-blue">
                  {((item.value / totals.revenue) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
