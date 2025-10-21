const jwt = require('jsonwebtoken');
const Employer = require('../models/Employer');
const EmployerProfile = require('../models/EmployerProfile');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Message = require('../models/Message');
const Subscription = require('../models/Subscription');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

// Authentication Controllers
exports.registerEmployer = async (req, res) => {
  try {
    const { name, email, password, phone, companyName, employerCategory, employerType } = req.body;

    const existingEmployer = await Employer.findOne({ email });
    if (existingEmployer) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const finalEmployerType = employerType || (employerCategory === 'consultancy' ? 'consultant' : 'company');

    const employer = await Employer.create({ 
      name, 
      email, 
      password, 
      phone, 
      companyName,
      employerType: finalEmployerType
    });
    await EmployerProfile.create({ 
      employerId: employer._id,
      employerCategory: employerCategory || finalEmployerType,
      companyName: companyName,
      email: email,
      phone: phone
    });
    await Subscription.create({ employerId: employer._id });

    const token = generateToken(employer._id, 'employer');

    res.status(201).json({
      success: true,
      token,
      employer: {
        id: employer._id,
        name: employer.name,
        email: employer.email,
        companyName: employer.companyName,
        employerType: employer.employerType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.loginEmployer = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Removed console debug line for security

    const employer = await Employer.findOne({ email });
    if (!employer) {
      // Removed console debug line for security
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await employer.comparePassword(password);
    if (!isPasswordValid) {
      // Removed console debug line for security;
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (employer.status !== 'active') {
      // Removed console debug line for security;
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }

    const token = generateToken(employer._id, 'employer');
    // Removed console debug line for security;

    res.json({
      success: true,
      token,
      employer: {
        id: employer._id,
        name: employer.name,
        email: employer.email,
        companyName: employer.companyName,
        employerType: employer.employerType
      }
    });
  } catch (error) {
    console.error('Employer login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Profile Controllers
exports.getProfile = async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({ employerId: req.user._id })
      .populate('employerId', 'name email phone companyName isApproved');
    
    if (!profile) {
      return res.json({ success: true, profile: null });
    }

    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    // Log request size for debugging
    const requestSize = JSON.stringify(req.body).length;
    // Removed console debug line for security;
    
    // Remove employerCategory from update data to prevent modification
    const updateData = { ...req.body };
    delete updateData.employerCategory;
    
    // Remove any Base64 data that should not be in profile updates
    // (these should be uploaded via separate endpoints)
    const fieldsToExclude = ['logo', 'coverImage', 'panCardImage', 'cinImage', 'gstImage', 'certificateOfIncorporation', 'companyIdCardPicture', 'authorizationLetters'];
    fieldsToExclude.forEach(field => {
      if (updateData[field] && typeof updateData[field] === 'string' && updateData[field].startsWith('data:')) {
        console.log(`Excluding Base64 field: ${field}`);
        delete updateData[field];
      }
    });

    const profile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.user._id },
      updateData,
      { new: true, upsert: true }
    ).populate('employerId', 'name email phone companyName');

    // Create notification for admin when profile is updated
    try {
      const { createNotification } = require('./notificationController');
      await createNotification({
        title: 'Company Profile Updated',
        message: `${profile.employerId?.companyName || 'A company'} has updated their profile`,
        type: 'profile_submitted',
        role: 'admin',
        relatedId: profile._id,
        createdBy: req.user._id
      });
    } catch (notifError) {
      console.error('Notification creation failed:', notifError);
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error('Profile update error:', error);
    if (error.type === 'entity.too.large') {
      res.status(413).json({ success: false, message: 'Request too large. Please upload files individually and try again.' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { fileToBase64 } = require('../middlewares/upload');
    const logoBase64 = fileToBase64(req.file);

    const profile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.user._id },
      { logo: logoBase64 },
      { new: true, upsert: true }
    );

    res.json({ success: true, logo: logoBase64, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadCover = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { fileToBase64 } = require('../middlewares/upload');
    const coverBase64 = fileToBase64(req.file);

    const profile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.user._id },
      { coverImage: coverBase64 },
      { new: true, upsert: true }
    );

    res.json({ success: true, coverImage: coverBase64, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { fileToBase64 } = require('../middlewares/upload');
    const { fieldName } = req.body;
    const documentBase64 = fileToBase64(req.file);
    const updateData = { [fieldName]: documentBase64 };

    const profile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.user._id },
      updateData,
      { new: true, upsert: true }
    );

    res.json({ success: true, filePath: documentBase64, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadAuthorizationLetter = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { fileToBase64 } = require('../middlewares/upload');
    const documentBase64 = fileToBase64(req.file);
    
    const newDocument = {
      fileName: req.file.originalname,
      fileData: documentBase64,
      uploadedAt: new Date(),
      companyName: req.body.companyName || ''
    };

    const profile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.user._id },
      { $push: { authorizationLetters: newDocument } },
      { new: true, upsert: true }
    );

    res.json({ success: true, document: newDocument, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAuthorizationLetter = async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const profile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.user._id },
      { $pull: { authorizationLetters: { _id: documentId } } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({ success: true, message: 'Authorization letter deleted successfully', profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAuthorizationCompanies = async (req, res) => {
  try {
    const { authorizationLetters } = req.body;
    
    const profile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.user._id },
      { authorizationLetters },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({ success: true, message: 'Authorization company names updated successfully', profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadGallery = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const { fileToBase64 } = require('../middlewares/upload');
    const profile = await EmployerProfile.findOne({ employerId: req.user._id });
    const currentGallery = profile?.gallery || [];

    if (currentGallery.length + req.files.length > 10) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot upload ${req.files.length} images. Maximum 10 images allowed. Current: ${currentGallery.length}` 
      });
    }

    const newImages = req.files.map(file => ({
      url: fileToBase64(file),
      fileName: file.originalname,
      uploadedAt: new Date()
    }));

    const updatedProfile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.user._id },
      { $push: { gallery: { $each: newImages } } },
      { new: true, upsert: true }
    );

    res.json({ success: true, gallery: updatedProfile.gallery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteGalleryImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    
    const profile = await EmployerProfile.findOneAndUpdate(
      { employerId: req.user._id },
      { $pull: { gallery: { _id: imageId } } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({ success: true, message: 'Gallery image deleted successfully', gallery: profile.gallery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Job Management Controllers
exports.createJob = async (req, res) => {
  try {
    // Check if employer is approved
    if (!req.user.isApproved) {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account needs admin approval before you can post jobs. Please wait for approval.' 
      });
    }

    const jobData = { ...req.body, employerId: req.user._id, status: 'active' };
    
    // Parse CTC from string format to proper structure
    if (jobData.ctc && typeof jobData.ctc === 'string') {
      const ctcStr = jobData.ctc.trim();
      const rangeMatch = ctcStr.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/i);
      if (rangeMatch) {
        jobData.ctc = {
          min: parseFloat(rangeMatch[1]) * 100000,
          max: parseFloat(rangeMatch[2]) * 100000
        };
      } else {
        const singleValue = parseFloat(ctcStr.replace(/[^\d.]/g, ''));
        if (singleValue && singleValue > 0) {
          jobData.ctc = {
            min: singleValue * 100000,
            max: singleValue * 100000
          };
        }
      }
    }
    
    if (jobData.netSalary && typeof jobData.netSalary === 'string') {
      const netMatch = jobData.netSalary.match(/(\d+(?:,\d+)*)\s*(?:-|to)?\s*(\d+(?:,\d+)*)?/i);
      if (netMatch) {
        jobData.netSalary = {
          min: parseInt(netMatch[1].replace(/,/g, '')),
          max: parseInt((netMatch[2] || netMatch[1]).replace(/,/g, ''))
        };
      }
    }
    
    console.log('Creating job with data:', JSON.stringify(jobData, null, 2)); // Debug log
    console.log('Company fields:', {
      companyLogo: jobData.companyLogo ? 'Present' : 'Missing',
      companyName: jobData.companyName,
      companyDescription: jobData.companyDescription ? 'Present' : 'Missing',
      category: jobData.category
    });
    console.log('Parsed CTC:', jobData.ctc);
    console.log('Parsed Net Salary:', jobData.netSalary);
    
    // Check if interview rounds are scheduled
    const hasScheduledRounds = jobData.interviewRoundDetails && 
      Object.values(jobData.interviewRoundDetails).some(round => 
        (round.date || round.fromDate) && round.time && round.description
      );
    
    if (hasScheduledRounds) {
      jobData.interviewScheduled = true;
    }
    
    const job = await Job.create(jobData);
    console.log('Job created:', JSON.stringify(job, null, 2));

    // Create notification for all candidates when job is posted
    try {
      const { createNotification } = require('./notificationController');
      await createNotification({
        title: 'New Job Posted',
        message: `New ${job.title} position available at ${req.user.companyName}`,
        type: 'job_posted',
        role: 'candidate',
        relatedId: job._id,
        createdBy: req.user._id
      });
      
      // Create interview scheduled notification if rounds are scheduled
      if (hasScheduledRounds) {
        await createNotification({
          title: 'Interview Rounds Scheduled',
          message: `Interview rounds have been scheduled for ${job.title} position at ${req.user.companyName}`,
          type: 'interview_scheduled',
          role: 'candidate',
          relatedId: job._id,
          createdBy: req.user._id
        });
      }
    } catch (notifError) {
      console.error('Notification creation failed:', notifError);
    }

    res.status(201).json({ success: true, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    console.log('Update job request body:', req.body);
    console.log('Job ID:', req.params.jobId);
    
    const oldJob = await Job.findOne({ _id: req.params.jobId, employerId: req.user._id });
    if (!oldJob) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    
    // Parse CTC from string format to proper structure
    if (req.body.ctc && typeof req.body.ctc === 'string') {
      const ctcStr = req.body.ctc.trim();
      const rangeMatch = ctcStr.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/i);
      if (rangeMatch) {
        req.body.ctc = {
          min: parseFloat(rangeMatch[1]) * 100000,
          max: parseFloat(rangeMatch[2]) * 100000
        };
      } else {
        const singleValue = parseFloat(ctcStr.replace(/[^\d.]/g, ''));
        if (singleValue && singleValue > 0) {
          req.body.ctc = {
            min: singleValue * 100000,
            max: singleValue * 100000
          };
        }
      }
    }
    
    if (req.body.netSalary && typeof req.body.netSalary === 'string') {
      const netMatch = req.body.netSalary.match(/(\d+(?:,\d+)*)\s*(?:-|to)?\s*(\d+(?:,\d+)*)?/i);
      if (netMatch) {
        req.body.netSalary = {
          min: parseInt(netMatch[1].replace(/,/g, '')),
          max: parseInt((netMatch[2] || netMatch[1]).replace(/,/g, ''))
        };
      }
    }
    
    // Check if interview rounds are being scheduled/updated
    const hasScheduledRounds = req.body.interviewRoundDetails && 
      Object.values(req.body.interviewRoundDetails).some(round => 
        (round.date || round.fromDate) && round.time && round.description
      );
    
    const wasScheduled = oldJob.interviewScheduled;
    
    if (hasScheduledRounds) {
      req.body.interviewScheduled = true;
    }
    
    const job = await Job.findOneAndUpdate(
      { _id: req.params.jobId, employerId: req.user._id },
      req.body,
      { new: true }
    );

    // Create notification if interview rounds are newly scheduled or updated
    if (hasScheduledRounds && !wasScheduled) {
      try {
        const { createNotification } = require('./notificationController');
        await createNotification({
          title: 'Interview Rounds Scheduled',
          message: `Interview rounds have been scheduled for ${job.title} position at ${req.user.companyName}`,
          type: 'interview_scheduled',
          role: 'candidate',
          relatedId: job._id,
          createdBy: req.user._id
        });
      } catch (notifError) {
        console.error('Notification creation failed:', notifError);
      }
    } else if (hasScheduledRounds && wasScheduled) {
      try {
        const { createNotification } = require('./notificationController');
        await createNotification({
          title: 'Interview Schedule Updated',
          message: `Interview schedule has been updated for ${job.title} position at ${req.user.companyName}`,
          type: 'interview_updated',
          role: 'candidate',
          relatedId: job._id,
          createdBy: req.user._id
        });
      } catch (notifError) {
        console.error('Notification creation failed:', notifError);
      }
    }

    console.log('Updated job:', job);
    res.json({ success: true, job });
  } catch (error) {
    console.log('Update job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ 
      _id: req.params.jobId, 
      employerId: req.user._id 
    });
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEmployerJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecentJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json({ success: true, jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Application Management Controllers
exports.reviewApplication = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.applicationId,
      employerId: req.user._id
    })
    .populate('candidateId', 'name email phone')
    .populate('jobId', 'title');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const application = await Application.findOneAndUpdate(
      { _id: req.params.applicationId, employerId: req.user._id },
      { 
        status,
        $push: {
          statusHistory: {
            status,
            changedBy: req.user._id,
            changedByModel: 'Employer',
            notes
          }
        }
      },
      { new: true }
    ).populate('candidateId', 'name email')
    .populate('jobId', 'title');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Message Controllers
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const conversationId = [req.user._id, receiverId].sort().join('-');
    
    const newMessage = await Message.create({
      senderId: req.user._id,
      senderModel: 'Employer',
      receiverId,
      receiverModel: 'Candidate',
      message,
      conversationId
    });

    res.status(201).json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name companyName')
      .populate('receiverId', 'name')
      .sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Subscription Management Controllers
exports.createSubscription = async (req, res) => {
  try {
    const { plan, paymentData } = req.body;
    
    const subscription = await Subscription.findOneAndUpdate(
      { employerId: req.user._id },
      { 
        plan,
        $push: { paymentHistory: paymentData }
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ employerId: req.user._id });
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { employerId: req.user._id },
      req.body,
      { new: true }
    );

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const employerId = req.user._id;
    
    const totalJobs = await Job.countDocuments({ employerId });
    const activeJobs = await Job.countDocuments({ employerId, status: 'active' });
    const totalApplications = await Application.countDocuments({ employerId });
    const shortlisted = await Application.countDocuments({ employerId, status: 'shortlisted' });
    
    res.json({
      success: true,
      stats: { totalJobs, activeJobs, totalApplications, shortlisted },
      employer: { companyName: req.user.companyName }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEmployerApplications = async (req, res) => {
  try {
    const CandidateProfile = require('../models/CandidateProfile');
    const { companyName } = req.query; // Filter by company name for consultants
    
    let query = { employerId: req.user._id };
    
    // If companyName filter is provided (for consultants)
    if (companyName && companyName.trim() !== '') {
      const jobs = await Job.find({ 
        employerId: req.user._id, 
        companyName: new RegExp(companyName, 'i') 
      }).select('_id');
      const jobIds = jobs.map(job => job._id);
      query.jobId = { $in: jobIds };
    }
    
    const applications = await Application.find(query)
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title location companyName')
      .sort({ createdAt: -1 });

    // Add profile pictures to applications
    const applicationsWithProfiles = await Promise.all(
      applications.map(async (application) => {
        const candidateProfile = await CandidateProfile.findOne({ candidateId: application.candidateId._id });
        return {
          ...application.toObject(),
          candidateId: {
            ...application.candidateId.toObject(),
            profilePicture: candidateProfile?.profilePicture
          }
        };
      })
    );

    res.json({ success: true, applications: applicationsWithProfiles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getJobApplications = async (req, res) => {
  try {
    const CandidateProfile = require('../models/CandidateProfile');
    const { jobId } = req.params;
    
    // Verify job belongs to employer
    const job = await Job.findOne({ _id: jobId, employerId: req.user._id });
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    
    const applications = await Application.find({ jobId, employerId: req.user._id })
      .populate('candidateId', 'name email phone')
      .populate('jobId', 'title location companyName')
      .sort({ createdAt: -1 });

    // Add profile pictures to applications
    const applicationsWithProfiles = await Promise.all(
      applications.map(async (application) => {
        const candidateProfile = await CandidateProfile.findOne({ candidateId: application.candidateId._id });
        return {
          ...application.toObject(),
          candidateId: {
            ...application.candidateId.toObject(),
            profilePicture: candidateProfile?.profilePicture
          }
        };
      })
    );

    res.json({ success: true, applications: applicationsWithProfiles, job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const CandidateProfile = require('../models/CandidateProfile');
    
    const application = await Application.findOne({
      _id: applicationId,
      employerId: req.user._id
    })
    .populate('candidateId', 'name email phone')
    .populate('jobId', 'title location interviewRoundsCount interviewRoundTypes');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Get candidate profile data
    const candidateProfile = await CandidateProfile.findOne({ candidateId: application.candidateId._id });
    
    // Merge candidate and profile data
    const candidateData = {
      ...application.candidateId.toObject(),
      ...candidateProfile?.toObject()
    };

    const responseApplication = {
      ...application.toObject(),
      candidateId: candidateData
    };

    res.json({ success: true, application: responseApplication });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getConsultantCompanies = async (req, res) => {
  try {
    const companies = await Job.distinct('companyName', { 
      employerId: req.user._id,
      companyName: { $exists: true, $ne: null, $ne: '' }
    });
    
    res.json({ success: true, companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveInterviewReview = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { interviewRounds, remarks, isSelected } = req.body;
    
    const application = await Application.findOneAndUpdate(
      { _id: applicationId, employerId: req.user._id },
      { 
        interviewRounds,
        employerRemarks: remarks,
        isSelectedForProcess: isSelected,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('candidateId', 'name email')
    .populate('jobId', 'title');
    
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    
    res.json({ success: true, message: 'Interview review saved successfully', application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProfileCompletion = async (req, res) => {
  try {
    const profile = await EmployerProfile.findOne({ employerId: req.user._id });
    
    if (!profile) {
      return res.json({ success: true, completion: 25, missingFields: ['All profile fields'] });
    }
    
    const requiredFields = ['companyName', 'description', 'website', 'logo'];
    const completedFields = requiredFields.filter(field => profile[field]);
    const completion = Math.round((completedFields.length / requiredFields.length) * 100);
    const missingFields = requiredFields.filter(field => !profile[field]);
    
    res.json({ success: true, completion, missingFields });
  } catch (error) {
    res.json({ success: true, completion: 25, missingFields: ['Profile data'] });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const activities = [];
    
    // Recent applications
    const recentApplications = await Application.find({ employerId: req.user._id })
      .populate('jobId', 'title')
      .sort({ createdAt: -1 })
      .limit(3);
    
    recentApplications.forEach(app => {
      activities.push({
        type: 'application',
        title: 'New application received',
        description: `Application for ${app.jobId?.title || 'Unknown Job'}`,
        time: app.createdAt,
        icon: '👤'
      });
    });
    
    // Recent job posts
    const recentJobs = await Job.find({ employerId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(2);
    
    recentJobs.forEach(job => {
      activities.push({
        type: 'job',
        title: 'Job post created',
        description: `${job.title} position posted`,
        time: job.createdAt,
        icon: '💼'
      });
    });
    
    // Sort by time and limit to 5
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivities = activities.slice(0, 5);
    
    res.json({ success: true, activities: limitedActivities });
  } catch (error) {
    res.json({ success: true, activities: [] });
  }
};

// Notification Controllers
exports.getNotifications = async (req, res) => {
  try {
    const { getNotificationsByRole } = require('./notificationController');
    req.params.role = 'employer';
    return getNotificationsByRole(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { markAsRead } = require('./notificationController');
    return markAsRead(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const { markAllAsRead } = require('./notificationController');
    req.params.role = 'employer';
    return markAllAsRead(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};