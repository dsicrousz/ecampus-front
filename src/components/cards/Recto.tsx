import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import QRCodePage from './QrcodePage';
import { env } from "@/env";
import {type  Compte } from "@/types/compte";

interface RectoProps {
  compte: Compte;
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
});

function Recto({ compte }: RectoProps) {
  // Vérifier si l'étudiant existe
  if (!compte?.etudiant) {
    return null;
  }

  const etudiant = compte.etudiant;
  const etudiantContact = etudiant as typeof etudiant & {
    telephone?: string;
    adresse?: string;
  };
  return (
    <Document>
      <Page size={[285, 175]} style={tw('flex')}>
        <Image src="/bg_recto.png" style={styles.pageBackground} />

        <View style={tw('flex flex-col w-full h-full px-3 py-3')}>
         <View style={tw('flex flex-row items-center justify-center w-full mb-2')}>
            <Image src="/logo.png" style={{ width: 40, height: 40 }} />
          </View>

          <View style={tw('flex flex-col items-center mb-10')}>
            <View style={{
              backgroundColor: '#0284c7',
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 4,
            }}>
              <Text style={{
                fontFamily: 'Bebas Neue',
                fontSize: '20px',
                color: '#ffffff',
                letterSpacing: 1.2,
              }}>
                CARTE SOCIALE
              </Text>
            </View>
              <View style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            alignItems: 'center',
            marginBottom: 4,
          }}>
            <Text style={{
              fontFamily: 'Bebas Neue',
              fontSize: `${etudiant.prenom?.length + etudiant.nom?.length > 22 ? '11' : '14'}px`,
              color: '#0f172a',
              textAlign: 'center',
              lineHeight: 1.1,
              marginBottom: 4,
              marginTop: 2,
            }}>
              {etudiant.prenom} {etudiant.nom}
            </Text>

            <View style={tw('flex flex-row items-center justify-center gap-4 mt-6')}>
              <View style={tw('flex flex-col items-center')}>
                <Text style={{
                  fontFamily: 'Bebas Neue',
                  fontSize: '9px',
                  color: '#475569',
                  marginBottom: 1,
                  textAlign: 'center',
                }}>
                  N° SOC.
                </Text>
                <Text style={{
                  fontFamily: 'Bebas Neue',
                  fontSize: '11px',
                  color: '#0f172a',
                  textAlign: 'center',
                }}>
                  {etudiant.ncs}
                </Text>
              </View>

              <View style={tw('flex flex-col items-center')}>
                <Text style={{
                  fontFamily: 'Bebas Neue',
                  fontSize: '9px',
                  color: '#475569',
                  marginBottom: 1,
                  textAlign: 'center',
                }}>
                  TÉLÉPHONE
                </Text>
                <Text style={{
                  fontFamily: 'Bebas Neue',
                  fontSize: '11px',
                  color: '#0f172a',
                  textAlign: 'center',
                }}>
                  {etudiantContact.telephone || 'N/A'}
                </Text>
              </View>

              <View style={tw('flex flex-col items-center')}>
                <Text style={{
                  fontFamily: 'Bebas Neue',
                  fontSize: '9px',
                  color: '#475569',
                  marginBottom: 1,
                  textAlign: 'center',
                }}>
                  ADRESSE
                </Text>
                <Text style={{
                  fontFamily: 'Bebas Neue',
                  fontSize: '11px',
                  color: '#0f172a',
                  textAlign: 'center',
                }}>
                  {etudiantContact.adresse || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
          </View>

          {/* Photo de profil - Coin inférieur gauche */}
          <View style={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            borderRadius: 44,
            borderWidth: 2,
            borderColor: '#0284c7',
            padding: 2,
            backgroundColor: '#ffffff',
          }}>
            <Image
              src={{ uri: `${env.VITE_APP_BACKURL_ETUDIANT}/${etudiant.avatar}` }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                objectFit: 'cover',
              }}
            />
          </View>

          {/* QR Code - Coin inférieur droit */}
          <View style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            borderWidth: 1.5,
            borderColor: '#0284c7',
            borderRadius: 8,
            backgroundColor: '#ffffff',
            padding: 3,
          }}>
            <QRCodePage id="qrcode" size="small" />
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default Recto