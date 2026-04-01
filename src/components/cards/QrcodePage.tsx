import {  Image, View} from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";

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


interface QRCodePageProps {
  id: string;
  size?: 'small' | 'default' | 'large';
}

function QRCodePage({ id, size = 'default' }: QRCodePageProps) {
  const element = document.getElementById(id) as HTMLCanvasElement | null;
  
  if (!element) {
    console.error(`Element with id "${id}" not found`);
    return null;
  }
  
  const dataUrl = element.toDataURL();
  
  // Définir les tailles selon le paramètre
  const sizeStyles = {
    small: tw('h-16 w-16'),
    default: tw('h-28 w-28 -mt-4'),
    large: tw('h-32 w-32')
  };
  
  return (
      <View>
        <Image src={dataUrl} style={sizeStyles[size]} />
      </View>
  );
}

export default QRCodePage;
