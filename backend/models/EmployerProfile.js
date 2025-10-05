const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema({
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employer', required: true, unique: true },
  
  // Basic Information
  employerCategory: { type: String },
  companyName: { type: String },
  phone: { type: String },
  email: { type: String },
  website: { type: String },
  establishedSince: { type: String },
  teamSize: { type: String },
  description: { type: String },
  
  // Company Details
  legalEntityCode: { type: String },
  corporateAddress: { type: String },
  branchLocations: { type: String },
  officialEmail: { type: String },
  officialMobile: { type: String },
  companyType: { type: String },
  cin: { type: String },
  gstNumber: { type: String },
  industrySector: { type: String },
  panNumber: { type: String },
  panCardImage: { type: String }, // Base64 encoded image
  cinImage: { type: String }, // Base64 encoded image
  gstImage: { type: String }, // Base64 encoded image
  certificateOfIncorporation: { type: String }, // Base64 encoded document
  authorizationLetter: { type: String }, // Base64 encoded document (legacy)
  authorizationLetters: [{
    fileName: { type: String },
    fileData: { type: String }, // Base64 encoded document
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    companyName: { type: String } // Company name for each authorization letter
  }], // Multiple authorization letters
  
  // Document verification status
  panCardVerified: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  cinVerified: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  gstVerified: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  incorporationVerified: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  authorizationVerified: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  agreeTerms: { type: String },
  
  // Primary Contact
  contactFullName: { type: String },
  contactDesignation: { type: String },
  contactOfficialEmail: { type: String },
  contactMobile: { type: String },
  companyIdCardPicture: { type: String }, // Base64 encoded image
  alternateContact: { type: String },
  
  // Legacy fields
  companyDescription: { type: String },
  logo: { type: String }, // Base64 encoded image
  coverImage: { type: String }, // Base64 encoded image
  industry: { type: String },
  companySize: { type: String, enum: ['1-10', '11-50', '51-200', '201-500', '500+'] },
  location: { type: String },
  foundedYear: { type: Number },
  socialLinks: {
    linkedin: String,
    twitter: String,
    facebook: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);