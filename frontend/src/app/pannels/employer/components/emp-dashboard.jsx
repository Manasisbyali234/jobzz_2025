import {
    MapPin
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CountUp from "react-countup";
import './emp-dashboard.css';


function EmpDashboardPage() {
    const [stats, setStats] = useState({
        totalJobs: 0,
        activeJobs: 0,
        totalApplications: 0,
        shortlisted: 0
    });
    const [employer, setEmployer] = useState({ companyName: 'Company', logo: null });
    const [profileCompletion, setProfileCompletion] = useState({ completion: 75, missingFields: [] });
    const [recentActivity, setRecentActivity] = useState([]);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('employerToken');
            if (!token) {
                console.log('No employer token found');
                return;
            }

            const [statsResponse, profileResponse, completionResponse, activityResponse, notificationResponse] = await Promise.all([
                fetch('http://localhost:5000/api/employer/dashboard/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('http://localhost:5000/api/employer/profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('http://localhost:5000/api/employer/profile/completion', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('http://localhost:5000/api/employer/recent-activity', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('http://localhost:5000/api/notifications/employer', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                if (statsData.success) {
                    setStats({
                        totalJobs: statsData.stats.totalJobs || 0,
                        activeJobs: statsData.stats.activeJobs || 0,
                        totalApplications: statsData.stats.totalApplications || 0,
                        shortlisted: statsData.stats.shortlisted || 0
                    });
                }
            }

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                if (profileData.success) {
                    setEmployer({
                        companyName: profileData.profile?.companyName || 'Company',
                        logo: profileData.profile?.logo || null
                    });
                }
            }

            if (completionResponse.ok) {
                const completionData = await completionResponse.json();
                if (completionData.success) {
                    setProfileCompletion({
                        completion: completionData.completion || 75,
                        missingFields: completionData.missingFields || []
                    });
                }
            }

            if (activityResponse.ok) {
                const activityData = await activityResponse.json();
                if (activityData.success) {
                    setRecentActivity(activityData.activities || []);
                }
            }

            if (notificationResponse.ok) {
                const notificationData = await notificationResponse.json();
                if (notificationData.success) {
                    setNotifications(notificationData.notifications || []);
                }
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    return (
        <>
            <div className="twm-right-section-panel site-bg-gray emp-dashboard">
                {/* Header */}
                <div className="wt-admin-right-page-header clearfix" style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0 0 0.25rem 0' }}>Welcome back, {employer.companyName}</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <MapPin size={16} style={{ color: '#f97316' }} />
                                <span style={{ color: '#f97316', fontSize: '0.875rem', fontWeight: '500' }}>Bangalore</span>
                            </div>
                            <p style={{ color: '#6b7280', margin: 0 }}>Here's an overview of your job postings and applications</p>
                        </div>

                    </div>
                </div>

                {/* Stats Cards */}
                <div style={{ padding: '2rem' }}>
                    <div className="row" style={{ marginBottom: '2rem' }}>
                        <div className="col-xl-4 col-lg-4 col-md-12 mb-3">
                            <div className="panel panel-default">
                                <div className="panel-body wt-panel-body dashboard-card-2" style={{ backgroundColor: '#e0f7fa' }}>
                                    <div className="d-flex align-items-center" style={{ display: "flex", justifyContent: "flex-end" }}>
                                        <div className="wt-card-icon-2 me-3 fs-2 text-info" style={{ lineHeight: "1" }}>
                                            <i className="flaticon-resume" />
                                        </div>
                                        <div>
                                            <div className="counter fw-bold fs-4 text-info">
                                                <CountUp end={stats.activeJobs} duration={2} />
                                            </div>
                                            <h5 className="mb-0 mt-1">Active Jobs</h5>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-xl-4 col-lg-4 col-md-12 mb-3">
                            <div className="panel panel-default">
                                <div className="panel-body wt-panel-body dashboard-card-2" style={{ backgroundColor: '#fff3e0' }}>
                                    <div className="d-flex align-items-center" style={{ display: "flex", justifyContent: "flex-end" }}>
                                        <div className="wt-card-icon-2 me-3 fs-2 text-warning" style={{ lineHeight: "1" }}>
                                            <i className="flaticon-envelope" />
                                        </div>
                                        <div>
                                            <div className="counter fw-bold fs-4 text-warning">
                                                <CountUp end={stats.totalApplications} duration={2} />
                                            </div>
                                            <h5 className="mb-0 mt-1">Applications</h5>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-xl-4 col-lg-4 col-md-12 mb-3">
                            <div className="panel panel-default">
                                <div className="panel-body wt-panel-body dashboard-card-2" style={{ backgroundColor: '#e8f5e9' }}>
                                    <div className="d-flex align-items-center" style={{ display: "flex", justifyContent: "flex-end" }}>
                                        <div className="wt-card-icon-2 me-3 fs-2 text-success" style={{ lineHeight: "1" }}>
                                            <i className="flaticon-bell" />
                                        </div>
                                        <div>
                                            <div className="counter fw-bold fs-4 text-success">
                                                <CountUp end={stats.shortlisted} duration={2} />
                                            </div>
                                            <h5 className="mb-0 mt-1">Shortlisted</h5>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Completion and Recent Activity */}
                    <div className="row">
                        {/* Profile Completion Section */}
                        <div className="col-xl-8 col-lg-8 col-md-12 mb-4">
                            <div style={{
                                background: 'white',
                                borderRadius: '0.75rem',
                                border: '1px solid #e5e7eb',
                                padding: '2rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>Complete Your Company Profile</h2>
                                        <p style={{ color: '#6b7280', margin: 0 }}>A complete profile attracts more qualified candidates</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                    {/* Circular Progress */}
                                    <div style={{ position: 'relative', width: '8rem', height: '8rem' }}>
                                        <svg style={{ width: '8rem', height: '8rem', transform: 'rotate(-90deg)' }} viewBox="0 0 120 120">
                                            <circle
                                                cx="60"
                                                cy="60"
                                                r="50"
                                                stroke="#f3f4f6"
                                                strokeWidth="8"
                                                fill="none"
                                            />
                                            <circle
                                                cx="60"
                                                cy="60"
                                                r="50"
                                                stroke="#f97316"
                                                strokeWidth="8"
                                                fill="none"
                                                strokeDasharray={`${profileCompletion.completion * 3.14159} ${100 * 3.14159}`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div style={{
                                            position: 'absolute',
                                            inset: '0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>{profileCompletion.completion}%</p>
                                                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Complete</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex: '1' }}>
                                        <p style={{ color: '#374151', marginBottom: '1.5rem' }}>
                                            You are <span style={{ fontWeight: '600' }}>{profileCompletion.completion}% done</span>. Complete the remaining fields to improve your company visibility.
                                        </p>
                                        
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <button 
                                                onClick={() => window.location.href = '/employer/profile'}
                                                style={{
                                                    background: '#f97316',
                                                    color: 'white',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.5rem',
                                                    border: 'none',
                                                    fontWeight: '500',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Complete Profile
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const token = localStorage.getItem('employerToken');
                                                    if (token) {
                                                        const payload = JSON.parse(atob(token.split('.')[1]));
                                                        window.open(`/emp-detail/${payload.id}`, '_blank');
                                                    }
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    color: '#6b7280',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid #d1d5db',
                                                    fontWeight: '500',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                View Profile
                                            </button>
                                        </div>

                                        {profileCompletion.missingFields.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '0.5rem' }}>
                                                <span style={{ color: '#f59e0b', fontSize: '1rem' }}>⚠️</span>
                                                <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>Missing: {profileCompletion.missingFields.join(', ')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Section */}
                        <div className="col-xl-4 col-lg-4 col-md-12 mb-4">
                            <div style={{
                                background: 'white',
                                borderRadius: '0.75rem',
                                border: '1px solid #e5e7eb',
                                padding: '1.5rem'
                            }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>Notifications</h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {notifications.length > 0 ? notifications.slice(0, 5).map((notification, index) => (
                                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: notification.isRead ? '#f9fafb' : '#fef3c7', borderRadius: '0.5rem' }}>
                                            <div style={{ width: '2rem', height: '2rem', background: notification.type === 'profile_approved' ? '#dcfce7' : '#fecaca', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontSize: '1rem' }}>{notification.type === 'profile_approved' ? '✅' : '❌'}</span>
                                            </div>
                                            <div style={{ flex: '1' }}>
                                                <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>{notification.title}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{notification.message}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>{new Date(notification.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                            <p>No notifications</p>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={() => window.location.href = '/employer/manage-jobs'}
                                    style={{
                                        width: '100%',
                                        marginTop: '1rem',
                                        padding: '0.5rem',
                                        background: 'transparent',
                                        color: '#f97316',
                                        border: '1px solid #f97316',
                                        borderRadius: '0.5rem',
                                        fontWeight: '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    View All Activity
                                </button>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </>
    )
}

export default EmpDashboardPage;