import QRCode from 'qrcode';
import logger from '../config/logger.js';

const QRService = {
  /**
   * Genera un QR como DataURL (base64) para una direccion TRC-20.
   */
  async generateQR(address, amount = null) {
    let data = address;

    if (amount) {
      data = `tron:${address}?amount=${amount}`;
    }

    const qrImage = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      scale: 10,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return {
      address,
      qrImage,
      paymentUri: data,
    };
  },

  /**
   * Genera un QR como texto SVG (para renderizar directamente en HTML).
   */
  async generateQRSVG(address, amount = null) {
    let data = address;
    if (amount) {
      data = `tron:${address}?amount=${amount}`;
    }

    const svg = await QRCode.toString(data, {
      errorCorrectionLevel: 'H',
      type: 'svg',
      margin: 2,
    });

    return svg;
  },

  /**
   * Genera un QR como buffer de bytes (para enviar como archivo).
   */
  async generateQRBuffer(address, amount = null) {
    let data = address;
    if (amount) {
      data = `tron:${address}?amount=${amount}`;
    }

    const buffer = await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 2,
      scale: 10,
    });

    return buffer;
  },
};

export default QRService;
