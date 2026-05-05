import { Card } from "@/components/ui/card";

interface QRCodeDisplayProps {
  qrCode: string;
  qrCodeUrl: string;
}

export default function QRCodeDisplay({ qrCode, qrCodeUrl }: QRCodeDisplayProps) {
  return (
    <Card className="p-6 bg-white">
      <div className="flex flex-col items-center gap-4">
        <img
          src={qrCodeUrl}
          alt="QR Code"
          className="w-48 h-48 border-2 border-border rounded-lg"
        />
        <div className="text-center">
          <p className="text-sm font-mono text-muted-foreground break-all">
            {qrCode}
          </p>
        </div>
      </div>
    </Card>
  );
}
