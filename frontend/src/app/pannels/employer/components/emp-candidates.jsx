import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { loadScript } from "../../../../globals/constants";
import JobZImage from "../../../common/jobz-img";
import { ArrowLeft, ListChecks, Eye, Search } from "lucide-react";

function EmpCandidatesPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employerType, setEmployerType] = useState("company");
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [currentJob, setCurrentJob] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadScript("js/custom.js");
    fetchEmployerType();
    fetchApplications();
  }, []);

  useEffect(() => {
    if (!jobId) {
      // Only fetch companies when not viewing specific job
      if (employerType === "consultant") {
        fetchConsultantCompanies();
      } else {
        // For regular companies, fetch all unique company names from their jobs
        fetchConsultantCompanies(); // This will get company names from jobs
      }
    }
  }, [employerType, jobId]);

  useEffect(() => {
    fetchApplications();
  }, [selectedCompany, jobId]);

  const fetchEmployerType = async () => {
    try {
      const token = localStorage.getItem("employerToken");
      const response = await fetch("http://localhost:5000/api/employer/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.profile?.employerId) {
        setEmployerType(data.profile.employerId.employerType || "company");
      }
    } catch (error) {
      console.error("Error fetching employer type:", error);
    }
  };

  const fetchConsultantCompanies = async () => {
    try {
      const token = localStorage.getItem("employerToken");
      const response = await fetch(
        "http://localhost:5000/api/employer/consultant/companies",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("employerToken");
      if (!token) return;

      let url;
      if (jobId) {
        // Fetch applications for specific job
        url = `http://localhost:5000/api/employer/jobs/${jobId}/applications`;
      } else {
        // Fetch all applications
        url = "http://localhost:5000/api/employer/applications";
        if (selectedCompany && selectedCompany.trim() !== "") {
          url += `?companyName=${encodeURIComponent(selectedCompany)}`;
        }
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
        if (data.job) {
          setCurrentJob(data.job);
        }
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return "twm-bg-yellow";
      case "shortlisted":
        return "twm-bg-purple";
      case "interviewed":
        return "twm-bg-orange";
      case "hired":
        return "twm-bg-green";
      case "rejected":
        return "twm-bg-red";
      default:
        return "twm-bg-light-blue";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  // Derived filtering
  const filteredApplications = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return applications.filter((application) => {
      const name = application.candidateId?.name?.toLowerCase() || "";
      const email = application.candidateId?.email?.toLowerCase() || "";
      const title = application.jobId?.title?.toLowerCase() || "";
      const matchesSearch = q
        ? name.includes(q) || email.includes(q) || title.includes(q)
        : true;
      const matchesStatus = statusFilter
        ? application.status === statusFilter
        : true;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchText, statusFilter]);

  return (
    <>
      <div className="wt-admin-right-page-header clearfix">
        <h2>
          {jobId && currentJob
            ? `Applicants for ${currentJob.title}`
            : "Applicants Details"}
        </h2>
        {jobId && currentJob && (
          <div className="d-flex align-items-center gap-2 mt-2">
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={() => navigate("/employer/manage-jobs")}
            >
              <ArrowLeft size={16} className="me-1" /> Back to Jobs
            </button>
            <span className="text-muted">| {currentJob.location}</span>
          </div>
        )}
      </div>

      <div className="panel panel-default site-bg-white p-3">
        <div className="panel-heading wt-panel-heading mb-3 d-flex align-items-center justify-content-between">
          <h4 className="panel-tittle d-flex align-items-center m-0">
            <ListChecks
              size={18}
              style={{ color: "#f97316" }}
              className="me-2"
            />
            Job Applications
          </h4>

          <p className="text-muted mb-0">
            Review and manage candidate applications
          </p>
        </div>

        <div className="panel-body wt-panel-body">
          <div className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="input-group" style={{ maxWidth: 360 }}>
              <span className="input-group-text bg-white">
                <Search size={16} style={{ color: "#f97316" }} />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search applicants by name, email, or job"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="d-flex gap-2 align-items-center">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "200px" }}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interviewed">Interviewed</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
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
              {filteredApplications.length === 0 ? (
                <div className="col-12 text-center py-4">
                  <p className="text-muted">
                    {jobId && currentJob
                      ? `No applications received for ${currentJob.title} yet.`
                      : "No applications match your filters."}
                  </p>
                </div>
              ) : (
                filteredApplications.map((application) => (
                  <div className="col-lg-6 col-12" key={application._id}>
                    <div className="d-flex justify-content-between align-items-center p-3 border rounded mb-3 shadow-sm">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="twm-media-pic rounded-circle overflow-hidden"
                          style={{ width: "50px", height: "50px" }}
                        >
                          {application.candidateId?.profilePicture ? (
                            <img
                              src={application.candidateId.profilePicture}
                              alt={
                                application.candidateId?.name || "Candidate"
                              }
                              style={{
                                width: "50px",
                                height: "50px",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <JobZImage
                              src="images/candidates/pic1.jpg"
                              alt={
                                application.candidateId?.name || "Candidate"
                              }
                            />
                          )}
                        </div>

                        <div>
                          <h5 className="mb-1">
                            {application.candidateId?.name || "Unknown"}
                          </h5>
                          <p className="mb-0 text-muted">
                            {application.candidateId?.email || "No email"}
                          </p>
                          <small className="text-muted">
                            Applied for {application.jobId?.title || "Unknown Job"}
                          </small>{" "}
                          <br />
                          <small className="text-muted">
                            Submitted {formatDate(application.createdAt)}
                          </small>{" "}
                          <br />
                          <span
                            className={`badge ${getStatusBadge(
                              application.status
                            )} text-capitalize`}
                          >
                            {application.status}
                          </span>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-3">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() =>
                            navigate(
                              `/employer/emp-candidate-review/${application._id}`
                            )
                          }
                        >
                          <Eye size={16} className="me-1" /> View Details
                        </button>
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

export default EmpCandidatesPage;
