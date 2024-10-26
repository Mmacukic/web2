const QRCode = require('qrcode');

const generateQRCode = async (ticketId) => {
  try {
    const qrCode = await QRCode.toDataURL(`https://yourdomain.com/ticket/${ticketId}`);
    return qrCode;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

module.exports = generateQRCode;
