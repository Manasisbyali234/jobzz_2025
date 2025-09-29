
import { Building2, Calendar, Edit, Eye, MapPin, Pause, Play, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { loadScript } from "../../../../../globals/constants";
import { employer, empRoute } from "../../../../../globals/route-names";

export default function EmpPostedJobs() {
	const navigate = useNavigate();
    const [jobs, setJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isApproved, setIsApproved] = useState(false);
    const [employerType, setEmployerType] = useState('company');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [applicationCounts, setApplicationCounts] = useState({});
    
    useEffect(() => {
        loadScript("js/custom.js");
        fetchJobs();
    }, []);

    useEffect(() => {
        // Filter by status first
        let next = jobs;
        if (statusFilter === 'active') {
            next = jobs.filter(job => job.status === 'active');
        } else if (statusFilter === 'inactive') {
            next = jobs.filter(job => job.status !== 'active');
        }
        // Then filter by search text (title or location)
        const query = (searchText || '').trim().toLowerCase();
        if (query) {
            next = next.filter(job => {
                const title = (job.title || '').toLowerCase();
                const location = (job.location || '').toLowerCase();
                return title.includes(query) || location.includes(query);
            });
        }
        setFilteredJobs(next);
    }, [jobs, statusFilter, searchText]);

    const fetchJobs = async () => {
        try {
            const token = localStorage.getItem('employerToken');
            if (!token) return;

            // Fetch employer profile to check approval status
            const profileResponse = await fetch('http://localhost:5000/api/employer/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                const employerData = profileData.profile?.employerId;
                setIsApproved(employerData?.isApproved || false);
                setEmployerType(employerData?.employerType || 'company');
            }

            const response = await fetch('http://localhost:5000/api/employer/jobs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setJobs(data.jobs);
                setFilteredJobs(data.jobs);
                fetchApplicationCounts(data.jobs);
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchApplicationCounts = async (jobsList) => {
        try {
            const token = localStorage.getItem('employerToken');
            const counts = {};
            
            await Promise.all(jobsList.map(async (job) => {
                try {
                    const response = await fetch(`http://localhost:5000/api/employer/jobs/${job._id}/applications`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        counts[job._id] = data.applications.length;
                    }
                } catch (error) {
                    console.error(`Error fetching applications for job ${job._id}:`, error);
                    counts[job._id] = 0;
                }
            }));
            
            setApplicationCounts(counts);
        } catch (error) {
            console.error('Error fetching application counts:', error);
        }
    };

    const handleJobClick = (jobId) => {
        navigate(`/employer/candidates-list/${jobId}`);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        return status === 'active' ? 'twm-bg-green' : 'twm-bg-red';
    };

    // Simple utility for job CTC text
    const formatCtc = (job) => {
     if (!job.ctc || job.ctc.min <= 0) return 'CTC not specified';
     if (job.ctc.min === job.ctc.max) return `₹${(job.ctc.min/100000).toFixed(0)}LPA`;
     return `₹${(job.ctc.min/100000).toFixed(0)} - ${(job.ctc.max/100000).toFixed(0)} LPA`;
    };

    const handleDelete = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return;
        
        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`http://localhost:5000/api/employer/jobs/${jobId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                alert('Job deleted successfully!');
                fetchJobs();
            } else {
                alert('Failed to delete job');
            }
        } catch (error) {
            console.error('Error deleting job:', error);
            alert('Failed to delete job');
        }
    };

    const handleStatusToggle = async (jobId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'closed' : 'active';
        
        try {
            const token = localStorage.getItem('employerToken');
            const response = await fetch(`http://localhost:5000/api/employer/jobs/${jobId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (response.ok) {
                alert(`Job ${newStatus === 'active' ? 'activated' : 'closed'} successfully!`);
                fetchJobs();
            } else {
                alert('Failed to update job status');
            }
        } catch (error) {
            console.error('Error updating job status:', error);
            alert('Failed to update job status');
        }
    };

	return (
		<>
			<div className="wt-admin-right-page-header clearfix">
				<h2>Jobs Posted</h2>
			</div>

			<div className="panel panel-default site-bg-white p-3">
				<div className="panel-heading wt-panel-heading mb-3 d-flex justify-content-between">
                    <div>
                        <h4 className="panel-tittle">
                            <i className="far fa-list-alt" /> Job Details
                        </h4>

                        <p className="text-muted">Review and manage jobs details</p>
                    </div>
					
                    <div className="text-left">
                        {isApproved ? (
                            <NavLink to={empRoute(employer.POST_A_JOB)}>
                                <button type="submit" className="site-button">
                                    Post Job
                                </button>
                            </NavLink>
                        ) : (
                            <div>
                                <button type="button" className="site-button" disabled>
                                    Post Job
                                </button>
                                <p className="text-warning mt-2 mb-0">Account pending admin approval</p>
                            </div>
                        )}
                    </div>
				</div>

				<div className="panel-body wt-panel-body">
					<div className="mb-4 d-flex flex-wrap gap-3 justify-content-between align-items-center">
						<div className="position-relative" style={{maxWidth: '360px', flex: '1 1 300px'}}>
							<i className="fa fa-search position-absolute" style={{left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#ff6b35', fontSize: '16px', zIndex: 10}}></i>
							<input
								type="text"
								className="form-control ps-5"
								placeholder="Search by title or location..."
								value={searchText}
								onChange={(e) => setSearchText(e.target.value)}
								style={{paddingLeft: '40px'}}
							/>
						</div>
						<div className="btn-group" role="group">
							<button 
								type="button" 
								className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
								onClick={() => setStatusFilter('all')}
							>
								All
							</button>
							<button 
								type="button" 
								className={`btn ${statusFilter === 'active' ? 'btn-success' : 'btn-outline-success'}`}
								onClick={() => setStatusFilter('active')}
							>
								Active
							</button>
							<button 
								type="button" 
								className={`btn ${statusFilter === 'inactive' ? 'btn-secondary' : 'btn-outline-secondary'}`}
								onClick={() => setStatusFilter('inactive')}
							>
								Inactive
							</button>
						</div>
					</div>

					{loading ? (
						<div className="text-center py-4">
							<div className="spinner-border" role="status">
								<span className="visually-hidden">Loading...</span>
							</div>
						</div>
					) : (
						<div className="row">
							{filteredJobs.length === 0 ? (
								<div className="col-12 text-center py-4">
									<p className="text-muted">No jobs posted yet.</p>
									{isApproved ? (
										<NavLink to={empRoute(employer.POST_A_JOB)}>
											<button className="site-button">Post Your First Job</button>
										</NavLink>
									) : (
										<div>
											<button className="site-button" disabled>Post Your First Job</button>
											<p className="text-warning mt-2">Your account is pending admin approval before you can post jobs.</p>
										</div>
									)}
								</div>
							) : (
								filteredJobs.map((job) => (
									<div className="col-lg-6 col-12" key={job._id}>
										<div className="manage-jobs-card d-flex justify-content-between align-items-center p-3 border rounded mb-3 shadow-sm" style={{cursor: 'pointer'}} onClick={() => handleJobClick(job._id)}>
											<div className="d-flex align-items-center gap-3">
												<div>
													<h5 className="mb-1">{job.title}</h5>
									{job.companyName && (
										<p className="mb-1 fw-bold text-dark">
											<Building2 size={16} className="me-1" style={{ color: '#fd7e14' }} />
											{job.companyName}
										</p>
									)}
													<p className="mb-2 fw-bold text-dark">
										<MapPin size={16} className="me-1" style={{ color: '#fd7e14' }} /> {job.location}
									</p>
													<div className="d-flex flex-wrap gap-3 text-muted small fw-bold">
														<span className="d-inline-flex align-items-center">Annual CTC:&nbsp;{formatCtc(job)}</span>
														<span className="d-inline-flex align-items-center">Vacancies:&nbsp;{job.vacancies || 0}</span>
														<span className="d-inline-flex align-items-center"><Calendar size={14} className="me-1" /> Posted:&nbsp;{formatDate(job.createdAt)}</span>
														<span className="text-primary fw-bold">Applications:&nbsp;{applicationCounts[job._id] || 0}</span>
													</div>
												</div>
											</div>
											<div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
												<span className={`badge ${getStatusBadge(job.status)} text-capitalize`}>
													{job.status}
												</span>
												<div className="btn-group" role="group">
													<button
														className="btn btn-outline-primary btn-sm"
														onClick={() => navigate(`/employer/emp-job-review/${job._id}`)}
														title="View Details"
													>
														<Eye size={16} />
													</button>
													<button
														className="btn btn-outline-success btn-sm"
														onClick={() => navigate(`/employer/edit-job/${job._id}`)}
														title="Edit Job"
													>
														<Edit size={16} />
													</button>
													<button
														className={`btn btn-outline-${job.status === 'active' ? 'warning' : 'info'} btn-sm`}
														onClick={() => handleStatusToggle(job._id, job.status)}
														title={job.status === 'active' ? 'Close Job' : 'Activate Job'}
													>
														{job.status === 'active' ? <Pause size={16} /> : <Play size={16} /> }
													</button>

												</div>
											</div>
										</div>
									</div>
								))
							)}
						</div>
					)}
				</div>
			</div>
		</>
	);
}

