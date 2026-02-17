const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const User = require('../models/user');
const generateCertificate = require('../certificateGenerator');
const nodemailer = require('nodemailer');
const path = require('path');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate Certificate (Admin)
router.post('/admin/generate', async (req, res) => {
  try {
    const {
      fullName,
      email,
      courseName,
      courseSubtitle,
      certificateNumber,
      issueDate,
      instructorName,
      userId,
      courseId,
      completionDate
    } = req.body;

    if (!fullName || !courseName || !certificateNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate PDF
    const pdfBuffer = await generateCertificate({
      fullName,
      courseName,
      courseSubtitle,
      certificateNumber,
      issueDate: issueDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      instructorName: instructorName || 'CSSMBB®, PMP®, CSM® Lead Auditor, Implementor, Tutor & Assessor',
      verificationUrl: `${process.env.VERIFICATION_BASE_URL}/verify?cert=${certificateNumber}`
    });

    // Save to database
    const certificate = new Certificate({
      fullName,
      email,
      courseName,
      courseSubtitle,
      certificateNumber,
      issueDate: issueDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      instructorName,
      verificationUrl: `${process.env.VERIFICATION_BASE_URL}/verify?cert=${certificateNumber}`,
      userId,
      courseId,
      completionDate,
      status: 'active'
    });

    await certificate.save();
    console.log(`✅ Certificate saved to database: ${certificateNumber}`);

    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="Certificate_${certificateNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Error generating certificate:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send Certificate via Email
router.post('/admin/send', async (req, res) => {
  try {
    const {
      fullName,
      email,
      courseName,
      courseSubtitle,
      certificateNumber,
      issueDate,
      instructorName,
      userId,
      courseId
    } = req.body;

    if (!email || !certificateNumber) {
      return res.status(400).json({ error: 'Email and Certificate Number required' });
    }

    // Generate PDF
    const pdfBuffer = await generateCertificate({
      fullName,
      courseName,
      courseSubtitle,
      certificateNumber,
      issueDate: issueDate || new Date().toLocaleDateString(),
      instructorName,
      verificationUrl: `${process.env.VERIFICATION_BASE_URL}/verify?cert=${certificateNumber}`
    });

    // Save to database
    const certificate = new Certificate({
      fullName,
      email,
      courseName,
      courseSubtitle,
      certificateNumber,
      issueDate,
      instructorName,
      verificationUrl: `${process.env.VERIFICATION_BASE_URL}/verify?cert=${certificateNumber}`,
      userId,
      courseId,
      status: 'active'
    });

    await certificate.save();

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Your Certificate - ${courseName}`,
      html: `
        <h2>Congratulations ${fullName}!</h2>
        <p>You have successfully completed the course: <strong>${courseName}</strong></p>
        <p>Your certificate is attached to this email.</p>
        <p>Verify your certificate at: <a href="${process.env.VERIFICATION_BASE_URL}/verify?cert=${certificateNumber}">Verification Link</a></p>
        <br>
        <p>Best regards,<br>Broadbeach Online</p>
      `,
      attachments: [
        {
          filename: `Certificate_${certificateNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
        return res.status(500).json({ error: 'Failed to send email' });
      }
      console.log(`📧 Certificate emailed to: ${email}`);
      res.json({ success: true, message: 'Certificate sent successfully' });
    });
  } catch (err) {
    console.error('Error sending certificate:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all certificates (Admin)
router.get('/admin/list', async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ createdAt: -1 });
    res.json(certificates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get certificates by user
router.get('/user/:userId', async (req, res) => {
  try {
    const certificates = await Certificate.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(certificates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify certificate
router.get('/verify/:certificateNumber', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateNumber: req.params.certificateNumber });
    
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (certificate.status === 'revoked') {
      return res.json({ valid: false, status: 'revoked', message: 'This certificate has been revoked' });
    }

    if (certificate.status === 'expired') {
      return res.json({ valid: false, status: 'expired', message: 'This certificate has expired' });
    }

    // Log view to database
    try {
      certificate.verificationCount = (certificate.verificationCount || 0) + 1;
      certificate.lastVerifiedAt = new Date();
      certificate.verificationIPs = certificate.verificationIPs || [];
      
      const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if (!certificate.verificationIPs.includes(clientIP)) {
        certificate.verificationIPs.push(clientIP);
      }
      
      await certificate.save();
    } catch (logErr) {
      console.log('Non-critical: Could not log verification', logErr.message);
    }

    res.json({
      valid: true,
      certificate: {
        fullName: certificate.fullName,
        email: certificate.email,
        courseName: certificate.courseName,
        courseSubtitle: certificate.courseSubtitle,
        certificateNumber: certificate.certificateNumber,
        issueDate: certificate.issueDate,
        status: certificate.status
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Log certificate view (called from PHP page)
router.post('/log-view', async (req, res) => {
  try {
    const { certificateNumber, viewedAt, ipAddress, userAgent } = req.body;
    
    const certificate = await Certificate.findOne({ certificateNumber });
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Update view count and last viewed
    certificate.verificationCount = (certificate.verificationCount || 0) + 1;
    certificate.lastVerifiedAt = new Date();
    certificate.verificationIPs = certificate.verificationIPs || [];
    
    if (!certificate.verificationIPs.includes(ipAddress)) {
      certificate.verificationIPs.push(ipAddress);
    }
    
    await certificate.save();

    res.json({ success: true, message: 'View logged' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Revoke certificate (Admin)
router.post('/admin/revoke', async (req, res) => {
  try {
    const { certificateNumber, reason } = req.body;

    const certificate = await Certificate.findOneAndUpdate(
      { certificateNumber },
      { status: 'revoked', revokeReason: reason },
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({ success: true, message: 'Certificate revoked', certificate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update certificate status (Admin)
router.post('/admin/update-status', async (req, res) => {
  try {
    const { certificateNumber, status } = req.body;

    const certificate = await Certificate.findOneAndUpdate(
      { certificateNumber },
      { status },
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({ success: true, certificate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete certificate (Admin)
router.delete('/admin/:certificateNumber', async (req, res) => {
  try {
    const certificate = await Certificate.findOneAndDelete({ certificateNumber: req.params.certificateNumber });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
