import { createFileRoute } from '@tanstack/react-router';
import { 
  Card, 
  Button, 
  InputNumber, 
  Space, 
  message, 
  Spin, 
  Modal, 
  Typography, 
  Avatar, 
  Badge, 
  Divider, 
  Row, 
  Col, 
  Statistic
} from 'antd';
import { 
  CheckCircleOutlined, 
  DollarOutlined, 
  WalletOutlined, 
  PlusOutlined 
} from '@ant-design/icons';
import { FaQrcode, FaTimes } from 'react-icons/fa';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CompteService } from '@/services/compte.service';
import { OperationService } from '@/services/operation.service';
import { VendeurService } from '@/services/vendeurservice';
import { useState } from 'react';
import { validate } from 'uuid';
import { authClient } from '@/auth/auth-client';
import type { Compte } from '@/types/compte';
import { formatMontant } from '@/types/operation';
import { env } from '@/env';

const { Title, Text } = Typography;

interface SoldeData {
  solde: number;
}

interface RechargeData {
  compte: string;
  montant: number;
  agentControle: string;
  note: string;
}

export const Route = createFileRoute('/admin/recharge/mobile/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const [openedRecharge, setOpenedRecharge] = useState(false);
  const [scannerOpened, setScannerOpened] = useState(false);
  const [montantRecharge, setMontantRecharge] = useState<number>(0);
  const [qr, setQr] = useState<string>();
  
  const qc = useQueryClient();
  const vendeurService = new VendeurService();
  const compteService = new CompteService();
  const operationService = new OperationService();
  
  const soldeVendeurKey = ['solde', session?.user?.id];
  const key = ['compte_depot'];

  const { data: soldeData, isLoading: isLoadingSolde } = useQuery<SoldeData>({
    queryKey: soldeVendeurKey,
    queryFn: () => vendeurService.getSolde(session!.user.id),
    enabled: !!session?.user?.id,
  });

  const { data, isLoading } = useQuery<Compte>({
    queryKey: key,
    queryFn: () => compteService.byCode(qr!),
    enabled: qr !== undefined,
  });

  const { mutate: createRecharge, isPending: isPendingRecharge } = useMutation({
    mutationFn: (data: RechargeData) => operationService.recharge(data),
    onSuccess: () => {
      message.success('Recharge effectuée avec succès');
      setOpenedRecharge(false);
      setMontantRecharge(0);
      setQr(undefined);
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: soldeVendeurKey });
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

  const handleScan = (detectedCodes: any) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const code = detectedCodes[0].rawValue;
      if (code && validate(code)) {
        setQr(code);
        setScannerOpened(false);
      }
    }
  };

  const handleScanError = (error: any) => {
    console.error('Erreur de scan:', error);
  };

  return (
    <Spin spinning={isLoading || isLoadingSolde || isPendingRecharge}>
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-purple-50 p-4">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <Card className="bg-linear-to-r from-purple-500 to-purple-600 border-0 shadow-xl">
            <div className="text-center">
              <div className="bg-white/20 p-4 rounded-xl backdrop-blur-sm inline-block mb-3">
                <WalletOutlined className="text-4xl text-white" />
              </div>
              <Title level={3} className="text-white mb-2">
                💰 Recharge de Comptes
              </Title>
              <Text className="text-purple-100">
                Scannez le QR code d'un étudiant
              </Text>
            </div>
          </Card>

          {/* Solde Vendeur */}
          <Card className="bg-linear-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg">
            <div className="text-center">
              <Text type="secondary" className="text-sm block mb-2">
                Mon Solde Vendeur
              </Text>
              <Title level={2} className="text-blue-600 mb-0">
                {formatMontant(soldeData?.solde || 0)}
              </Title>
            </div>
          </Card>

          {/* Bouton Scanner */}
          <Button
            type="primary"
            size="large"
            icon={<FaQrcode />}
            onClick={() => setScannerOpened(true)}
            className="w-full h-16 text-lg font-semibold"
            style={{
              backgroundColor: '#722ed1',
              borderColor: '#722ed1',
            }}
          >
            📱 Scanner le QR Code Étudiant
          </Button>

          {/* Informations Étudiant */}
          {data ? (
            <Card className="shadow-lg border-0">
              {/* Header avec avatar */}
              <div className="bg-linear-to-r from-blue-500 to-blue-600 p-4 -mx-6 -mt-6 mb-4 rounded-t-lg">
                <div className="text-center">
                  <Avatar
                    src={`${env.VITE_APP_BACKURL_ETUDIANT}/${data.etudiant?.avatar}`}
                    size={100}
                    className="border-4 border-white shadow-lg mb-3"
                  />
                  <Title level={4} className="text-white mb-1">
                    {data.etudiant?.prenom} {data.etudiant?.nom}
                  </Title>
                  <Badge
                    count={data.etudiant?.ncs}
                    style={{ backgroundColor: '#1890ff' }}
                  />
                </div>
              </div>

              {/* Solde actuel */}
              <Card 
                className="bg-linear-to-br from-green-50 to-green-100 border-green-200 mb-4"
                bodyStyle={{ padding: '16px' }}
              >
                <Row align="middle" gutter={16}>
                  <Col flex="none">
                    <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                      <WalletOutlined className="text-2xl text-green-600" />
                    </div>
                  </Col>
                  <Col flex="auto">
                    <Text type="secondary" className="text-xs block">
                      Solde disponible
                    </Text>
                    <Title level={3} className="text-green-600 mb-0">
                      {formatMontant(data.solde || 0)}
                    </Title>
                  </Col>
                </Row>
              </Card>

              {/* Bouton Recharger */}
              <Button 
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={openRecharge}
                block
                className="h-14 text-base font-semibold"
                style={{
                  backgroundColor: '#52c41a',
                  borderColor: '#52c41a',
                }}
              >
                Recharger le Compte
              </Button>
            </Card>
          ) : (
            <Card className="shadow-lg">
              <div className="text-center py-12">
                <div className="bg-gray-100 p-8 rounded-full inline-block mb-4">
                  <FaQrcode className="text-5xl text-gray-400" />
                </div>
                <Title level={5} type="secondary">
                  En attente de scan
                </Title>
                <Text type="secondary" className="text-sm">
                  Scannez un QR code pour commencer
                </Text>
              </div>
            </Card>
          )}

          {/* Statistiques */}
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card hoverable className="text-center">
                <Statistic
                  title="Solde Vendeur"
                  value={soldeData?.solde || 0}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: '1.5rem' }}
                  formatter={(value) => formatMontant(Number(value))}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card hoverable className="text-center">
                <Statistic
                  title="Recharges"
                  value={0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: '1.5rem' }}
                />
              </Card>
            </Col>
          </Row>
        </Space>

        {/* Modal Scanner QR Code */}
        <Modal
          open={scannerOpened}
          onCancel={() => setScannerOpened(false)}
          title={
            <div className="flex items-center gap-2">
              <FaQrcode className="text-purple-600 text-lg" />
              <span className="text-lg font-semibold text-gray-800">Scanner le QR Code</span>
            </div>
          }
          width={500}
          centered
          footer={null}
          className="qr-scanner-modal"
        >
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Text type="secondary">
                Positionnez le QR code de l'étudiant devant la caméra
              </Text>
            </div>
            
            <div className="relative rounded-lg overflow-hidden" style={{ height: '400px' }}>
              <Scanner
                onScan={handleScan}
                onError={handleScanError}
                constraints={{
                  facingMode: 'environment',
                }}
                components={{
                  finder: true,
                }}
              />
            </div>

            <div className="text-center">
              <Button
                icon={<FaTimes />}
                onClick={() => setScannerOpened(false)}
                size="large"
              >
                Annuler
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Recharge */}
        <Modal 
          open={openedRecharge} 
          onCancel={() => {
            setOpenedRecharge(false);
            setMontantRecharge(0);
          }}
          title={
            <Space>
              <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                <PlusOutlined className="text-green-600 text-lg" />
              </div>
              <Title level={4} className="mb-0 text-green-600">Recharge de Compte</Title>
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
              block
              className="mb-2"
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
              block
              style={{
                backgroundColor: '#52c41a',
                borderColor: '#52c41a',
              }}
            >
              Valider la Recharge
            </Button>,
          ]}
          width="95%"
          style={{ maxWidth: 500 }}
          centered
        >
          <Space direction="vertical" size="large" style={{ width: '100%', padding: '8px 0' }}>
            {data && (
              <Card 
                size="small" 
                className="bg-linear-to-br from-blue-50 to-blue-100 border-blue-200"
              >
                <Row gutter={16} align="middle">
                  <Col flex="none">
                    <Avatar
                      src={`${env.VITE_APP_BACKURL_ETUDIANT}/${data.etudiant?.avatar}`}
                      size={60}
                      className="border-2 border-white shadow"
                    />
                  </Col>
                  <Col flex="auto">
                    <Text strong className="text-sm block">
                      {data.etudiant?.prenom} {data.etudiant?.nom}
                    </Text>
                    <Badge
                      count={data.etudiant?.ncs}
                      style={{ backgroundColor: '#1890ff', fontSize: '10px' }}
                    />
                    <div className="mt-2">
                      <Text type="secondary" className="text-xs">Solde: </Text>
                      <Text strong className="text-green-600 text-sm">
                        {formatMontant(data.solde || 0)}
                      </Text>
                    </div>
                  </Col>
                </Row>
              </Card>
            )}
            
            <div>
              <Text strong className="text-sm block mb-2">
                Montant de la recharge
              </Text>
              <InputNumber
                size="large"
                min={0}
                step={100}
                placeholder="Entrez le montant"
                value={montantRecharge}
                onChange={(value) => setMontantRecharge(value || 0)}
                style={{ width: '100%' }}
                addonAfter="FCFA"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
              <Text type="secondary" className="text-xs block mt-2">
                Montant minimum: 100 FCFA
              </Text>
            </div>
            
            {montantRecharge > 0 && data && (
              <Card 
                size="small" 
                className="bg-linear-to-br from-green-50 to-green-100 border-green-200"
              >
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Text type="secondary" className="text-xs">
                    Aperçu de la recharge
                  </Text>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Text type="secondary" className="text-xs">Solde actuel</Text>
                    </Col>
                    <Col>
                      <Text strong className="text-sm">{formatMontant(data.solde || 0)}</Text>
                    </Col>
                  </Row>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Text type="secondary" className="text-xs">Montant à ajouter</Text>
                    </Col>
                    <Col>
                      <Text strong className="text-blue-600 text-sm">
                        + {formatMontant(montantRecharge)}
                      </Text>
                    </Col>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Text strong className="text-sm">Nouveau solde</Text>
                    </Col>
                    <Col>
                      <Title level={4} className="text-green-600 mb-0">
                        {formatMontant((data.solde || 0) + montantRecharge)}
                      </Title>
                    </Col>
                  </Row>
                </Space>
              </Card>
            )}
          </Space>
        </Modal>
      </div>
    </Spin>
  );
}
