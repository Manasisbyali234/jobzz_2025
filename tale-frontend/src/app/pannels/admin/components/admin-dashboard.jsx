import { useEffect, useState } from "react";
import JobZImage from "../../../common/jobz-img";
import CountUp from "react-countup";
import AdminDashboardActivityChart from "../common/admin-graph";
import "./admin-dashboard-styles.css";

function AdminDashboardPage() {
    const [stats, setStats] = useState({
        totalCandidates: 0,
        totalEmployers: 0,
        activeJobs: 0,
        totalApplications: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await fetch('http://localhost:5000/api/admin/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching admin stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="admin-dashboard-container">
                <div className="admin-dashboard-header" data-aos="fade-up">
                    <h2>
                        <i className="fa fa-tachometer-alt me-3" style={{color: '#ff6b35'}}></i>
                        Admin Dashboard
                    </h2>
                    <p className="dashboard-subtitle mb-0">
                        <i className="fa fa-chart-line me-2" style={{color: '#ff6b35'}}></i>
                        Monitor and manage your platform's performance
                    </p>
                </div>

                <div className="twm-dash-b-blocks mb-5" data-aos="fade-up" data-aos-delay="100">
                <div className="row">
                    <div className="col-xl-3 col-lg-6 col-md-12 mb-4">
                        <div className="panel panel-default dashboard-stats-card">
                            <div className="panel-body wt-panel-body gradi-1">
                                <div className="wt-card-wrap">
                                    <div className="wt-card-icon">
                                        <i className="fa fa-users" style={{color: '#ff6b35'}} />
                                    </div>

                                    <div className="wt-card-right wt-total-active-listing counter">
                                        {loading ? <div className="loading-spinner"></div> : <CountUp end={stats.totalCandidates} duration={2} />}
                                    </div>

                                    <div className="wt-card-bottom">
                                        <h4 className="m-b0">Total Candidates</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-3 col-lg-6 col-md-12 mb-4">
                        <div className="panel panel-default dashboard-stats-card">
                            <div className="panel-body wt-panel-body gradi-2">
                                <div className="wt-card-wrap">
                                    <div className="wt-card-icon">
                                        <i className="fa fa-building" style={{color: '#ff6b35'}} />
                                    </div>

                                    <div className="wt-card-right wt-total-listing-view counter">
                                        {loading ? <div className="loading-spinner"></div> : <CountUp end={stats.totalEmployers} duration={2} />}
                                    </div>

                                    <div className="wt-card-bottom">
                                        <h4 className="m-b0">Total Employers</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xl-3 col-lg-6 col-md-12 mb-4">
                        <div className="panel panel-default dashboard-stats-card">
                            <div className="panel-body wt-panel-body gradi-3">
                                <div className="wt-card-wrap">
                                    <div className="wt-card-icon">
                                        <i className="fa fa-briefcase" style={{color: '#ff6b35'}} />
                                    </div>
                                    
                                    <div className="wt-card-right wt-total-listing-review counter">
                                        {loading ? <div className="loading-spinner"></div> : <CountUp end={stats.activeJobs} duration={2} />}
                                    </div>

                                    <div className="wt-card-bottom">
                                        <h4 className="m-b0">Active Jobs</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-xl-3 col-lg-6 col-md-12 mb-4">
                        <div className="panel panel-default dashboard-stats-card">
                            <div className="panel-body wt-panel-body gradi-4">
                                <div className="wt-card-wrap">
                                    <div className="wt-card-icon">
                                        <i className="fa fa-file-alt" style={{color: '#ff6b35'}} />
                                    </div>

                                    <div className="wt-card-right wt-total-listing-bookmarked counter">
                                        {loading ? <div className="loading-spinner"></div> : <CountUp end={stats.totalApplications} duration={2} />}
                                    </div>

                                    <div className="wt-card-bottom">
                                        <h4 className="m-b0">Applications</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                <div className="row">
                    <div className="col-lg-12 col-md-12 col-12 mb-4">
                        <div className="chart-section" data-aos="fade-up" data-aos-delay="150">
                            <div className="chart-header">
                                <h3>
                                    <i className="fa fa-chart-area me-3" style={{color: '#ff6b35'}}></i>
                                    Platform Analytics
                                </h3>
                            </div>
                            <AdminDashboardActivityChart />
                        </div>
                    </div>
                </div>


            </div>
        </>
    );
}

export default AdminDashboardPage;