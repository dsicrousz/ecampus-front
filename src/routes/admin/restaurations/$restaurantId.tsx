import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  Spin,
  Typography,
  Button,
  Table,
  DatePicker,
  Space,
  Statistic,
  Row,
  Col,
  Tag,
  Divider,
  Select,
  Input,
  message,
  Switch,
  Modal,
  Form,
  Avatar,
  List,
  InputNumber
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
  ArrowLeftOutlined,
  FileTextOutlined,
  DollarOutlined,
  UserOutlined,
  ShopOutlined,
  PrinterOutlined,
  SearchOutlined,
  TeamOutlined,
  SettingOutlined,
  UserAddOutlined,
  DollarCircleOutlined
} from '@ant-design/icons';
import { useState, useMemo } from "react";
import { ServiceService } from "@/services/service.service";
import { OperationService } from "@/services/operation.service";
import { useDebounce } from "react-use";
import dayjs, { Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { UserService } from '@/services/user.service';
import { USER_ROLE } from '@/types/user.roles';
import type { Ticket } from '@/types/ticket';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

dayjs.extend(isBetween);
// @ts-ignore
pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts;



const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export const Route = createFileRoute('/admin/restaurations/$restaurantId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { restaurantId } = useParams({ from: '/admin/restaurations/$restaurantId' });
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [prixModalOpen, setPrixModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [prixForm] = Form.useForm();
  const userService = new UserService();
  const keyRepreneurs = ['repreneurs'];

  const { data: repreneurs, isLoading: isRepreneursLoading } = useQuery({
    queryKey: keyRepreneurs,
    queryFn: () => userService.byRole(USER_ROLE.REPREUNEUR),
  });


  const keyControllers = ['controllers'];

  const { data: controllers, isLoading: isControllersLoading } = useQuery({
    queryKey: keyControllers,
    queryFn: () => userService.byRole(USER_ROLE.CONTROLEUR),
  });

  const isLoadingRepreneurs = isRepreneursLoading;
  const isLoadingControllers = isControllersLoading;

  useDebounce(() => setDebouncedSearchText(searchText), 300, [searchText]);

  const serviceService = new ServiceService();
  const operationService = new OperationService();
  const queryClient = useQueryClient();

  // Récupérer le service
  const { data: service, isLoading: isLoadingService } = useQuery({
    queryKey: ['service', restaurantId],
    queryFn: () => serviceService.getOne(restaurantId),
    enabled: !!restaurantId
  });


  // Mutation pour activer/désactiver le service
  const { mutate: toggleServiceStatus, isPending: isTogglingStatus } = useMutation({
    mutationFn: (data: any) => serviceService.update(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      message.success('Statut du service modifié avec succès');
    },
    onError: () => {
      message.error('Erreur lors de la modification du statut');
    }
  });

  // Handler pour le switch
  const handleToggleStatus = (checked: boolean) => {
    toggleServiceStatus({ active: checked });
  };

  // Mutation pour mettre à jour la configuration des agents et gérant
  const { mutate: updateConfiguration, isPending: isUpdatingConfig } = useMutation({
    mutationFn: (data: any) => serviceService.update(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service', restaurantId] });
      message.success('Configuration mise à jour avec succès');
      setConfigModalOpen(false);
      form.resetFields();
    },
    onError: () => {
      message.error('Erreur lors de la mise à jour de la configuration');
    }
  });

  // Handler pour ouvrir le modal de configuration
  const handleOpenConfig = () => {
    form.setFieldsValue({
      gerant: service?.gerant?._id || service?.gerant,
      agentsControle: service?.agentsControle?.map((agent: any) => agent._id || agent) || []
    });
    setConfigModalOpen(true);
  };

  // Handler pour soumettre la configuration
  const handleSubmitConfig = (values: any) => {
    updateConfiguration(values);
  };

  // Mutation pour mettre à jour les prix repreneur
  const { mutate: updatePrixRepreneur, isPending: isUpdatingPrix } = useMutation({
    mutationFn: (data: any) => serviceService.update(restaurantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service', restaurantId] });
      message.success('Prix repreneur mis à jour avec succès');
      setPrixModalOpen(false);
      prixForm.resetFields();
    },
    onError: () => {
      message.error('Erreur lors de la mise à jour des prix');
    }
  });

  // Handler pour ouvrir le modal de configuration des prix
  const handleOpenPrixConfig = () => {
    // Préparer les valeurs initiales pour le formulaire
    const initialValues: Record<string, number | null> = {};
    service?.ticketsacceptes?.forEach((ticket: Ticket) => {
      const ticketId = ticket._id;
      if (ticketId) {
        initialValues[`prix_${ticketId}`] = service?.prixRepreneur?.[ticketId] || null;
      }
    });
    prixForm.setFieldsValue(initialValues);
    setPrixModalOpen(true);
  };

  // Handler pour soumettre les prix repreneur
  const handleSubmitPrix = (values: any) => {
    // Transformer les valeurs du formulaire en objet prixRepreneur
    const prixRepreneur: Record<string, number> = {};
    Object.keys(values).forEach(key => {
      if (key.startsWith('prix_') && values[key] !== null && values[key] !== undefined) {
        const ticketId = key.replace('prix_', '');
        prixRepreneur[ticketId] = values[key];
      }
    });
    updatePrixRepreneur({ prixRepreneur });
  };

  // Préparer les options pour les gérants (repreneurs uniquement)
  const gerantOptions = useMemo(() => {
    if (!repreneurs) return [];
    return repreneurs.map((user: any) => ({
      value: user._id,
      label: `${user.name} ${user.email}`
    }));
  }, [repreneurs]);

  // Préparer les options pour les agents de contrôle (tous les utilisateurs)
  const agentOptions = useMemo(() => {
    if (!controllers) return [];
    return controllers.map((user: any) => ({
      value: user._id,
      label: `${user.name} ${user.email}`
    }));
  }, [controllers]);

  // Options pour le filtre par agent (basé sur les agents assignés au service)
  const agentFilterOptions = useMemo(() => {
    if (!service?.agentsControle) return [];
    return service.agentsControle.map((agent: any) => ({
      value: agent._id,
      label: agent.name
    }));
  }, [service?.agentsControle]);

  // Récupérer les opérations d'utilisation du service
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['operations_by_service', restaurantId],
    queryFn: () => operationService.byService(restaurantId),
    enabled: !!restaurantId
  });

  // Filtrer les opérations
  const filteredOperations = useMemo(() => {
    if (!operations) return [];

    return operations.filter((op: any) => {
      // Filtre par date
      if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
        const opDate = dayjs(op.createdAt);
        const rangeStart = dateRange[0].startOf('day');
        const rangeEnd = dateRange[1].endOf('day');
        if (!opDate.isBetween(rangeStart, rangeEnd, null, '[]')) {
          return false;
        }
      }

      // Filtre par ticket
      if (selectedTicket && op.ticket?._id !== selectedTicket) {
        return false;
      }

      // Filtre par agent
      if (selectedAgent && op.agentControle?._id !== selectedAgent) {
        return false;
      }

      // Filtre par recherche
      if (debouncedSearchText) {
        const searchLower = debouncedSearchText.toLowerCase();
        const studentName = `${op.compte?.etudiant?.prenom || ''} ${op.compte?.etudiant?.nom || ''}`.toLowerCase();
        const studentCode = op.compte?.code?.toLowerCase() || '';
        const ticketName = op.ticket?.nom?.toLowerCase() || '';
        
        if (!studentName.includes(searchLower) && 
            !studentCode.includes(searchLower) && 
            !ticketName.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [operations, dateRange, selectedTicket, selectedAgent, debouncedSearchText]);

  // Calculer les statistiques avec montants des opérations
  const statistics = useMemo(() => {
    const total = filteredOperations.length;
    
    const totalAmount = filteredOperations.reduce((acc: number, op: any) => {
      return acc + (op.serviceSnapshot?.prixRepreneur?.[op.ticket] || 0);
    }, 0);

    // Grouper par ticket avec calcul du prix repreneur
    const byTicket = filteredOperations.reduce((acc: any, op: any) => {
      const ticketId = op.ticket;
      if (!ticketId) return acc;
      
      if (!acc[ticketId]) {
        const prixStandard = op.ticketSnapshot?.prix || 0;
        const prixRepreneur = service?.prixRepreneur?.[ticketId];
        const prixEffectif = prixRepreneur !== undefined && prixRepreneur !== null ? prixRepreneur : prixStandard;
        
        acc[ticketId] = {
          nom: op.ticketSnapshot?.nom,
          prix: prixEffectif,
          prixStandard: prixStandard,
          prixRepreneur: prixRepreneur,
          count: 0,
          total: 0,
          totalStandard: 0,
          totalRepreneur: 0
        };
      }
      acc[ticketId].count += 1;
      
      // Calculer les totaux
      const ticketPrixStandard = op.ticketSnapshot?.prix || 0;
      const ticketPrixRepreneur = op.serviceSnapshot?.prixRepreneur?.[ticketId];
      const ticketPrixEffectif = ticketPrixRepreneur !== undefined && ticketPrixRepreneur !== null 
        ? ticketPrixRepreneur 
        : ticketPrixStandard;
      
      // Total avec prix effectif
      acc[ticketId].total += ticketPrixEffectif;
      
      // Total avec prix standard (toujours calculé)
      acc[ticketId].totalStandard = (acc[ticketId].totalStandard || 0) + ticketPrixStandard;
      
      // Total avec prix repreneur (uniquement si défini)
      if (ticketPrixRepreneur !== undefined && ticketPrixRepreneur !== null) {
        acc[ticketId].totalRepreneur = (acc[ticketId].totalRepreneur || 0) + ticketPrixRepreneur;
      }
      
      return acc;
    }, {});

    return { total, totalAmount, byTicket };
  }, [filteredOperations]);

  // Options pour le select des tickets
  const ticketOptions = useMemo(() => {
    if (!service?.ticketsacceptes) return [];
    return service.ticketsacceptes.map((ticket: any) => ({
      label: ticket.nom,
      value: ticket._id
    }));
  }, [service]);

  // Colonnes du tableau
  const columns: ColumnsType<any> = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a: any, b: any) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Heure',
      dataIndex: 'createdAt',
      key: 'heure',
      render: (date: string) => dayjs(date).format('HH:mm:ss'),
    },
    {
      title: 'Étudiant',
      key: 'etudiant',
      render: (_: any, record: any) => {
        const prenom = record.compte?.etudiant?.prenom || '';
        const nom = record.compte?.etudiant?.nom || '';
        const code = record.compte?.etudiant?.ncs || '';
        
        return (
          <div>
            <Text strong className="block">{prenom} {nom}</Text>
            <Text type="secondary" className="text-xs">{code}</Text>
          </div>
        );
      },
    },
    {
      title: 'Ticket',
      key: 'ticketSnapshot',
      render: (_:any, record:any) => (
        <Tag color="green">{record.ticketSnapshot?.nom}</Tag>
      ),
    },
    {
      title: 'Prix',
      key: 'prix',
      align: 'right' as const,
      render: (_:any, record:any) => {
        const ticketId = record.ticketSnapshot?._id;
        const prixStandard = record.ticketSnapshot?.prix || 0;
        const prixRepreneur = record.serviceSnapshot?.prixRepreneur?.[ticketId];
        const prixEffectif = prixRepreneur !== undefined && prixRepreneur !== null 
          ? prixRepreneur 
          : prixStandard;

        return (
          <Space orientation="vertical" size={0} align="end">
            <Text strong>{prixEffectif?.toLocaleString('fr-FR')} FCFA</Text>
            {prixRepreneur !== undefined && prixRepreneur !== null && (
              <Text type="secondary" className="text-xs">
                (Standard: {prixStandard?.toLocaleString('fr-FR')} FCFA)
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Agent',
      key: 'agent',
      render: (_: any, record: any) => (
        <Text type="secondary">
          {record.agentControle?.name || 'Non assigné'}
        </Text>
      ),
    },
  ];

  // Générer le rapport PDF
  const handleGenerateReport = () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.error('Veuillez sélectionner une période');
      return;
    }

    if (filteredOperations.length === 0) {
      message.error('Aucune opération à imprimer');
      return;
    }

    // Préparer les données du tableau
    const tableBody = [
      // En-tête du tableau
      [
        { text: 'Date', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Heure', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Étudiant', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Code', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Ticket', style: 'tableHeader', fillColor: '#422AFB' },
        { text: 'Prix Standard', style: 'tableHeader', fillColor: '#422AFB', alignment: 'right' },
        { text: 'Prix Repreneur', style: 'tableHeader', fillColor: '#422AFB', alignment: 'right' },
        { text: 'Agent', style: 'tableHeader', fillColor: '#422AFB' },
      ],
      // Lignes de données
      ...filteredOperations.map((op: any) => {
        const ticketId = op.ticketSnapshot?._id;
        const prixStandard = op.ticketSnapshot?.prix || 0;
        const prixRepreneur = op.serviceSnapshot?.prixRepreneur[ticketId];

        return [
          { text: dayjs(op.createdAt).format('DD/MM/YYYY'), style: 'tableCell' },
          { text: dayjs(op.createdAt).format('HH:mm:ss'), style: 'tableCell' },
          { text: `${op.compte?.etudiant?.prenom || ''} ${op.compte?.etudiant?.nom || ''}`, style: 'tableCell' },
          { text: op.compte?.etudiant?.ncs || '', style: 'tableCell', fontSize: 8 },
          { text: op.ticketSnapshot?.nom || '', style: 'tableCell' },
          { text: `${prixStandard?.toLocaleString('fr-FR')} FCFA`, style: 'tableCell', alignment: 'right' },
          { 
            text: prixRepreneur !== undefined && prixRepreneur !== null 
              ? `${prixRepreneur?.toLocaleString('fr-FR')} FCFA` 
              : '-', 
            style: 'tableCell', 
            alignment: 'right',
            color: prixRepreneur !== undefined && prixRepreneur !== null ? '#10B981' : '#999'
          },
          { text: op.agentControle?.name || 'Non assigné', style: 'tableCell', fontSize: 8 },
        ];
      }),
    ];

    // Calculer les totaux par ticket
    const recapByTicket = Object.entries(statistics.byTicket).map(([_, data]: [string, any]) => {
      const hasPrixRepreneur = data.prixRepreneur !== undefined && data.prixRepreneur !== null;
      return [
        { text: data.nom, style: 'tableCell', bold: true } as any,
        { text: data.count.toString(), style: 'tableCell', alignment: 'center' } as any,
        { text: `${data.prixStandard?.toLocaleString('fr-FR')} FCFA`, style: 'tableCell', alignment: 'right' } as any,
        { 
          text: hasPrixRepreneur ? `${data.prixRepreneur?.toLocaleString('fr-FR')} FCFA` : '-',
          style: 'tableCell', 
          alignment: 'right',
          color: hasPrixRepreneur ? '#10B981' : '#999'
        } as any,
        { text: `${data.totalStandard?.toLocaleString('fr-FR')} FCFA`, style: 'tableCell', alignment: 'right' } as any,
        { 
          text: hasPrixRepreneur ? `${data.totalRepreneur?.toLocaleString('fr-FR')} FCFA` : '-',
          style: 'tableCell', 
          alignment: 'right',
          color: hasPrixRepreneur ? '#10B981' : '#999',
          bold: true
        } as any,
      ];
    });

    // Définition du document PDF
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 60, 40, 60],
      header: {
        margin: [40, 20, 40, 0],
        columns: [
          {
            width: '*',
            stack: [
              { text: 'RAPPORT DES OPÉRATIONS', style: 'header', color: '#422AFB' },
              { text: service?.nom || '', style: 'subheader', color: '#666' },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: dayjs().format('DD/MM/YYYY HH:mm'), style: 'date', alignment: 'right' },
              { text: service?.restaurant?.nom || '', style: 'restaurant', alignment: 'right', color: '#666' },
            ],
          },
        ],
      },
      footer: (currentPage: number, pageCount: number) => {
        return {
          margin: [40, 0, 40, 20],
          columns: [
            { text: `Généré le ${dayjs().format('DD/MM/YYYY à HH:mm')}`, style: 'footer' },
            { text: `Page ${currentPage} / ${pageCount}`, style: 'footer', alignment: 'right' },
          ],
        };
      },
      content: [
        // Informations de la période
        {
          margin: [0, 0, 0, 15],
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Période du rapport', style: 'sectionTitle' },
                {
                  text: `Du ${dateRange[0].format('DD/MM/YYYY')} au ${dateRange[1].format('DD/MM/YYYY')}`,
                  style: 'period',
                },
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: 'Gérant', style: 'sectionTitle' },
                { text: service?.gerant?.name || 'Non assigné', style: 'period' },
              ],
            },
          ],
        },

        // Statistiques globales
        {
          margin: [0, 0, 0, 20],
          columns: [
            {
              width: '*',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 200,
                      h: 60,
                      r: 5,
                      color: '#E8F5E9',
                    },
                  ],
                },
                {
                  absolutePosition: { x: 50, y: 110 },
                  stack: [
                    { text: 'Total Utilisations', style: 'statLabel', color: '#2E7D32' },
                    { text: statistics.total.toString(), style: 'statValue', color: '#1B5E20' },
                  ],
                },
              ],
            },
            {
              width: '*',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 200,
                      h: 60,
                      r: 5,
                      color: '#FFF3E0',
                    },
                  ],
                },
                {
                  absolutePosition: { x: 280, y: 110 },
                  stack: [
                    { text: 'Montant Total', style: 'statLabel', color: '#E65100' },
                    {
                      text: `${statistics.totalAmount.toLocaleString('fr-FR')} FCFA`,
                      style: 'statValue',
                      color: '#BF360C',
                    },
                  ],
                },
              ],
            },
            {
              width: '*',
              stack: [
                {
                  canvas: [
                    {
                      type: 'rect',
                      x: 0,
                      y: 0,
                      w: 200,
                      h: 60,
                      r: 5,
                      color: '#E8EAF6',
                    },
                  ],
                },
                {
                  absolutePosition: { x: 510, y: 110 },
                  stack: [
                    { text: 'Tickets', style: 'statLabel', color: '#283593' },
                    {
                      text: Object.keys(statistics.byTicket).length.toString(),
                      style: 'statValue',
                      color: '#1A237E',
                    },
                  ],
                },
              ],
            },
          ],
        },

        // Titre du tableau
        { text: 'Liste des Opérations', style: 'tableTitle', margin: [0, 30, 0, 10] },

        // Tableau des opérations
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              return rowIndex === 0 ? '#422AFB' : rowIndex % 2 === 0 ? '#F5F5F5' : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E0E0E0',
            vLineColor: () => '#E0E0E0',
          },
        },

        // Récapitulatif par ticket
        { text: 'Récapitulatif par Ticket', style: 'tableTitle', margin: [0, 30, 0, 10], pageBreak: 'before' },

        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Ticket', style: 'tableHeader', fillColor: '#10B981' } as any,
                { text: 'Quantité', style: 'tableHeader', fillColor: '#10B981', alignment: 'center' } as any,
                { text: 'Prix Standard', style: 'tableHeader', fillColor: '#10B981', alignment: 'right' } as any,
                { text: 'Prix Repreneur', style: 'tableHeader', fillColor: '#10B981', alignment: 'right' } as any,
                { text: 'Total Standard', style: 'tableHeader', fillColor: '#10B981', alignment: 'right' } as any,
                { text: 'Total Repreneur', style: 'tableHeader', fillColor: '#10B981', alignment: 'right' } as any,
              ],
              ...recapByTicket,
              // Ligne de total
              [
                { text: 'TOTAL GÉNÉRAL', style: 'tableCell', bold: true, colSpan: 4, alignment: 'right' } as any,
                {} as any,
                {} as any,
                {} as any,
                {
                  text: `${Object.values(statistics.byTicket).reduce((sum: number, ticket: any) => sum + (ticket.totalStandard || 0), 0).toLocaleString('fr-FR')} FCFA`,
                  style: 'tableCell',
                  bold: true,
                  fontSize: 11,
                  alignment: 'right',
                  fillColor: '#F3F4F6',
                } as any,
                {
                  text: `${Object.values(statistics.byTicket).reduce((sum: number, ticket: any) => sum + (ticket.totalRepreneur || 0), 0)} FCFA`,
                  style: 'tableCell',
                  bold: true,
                  fontSize: 11,
                  alignment: 'right',
                  fillColor: '#D1FAE5',
                  color: '#10B981'
                } as any,
              ],
            ] as any,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              return rowIndex === 0 ? '#10B981' : rowIndex % 2 === 0 ? '#F5F5F5' : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E0E0E0',
            vLineColor: () => '#E0E0E0',
          },
        },
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          margin: [0, 0, 0, 5],
        },
        subheader: {
          fontSize: 12,
          italics: true,
        },
        date: {
          fontSize: 10,
          color: '#666',
        },
        restaurant: {
          fontSize: 10,
          italics: true,
        },
        sectionTitle: {
          fontSize: 11,
          bold: true,
          color: '#333',
          margin: [0, 0, 0, 5],
        },
        period: {
          fontSize: 13,
          color: '#422AFB',
          bold: true,
        },
        statLabel: {
          fontSize: 10,
          margin: [10, 10, 0, 5],
        },
        statValue: {
          fontSize: 18,
          bold: true,
          margin: [10, 0, 0, 10],
        },
        tableTitle: {
          fontSize: 14,
          bold: true,
          color: '#333',
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          color: 'white',
          margin: [5, 5, 5, 5],
        },
        tableCell: {
          fontSize: 9,
          margin: [5, 3, 5, 3],
        },
        footer: {
          fontSize: 8,
          color: '#999',
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    // Générer et ouvrir le PDF
    try {
      pdfMake.createPdf(docDefinition).open();
      message.success('Rapport généré avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      message.error('Erreur lors de la génération du rapport');
    }
  };

  const isLoading = isLoadingService || isLoadingOperations || isLoadingRepreneurs || isLoadingControllers;

  return (
    <div className="p-6">
      <Spin spinning={isLoading}>
        <Card>
          {/* Header */}
          <div className="mb-6">
              <Button 
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate({ to: '/admin/restaurations' })}
              className="mb-4"
            >
              Retour aux services
            </Button>

            <div className="flex items-center justify-between">
              <div>
                <Title level={2} className="mb-2">
                  <ShopOutlined className="mr-2" />
                  {service?.nom}
                </Title>
                {service?.description && (
                  <Text type="secondary">{service.description}</Text>
                )}
                {service?.restaurant && (
                  <div className="mt-2">
                    <Tag color="blue" icon={<ShopOutlined />}>
                      {service.restaurant.nom}
                    </Tag>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Text>Statut:</Text>
                  <Switch
                    checked={service?.active}
                    onChange={handleToggleStatus}
                    loading={isTogglingStatus}
                    checkedChildren="Ouverte"
                    unCheckedChildren="Fermée"
                  />
                </div>
                {service?.active ? (
                  <Tag color="success" className="text-md px-2 py-1">Ouverte</Tag>
                ) : (
                  <Tag color="error" className="text-md px-2 py-1">Fermée</Tag>
                )}
              </div>
            </div>
          </div>

          <Divider />

          {/* Configuration des Agents et Gérant */}
          <Card className="mb-6" title={
            <Space>
              <TeamOutlined />
              <span>Configuration du Personnel</span>
            </Space>
          } extra={
            <Space>
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={handleOpenConfig}
                style={{ background: '#422AFB', borderColor: '#422AFB' }}
              >
                Configurer Personnel
              </Button>
              <Button
                type="primary"
                icon={<DollarCircleOutlined />}
                onClick={handleOpenPrixConfig}
                style={{ background: '#10B981', borderColor: '#10B981' }}
              >
                Prix Repreneur
              </Button>
            </Space>
          }>
            <Row gutter={16}>
              {/* Gérant */}
              <Col xs={24} md={12}>
                <Card className="bg-blue-50">
                  <Space direction="vertical" className="w-full">
                    <div className="flex items-center gap-2">
                      <UserOutlined className="text-blue-600 text-xl" />
                      <Text strong className="text-lg">Gérant du Service</Text>
                    </div>
                    {service?.gerant ? (
                      <div className="flex items-center gap-3 mt-2">
                        <Avatar size={48} icon={<UserOutlined />} className="bg-blue-500" />
                        <div>
                          <Text strong className="block">
                            {service.gerant.name}
                          </Text>
                          <Text type="secondary" className="text-sm">
                            {service.gerant.email}
                          </Text>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400 mt-2">
                        <UserAddOutlined />
                        <Text type="secondary">Aucun gérant assigné</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </Col>

              {/* Agents de Contrôle */}
              <Col xs={24} md={12}>
                <Card className="bg-green-50">
                  <Space orientation="vertical" className="w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamOutlined className="text-green-600 text-xl" />
                        <Text strong className="text-lg">Agents de Contrôle</Text>
                      </div>
                      <Tag color="green">
                        {service?.agentsControle?.length || 0} agent(s)
                      </Tag>
                    </div>
                    {service?.agentsControle && service.agentsControle.length > 0 ? (
                      <List
                        size="small"
                        dataSource={service.agentsControle}
                        renderItem={(agent: any) => (
                          <List.Item className="px-0">
                            <List.Item.Meta
                              avatar={<Avatar size={32} icon={<UserOutlined />} className="bg-green-500" />}
                              title={`${agent.name}`}
                              description={agent.email}
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400 mt-2">
                        <UserAddOutlined />
                        <Text type="secondary">Aucun agent assigné</Text>
                      </div>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>
          </Card>

          <Divider />

          {/* Statistiques */}
          <Row gutter={16} className="mb-6">
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Total Utilisations"
                  value={statistics.total}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Montant Total"
                  value={statistics.totalAmount}
                  suffix="FCFA"
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Types de Tickets"
                  value={Object.keys(statistics.byTicket).length}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          {/* Filtres */}
          <Card className="mb-6 bg-gray-50">
            <Title level={5} className="mb-4">Filtres et Actions</Title>
            <Space direction="vertical" size="middle" className="w-full">
              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <RangePicker
                    className="w-full"
                    placeholder={['Date début', 'Date fin']}
                    value={dateRange}
                    onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                    format="DD/MM/YYYY"
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Select
                    className="w-full"
                    placeholder="Filtrer par ticket"
                    allowClear
                    value={selectedTicket}
                    onChange={setSelectedTicket}
                    options={ticketOptions}
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Select
                    className="w-full"
                    placeholder="Filtrer par agent"
                    allowClear
                    value={selectedAgent}
                    onChange={setSelectedAgent}
                    options={agentFilterOptions}
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Input
                    placeholder="Rechercher étudiant, code..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                  />
                </Col>
              </Row>
              <Row>
                <Col span={24}>
                  <Button
                    type="primary"
                    icon={<PrinterOutlined />}
                    onClick={handleGenerateReport}
                    disabled={!dateRange || filteredOperations.length === 0}
                    size="large"
                  >
                    Imprimer les opérations
                  </Button>
                </Col>
              </Row>
            </Space>
          </Card>

          {/* Tableau des opérations */}
          <Card title={`Liste des Utilisations (${filteredOperations.length})`}>
            <Table
              columns={columns}
              dataSource={filteredOperations}
              rowKey="_id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `Total: ${total} utilisations`,
              }}
              scroll={{ x: 1000 }}
            />
          </Card>

          {/* Détails par ticket */}
          {Object.keys(statistics.byTicket).length > 0 && (
            <Card title="Récapitulatif par Ticket" className="mt-6">
              <Row gutter={16}>
                {Object.entries(statistics.byTicket).map(([ticketId, data]: [string, any]) => {
                  const hasPrixRepreneur = data.prixRepreneur !== undefined && data.prixRepreneur !== null;
                  return (
                    <Col xs={24} sm={12} md={8} key={ticketId}>
                      <Card className="bg-green-50">
                        <div className="flex items-center justify-between mb-2">
                          <Title level={5} className="mb-0">{data.nom}</Title>
                          {hasPrixRepreneur && (
                            <Tag color="green" icon={<DollarCircleOutlined />}>
                              Prix Repreneur
                            </Tag>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Text type="secondary">Prix unitaire:</Text>
                            <Text strong>{data.prix?.toLocaleString('fr-FR')} FCFA</Text>
                          </div>
                          {hasPrixRepreneur && (
                            <div className="flex justify-between">
                              <Text type="secondary" className="text-xs">Prix standard:</Text>
                              <Text type="secondary" className="text-xs">
                                {data.prixStandard?.toLocaleString('fr-FR')} FCFA
                              </Text>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <Text type="secondary">Quantité:</Text>
                            <Text strong>{data.count}</Text>
                          </div>
                          <Divider className="my-2" />
                          <div className="flex justify-between">
                            <Text strong>Total:</Text>
                            <Text strong className="text-green-600">
                              {data.total?.toLocaleString('fr-FR')} FCFA
                            </Text>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          )}
        </Card>
      </Spin>

      {/* Modal de Configuration */}
      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>Configuration du Personnel</span>
          </Space>
        }
        open={configModalOpen}
        onCancel={() => {
          setConfigModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Spin spinning={isUpdatingConfig || isLoadingRepreneurs}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmitConfig}
            className="mt-4"
          >
            <Form.Item
              name="gerant"
              label="Gérant du Service"
              rules={[{ required: true, message: 'Le gérant est requis' }]}
              tooltip="Seuls les utilisateurs avec le rôle 'repreneur' peuvent être gérants"
            >
              <Select
                size="large"
                showSearch
                placeholder="Sélectionner un gérant (repreneur)"
                options={gerantOptions}
                loading={isLoadingRepreneurs}
                suffixIcon={<UserOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="agentsControle"
              label="Agents de Contrôle"
              tooltip="Sélectionnez les agents qui pourront contrôler les tickets dans ce service"
            >
              <Select
                mode="multiple"
                size="large"
                showSearch
                placeholder="Sélectionner des agents"
                options={agentOptions}
                loading={isLoadingControllers}
                suffixIcon={<TeamOutlined />}
              />
            </Form.Item>

            <Form.Item className="mb-0 mt-6">
              <Space className="w-full justify-end">
                <Button onClick={() => {
                  setConfigModalOpen(false);
                  form.resetFields();
                }}>
                  Annuler
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isUpdatingConfig}
                  style={{ background: '#422AFB', borderColor: '#422AFB' }}
                >
                  Enregistrer
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>

      {/* Modal de Configuration des Prix Repreneur */}
      <Modal
        title={
          <Space>
            <DollarCircleOutlined />
            <span>Configuration des Prix Repreneur</span>
          </Space>
        }
        open={prixModalOpen}
        onCancel={() => {
          setPrixModalOpen(false);
          prixForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Spin spinning={isUpdatingPrix}>
          <div className="mb-4">
            <Text type="secondary">
              Définissez les prix personnalisés pour le repreneur. Si aucun prix n'est défini, le prix standard du ticket sera utilisé.
            </Text>
          </div>
          <Form
            form={prixForm}
            layout="vertical"
            onFinish={handleSubmitPrix}
            className="mt-4"
          >
            {service?.ticketsacceptes && service.ticketsacceptes.length > 0 ? (
              <div className="space-y-4">
                {service.ticketsacceptes.map((ticket: Ticket) => {
                  const ticketId = ticket._id;
                  if (!ticketId) return null;
                  const ticketNom = ticket.nom || 'Ticket';
                  const prixStandard = ticket.prix || 0;
                  const prixRepreneur = service?.prixRepreneur?.[ticketId];

                  return (
                    <Card key={ticketId} size="small" className="bg-gray-50">
                      <Row gutter={16} align="middle">
                        <Col xs={24} md={12}>
                          <Space orientation="vertical" size={0}>
                            <Text strong className="text-base">{ticketNom}</Text>
                            <Text type="secondary" className="text-sm">
                              Prix standard: {prixStandard?.toLocaleString('fr-FR')} FCFA
                            </Text>
                            {prixRepreneur && (
                              <Tag color="green" className="mt-1">
                                Prix actuel: {prixRepreneur?.toLocaleString('fr-FR')} FCFA
                              </Tag>
                            )}
                          </Space>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name={`prix_${ticketId}`}
                            label="Prix Repreneur (FCFA)"
                            className="mb-0"
                            tooltip="Laissez vide pour utiliser le prix standard"
                          >
                            <InputNumber
                              size="large"
                              min={0}
                              style={{ width: '100%' }}
                              placeholder={`Prix par défaut: ${prixStandard} FCFA`}
                              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                              prefix={<DollarOutlined />}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Text type="secondary">Aucun ticket accepté dans ce service</Text>
              </div>
            )}

            <Form.Item className="mb-0 mt-6">
              <Space className="w-full justify-end">
                <Button onClick={() => {
                  setPrixModalOpen(false);
                  prixForm.resetFields();
                }}>
                  Annuler
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isUpdatingPrix}
                  style={{ background: '#10B981', borderColor: '#10B981' }}
                  disabled={!service?.ticketsacceptes || service.ticketsacceptes.length === 0}
                >
                  Enregistrer les Prix
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </div>
  );
}
