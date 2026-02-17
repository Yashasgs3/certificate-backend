const express = require("express");
const cors = require("cors");
require("dotenv").config();
const nodemailer = require("nodemailer");
const generateCertificate = require("./certificateGenerator");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const Certificate = require("./models/Certificate");
const fs = require("fs");
const path = require("path");

// Get base URL from environment or use production default
const BASE_URL = process.env.VERIFICATION_BASE_URL || 'https://www.broadbeachonline.com';

const app = express();

// Connect Database
connectDB();

app.use(cors());
app.use(express.json());

// Configure Nodemailer (Replace with your actual SMTP settings or use environment variables)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Define Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));

app.post("/generate-certificate", async (req, res) => {
  try {
    // Support both old and new field names
    const {
      studentName,
      fullName = studentName,
      courseName,
      id,
      certificateNumber = id ? `CERT-${id}-${new Date().getFullYear()}` : `CERT-${Date.now()}`,
      date,
      issueDate = date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      verificationUrl,
      instructorName,
      courseSubtitle,
    } = req.body;

    if (!fullName || !courseName) {
      return res.status(400).json({
        error: "Missing required fields: fullName (or studentName) and courseName",
      });
    }

    const certData = {
      fullName: fullName.trim(),
      courseName: courseName.trim(),
      certificateNumber: certificateNumber.trim(),
      issueDate: issueDate.trim(),
      verificationUrl:
        verificationUrl ||
        `${BASE_URL}/verify?cert=${certificateNumber}`,
      instructorName,
      courseSubtitle,
    };

    console.log("Generating certificate with data:", certData);

    const pdfBuffer = await generateCertificate(certData);

    // SAVE certificate to MongoDB (VERY IMPORTANT)
    try {
      await Certificate.create({
        fullName: certData.fullName,
        email: req.body.email || "no-email@example.com",
        courseName: certData.courseName,
        courseSubtitle: certData.courseSubtitle || "",
        certificateNumber: certData.certificateNumber,
        issueDate: certData.issueDate,
        instructorName: certData.instructorName || "",
        verificationUrl: certData.verificationUrl,
        status: "active",
      });
      console.log(`✅ Certificate saved to database: ${certificateNumber}`);
    } catch (dbError) {
      console.warn(`⚠️ Warning: Certificate generated but not saved to DB: ${dbError.message}`);
      // Continue anyway - PDF still generated successfully
    }

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${certificateNumber}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Failed to generate certificate", details: error.message });
  }
});

app.post("/send-certificate", async (req, res) => {
  try {
    const {
      email,
      studentName,
      fullName = studentName,
      courseName,
      id,
      certificateNumber = id ? `CERT-${id}-${new Date().getFullYear()}` : `CERT-${Date.now()}`,
      date,
      issueDate = date || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      verificationUrl,
      instructorName,
      courseSubtitle,
    } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email address is required" });
    }

    if (!fullName || !courseName) {
      return res.status(400).json({
        error: "Missing required fields: fullName (or studentName) and courseName",
      });
    }

    const certData = {
      fullName: fullName.trim(),
      courseName: courseName.trim(),
      certificateNumber: certificateNumber.trim(),
      issueDate: issueDate.trim(),
      verificationUrl:
        verificationUrl ||
        `${BASE_URL}/verify?cert=${certificateNumber}`,
      instructorName,
      courseSubtitle,
    };

    console.log("Generating certificate for email with data:", certData);

    const pdfBuffer = await generateCertificate(certData);

    // SAVE certificate to MongoDB
    try {
      await Certificate.create({
        fullName: certData.fullName,
        email: email,
        courseName: certData.courseName,
        courseSubtitle: certData.courseSubtitle || "",
        certificateNumber: certData.certificateNumber,
        issueDate: certData.issueDate,
        instructorName: certData.instructorName || "",
        verificationUrl: certData.verificationUrl,
        status: "active",
      });
      console.log(`✅ Certificate saved to database: ${certificateNumber}`);
    } catch (dbError) {
      console.warn(`⚠️ Warning: Certificate generated but not saved to DB: ${dbError.message}`);
      // Continue anyway - email still sends successfully
    }

    const mailOptions = {
      from: '"LMS Platform" <no-reply@lms.com>',
      to: email,
      subject: `Certificate of Completion: ${courseName}`,
      text: `Dear ${fullName},\n\nCongratulations on completing ${courseName}! Please find your certificate attached.\n\nBest regards,\nLMS Team`,
      attachments: [
        {
          filename: `Certificate-${certificateNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Certificate sent successfully to " + email });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email", details: error.message });
  }
});

// ============================================
// CERTIFICATE VERIFICATION ROUTES
// ============================================

// Serve certificate verification page
app.get("/verify", (req, res) => {
  try {
    const verificationPage = fs.readFileSync(
      path.join(__dirname, "templates", "certificate-verification.html"),
      "utf8"
    );
    res.send(verificationPage);
  } catch (err) {
    console.error("Error loading verification page:", err);
    res.status(500).send("Error loading verification page");
  }
});

// API endpoint to get certificate details
app.get("/api/verify-certificate/:certificateNumber", async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    // Find certificate in database
    let certificate = await Certificate.findOne({ certificateNumber });

    if (!certificate) {
      // If not in database, return a placeholder response
      // In production, you would only return verified certificates from database
      return res.status(404).json({ error: "Certificate not found" });
    }

    // Return certificate details
    res.json({
      fullName: certificate.fullName,
      email: certificate.email,
      courseName: certificate.courseName,
      courseSubtitle: certificate.courseSubtitle,
      certificateNumber: certificate.certificateNumber,
      issueDate: certificate.issueDate,
      instructorName: certificate.instructorName,
      status: certificate.status,
      expiryDate: certificate.expiryDate,
      score: certificate.score,
      completionDate: certificate.completionDate
    });
  } catch (error) {
    console.error("Error fetching certificate:", error);
    res.status(500).json({ error: "Error fetching certificate", details: error.message });
  }
});

// Save certificate to database after generation
app.post("/api/save-certificate", async (req, res) => {
  try {
    const {
      fullName,
      email,
      courseName,
      courseSubtitle,
      certificateNumber,
      issueDate,
      instructorName,
      score,
      expiryDate
    } = req.body;

    // Check if certificate already exists
    const existing = await Certificate.findOne({ certificateNumber });
    if (existing) {
      return res.status(400).json({ error: "Certificate already exists" });
    }

    // Create new certificate
    const certificate = new Certificate({
      fullName,
      email,
      courseName,
      courseSubtitle,
      certificateNumber,
      issueDate,
      instructorName,
      score,
      expiryDate,
      status: 'active'
    });

    await certificate.save();
    res.json({ message: "Certificate saved successfully", certificateNumber });
  } catch (error) {
    console.error("Error saving certificate:", error);
    res.status(500).json({ error: "Failed to save certificate", details: error.message });
  }
});

// Get all certificates (for admin)
app.get("/api/certificates", async (req, res) => {
  try {
    const certificates = await Certificate.find().sort({ createdAt: -1 });
    res.json(certificates);
  } catch (error) {
    console.error("Error fetching certificates:", error);
    res.status(500).json({ error: "Failed to fetch certificates" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
