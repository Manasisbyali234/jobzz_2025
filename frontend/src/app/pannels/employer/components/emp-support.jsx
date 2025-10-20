import { useState, useEffect } from 'react';

function EmpSupport() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        userType: 'employer',
        userId: '',
        subject: '',
        category: 'general',
        priority: 'medium',
        message: ''
    });
    const [files, setFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        // Debug: Check all localStorage keys
        console.log('All localStorage keys:', Object.keys(localStorage));
        
        // Try multiple localStorage keys for employer data
        const possibleKeys = ['employerData', 'employer', 'user', 'authData', 'loginData'];
        let foundData = null;
        
        for (const key of possibleKeys) {
            const data = localStorage.getItem(key);
            if (data) {
                console.log(`Found data in ${key}:`, data);
                try {
                    foundData = JSON.parse(data);
                    break;
                } catch (e) {
                    console.log(`Error parsing ${key}:`, e);
                }
            }
        }
        
        // Check for token like NotificationBell does
        const employerToken = localStorage.getItem('employerToken') || 
                            localStorage.getItem('token') ||
                            localStorage.getItem('authToken');
        console.log('Token found:', !!employerToken);
        
        // Update form data if we found any data
        if (foundData) {
            console.log('Using data:', foundData);
            setFormData(prev => ({
                ...prev,
                name: foundData.companyName || foundData.name || foundData.firstName || 'Employer',
                email: foundData.email || '',
                phone: foundData.phone || foundData.mobile || '',
                userId: foundData._id || foundData.id || ''
            }));
        }
        
        // If no data, try to decode token
        if (!foundData && employerToken) {
            try {
                const tokenPayload = JSON.parse(atob(employerToken.split('.')[1]));
                console.log('Token payload:', tokenPayload);
                setFormData(prev => ({
                    ...prev,
                    userId: tokenPayload.id || tokenPayload.userId || '',
                    name: tokenPayload.companyName || tokenPayload.name || 'Employer',
                    email: tokenPayload.email || ''
                }));
            } catch (error) {
                console.log('Error decoding token:', error);
            }
        }
    }, []);

    const categories = [
        { value: 'general', label: 'General Inquiry' },
        { value: 'technical', label: 'Technical Issue' },
        { value: 'billing', label: 'Billing & Payment' },
        { value: 'account', label: 'Account Management' },
        { value: 'job-posting', label: 'Job Posting' }
    ];

    const priorities = [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'urgent', label: 'Urgent' }
    ];

    const validateForm = () => {
        const newErrors = {};
        if (!formData.subject.trim()) newErrors.subject = 'Subject is required';
        if (!formData.message.trim()) newErrors.message = 'Message is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 3) {
            setErrors(prev => ({ ...prev, files: 'Maximum 3 files allowed' }));
            return;
        }
        setFiles(selectedFiles);
        if (errors.files) {
            setErrors(prev => ({ ...prev, files: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        try {
            const submitData = new FormData();
            
            // Ensure all required fields are present - email will be auto-fetched from login
            const requiredData = {
                name: formData.name || 'Employer User',
                email: formData.email, // This will be auto-fetched from login credentials
                phone: formData.phone || 'Not provided',
                userType: formData.userType,
                userId: formData.userId || '',
                subject: formData.subject,
                category: formData.category,
                priority: formData.priority,
                message: formData.message
            };
            
            // Use fallback email if none found
            if (!requiredData.email) {
                requiredData.email = 'employer@jobportal.com';
                console.warn('No email found, using fallback');
            }
            
            Object.keys(requiredData).forEach(key => {
                submitData.append(key, requiredData[key]);
            });
            
            files.forEach(file => {
                submitData.append('attachments', file);
            });

            const response = await fetch('/api/public/support', {
                method: 'POST',
                body: submitData
            });
            
            if (response.ok) {
                setIsSubmitted(true);
                setFormData(prev => ({
                    ...prev,
                    subject: '',
                    category: 'general',
                    priority: 'medium',
                    message: ''
                }));
                setFiles([]);
            } else {
                const data = await response.json();
                setErrors({ submit: data.message || 'Failed to submit support ticket' });
            }
        } catch (error) {
            console.error('Support submission error:', error);
            setErrors({ submit: 'Backend server not running. Please start the backend server on port 5000.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="panel-main-content">
                <div className="twm-dash-b-blocks">
                    <div className="col-lg-12">
                        <div className="panel panel-default">
                            <div className="panel-heading wt-panel-heading p-a20">
                                <h4 className="panel-tittle m-a0">Support Ticket Submitted</h4>
                            </div>
                            <div className="panel-body wt-panel-body p-a20 m-b30">
                                <div className="text-center">
                                    <div className="success-icon mb-3">
                                        <i className="fa fa-check-circle" style={{fontSize: '4rem', color: '#28a745'}}></i>
                                    </div>
                                    <h3 className="text-success">✓ Support Ticket Submitted!</h3>
                                    <p>Thank you for contacting our support team. We have received your ticket and will respond within 24 hours.</p>
                                    <button 
                                        onClick={() => setIsSubmitted(false)} 
                                        className="site-button mt-3"
                                    >
                                        Submit Another Ticket
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="panel-main-content">
            <div className="twm-dash-b-blocks">
                <div className="col-lg-12">
                    <div className="panel panel-default">
                        <div className="panel-heading wt-panel-heading p-a20">
                            <h4 className="panel-tittle m-a0">Get Support</h4>
                        </div>
                        <div className="panel-body wt-panel-body p-a20 m-b30">
                            {/* Debug info - remove in production */}
                            {formData.name && (
                                <div className="alert alert-info mb-3">
                                    <small>Auto-filled: {formData.name} ({formData.email})</small>
                                </div>
                            )}
                            
                            <form onSubmit={handleSubmit}>
                                {errors.submit && (
                                    <div className="alert alert-danger mb-3">{errors.submit}</div>
                                )}
                                
                                <div className="row">
                                    <div className="col-xl-12 col-lg-12 col-md-12">
                                        <div className="form-group">
                                            <label>Subject *</label>
                                            <input 
                                                name="subject" 
                                                type="text" 
                                                className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
                                                placeholder="Brief description of your issue" 
                                                value={formData.subject}
                                                onChange={handleChange}
                                            />
                                            {errors.subject && <div className="invalid-feedback">{errors.subject}</div>}
                                        </div>
                                    </div>
                                    
                                    <div className="col-xl-6 col-lg-6 col-md-12">
                                        <div className="form-group">
                                            <label>Category</label>
                                            <select 
                                                name="category" 
                                                className="form-control"
                                                value={formData.category}
                                                onChange={handleChange}
                                            >
                                                {categories.map(cat => (
                                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="col-xl-6 col-lg-6 col-md-12">
                                        <div className="form-group">
                                            <label>Priority</label>
                                            <select 
                                                name="priority" 
                                                className="form-control"
                                                value={formData.priority}
                                                onChange={handleChange}
                                            >
                                                {priorities.map(pri => (
                                                    <option key={pri.value} value={pri.value}>{pri.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="col-xl-12 col-lg-12 col-md-12">
                                        <div className="form-group">
                                            <label>Message *</label>
                                            <textarea 
                                                name="message" 
                                                className={`form-control ${errors.message ? 'is-invalid' : ''}`}
                                                rows={5} 
                                                placeholder="Describe your issue or question in detail..." 
                                                value={formData.message}
                                                onChange={handleChange}
                                            />
                                            {errors.message && <div className="invalid-feedback">{errors.message}</div>}
                                        </div>
                                    </div>
                                    
                                    <div className="col-xl-12 col-lg-12 col-md-12">
                                        <div className="form-group">
                                            <label>Attachments (Optional)</label>
                                            <input 
                                                type="file" 
                                                className={`form-control ${errors.files ? 'is-invalid' : ''}`}
                                                multiple 
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                                                onChange={handleFileChange}
                                            />
                                            <small className="form-text text-muted">
                                                Upload up to 3 files (max 5MB each). Supported: PDF, DOC, DOCX, JPG, PNG, TXT
                                            </small>
                                            {errors.files && <div className="invalid-feedback">{errors.files}</div>}
                                        </div>
                                    </div>
                                    
                                    <div className="col-xl-12 col-lg-12 col-md-12">
                                        <button 
                                            type="submit" 
                                            className="site-button"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmpSupport;