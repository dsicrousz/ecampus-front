import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { requireRole } from '@/lib/route-protection';
import { 
  Card, 
  Table, 
  Button, 
  Input, 
  Space, 
  Tag, 
  message, 
  Spin, 
  Modal, 
  InputNumber, 
  Typography, 
  Avatar, 
  Divider, 
  Row, 
  Col, 
  Statistic,
  DatePicker,
  Select
} from 'antd';
import { 
  SearchOutlined, 
  QrcodeOutlined, 
  CheckCircleOutlined, 
  DollarOutlined, 
  IdcardOutlined, 
  PrinterOutlined, 
  WalletOutlined, 
  PlusOutlined,
  SendOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CompteService } from '@/services/compte.service';
import { OperationService } from '@/services/operation.service';
import { VendeurService } from '@/services/vendeurservice';
import { TransfertVersementService } from '@/services/transfert-versement.service';
import { UserService } from '@/services/user.service';
import { useState, useRef, useEffect, useMemo } from 'react';
import { validate } from 'uuid';
import pdfMake from 'pdfmake/build/pdfmake';
import dayjs from '@/config/dayjs.config';
import { font } from '@/components/vfs_fonts';
import { authClient } from '@/auth/auth-client';
import type { Compte } from '@/types/compte';
import type { Operation, TypeOperation } from '@/types/operation';
import type { TransfertVersement, TransfertVendeurRecouvreurDto } from '@/types/transfert-versement';
import { EtatTransfertColors, EtatTransfertLabels, ETAT_TRANSFERT } from '@/types/transfert-versement';
import type { User } from '@/types/user';
import type { ColumnsType } from 'antd/es/table';
import { formatMontant, getOperationDescription, TypeOperationColors, TypeOperationLabels } from '@/types/operation';
import { env } from '@/env';
import type { Dayjs } from 'dayjs';
import { useSymbologyScanner } from '@use-symbology-scanner/react';
import { USER_ROLE } from '@/types/user.roles';
import { QUERY_KEYS, queryKeys } from '@/constants';

(pdfMake as any).vfs = font;

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;


interface RechargeData {
  compte: string;
  montant: number;
  agentControle: string;
  note: string;
}

export const Route = createFileRoute('/admin/recharge/')({
  beforeLoad: () => requireRole([USER_ROLE.VENDEUR, USER_ROLE.SUPERADMIN]),
  component: RouteComponent
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const [openedRecharge, setOpenedRecharge] = useState(false);
  const [montantRecharge, setMontantRecharge] = useState<number>(0);
  const [, setSearchText] = useState('');
  const [, setSearchedColumn] = useState('');
  const searchInput = useRef<any>(null);
  const [timeFilter, setTimeFilter] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [qr, setQr] = useState<string>();
  const [openedTransfert, setOpenedTransfert] = useState(false);
  const [montantTransfert, setMontantTransfert] = useState<number>(0);
  const [selectedRecouvreur, setSelectedRecouvreur] = useState<string>();
  const [noteTransfert, setNoteTransfert] = useState<string>('');

  // Responsive routing: redirect to mobile on tablet and smaller screens
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 992) {
        navigate({ to: '/admin/recharge/mobile' });
      }
    };

    // Check initial screen size
    checkScreenSize();

    // Add resize listener
    const handleResize = () => {
      checkScreenSize();
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [navigate]);
  
  const qc = useQueryClient();
  const vendeurService = useMemo(() => new VendeurService(), []);
  const compteService = useMemo(() => new CompteService(), []);
  const operationService = useMemo(() => new OperationService(), []);
  const transfertVersementService = useMemo(() => new TransfertVersementService(), []);
  const userService = useMemo(() => new UserService(), []);
  
  const operationKey = ['operations', session?.user?.id];
  const soldeVendeurKey = ['solde', session?.user?.id];
  const transfertsKey = ['transferts-vendeur', session?.user?.id];
  const recouvreursKey = ['recouvreurs'];
  const compteKey = qr
    ? queryKeys.compteByCode(qr)
    : ([QUERY_KEYS.COMPTES, 'code', 'pending'] as const);


  const { data: allOperations, isLoading: isLoadingOperations } = useQuery<Operation[]>({
    queryKey: operationKey,
    queryFn: () => operationService.byAgent(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const operationsData = allOperations?.filter((op: Operation) => {
    if (!timeFilter) return true;
    const opDate = dayjs(op.createdAt);
    return opDate.isAfter(timeFilter[0]) && opDate.isBefore(timeFilter[1]);
  }) || [];

  const { data: soldeData, isLoading: isLoadingSolde } = useQuery<number>({
    queryKey: soldeVendeurKey,
    queryFn: () => vendeurService.getSolde(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const { data, isLoading } = useQuery<Compte>({
    queryKey: compteKey,
    queryFn: () => compteService.byCode(qr!),
    enabled: qr !== undefined,
  });

  const { data: recouvreurs, isLoading: isLoadingRecouvreurs } = useQuery<User[]>({
    queryKey: recouvreursKey,
    queryFn: () => userService.byRole(USER_ROLE.RECOUVREUR),
  });

  const { data: mesTransferts, isLoading: isLoadingTransferts } = useQuery<TransfertVersement[]>({
    queryKey: transfertsKey,
    queryFn: () => transfertVersementService.findByVendeur(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const { mutate: createTransfert, isPending: isPendingTransfert } = useMutation({
    mutationFn: (data: TransfertVendeurRecouvreurDto) => transfertVersementService.createVendeurRecouvreur(data),
    onSuccess: () => {
      message.success('Transfert envoyé avec succès');
      setOpenedTransfert(false);
      setMontantTransfert(0);
      setSelectedRecouvreur(undefined);
      setNoteTransfert('');
      qc.invalidateQueries({ queryKey: transfertsKey });
      qc.invalidateQueries({ queryKey: soldeVendeurKey });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Erreur lors du transfert');
    }
  });

  const { mutate: createRecharge, isPending: isPendingRecharge } = useMutation({
    mutationFn: (data: RechargeData) => operationService.recharge(data),
    onSuccess: () => {
      message.success('Recharge effectuée avec succès');
      setOpenedRecharge(false);
      setMontantRecharge(0);
      if (qr) {
        qc.invalidateQueries({ queryKey: queryKeys.compteByCode(qr) });
      }
      qc.invalidateQueries({ queryKey: soldeVendeurKey });
      qc.invalidateQueries({ queryKey: operationKey });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || 'Erreur lors de la recharge');
    }
  });

  const handleRecharge = () => {
    if (!montantRecharge || montantRecharge <= 0) {
      message.warning('Veuillez indiquer un montant valide');
      return;
    }

    const rechargeData: RechargeData = {
      compte: data?._id!,
      montant: montantRecharge,
      agentControle: session?.user?.id!,
      note: `Recharge effectuée par ${session?.user?.name}`
    };
    
    createRecharge(rechargeData);
  };

  const openRecharge = () => setOpenedRecharge(true);

  const handleTransfert = () => {
    if (!montantTransfert || montantTransfert <= 0) {
      message.warning('Veuillez indiquer un montant valide');
      return;
    }
    if (!selectedRecouvreur) {
      message.warning('Veuillez sélectionner un recouvreur');
      return;
    }
    if (montantTransfert > (soldeData || 0)) {
      message.warning('Montant supérieur à votre solde disponible');
      return;
    }

    const transfertData: TransfertVendeurRecouvreurDto = {
      vendeur_id: session!.user.id,
      recouvreur_id: selectedRecouvreur,
      montant: montantTransfert,
      note: noteTransfert || `Versement de ${session?.user?.name}`
    };
    
    createTransfert(transfertData);
  };

  const handleSymbol = (symbol: string) => {
    if(!symbol || symbol.length < 8) return;
    if (validate(symbol)) {
      setQr(symbol);
    }
  };

  useSymbologyScanner(handleSymbol,{symbologies:['EAN 8','EAN 13','QR Code']})

  const handlePrintRecord = () => {
    const docDefinition: any = {
      styles: {
        entete: { bold: true, alignment: 'center', fontSize: 10 },
        center: { alignment: 'center', fontSize: 8, bold: true },
        left: { alignment: 'left' },
        right: { alignment: 'right' },
        nombre: { alignment: 'right', fontSize: 10, bold: true },
        info: { fontSize: 8 },
        header3: { color: 'white', fillColor: '#73BFBA', bold: true, alignment: 'center', fontSize: 6 },
        header4: { color: 'white', fillColor: '#73BFBA', bold: true, alignment: 'right', fontSize: 6 },
        total: { color: 'white', bold: true, fontSize: 6, fillColor: '#73BFBA', alignment: 'center' },
        anotherStyle: { italics: true, alignment: 'right' }
      },
      content: [
        {
          columns: [
            {
              width: 'auto',
              alignment: 'left',
              stack: [
                { text: 'REPUBLIQUE DU SENEGAL\n', fontSize: 8, bold: true, alignment: 'center' },
                { text: 'Un Peuple, Un but, Une Foi\n', fontSize: 8, bold: true, margin: [0, 2], alignment: 'center' },
                // Logo drapeau
                { text: "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR DE LA RECHERCHE ET DE L'INNOVATION \n", fontSize: 8, bold: true, margin: [0, 2], alignment: 'center' },
                { text: 'CENTRE REGIONAL DES OEUVRES UNIVERSITAIRES SOCIALES DE ZIGUINCHOR\n', fontSize: 8, bold: true, margin: [0, 2], alignment: 'center' },
              ]
            },
            {
              width: 'auto',
              alignment: 'right',
              stack: [
                // Logo CROUS
                { text: `Ziguinchor Le : ${dayjs().format('DD/MM/YYYY')}`, fontSize: 8, bold: true, alignment: 'center' },
              ]
            }
          ]
        },
        {
          margin: [0, 20],
          fillColor: '#422AFB',
          alignment: 'center',
          layout: 'noBorders',
          table: {
            widths: [500],
            body: [
              [{ text: `OPERATIONS DU ${dayjs().format('DD/MM/YYYY')}`, fontSize: 16, bold: true, color: 'white', margin: [0, 4] }],
            ]
          }
        },
        {
          margin: [4, 4, 4, 4],
          alignment: 'justify',
          layout: {
            fillColor: function (rowIndex: number) {
              return (rowIndex === 0) ? '#A3AED0' : null;
            }
          },
          table: {
            widths: ['5%', '15%', '10%', '50%', '20%'],
            body: [
              [
                { text: '#', style: 'entete' },
                { text: 'DATE', style: 'entete' },
                { text: 'HEURE', style: 'entete' },
                { text: 'DESCRIPTION', style: 'entete' },
                { text: 'MONTANT', style: 'entete' }
              ],
              ...operationsData?.map((k: Operation, i: number) => ([
                { text: `${i + 1}`, style: 'info' },
                { text: `${dayjs(k.createdAt).format('DD/MM/YYYY')}`, style: 'info' },
                { text: `${dayjs(k.createdAt).format('HH:mm:ss')}`, style: 'info' },
                { text: `${k.note || getOperationDescription(k)}`, style: 'info' },
                { text: `${formatMontant(k.montant)}`, style: 'nombre' }
              ])),
              [
                { text: 'Montant Total', style: 'info', colSpan: 4 },
                '', '', '',
                { text: `${formatMontant(operationsData?.reduce((acc, cur) => acc + cur.montant, 0) || 0)}`, style: 'nombre', color: 'white', fillColor: '#422AFB' }
              ]
            ]
          }
        },
      ]
    };
    
    pdfMake.createPdf(docDefinition).open();
  };


  const handleSearchO = (
    selectedKeys: any[],
    confirm: () => void,
    dataIndex: string,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };
  
  const handleResetO = (clearFilters: () => void) => {
    clearFilters();
    setSearchText('');
  };
  
  const getColumnSearchPropsO = (dataIndex: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }: any) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Rechercher ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearchO(selectedKeys, confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            onClick={() => handleSearchO(selectedKeys, confirm, dataIndex)}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Rechercher
          </Button>
          <Button
            onClick={() => clearFilters && handleResetO(clearFilters)}
            size="small"
            style={{ width: 90 }}
          >
            Effacer
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            Fermer
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value: any, record: any) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes(value.toLowerCase()),
  });

  const columnsO: ColumnsType<Operation> = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      ...getColumnSearchPropsO('createdAt'),
      width: '20%',
      render: (text: string) => <Text strong>{dayjs(text).format('DD/MM/YYYY HH:mm')}</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: '15%',
      render: (type: TypeOperation) => {
        const color = TypeOperationColors[type] || 'default';
        const label = TypeOperationLabels[type] || type;
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Compte',
      dataIndex: ['compte', 'etudiant'],
      key: 'compte',
      width: '15%',
      render: (etudiant: any) => (
        <div>
          {etudiant?.prenom} {etudiant?.nom} {etudiant?.ncs}
        </div>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      width: '30%',
      render: (_: any, record: Operation) => <Text>{getOperationDescription(record)}</Text>,
    },
    {
      title: 'Montant',
      dataIndex: 'montant',
      key: 'montant',
      width: '20%',
      render: (montant: number) => <Text strong>{formatMontant(montant)}</Text>,
    },
  ];

  return (
    <div className="controller-page">
    <Spin spinning={isLoading || isLoadingSolde || isLoadingOperations || isPendingRecharge}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* Hero Section */}
        <Card className="controller-hero controller-hero-soft border-0 shadow-xl">
          <Row gutter={[24, 16]} align="middle" wrap>
            <Col flex="none">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <WalletOutlined style={{ fontSize: 28 }} />
              </div>
            </Col>
            <Col flex="auto">
              <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Espace vendeur
              </Text>
              <Title level={3} className="mb-1! mt-1! text-slate-900!">
                Recharge de comptes
              </Title>
              <Text type="secondary">
                Scannez le QR code d'un étudiant pour effectuer une recharge sur son compte
              </Text>
            </Col>
            <Col flex="none">
              <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Mon solde vendeur
                </Text>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-slate-900">
                    {formatMontant(soldeData || 0)}
                  </span>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Main Content */}
        <Row gutter={[16, 16]}>
          {/* QR Scanner Section */}
          <Col xs={24} md={12} lg={8}>
            <Card
              className="controller-panel"
              title={
                <Space>
                  <QrcodeOutlined style={{ fontSize: 20, color: '#0f172a' }} />
                  <Text strong style={{ color: '#0f172a' }}>Scanner QR Code</Text>
                </Space>
              }
              style={{ height: '100%', minHeight: 350 }}
            >
              <div className="controller-scan-frame">
                <img
                  src="/qrcode.gif"
                  alt="QR Scanner"
                  className="controller-scan-image"
                />
              </div>
              <div className="mt-4 text-center">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Positionnez le QR code de l'étudiant devant la caméra
                </Text>
              </div>
            </Card>
          </Col>

          {/* Student Info Section */}
          <Col xs={24} md={12} lg={16}>
            {data ? (
              <Card
                className="controller-panel"
                style={{ height: '100%', minHeight: 200, overflow: 'hidden' }}
                bodyStyle={{ padding: 0 }}
              >
                {/* En-tête étudiant */}
                <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
                  <Avatar
                    src={`${env.VITE_APP_BACKURL_ETUDIANT}/${data.etudiant?.avatar}`}
                    size={{ xs: 64, sm: 72, md: 80, lg: 88, xl: 96 }}
                    className="shrink-0 ring-2 ring-slate-200"
                  />
                  <div className="min-w-0 flex-1">
                    <Text className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Étudiant scanné
                    </Text>
                    <Title level={3} className="mb-1! mt-1! truncate text-slate-900!">
                      {data.etudiant?.prenom} {data.etudiant?.nom}
                    </Title>
                    <Tag
                      icon={<IdcardOutlined />}
                      color="blue"
                      style={{ borderRadius: 999 }}
                    >
                      {data.etudiant?.ncs}
                    </Tag>
                  </div>
                </div>

                {/* Corps de la carte */}
                <div style={{ padding: '24px 16px' }}>
                  {(data.etudiant as any)?.email || (data.etudiant as any)?.telephone ? (
                    <>
                      <Row gutter={[16, 16]}>
                        {/* Informations supplémentaires */}
                        {(data.etudiant as any)?.email && (
                          <Col xs={24} sm={12}>
                            <Space>
                              <Text type="secondary">Email:</Text>
                              <Text 
                                strong 
                                style={{ 
                                  fontSize: 13,
                                  wordBreak: 'break-word'
                                }}
                              >
                                {(data.etudiant as any).email}
                              </Text>
                            </Space>
                          </Col>
                        )}
                        {(data.etudiant as any)?.telephone && (
                          <Col xs={24} sm={12}>
                            <Space>
                              <Text type="secondary">Téléphone:</Text>
                              <Text strong style={{ fontSize: 13 }}>
                                {(data.etudiant as any).telephone}
                              </Text>
                            </Space>
                          </Col>
                        )}
                      </Row>

                      <Divider style={{ margin: '16px 0' }} />
                    </>
                  ) : null}
                  
                  {/* Carte Solde */}
                  <Card 
                    style={{ 
                      background: '#f8fafc', 
                      borderColor: '#e2e8f0',
                      borderRadius: 12,
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
                    }}
                    bodyStyle={{ padding: '20px' }}
                  >
                    <Row align="middle" gutter={16}>
                      <Col flex="none">
                        <div style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: 'rgba(82, 196, 26, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <WalletOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                        </div>
                      </Col>
                      <Col flex="auto">
                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                          Solde disponible
                        </Text>
                        <Title 
                          level={2} 
                          style={{ 
                            margin: 0, 
                            color: '#52c41a',
                            fontSize: 'clamp(20px, 5vw, 32px)'
                          }}
                        >
                          {formatMontant(data.solde || 0)}
                        </Title>
                      </Col>
                    </Row>
                  </Card>
                  
                  {/* Bouton de recharge */}
                  <Button 
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={openRecharge}
                    block
                    style={{ 
                      marginTop: 16,
                      height: 48,
                      fontSize: 16,
                      fontWeight: 600,
                      borderRadius: 8,
                      boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                    }}
                  >
                    Recharger le Compte
                  </Button>
                </div>
              </Card>
            ) : (
              <Card style={{ height: '100%', minHeight: 350 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minHeight: 300,
                  flexDirection: 'column',
                  padding: '0 16px'
                }}>
                  <div style={{ 
                    background: '#f1f5f9', 
                    padding: 32, 
                    borderRadius: '50%',
                    marginBottom: 24,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}>
                    <QrcodeOutlined style={{ fontSize: 56, color: '#bfbfbf' }} />
                  </div>
                  <Title level={4} type="secondary" style={{ textAlign: 'center' }}>
                    En attente de scan
                  </Title>
                  <Text type="secondary" style={{ textAlign: 'center', maxWidth: 300 }}>
                    Scannez le QR code d'un étudiant pour voir ses informations et effectuer une recharge
                  </Text>
                </div>
              </Card>
            )}
          </Col>
        </Row>

        {/* Section Transfert vers Recouvreur */}
        <Card
          className="controller-panel"
          title={
            <Space>
              <SendOutlined style={{ fontSize: 20, color: '#0f172a' }} />
              <Text strong style={{ color: '#0f172a' }}>Transfert vers Recouvreur</Text>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => setOpenedTransfert(true)}
              style={{ background: '#f97316', borderColor: '#f97316' }}
            >
              Nouveau Transfert
            </Button>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-orange-700 font-medium">Transferts en attente</span>}
                  value={mesTransferts?.filter(t => t.etat === ETAT_TRANSFERT.EN_ATTENTE).length || 0}
                  valueStyle={{ color: '#f97316', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-emerald-700 font-medium">Transferts validés</span>}
                  value={mesTransferts?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).length || 0}
                  valueStyle={{ color: '#16a34a', fontSize: '1.75rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="controller-stat-card" size="small">
                <Statistic
                  title={<span className="text-emerald-700 font-medium">Montant total transféré</span>}
                  value={mesTransferts?.filter(t => t.etat === ETAT_TRANSFERT.VALIDE).reduce((acc, t) => acc + t.montant, 0) || 0}
                  formatter={(value) => formatMontant(Number(value))}
                  valueStyle={{ color: '#16a34a', fontSize: '1.5rem', fontWeight: 800 }}
                />
              </Card>
            </Col>
          </Row>
          
          <Divider />
          
          <Table
            className="controller-table"
            columns={[
              {
                title: 'Date',
                dataIndex: 'createdAt',
                key: 'createdAt',
                width: '15%',
                render: (text: string) => <Text>{dayjs(text).format('DD/MM/YYYY HH:mm')}</Text>,
              },
              {
                title: 'Recouvreur',
                dataIndex: 'destination_acteur_name',
                key: 'destination_acteur_name',
                width: '25%',
                render: (dest: any) => (
                  <Space>
                    <UserOutlined />
                    <Text strong>{dest}</Text>
                  </Space>
                ),
              },
              {
                title: 'Montant',
                dataIndex: 'montant',
                key: 'montant',
                width: '20%',
                render: (montant: number) => <Text strong>{formatMontant(montant)}</Text>,
              },
              {
                title: 'Note',
                dataIndex: 'note',
                key: 'note',
                width: '20%',
                render: (note: string) => <Text type="secondary">{note || '-'}</Text>,
              },
              {
                title: 'Statut',
                dataIndex: 'etat',
                key: 'etat',
                width: '20%',
                render: (etat: ETAT_TRANSFERT) => (
                  <Tag color={EtatTransfertColors[etat]}>{EtatTransfertLabels[etat]}</Tag>
                ),
              },
            ]}
            dataSource={mesTransferts}
            rowKey="_id"
            loading={isLoadingTransferts}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 600 }}
          />
        </Card>

        {/* Operations Table */}
        <Card
          className="controller-panel"
          title={
            <Space>
              <DollarOutlined style={{ fontSize: 20, color: '#0f172a' }} />
              <Text strong style={{ color: '#0f172a' }}>Mes Opérations (Recharges)</Text>
            </Space>
          }
          extra={
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrintRecord}
            >
              IMPRIMER
            </Button>
          }
        >
          <Space orientation="vertical" style={{ width: '100%' }}>
            <RangePicker
              onChange={(dates: any) => setTimeFilter(dates)}
              value={timeFilter}
              placeholder={['Début', 'Fin']}
              maxDate={dayjs().endOf('day')}
              showTime
              style={{ width: '100%', maxWidth: 400 }}
            />
            <Table
              className="controller-table"
              columns={columnsO}
              dataSource={operationsData}
              rowKey="_id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          </Space>
        </Card>
      </Space>

      {/* Modal Recharge */}
      <Modal 
        open={openedRecharge} 
        onCancel={() => {
          setOpenedRecharge(false);
          setMontantRecharge(0);
        }}
        title={
          <Space>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(82, 196, 26, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PlusOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            </div>
            <Title level={4} style={{ margin: 0, color: '#52c41a' }}>Recharge de Compte</Title>
          </Space>
        }
        footer={[
          <Button 
            key="cancel" 
            size="large"
            onClick={() => {
              setOpenedRecharge(false);
              setMontantRecharge(0);
            }}
          >
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleRecharge}
            disabled={!montantRecharge || montantRecharge <= 0}
            loading={isPendingRecharge}
            style={{
              boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)'
            }}
          >
            Valider la Recharge
          </Button>,
        ]}
        width="90%"
        style={{ maxWidth: 600 }}
        centered
      >
        <Space direction="vertical" size="large" style={{ width: '100%', padding: '8px 0' }}>
          {data && (
            <Card 
              size="small" 
              style={{ 
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 12
              }}
            >
              <Row gutter={16} align="middle" wrap>
                <Col flex="none">
                  <Avatar
                    src={`${env.VITE_APP_BACKURL_ETUDIANT}/${data.etudiant?.avatar}`}
                    size={{ xs: 50, sm: 60 }}
                    style={{ 
                      border: '3px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                </Col>
                <Col flex="auto">
                  <Text strong style={{ fontSize: 15, display: 'block' }}>
                    {data.etudiant?.prenom} {data.etudiant?.nom}
                  </Text>
                  <Tag 
                    icon={<IdcardOutlined />}
                    color="blue" 
                    style={{ marginTop: 4, fontSize: 12 }}
                  >
                    {data.etudiant?.ncs}
                  </Tag>
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Solde actuel: </Text>
                    <Text strong style={{ color: '#52c41a', fontSize: 14 }}>
                      {formatMontant(data.solde || 0)}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
          
          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Montant de la recharge
            </Text>
            <InputNumber
              size="large"
              min={0}
              step={100}
              placeholder="Entrez le montant"
              value={montantRecharge}
              onChange={(value) => setMontantRecharge(value || 0)}
              style={{ 
                width: '100%',
                fontSize: 16
              }}
              addonAfter="FCFA"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              Montant minimum: 100 FCFA
            </Text>
          </div>
          
          {montantRecharge > 0 && data && (
            <Card 
              size="small" 
              style={{ 
                background: '#f0fdf4', 
                borderColor: '#bbf7d0',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)'
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Aperçu de la recharge
                </Text>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text type="secondary">Solde actuel</Text>
                  </Col>
                  <Col>
                    <Text strong>{formatMontant(data.solde || 0)}</Text>
                  </Col>
                </Row>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text type="secondary">Montant à ajouter</Text>
                  </Col>
                  <Col>
                    <Text strong style={{ color: '#1890ff' }}>
                      + {formatMontant(montantRecharge)}
                    </Text>
                  </Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong style={{ fontSize: 15 }}>Nouveau solde</Text>
                  </Col>
                  <Col>
                    <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                      {formatMontant((data.solde || 0) + montantRecharge)}
                    </Title>
                  </Col>
                </Row>
              </Space>
            </Card>
          )}
        </Space>
      </Modal>

      {/* Modal Transfert vers Recouvreur */}
      <Modal 
        open={openedTransfert} 
        onCancel={() => {
          setOpenedTransfert(false);
          setMontantTransfert(0);
          setSelectedRecouvreur(undefined);
          setNoteTransfert('');
        }}
        title={
          <Space>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(250, 140, 22, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <SendOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
            </div>
            <Title level={4} style={{ margin: 0, color: '#fa8c16' }}>Transfert vers Recouvreur</Title>
          </Space>
        }
        footer={[
          <Button 
            key="cancel" 
            size="large"
            onClick={() => {
              setOpenedTransfert(false);
              setMontantTransfert(0);
              setSelectedRecouvreur(undefined);
              setNoteTransfert('');
            }}
          >
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary"
            size="large"
            icon={<SendOutlined />}
            onClick={handleTransfert}
            disabled={!montantTransfert || montantTransfert <= 0 || !selectedRecouvreur}
            loading={isPendingTransfert}
            style={{
              background: '#fa8c16',
              borderColor: '#fa8c16',
              boxShadow: '0 4px 12px rgba(250, 140, 22, 0.3)'
            }}
          >
            Envoyer le Transfert
          </Button>,
        ]}
        width="90%"
        style={{ maxWidth: 600 }}
        centered
      >
        <Space direction="vertical" size="large" style={{ width: '100%', padding: '8px 0' }}>
          {/* Solde disponible */}
          <Card 
            size="small" 
            style={{ 
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 12
            }}
          >
            <Row align="middle" gutter={16}>
              <Col flex="none">
                <WalletOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              </Col>
              <Col flex="auto">
                <Text type="secondary" style={{ fontSize: 12 }}>Votre solde disponible</Text>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                  {formatMontant(soldeData || 0)}
                </Title>
              </Col>
            </Row>
          </Card>

          {/* Sélection du recouvreur */}
          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Sélectionner un recouvreur
            </Text>
            <Select
              size="large"
              placeholder="Choisir un recouvreur"
              value={selectedRecouvreur}
              onChange={(value) => setSelectedRecouvreur(value)}
              style={{ width: '100%' }}
              loading={isLoadingRecouvreurs}
              showSearch
              optionFilterProp="children"
            >
              {recouvreurs?.map((rec) => (
                <Select.Option key={rec._id} value={rec._id}>
                  <Space>
                    <UserOutlined />
                    {rec.name}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </div>
          
          {/* Montant du transfert */}
          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Montant du transfert
            </Text>
            <InputNumber
              size="large"
              min={1}
              max={soldeData || 0}
              step={100}
              placeholder="Entrez le montant"
              value={montantTransfert}
              onChange={(value) => setMontantTransfert(value || 0)}
              style={{ width: '100%', fontSize: 16 }}
              addonAfter="FCFA"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              Maximum: {formatMontant(soldeData || 0)}
            </Text>
          </div>

          {/* Note optionnelle */}
          <div>
            <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
              Note (optionnelle)
            </Text>
            <Input.TextArea
              size="large"
              placeholder="Ajouter une note..."
              value={noteTransfert}
              onChange={(e) => setNoteTransfert(e.target.value)}
              rows={2}
            />
          </div>
          
          {/* Aperçu du transfert */}
          {montantTransfert > 0 && selectedRecouvreur && (
            <Card 
              size="small" 
              style={{ 
                background: '#fff7ed', 
                borderColor: '#fed7aa',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(249, 115, 22, 0.1)'
              }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Aperçu du transfert
                </Text>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text type="secondary">Montant à transférer</Text>
                  </Col>
                  <Col>
                    <Text strong style={{ color: '#fa8c16', fontSize: 16 }}>
                      {formatMontant(montantTransfert)}
                    </Text>
                  </Col>
                </Row>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text type="secondary">Recouvreur</Text>
                  </Col>
                  <Col>
                    <Text strong>
                      {recouvreurs?.find(r => r._id === selectedRecouvreur)?.name || '-'}
                    </Text>
                  </Col>
                </Row>
                <Divider style={{ margin: '8px 0' }} />
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong style={{ fontSize: 15 }}>Solde après transfert</Text>
                  </Col>
                  <Col>
                    <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                      {formatMontant((soldeData|| 0) - montantTransfert)}
                    </Title>
                  </Col>
                </Row>
              </Space>
            </Card>
          )}
        </Space>
      </Modal>
    </Spin>
    </div>
  );
}
