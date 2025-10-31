import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../../../utils/api';
import { useWebSocket } from '../../../../contexts/WebSocketContext';
import './placement-details.css';

function PlacementDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { joinAdminRoom } = useWebSocket();
    const [placement, setPlacement] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Removed global credits state - now using file-specific credits
    const [processing, setProcessing] = useState(false);
    const [studentData, setStudentData] = useState([]);
    const [loadingData, setLoadingData] = useState(false);
    const [processingFiles, setProcessingFiles] = useState({});
    const [viewingFile, setViewingFile] = useState(null);
    const [fileStudentData, setFileStudentData] = useState([]);
    const [loadingFileData, setLoadingFileData] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileCredits, setFileCredits] = useState(0);
    const [showingStudentRecords, setShowingStudentRecords] = useState(false);
    const [currentViewingFileId, setCurrentViewingFileId] = useState(null);
    const [showBulkCreditsModal, setShowBulkCreditsModal] = useState(false);
    const [bulkCredits, setBulkCredits] = useState(0);
    const [showStoredDataModal, setShowStoredDataModal] = useState(false);
    const [storedData, setStoredData] = useState([]);
    const [loadingStoredData, setLoadingStoredData] = useState(false);

    useEffect(() => {
        fetchPlacementDetails();
        
        // Join admin room for real-time updates
        joinAdminRoom();
    }, [id, joinAdminRoom]);

    const fetchPlacementDetails = async () => {
        try {
            setLoading(true);
            const response = await api.getPlacementDetails(id);
            
            if (response.success) {
                
                
                
                setPlacement(response.placement);
                // Credits are now managed per file, not globally
            } else {
                setError(response.message || 'Failed to fetch placement details');
            }
        } catch (error) {
            setError('Error fetching placement details');
            
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/download`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = placement.fileName || 'student_data.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Failed to download file');
            }
        } catch (error) {
            alert('Error downloading file');
            
        }
    };

    // Removed global view data functionality - only file-specific viewing is allowed

    const handleApprove = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'approved', isApproved: true })
            });
            const data = await response.json();
            if (data.success) {
                alert('Placement officer approved successfully!');
                fetchPlacementDetails();
            } else {
                alert('Failed to approve placement officer');
            }
        } catch (error) {
            alert('Error approving placement officer');
            
        }
    };



    const handleFileApprove = async (fileId, fileName) => {
        const file = placement?.fileHistory?.find(f => f._id === fileId);
        const displayName = file?.customName || fileName;
        if (!window.confirm(`Are you sure you want to approve and process the file "${displayName}"? This will create candidate accounts from the file data.`)) {
            return;
        }
        
        try {
            setProcessingFiles(prev => ({...prev, [fileId]: 'approving'}));
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/files/${fileId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileName })
            });
            const data = await response.json();
            if (data.success) {
                const displayName = placement?.fileHistory?.find(f => f._id === fileId)?.customName || fileName;
                alert(`File "${displayName}" approved and processed successfully!\n${data.message}`);
                // Force immediate refresh
                setTimeout(() => {
                    fetchPlacementDetails();
                }, 500);
                // Refresh student data if currently viewing this file
                if (currentViewingFileId === fileId) {
                    setTimeout(() => {
                        handleViewFileData(fileId, fileName);
                    }, 1000);
                }
            } else {
                alert(`Failed to approve file: ${data.message}`);
            }
        } catch (error) {
            alert(`Error approving file: ${error.message}`);
        } finally {
            setProcessingFiles(prev => ({...prev, [fileId]: null}));
        }
    };

    const handleFileReject = async (fileId, fileName) => {
        const file = placement?.fileHistory?.find(f => f._id === fileId);
        const displayName = file?.customName || fileName;
        if (!window.confirm(`Are you sure you want to reject the file "${displayName}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            setProcessingFiles(prev => ({...prev, [fileId]: 'rejecting'}));
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/files/${fileId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            if (data.success) {
                const displayName = placement?.fileHistory?.find(f => f._id === fileId)?.customName || fileName;
                alert(`File "${displayName}" rejected successfully!`);
                // Force immediate refresh
                setTimeout(() => {
                    fetchPlacementDetails();
                }, 500);
            } else {
                alert(`Failed to reject file: ${data.message}`);
            }
        } catch (error) {
            alert(`Error rejecting file: ${error.message}`);
        } finally {
            setProcessingFiles(prev => ({...prev, [fileId]: null}));
        }
    };

    const handleReject = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'rejected', isApproved: false })
            });
            const data = await response.json();
            if (data.success) {
                alert('Placement officer rejected successfully!');
                fetchPlacementDetails();
            } else {
                alert('Failed to reject placement officer');
            }
        } catch (error) {
            alert('Error rejecting placement officer');
            
        }
    };

    // Global credits assignment removed - now using file-specific credits

    const handleViewFileData = async (fileId, fileName) => {
        try {
            setLoadingData(true);
            setShowingStudentRecords(true);
            setCurrentViewingFileId(fileId);
            
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/files/${fileId}/data`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            const data = await response.json();
            if (response.ok && data.success) {
                setStudentData(data.students || []);
            } else {
                
                setStudentData([]);
            }
        } catch (error) {
            
            setStudentData([]);
        } finally {
            setLoadingData(false);
        }
    };

    const handleFileCreditsManagement = (file) => {
        setSelectedFile(file);
        setFileCredits(file.credits || 0);
        setShowCreditsModal(true);
    };

    const handleUpdateFileCredits = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/files/${selectedFile._id}/credits`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ credits: fileCredits })
            });
            
            const data = await response.json();
            if (data.success) {
                alert(`File credits updated successfully!\n${data.message}\n\nAll candidates from this file will see the updated credits in their dashboard immediately.`);
                setShowCreditsModal(false);
                fetchPlacementDetails();
                // Refresh student data if currently viewing this file
                if (currentViewingFileId === selectedFile._id) {
                    setTimeout(() => {
                        handleViewFileData(selectedFile._id, selectedFile.fileName);
                    }, 500);
                }
            } else {
                alert(`Failed to update credits: ${data.message}`);
            }
        } catch (error) {
            alert(`Error updating credits: ${error.message}`);
        }
    };

    const handleProcessData = async (fileId, fileName) => {
        const file = placement?.fileHistory?.find(f => f._id === fileId);
        const displayName = file?.customName || fileName;
        if (!window.confirm(`Are you sure you want to process the file "${displayName}"?\n\nThis will:\n• Create candidate accounts from Excel data\n• Enable immediate login with email/password from Excel\n• Store data in database permanently\n• Allow candidates to access their dashboard`)) {
            return;
        }
        
        try {
            setProcessingFiles(prev => ({...prev, [fileId]: 'processing'}));
            
            const url = `http://localhost:5000/api/admin/placements/${id}/files/${fileId}/process`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileName })
            });
            
            const data = await response.json();
            
            if (data.success) {
                let alertMessage = `✅ File processed successfully!\n\n${data.message}\n\n`;
                
                if (data.createdCandidates && data.createdCandidates.length > 0) {
                    alertMessage += `📋 Sample Created Candidates (first ${Math.min(5, data.createdCandidates.length)}):\n`;
                    data.createdCandidates.slice(0, 5).forEach((candidate, index) => {
                        alertMessage += `${index + 1}. ${candidate.name} (${candidate.email})\n`;
                    });
                    alertMessage += `\n`;
                }
                
                if (data.loginInstructions) {
                    alertMessage += `🔐 Login Instructions:\n• URL: http://localhost:3000/ (Sign In → Candidate tab)\n• ${data.loginInstructions.message}\n\n`;
                }
                
                alertMessage += `📊 Statistics:\n• Created: ${data.stats.created} candidates\n• Skipped: ${data.stats.skipped} (already exist)\n• Errors: ${data.stats.errors}`;
                
                alert(alertMessage);
                
                fetchPlacementDetails();
                if (currentViewingFileId === fileId) {
                    setTimeout(() => {
                        handleViewFileData(fileId, fileName);
                    }, 1000);
                }
            } else {
                alert(`❌ Failed to process file: ${data.message}`);
            }
        } catch (error) {
            alert(`❌ Error processing file: ${error.message}`);
        } finally {
            setProcessingFiles(prev => ({...prev, [fileId]: null}));
        }
    };

    const handleBulkCreditsUpdate = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/bulk-credits`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ credits: bulkCredits })
            });
            
            const data = await response.json();
            if (data.success) {
                alert(`Bulk credits updated successfully!\n${data.message}\n\nAll candidates from this placement will see the updated credits in their dashboard immediately.`);
                setShowBulkCreditsModal(false);
                fetchPlacementDetails();
                // Refresh student data if currently viewing a file
                if (currentViewingFileId) {
                    const currentFile = placement?.fileHistory?.find(f => f._id === currentViewingFileId);
                    if (currentFile) {
                        setTimeout(() => {
                            handleViewFileData(currentViewingFileId, currentFile.fileName);
                        }, 500);
                    }
                }
            } else {
                alert(`Failed to update bulk credits: ${data.message}`);
            }
        } catch (error) {
            alert(`Error updating bulk credits: ${error.message}`);
        }
    };

    const handleStoreExcelData = async () => {
        if (!window.confirm('This will store all Excel data from uploaded files in MongoDB. Continue?')) {
            return;
        }
        
        try {
            setProcessing(true);
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/store-excel-data`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                alert(`Excel data stored successfully in MongoDB!\n\nFiles processed: ${data.stats.totalFilesProcessed}\nTotal records stored: ${data.stats.totalRecordsStored}\n\nData is now available in structured format in the database.`);
                fetchPlacementDetails();
            } else {
                alert(`Failed to store Excel data: ${data.message}`);
            }
        } catch (error) {
            alert(`Error storing Excel data: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleViewStoredData = async () => {
        try {
            setLoadingStoredData(true);
            setShowStoredDataModal(true);
            
            const response = await fetch(`http://localhost:5000/api/admin/placements/${id}/stored-excel-data`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            const data = await response.json();
            if (data.success) {
                setStoredData(data.data || []);
            } else {
                alert(`Failed to load stored data: ${data.message}`);
                setStoredData([]);
            }
        } catch (error) {
            alert(`Error loading stored data: ${error.message}`);
            setStoredData([]);
        } finally {
            setLoadingStoredData(false);
        }
    };

    if (loading) {
        return (
            <div className="wt-admin-right-page-header clearfix">
                <h2>Loading...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="wt-admin-right-page-header clearfix">
                <h2>Error: {error}</h2>
            </div>
        );
    }

    return (
        <div className="container-fluid p-4" style={{background: '#f8f9fa', minHeight: '100vh'}}>
            {/* Header */}
            <div className="modern-card mb-4 p-4">
                <div className="d-flex justify-content-between align-items-center">
                    <h2 className="mb-0" style={{color: '#2c3e50', fontWeight: '600'}}>
                        <i className="fa fa-user-circle mr-2"></i>
                        Placement Officer Details
                    </h2>
                    <button 
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/admin/admin-placement-manage')}
                        style={{borderRadius: '8px'}}
                    >
                        <i className="fa fa-arrow-left mr-2"></i>
                        Back to List
                    </button>
                </div>
            </div>

            {/* Officer Information */}
            <div className="modern-card mb-4 p-4">
                <div className="row align-items-center mb-4">
                    <div className="col-md-2 text-center">
                        {placement.logo ? (
                            <img 
                                src={placement.logo} 
                                alt="College Logo" 
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    objectFit: 'contain',
                                    borderRadius: '12px',
                                    border: '2px solid #e9ecef',
                                    background: '#f8f9fa'
                                }}
                            />
                        ) : (
                            <div 
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '12px',
                                    border: '2px dashed #ccc',
                                    background: '#f8f9fa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <i className="fa fa-university fa-2x text-muted"></i>
                            </div>
                        )}
                        <small className="text-muted d-block mt-2">College Logo</small>
                    </div>
                    <div className="col-md-2 text-center">
                        {placement.idCard ? (
                            <div>
                                <img 
                                    src={placement.idCard} 
                                    alt="ID Card" 
                                    style={{
                                        width: '100px',
                                        height: '100px',
                                        objectFit: 'contain',
                                        borderRadius: '12px',
                                        border: '2px solid #e9ecef',
                                        background: '#f8f9fa'
                                    }}
                                />
                                <div className="mt-2">
                                    <i 
                                        className="fa fa-download" 
                                        onClick={() => {
                                            fetch(`http://localhost:5000/api/admin/placements/${id}/download-id-card`, {
                                                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
                                            }).then(response => response.blob())
                                            .then(blob => {
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${placement.name.replace(/\s+/g, '_')}_ID_Card`;
                                                document.body.appendChild(a);
                                                a.click();
                                                window.URL.revokeObjectURL(url);
                                                document.body.removeChild(a);
                                            }).catch(() => alert('Failed to download ID card'));
                                        }}
                                        style={{cursor: 'pointer', color: '#007bff', fontSize: '16px'}}
                                        title="Download ID Card"
                                    ></i>
                                </div>
                            </div>
                        ) : (
                            <div 
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '12px',
                                    border: '2px dashed #ccc',
                                    background: '#f8f9fa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <i className="fa fa-id-card fa-2x text-muted"></i>
                            </div>
                        )}
                        <small className="text-muted d-block mt-2">ID Card</small>
                    </div>
                    <div className="col-md-8">
                        <h3 className="mb-2" style={{color: '#2c3e50'}}>{placement.name}</h3>
                        <p className="mb-1" style={{color: '#6c757d', fontSize: '1.1rem'}}>
                            <i className="fa fa-university mr-2"></i>
                            {placement.collegeName || 'College Name Not Available'}
                        </p>
                        <p className="mb-0" style={{color: '#6c757d'}}>
                            <i className="fa fa-envelope mr-2"></i>
                            {placement.email}
                        </p>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-3 col-md-6 mb-3">
                        <div className="info-card">
                            <div className="info-icon" style={{background: '#007bff20', color: '#007bff'}}>
                                <i className="fa fa-phone"></i>
                            </div>
                            <div>
                                <label className="text-muted mb-1">Phone Number</label>
                                <p className="mb-0 font-weight-bold">{placement.phone || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-3">
                        <div className="info-card">
                            <div className="info-icon" style={{background: '#28a74520', color: '#28a745'}}>
                                <i className="fa fa-calendar"></i>
                            </div>
                            <div>
                                <label className="text-muted mb-1">Registration Date</label>
                                <p className="mb-0 font-weight-bold">{new Date(placement.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-3">
                        <div className="info-card">
                            <div className="info-icon" style={{
                                background: placement.status === 'approved' ? '#28a74520' : '#ffc10720',
                                color: placement.status === 'approved' ? '#28a745' : '#ffc107'
                            }}>
                                <i className={`fa ${placement.status === 'approved' ? 'fa-check-circle' : 'fa-clock-o'}`}></i>
                            </div>
                            <div>
                                <label className="text-muted mb-1">Status</label>
                                <p className="mb-0 font-weight-bold" style={{
                                    color: placement.status === 'approved' ? '#28a745' : 
                                           placement.status === 'rejected' ? '#dc3545' : '#ffc107'
                                }}>
                                    {placement.status || 'Pending'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-3">
                        <div className="info-card">
                            <div className="info-icon" style={{background: '#17a2b820', color: '#17a2b8'}}>
                                <i className="fa fa-files-o"></i>
                            </div>
                            <div>
                                <label className="text-muted mb-1">Files Uploaded</label>
                                <p className="mb-0 font-weight-bold">{placement.fileHistory?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* File Upload History */}
                {placement.fileHistory && placement.fileHistory.length > 0 ? (
                    <div className="mt-4" style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        border: '1px solid #e9ecef'
                    }}>
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <h5 className="mb-0" style={{
                                color: '#2c3e50',
                                fontWeight: '600',
                                fontSize: '1.3rem'
                            }}>
                                <i className="fa fa-cloud-upload mr-3" style={{fontSize: '1.2rem'}}></i>
                                File Upload History
                            </h5>
                            <div style={{
                                background: '#f8f9fa',
                                borderRadius: '20px',
                                padding: '8px 16px',
                                border: '1px solid #e9ecef'
                            }}>
                                <span style={{
                                    color: '#495057',
                                    fontWeight: '600',
                                    fontSize: '0.9rem'
                                }}>
                                    {placement.fileHistory.length} files
                                </span>
                            </div>
                        </div>
                        <div className="timeline" style={{
                            maxHeight: '450px',
                            overflowY: 'auto',
                            paddingRight: '8px'
                        }}>
                            {placement.fileHistory.slice().reverse().map((file, index) => (
                                <div key={file._id || index} className="timeline-item mb-4">
                                    <div style={{
                                        background: 'rgba(255,255,255,0.95)',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        backdropFilter: 'blur(10px)',
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div className="d-flex align-items-start">
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '12px',
                                                background: file.status === 'processed' ? 'linear-gradient(135deg, #4CAF50, #45a049)' : 
                                                           file.status === 'approved' ? 'linear-gradient(135deg, #2196F3, #1976D2)' : 
                                                           file.status === 'rejected' ? 'linear-gradient(135deg, #f44336, #d32f2f)' : 'linear-gradient(135deg, #FF9800, #F57C00)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                            }}>
                                                <i className={`fa ${
                                                    file.status === 'processed' ? 'fa-check-circle' : 
                                                    file.status === 'approved' ? 'fa-check' : 
                                                    file.status === 'rejected' ? 'fa-times' : 'fa-clock-o'
                                                } text-white`} style={{fontSize: '18px'}}></i>
                                            </div>
                                            <div className="ml-4 flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div className="flex-grow-1">
                                                        <h6 className="mb-2" style={{
                                                            color: '#2c3e50',
                                                            fontWeight: '600',
                                                            fontSize: '1.1rem',
                                                            lineHeight: '1.3'
                                                        }}>
                                                            <i className="fa fa-file-excel-o mr-2" style={{color: '#1e7e34'}}></i>
                                                            {file.customName || file.fileName}
                                                        </h6>
                                                        {file.customName && (
                                                            <p className="mb-2" style={{
                                                                fontSize: '0.85rem',
                                                                color: '#6c757d',
                                                                fontStyle: 'italic'
                                                            }}>
                                                                Original: {file.fileName}
                                                            </p>
                                                        )}
                                                        <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                                                            <div className="d-flex align-items-center">
                                                                <i className="fa fa-calendar mr-2" style={{color: '#007bff'}}></i>
                                                                <span style={{fontSize: '0.85rem', color: '#495057'}}>
                                                                    {new Date(file.uploadedAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <div className="d-flex align-items-center">
                                                                <i className="fa fa-clock-o mr-2" style={{color: '#6f42c1'}}></i>
                                                                <span style={{fontSize: '0.85rem', color: '#495057'}}>
                                                                    {new Date(file.uploadedAt).toLocaleTimeString()}
                                                                </span>
                                                            </div>
                                                            {file.processedAt && (
                                                                <div className="d-flex align-items-center">
                                                                    <i className="fa fa-check-circle mr-2" style={{color: '#28a745'}}></i>
                                                                    <span style={{fontSize: '0.85rem', color: '#495057'}}>
                                                                        Processed: {new Date(file.processedAt).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="d-flex flex-wrap gap-2 ml-3">
                                                        <button
                                                            className="btn btn-outline-info btn-sm"
                                                            onClick={() => handleViewFileData(file._id, file.fileName)}
                                                            style={{
                                                                fontSize: '0.8rem',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                fontWeight: '500',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            title="View file data in Student Records section"
                                                        >
                                                            <i className="fa fa-eye mr-1"></i>View
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-warning btn-sm"
                                                            onClick={() => handleFileCreditsManagement(file)}
                                                            style={{
                                                                fontSize: '0.8rem',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                fontWeight: '500',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            title="Manage credits for this file"
                                                        >
                                                            <i className="fa fa-credit-card mr-1"></i>Credits
                                                        </button>
                                                        <button
                                                            className={`btn btn-sm ${file.status === 'processed' ? 'btn-success' : 'btn-outline-primary'}`}
                                                            onClick={() => handleProcessData(file._id, file.fileName)}
                                                            disabled={processingFiles[file._id] || file.status === 'processed'}
                                                            style={{
                                                                fontSize: '0.8rem',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                fontWeight: '500',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            title={file.status === 'processed' ? 'File already processed - candidates can login' : 'Process file data and create candidate accounts with login access'}
                                                        >
                                                            {processingFiles[file._id] === 'processing' ? (
                                                                <><i className="fa fa-spinner fa-spin mr-1"></i>Processing...</>
                                                            ) : file.status === 'processed' ? (
                                                                <><i className="fa fa-check mr-1"></i>Processed</>
                                                            ) : (
                                                                <><i className="fa fa-cogs mr-1"></i>Process</>
                                                            )}
                                                        </button>
                                                        {file.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    className="btn btn-outline-success btn-sm"
                                                                    onClick={() => handleFileApprove(file._id, file.fileName)}
                                                                    disabled={processingFiles[file._id]}
                                                                    style={{
                                                                        fontSize: '0.8rem',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '8px',
                                                                        fontWeight: '500',
                                                                        transition: 'all 0.2s ease'
                                                                    }}
                                                                    title="Approve and process this file"
                                                                >
                                                                    {processingFiles[file._id] === 'approving' ? (
                                                                        <i className="fa fa-spinner fa-spin"></i>
                                                                    ) : (
                                                                        <><i className="fa fa-check mr-1"></i>Approve</>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    className="btn btn-outline-danger btn-sm"
                                                                    onClick={() => handleFileReject(file._id, file.fileName)}
                                                                    disabled={processingFiles[file._id]}
                                                                    style={{
                                                                        fontSize: '0.8rem',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '8px',
                                                                        fontWeight: '500',
                                                                        transition: 'all 0.2s ease'
                                                                    }}
                                                                    title="Reject this file"
                                                                >
                                                                    {processingFiles[file._id] === 'rejecting' ? (
                                                                        <i className="fa fa-spinner fa-spin"></i>
                                                                    ) : (
                                                                        <><i className="fa fa-times mr-1"></i>Reject</>
                                                                    )}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <div className="d-flex flex-wrap align-items-center gap-2">
                                                        {file.status === 'processed' ? (
                                                            <>
                                                                <span style={{
                                                                    background: 'rgba(40, 167, 69, 0.1)',
                                                                    color: '#28a745',
                                                                    padding: '6px 12px',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: '500',
                                                                    border: '1px solid rgba(40, 167, 69, 0.2)'
                                                                }}>
                                                                    <i className="fa fa-check-circle mr-2"></i>
                                                                    Processed - Login Ready
                                                                </span>
                                                                {file.candidatesCreated > 0 && (
                                                                    <span style={{
                                                                        background: 'rgba(23, 162, 184, 0.1)',
                                                                        color: '#17a2b8',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '20px',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: '500',
                                                                        border: '1px solid rgba(23, 162, 184, 0.2)'
                                                                    }}>
                                                                        <i className="fa fa-users mr-2"></i>
                                                                        {file.candidatesCreated} candidates can login
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : file.status === 'approved' ? (
                                                            <>
                                                                <span style={{
                                                                    background: 'linear-gradient(135deg, #007bff, #0056b3)',
                                                                    color: 'white',
                                                                    padding: '6px 12px',
                                                                    borderRadius: '20px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: '500',
                                                                    boxShadow: '0 2px 8px rgba(0, 123, 255, 0.3)'
                                                                }}>
                                                                    <i className="fa fa-check mr-2"></i>
                                                                    Approved
                                                                </span>
                                                                {file.candidatesCreated > 0 && (
                                                                    <span style={{
                                                                        background: 'linear-gradient(135deg, #6c757d, #545b62)',
                                                                        color: 'white',
                                                                        padding: '6px 12px',
                                                                        borderRadius: '20px',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: '500',
                                                                        boxShadow: '0 2px 8px rgba(108, 117, 125, 0.3)'
                                                                    }}>
                                                                        <i className="fa fa-user-plus mr-2"></i>
                                                                        {file.candidatesCreated} candidates created
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : file.status === 'rejected' ? (
                                                            <span style={{
                                                                background: 'linear-gradient(135deg, #dc3545, #c82333)',
                                                                color: 'white',
                                                                padding: '6px 12px',
                                                                borderRadius: '20px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '500',
                                                                boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)'
                                                            }}>
                                                                <i className="fa fa-times mr-2"></i>
                                                                Rejected
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                background: 'linear-gradient(135deg, #ffc107, #e0a800)',
                                                                color: '#212529',
                                                                padding: '6px 12px',
                                                                borderRadius: '20px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '500',
                                                                boxShadow: '0 2px 8px rgba(255, 193, 7, 0.3)'
                                                            }}>
                                                                <i className="fa fa-clock-o mr-2"></i>
                                                                Waiting for Admin Approval
                                                            </span>
                                                        )}
                                                        <span style={{
                                                            background: 'rgba(111, 66, 193, 0.1)',
                                                            color: '#6f42c1',
                                                            padding: '6px 12px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '500',
                                                            border: '1px solid rgba(111, 66, 193, 0.2)'
                                                        }}>
                                                            <i className="fa fa-credit-card mr-2"></i>
                                                            Credits: {file.credits || 0}
                                                        </span>
                                                        {file.status === 'processed' && (
                                                            <span style={{
                                                                background: 'rgba(253, 126, 20, 0.1)',
                                                                color: '#fd7e14',
                                                                padding: '6px 12px',
                                                                borderRadius: '20px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: '500',
                                                                border: '1px solid rgba(253, 126, 20, 0.2)'
                                                            }}>
                                                                <i className="fa fa-sign-in mr-2"></i>
                                                                Ready for Login
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {(!placement.fileHistory || placement.fileHistory.length === 0) && (
                    <div className="mt-3 p-3" style={{background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7'}}>
                        <div className="text-center">
                            <i className="fa fa-upload fa-2x text-warning mb-2"></i>
                            <p className="mb-0 text-muted">No Excel/CSV files uploaded yet</p>
                            <small className="text-muted">Files must contain: ID | Candidate Name | College Name | Email | Phone | Course | Password | Credits Assigned</small>
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="row mb-4">
                <div className="col-md-12">
                    <div className="modern-card p-4">
                        <h5 className="mb-3" style={{color: '#2c3e50'}}>
                            <i className="fa fa-cogs mr-2"></i>
                            Actions
                            <button 
                                className="btn btn-sm btn-outline-secondary ml-2"
                                onClick={fetchPlacementDetails}
                                style={{borderRadius: '6px'}}
                            >
                                <i className="fa fa-refresh"></i>
                            </button>
                        </h5>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            <button
                                className="btn btn-success"
                                onClick={handleApprove}
                                disabled={placement.status === 'approved'}
                                style={{borderRadius: '8px'}}
                            >
                                <i className="fa fa-check mr-1"></i>
                                Approve Officer
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleReject}
                                disabled={placement.status === 'rejected'}
                                style={{borderRadius: '8px'}}
                            >
                                <i className="fa fa-times mr-1"></i>
                                Reject Officer
                            </button>
                            {placement.fileHistory && placement.fileHistory.length > 1 && (
                                <button
                                    className="btn btn-warning"
                                    onClick={() => setShowBulkCreditsModal(true)}
                                    style={{borderRadius: '8px'}}
                                    title="Assign credits to all files at once"
                                >
                                    <i className="fa fa-credit-card mr-1"></i>
                                    Bulk Credits ({placement.fileHistory.length} files)
                                </button>
                            )}
                            {placement.fileHistory && placement.fileHistory.length > 0 && (
                                <button
                                    className="btn btn-info"
                                    onClick={handleStoreExcelData}
                                    disabled={processing}
                                    style={{borderRadius: '8px'}}
                                    title="Store complete Excel data in MongoDB"
                                >
                                    {processing ? (
                                        <><i className="fa fa-spinner fa-spin mr-1"></i>Storing...</>
                                    ) : (
                                        <><i className="fa fa-database mr-1"></i>Store Excel Data</>
                                    )}
                                </button>
                            )}
                            {placement.fileHistory && placement.fileHistory.some(f => f.structuredData && f.structuredData.length > 0) && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleViewStoredData}
                                    style={{borderRadius: '8px'}}
                                    title="View stored Excel data from MongoDB"
                                >
                                    <i className="fa fa-eye mr-1"></i>
                                    View Stored Data
                                </button>
                            )}
                        </div>
                        <div className="alert alert-info mb-3" style={{borderRadius: '8px', fontSize: '0.9rem'}}>
                            <i className="fa fa-info-circle mr-1"></i>
                            <strong>Excel Format Required:</strong> Files must contain these 8 columns: ID, Candidate Name, College Name, Email, Phone, Course, Password, Credits Assigned. Use "Credits" to assign credits per file and "View" to see student records.
                        </div>

                    </div>
                </div>
            </div>

            {/* Student Data */}
            <div className="modern-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0" style={{color: '#2c3e50'}}>
                        <i className="fa fa-graduation-cap mr-2"></i>
                        Student Records
                        {studentData.length > 0 && (
                            <span className="badge badge-primary ml-2">{studentData.length}</span>
                        )}
                        {showingStudentRecords && currentViewingFileId && (
                            <small className="text-muted ml-2">
                                (Showing data from selected file)
                            </small>
                        )}
                    </h5>
                    {showingStudentRecords && (
                        <button 
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => {
                                setShowingStudentRecords(false);
                                setCurrentViewingFileId(null);
                                setStudentData([]);
                            }}
                            style={{borderRadius: '6px'}}
                        >
                            <i className="fa fa-times mr-1"></i>
                            Clear View
                        </button>
                    )}
                </div>
                
                {loadingData ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary mb-2" role="status"></div>
                        <p className="text-muted">Loading student data...</p>
                    </div>
                ) : studentData.length > 0 ? (
                    <div className="table-responsive">
                        <table className="table table-hover" style={{fontSize: '0.9rem'}}>
                            <thead style={{background: '#f8f9fa'}}>
                                <tr>
                                    <th style={{border: 'none', fontWeight: '600'}}>ID</th>
                                    <th style={{border: 'none', fontWeight: '600'}}>Name</th>
                                    <th style={{border: 'none', fontWeight: '600'}}>College</th>
                                    <th style={{border: 'none', fontWeight: '600'}}>Email</th>
                                    <th style={{border: 'none', fontWeight: '600'}}>Phone</th>
                                    <th style={{border: 'none', fontWeight: '600'}}>Course</th>
                                    <th style={{border: 'none', fontWeight: '600'}}>Password</th>
                                    <th style={{border: 'none', fontWeight: '600'}}>Credits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studentData.map((student, index) => (
                                    <tr key={index} style={{borderTop: '1px solid #e9ecef'}}>
                                        <td style={{border: 'none', paddingTop: '12px', paddingBottom: '12px'}}>
                                            <span className="badge badge-light">{student.id || (index + 1)}</span>
                                        </td>
                                        <td style={{border: 'none', paddingTop: '12px', paddingBottom: '12px'}}>
                                            <div className="d-flex align-items-center">
                                                <div className="avatar-sm mr-2" style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    background: '#007bff20',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#007bff',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {(student.name || 'N').charAt(0).toUpperCase()}
                                                </div>
                                                {student.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td style={{border: 'none', paddingTop: '12px', paddingBottom: '12px'}}>
                                            <small className="text-muted">{student.collegeName || '-'}</small>
                                        </td>
                                        <td style={{border: 'none', paddingTop: '12px', paddingBottom: '12px'}}>
                                            {student.email || 'N/A'}
                                        </td>
                                        <td style={{border: 'none', paddingTop: '12px', paddingBottom: '12px'}}>
                                            {student.phone || '-'}
                                        </td>
                                        <td style={{border: 'none', paddingTop: '12px', paddingBottom: '12px'}}>
                                            <small className="text-muted">{student.course || '-'}</small>
                                        </td>
                                        <td style={{border: 'none', paddingTop: '12px', paddingBottom: '12px'}}>
                                            <code style={{
                                                background: '#f8f9fa',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '0.8rem'
                                            }}>
                                                {student.password || 'N/A'}
                                            </code>
                                        </td>
                                        <td style={{border: 'none', paddingTop: '12px', paddingBottom: '12px'}}>
                                            <span className="badge badge-info">
                                                {student.credits || (() => {
                                                    if (currentViewingFileId) {
                                                        const currentFile = placement?.fileHistory?.find(f => f._id === currentViewingFileId);
                                                        return currentFile?.credits || 0;
                                                    }
                                                    return 0;
                                                })()}
                                            </span>
                                            {currentViewingFileId && (
                                                <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>
                                                    From file
                                                </small>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-5">
                        <i className="fa fa-users fa-3x text-muted mb-3"></i>
                        <h6 className="text-muted">
                            {showingStudentRecords ? 'No data in selected file' : 'No student data to display'}
                        </h6>
                        <p className="text-muted mb-0">
                            {showingStudentRecords 
                                ? 'The selected file appears to be empty or has no valid student data' 
                                : 'Click the "View" button next to any uploaded file to see its student records here'
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* File Data Modal */}
            {viewingFile && (
                <div className="modal fade show" style={{display: 'block', background: 'rgba(0,0,0,0.5)'}} onClick={() => setViewingFile(null)}>
                    <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fa fa-file-excel-o mr-2"></i>
                                    {viewingFile.name} - Student Data
                                </h5>
                                <button type="button" className="close" onClick={() => setViewingFile(null)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {loadingFileData ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary mb-2"></div>
                                        <p>Loading file data...</p>
                                    </div>
                                ) : fileStudentData.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead className="thead-light">
                                                <tr>
                                                    <th>#</th>
                                                    <th>Name</th>
                                                    <th>Phone</th>
                                                    <th>Email</th>
                                                    <th>Password</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fileStudentData.map((student, index) => (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td>{student.name || 'N/A'}</td>
                                                        <td>{student.phone || '-'}</td>
                                                        <td>{student.email || 'N/A'}</td>
                                                        <td>
                                                            <code style={{background: '#f8f9fa', padding: '2px 6px', borderRadius: '3px'}}>
                                                                {student.password || 'N/A'}
                                                            </code>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <i className="fa fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                                        <p>No data found in this file</p>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setViewingFile(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Credits Management Modal */}
            {showCreditsModal && selectedFile && (
                <div className="modal fade show" style={{display: 'block', background: 'rgba(0,0,0,0.5)'}} onClick={() => setShowCreditsModal(false)}>
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fa fa-credit-card mr-2"></i>
                                    File Credits Management - {selectedFile.fileName}
                                </h5>
                                <button type="button" className="close" onClick={() => setShowCreditsModal(false)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Current Credits: <strong>{selectedFile.credits || 0}</strong></label>
                                    <input
                                        type="number"
                                        className="form-control mt-2"
                                        value={fileCredits}
                                        onChange={(e) => setFileCredits(Math.min(10000, Math.max(0, parseInt(e.target.value) || 0)))}
                                        min="0"
                                        max="10000"
                                        placeholder="Enter new credits"
                                    />
                                    <small className="text-muted">Credits will be applied to all students in this file and updated in their candidate dashboard</small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreditsModal(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleUpdateFileCredits}>
                                    <i className="fa fa-save mr-1"></i>Update File Credits
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Credits Management Modal */}
            {showBulkCreditsModal && (
                <div className="modal fade show" style={{display: 'block', background: 'rgba(0,0,0,0.5)'}} onClick={() => setShowBulkCreditsModal(false)}>
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fa fa-credit-card mr-2"></i>
                                    Bulk Credits Assignment - All Files
                                </h5>
                                <button type="button" className="close" onClick={() => setShowBulkCreditsModal(false)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-info">
                                    <i className="fa fa-info-circle mr-2"></i>
                                    This will update credits for all {placement?.fileHistory?.length || 0} uploaded files and their associated students.
                                </div>
                                <div className="form-group">
                                    <label>Credits to Assign:</label>
                                    <input
                                        type="number"
                                        className="form-control mt-2"
                                        value={bulkCredits}
                                        onChange={(e) => setBulkCredits(Math.min(10000, Math.max(0, parseInt(e.target.value) || 0)))}
                                        min="0"
                                        max="10000"
                                        placeholder="Enter credits for all files"
                                    />
                                    <small className="text-muted">Credits will be applied to all students in all uploaded files and updated in their candidate dashboards</small>
                                </div>
                                <div className="mt-3">
                                    <strong>Files that will be updated:</strong>
                                    <ul className="list-unstyled mt-2" style={{maxHeight: '150px', overflowY: 'auto'}}>
                                        {placement?.fileHistory?.map((file, index) => (
                                            <li key={file._id || index} className="mb-1">
                                                <i className="fa fa-file-excel-o mr-2 text-success"></i>
                                                {file.fileName} 
                                                <span className="badge badge-secondary ml-2">Current: {file.credits || 0}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowBulkCreditsModal(false)}>Cancel</button>
                                <button type="button" className="btn btn-warning" onClick={handleBulkCreditsUpdate}>
                                    <i className="fa fa-save mr-1"></i>Update All Files Credits
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Stored Data Modal */}
            {showStoredDataModal && (
                <div className="modal fade show" style={{display: 'block', background: 'rgba(0,0,0,0.5)'}} onClick={() => setShowStoredDataModal(false)}>
                    <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fa fa-database mr-2"></i>
                                    Stored Excel Data from MongoDB
                                </h5>
                                <button type="button" className="close" onClick={() => setShowStoredDataModal(false)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {loadingStoredData ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary mb-2"></div>
                                        <p>Loading stored data from MongoDB...</p>
                                    </div>
                                ) : storedData.length > 0 ? (
                                    <div className="table-responsive">
                                        <div className="alert alert-success mb-3">
                                            <i className="fa fa-check-circle mr-2"></i>
                                            Found {storedData.length} records stored in MongoDB
                                        </div>
                                        <table className="table table-hover table-sm">
                                            <thead className="thead-light">
                                                <tr>
                                                    <th>Row</th>
                                                    <th>Name</th>
                                                    <th>Email</th>
                                                    <th>Phone</th>
                                                    <th>Course</th>
                                                    <th>Credits</th>
                                                    <th>Stored At</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {storedData.slice(0, 100).map((record, index) => (
                                                    <tr key={index}>
                                                        <td>{record.rowIndex}</td>
                                                        <td>{record.candidateName || 'N/A'}</td>
                                                        <td>{record.email || 'N/A'}</td>
                                                        <td>{record.phone || '-'}</td>
                                                        <td>{record.course || '-'}</td>
                                                        <td>
                                                            <span className="badge badge-info">
                                                                {record.creditsAssigned || 0}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <small className="text-muted">
                                                                {record.processedAt ? new Date(record.processedAt).toLocaleDateString() : '-'}
                                                            </small>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {storedData.length > 100 && (
                                            <div className="alert alert-info">
                                                <i className="fa fa-info-circle mr-2"></i>
                                                Showing first 100 records. Total: {storedData.length} records
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <i className="fa fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                                        <p>No stored data found in MongoDB</p>
                                        <small className="text-muted">Use the "Store Excel Data" button to save Excel data to MongoDB first</small>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowStoredDataModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PlacementDetails;
