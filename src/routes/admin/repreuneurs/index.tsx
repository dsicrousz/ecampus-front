import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '@/lib/route-protection';
import { useQuery } from '@tanstack/react-query'
import { useSession } from '@/auth/auth-client'
import { RestaurantService } from '@/services/restaurant.service'
import {
  Card,
  Table,
  Space,
  Typography,
  Button,
  Empty,
  Spin,
  Row,
  Col,
  Tag,
  Statistic,
  Collapse
} from 'antd'
import {
  ShopOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  FileTextOutlined,
  PrinterOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { USER_ROLE } from '@/types/user.roles'
import { formatMontant } from '@/types/operation'
import dayjs from '@/config/dayjs.config'
import { useMemo } from 'react'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'

;(pdfMake as any).vfs = (pdfFonts as any).vfs

const { Title, Text } = Typography

export const Route = createFileRoute('/admin/repreuneurs/')({
  beforeLoad: () => requireRole([USER_ROLE.REPREUNEUR, USER_ROLE.SUPERADMIN]),
  component: RouteComponent,
})

// ---- Types for dashboard data ------------------------------------------------

interface DashboardOperation {
  _id: string
  montantRepreneur: number
  montantTicket: number
  ticket: { _id: string; nom: string; prix: number }
  note?: string
  createdAt: string
  compte: { _id: string; etudiant?: { ncs?: string } }
}

interface ConsommationParDecade {
  decade: {
    _id: string
    nom: string
    reference: string
    dateDebut: string
    dateFin: string
    active: boolean
  }
  totalConsommations: number
  montantTotal: number
  operations: DashboardOperation[]
}

interface DashboardService {
  service: { _id: string; nom: string; type: string }
  prixRepreneur: number
  consommationsParDecade: ConsommationParDecade[]
}

interface DashboardRestaurant {
  _id: string
  nom: string
  localisation?: string
  active: boolean
  services: DashboardService[]
}

// ---- Operations table columns ------------------------------------------------

const operationColumns: ColumnsType<DashboardOperation> = [
  {
    title: 'Date',
    key: 'createdAt',
    dataIndex: 'createdAt',
    render: (date: string) => (
      <Text className="tabular-nums text-muted-foreground">
        {dayjs(date).format('DD/MM/YYYY HH:mm')}
      </Text>
    ),
  },
  {
    title: 'NCS',
    key: 'ncs',
    dataIndex: 'ncs',
    render: (ncs: any) => (
      <Text className="text-xs font-medium text-foreground">
        {ncs || '-'}
      </Text>
    ),
  },
  {
    title: 'Ticket',
    key: 'ticket',
    dataIndex: 'ticket',
    render: (ticket: any) => (
      <Tag color="green">{ticket?.nom || '-'}</Tag>
    ),
  },
  {
    title: 'Prix ticket',
    key: 'montantTicket',
    dataIndex: 'montantTicket',
    align: 'right',
    render: (val: number) => (
      <Text type="secondary" className="tabular-nums">
        {formatMontant(val)}
      </Text>
    ),
  },
  {
    title: 'Montant repreneur',
    key: 'montantRepreneur',
    dataIndex: 'montantRepreneur',
    align: 'right',
    render: (val: number) => (
      <Text strong className="tabular-nums text-emerald-600">
        {formatMontant(val)}
      </Text>
    ),
  },
]

// ---- Service operations block ------------------------------------------------

function ServiceOperationsBlock({
  service,
  consommation,
}: {
  service: DashboardService
  consommation: ConsommationParDecade
}) {
  return (
    <div>
      <Space className="mb-3">
        <Tag color="cyan">{service.service.nom}</Tag>
        <Tag color="gold">{formatMontant(service.prixRepreneur)}/cons.</Tag>
        <Tag color="blue">{consommation.totalConsommations} cons.</Tag>
        <Tag color="green">{formatMontant(consommation.montantTotal)} dû</Tag>
      </Space>
      {consommation.operations.length > 0 ? (
        <Table
          className="controller-table"
          columns={operationColumns}
          dataSource={consommation.operations}
          rowKey="_id"
          size="small"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `${total} opération(s)`,
          }}
        />
      ) : (
        <Empty
          description="Aucune consommation pour ce service"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </div>
  )
}

// ---- PDF invoice generation --------------------------------------------------

function generateFacture(
  restaurant: DashboardRestaurant,
  decadeData: DecadeWithServices
) {
  const { decade, services, totalConsommations, montantTotal } = decadeData

  const body: any[] = [
    [
      { text: 'Date', style: 'tableHeader' },
      { text: 'Ticket', style: 'tableHeader' },
      { text: 'Quantité', style: 'tableHeader', alignment: 'center' },
      { text: 'Prix ticket', style: 'tableHeader', alignment: 'right' },
      { text: 'Montant repreneur', style: 'tableHeader', alignment: 'right' },
    ],
  ]

  services.forEach((entry) => {
    // Service header row
    body.push([
      {
        text: entry.service.service.nom,
        style: 'serviceHeader',
        colSpan: 5,
        fillColor: '#f1f5f9',
      },
      {},
      {},
      {},
      {},
    ])

    // Group operations by date and ticket
    const grouped = new Map<string, { date: string; ticketNom: string; count: number; montantTicket: number; montantRepreneur: number }>()
    ;[...entry.consommation.operations]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((op) => {
        const date = dayjs(op.createdAt).format('DD/MM/YYYY')
        const ticketNom = op.ticket?.nom || '-'
        const key = `${date}|${ticketNom}`
        if (!grouped.has(key)) {
          grouped.set(key, {
            date,
            ticketNom,
            count: 0,
            montantTicket: 0,
            montantRepreneur: 0,
          })
        }
        const g = grouped.get(key)!
        g.count++
        g.montantTicket += op.montantTicket
        g.montantRepreneur += op.montantRepreneur
      })

    grouped.forEach((g) => {
      body.push([
        g.date,
        g.ticketNom,
        { text: `${g.count}`, alignment: 'center' },
        { text: `${g.montantTicket} FCFA`, alignment: 'right' },
        { text: `${g.montantRepreneur} FCFA`, alignment: 'right', bold: true },
      ])
    })

    // Service subtotal row
    body.push([
      {
        text: `Sous-total ${entry.service.service.nom}`,
        style: 'subtotalRow',
        colSpan: 4,
        alignment: 'right',
      },
      {},
      {},
      {},
      {
        text: `${entry.consommation.montantTotal} FCFA`,
        style: 'subtotalRow',
        alignment: 'right',
      },
    ])
  })

  const docDefinition = {
    content: [
      // Title
      { text: 'FACTURE', style: 'title', alignment: 'center' },
      { text: '\n' },

      // Restaurant info
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Restaurant', style: 'label' },
              { text: restaurant.nom, style: 'value' },
              restaurant.localisation
                ? { text: `Localisation: ${restaurant.localisation}`, style: 'subValue' }
                : {},
            ],
          },
          {
            width: '*',
            stack: [
              { text: 'Décade', style: 'label' },
              { text: decade.nom, style: 'value' },
              { text: `Référence: ${decade.reference}`, style: 'subValue' },
              {
                text: `Période: ${dayjs(decade.dateDebut).format('DD/MM/YYYY')} - ${dayjs(decade.dateFin).format('DD/MM/YYYY')}`,
                style: 'subValue',
              },
              {
                text: `Statut: ${decade.active ? 'Active' : 'Terminée'}`,
                style: 'subValue',
              },
            ],
          },
        ],
      },
      { text: '\n\n' },

      // Summary
      {
        columns: [
          {
            width: '*',
            stack: [
              {
                text: `Total consommations: ${totalConsommations}`,
                style: 'summaryText',
              },
              {
                text: `Montant total dû: ${montantTotal} FCFA`,
                style: 'summaryText',
                bold: true,
              },
            ],
          },
        ],
      },
      { text: '\n\n' },

      // Operations table
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto'],
          body,
        },
        layout: {
          fillColor: (rowIndex: number) =>
            rowIndex === 0 ? '#0ea5e9' : null,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0',
        },
      },

      // Footer
      { text: '\n\n' },
      {
        text: `Facture générée le ${dayjs().format('DD/MM/YYYY à HH:mm')}`,
        style: 'footer',
        alignment: 'center',
      },
    ],
    styles: {
      title: { fontSize: 24, bold: true, color: '#0f172a' },
      label: { fontSize: 9, color: '#64748b', marginBottom: 2 },
      value: { fontSize: 13, bold: true, color: '#0f172a' },
      subValue: { fontSize: 10, color: '#475569', marginTop: 1 },
      summaryText: { fontSize: 12, color: '#0f172a', marginBottom: 4 },
      tableHeader: { fontSize: 9, bold: true, color: '#ffffff' },
      serviceHeader: { fontSize: 10, bold: true, color: '#0f172a' },
      subtotalRow: { fontSize: 9, bold: true, color: '#16a34a' },
      footer: { fontSize: 8, color: '#94a3b8' },
    },
    defaultStyle: { fontSize: 9, color: '#334155' },
  }

  pdfMake.createPdf(docDefinition as any).open()
}

// ---- Decade block (inside restaurant) ----------------------------------------

interface DecadeWithServices {
  decade: ConsommationParDecade['decade']
  totalConsommations: number
  montantTotal: number
  services: Array<{ service: DashboardService; consommation: ConsommationParDecade }>
}

function DecadeBlock({ data, restaurant }: { data: DecadeWithServices; restaurant: DashboardRestaurant }) {
  return (
    <div>
      {/* Decade stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
        <Card className="controller-stat-card" size="small">
          <Statistic
            title={<span className="text-sky-700 font-medium">Consommations</span>}
            value={data.totalConsommations}
            prefix={<FileTextOutlined />}
            valueStyle={{ color: '#0ea5e9', fontWeight: 700 }}
          />
        </Card>
        <Card className="controller-stat-card" size="small">
          <Statistic
            title={<span className="text-emerald-700 font-medium">Montant dû</span>}
            value={data.montantTotal}
            suffix="FCFA"
            prefix={<DollarOutlined />}
            valueStyle={{ color: '#16a34a', fontWeight: 700 }}
          />
        </Card>
        <Card className="controller-stat-card" size="small">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Période</p>
            <p className="text-sm font-medium text-foreground">
              {dayjs(data.decade.dateDebut).format('DD/MM/YYYY')} → {dayjs(data.decade.dateFin).format('DD/MM/YYYY')}
            </p>
            <Tag color={data.decade.active ? 'success' : 'default'} className="mt-1">
              {data.decade.active ? 'Active' : 'Terminée'}
            </Tag>
          </div>
        </Card>
      </div>

      {/* Services within this decade */}
      <Collapse
        items={data.services.map((entry) => ({
          key: entry.service.service._id,
          label: (
            <Space>
              <span className="font-medium">{entry.service.service.nom}</span>
              <Tag color="gold">{formatMontant(entry.service.prixRepreneur)}/cons.</Tag>
              <Tag color="blue">{entry.consommation.totalConsommations} cons.</Tag>
            </Space>
          ),
          children: <ServiceOperationsBlock service={entry.service} consommation={entry.consommation} />,
        }))}
      />

      {/* Print invoice button */}
      <div className="flex justify-end mt-4">
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => generateFacture(restaurant, data)}
          disabled={data.totalConsommations === 0}
        >
          Imprimer la facture
        </Button>
      </div>
    </div>
  )
}

// ---- Restaurant card ---------------------------------------------------------

function RestaurantCard({ restaurant }: { restaurant: DashboardRestaurant }) {
  const totalMontant = (restaurant.services || []).reduce(
    (acc, s) => acc + (s.consommationsParDecade || []).reduce((a, d) => a + d.montantTotal, 0),
    0
  )
  const totalConsommations = (restaurant.services || []).reduce(
    (acc, s) => acc + (s.consommationsParDecade || []).reduce((a, d) => a + d.totalConsommations, 0),
    0
  )

  // Regroup by decade: collect all decades across all services
  const decadesMap = useMemo(() => {
    const map = new Map<string, DecadeWithServices>()
    ;(restaurant.services || []).forEach((svc) => {
      ;(svc.consommationsParDecade || []).forEach((c) => {
        if (!map.has(c.decade._id)) {
          map.set(c.decade._id, {
            decade: c.decade,
            totalConsommations: 0,
            montantTotal: 0,
            services: [],
          })
        }
        const entry = map.get(c.decade._id)!
        entry.totalConsommations += c.totalConsommations
        entry.montantTotal += c.montantTotal
        entry.services.push({ service: svc, consommation: c })
      })
    })
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.decade.dateDebut).getTime() - new Date(a.decade.dateDebut).getTime()
    )
  }, [restaurant])

  const collapseItems = decadesMap.map((d) => ({
    key: d.decade._id,
    label: (
      <Space>
        <span className="font-medium">{d.decade.nom}</span>
        <Tag color={d.decade.active ? 'success' : 'default'}>
          {d.decade.active ? 'Active' : 'Terminée'}
        </Tag>
        <Tag color="blue">
          {d.totalConsommations} cons.
        </Tag>
        <Tag color="green">{formatMontant(d.montantTotal)}</Tag>
      </Space>
    ),
    children: <DecadeBlock data={d} restaurant={restaurant} />,
  }))

  return (
    <Card className="controller-panel" title={
      <div className="flex items-center justify-between">
        <Space>
          <ShopOutlined className="text-sky-600" />
          <span className="text-foreground font-semibold">{restaurant.nom}</span>
          {restaurant.localisation && (
            <Space size={4}>
              <EnvironmentOutlined className="text-muted-foreground" />
              <Text type="secondary" className="text-xs">{restaurant.localisation}</Text>
            </Space>
          )}
        </Space>
        <Tag color={restaurant.active ? 'success' : 'default'}>
          {restaurant.active ? 'Actif' : 'Inactif'}
        </Tag>
      </div>
    }>
      {/* Restaurant-level stats */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12}>
          <Card className="controller-stat-card" size="small">
            <Statistic
              title={<span className="text-sky-700 font-medium">Total consommations</span>}
              value={totalConsommations}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#0ea5e9', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="controller-stat-card" size="small">
            <Statistic
              title={<span className="text-emerald-700 font-medium">Montant total dû</span>}
              value={totalMontant}
              suffix="FCFA"
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#16a34a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {collapseItems.length > 0 ? (
        <Collapse
          items={collapseItems}
          defaultActiveKey={decadesMap.find((d) => d.decade.active)?.decade._id}
        />
      ) : (
        <Empty description="Aucune décade" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Card>
  )
}

// ---- Main component ----------------------------------------------------------

function RouteComponent() {
  const { data: sessionData } = useSession()
  const restaurantService = new RestaurantService()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['repreneur-dashboard', sessionData?.user?.id],
    queryFn: () => restaurantService.getRepreneurDashboard(sessionData?.user?.id!),
    enabled: !!sessionData?.user?.id,
  })

  const restaurants: DashboardRestaurant[] = dashboard?.restaurants || []

  // Global summary calculations
  const globalSummary = useMemo(() => {
    let totalConsommations = 0
    let totalMontant = 0

    restaurants.forEach((r) => {
      r.services?.forEach((s) => {
        s.consommationsParDecade?.forEach((c) => {
          totalConsommations += c.totalConsommations
          totalMontant += c.montantTotal
        })
      })
    })

    return { totalConsommations, totalMontant }
  }, [restaurants])

  if (isLoading) {
    return (
      <div className="controller-page">
        <div className="flex items-center justify-center min-h-[400px]">
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (!restaurants.length) {
    return (
      <div className="controller-page">
        <Card className="controller-panel">
          <Empty
            description="Vous n'êtes repreneur d'aucun restaurant"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="controller-page">
      <Spin spinning={isLoading}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          {/* Hero Header */}
          <Card className="controller-hero controller-hero-soft border">
            <Row gutter={[24, 16]} align="middle" wrap>
              <Col flex="none">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <ShopOutlined style={{ fontSize: 28 }} />
                </div>
              </Col>
              <Col flex="auto">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Dashboard
                </Text>
                <Title level={3} className="mb-1! mt-1! text-foreground!">
                  {sessionData?.user?.name || 'Repreneur'}
                </Title>
                <Text type="secondary">
                  Suivi des consommations et montants dus
                </Text>
              </Col>
              <Col flex="none">
                <div className="min-w-[220px] rounded-2xl border border-border bg-muted px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Restaurants
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {restaurants.length}
                  </p>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Global Summary */}
          <Card className="controller-panel">
            <Text strong className="text-base text-foreground block mb-4">Résumé global</Text>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card className="controller-stat-card" size="small">
                  <Statistic
                    title={<span className="text-sky-700 font-medium">Total consommations</span>}
                    value={globalSummary.totalConsommations}
                    prefix={<FileTextOutlined />}
                    valueStyle={{ color: '#0ea5e9', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="controller-stat-card" size="small">
                  <Statistic
                    title={<span className="text-emerald-700 font-medium">Montant total dû</span>}
                    value={globalSummary.totalMontant}
                    suffix="FCFA"
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#16a34a', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card className="controller-stat-card" size="small">
                  <Statistic
                    title={<span className="text-amber-700 font-medium">Restaurants actifs</span>}
                    value={restaurants.filter((r) => r.active).length}
                    prefix={<ShopOutlined />}
                    valueStyle={{ color: '#f97316', fontWeight: 700 }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>

          {/* Restaurant cards */}
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant._id} restaurant={restaurant} />
          ))}
        </Space>
      </Spin>
    </div>
  )
}
