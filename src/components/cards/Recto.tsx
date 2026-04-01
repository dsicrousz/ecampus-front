import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import QRCodePage from './QrcodePage';
import { env } from "@/env";

interface RectoProps {
  compte: {
    etudiant: {
      prenom: string;
      nom: string;
      ncs: string;
      avatar: string;
    };
  };
}

Font.register({
  family: 'Bebas Neue',
  src:'/Bebas_Neue/BebasNeue-Regular.ttf'
})
const tw = createTw({
  theme: {
    fontFamily: {
      sans: ["Comic Sans"],
    },
    extend: {
      fontFamily: {
        'roboto': ['"Roboto Serif"', "serif"],
      },
    },
  },
});

const styles = StyleSheet.create({
  pageBackground: {
    position: 'absolute',
    minWidth: '100%',
    minHeight: '100%',
    display: 'flex',
    height: '100%',
    width: '100%',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  gradient: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
});

function Recto({ compte }: RectoProps) {
  return (
    <Document>
    <Page size={[285, 175]} style={tw('flex')} >
      <Image src="/bg_recto.png" style={styles.pageBackground} />
      
      {/* Container principal avec padding */}
      <View style={tw("flex flex-col w-full h-full p-3")}>
        
        {/* Header avec logos et titre */}
        <View style={tw('flex flex-col')}>
          {/* Logos et institution */}
          <View style={tw('flex flex-row justify-between items-center mb-1')}>
            <Image src="/logo.png" style={tw('w-12 h-12')} />
            
            <View style={tw("flex flex-col items-center flex-1 px-2")}>
              <Text style={{
                fontFamily:'Bebas Neue',
                fontSize:'9px',
                textAlign:'center',
                color:'#1e293b',
                lineHeight: 1.1,
                fontWeight: 'bold'
              }}>
                Centre Régional des Oeuvres Universitaires
              </Text>
              <Text style={{
                fontFamily:'Bebas Neue',
                fontSize:'9px',
                textAlign:'center',
                color:'#1e293b',
                lineHeight: 1.1,
                fontWeight: 'bold'
              }}>
                Sociales de Ziguinchor (CROUS/Z)
              </Text>
            </View>
            
            <Image src="/uasz.png" style={tw('w-12 h-12')}/>
          </View>

          {/* Titre de la carte avec style amélioré */}
          <View style={tw('flex flex-row items-center justify-center mb-2')}>
            <View style={{
              backgroundColor: '#2290f0',
              paddingHorizontal: 20,
              paddingVertical: 3,
              borderRadius: 12,
            }}>
              <Text style={{
                fontFamily:'Bebas Neue',
                fontSize:'18px',
                textAlign:"center",
                color:'#ffffff',
                letterSpacing: 2,
                fontWeight: 'bold'
              }}>
                CARTE SOCIALE
              </Text>
            </View>
          </View>
        </View>

        {/* Section profil étudiant - Centré */}
        <View style={tw('flex flex-col items-center justify-center w-full mt-2')}>
          {/* Nom complet */}
          <View style={{
            backgroundColor: 'rgba(34, 144, 240, 0.15)',
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 10,
            marginBottom: 8,
            borderWidth: 1,
          }}>
            <Text style={{
              fontFamily:'Bebas Neue',
              fontSize: `${compte?.etudiant.prenom?.length + compte?.etudiant.nom?.length > 20 ? '12' : '16'}px`,
              color:'#1e293b',
              textAlign:'center',
              letterSpacing: 0.5,
              lineHeight: 1.2,
              fontWeight: 'bold'
            }}>
              {compte?.etudiant.prenom} {compte?.etudiant.nom}
            </Text>
          </View>
          
          {/* Numéro étudiant */}
          <View style={tw('flex flex-row items-center justify-center')}>
            <View style={{
              backgroundColor: '#2290f0',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              marginRight: 6,
            }}>
              <Text style={{
                fontFamily:'Bebas Neue',
                fontSize:'10px',
                color:'#ffffff',
                fontWeight: 'bold'
              }}>
                N° ÉTUDIANT
              </Text>
            </View>
            <Text style={{
              fontFamily:'Bebas Neue',
              fontSize:'14px',
              fontWeight: 'bold',
              letterSpacing: 0.5
            }}>
              {compte?.etudiant.ncs}
            </Text>
          </View>
        </View>

        {/* Photo de profil - Coin inférieur gauche */}
        <View style={{
          position: 'absolute',
          bottom: 6,
          left: 6,
          borderRadius: 50,
          borderWidth: 3,
          borderColor: '#2290f0',
          padding: 2,
          backgroundColor: '#ffffff',
        }}>
          <Image
            src={{uri:`${env.VITE_APP_BACKURL_ETUDIANT}/${compte?.etudiant.avatar}`}}
            style={{
              width: 65,
              height: 65,
              borderRadius: 33,
              objectFit: 'cover',
            }}
          />
        </View>
        
        {/* QR Code - Coin inférieur droit */}
        <View style={{
          position: 'absolute',
          bottom: 6,
          right: 6,
          backgroundColor: '#ffffff',
          padding: 3,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: '#2290f0',
        }}>
          <QRCodePage id="qrcode" size="small" />
        </View>
      </View>
       
    </Page>
   
  </Document>
  )
}

export default Recto