'use client'

import { useState, useEffect } from 'react'
import { 
  Phone, 
  Users, 
  TrendingUp, 
  Clock, 
  MapPin, 
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Search,
  Filter,
  RefreshCw,
  BarChart3,
  Briefcase,
  MessageSquare
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale'

// Types
interface Lead {
  _id: string
  _creationTime: number
  phone: string
  firstName?: string
  lastName?: string
  caseType: string
  county: string
  state: string
  urgency: 'low' | 'medium' | 'high' | 'emergency'
  status: string
  qualificationScore?: number
  source: string
  createdAt: number
  activeTransfer?: {
    id: string
    status: string
    expiresAt: number
  } | null
}

interface Stats {
  total: number
  qualified: number
  matched: number
  converted: number
  conversionRate: string
  byCaseType: Record<string, number>
  byStatus: Record<string, number>
}

// Case type labels
const caseTypeLabels: Record<string, string> = {
  personal_injury: 'Lesiones Personales',
  workers_comp: 'Compensación Laboral',
  construction_accident: 'Accidente Construcción',
  criminal: 'Criminal',
  family: 'Familiar',
  divorce: 'Divorcio',
  immigration: 'Inmigración',
  dui: 'DUI',
  traffic: 'Tránsito',
  real_estate: 'Bienes Raíces',
  other: 'Otro'
}

// Status labels
const statusLabels: Record<string, string> = {
  new: 'Nuevo',
  qualified: 'Calificado',
  pending_match: 'Buscando Abogado',
  matched: 'Notificado',
  accepted: 'Aceptado',
  declined: 'Rechazado',
  contacted: 'Contactado',
  converted: 'Convertido',
  closed: 'Cerrado',
  spam: 'Spam'
}

// Urgency labels
const urgencyLabels: Record<string, string> = {
  emergency: 'Emergencia',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja'
}

export default function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Fetch data
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [statusFilter])

  const fetchData = async () => {
    try {
      // Fetch leads from API
      const leadsRes = await fetch(`/api/leads?limit=20&status=${statusFilter}`)
      const leadsData = await leadsRes.json()
      if (leadsData.success) {
        setLeads(leadsData.data)
      }

      // Fetch stats
      const statsRes = await fetch('/api/analytics/dashboard')
      const statsData = await statsRes.json()
      if (statsData.success) {
        setStats(statsData.data.leads)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      // Use mock data for demo
      setMockData()
    } finally {
      setLoading(false)
    }
  }

  const setMockData = () => {
    // Mock data for demo
    setLeads([
      {
        _id: 'lead_1',
        _creationTime: Date.now() - 1000 * 60 * 5,
        phone: '+1 (212) 555-0123',
        firstName: 'María',
        lastName: 'González',
        caseType: 'personal_injury',
        county: 'Queens',
        state: 'NY',
        urgency: 'high',
        status: 'matched',
        qualificationScore: 85,
        source: 'ai_receptionist',
        createdAt: Date.now() - 1000 * 60 * 5,
        activeTransfer: {
          id: 'trans_1',
          status: 'pending',
          expiresAt: Date.now() + 1000 * 60 * 60 * 24
        }
      },
      {
        _id: 'lead_2',
        _creationTime: Date.now() - 1000 * 60 * 15,
        phone: '+1 (718) 555-0456',
        firstName: 'José',
        lastName: 'Rodríguez',
        caseType: 'immigration',
        county: 'Bronx',
        state: 'NY',
        urgency: 'emergency',
        status: 'new',
        qualificationScore: 92,
        source: 'ai_receptionist',
        createdAt: Date.now() - 1000 * 60 * 15,
      },
      {
        _id: 'lead_3',
        _creationTime: Date.now() - 1000 * 60 * 30,
        phone: '+1 (201) 555-0789',
        firstName: 'Carmen',
        lastName: 'López',
        caseType: 'workers_comp',
        county: 'Hudson',
        state: 'NJ',
        urgency: 'medium',
        status: 'accepted',
        qualificationScore: 78,
        source: 'ai_receptionist',
        createdAt: Date.now() - 1000 * 60 * 30,
      },
    ])

    setStats({
      total: 145,
      qualified: 128,
      matched: 95,
      converted: 42,
      conversionRate: '28.9',
      byCaseType: {
        personal_injury: 48,
        workers_comp: 24,
        immigration: 32,
        criminal: 16,
        divorce: 12,
        family: 13
      },
      byStatus: {
        new: 12,
        qualified: 18,
        pending_match: 8,
        matched: 25,
        accepted: 35,
        converted: 42,
        closed: 5
      }
    })
  }

  const getStatusBadge = (status: string) => {
    const classes: Record<string, string> = {
      new: 'bg-gray-100 text-gray-800',
      qualified: 'bg-blue-100 text-blue-800',
      pending_match: 'bg-yellow-100 text-yellow-800',
      matched: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      contacted: 'bg-indigo-100 text-indigo-800',
      converted: 'bg-emerald-100 text-emerald-800',
      closed: 'bg-gray-100 text-gray-600',
      spam: 'bg-gray-100 text-gray-400'
    }
    return classes[status] || classes.new
  }

  const getUrgencyBadge = (urgency: string) => {
    const classes: Record<string, string> = {
      emergency: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-blue-400 text-white'
    }
    return classes[urgency] || classes.low
  }

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400'
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const filteredLeads = leads.filter(lead => 
    (lead.firstName?.toLowerCase().includes(filter.toLowerCase()) ||
     lead.lastName?.toLowerCase().includes(filter.toLowerCase()) ||
     lead.phone.includes(filter) ||
     lead.caseType.toLowerCase().includes(filter.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">TG</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tusa Gato's 24/7</h1>
                <p className="text-xs text-gray-500">CRM Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={fetchData}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-medium text-sm">A</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Leads</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-green-600 mt-1">+12 este mes</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Calificados</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.qualified}</p>
                  <p className="text-xs text-blue-600 mt-1">{((stats.qualified / stats.total) * 100).toFixed(0)}% del total</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Convertidos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.converted}</p>
                  <p className="text-xs text-green-600 mt-1">{stats.conversionRate}% conversión</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tiempo Respuesta</p>
                  <p className="text-3xl font-bold text-gray-900">18m</p>
                  <p className="text-xs text-green-600 mt-1">Promedio</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Case Type Distribution */}
        {stats && (
          <div className="card mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Tipo de Caso</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(stats.byCaseType).map(([type, count]) => (
                <div key={type} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{caseTypeLabels[type] || type}</p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leads Section */}
        <div className="card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Leads Recientes</h2>
              <p className="text-sm text-gray-500">Últimos 20 leads recibidos</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar leads..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Todos los estados</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Leads Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay leads para mostrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Contacto</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Tipo de Caso</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Ubicación</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Urgencia</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Tiempo</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {lead.firstName} {lead.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{lead.phone}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-700">
                          {caseTypeLabels[lead.caseType] || lead.caseType}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3.5 h-3.5" />
                          {lead.county}, {lead.state}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`badge ${getUrgencyBadge(lead.urgency)}`}>
                          {urgencyLabels[lead.urgency]}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`badge ${getStatusBadge(lead.status)}`}>
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-semibold ${getScoreColor(lead.qualificationScore)}`}>
                          {lead.qualificationScore || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(lead.createdAt, { addSuffix: true, locale: es })}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* View All Link */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Ver todos los leads →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Gestionar Abogados</h3>
                <p className="text-sm text-gray-600 mt-1">Administrar especializaciones y ubicaciones</p>
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Ver abogados →
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-green-50 border-green-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Reportes</h3>
                <p className="text-sm text-gray-600 mt-1">Análisis de conversión y rendimiento</p>
                <button className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium">
                  Ver reportes →
                </button>
              </div>
            </div>
          </div>

          <div className="card bg-purple-50 border-purple-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Configuración</h3>
                <p className="text-sm text-gray-600 mt-1">Ajustar IA y flujos de trabajo</p>
                <button className="mt-3 text-sm text-purple-600 hover:text-purple-700 font-medium">
                  Configurar →
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
