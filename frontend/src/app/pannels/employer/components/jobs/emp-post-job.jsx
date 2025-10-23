
import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useParams } from "react-router-dom";
import { employer, empRoute, publicUser } from "../../../../../globals/route-names";

export default function EmpPostJob({ onNext }) {
	const { id } = useParams();
	const isEditMode = Boolean(id);
	const [formData, setFormData] = useState({
		jobTitle: "",
		jobLocation: "",
		jobType: "",
		netSalary: "",
		ctc: "",
		vacancies: "",
		applicationLimit: "",
		jobDescription: "",
		education: "", // dropdown
		backlogsAllowed: false,
		requiredSkills: [],
		skillInput: "",
		experienceLevel: "freshers", // 'freshers' | 'minimum'
		minExperience: "",
		interviewRoundsCount: "",
		interviewRoundTypes: {
			technical: false,
			managerial: false,
			nonTechnical: false,
			final: false,
			hr: false,
		},
		interviewRoundOrder: [],
		interviewRoundDetails: {
			technical: { description: '', fromDate: '', toDate: '', time: '' },
			nonTechnical: { description: '', fromDate: '', toDate: '', time: '' },
			managerial: { description: '', fromDate: '', toDate: '', time: '' },
			final: { description: '', fromDate: '', toDate: '', time: '' },
			hr: { description: '', fromDate: '', toDate: '', time: '' }
		},
		offerLetterDate: "",
		joiningDate: "",
		lastDateOfApplication: "",
		transportation: {
			oneWay: false,
			twoWay: false,
			noCab: false,
		},
		interviewMode: {
			faceToFace: false,
			phone: false,
			videoCall: false,
			documentVerification: false,
		},
		// Consultant-specific fields
		companyLogo: "",
		companyName: "",
		companyDescription: "",
		category: ""
	});

	const [employerType, setEmployerType] = useState('company');
	const [logoFile, setLogoFile] = useState(null);

	/* Helpers */
	const update = (patch) => setFormData((s) => ({ ...s, ...patch }));

	// Auto-save CTC to localStorage with debouncing
	const autoSaveCTC = useCallback((ctcValue) => {
		if (ctcValue && String(ctcValue).trim()) {
			localStorage.setItem('draft_ctc', ctcValue);
			
		}
	}, []);

	// Debounced auto-save
	useEffect(() => {
		const timer = setTimeout(() => {
			if (formData.ctc) {
				autoSaveCTC(formData.ctc);
			}
		}, 500); // Save after 500ms of no typing

		return () => clearTimeout(timer);
	}, [formData.ctc, autoSaveCTC]);

	useEffect(() => {
		if (isEditMode) {
			fetchJobData();
		} else {
			// Load saved CTC from localStorage for new jobs
			const savedCTC = localStorage.getItem('draft_ctc');
			if (savedCTC) {
				update({ ctc: savedCTC });
			}
		}
		fetchEmployerType();
	}, [id, isEditMode]);

	const fetchEmployerType = async () => {
		try {
			const token = localStorage.getItem('employerToken');
			const response = await fetch('http://localhost:5000/api/employer/profile', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			const data = await response.json();
			
			if (data.success && data.profile?.employerId) {
				const empType = data.profile.employerId.employerType || 'company';
				const empCategory = data.profile.employerCategory;
				
				
				// Check both employerType and employerCategory
				const finalType = (empType === 'consultant' || empCategory === 'consultancy') ? 'consultant' : 'company';
				
				setEmployerType(finalType);
				// For consultants, check if they have default company info in profile
				if (empType === 'consultant' && data.profile.consultantCompanyName) {
					update({
						companyLogo: data.profile.consultantCompanyLogo || '',
						companyName: data.profile.consultantCompanyName || '',
						companyDescription: data.profile.consultantCompanyDescription || ''
					});
				}
			}
		} catch (error) {
			
		}
	};

	const fetchJobData = async () => {
		try {
			const token = localStorage.getItem('employerToken');
			const response = await fetch('http://localhost:5000/api/employer/jobs', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			const data = await response.json();
			if (data.success) {
				const job = data.jobs.find(j => j._id === id);
				if (job) {
					setFormData({
						jobTitle: job.title || '',
						jobLocation: job.location || '',
						jobType: job.jobType || '',
						ctc: job.ctc && job.ctc.min ? (job.ctc.min === job.ctc.max ? (job.ctc.min/100000).toString() : `${(job.ctc.min/100000).toFixed(1)}-${(job.ctc.max/100000).toFixed(1)}`) : '',
						netSalary: job.netSalary && job.netSalary.min ? (job.netSalary.min === job.netSalary.max ? (job.netSalary.min/1000).toString() : `${(job.netSalary.min/1000).toFixed(0)}-${(job.netSalary.max/1000).toFixed(0)}`) : '',
						vacancies: job.vacancies || '',
						applicationLimit: job.applicationLimit || '',
						jobDescription: job.description || '',
						education: job.education || '',
						backlogsAllowed: job.backlogsAllowed || false,
						requiredSkills: job.requiredSkills || [],
						experienceLevel: job.experienceLevel || 'freshers',
						minExperience: job.minExperience || '',
						interviewRoundsCount: job.interviewRoundsCount || '',
						interviewRoundTypes: job.interviewRoundTypes || {
							technical: false,
							managerial: false,
							nonTechnical: false,
							final: false,
							hr: false,
						},
						interviewRoundOrder: job.interviewRoundOrder || [],
						interviewRoundDetails: job.interviewRoundDetails || {
							technical: { description: '', fromDate: '', toDate: '', time: '' },
							nonTechnical: { description: '', fromDate: '', toDate: '', time: '' },
							managerial: { description: '', fromDate: '', toDate: '', time: '' },
							final: { description: '', fromDate: '', toDate: '', time: '' },
							hr: { description: '', fromDate: '', toDate: '', time: '' }
						},
						offerLetterDate: job.offerLetterDate ? job.offerLetterDate.split('T')[0] : '',
						lastDateOfApplication: job.lastDateOfApplication ? job.lastDateOfApplication.split('T')[0] : '',
						transportation: job.transportation || {
							oneWay: false,
							twoWay: false,
							noCab: false,
						},
						// Consultant fields
						companyLogo: job.companyLogo || '',
						companyName: job.companyName || '',
						companyDescription: job.companyDescription || '',
						category: job.category || '',
						skillInput: '',
						joiningDate: '',
						interviewMode: {
							faceToFace: false,
							phone: false,
							videoCall: false,
							documentVerification: false,
						}
					});
				}
			}
		} catch (error) {
			
		}
	};

	/* Skills logic */
	const addSkill = () => {
		const v = formData.skillInput.trim();
		if (!v) return;
		if (formData.requiredSkills.includes(v)) {
			update({ skillInput: "" });
			return;
		}
		update({
			requiredSkills: [...formData.requiredSkills, v],
			skillInput: "",
		});
	};
	const removeSkill = (skill) =>
		update({
			requiredSkills: formData.requiredSkills.filter((s) => s !== skill),
		});

	/* Toggle nested checkbox groups */
	const toggleNested = (group, key) => {
		if (group === 'interviewRoundTypes') {
			setFormData((s) => {
				const isCurrentlyChecked = s[group][key];
				let newOrder = [...s.interviewRoundOrder];
				
				if (isCurrentlyChecked) {
					// Remove from order if unchecking
					newOrder = newOrder.filter(item => item !== key);
				} else {
					// Add to order if checking
					newOrder.push(key);
				}
				
				return {
					...s,
					[group]: { ...s[group], [key]: !s[group][key] },
					interviewRoundOrder: newOrder
				};
			});
		} else {
			setFormData((s) => ({
				...s,
				[group]: { ...s[group], [key]: !s[group][key] },
			}));
		}
	};

	/* Update interview round details */
	const updateRoundDetails = (roundType, field, value) => {
		setFormData(s => ({
			...s,
			interviewRoundDetails: {
				...s.interviewRoundDetails,
				[roundType]: {
					...s.interviewRoundDetails[roundType],
					[field]: value
				}
			}
		}));
	};

	const handleLogoUpload = (e) => {
		const file = e.target.files[0];
		if (file) {
			setLogoFile(file);
			const reader = new FileReader();
			reader.onload = (e) => {
				update({ companyLogo: e.target.result });
			};
			reader.readAsDataURL(file);
		}
	};

	const submitNext = async () => {
		try {
			const token = localStorage.getItem('employerToken');
			if (!token) {
				alert('Please login first');
				return;
			}

			// Validate required fields
			if (!formData.jobTitle.trim()) {
				alert('Please enter Job Title');
				return;
			}
			if (!formData.category.trim()) {
				alert('Please select Job Category');
				return;
			}
			if (!formData.jobType.trim()) {
				alert('Please select Job Type');
				return;
			}
			if (!formData.jobLocation.trim()) {
				alert('Please enter Job Location');
				return;
			}
			if (!formData.vacancies || parseInt(formData.vacancies) <= 0) {
				alert('Please enter valid Number of Vacancies');
				return;
			}
			if (!formData.applicationLimit || parseInt(formData.applicationLimit) <= 0) {
				alert('Please enter valid Application Limit');
				return;
			}
			if (!formData.education.trim()) {
				alert('Please select Required Educational Background');
				return;
			}
			if (!formData.interviewRoundsCount || parseInt(formData.interviewRoundsCount) <= 0) {
				alert('Please enter valid Number of Interview Rounds');
				return;
			}
			if (!formData.offerLetterDate.trim()) {
				alert('Please select Offer Letter Release Date');
				return;
			}
			if (!formData.lastDateOfApplication.trim()) {
				alert('Please select Last Date of Application');
				return;
			}
			if (!formData.jobDescription.trim()) {
				alert('Please enter Job Description');
				return;
			}

			// Validate consultant fields
			if (employerType === 'consultant') {
				if (!formData.companyName.trim()) {
					alert('Please enter Company Name (required for consultants)');
					return;
				}
				if (!formData.companyDescription.trim()) {
					alert('Please enter Company Description (required for consultants)');
					return;
				}
			}

			// Debug logging
			
			

			const jobData = {
				title: formData.jobTitle,
				location: formData.jobLocation,
				jobType: formData.jobType.toLowerCase().replace(/\s+/g, '-'),
				ctc: formData.ctc,
				netSalary: formData.netSalary,
				vacancies: parseInt(formData.vacancies) || 0,
				applicationLimit: parseInt(formData.applicationLimit) || 0,
				description: formData.jobDescription || 'Job description to be updated',
				requiredSkills: formData.requiredSkills,
				experienceLevel: formData.experienceLevel,
				minExperience: formData.minExperience ? parseInt(formData.minExperience) : 0,
				education: formData.education,
				backlogsAllowed: formData.backlogsAllowed,
				interviewRoundsCount: parseInt(formData.interviewRoundsCount) || 0,
				interviewRoundTypes: formData.interviewRoundTypes,
				interviewRoundDetails: formData.interviewRoundDetails,
				offerLetterDate: formData.offerLetterDate || null,
				lastDateOfApplication: formData.lastDateOfApplication || null,
				transportation: formData.transportation,
				category: formData.category,
				companyLogo: formData.companyLogo,
				companyName: formData.companyName,
				companyDescription: formData.companyDescription
			};

			// Add consultant-specific fields if employer is consultant
			if (employerType === 'consultant') {
				console.log('Adding consultant fields:', {
					companyLogo: formData.companyLogo,
					companyName: formData.companyName,
					companyDescription: formData.companyDescription
				});
				jobData.companyLogo = formData.companyLogo;
				jobData.companyName = formData.companyName;
				jobData.companyDescription = formData.companyDescription;
			}

			

			const url = isEditMode 
				? `http://localhost:5000/api/employer/jobs/${id}`
				: 'http://localhost:5000/api/employer/jobs';
			
			const method = isEditMode ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method: method,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify(jobData)
			});

			

			if (response.ok) {
				const data = await response.json();
				// Clear saved CTC from localStorage after successful submission
				localStorage.removeItem('draft_ctc');
				alert(isEditMode ? 'Job updated successfully!' : 'Job posted successfully!');
				window.location.href = '/employer/manage-jobs';
			} else {
				const error = await response.json();
				alert(error.message || `Failed to ${isEditMode ? 'update' : 'post'} job`);
			}
		} catch (error) {
			
			alert('Failed to post job. Please try again.');
		}
	};

	/* Inline style objects */
	const page = {
		padding: "30px 20px",
		maxWidth: 1200,
		margin: "0 auto",
		fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
		background: "#f8f9fa",
		minHeight: "100vh",
	};
	const card = {
		background: "#fff",
		padding: "32px",
		borderRadius: 12,
		boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
		marginBottom: 24,
	};
	const heading = {
		margin: 0,
		marginBottom: 8,
		fontSize: 24,
		color: "#1d1d1d",
		fontWeight: 600,
	};
	const sub = { 
		color: "#6b7280", 
		marginBottom: 24, 
		fontSize: 14,
		lineHeight: 1.5,
	};

	const grid = {
		display: "grid",
		gridTemplateColumns: "1fr 1fr",
		gap: 24,
		alignItems: "start",
	};
	const fullRow = { gridColumn: "1 / -1" };
	const label = {
		display: "block",
		fontSize: 14,
		color: "#374151",
		marginBottom: 8,
		fontWeight: 500,
	};
	const input = {
		width: "100%",
		padding: "12px 14px",
		borderRadius: 8,
		border: "1px solid #d1d5db",
		background: "#fff",
		outline: "none",
		fontSize: 14,
		boxSizing: "border-box",
		transition: "all 0.2s ease",
	};
	const inputFocus = {
		borderColor: "#ff6b35",
		boxShadow: "0 0 0 3px rgba(255,107,53,0.1)",
	};
	const smallInput = { ...input, width: 180 };
	const plusBtn = {
		marginLeft: 10,
		width: 42,
		height: 42,
		borderRadius: 8,
		border: "none",
		background: "#ff6b35",
		color: "#fff",
		cursor: "pointer",
		fontSize: 20,
		lineHeight: 1,
		transition: "all 0.2s ease",
		fontWeight: 600,
	};
	const chip = {
		padding: "8px 14px",
		background: "#e7f3ff",
		borderRadius: 20,
		display: "inline-flex",
		gap: 8,
		alignItems: "center",
		fontSize: 13,
		fontWeight: 500,
		color: "#0066cc",
		border: "1px solid #b3d9ff",
	};
	const chipX = {
		marginLeft: 6,
		cursor: "pointer",
		color: "#ef4444",
		fontWeight: 700,
		fontSize: 16,
	};
	const sectionHeader = {
		margin: "32px 0 20px 0",
		fontSize: 18,
		color: "#1d1d1d",
		fontWeight: 600,
		paddingBottom: 12,
		borderBottom: "2px solid #f3f4f6",
		display: "flex",
		alignItems: "center",
		gap: 10,
	};

	return (
		<div style={page}>
			{/* Header */}
			<div style={{marginBottom: 24}}>
				<h1 style={heading}>
					{isEditMode ? (
						<><i className="fa fa-edit" style={{color: '#ff6b35', marginRight: 12}}></i>Edit Job Posting</>
					) : (
						<><i className="fa fa-plus-circle" style={{color: '#ff6b35', marginRight: 12}}></i>Post a New Job</>
					)}
				</h1>
				<p style={sub}>
					{isEditMode 
						? 'Update your job posting details below. All fields marked with * are required.'
						: 'Fill in the details below to create a new job posting. All fields marked with * are required.'}
				</p>
			</div>

			{/* Card */}
			<div style={card}>
				<div style={grid}>
					{/* Consultant Fields */}
					{employerType === 'consultant' && (
						<>
							<div style={fullRow}>
								<div style={{
									background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
									padding: '16px 20px',
									borderRadius: 10,
									color: '#fff',
									marginBottom: 8,
								}}>
									<h4 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
										<i className="fa fa-briefcase"></i>
										Company Information (Consultant Mode)
									</h4>
									<p style={{margin: '6px 0 0 0', fontSize: 13, opacity: 0.9}}>
										As a consultant, please provide details about the hiring company
									</p>
								</div>
							</div>
							<div>
								<label style={label}>
									<i className="fa fa-image" style={{marginRight: '8px', color: '#ff6b35'}}></i>
									Company Logo
								</label>
								<input
									style={{...input, padding: '10px'}}
									type="file"
									accept="image/*"
									onChange={handleLogoUpload}
								/>
								{formData.companyLogo && (
									<div style={{marginTop: 12}}>
										<img 
											src={formData.companyLogo} 
											alt="Company Logo" 
											style={{
												width: '80px', 
												height: '80px', 
												borderRadius: 8,
												objectFit: 'cover',
												border: '2px solid #e5e7eb',
												boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
											}} 
										/>
									</div>
								)}
							</div>
							<div>
								<label style={{...label, color: '#dc2626'}}>
									<i className="fa fa-building" style={{marginRight: '8px'}}></i>
									Company Name *
									<span style={{fontSize: 11, color: '#dc2626', marginLeft: 6}}>(Required)</span>
								</label>
								<input
									style={{
										...input, 
										borderColor: formData.companyName ? '#10b981' : '#dc2626',
										borderWidth: 2,
									}}
									placeholder="e.g., Tech Solutions Inc."
									value={formData.companyName}
									onChange={(e) => update({ companyName: e.target.value })}
									required
								/>
								{!formData.companyName && (
									<p style={{color: '#dc2626', fontSize: 12, margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: 4}}>
										<i className="fa fa-exclamation-circle"></i>
										Please enter company name
									</p>
								)}
							</div>
							<div style={fullRow}>
								<label style={{...label, color: '#dc2626'}}>
									<i className="fa fa-info-circle" style={{marginRight: '8px'}}></i>
									Company Description *
									<span style={{fontSize: 11, color: '#dc2626', marginLeft: 6}}>(Required)</span>
								</label>
								<textarea
									style={{
										...input, 
										minHeight: '100px',
										borderColor: formData.companyDescription ? '#10b981' : '#dc2626',
										borderWidth: 2,
									}}
									placeholder="Brief description about the company, its culture, and what makes it unique..."
									value={formData.companyDescription}
									onChange={(e) => update({ companyDescription: e.target.value })}
									required
								/>
								{!formData.companyDescription && (
									<p style={{color: '#dc2626', fontSize: 12, margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: 4}}>
										<i className="fa fa-exclamation-circle"></i>
										Please enter company description
									</p>
								)}
							</div>
						</>
					)}

					{/* Basic Job Information Section */}
					<div style={fullRow}>
						<h3 style={sectionHeader}>
							<i className="fa fa-info-circle" style={{color: '#ff6b35'}}></i>
							Basic Job Information
						</h3>
					</div>

					{/* Row 1 */}
					<div>
						<label style={label}>
							<i className="fa fa-briefcase" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Job Title / Designation *
						</label>
						<input
							style={input}
							placeholder="e.g., Senior Software Engineer"
							value={formData.jobTitle}
							onChange={(e) => update({ jobTitle: e.target.value })}
						/>
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-tags" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Job Category *
						</label>
						<select
							style={{ ...input, cursor: 'pointer' }}
							value={formData.category}
							onChange={(e) => update({ category: e.target.value })}
						>
							<option value="" disabled>Select Category</option>
							<option value="IT">IT</option>
							<option value="Sales">Sales</option>
							<option value="Marketing">Marketing</option>
							<option value="Sales & Marketing">Sales & Marketing</option>
							<option value="Finance">Finance</option>
							<option value="HR">HR</option>
							<option value="Operations">Operations</option>
							<option value="Design">Design</option>
							<option value="Content">Content</option>
							<option value="Healthcare">Healthcare</option>
							<option value="Education">Education</option>
							<option value="Other">Other</option>
						</select>
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-clock" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Job Type *
						</label>
						<select
							style={{ ...input, cursor: 'pointer' }}
							value={formData.jobType}
							onChange={(e) => update({ jobType: e.target.value })}
						>
							<option value="" disabled>Select Job Type</option>
							<option>Full-Time</option>
							<option>Internship (Paid)</option>
							<option>Internship (Unpaid)</option>
							<option>Work From Home</option>
							<option>Contract</option>
						</select>
					</div>

					{/* Row 2 */}
					<div>
						<label style={label}>
							<i className="fa fa-map-marker-alt" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Job Location *
						</label>
						<input
							style={input}
							placeholder="e.g., Bangalore, Mumbai, Remote"
							value={formData.jobLocation}
							onChange={(e) => update({ jobLocation: e.target.value })}
						/>
					</div>

					{/* Compensation Section */}
					<div style={fullRow}>
						<h3 style={sectionHeader}>
							<i className="fa fa-money-bill-wave" style={{color: '#ff6b35'}}></i>
							Compensation & Openings
						</h3>
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-rupee-sign" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							CTC (Annual)
							<span style={{
								fontSize: 11, 
								color: '#10b981', 
								fontWeight: 500,
								marginLeft: 8,
								background: '#d1fae5',
								padding: '2px 8px',
								borderRadius: 4,
							}}>
								✓ Auto-saved
							</span>
						</label>
						<input
							style={input}
							placeholder="e.g., 8 L.P.A or 6-8 L.P.A"
							value={formData.ctc}
							onChange={(e) => update({ ctc: e.target.value })}
						/>
						<small style={{color: '#6b7280', fontSize: 12, marginTop: 4, display: 'block'}}>
							Enter annual CTC in lakhs (e.g., 8 or 6-8)
						</small>
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-money-bill-wave" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Net Salary (Monthly)
						</label>
						<input
							style={input}
							placeholder="e.g., 50000 or 40000-50000"
							value={formData.netSalary}
							onChange={(e) => update({ netSalary: e.target.value })}
						/>
						<small style={{color: '#6b7280', fontSize: 12, marginTop: 4, display: 'block'}}>
							Enter monthly take-home salary in rupees
						</small>
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-users" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Number of Vacancies *
						</label>
						<input
							style={input}
							type="number"
							min="1"
							placeholder="e.g., 5"
							value={formData.vacancies}
							onChange={(e) => update({ vacancies: e.target.value })}
						/>
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-file-alt" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Application Limit *
						</label>
						<input
							style={input}
							type="number"
							min="1"
							placeholder="e.g., 100"
							value={formData.applicationLimit}
							onChange={(e) => update({ applicationLimit: e.target.value })}
						/>
						<small style={{color: '#6b7280', fontSize: 12, marginTop: 4, display: 'block'}}>
							Maximum number of applications to accept
						</small>
					</div>

					{/* Requirements Section */}
					<div style={fullRow}>
						<h3 style={sectionHeader}>
							<i className="fa fa-clipboard-check" style={{color: '#ff6b35'}}></i>
							Requirements & Qualifications
						</h3>
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-graduation-cap" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Required Educational Background *
						</label>
						<select
							style={{ ...input, cursor: 'pointer' }}
							value={formData.education}
							onChange={(e) => update({ education: e.target.value })}
						>
							<option value="" disabled>Select Education Level</option>
							<option value="Any">Any</option>
							<option value="B.Tech">B.Tech</option>
							<option value="M.Tech">M.Tech</option>
							<option value="B.Sc">B.Sc</option>
							<option value="M.Sc">M.Sc</option>
							<option value="MBA">MBA</option>
							<option value="BBA">BBA</option>
							<option value="B.Com">B.Com</option>
							<option value="M.Com">M.Com</option>
						</select>
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-question-circle" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Are Backlogs Allowed?
						</label>
						<select
							style={{ ...input, cursor: 'pointer' }}
							value={formData.backlogsAllowed ? "Yes" : "No"}
							onChange={(e) =>
								update({ backlogsAllowed: e.target.value === "Yes" })
							}
						>
							<option value="No">No</option>
							<option value="Yes">Yes</option>
						</select>
					</div>

					{/* Skills (full width) */}
					<div style={fullRow}>
						<label style={label}>
							<i className="fa fa-cogs" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Required Skills
							<span style={{fontSize: 12, color: '#6b7280', fontWeight: 'normal', marginLeft: 8}}>
								({formData.requiredSkills.length} skills added)
							</span>
						</label>
						<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
							<input
								style={{ ...input, marginBottom: 0, flex: 1 }}
								placeholder="Type a skill and press Enter or click + (e.g., React, Java, Python)"
								value={formData.skillInput}
								onChange={(e) => update({ skillInput: e.target.value })}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addSkill();
									}
								}}
							/>
							<button
								type="button"
								onClick={addSkill}
								style={plusBtn}
								aria-label="Add skill"
								title="Add skill"
								onMouseEnter={(e) => e.currentTarget.style.background = '#e55a2b'}
								onMouseLeave={(e) => e.currentTarget.style.background = '#ff6b35'}
							>
								+
							</button>
						</div>

						{/* chips */}
						{formData.requiredSkills.length > 0 && (
							<div
								style={{
									marginTop: 14,
									display: "flex",
									gap: 10,
									flexWrap: "wrap",
									padding: 12,
									background: '#f9fafb',
									borderRadius: 8,
									border: '1px solid #e5e7eb',
								}}
							>
								{formData.requiredSkills.map((s, i) => (
									<div key={i} style={chip}>
										<span>{s}</span>
										<span 
											style={chipX} 
											onClick={() => removeSkill(s)}
											title="Remove skill"
										>
											×
										</span>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Experience & Rounds */}
					<div style={{
						padding: 20,
						background: '#fff',
						border: '2px solid #e5e7eb',
						borderRadius: 12,
						boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
					}}>
						<label style={{
							...label,
							fontSize: 16,
							fontWeight: 600,
							marginBottom: 16,
							color: '#1f2937'
						}}>
							<i className="fa fa-chart-line" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Experience Level
						</label>
						<div style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(3, 1fr)',
							gap: 12,
							marginBottom: 16
						}}>
							<label style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								padding: 12,
								border: formData.experienceLevel === "freshers" ? '2px solid #ff6b35' : '2px solid #e5e7eb',
								borderRadius: 8,
								background: formData.experienceLevel === "freshers" ? '#fff5f2' : '#f9fafb',
								cursor: 'pointer',
								transition: 'all 0.2s ease',
								fontWeight: 500
							}}>
								<input
									type="radio"
									name="experience"
									checked={formData.experienceLevel === "freshers"}
									onChange={() => update({ experienceLevel: "freshers", minExperience: "" })}
									style={{cursor: 'pointer'}}
								/>
								Fresher
							</label>

							<label style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								padding: 12,
								border: formData.experienceLevel === "minimum" ? '2px solid #ff6b35' : '2px solid #e5e7eb',
								borderRadius: 8,
								background: formData.experienceLevel === "minimum" ? '#fff5f2' : '#f9fafb',
								cursor: 'pointer',
								transition: 'all 0.2s ease',
								fontWeight: 500
							}}>
								<input
									type="radio"
									name="experience"
									checked={formData.experienceLevel === "minimum"}
									onChange={() => update({ experienceLevel: "minimum" })}
									style={{cursor: 'pointer'}}
								/>
								Experienced
							</label>

							<label style={{
								display: 'flex',
								alignItems: 'center',
								gap: 8,
								padding: 12,
								border: formData.experienceLevel === "both" ? '2px solid #ff6b35' : '2px solid #e5e7eb',
								borderRadius: 8,
								background: formData.experienceLevel === "both" ? '#fff5f2' : '#f9fafb',
								cursor: 'pointer',
								transition: 'all 0.2s ease',
								fontWeight: 500
							}}>
								<input
									type="radio"
									name="both"
									checked={formData.experienceLevel === "both"}
									onChange={() => update({ experienceLevel: "both", minExperience: "" })}
									style={{cursor: 'pointer'}}
								/>
								Both
							</label>
						</div>

						{formData.experienceLevel === "minimum" && (
							<div style={{
								padding: 16,
								background: '#f0f9ff',
								border: '1px solid #0ea5e9',
								borderRadius: 8,
								display: 'flex',
								alignItems: 'center',
								gap: 12
							}}>
								<span style={{
									fontSize: 18,
									color: '#0f172a',
									fontWeight: 600
								}}>Min. Years:</span>
								<input
									style={{
										...input,
										width: 120,
										marginBottom: 0,
										border: '2px solid #0ea5e9',
										fontWeight: 600,
										fontSize: 16
									}}
									type="number"
									min="0"
									placeholder="Years"
									value={formData.minExperience}
									onChange={(e) => update({ minExperience: e.target.value })}
								/>
							</div>
						)}
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-comments" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Number of Interview Rounds *
						</label>
						<input
							style={input}
							type="number"
							min="1"
							placeholder="e.g., 3"
							value={formData.interviewRoundsCount}
							onChange={(e) => update({ interviewRoundsCount: e.target.value })}
						/>
					</div>

					{/* Interview Process Section */}
					<div style={fullRow}>
						<h3 style={sectionHeader}>
							<i className="fa fa-clipboard-list" style={{color: '#ff6b35'}}></i>
							Interview Process
						</h3>
					</div>

					{/* Interview Round Types - full row */}
					<div style={fullRow}>
						<label style={label}>
							<i className="fa fa-list-check" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Interview Round Types
							<span style={{
								fontSize: 12, 
								color: '#10b981', 
								fontWeight: 500,
								marginLeft: 8,
								background: '#d1fae5',
								padding: '2px 8px',
								borderRadius: 4,
							}}>
								{Object.values(formData.interviewRoundTypes).filter(Boolean).length} selected
							</span>
						</label>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(2, 1fr)",
								gap: 12,
								padding: 16,
								background: '#f9fafb',
								borderRadius: 8,
								border: '1px solid #e5e7eb',
							}}
						>
							<label style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: 10,
								cursor: 'pointer',
								padding: 8,
								borderRadius: 6,
								transition: 'background 0.2s',
							}}
							onMouseEnter={(e) => e.currentTarget.style.background = '#fff'}
							onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
							>
								<span style={{
									fontSize: 12, 
									color: '#fff', 
									minWidth: '20px',
									height: '20px',
									background: formData.interviewRoundTypes.technical ? '#10b981' : '#d1d5db',
									borderRadius: '50%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontWeight: 600,
								}}>
									{formData.interviewRoundTypes.technical ? (formData.interviewRoundOrder || []).indexOf('technical') + 1 : ''}
								</span>
								<input
									type="checkbox"
									checked={formData.interviewRoundTypes.technical}
									onChange={() =>
										toggleNested("interviewRoundTypes", "technical")
									}
									style={{cursor: 'pointer'}}
								/>
								<span style={{fontSize: 14, fontWeight: 500}}>Technical</span>
							</label>

							<label style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: 10,
								cursor: 'pointer',
								padding: 8,
								borderRadius: 6,
								transition: 'background 0.2s',
							}}
							onMouseEnter={(e) => e.currentTarget.style.background = '#fff'}
							onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
							>
								<span style={{
									fontSize: 12, 
									color: '#fff', 
									minWidth: '20px',
									height: '20px',
									background: formData.interviewRoundTypes.nonTechnical ? '#10b981' : '#d1d5db',
									borderRadius: '50%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontWeight: 600,
								}}>
									{formData.interviewRoundTypes.nonTechnical ? (formData.interviewRoundOrder || []).indexOf('nonTechnical') + 1 : ''}
								</span>
								<input
									type="checkbox"
									checked={formData.interviewRoundTypes.nonTechnical}
									onChange={() =>
										toggleNested("interviewRoundTypes", "nonTechnical")
									}
									style={{cursor: 'pointer'}}
								/>
								<span style={{fontSize: 14, fontWeight: 500}}>Non-Technical</span>
							</label>

							<label style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: 10,
								cursor: 'pointer',
								padding: 8,
								borderRadius: 6,
								transition: 'background 0.2s',
							}}
							onMouseEnter={(e) => e.currentTarget.style.background = '#fff'}
							onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
							>
								<span style={{
									fontSize: 12, 
									color: '#fff', 
									minWidth: '20px',
									height: '20px',
									background: formData.interviewRoundTypes.managerial ? '#10b981' : '#d1d5db',
									borderRadius: '50%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontWeight: 600,
								}}>
									{formData.interviewRoundTypes.managerial ? (formData.interviewRoundOrder || []).indexOf('managerial') + 1 : ''}
								</span>
								<input
									type="checkbox"
									checked={formData.interviewRoundTypes.managerial}
									onChange={() =>
										toggleNested("interviewRoundTypes", "managerial")
									}
									style={{cursor: 'pointer'}}
								/>
								<span style={{fontSize: 14, fontWeight: 500}}>Managerial Round</span>
							</label>

							<label style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: 10,
								cursor: 'pointer',
								padding: 8,
								borderRadius: 6,
								transition: 'background 0.2s',
							}}
							onMouseEnter={(e) => e.currentTarget.style.background = '#fff'}
							onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
							>
								<span style={{
									fontSize: 12, 
									color: '#fff', 
									minWidth: '20px',
									height: '20px',
									background: formData.interviewRoundTypes.final ? '#10b981' : '#d1d5db',
									borderRadius: '50%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontWeight: 600,
								}}>
									{formData.interviewRoundTypes.final ? (formData.interviewRoundOrder || []).indexOf('final') + 1 : ''}
								</span>
								<input
									type="checkbox"
									checked={formData.interviewRoundTypes.final}
									onChange={() => toggleNested("interviewRoundTypes", "final")}
									style={{cursor: 'pointer'}}
								/>
								<span style={{fontSize: 14, fontWeight: 500}}>Final Round</span>
							</label>

							<label style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: 10,
								cursor: 'pointer',
								padding: 8,
								borderRadius: 6,
								transition: 'background 0.2s',
							}}
							onMouseEnter={(e) => e.currentTarget.style.background = '#fff'}
							onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
							>
								<span style={{
									fontSize: 12, 
									color: '#fff', 
									minWidth: '20px',
									height: '20px',
									background: formData.interviewRoundTypes.hr ? '#10b981' : '#d1d5db',
									borderRadius: '50%',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontWeight: 600,
								}}>
									{formData.interviewRoundTypes.hr ? (formData.interviewRoundOrder || []).indexOf('hr') + 1 : ''}
								</span>
								<input
									type="checkbox"
									checked={formData.interviewRoundTypes.hr}
									onChange={() => toggleNested("interviewRoundTypes", "hr")}
									style={{cursor: 'pointer'}}
								/>
								<span style={{fontSize: 14, fontWeight: 500}}>HR Round</span>
							</label>
						</div>
					</div>

					{/* Interview Round Details */}
					{Object.entries(formData.interviewRoundTypes).some(([key, value]) => value) && (
						<div style={fullRow}>
							<h4 style={{ margin: "16px 0 12px 0", fontSize: 15, color: "#0f172a" }}>
								Interview Round Details
							</h4>
							{Object.entries(formData.interviewRoundTypes)
								.filter(([key, value]) => value)
								.map(([roundType]) => {
									const roundNames = {
										technical: 'Technical Round',
										nonTechnical: 'Non-Technical Round',
										managerial: 'Managerial Round',
										final: 'Final Round',
										hr: 'HR Round'
									};
									return (
										<div key={roundType} style={{ 
											marginBottom: 16, 
											padding: 12, 
											border: '1px solid #e5e7eb', 
											borderRadius: 8,
											background: '#f9fafb'
										}}>
											<h5 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#374151' }}>
												{roundNames[roundType]}
											</h5>
											<div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px', gap: 12, alignItems: 'end' }}>
												<div>
													<label style={{...label, marginBottom: 4}}>Description</label>
													<textarea
														style={{...input, minHeight: '60px', fontSize: 13}}
														placeholder={`Describe the ${roundNames[roundType].toLowerCase()}...`}
														value={formData.interviewRoundDetails[roundType].description}
														onChange={(e) => updateRoundDetails(roundType, 'description', e.target.value)}
													/>
												</div>
												<div>
													<label style={{...label, marginBottom: 4}}>From Date</label>
													<input
														style={{...input, fontSize: 13}}
														type="date"
														min={new Date().toISOString().split('T')[0]}
														value={formData.interviewRoundDetails[roundType].fromDate}
														onChange={(e) => updateRoundDetails(roundType, 'fromDate', e.target.value)}
													/>
												</div>
												<div>
													<label style={{...label, marginBottom: 4}}>To Date</label>
													<input
														style={{...input, fontSize: 13}}
														type="date"
														min={new Date().toISOString().split('T')[0]}
														value={formData.interviewRoundDetails[roundType].toDate}
														onChange={(e) => updateRoundDetails(roundType, 'toDate', e.target.value)}
													/>
												</div>
												<div>
													<label style={{...label, marginBottom: 4}}>Time</label>
													<input
														style={{...input, fontSize: 13}}
														type="time"
														value={formData.interviewRoundDetails[roundType].time}
														onChange={(e) => updateRoundDetails(roundType, 'time', e.target.value)}
													/>
												</div>
											</div>
										</div>
									);
								})
							}
						</div>
					)}

					{/* Additional Details Section */}
					<div style={fullRow}>
						<h3 style={sectionHeader}>
							<i className="fa fa-file-alt" style={{color: '#ff6b35'}}></i>
							Additional Details
						</h3>
					</div>

					{/* Dates */}
					<div>
						<label style={label}>
							<i className="fa fa-calendar-alt" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Offer Letter Release Date *
						</label>
						<input
							style={input}
							type="date"
							min={new Date().toISOString().split('T')[0]}
							value={formData.offerLetterDate}
							onChange={(e) => update({ offerLetterDate: e.target.value })}
						/>
					</div>

					<div>
						<label style={label}>
							<i className="fa fa-calendar-times" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Last Date of Application *
						</label>
						<input
							style={input}
							type="date"
							min={new Date().toISOString().split('T')[0]}
							value={formData.lastDateOfApplication}
							onChange={(e) => update({ lastDateOfApplication: e.target.value })}
						/>
					</div>

					{/* Transportation */}
					<div>
						<label style={label}>
							<i className="fa fa-car" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Transportation Options
						</label>
						<div style={{
							display: "flex",
							flexDirection: "column",
							gap: 10,
							padding: 12,
							background: '#f9fafb',
							borderRadius: 8,
							border: '1px solid #e5e7eb',
						}}>
							<label style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: 8,
								cursor: 'pointer',
								fontSize: 14,
							}}>
								<input
									type="checkbox"
									checked={formData.transportation.oneWay}
									onChange={() => toggleNested("transportation", "oneWay")}
									style={{cursor: 'pointer'}}
								/>
								One-way Cab
							</label>

							<label style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: 8,
								cursor: 'pointer',
								fontSize: 14,
							}}>
								<input
									type="checkbox"
									checked={formData.transportation.twoWay}
									onChange={() => toggleNested("transportation", "twoWay")}
									style={{cursor: 'pointer'}}
								/>
								Two-way Cab
							</label>

							<label style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: 8,
								cursor: 'pointer',
								fontSize: 14,
							}}>
								<input
									type="checkbox"
									checked={formData.transportation.noCab}
									onChange={() => toggleNested("transportation", "noCab")}
									style={{cursor: 'pointer'}}
								/>
								No Cab Facility
							</label>
						</div>
					</div>
					
					{/* Job Description */}
					<div style={fullRow}>
						<label style={label}>
							<i className="fa fa-align-left" style={{marginRight: '8px', color: '#ff6b35'}}></i>
							Job Description *
						</label>
						<textarea 
							style={{
								...input, 
								minHeight: '140px',
								lineHeight: 1.6,
								fontFamily: 'inherit',
							}} 
							value={formData.jobDescription}
							onChange={(e) => update({ jobDescription: e.target.value })}
							placeholder="Provide a detailed description of the job role, responsibilities, and expectations..."
						/>
						<small style={{color: '#6b7280', fontSize: 12, marginTop: 6, display: 'block'}}>
							Include key responsibilities, day-to-day tasks, and what makes this role unique
						</small>
					</div>
				</div>

				{/* Action Buttons */}
				<div style={{ 
					display: "flex", 
					justifyContent: "space-between", 
					marginTop: 32,
					paddingTop: 24,
					borderTop: '2px solid #f3f4f6',
					gap: 16,
				}}>
					<NavLink to={empRoute(employer.MANAGE_JOBS)} style={{textDecoration: 'none'}}>
						<button
							style={{
								background: "#fff",
								color: "#374151",
								border: "2px solid #d1d5db",
								padding: "12px 28px",
								borderRadius: 8,
								cursor: "pointer",
								fontSize: 15,
								fontWeight: 600,
								transition: "all 0.2s ease",
								display: 'flex',
								alignItems: 'center',
								gap: 8,
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.background = '#f9fafb';
								e.currentTarget.style.borderColor = '#9ca3af';
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.background = '#fff';
								e.currentTarget.style.borderColor = '#d1d5db';
							}}
						>
							<i className="fa fa-arrow-left"></i>
							Back to Jobs
						</button>
					</NavLink>
					
					<button
						onClick={submitNext}
						style={{
							background: "linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%)",
							color: "#fff",
							border: "none",
							padding: "12px 32px",
							borderRadius: 8,
							cursor: "pointer",
							fontSize: 15,
							fontWeight: 600,
							transition: "all 0.2s ease",
							boxShadow: "0 4px 12px rgba(255,107,53,0.3)",
							display: 'flex',
							alignItems: 'center',
							gap: 8,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.transform = 'translateY(-2px)';
							e.currentTarget.style.boxShadow = '0 6px 16px rgba(255,107,53,0.4)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.transform = 'translateY(0)';
							e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,107,53,0.3)';
						}}
					>
						{isEditMode ? (
							<>
								<i className="fa fa-save"></i>
								Update Job
							</>
						) : (
							<>
								<i className="fa fa-paper-plane"></i>
								Submit Job
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

