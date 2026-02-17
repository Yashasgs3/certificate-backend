const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  courseSubtitle: {
    type: String,
    default: 'Certified Quality Management Internal Auditor'
  },
  certificateNumber: {
    type: String,
    required: true,
    unique: true
  },
  issueDate: {
    type: String,
    required: true
  },
  instructorName: {
    type: String,
    default: 'CSSMBB®, PMP®, CSM® Lead Auditor'
  },
  verificationUrl: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  courseId: {
    type: String
  },
  completionDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  score: {
    type: Number
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked'],
    default: 'active'
  },
  verificationCount: {
    type: Number,
    default: 0
  },
  lastVerifiedAt: {
    type: Date
  },
  verificationIPs: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Certificate', CertificateSchema);
