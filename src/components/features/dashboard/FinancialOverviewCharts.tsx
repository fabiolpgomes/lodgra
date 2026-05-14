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
} from 'recharts'
import {
  ArrowUpRight,
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
  totalsByCurrency: Record<string, { revenue: number; mgmt: number; owner: number }>
  yoyPercentage?: number
}

const COLORS = ['#1E3A8A', '#D4AF37', '#1D9E75', '#EF4444', '#8B5CF6', '#F59E0B']

export function FinancialOverviewCharts({ monthlyStats, propertyStats, totalsByCurrency, yoyPercentage = 14.5 }: FinancialOverviewChartsProps) {
  const chartData = useMemo(() => {
    return monthlyStats.map(stat => ({
      name: stat.month,
      receita: stat.revenue,
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

  const avgOccupancy = useMemo(() => {
    return monthlyStats.reduce((sum, m) => sum + (m.availableNights > 0 ? (m.nights / m.availableNights) * 100 : 0), 0) / (monthlyStats.length || 1)
  }, [monthlyStats])

  const totalRevenueAggregate = useMemo(() => {
    return Object.values(totalsByCurrency).reduce((sum, data) => sum + data.revenue, 0)
  }, [totalsByCurrency])

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* High Level Insights - The "UAU" Factor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 relative overflow-hidden group border rounded-none shadow-none" style={{ backgroundColor: '#FFFFFF', borderColor: '#1E3A8A' }}>
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-none" style={{ backgroundColor: 'rgba(30, 58, 138, 0.02)' }} />
          <p className="text-[11px] font-black uppercase tracking-wider mb-2 font-display" style={{ color: '#1E3A8A' }}>Faturamento Total</p>
          <div className="space-y-1">
            {Object.entries(totalsByCurrency).map(([currency, data]) => (
              <h2 key={currency} className="text-2xl font-black font-display" style={{ color: '#1E3A8A' }}>
                {formatCurrency(data.revenue, currency as CurrencyCode)}
              </h2>
            ))}
          </div>
          <div className="flex items-center gap-2 w-fit px-3 py-1 rounded-none text-[10px] font-black uppercase tracking-widest border mt-4" style={{
            backgroundColor: yoyPercentage >= 0 ? 'rgba(29, 158, 117, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: yoyPercentage >= 0 ? '#1D9E75' : '#EF4444',
            color: yoyPercentage >= 0 ? '#1D9E75' : '#EF4444'
          }}>
            <ArrowUpRight className="h-3 w-3" /> {yoyPercentage >= 0 ? '+' : ''}{yoyPercentage}% vs ano ant.
          </div>
        </div>

        <div className="bg-white p-6 border border-lodgra-blue/10 relative group rounded-none">
          <p className="text-lodgra-navy/50 text-[11px] font-black uppercase tracking-wider mb-2 font-display">Sua Comissão (EBITDA)</p>
          <div className="space-y-1">
            {Object.entries(totalsByCurrency).map(([currency, data]) => (
              <div key={currency}>
                <h2 className="text-2xl font-black text-lodgra-blue font-display">
                  {formatCurrency(data.mgmt, currency as CurrencyCode)}
                </h2>
                {data.revenue > 0 && (
                  <div className="flex items-center gap-2 text-lodgra-blue font-black text-[10px] uppercase tracking-widest mt-1">
                    <div className="w-6 h-1 bg-lodgra-gold rounded-none" />
                    MARGEM {((data.mgmt / data.revenue) * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 border border-lodgra-blue/10 relative group rounded-none">
          <p className="text-lodgra-navy/50 text-[11px] font-black uppercase tracking-wider mb-2 font-display">Repasse Proprietários</p>
          <div className="space-y-1">
            {Object.entries(totalsByCurrency).map(([currency, data]) => (
              <h2 key={currency} className="text-2xl font-black text-lodgra-gold font-display">
                {formatCurrency(data.owner, currency as CurrencyCode)}
              </h2>
            ))}
          </div>
          <p className="text-[10px] text-lodgra-navy/40 font-black uppercase tracking-wider mt-2">Líquido a ser repassado este mês</p>
        </div>

        <div className="bg-lodgra-neutral-50 p-6 border border-lodgra-blue/10 relative group rounded-none">
          <p className="text-lodgra-blue/40 text-[11px] font-black uppercase tracking-wider mb-2 font-display">Taxa de Ocupação</p>
          <h2 className="text-4xl font-black text-lodgra-blue mb-2 font-display">
            {avgOccupancy.toFixed(0)}%
          </h2>
          <div className="w-full bg-lodgra-blue/5 h-1.5 rounded-none mt-4 overflow-hidden">
            <div
              className="h-full bg-lodgra-blue transition-all duration-1000"
              style={{ width: `${avgOccupancy}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Visual Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart - Revenue vs Expenses */}
        <div className="lg:col-span-2 bg-white border border-lodgra-blue/10 p-8 rounded-none">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h4 className="text-sm font-black text-lodgra-blue uppercase tracking-widest font-display">Fluxo de Caixa Mensal</h4>
              <p className="text-[10px] text-lodgra-navy/40 font-black uppercase tracking-[2px] pt-1">Receita vs Lucro Operacional</p>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-none bg-lodgra-blue" />
                <span className="text-[10px] font-black text-lodgra-navy/30 uppercase tracking-widest">RECEITA</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-none bg-lodgra-gold" />
                <span className="text-[10px] font-black text-lodgra-navy/30 uppercase tracking-widest">LUCRO</span>
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
        <div className="bg-white border border-lodgra-blue/10 p-8 rounded-none">
          <h4 className="text-sm font-black text-lodgra-blue uppercase tracking-widest font-display mb-8">Participação por Unidade</h4>
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
                  {totalRevenueAggregate > 0 ? ((item.value / totalRevenueAggregate) * 100).toFixed(0) : '0'}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
