const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const SubAdmin = require('../models/SubAdmin');
const Candidate = require('../models/Candidate');
const CandidateProfile = require('../models/CandidateProfile');
const Employer = require('../models/Employer');
const Placement = require('../models/Placement');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Blog = require('../models/Blog');
const Contact = require('../models/Contact');
const Support = require('../models/Support');
const Testimonial = require('../models/Testimonial');
const FAQ = require('../models/FAQ');
const Partner = require('../models/Partner');
const SiteSettings = require('../models/SiteSettings');
const EmployerProfile = require('../models/EmployerProfile');
const { base64ToBuffer, generateFilename } = require('../utils/base64Helper');
const { createNotification } = require('./notificationController');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { emitCreditUpdate, emitBulkCreditUpdate } = require('../utils/websocket');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

const checkSubAdminPermission = (userPermissions, requiredPermission) => {
  return userPermissions && userPermissions.includes(requiredPermission);
};

// Authentication Controller
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // First check if it's a regular admin
    let user = await Admin.findOne({ email });
    let userType = 'admin';
    
    // If not found in Admin, check SubAdmin
    if (!user) {
      user = await SubAdmin.findOne({ email });
      userType = 'sub-admin';
    }
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    const token = generateToken(user._id, userType);

    const responseData = {
      success: true,
      token,
      [userType === 'admin' ? 'admin' : 'subAdmin']: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ...(userType === 'sub-admin' && { permissions: user.permissions })
      }
    };

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dashboard Statistics Controller
exports.getDashboardStats = async (req, res) => {
  try {
    const totalCandidates = await Candidate.countDocuments();
    const totalEmployers = await Employer.countDocuments();
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();
    const activeJobs = await Job.countDocuments({ status: 'active' });
    const pendingJobs = await Job.countDocuments({ status: 'pending' });
    const pendingPlacements = await Placement.countDocuments({ status: 'pending' });

    const stats = {
      totalCandidates,
      totalEmployers,
      totalJobs,
      totalApplications,
      activeJobs,
      pendingJobs,
      pendingPlacements
    };

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Chart Data Controller
exports.getChartData = async (req, res) => {
  try {
    // Get monthly application data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyApplications = await Application.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const monthlyEmployers = await Employer.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get top employers by job count
    const topEmployers = await Job.aggregate([
      { $match: { status: 'active' } },
      {
        $lookup: {
          from: 'employers',
          localField: 'employerId',
          foreignField: '_id',
          as: 'employer'
        }
      },
      { $unwind: '$employer' },
      {
        $group: {
          _id: '$employerId',
          companyName: { $first: '$employer.companyName' },
          jobCount: { $sum: 1 }
        }
      },
      { $sort: { jobCount: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      chartData: {
        monthlyApplications,
        monthlyEmployers,
        topEmployers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// User Management Controllers
exports.getUsers = async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    
    let users;
    if (type === 'candidates') {
      users = await Candidate.find().select('-password')
        .limit(limit * 1).skip((page - 1) * limit);
    } else if (type === 'employers') {
      users = await Employer.find().select('-password')
        .limit(limit * 1).skip((page - 1) * limit);
    } else {
      const candidates = await Candidate.find().select('-password').limit(5);
      const employers = await Employer.find().select('-password').limit(5);
      users = { candidates, employers };
    }

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    
    if (userType === 'candidate') {
      await Candidate.findByIdAndDelete(userId);
    } else if (userType === 'employer') {
      await Employer.findByIdAndDelete(userId);
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId, userType } = req.params;
    
    let user;
    if (userType === 'candidate') {
      user = await Candidate.findByIdAndUpdate(userId, req.body, { new: true }).select('-password');
    } else if (userType === 'employer') {
      user = await Employer.findByIdAndUpdate(userId, req.body, { new: true }).select('-password');
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Job Management Controllers
exports.approveJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.jobId,
      { status: 'active' },
      { new: true }
    );

    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.jobId,
      { status: 'closed' },
      { new: true }
    );

    res.json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status) query.status = status;

    const jobs = await Job.find(query)
      .populate('employerId', 'companyName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllEmployers = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    let query = {};
    if (status) query.status = status;

    const employers = await Employer.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, data: employers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const candidates = await Candidate.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, data: candidates, candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEmployerStatus = async (req, res) => {
  try {
    const { status, isApproved } = req.body;

    const updateData = {};

    // Normalize and validate status to only 'active' | 'inactive'
    if (status !== undefined) {
      const normalized = String(status).toLowerCase();
      if (normalized === 'approved') {
        updateData.status = 'active';
      } else if (normalized === 'rejected') {
        updateData.status = 'inactive';
      } else if (normalized === 'active' || normalized === 'inactive') {
        updateData.status = normalized;
      }
      // Any other status values are ignored to prevent invalid writes
    }

    // Update approval flag
    if (isApproved !== undefined) updateData.isApproved = !!isApproved;

    // If approving and no explicit status provided, ensure account is active
    if (updateData.isApproved === true && updateData.status === undefined) {
      updateData.status = 'active';
    }
    
    const employer = await Employer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer not found' });
    }

    // Create notification for employer
    if (isApproved !== undefined) {
      const notificationData = {
        title: isApproved ? 'Account Approved' : 'Account Rejected',
        message: isApproved 
          ? 'Your employer account has been approved. You can now post jobs.' 
          : 'Your employer account has been rejected. Please contact support for more information.',
        type: isApproved ? 'profile_approved' : 'profile_rejected',
        role: 'employer',
        relatedId: employer._id,
        createdBy: req.user.id
      };
      
      await createNotification(notificationData);
    }

    res.json({ success: true, employer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    res.json({ success: true, message: 'Candidate deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteEmployer = async (req, res) => {
  try {
    const employer = await Employer.findByIdAndDelete(req.params.id);
    
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer not found' });
    }

    res.json({ success: true, message: 'Employer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEmployerProfile = async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({ employerId: req.params.id })
      .populate('employerId', 'name email phone companyName');
    
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Employer profile not found' });
    }

    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEmployerProfile = async (req, res) => {
  try {
    const profile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.params.id },
      req.body,
      { new: true }
    ).populate('employerId', 'name email phone companyName');
    
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Employer profile not found' });
    }

    // Check if any document verification status was updated and create notification
    try {
      const verificationFields = {
        panCardVerified: 'PAN Card',
        cinVerified: 'CIN Document',
        gstVerified: 'GST Certificate',
        incorporationVerified: 'Certificate of Incorporation',
        authorizationVerified: 'Authorization Letter'
      };

      for (const [field, documentName] of Object.entries(verificationFields)) {
        if (req.body[field] && (req.body[field] === 'approved' || req.body[field] === 'rejected')) {
          const notificationData = {
            title: `Document ${req.body[field] === 'approved' ? 'Approved' : 'Rejected'}`,
            message: `Your ${documentName} has been ${req.body[field]} by admin.`,
            type: req.body[field] === 'approved' ? 'profile_approved' : 'profile_rejected',
            role: 'employer',
            relatedId: new mongoose.Types.ObjectId(req.params.id),
            createdBy: new mongoose.Types.ObjectId(req.user.id)
          };
          
          console.log('Creating notification:', notificationData);
          const createdNotification = await createNotification(notificationData);
          console.log('Notification created:', createdNotification);
        }
      }
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Continue execution even if notification fails
    }

    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download Base64 document
exports.downloadDocument = async (req, res) => {
  try {
    const { employerId, documentType } = req.params;
    
    const profile = await EmployerProfile.findOne({ employerId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const base64Data = profile[documentType];
    if (!base64Data) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const { buffer, mimeType, extension } = base64ToBuffer(base64Data);
    const filename = generateFilename(documentType, extension);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Content Management Controllers
exports.createContent = async (req, res) => {
  try {
    const { type } = req.params;
    let content;

    switch (type) {
      case 'blog':
        content = await Blog.create({ ...req.body, author: req.user._id });
        break;
      case 'testimonial':
        content = await Testimonial.create(req.body);
        break;
      case 'faq':
        content = await FAQ.create(req.body);
        break;
      case 'partner':
        content = await Partner.create(req.body);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid content type' });
    }

    res.status(201).json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const { type, contentId } = req.params;
    let content;

    switch (type) {
      case 'blog':
        content = await Blog.findByIdAndUpdate(contentId, req.body, { new: true });
        break;
      case 'testimonial':
        content = await Testimonial.findByIdAndUpdate(contentId, req.body, { new: true });
        break;
      case 'faq':
        content = await FAQ.findByIdAndUpdate(contentId, req.body, { new: true });
        break;
      case 'partner':
        content = await Partner.findByIdAndUpdate(contentId, req.body, { new: true });
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid content type' });
    }

    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    const { type, contentId } = req.params;

    switch (type) {
      case 'blog':
        await Blog.findByIdAndDelete(contentId);
        break;
      case 'testimonial':
        await Testimonial.findByIdAndDelete(contentId);
        break;
      case 'faq':
        await FAQ.findByIdAndDelete(contentId);
        break;
      case 'partner':
        await Partner.findByIdAndDelete(contentId);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid content type' });
    }

    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Contact Form Management Controllers
exports.getContactForms = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (status) query.status = status;

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteContactForm = async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.contactId);
    res.json({ success: true, message: 'Contact form deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Site Settings Controllers
exports.updateSettings = async (req, res) => {
  try {
    const settings = await SiteSettings.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true }
    );

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = await SiteSettings.create({});
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const applications = await Application.find(filter)
      .populate('candidateId', 'name email phone')
      .populate('employerId', 'companyName email')
      .populate('jobId', 'title location')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRegisteredCandidates = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    // Use aggregation for better performance
    const candidatesWithProfiles = await Candidate.aggregate([
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'candidateprofiles',
          localField: '_id',
          foreignField: 'candidateId',
          as: 'profile'
        }
      },
      {
        $addFields: {
          profile: { $arrayElemAt: ['$profile', 0] },
          hasProfile: { $gt: [{ $size: '$profile' }, 0] }
        }
      },
      {
        $project: {
          password: 0
        }
      }
    ]);

    res.json({ success: true, data: candidatesWithProfiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCandidateDetails = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await Candidate.findById(candidateId).select('-password');
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const profile = await CandidateProfile.findOne({ candidateId });
    
    // Get candidate's job applications with company details
    const applications = await Application.find({ candidateId })
      .populate({
        path: 'jobId',
        select: 'title category location',
        populate: {
          path: 'employerId',
          select: 'companyName'
        }
      })
      .populate('employerId', 'companyName')
      .sort({ createdAt: -1 });

    // Format applications data for the frontend
    const formattedApplications = applications.map(app => ({
      companyName: app.jobId?.employerId?.companyName || app.employerId?.companyName || 'N/A',
      jobCategory: app.jobId?.category || 'N/A',
      shortlistedStatus: app.status === 'shortlisted' || app.status === 'interview_scheduled' || app.status === 'selected',
      currentRound: app.interviewRound || (app.status === 'applied' ? 'Initial' : app.status),
      selected: app.status === 'selected',
      appliedDate: app.createdAt,
      createdAt: app.createdAt
    }));
    
    const candidateWithProfile = {
      ...candidate.toObject(),
      ...profile?.toObject(),
      hasProfile: !!profile,
      applications: formattedApplications
    };

    res.json({ success: true, candidate: candidateWithProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEmployerJobs = async (req, res) => {
  try {
    const { employerId } = req.params;
    
    const jobs = await Job.find({ employerId })
      .select('title status createdAt')
      .sort({ createdAt: -1 });

    const jobCount = jobs.length;

    res.json({ success: true, jobs, jobCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Placement Management Controllers
exports.getAllPlacements = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    let query = {};
    if (status) query.status = status;

    const placements = await Placement.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, data: placements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePlacementStatus = async (req, res) => {
  try {
    const { status, isApproved } = req.body;

    const updateData = {};
    if (status !== undefined) {
      const normalized = String(status).toLowerCase();
      if (normalized === 'approved') {
        updateData.status = 'active';
      } else if (normalized === 'rejected') {
        updateData.status = 'inactive';
      }
    }

    if (isApproved !== undefined) updateData.isApproved = !!isApproved;
    if (updateData.isApproved === true && updateData.status === undefined) {
      updateData.status = 'active';
    }
    
    const placement = await Placement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement officer not found' });
    }

    // Create notification if approved
    if (updateData.status === 'active') {
      try {
        await createNotification({
          title: 'Account Approved',
          message: 'Your placement officer account has been approved by admin. You can now sign in.',
          type: 'placement_approved',
          role: 'placement',
          relatedId: placement._id,
          createdBy: req.user.id
        });
      } catch (notifError) {
        console.error('Failed to create approval notification:', notifError);
      }
    }

    res.json({ success: true, placement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPlacementDetails = async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.id).select('-password');
    
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement officer not found' });
    }

    res.json({ success: true, placement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadPlacementFile = async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.id);
    if (!placement || !placement.studentData) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const { buffer, mimeType } = base64ToBuffer(placement.studentData);
    const filename = placement.fileName || 'student_data.xlsx';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignPlacementCredits = async (req, res) => {
  try {
    const { credits } = req.body;
    const creditsNum = Math.min(10000, Math.max(0, parseInt(credits) || 0));
    
    const placement = await Placement.findById(req.params.id);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement officer not found' });
    }

    // Update all files in fileHistory with the new credits
    if (placement.fileHistory && placement.fileHistory.length > 0) {
      for (let file of placement.fileHistory) {
        file.credits = creditsNum;
        
        // Update the file data with new credits
        if (file.fileData) {
          try {
            const result = base64ToBuffer(file.fileData);
            const buffer = result.buffer;

            let workbook;
            if (file.fileType && file.fileType.includes('csv')) {
              const csvData = buffer.toString('utf8');
              workbook = XLSX.read(csvData, { type: 'string' });
            } else {
              workbook = XLSX.read(buffer, { type: 'buffer' });
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // Update all rows with new credits
            const updatedData = jsonData.map(row => ({
              ...row,
              'Credits Assigned': creditsNum,
              'credits assigned': creditsNum,
              'CREDITS ASSIGNED': creditsNum,
              Credits: creditsNum,
              credits: creditsNum,
              CREDITS: creditsNum,
              Credit: creditsNum,
              credit: creditsNum
            }));
            
            // Convert back to Excel/CSV
            const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
            const newWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);
            
            let newBuffer;
            let mimeType;
            if (file.fileType && file.fileType.includes('csv')) {
              const csvOutput = XLSX.utils.sheet_to_csv(newWorksheet);
              newBuffer = Buffer.from(csvOutput, 'utf8');
              mimeType = 'text/csv';
            } else {
              newBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
              mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }
            
            file.fileData = `data:${mimeType};base64,${newBuffer.toString('base64')}`;
          } catch (fileError) {
            console.error('Error updating file data with credits:', fileError);
          }
        }
      }
    }
    
    // Update legacy studentData if it exists
    let updatedStudentData = placement.studentData;
    if (placement.studentData && placement.fileType) {
      try {
        const XLSX = require('xlsx');
        const { buffer } = base64ToBuffer(placement.studentData);
        
        let workbook;
        if (placement.fileType.includes('csv')) {
          const csvData = buffer.toString('utf8');
          workbook = XLSX.read(csvData, { type: 'string' });
        } else {
          workbook = XLSX.read(buffer, { type: 'buffer' });
        }
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const updatedData = jsonData.map(row => ({
          ...row,
          'Credits Assigned': creditsNum
        }));
        
        const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);
        
        let newBuffer;
        let mimeType;
        if (placement.fileType.includes('csv')) {
          const csvOutput = XLSX.utils.sheet_to_csv(newWorksheet);
          newBuffer = Buffer.from(csvOutput, 'utf8');
          mimeType = 'text/csv';
        } else {
          newBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        
        updatedStudentData = `data:${mimeType};base64,${newBuffer.toString('base64')}`;
      } catch (fileError) {
        console.error('Error updating legacy file:', fileError);
      }
    }
    
    const updatedPlacement = await Placement.findByIdAndUpdate(
      req.params.id,
      { 
        credits: creditsNum,
        studentData: updatedStudentData,
        fileHistory: placement.fileHistory
      },
      { new: true, runValidators: true }
    ).select('-password');

    // Update all candidates linked to this placement with new credits
    const placementObjectId = new mongoose.Types.ObjectId(req.params.id);
    const candidatesToUpdate = await Candidate.find(
      { placementId: placementObjectId },
      { _id: 1 }
    );
    
    const updateResult = await Candidate.updateMany(
      { placementId: placementObjectId },
      { $set: { credits: creditsNum } }
    );

    // Emit real-time credit updates to affected candidates
    if (candidatesToUpdate.length > 0) {
      const candidateIds = candidatesToUpdate.map(c => c._id.toString());
      emitBulkCreditUpdate(candidateIds, creditsNum);
      // Removed console debug line for security
      
      // Add a small delay to ensure WebSocket messages are processed
      setTimeout(() => {
        // Removed console debug line for security
      }, 1000);
    }

    // Removed console debug line for security
    // Removed console debug line for security;

    res.json({ 
      success: true, 
      placement: updatedPlacement,
      message: `Credits updated successfully! ${updateResult.modifiedCount} candidates will see the updated credits in their dashboard immediately.`,
      candidatesUpdated: updateResult.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Credit Management Controllers
exports.updateCandidateCredits = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { creditsToAdd } = req.body;
    
    if (typeof creditsToAdd !== 'number') {
      return res.status(400).json({ success: false, message: 'Credits must be a number' });
    }
    
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }
    
    const newCredits = Math.max(0, (candidate.credits || 0) + creditsToAdd);
    
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      { credits: newCredits },
      { new: true }
    ).select('-password');
    
    res.json({ success: true, candidate: updatedCandidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkUpdateCandidateCredits = async (req, res) => {
  try {
    const { creditsToAdd, candidateIds } = req.body;
    
    if (typeof creditsToAdd !== 'number' || !Array.isArray(candidateIds)) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }
    
    // Get all candidates to calculate new credits
    const candidates = await Candidate.find({ _id: { $in: candidateIds } });
    
    // Update each candidate's credits
    const updatePromises = candidates.map(candidate => {
      const newCredits = Math.max(0, (candidate.credits || 0) + creditsToAdd);
      return Candidate.findByIdAndUpdate(
        candidate._id,
        { credits: newCredits },
        { new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.json({ 
      success: true, 
      message: `Successfully updated credits for ${candidates.length} candidates`,
      updatedCount: candidates.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCandidatesForCredits = async (req, res) => {
  try {
    const candidates = await Candidate.find()
      .select('name email credits registrationMethod placementId')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Sub Admin Management Controllers
exports.createSubAdmin = async (req, res) => {
  try {
    const { name, firstName, lastName, username, email, phone, permissions, password } = req.body;
    
    // Check if username or email already exists
    const existingSubAdmin = await SubAdmin.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingSubAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }
    
    const subAdmin = await SubAdmin.create({
      name,
      firstName,
      lastName,
      username,
      email,
      phone,
      permissions,
      password,
      createdBy: req.user.id
    });
    
    const subAdminResponse = subAdmin.toObject();
    delete subAdminResponse.password;
    
    res.status(201).json({ success: true, subAdmin: subAdminResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSubAdmins = async (req, res) => {
  try {
    const subAdmins = await SubAdmin.find()
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, subAdmins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSubAdmin = async (req, res) => {
  try {
    const { name, firstName, lastName, username, email, phone, permissions, password } = req.body;
    
    // Check if username or email already exists for other sub-admins
    const existingSubAdmin = await SubAdmin.findOne({ 
      $or: [{ email }, { username }],
      _id: { $ne: req.params.id }
    });
    
    if (existingSubAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username or email already exists' 
      });
    }
    
    const updateData = {
      name,
      firstName,
      lastName,
      username,
      email,
      phone,
      permissions
    };
    
    // Only update password if provided
    if (password) {
      updateData.password = password;
    }
    
    const subAdmin = await SubAdmin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: 'Sub Admin not found' });
    }
    
    res.json({ success: true, subAdmin });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubAdmin = async (req, res) => {
  try {
    const subAdmin = await SubAdmin.findByIdAndDelete(req.params.id);
    
    if (!subAdmin) {
      return res.status(404).json({ success: false, message: 'Sub Admin not found' });
    }
    
    res.json({ success: true, message: 'Sub Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate login token for placement officer
exports.generatePlacementLoginToken = async (req, res) => {
  try {
    const { placementId } = req.body;
    
    const placement = await Placement.findById(placementId);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement officer not found' });
    }
    
    if (placement.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Placement officer is not active' });
    }
    
    const token = generateToken(placement._id, 'placement');
    
    res.json({ success: true, token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Authorization Letter Management
exports.approveAuthorizationLetter = async (req, res) => {
  try {
    const { employerId, letterId } = req.params;
    
    const profile = await EmployerProfile.findOne({ employerId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Employer profile not found' });
    }

    // Find the authorization letter
    const letterIndex = profile.authorizationLetters.findIndex(letter => letter._id.toString() === letterId);
    if (letterIndex === -1) {
      return res.status(404).json({ success: false, message: 'Authorization letter not found' });
    }

    // Update the letter status
    profile.authorizationLetters[letterIndex].status = 'approved';
    profile.authorizationLetters[letterIndex].approvedAt = new Date();
    profile.authorizationLetters[letterIndex].approvedBy = req.user.id;
    
    await profile.save();

    // Create notification for employer
    try {
      const notificationData = {
        title: 'Authorization Letter Approved',
        message: `Your authorization letter "${profile.authorizationLetters[letterIndex].fileName}" has been approved by admin.`,
        type: 'document_approved',
        role: 'employer',
        relatedId: new mongoose.Types.ObjectId(employerId),
        createdBy: new mongoose.Types.ObjectId(req.user.id)
      };
      
      await createNotification(notificationData);
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    res.json({ success: true, message: 'Authorization letter approved successfully' });
  } catch (error) {
    console.error('Error approving authorization letter:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectAuthorizationLetter = async (req, res) => {
  try {
    const { employerId, letterId } = req.params;
    
    const profile = await EmployerProfile.findOne({ employerId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Employer profile not found' });
    }

    // Find the authorization letter
    const letterIndex = profile.authorizationLetters.findIndex(letter => letter._id.toString() === letterId);
    if (letterIndex === -1) {
      return res.status(404).json({ success: false, message: 'Authorization letter not found' });
    }

    // Update the letter status
    profile.authorizationLetters[letterIndex].status = 'rejected';
    profile.authorizationLetters[letterIndex].rejectedAt = new Date();
    profile.authorizationLetters[letterIndex].rejectedBy = req.user.id;
    
    await profile.save();

    // Create notification for employer
    try {
      const notificationData = {
        title: 'Authorization Letter Rejected',
        message: `Your authorization letter "${profile.authorizationLetters[letterIndex].fileName}" has been rejected by admin.`,
        type: 'document_rejected',
        role: 'employer',
        relatedId: new mongoose.Types.ObjectId(employerId),
        createdBy: new mongoose.Types.ObjectId(req.user.id)
      };
      
      await createNotification(notificationData);
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    res.json({ success: true, message: 'Authorization letter rejected successfully' });
  } catch (error) {
    console.error('Error rejecting authorization letter:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Individual file approval/rejection
exports.approveIndividualFile = async (req, res) => {
  try {
    const { id: placementId, fileId } = req.params;
    
    const placement = await Placement.findById(placementId);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement not found' });
    }

    // Find the file in history
    const fileIndex = placement.fileHistory.findIndex(file => file._id.toString() === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = placement.fileHistory[fileIndex];
    if (!file.fileData) {
      return res.status(400).json({ success: false, message: 'File data not available' });
    }

    // Process the file data
    const XLSX = require('xlsx');
    const { base64ToBuffer } = require('../utils/base64Helper');
    
    try {
      const result = base64ToBuffer(file.fileData);
      const buffer = result.buffer;

      let workbook;
      if (file.fileType && file.fileType.includes('csv')) {
        const csvData = buffer.toString('utf8');
        workbook = XLSX.read(csvData, { type: 'string' });
      } else {
        workbook = XLSX.read(buffer, { type: 'buffer' });
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      let createdCount = 0;
      let skippedCount = 0;
      const errors = [];
      
      // Process each row from Excel
      for (const row of jsonData) {
        try {
          const email = row.Email || row.email || row.EMAIL;
          const password = row.Password || row.password || row.PASSWORD;
          const name = row.Name || row.name || row.NAME || row['Full Name'] || row['full name'] || row['FULL NAME'] || row['Student Name'] || row['student name'] || row['STUDENT NAME'] || row['Candidate Name'] || row['candidate name'] || row['CANDIDATE NAME'];
          const phone = row.Phone || row.phone || row.PHONE || row.Mobile || row.mobile || row.MOBILE;
          
          if (!email || !password || !name) {
            errors.push(`Row missing required fields`);
            continue;
          }
          
          // Check if candidate already exists
          const existingCandidate = await Candidate.findOne({ email });
          if (existingCandidate) {
            skippedCount++;
            continue;
          }
          
          // Create candidate with placement credits
          const candidate = await Candidate.create({
            name,
            email,
            password,
            phone: phone || '',
            credits: placement.credits || 0,
            registrationMethod: 'placement',
            placementId: placement._id,
            isVerified: true,
            status: 'active'
          });
          
          // Create candidate profile
          await CandidateProfile.create({ candidateId: candidate._id });
          
          createdCount++;
        } catch (rowError) {
          console.error('Row processing error:', rowError);
          errors.push(`Error processing row: ${rowError.message}`);
        }
      }
      
      // Update file status to 'processed' after successful approval and processing
      console.log(`Updating file ${fileId} status to processed`);
      const updatedPlacement = await Placement.findOneAndUpdate(
        { _id: placementId, 'fileHistory._id': fileId },
        { 
          $set: { 
            'fileHistory.$.status': 'processed',
            'fileHistory.$.processedAt': new Date(),
            'fileHistory.$.candidatesCreated': createdCount
          }
        },
        { new: true }
      );
      console.log(`File status updated to processed for placement ${placementId}`);
      
      // Verify the update
      const verifyPlacement = await Placement.findById(placementId);
      const updatedFile = verifyPlacement.fileHistory.find(f => f._id.toString() === fileId);
      console.log(`Verified file status: ${updatedFile?.status}`);

      // Create notification
      try {
        const notification = await createNotification({
          title: 'File Approved & Processed - Candidates Can Login',
          message: `File "${file.customName || file.fileName}" has been approved and processed. ${createdCount} candidates created and can now login to candidate dashboard. ${skippedCount} candidates were skipped (already exist).`,
          type: 'file_processed',
          role: 'admin',
          relatedId: placementId,
          createdBy: req.user.id
        });
      } catch (notifError) {
        console.error('Notification creation failed:', notifError);
      }
      
      res.json({
        success: true,
        message: `File approved and processed successfully. ${createdCount} candidates created and can now login to candidate dashboard. ${skippedCount} candidates were skipped.`,
        stats: { created: createdCount, skipped: skippedCount, errors: errors.length },
        loginInstructions: {
          url: 'http://localhost:3000/',
          message: 'Candidates can now login using their email and password from the Excel file (Sign In → Candidate tab)'
        }
      });
      
    } catch (processError) {
      console.error('File processing error:', processError);
      res.status(400).json({ success: false, message: 'Failed to process file data' });
    }
  } catch (error) {
    console.error('Error approving file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.rejectIndividualFile = async (req, res) => {
  try {
    const { id: placementId, fileId } = req.params;
    
    const placement = await Placement.findById(placementId);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement not found' });
    }

    // Find the file in history
    const fileIndex = placement.fileHistory.findIndex(file => file._id.toString() === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const file = placement.fileHistory[fileIndex];
    
    // Update file status in history
    console.log(`Updating file ${fileId} status to rejected`);
    const updatedPlacement = await Placement.findOneAndUpdate(
      { _id: placementId, 'fileHistory._id': fileId },
      { $set: { 'fileHistory.$.status': 'rejected', 'fileHistory.$.processedAt': new Date() } },
      { new: true }
    );
    console.log(`File status updated to rejected for placement ${placementId}`);
    
    // Verify the update
    const verifyPlacement = await Placement.findById(placementId);
    const updatedFile = verifyPlacement.fileHistory.find(f => f._id.toString() === fileId);
    console.log(`Verified file status: ${updatedFile?.status}`);

    // Create notification
    try {
      const notification = await createNotification({
        title: 'File Rejected',
        message: `File "${file.customName || file.fileName}" has been rejected by admin.`,
        type: 'file_rejected',
        role: 'admin',
        relatedId: placementId,
        createdBy: req.user.id
      });
    } catch (notifError) {
      console.error('Notification creation failed:', notifError);
    }
    
    res.json({ success: true, message: 'File rejected successfully' });
  } catch (error) {
    console.error('Error rejecting file:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign credits to all files in a placement
exports.assignBulkFileCredits = async (req, res) => {
  try {
    const { placementId } = req.params;
    const { credits } = req.body;
    const creditsNum = Math.min(10000, Math.max(0, parseInt(credits) || 0));
    
    const placement = await Placement.findById(placementId);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement officer not found' });
    }

    let updatedFiles = 0;
    
    // Update all files in fileHistory with the new credits
    if (placement.fileHistory && placement.fileHistory.length > 0) {
      for (let file of placement.fileHistory) {
        file.credits = creditsNum;
        
        // Update the file data with new credits
        if (file.fileData) {
          try {
            const { base64ToBuffer } = require('../utils/base64Helper');
            const result = base64ToBuffer(file.fileData);
            const buffer = result.buffer;

            let workbook;
            if (file.fileType && file.fileType.includes('csv')) {
              const csvData = buffer.toString('utf8');
              workbook = XLSX.read(csvData, { type: 'string' });
            } else {
              workbook = XLSX.read(buffer, { type: 'buffer' });
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // Update all rows with new credits
            const updatedData = jsonData.map(row => ({
              ...row,
              'Credits Assigned': creditsNum,
              'credits assigned': creditsNum,
              'CREDITS ASSIGNED': creditsNum,
              Credits: creditsNum,
              credits: creditsNum,
              CREDITS: creditsNum,
              Credit: creditsNum,
              credit: creditsNum
            }));
            
            // Convert back to Excel/CSV
            const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
            const newWorkbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);
            
            let newBuffer;
            let mimeType;
            if (file.fileType && file.fileType.includes('csv')) {
              const csvOutput = XLSX.utils.sheet_to_csv(newWorksheet);
              newBuffer = Buffer.from(csvOutput, 'utf8');
              mimeType = 'text/csv';
            } else {
              newBuffer = XLSX.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });
              mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            }
            
            file.fileData = `data:${mimeType};base64,${newBuffer.toString('base64')}`;
            updatedFiles++;
          } catch (fileError) {
            console.error('Error updating file data with credits:', fileError);
          }
        }
      }
    }
    
    await placement.save();
    
    // Update all candidates linked to this placement with new credits
    const placementObjectId = new mongoose.Types.ObjectId(placementId);
    const updateResult = await Candidate.updateMany(
      { placementId: placementObjectId },
      { $set: { credits: creditsNum } }
    );

    res.json({ 
      success: true, 
      message: `Credits updated successfully for ${updatedFiles} files and ${updateResult.modifiedCount} candidates`,
      stats: {
        filesUpdated: updatedFiles,
        candidatesUpdated: updateResult.modifiedCount,
        creditsAssigned: creditsNum
      }
    });
  } catch (error) {
    console.error('Error assigning bulk file credits:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Store complete Excel data in MongoDB
exports.storeExcelDataInMongoDB = async (req, res) => {
  try {
    const { id: placementId } = req.params;
    
    const placement = await Placement.findById(placementId);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement officer not found' });
    }

    let totalRecordsStored = 0;
    const storedFiles = [];
    
    // Process all files in fileHistory
    if (placement.fileHistory && placement.fileHistory.length > 0) {
      for (let file of placement.fileHistory) {
        if (file.fileData) {
          try {
            const { base64ToBuffer } = require('../utils/base64Helper');
            const result = base64ToBuffer(file.fileData);
            const buffer = result.buffer;

            let workbook;
            if (file.fileType && file.fileType.includes('csv')) {
              const csvData = buffer.toString('utf8');
              workbook = XLSX.read(csvData, { type: 'string' });
            } else {
              workbook = XLSX.read(buffer, { type: 'buffer' });
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // Store structured data in file object
            const structuredData = jsonData.map((row, index) => ({
              rowIndex: index + 1,
              id: row.ID || row.id || row.Id || '',
              candidateName: row['Candidate Name'] || row['candidate name'] || row['CANDIDATE NAME'] || row.Name || row.name || row.NAME || row['Full Name'] || row['full name'] || row['FULL NAME'] || row['Student Name'] || row['student name'] || row['STUDENT NAME'] || '',
              collegeName: row['College Name'] || row['college name'] || row['COLLEGE NAME'] || row.College || row.college || row.COLLEGE || '',
              email: row.Email || row.email || row.EMAIL || '',
              phone: row.Phone || row.phone || row.PHONE || row.Mobile || row.mobile || row.MOBILE || '',
              course: row.Course || row.course || row.COURSE || row.Branch || row.branch || row.BRANCH || 'Not Specified',
              password: row.Password || row.password || row.PASSWORD || '',
              creditsAssigned: parseInt(row['Credits Assigned'] || row['credits assigned'] || row['CREDITS ASSIGNED'] || row.Credits || row.credits || row.CREDITS || row.Credit || row.credit || file.credits || 0),
              originalRowData: row, // Store complete original row data
              processedAt: new Date(),
              placementId: placement._id,
              fileId: file._id
            }));
            
            // Update file with structured data
            file.structuredData = structuredData;
            file.dataStoredAt = new Date();
            file.recordCount = structuredData.length;
            
            totalRecordsStored += structuredData.length;
            storedFiles.push({
              fileName: file.fileName,
              recordCount: structuredData.length,
              fileId: file._id
            });
            
          } catch (fileError) {
            console.error(`Error processing file ${file.fileName}:`, fileError);
          }
        }
      }
    }
    
    // Save placement with structured data
    await placement.save();
    
    res.json({ 
      success: true, 
      message: `Excel data stored successfully in MongoDB`,
      stats: {
        totalFilesProcessed: storedFiles.length,
        totalRecordsStored: totalRecordsStored,
        storedFiles: storedFiles
      }
    });
  } catch (error) {
    console.error('Error storing Excel data in MongoDB:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// Get stored Excel data from MongoDB
exports.getStoredExcelData = async (req, res) => {
  try {
    const { id: placementId, fileId } = req.params;
    
    const placement = await Placement.findById(placementId);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement officer not found' });
    }

    if (fileId) {
      // Get data for specific file
      const file = placement.fileHistory.id(fileId);
      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      res.json({
        success: true,
        data: file.structuredData || [],
        fileInfo: {
          fileName: file.fileName,
          recordCount: file.recordCount || 0,
          dataStoredAt: file.dataStoredAt,
          status: file.status
        }
      });
    } else {
      // Get data for all files
      const allData = [];
      const fileInfos = [];

      placement.fileHistory.forEach(file => {
        if (file.structuredData && file.structuredData.length > 0) {
          allData.push(...file.structuredData);
          fileInfos.push({
            fileName: file.fileName,
            recordCount: file.recordCount || 0,
            dataStoredAt: file.dataStoredAt,
            status: file.status,
            fileId: file._id
          });
        }
      });

      res.json({
        success: true,
        data: allData,
        totalRecords: allData.length,
        files: fileInfos
      });
    }
  } catch (error) {
    console.error('Error getting stored Excel data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// Sync credits between Excel data and candidate dashboard
exports.syncExcelCreditsWithCandidates = async (req, res) => {
  try {
    const { id: placementId } = req.params;
    
    const placement = await Placement.findById(placementId);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement officer not found' });
    }

    let syncedCandidates = 0;
    const syncResults = [];
    
    // Process all files in fileHistory
    if (placement.fileHistory && placement.fileHistory.length > 0) {
      for (let file of placement.fileHistory) {
        if (file.fileData) {
          try {
            const { base64ToBuffer } = require('../utils/base64Helper');
            const result = base64ToBuffer(file.fileData);
            const buffer = result.buffer;

            let workbook;
            if (file.fileType && file.fileType.includes('csv')) {
              const csvData = buffer.toString('utf8');
              workbook = XLSX.read(csvData, { type: 'string' });
            } else {
              workbook = XLSX.read(buffer, { type: 'buffer' });
            }
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // Sync each row with candidate data
            for (const row of jsonData) {
              const email = row.Email || row.email || row.EMAIL;
              const credits = parseInt(row['Credits Assigned'] || row['credits assigned'] || row['CREDITS ASSIGNED'] || row.Credits || row.credits || row.CREDITS || row.Credit || row.credit || file.credits || 0);
              const course = row.Course || row.course || row.COURSE || row.Branch || row.branch || row.BRANCH || 'Not Specified';
              
              if (email) {
                try {
                  const updateResult = await Candidate.findOneAndUpdate(
                    { 
                      email: email.toLowerCase(),
                      placementId: placement._id
                    },
                    { 
                      credits: credits,
                      course: course
                    },
                    { new: true }
                  );
                  
                  if (updateResult) {
                    syncedCandidates++;
                    syncResults.push({
                      email: email,
                      credits: credits,
                      course: course,
                      fileName: file.fileName
                    });
                  }
                } catch (syncError) {
                  console.error(`Error syncing credits for ${email}:`, syncError);
                }
              }
            }
            
          } catch (fileError) {
            console.error(`Error processing file ${file.fileName}:`, fileError);
          }
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: `Credits synchronized successfully for ${syncedCandidates} candidates`,
      syncedCandidates: syncedCandidates,
      syncResults: syncResults
    });
  } catch (error) {
    console.error('Error syncing Excel credits with candidates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Download placement ID card
exports.downloadPlacementIdCard = async (req, res) => {
  try {
    const { id: placementId } = req.params;
    
    const placement = await Placement.findById(placementId);
    if (!placement) {
      return res.status(404).json({ success: false, message: 'Placement officer not found' });
    }

    if (!placement.idCard) {
      return res.status(404).json({ success: false, message: 'ID card not found' });
    }

    const { buffer, mimeType, extension } = base64ToBuffer(placement.idCard);
    const filename = `${placement.name.replace(/\s+/g, '_')}_ID_Card${extension}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Support Ticket Management Controllers
exports.getSupportTickets = async (req, res) => {
  try {
    const { status, userType, priority, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (userType) query.userType = userType;
    if (priority) query.priority = priority;

    const tickets = await Support.find(query)
      .populate('userId', 'name email companyName')
      .populate('respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Enhance tickets with actual user data if userId exists
    const enhancedTickets = await Promise.all(tickets.map(async (ticket) => {
      const ticketObj = ticket.toObject();
      
      // If userId exists and is populated, use the actual user data
      if (ticket.userId && ticket.userId.email) {
        ticketObj.actualUserEmail = ticket.userId.email;
        ticketObj.actualUserName = ticket.userId.name || ticket.userId.companyName;
      } else if (ticket.userType !== 'guest') {
        // Try to find user by email if userId is missing
        try {
          let user = null;
          if (ticket.userType === 'employer') {
            user = await require('../models/Employer').findOne({ email: ticket.email }).select('name email companyName');
          } else if (ticket.userType === 'candidate') {
            user = await require('../models/Candidate').findOne({ email: ticket.email }).select('name email');
          }
          
          if (user) {
            ticketObj.actualUserEmail = user.email;
            ticketObj.actualUserName = user.name || user.companyName;
          }
        } catch (lookupError) {
          console.error('Error looking up user:', lookupError);
        }
      }
      
      return ticketObj;
    }));

    const totalTickets = await Support.countDocuments(query);
    const unreadCount = await Support.countDocuments({ ...query, isRead: false });

    res.json({ 
      success: true, 
      tickets: enhancedTickets,
      totalTickets,
      unreadCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalTickets / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSupportTicketById = async (req, res) => {
  try {
    const ticket = await Support.findById(req.params.id)
      .populate('userId', 'name email companyName')
      .populate('respondedBy', 'name email');
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    // Mark as read
    if (!ticket.isRead) {
      ticket.isRead = true;
      await ticket.save();
    }

    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSupportTicketStatus = async (req, res) => {
  try {
    const { status, response } = req.body;
    const ticketId = req.params.id;
    
    // Validate ticket ID
    if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID provided' });
    }
    
    // Validate status
    const validStatuses = ['new', 'in-progress', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status provided' });
    }
    
    const updateData = { 
      status,
      isRead: true // Mark as read when admin updates
    };
    
    if (response && response.trim()) {
      updateData.response = response.trim();
      updateData.respondedAt = new Date();
      updateData.respondedBy = req.user.id;
    }

    const ticket = await Support.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email companyName').populate('respondedBy', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    // Create notification for user if responded or status changed
    if ((response && response.trim()) || status === 'resolved' || status === 'closed') {
      try {
        let notificationTitle = 'Support Ticket Updated';
        let notificationMessage = `Your support ticket "${ticket.subject}" has been updated by admin.`;
        
        if (response && response.trim()) {
          notificationTitle = 'Admin Response to Your Support Ticket';
          notificationMessage = `Subject: ${ticket.subject}\n\nStatus: ${status.toUpperCase()}\n\nAdmin Response:\n${response.trim()}`;
        } else if (status === 'resolved') {
          notificationTitle = 'Support Ticket Resolved';
          notificationMessage = `Subject: ${ticket.subject}\n\nYour support ticket has been resolved by admin.\n\nStatus: RESOLVED`;
        } else if (status === 'closed') {
          notificationTitle = 'Support Ticket Closed';
          notificationMessage = `Subject: ${ticket.subject}\n\nYour support ticket has been closed by admin.\n\nStatus: CLOSED`;
        }
        
        // Find user by email if userId not available
        let targetUserId = ticket.userId;
        if (!targetUserId && ticket.email) {
          const Employer = require('../models/Employer');
          const Candidate = require('../models/Candidate');
          
          if (ticket.userType === 'employer') {
            const employer = await Employer.findOne({ email: ticket.email }).select('_id');
            targetUserId = employer?._id;
          } else if (ticket.userType === 'candidate') {
            const candidate = await Candidate.findOne({ email: ticket.email }).select('_id');
            targetUserId = candidate?._id;
          }
        }
        
        if (targetUserId) {
          const notificationData = {
            title: notificationTitle,
            message: notificationMessage,
            type: 'support_response',
            role: ticket.userType === 'guest' ? 'candidate' : ticket.userType,
            relatedId: targetUserId,
            createdBy: req.user.id
          };
          
          console.log('Creating support notification with full response:', {
            title: notificationTitle,
            messageLength: notificationMessage.length,
            hasResponse: !!(response && response.trim()),
            status: status
          });
          
          await createNotification(notificationData);
        }
      } catch (notifError) {
        console.error('Error creating support response notification:', notifError);
        // Don't fail the request if notification fails
      }
    } else {
      console.log('No notification created - no response or status change:', {
        hasResponse: !!(response && response.trim()),
        status: status,
        isResolved: status === 'resolved',
        isClosed: status === 'closed'
      });
    }

    res.json({ 
      success: true, 
      ticket,
      message: `Support ticket ${status === 'closed' ? 'closed' : 'updated'} successfully`
    });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSupportTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    // Validate ticket ID
    if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID provided' });
    }
    
    const ticket = await Support.findByIdAndDelete(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    res.json({ success: true, message: 'Support ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting support ticket:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadSupportAttachment = async (req, res) => {
  try {
    const { ticketId, attachmentIndex } = req.params;
    
    const ticket = await Support.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found' });
    }

    const attachment = ticket.attachments[parseInt(attachmentIndex)];
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const { buffer, mimeType } = base64ToBuffer(attachment.data);
    
    if (req.query.download === '1') {
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    }
    res.setHeader('Content-Type', mimeType);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};