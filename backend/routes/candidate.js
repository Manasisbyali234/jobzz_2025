const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const auth = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const handleValidationErrors = require('../middlewares/validation');

// Authentication Routes
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
], handleValidationErrors, candidateController.registerCandidate);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], handleValidationErrors, candidateController.loginCandidate);

// Password Reset Routes (Public - before auth middleware)
router.post('/password/reset', [
  body('email').isEmail().withMessage('Valid email is required')
], handleValidationErrors, candidateController.resetPassword);

router.post('/password/confirm-reset', [
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], handleValidationErrors, candidateController.confirmResetPassword);

// Protected Routes
router.use(auth(['candidate']));

// Profile Management Routes
router.get('/profile', candidateController.getProfile);
router.get('/profile/complete', candidateController.getCandidateCompleteProfile);
router.put('/profile', upload.single('profilePicture'), (req, res, next) => {
  // Skip validation for specific field updates
  const isResumeHeadlineOnly = req.body.resumeHeadline && Object.keys(req.body).length === 1;
  const isProfileSummaryOnly = req.body.profileSummary && Object.keys(req.body).length === 1;
  const isSkillsOnly = req.body.skills && Object.keys(req.body).length === 1;
  
  // Skip validation for personal details updates (contains multiple fields)
  const personalDetailsFields = ['dateOfBirth', 'gender', 'location', 'fatherName', 'motherName', 'residentialAddress', 'permanentAddress', 'correspondenceAddress', 'education'];
  const hasPersonalDetailsFields = personalDetailsFields.some(field => field in req.body);
  
  if (isResumeHeadlineOnly || isProfileSummaryOnly || isSkillsOnly || hasPersonalDetailsFields) {
    return candidateController.updateProfile(req, res);
  }
  
  // Apply validation for other profile updates
  const validations = [
    body('name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
    body('middleName')
      .optional()
      .isLength({ max: 30 })
      .withMessage('Middle name cannot exceed 30 characters')
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage('Middle name can only contain letters and spaces'),
    body('lastName')
      .optional()
      .isLength({ max: 30 })
      .withMessage('Last name cannot exceed 30 characters')
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage('Last name can only contain letters and spaces'),
    body('phone')
      .optional()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Phone number must be a valid 10-digit Indian mobile number'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    body('location')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Location cannot exceed 100 characters')
      .matches(/^[a-zA-Z0-9\s,.-]*$/)
      .withMessage('Location contains invalid characters'),
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date')
      .custom((value) => {
        if (value) {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age < 16 || age > 65) {
            throw new Error('Age must be between 16 and 65 years');
          }
        }
        return true;
      }),
    body('gender')
      .optional()
      .isIn(['male', 'female'])
      .withMessage('Gender must be either male or female'),
    body('fatherName')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Father name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage('Father name can only contain letters and spaces'),
    body('motherName')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Mother name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]*$/)
      .withMessage('Mother name can only contain letters and spaces'),
    body('residentialAddress')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Residential address cannot exceed 200 characters'),
    body('permanentAddress')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Permanent address cannot exceed 200 characters'),
    body('correspondenceAddress')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Correspondence address cannot exceed 200 characters')
  ];
  
  // Apply validations and then handle validation errors
  Promise.all(validations.map(validation => validation.run(req)))
    .then(() => {
      handleValidationErrors(req, res, next);
    })
    .catch(next);
});
router.post('/upload-resume', upload.single('resume'), [
  // File validation will be handled in the controller
], candidateController.uploadResume);
router.post('/upload-marksheet', upload.single('marksheet'), [
  // File validation will be handled in the controller
], candidateController.uploadMarksheet);

// Dashboard Routes
router.get('/dashboard', candidateController.getDashboard);
router.get('/dashboard/stats', candidateController.getDashboardStats);
router.get('/recommended-jobs', candidateController.getRecommendedJobs);

// Job Application Routes
router.post('/jobs/:jobId/apply', [
  body('coverLetter').optional().isString()
], handleValidationErrors, candidateController.applyForJob);

router.post('/applications', candidateController.applyForJob);
router.post('/apply/:jobId', candidateController.applyForJob);
router.get('/applications', candidateController.getAppliedJobs);
router.get('/applications/interviews', candidateController.getCandidateApplicationsWithInterviews);
router.get('/applications/:applicationId/status', candidateController.getApplicationStatus);

// Messaging Routes
router.post('/messages', [
  body('receiverId').notEmpty().withMessage('Receiver ID is required'),
  body('message').notEmpty().withMessage('Message is required')
], handleValidationErrors, candidateController.sendMessage);

router.get('/messages/:conversationId', candidateController.getMessages);

// Password Management Routes
router.put('/password/change', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], handleValidationErrors, candidateController.changePassword);

module.exports = router;