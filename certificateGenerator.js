const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Generate a professional certificate PDF using Puppeteer and HTML template.
 * @param {Object} data - Certificate data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateCertificate(data) {
  // Get base URL from environment or use production default
  const BASE_URL = process.env.VERIFICATION_BASE_URL || 'https://www.broadbeachonline.com';

  const {
    fullName,
    courseName,
    certificateNumber,
    issueDate,
    verificationUrl,
    instructorName = 'CSSMBB®, PMP®, CSM® Lead Auditor, Implementor, Tutor & Assessor ISO9001, ISO14001, ISO45001, ISO22000, ISO27001, ISO14064-1, ISO14067, GHG protocol',
    courseSubtitle = 'Certified Quality Management Internal Auditor',
    backgroundImagePath = path.join(__dirname, 'c1.jpeg'),
    logoLeftPath = path.join(__dirname, 'c2.png'),
    logoRightPath = path.join(__dirname, 'c3.png'),
    verifiedImagePath = path.join(__dirname, 'c4.png'),
    accreditation1Path = path.join(__dirname, 'c5.png'),
    accreditation2Path = path.join(__dirname, 'c6.jpg'),
    accreditation3Path = path.join(__dirname, 'c7.jpeg'),
    accreditation4Path = path.join(__dirname, 'c8.jpg'),
    broadbeachLogoPath = path.join(__dirname, 'c3.png')
  } = data;

  try {
    // Load HTML template
    let html = fs.readFileSync(
      path.join(__dirname, 'templates', 'certificate-template.html'),
      'utf8'
    );

    // Helper function to convert image to base64 data URL
    const imageToDataURL = (imagePath) => {
      if (!fs.existsSync(imagePath)) {
        console.warn(`Image not found: ${imagePath}`);
        return '';
      }
      try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64 = imageBuffer.toString('base64');
        const ext = path.extname(imagePath).toLowerCase().slice(1);
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
        return `data:${mimeType};base64,${base64}`;
      } catch (err) {
        console.error(`Error reading image ${imagePath}:`, err.message);
        return '';
      }
    };

    // Generate QR code as data URL
    const qrUrl = verificationUrl || `${BASE_URL}/verify?cert=${certificateNumber}`;
    console.log(`QR Code URL: ${qrUrl}`);
    const qrDataURL = await QRCode.toDataURL(qrUrl);

    // Convert images to base64 data URLs for reliable Puppeteer rendering
    const backgroundImage = imageToDataURL(backgroundImagePath);
    const logoLeftImage = imageToDataURL(logoLeftPath);
    const logoRightImage = imageToDataURL(logoRightPath);
    const verifiedImage = imageToDataURL(verifiedImagePath);
    const accreditation1 = imageToDataURL(accreditation1Path);
    const accreditation2 = imageToDataURL(accreditation2Path);
    const accreditation3 = imageToDataURL(accreditation3Path);
    const accreditation4 = imageToDataURL(accreditation4Path);
    const broadbeachLogo = imageToDataURL(broadbeachLogoPath);

    // Replace placeholders with actual data
    html = html
      .replace('{{fullName}}', fullName || 'YOUR NAME')
      .replace('{{courseName}}', courseName || 'ISO 9001:2015 (QMS)')
      .replace('{{courseSubtitle}}', courseSubtitle)
      .replace('{{certificateNumber}}', certificateNumber || 'CERT-2026-001')
      .replace('{{issueDate}}', issueDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))
      .replace('{{instructorName}}', instructorName)
      .replace('{{qrCode}}', qrDataURL)
      .replace('{{backgroundImage}}', backgroundImage)
      .replace('{{logoLeftImage}}', logoLeftImage)
      .replace('{{logoRightImage}}', logoRightImage)
      .replace('{{verifiedImage}}', verifiedImage)
      .replace('{{accreditation1}}', accreditation1)
      .replace('{{accreditation2}}', accreditation2)
      .replace('{{accreditation3}}', accreditation3)
      .replace('{{accreditation4}}', accreditation4)
      .replace('{{broadbeachLogo}}', broadbeachLogo);

    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport for A4 landscape
    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 2
    });

    // Load HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('Certificate rendered successfully');
    console.log(`Images loaded: ${[backgroundImage, logoLeftImage, logoRightImage, verifiedImage, accreditation1, accreditation2, accreditation3, accreditation4].filter(img => img).length}/8`);

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    });

    await browser.close();

    return pdfBuffer;
  } catch (err) {
    console.error('Error generating certificate:', err);
    throw err;
  }
}

module.exports = generateCertificate;