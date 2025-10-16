const mongoose = require('mongoose');
const Job = require('../models/Job');
const Blog = require('../models/Blog');
const Contact = require('../models/Contact');
const Testimonial = require('../models/Testimonial');
const Partner = require('../models/Partner');
const FAQ = require('../models/FAQ');
const Review = require('../models/Review');
const { cache } = require('../utils/cache');

// Job Controllers
exports.getJobs = async (req, res) => {
  try {
    const { location, jobType, category, search, title, employerId, employmentType, skills, keyword, jobTitle, page = 1, limit = 10, sortBy } = req.query;
    
    // Create cache key for this specific query
    const cacheKey = `jobs_${JSON.stringify({ location, jobType, category, search, title, employerId, employmentType, skills, keyword, jobTitle, page, limit, sortBy })}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    // Optimized query building
    let query = { 
      status: { $in: ['active', 'pending'] },
      'employerId': { $exists: true }
    };
    
    if (employerId) query.employerId = employerId;
    if (title) query.title = { $regex: title, $options: 'i' };
    if (location) query.location = { $regex: location, $options: 'i' };

    if (employmentType) {
      query.jobType = employmentType;
    } else if (jobType) {
      query.jobType = Array.isArray(jobType) ? { $in: jobType } : jobType;
    }
    
    const searchTerms = [search, keyword, jobTitle].filter(Boolean);
    if (searchTerms.length > 0) {
      const searchRegex = new RegExp(searchTerms.join('|'), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { requiredSkills: { $in: [searchRegex] } }
      ];
    }
    
    if (category) query.category = { $regex: category, $options: 'i' };
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      query.requiredSkills = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
    }

    const sortMap = {
      'Most Recent': { createdAt: -1 },
      'Oldest': { createdAt: 1 },
      'Salary High to Low': { 'ctc.max': -1, 'ctc.min': -1 },
      'Salary Low to High': { 'ctc.min': 1, 'ctc.max': 1 },
      'A-Z': { title: 1 },
      'Z-A': { title: -1 }
    };
    const sortCriteria = sortMap[sortBy] || { createdAt: -1 };

    // Optimized aggregation pipeline with minimal data transfer
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'employers',
          localField: 'employerId',
          foreignField: '_id',
          as: 'employer',
          pipeline: [
            { $match: { status: 'active', isApproved: true } },
            { $project: { companyName: 1, employerType: 1 } }
          ]
        }
      },
      { $match: { 'employer.0': { $exists: true } } },
      {
        $lookup: {
          from: 'employerprofiles',
          localField: 'employerId',
          foreignField: 'employerId',
          as: 'employerProfile',
          pipeline: [
            { $project: { logo: 1, companyName: 1 } } // Only get essential profile data
          ]
        }
      },
      {
        $addFields: {
          employerId: { $arrayElemAt: ['$employer', 0] },
          employerProfile: { $arrayElemAt: ['$employerProfile', 0] },
          postedBy: {
            $cond: {
              if: { $eq: [{ $arrayElemAt: ['$employer.employerType', 0] }, 'consultant'] },
              then: 'Consultant',
              else: 'Company'
            }
          }
        }
      },
      {
        $project: {
          title: 1,
          location: 1,
          jobType: 1,
          vacancies: 1,
          category: 1,
          ctc: 1,
          createdAt: 1,
          'employerProfile.logo': 1,
          postedBy: 1,
          'employerId.companyName': 1
        }
      },
      { $sort: sortCriteria },
      {
        $facet: {
          jobs: [
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
          ],
          totalCount: [{ $count: 'count' }]
        }
      }
    ];

    const [result] = await Job.aggregate(pipeline);
    const jobs = result.jobs || [];
    const totalJobs = result.totalCount[0]?.count || 0;
    
    const response = {
      success: true,
      jobs,
      total: jobs.length,
      totalCount: totalJobs,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalJobs / parseInt(limit)),
      hasNextPage: parseInt(page) < Math.ceil(totalJobs / parseInt(limit)),
      hasPrevPage: parseInt(page) > 1
    };
    
    // Cache for 3 minutes for faster updates
    cache.set(cacheKey, response, 180000);
    
    res.json(response);
  } catch (error) {
    console.error('Error in getJobs:', error);
    res.json({ success: true, jobs: [], total: 0 });
  }
};

exports.getJobsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    const jobs = await Job.find({ 
      status: 'active',
      category: new RegExp(category, 'i')
    })
    .populate({
      path: 'employerId',
      select: 'companyName status isApproved employerType',
      match: { status: 'active', isApproved: true }
    })
    .sort({ createdAt: -1 });
    
    const approvedJobs = jobs.filter(job => job.employerId);
    const roles = [...new Set(approvedJobs.map(job => job.title))];
    
    res.json({ success: true, roles, jobs: approvedJobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const cacheKey = `job_${req.params.id}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const job = await Job.findById(req.params.id)
      .populate({
        path: 'employerId',
        select: 'companyName email phone employerType'
      })
      .lean();
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const EmployerProfile = require('../models/EmployerProfile');
    const employerProfile = await EmployerProfile.findOne({ employerId: job.employerId._id }).lean();
    
    console.log('Found employer profile:', !!employerProfile);
    if (employerProfile) {
      console.log('Profile logo exists:', !!employerProfile.logo);
      console.log('Profile cover exists:', !!employerProfile.coverImage);
    }
    
    const jobWithProfile = {
      ...job,
      employerProfile,
      postedBy: job.employerId.employerType === 'consultant' ? 'Consultant' : 'Company'
    };

    const response = { success: true, job: jobWithProfile };
    cache.set(cacheKey, response, 600000); // Cache for 10 minutes
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchJobs = async (req, res) => {
  try {
    const { q, location, jobType } = req.query;
    
    let query = { status: 'active' };
    
    if (q) {
      query.$or = [
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { skills: { $in: [new RegExp(q, 'i')] } }
      ];
    }
    
    if (location) query.location = new RegExp(location, 'i');
    if (jobType) query.jobType = jobType;

    const jobs = await Job.find(query)
      .populate({
        path: 'employerId',
        select: 'companyName status isApproved employerType',
        match: { status: 'active', isApproved: true }
      })
      .sort({ createdAt: -1 });

    // Filter out jobs where employer is not approved
    const filteredJobs = jobs.filter(job => job.employerId);

    res.json({ success: true, jobs: filteredJobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Blog Controllers
exports.getBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    
    let query = { isPublished: true };
    if (category) query.category = category;
    
    const blogs = await Blog.find(query)
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({ success: true, blogs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findOne({ 
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
      isPublished: true 
    }).populate('author', 'name');
    
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog not found' });
    }

    blog.views += 1;
    await blog.save();

    res.json({ success: true, blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Contact Controller
exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    const contact = await Contact.create({
      name, email, phone, subject, message
    });

    res.status(201).json({ 
      success: true, 
      message: 'Contact form submitted successfully',
      contact 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Content Controllers
exports.getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });
    res.json({ success: true, testimonials });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPartners = async (req, res) => {
  try {
    const partners = await Partner.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 });
    res.json({ success: true, partners });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFAQs = async (req, res) => {
  try {
    const { category } = req.query;
    let query = { isActive: true };
    if (category) query.category = category;
    
    const faqs = await FAQ.find(query).sort({ order: 1, createdAt: -1 });
    res.json({ success: true, faqs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public stats for homepage (no auth)
exports.getPublicStats = async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments({ status: { $in: ['active', 'pending', 'closed', 'draft'] } });
    const totalEmployers = await require('../models/Employer').countDocuments();
    const totalApplications = await require('../models/Application').countDocuments();

    res.json({
      success: true,
      stats: {
        totalJobs,
        totalEmployers,
        totalApplications,
      },
    });
  } catch (error) {
    // Return fallback stats when DB is unavailable
    res.json({
      success: true,
      stats: {
        totalJobs: 0,
        totalEmployers: 0,
        totalApplications: 0,
      },
    });
  }
};

exports.getEmployerProfile = async (req, res) => {
  try {
    const EmployerProfile = require('../models/EmployerProfile');
    const Employer = require('../models/Employer');
    
    let profile = await EmployerProfile.findOne({ employerId: req.params.id })
      .populate('employerId', 'name email phone companyName');
    
    // If no profile exists, create basic profile from employer data
    if (!profile) {
      const employer = await Employer.findById(req.params.id);
      if (!employer) {
        return res.status(404).json({ success: false, message: 'Employer not found' });
      }
      
      profile = {
        employerId: employer,
        companyName: employer.companyName,
        email: employer.email,
        phone: employer.phone,
        description: 'No company description available.',
        gallery: []
      };
    }

    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEmployers = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy } = req.query;
    
    const cacheKey = `employers_${JSON.stringify({ page, limit, sortBy })}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    const Employer = require('../models/Employer');
    const EmployerProfile = require('../models/EmployerProfile');
    
    const sortMap = {
      'Most Recent': { createdAt: -1 },
      'Oldest': { createdAt: 1 },
      'A-Z': { companyName: 1 },
      'Z-A': { companyName: -1 }
    };
    const sortCriteria = sortMap[sortBy] || { createdAt: -1 };

    const pipeline = [
      { $match: { status: 'active', isApproved: true } },
      {
        $lookup: {
          from: 'employerprofiles',
          localField: '_id',
          foreignField: 'employerId',
          as: 'profile',
          pipeline: [
            { $project: { 
              logo: 1, 
              industry: 1, 
              corporateAddress: 1, 
              website: 1, 
              companySize: 1 
            } }
          ]
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: 'employerId',
          as: 'jobs',
          pipeline: [
            { $match: { status: { $in: ['active', 'pending'] } } },
            { $count: 'count' }
          ]
        }
      },
      {
        $addFields: {
          profile: { $arrayElemAt: ['$profile', 0] },
          jobCount: { $ifNull: [{ $arrayElemAt: ['$jobs.count', 0] }, 0] }
        }
      },
      {
        $project: {
          companyName: 1,
          email: 1,
          phone: 1,
          employerType: 1,
          createdAt: 1,
          profile: 1,
          jobCount: 1
        }
      },
      { $sort: sortCriteria },
      {
        $facet: {
          employers: [
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
          ],
          totalCount: [{ $count: 'count' }]
        }
      }
    ];

    const [result] = await Employer.aggregate(pipeline);
    const employers = result.employers || [];
    const totalEmployers = result.totalCount[0]?.count || 0;
    
    const response = {
      success: true,
      employers,
      total: employers.length,
      totalCount: totalEmployers,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalEmployers / parseInt(limit)),
      hasNextPage: parseInt(page) < Math.ceil(totalEmployers / parseInt(limit)),
      hasPrevPage: parseInt(page) > 1
    };
    
    cache.set(cacheKey, response, 180000);
    res.json(response);
  } catch (error) {
    console.error('Error in getEmployers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopRecruiters = async (req, res) => {
  try {
    const { limit = 8 } = req.query;
    const Employer = require('../models/Employer');
    const EmployerProfile = require('../models/EmployerProfile');
    
    // Get active and approved employers
    const employers = await Employer.find({ 
      status: 'active', 
      isApproved: true 
    }).select('_id companyName employerType createdAt');
    
    // Get job counts and profiles for each employer
    const recruitersWithData = await Promise.all(
      employers.map(async (employer) => {
        // Get job count for this employer
        const jobCount = await Job.countDocuments({
          employerId: employer._id,
          status: { $in: ['active', 'pending'] }
        });
        
        // Get employer profile
        const profile = await EmployerProfile.findOne({ employerId: employer._id });
        
        return {
          _id: employer._id,
          companyName: employer.companyName,
          employerType: employer.employerType,
          jobCount,
          logo: profile?.logo || null,
          description: profile?.description || profile?.companyDescription || 'Leading recruitment company',
          location: profile?.location || profile?.corporateAddress || 'Multiple Locations',
          industry: profile?.industry || profile?.industrySector || 'Various Industries',
          establishedSince: profile?.establishedSince || profile?.foundedYear || null,
          teamSize: profile?.teamSize || profile?.companySize || null,
          website: profile?.website || null
        };
      })
    );
    
    // Sort by job count (descending) and take top recruiters
    const topRecruiters = recruitersWithData
      .filter(recruiter => recruiter.jobCount > 0) // Only include recruiters with active jobs
      .sort((a, b) => b.jobCount - a.jobCount)
      .slice(0, parseInt(limit));
    
    res.json({ 
      success: true, 
      recruiters: topRecruiters,
      total: topRecruiters.length
    });
  } catch (error) {
    console.error('Error in getTopRecruiters:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Apply for job without login
exports.applyForJob = async (req, res) => {
  try {
    const { name, email, phone, message, jobId } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone || !jobId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, phone, and job ID are required' 
      });
    }

    // Check if job exists and is active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Job post ended' });
    }
    if (typeof job.applicationLimit === 'number' && job.applicationLimit > 0 && job.applicationCount >= job.applicationLimit) {
      return res.status(400).json({ success: false, message: 'Job post ended: application limit reached' });
    }

    // Handle file upload if resume is provided
    let resumeData = null;
    if (req.file) {
      const { fileToBase64 } = require('../middlewares/upload');
      resumeData = {
        filename: req.file.originalname,
        originalName: req.file.originalname,
        data: fileToBase64(req.file),
        size: req.file.size,
        mimetype: req.file.mimetype
      };
    }

    // Create application record
    const Application = require('../models/Application');
    const application = await Application.create({
      jobId,
      candidateId: null, // No candidate ID for non-logged-in users
      applicantName: name,
      applicantEmail: email,
      applicantPhone: phone,
      coverLetter: message || '',
      resume: resumeData,
      status: 'pending',
      appliedAt: new Date(),
      isGuestApplication: true
    });

    // Increment the job's application count and close if limit reached
    await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });
    const updatedJob = await Job.findById(jobId).select('applicationCount applicationLimit status');
    if (
      updatedJob &&
      typeof updatedJob.applicationLimit === 'number' &&
      updatedJob.applicationLimit > 0 &&
      updatedJob.applicationCount >= updatedJob.applicationLimit &&
      updatedJob.status !== 'closed'
    ) {
      await Job.findByIdAndUpdate(jobId, { status: 'closed' });
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      applicationId: application._id
    });
  } catch (error) {
    console.error('Error in applyForJob:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Review Controllers
exports.getEmployerReviews = async (req, res) => {
  try {
    const { employerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const reviews = await Review.find({ 
      employerId, 
      isApproved: true 
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    const totalReviews = await Review.countDocuments({ 
      employerId, 
      isApproved: true 
    });
    
    // Calculate average rating
    const avgRating = await Review.aggregate([
      { $match: { employerId: new mongoose.Types.ObjectId(employerId), isApproved: true } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalCount: { $sum: 1 } } }
    ]);
    
    const averageRating = avgRating.length > 0 ? Math.round(avgRating[0].avgRating * 10) / 10 : 0;
    const reviewCount = avgRating.length > 0 ? avgRating[0].totalCount : 0;
    
    res.json({ 
      success: true, 
      reviews,
      totalReviews,
      averageRating,
      reviewCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalReviews / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.submitEmployerReview = async (req, res) => {
  try {
    const { employerId } = req.params;
    const { reviewerName, reviewerEmail, rating, description, image } = req.body;
    
    // Validate required fields
    if (!reviewerName || !reviewerEmail || !rating || !description) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please select a rating between 1 and 5 stars' 
      });
    }
    
    // Check if employer exists
    const Employer = require('../models/Employer');
    const employer = await Employer.findById(employerId);
    if (!employer) {
      return res.status(404).json({ success: false, message: 'Employer not found' });
    }
    
    // Check if user already reviewed this employer
    const existingReview = await Review.findOne({ 
      employerId, 
      reviewerEmail: reviewerEmail.trim().toLowerCase() 
    });
    if (existingReview) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already submitted a review for this company' 
      });
    }
    
    // Create review
    const review = await Review.create({
      employerId,
      reviewerName: reviewerName.trim(),
      reviewerEmail: reviewerEmail.trim().toLowerCase(),
      rating: parseInt(rating),
      description: description.trim(),
      image: image || null
    });
    
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      reviewId: review._id
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubmittedReviews = async (req, res) => {
  try {
    const { employerId } = req.params;
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    const reviews = await Review.find({ 
      employerId, 
      reviewerEmail: email.toLowerCase() 
    }).sort({ createdAt: -1 });
    
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};