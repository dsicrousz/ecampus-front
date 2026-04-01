import { QRCodeCanvas } from "qrcode.react";

interface QRGeneratorProps {
  value: string;
  documentId: string;
}

function QRGenerator({ value, documentId }: QRGeneratorProps) {
  return (
    <div>
      <QRCodeCanvas
        id={documentId}
        value={value}
        size={144}
        bgColor="#FFF"
        fgColor="#000"
        level="H"
      />
    </div>
  );
}

export default QRGenerator;