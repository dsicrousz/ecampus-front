import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PDFViewer } from '@react-pdf/renderer';
import pdfMake from "pdfmake";
import { 
  Spin, 
  Card, 
  Avatar, 
  Typography, 
  Space, 
  Divider, 
  Button, 
  Popover, 
  message,
  Badge,
  Tag,
  Row,
  Col,
  Descriptions,
  Tooltip
} from "antd";
import { 
  MailOutlined, 
  PhoneOutlined, 
  BookOutlined, 
  PrinterOutlined,
  UserOutlined,
  IdcardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { font } from "@/components/vfs_fonts";
import { motif } from "@/components/motif";
import { logo } from "@/components/logo";
import { drapeau } from "@/components/drapeau";
import { EtudiantService } from "@/services/etudiant.service";
import { CompteService } from "@/services/compte.service";
import { env } from '@/env';
import dayjs from '@/config/dayjs.config';
import Recto from '@/components/cards/Recto';
import Verso from '@/components/cards/Verso';
import QRGenerator from '@/components/cards/QrCodeGenerator';

const { Text, Title } = Typography;
(pdfMake as any).vfs = font;

const format = (date: Date, formatStr: string) => {
  return dayjs(date).format(formatStr.replace(/d/g, 'D').replace(/y/g, 'Y'));
};

export const Route = createFileRoute('/admin/etudiants/$etudiantId')({
  component: RouteComponent,
})

function RouteComponent() {
  const qc = useQueryClient();
  const { etudiantId } = Route.useParams();
  const navigate = useNavigate()
  const key = ["loadEtudiant", etudiantId];
  const keycompte = ["loadCompteEtudiant", etudiantId];
  const etudiantService = new EtudiantService();
  const compteService = new CompteService();

  const { data: etudiant, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => etudiantService.getOne(etudiantId),
  });

  const { data: compte, isLoading: isLoadingC } = useQuery({
    queryKey: keycompte,
    queryFn: () => compteService.byEtudiant(etudiantId),
  });


  const { mutate: createC, isPending } = useMutation({
    mutationFn: (data: any) => compteService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keycompte });
      message.success('Compte créé avec succès');
    }
  });
  
  const getActiveInscription = (tab: any[]) => {
    const activeInscription = tab?.find((inscription: any) => inscription.active);
    return activeInscription;
  };

  
  const handleViewCompte = (id: string) => {
    window.location.href = `/admin/comptes/${id}`;
  };
  
  const handleGenAttest = () => {
    const docDefinition:any = {
      footer: {
        image: motif,
        height: 20,
        margin: [0, 20, 0, 0]
      },
      images: {
        avatar: `${env.VITE_APP_BACKURL_ETUDIANT}/${etudiant?.avatar}`,
      },
      styles: {
        title: {
          bold: true,
          alignment: 'center',
          fontSize: 14,
          margin: [0, 0, 0, 20]
        },
        header: {
          bold: true,
          fontSize: 12,
          margin: [0, 10, 0, 5]
        },
        subheader: {
          fontSize: 11,
          bold: true
        },
        normal: {
          fontSize: 10
        },
        field: {
          fontSize: 10,
          bold: true
        },
        value: {
          fontSize: 10,
          margin: [10, 0, 0, 0]
        },
        'value-bold': {
          fontSize: 10,
          margin: [10, 0, 0, 0],
          bold: true
        },
        signature: {
          alignment: 'right',
          margin: [0, 50, 0, 10],
          fontSize: 10,
          bold: true
        },
        footer: {
          alignment: 'center',
          italics: true,
          fontSize: 10
        },
        'footer-bold': {
          alignment: 'center',
          italics: true,
          fontSize: 10,
          bold: true
        }
      },
      defaultStyle: {
        font: 'Roboto'
      },
      content: [
        // En-tête
        {
          columnGap: 100,
          columns: [
            {
              width: 'auto',
              alignment: 'left',
              stack: [
                {text: "REPUBLIQUE DU SENEGAL", fontSize: 8, bold: true, alignment: "center"},
                {text: "Un Peuple, Un but, Une Foi", fontSize: 8, bold: true, margin: [0, 2], alignment: "center"},
                {image: drapeau, width: 40, alignment: "center"},
                {text: "MINISTERE DE L'ENSEIGNEMENT SUPERIEUR DE LA RECHERCHE ET DE L'INNOVATION", fontSize: 8, bold: true, margin: [0, 2], alignment: "center"},
                {text: "CENTRE REGIONAL DES OEUVRES UNIVERSITAIRES SOCIALES DE ZIGUINCHOR", fontSize: 8, bold: true, margin: [0, 2], alignment: "center"},
              ]
            },
            {
              width: 'auto',
              alignment: 'right',
              stack: [
                {image: logo, width: 60, alignment: "center"},
              ]
            }
          ]
        },

        {
          margin: [0,30],
          fillColor:"#1C7ED6",
          alignment:'center',
          layout:'noBorders',
          table: {
            widths: [500],
            body: [
              [ {text:`CERTIFICAT D'INSCRIPTION AUX ŒUVRES SOCIALES`,style:'title',color:'white',margin:[0,2]}],
            ]
          }
        },
        
        // Titre du certificat
        
        // Corps du certificat
        {
          text: [
            'Je soussigné(e), ',
            {text: 'M. Idrissa Coly', bold: true, italics: true},
            ', agissant en qualité de ',
            {text: 'Chef des services administratifs', bold: true, italics: true},
            ' au sein du CROUS de Ziguinchor, certifie que l\'étudiant(e) :'
          ],
          margin: [0, 0, 0, 15]
        },
        
        // Informations de l'étudiant
        {
          margin: [20, 0, 0, 0],
          columns: [
            {
              width: 120,
              stack: [
                {text: 'Nom : ', style: 'field'},
                {text: 'Matricule : ', style: 'field'},
                {text: 'Date et lieu de naissance : ', style: 'field'},
                {text: 'Nationalité : ', style: 'field'},
                {text: 'Établissement : ', style: 'field'},
                {text: 'Niveau d\'études / Filière : ', style: 'field'}
              ]
            },
            {
              width: '*',
              stack: [
                {text: `${etudiant?.nom} ${etudiant?.prenom}`, style: 'value'},
                {text: `${etudiant?.ncs || 'N/A'}`, style: 'value-bold'},
                {text: `${etudiant?.dateDeNaissance ? format(new Date(etudiant.dateDeNaissance), 'dd/MM/yyyy') : 'N/A'} à ${etudiant?.lieuDeNaissance || 'N/A'}`, style: 'value'},
                {text: `${etudiant?.nationalite || 'Sénégalaise'}`, style: 'value'},
                {text: `Université Assane Seck de Ziguinchor`, style: 'value'},
                {text: `${getActiveInscription(etudiant?.inscriptions)?.formation?.nom || 'N/A'}`, style: 'value'}
              ]
            },
            {
              width: 120,
              stack: [
                {image: 'avatar', width: 80, alignment: "center"},
              ]
            }
          ]
        },
        
        // Texte principal
        {
          text: [
            {text: '\nest ', style: 'normal'},
            {text: 'régulièrement inscrit(e)', bold: true, italics: true},
            {text: ' aux ', style: 'normal'},
            {text: 'œuvres sociales du CROUS de Ziguinchor', bold: true, italics: true},
            {text: ' pour l\'année universitaire ', style: 'normal'},
            {text: `${getActiveInscription(etudiant?.inscriptions)?.session?.nom || 'N/A'}`, bold: true, italics: true},
            {text: ', et bénéficie, à ce titre, des services suivants :', style: 'normal'}
          ],
          margin: [0, 15, 0, 10]
        },
        
        // Liste des services
        {
          margin: [20, 0, 0, 10],
          ul: [
            'Hébergement universitaire (sous réserve de disponibilité)',
            'Restauration universitaire',
            'Accès aux soins médicaux à l\'infirmerie du CROUS',
            'Accès aux activités sportives et culturelles',
            'Accès à la carte sociale de l\'etudiant(e)'
          ]
        },
        { qr: compte?.code, fit: '85' },
        
        // Conclusion
        {
          text: 'Ce certificat est délivré pour servir et valoir ce que de droit.',
          margin: [0, 15, 0, 0]
        },
        {
          margin: [0, 30],
          text: [
            {text: 'Date Délivrance : ', style: 'footer-bold'},
            {text: format(new Date(), 'dd/MM/yyyy'), style: 'footer-bold'},
            {text: '\n', style: 'footer'},
            {text: 'Date d\'expiration : ', style: 'footer-bold'},
            {text: "30/12/2025", style: 'footer-bold'}
          ],
        },
        
        // Signature
        {
          text: [
            'Le CSA du CROUSZ\n',
            'M. Idrissa COLY'
          ],
          style: 'signature',
          margin: [0, 15, 0,]
        },
        
      ]
    };
    
    pdfMake.createPdf(docDefinition).open();
  }


  const handleCreateCompte = () => {
    createC({ etudiant: etudiant?._id, password: '123456' });
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '32px 16px'
    }}>
      <Spin spinning={isLoading || isLoadingC || isPending}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            {/* Bouton de retour */}
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate({to:'/admin/etudiants'})}
              style={{
                fontSize: 16,
                height: 40,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              Retour à la liste des étudiants
            </Button>

            {/* En-tête avec badge de statut */}
            <Card
              style={{
                borderRadius: 16,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                overflow: 'hidden'
              }}
              bodyStyle={{ padding: 0 }}
            >
              <div style={{
                background: compte?.is_actif === false 
                  ? '#ff4d4f' 
                  : compte?.est_perdu? 'orange' : '#1890ff',
                padding: '24px 16px',
                color: 'white'
              }}>
                <Row align="middle" gutter={[16, 16]}>
                  <Col xs={24} sm={8} md={6} lg={4} style={{ textAlign: 'center' }}>
                    <Badge 
                      status={compte?.is_actif === false ? "error" : "success"}
                      offset={[-10, 100]}
                    >
                      <Avatar
                        src={etudiant?.avatar ? `${env.VITE_APP_BACKURL_ETUDIANT}/${etudiant.avatar}` : undefined}
                        size={{ xs: 100, sm: 120, md: 120,lg:120,xl:140 }}
                        icon={<UserOutlined />}
                        style={{
                          border: '4px solid white',
                          boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                        }}
                      />
                    </Badge>
                  </Col>
                  <Col xs={24} sm={16} md={18} lg={20}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Title 
                        level={2} 
                        style={{ 
                          color: 'white', 
                          margin: 0, 
                          fontWeight: 700,
                          wordBreak: 'break-word',
                          fontSize: 'clamp(18px, 4vw, 28px)'
                        }}
                      >
                        {etudiant?.prenom} {etudiant?.nom}
                      </Title>
                      <Space wrap>
                        <Tag 
                          icon={<IdcardOutlined />} 
                          color="blue"
                          style={{ fontSize: 14, padding: '4px 12px' }}
                        >
                          {etudiant?.ncs || 'N/A'}
                        </Tag>
                        {compte && (
                          <>
                          <Tag 
                            icon={compte?.is_actif === false ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                            color={compte?.is_actif === false ? "error" : "success"}
                            style={{ fontSize: 14, padding: '4px 12px' }}
                          >
                            {compte?.is_actif === false ? 'Compte Inactif' : 'Compte Actif'}
                          </Tag>
                          <Tag 
                            icon={compte?.est_perdu === true ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                            color={compte?.est_perdu === true ? "error" : "success"}
                            style={{ fontSize: 14, padding: '4px 12px' }}
                          >
                            {compte?.est_perdu === true ? 'Carte Perdue' : 'Carte En Main'}
                          </Tag>
                          </>
                          
                        )}
                      </Space>
                    </Space>
                  </Col>
                </Row>
              </div>

              <div style={{ padding: '24px 16px' }}>
                <Descriptions 
                  column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
                  bordered
                  size="middle"
                  labelStyle={{ whiteSpace: 'nowrap' }}
                  contentStyle={{ wordBreak: 'break-word' }}
                >
                  <Descriptions.Item 
                    label={<><MailOutlined style={{ marginRight: 8 }} />Email</>}
                  >
                    <Text copyable style={{ wordBreak: 'break-all' }}>{etudiant?.email}</Text>
                  </Descriptions.Item>
                  
                  <Descriptions.Item 
                    label={<><PhoneOutlined style={{ marginRight: 8 }} />Téléphone</>}
                  >
                    <Text copyable>{etudiant?.telephone}</Text>
                  </Descriptions.Item>
                  
                  <Descriptions.Item 
                    label={<><BookOutlined style={{ marginRight: 8 }} />Formation</>}
                  >
                    <Tag color="blue" style={{ fontSize: 13, maxWidth: '100%', whiteSpace: 'normal' }}>
                      {getActiveInscription(etudiant?.inscriptions)?.formation?.nom || 'Non définie'}
                    </Tag>
                  </Descriptions.Item>
                  
                  {etudiant?.dateDeNaissance && (
                    <Descriptions.Item 
                      label={<><CalendarOutlined style={{ marginRight: 8 }} />Date de naissance</>}
                    >
                      {format(new Date(etudiant.dateDeNaissance), 'dd/MM/yyyy')}
                    </Descriptions.Item>
                  )}
                  
                  {etudiant?.lieuDeNaissance && (
                    <Descriptions.Item 
                      label={<><EnvironmentOutlined style={{ marginRight: 8 }} />Lieu de naissance</>}
                    >
                      {etudiant.lieuDeNaissance}
                    </Descriptions.Item>
                  )}
                </Descriptions>

                <Divider />

                <Space wrap size="middle">
                  {!compte && (
                    <Popover
                      content={
                        <Space orientation="vertical">
                          <Text>Êtes-vous sûr de vouloir créer un compte pour cet étudiant ?</Text>
                          <Space>
                            <Button 
                              type="primary" 
                              danger 
                              onClick={handleCreateCompte}
                              size="small"
                            >
                              Confirmer
                            </Button>
                            <Button size="small">Annuler</Button>
                          </Space>
                        </Space>
                      }
                      title="Confirmation requise"
                      trigger="click"
                    >
                      <Button 
                        type="primary" 
                        icon={<MailOutlined />}
                        size="large"
                      >
                        Créer son compte
                      </Button>
                    </Popover>
                  )}

                  {compte && (
                    <>
                      <Tooltip title="Consulter l'historique des transactions">
                        <Button
                          type="primary"
                          icon={<BookOutlined />}
                          size="large"
                          onClick={() => handleViewCompte(compte._id)}
                          style={{ 
                            backgroundColor: '#52c41a', 
                            borderColor: '#52c41a',
                            boxShadow: '0 4px 12px rgba(82,196,26,0.4)'
                          }}
                        >
                          Transactions du compte
                        </Button>
                      </Tooltip>
                      
                      <Tooltip title="Générer et télécharger le certificat">
                        <Button
                          type="primary"
                          icon={<PrinterOutlined />}
                          size="large"
                          onClick={handleGenAttest}
                          style={{
                            backgroundColor: '#722ed1',
                            borderColor: '#722ed1'
                          }}
                        >
                          Certificat Provisoire
                        </Button>
                      </Tooltip>
                    </>
                  )}
                </Space>
              </div>
            </Card>

            {/* Section Documents numériques */}
            {compte && (
              <Card
                title={
                  <Space>
                    <IdcardOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                    <Title level={4} style={{ margin: 0 }}>Documents numériques</Title>
                  </Space>
                }
                style={{
                  borderRadius: 16,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                }}
                bodyStyle={{
                  background: '#fafafa',
                  padding: 32
                }}
              >
                <div style={{ display: 'none' }}>
                  <QRGenerator value={compte?.code} documentId="qrcode" />
                </div>
                
                <Row gutter={[24, 24]} justify="center">
                  <Col xs={24} lg={12}>
                    <Card
                      title="Recto de la carte"
                      bordered={false}
                      style={{
                        borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                      }}
                    >
                      <PDFViewer width="100%" height={300} style={{ border: 'none', borderRadius: 8 }}>
                        <Recto compte={compte} />
                      </PDFViewer>
                    </Card>
                  </Col>
                  
                  <Col xs={24} lg={12}>
                    <Card
                      title="Verso de la carte"
                      bordered={false}
                      style={{
                        borderRadius: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                      }}
                    >
                      <PDFViewer width="100%" height={300} style={{ border: 'none', borderRadius: 8 }}>
                        <Verso />
                      </PDFViewer>
                    </Card>
                  </Col>
                </Row>
              </Card>
            )}
          </Space>
        </div>
      </Spin>
    </div>
  );
}
