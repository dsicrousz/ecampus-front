import { Document, Font, Image, Page, StyleSheet, View } from "@react-pdf/renderer";
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
    <Page size={[285, 175]} style={tw('flex')} >
    <Image src="/img/bg_verso1.png" style={styles.pageBackground} />
           <View style={{...tw("flex flex-col justify-center items-center p-2 h-full")}}>
            <View style={tw("flex flex-col justify-center items-center px-8")}>
              <QRCodePage id="qrcode"/>
            </View>
             </View>
    </Page>
   
  </Document>
  )
}

export default Verso