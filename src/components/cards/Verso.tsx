import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import QRCodePage from './QrcodePage';

Font.register({
  family: 'Bebas Neue',
  src: '/Bebas_Neue/BebasNeue-Regular.ttf'
});
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
    opacity:0.6
  },
});


function Verso() {
  return (
    <Document>
      <Page size={[285, 175]} style={tw('flex')}>
        <Image src="/img/bg_verso1.png" style={styles.pageBackground} />

        <View style={tw('flex flex-col w-full h-full px-3 py-2')}>
          <View style={tw('flex flex-row items-center justify-between')}>
            <Image src="/logo.png" style={{ width: 28, height: 28 }} />
            <View style={tw('flex flex-col items-center flex-1 px-2')}>
              <Text style={{
                fontFamily: 'Bebas Neue',
                fontSize: '7.5px',
                color: '#0f172a',
                textAlign: 'center',
                lineHeight: 1.1,
              }}>
                CENTRE RÉGIONAL DES ŒUVRES UNIVERSITAIRES
              </Text>
              <Text style={{
                fontFamily: 'Bebas Neue',
                fontSize: '7.5px',
                color: '#0f172a',
                textAlign: 'center',
                lineHeight: 1.1,
              }}>
                SOCIALES DE ZIGUINCHOR (CROUS/Z)
              </Text>
            </View>
            <Image src="/uasz.png" style={{ width: 28, height: 28 }} />
          </View>

          <View style={tw('flex items-center mt-1 mb-1')}>
            <View style={{
              borderRadius: 10,
              backgroundColor: '#0284c7',
              paddingHorizontal: 12,
              paddingVertical: 2,
            }}>
              <Text style={{
                fontFamily: 'Bebas Neue',
                fontSize: '11px',
                color: '#ffffff',
                letterSpacing: 1,
              }}>
                IDENTIFICATION NUMÉRIQUE
              </Text>
            </View>
          </View>

          <View style={tw('flex flex-row items-center justify-center mt-1')}>
            <View style={{
              borderWidth: 1.5,
              borderColor: '#0284c7',
              borderRadius: 12,
              backgroundColor: '#ffffff',
              paddingHorizontal: 5,
              paddingVertical: 5,
              alignItems: 'center',
            }}>
              <QRCodePage id="qrcode" size="default" />
            </View>
          </View>

          <View style={{
            marginTop: 2,
          }}>
             <Image src="/tampon.png" style={{ width: 90, height: 50 }} />
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default Verso