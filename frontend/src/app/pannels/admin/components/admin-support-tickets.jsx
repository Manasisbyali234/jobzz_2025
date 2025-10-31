import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import './admin-support-tickets.css';

function AdminSupportTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [response, setResponse] = useState('');
    const [status, setStatus] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        userType: '',
        priority: ''
    });
    const [stats, setStats] = useState({
        total: 0,
        unread: 0,
        new: 0,
        inProgress: 0,
        resolved: 0
    });
    const [updating, setUpdating] = useState(false);
    const [isMounted, setIsMounted] = useState(true);
    const modalContainerRef = useRef(null);

    const formatDate = (value) => {
        if (!value) return '--';
        return new Date(value).toLocaleDateString(undefined, {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    useEffect(() => {
        setIsMounted(true);
        return () => {
            setIsMounted(false);
        };
    }, []);

    useEffect(() => {
        if (isMounted) {
            fetchSupportTickets();
        }
    }, [filters, isMounted]);

    const fetchSupportTickets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            
            if (!token) {
                console.error('No admin token found');
                alert('Authentication token not found. Please login again.');
                return;
            }
            
            const queryParams = new URLSearchParams(filters).toString();
            
            const response = await fetch(`http://localhost:5000/api/admin/support-tickets?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success && isMounted) {
                    setTickets(data.tickets || []);
                    
                    const newStats = {
                        total: data.totalTickets || 0,
                        unread: data.unreadCount || 0,
                        new: data.tickets?.filter(t => t.status === 'new').length || 0,
                        inProgress: data.tickets?.filter(t => t.status === 'in-progress').length || 0,
                        resolved: data.tickets?.filter(t => t.status === 'resolved').length || 0
                    };
                    setStats(newStats);
                } else {
                    console.error('API returned error:', data.message);
                    alert(data.message || 'Failed to fetch support tickets');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('HTTP error:', response.status, errorData);
                
                if (response.status === 401) {
                    alert('Session expired. Please login again.');
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin-login';
                } else {
                    alert(errorData.message || 'Failed to fetch support tickets');
                }
            }
        } catch (error) {
            console.error('Error fetching support tickets:', error);
            alert('Network error. Please check your connection and try again.');
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    const handleTicketClick = async (ticket) => {
        if (!isMounted || !ticket) return;
        
        setSelectedTicket(ticket);
        setResponse(ticket.response || '');
        setStatus(ticket.status);
        setShowModal(true);

        if (!ticket.isRead) {
            try {
                const token = localStorage.getItem('adminToken');
                await fetch(`http://localhost:5000/api/admin/support-tickets/${ticket._id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                fetchSupportTickets();
            } catch (error) {
                
            }
        }
    };

    const handleAttachmentClick = async (event, ticketId, attachmentIndex, originalName) => {
        event.preventDefault();
        event.stopPropagation();
        const token = localStorage.getItem('adminToken');
        if (!token) {
            alert('Authentication token not found. Please login again.');
            return;
        }
        try {
            const response = await fetch(`http://localhost:5000/api/admin/support-tickets/${ticketId}/attachments/${attachmentIndex}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                if (response.status === 401) {
                    alert('Session expired. Please login again.');
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin-login';
                    return;
                }
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.message || 'Failed to open attachment');
                return;
            }
            const blob = await response.blob();
            const fileName = originalName || `attachment-${attachmentIndex + 1}`;
            const objectURL = URL.createObjectURL(blob);
            if (blob.type.startsWith('image/')) {
                const imageWindow = window.open();
                if (imageWindow) {
                    imageWindow.document.write(`<title>${fileName}</title><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;"><img src="${objectURL}" style="max-width:100%;height:auto;"/></body>`);
                } else {
                    window.open(objectURL, '_blank');
                }
            } else {
                const downloadLink = document.createElement('a');
                downloadLink.href = objectURL;
                downloadLink.download = fileName;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
            setTimeout(() => URL.revokeObjectURL(objectURL), 10000);
        } catch (error) {
            alert('Failed to open attachment. Please try again.');
        }
    };

    const handleUpdateTicket = async () => {
        if (updating) return; // Prevent multiple clicks
        
        try {
            setUpdating(true);
            const token = localStorage.getItem('adminToken');
            
            if (!token) {
                alert('Authentication token not found. Please login again.');
                return;
            }
            
            const apiResponse = await fetch(`http://localhost:5000/api/admin/support-tickets/${selectedTicket._id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, response })
            });

            const result = await apiResponse.json();
            
            if (apiResponse.ok && result.success && isMounted) {
                handleCloseModal();
                fetchSupportTickets();
            } else if (isMounted) {
                console.error('Update failed:', result);
                alert(result.message || 'Failed to update support ticket');
            }
        } catch (error) {
            console.error('Error updating support ticket:', error);
            alert('Error updating support ticket. Please try again.');
        } finally {
            if (isMounted) {
                setUpdating(false);
            }
        }
    };

    const handleDeleteTicket = async (ticketId) => {
        if (!window.confirm('Are you sure you want to delete this support ticket? This action cannot be undone.')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('adminToken');
            
            if (!token) {
                alert('Authentication token not found. Please login again.');
                return;
            }
            
            const response = await fetch(`http://localhost:5000/api/admin/support-tickets/${ticketId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                await fetchSupportTickets();
                alert('Support ticket deleted successfully');
            } else {
                console.error('Delete failed:', result);
                alert(result.message || 'Failed to delete support ticket');
            }
        } catch (error) {
            console.error('Error deleting support ticket:', error);
            alert('Error deleting support ticket. Please try again.');
        }
    };

    const getPriorityBadge = (priority) => {
        const variants = {
            low: 'badge-soft-low',
            medium: 'badge-soft-medium',
            high: 'badge-soft-high',
            urgent: 'badge-soft-urgent'
        };
        return (
            <Badge bg="light" className={`badge-soft ${variants[priority] || ''}`}>
                {priority ? priority.replace('-', ' ').toUpperCase() : 'N/A'}
            </Badge>
        );
    };

    const getStatusBadge = (status) => {
        const variants = {
            new: 'badge-soft-status-new',
            'in-progress': 'badge-soft-status-in-progress',
            resolved: 'badge-soft-status-resolved',
            closed: 'badge-soft-status-closed'
        };
        return (
            <Badge bg="light" className={`badge-soft ${variants[status] || ''}`}>
                {status ? status.replace('-', ' ').toUpperCase() : 'N/A'}
            </Badge>
        );
    };

    const getUserTypeBadge = (userType) => {
        const variants = {
            employer: 'badge-soft-user-employer',
            candidate: 'badge-soft-user-candidate',
            guest: 'badge-soft-user-guest'
        };
        return (
            <Badge bg="light" className={`badge-soft ${variants[userType] || ''}`}>
                {userType ? userType.toUpperCase() : 'N/A'}
            </Badge>
        );
    };

    const handleCloseModal = () => {
        if (!isMounted) {
            return;
        }
        setShowModal(false);
        setSelectedTicket(null);
        setResponse('');
        setStatus('');
    };

    return (
        <div className="support-tickets-container admin-container">
            {loading && tickets.length === 0 ? (
                <div className="loading-spinner">
                    <Spinner animation="border" role="status" variant="primary">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </div>
            ) : (
                <Container fluid>
                    <div className="support-header">
                        <div>
                            <h2>Support Tickets</h2>
                            <p>Monitor incoming conversations and respond without leaving the dashboard.</p>
                        </div>
                        <div className="support-header__stats">
                            <div className="support-header__stat">
                                <span className="support-header__stat-value">{stats.total}</span>
                                <span className="support-header__stat-label">Total tickets</span>
                            </div>
                            <div className="support-header__divider" />
                            <div className="support-header__stat">
                                <span className="support-header__stat-value">{stats.unread}</span>
                                <span className="support-header__stat-label">Unread</span>
                            </div>
                        </div>
                    </div>

                    <div className="stats-grid">
                        <div className="stats-card stats-card--total">
                            <span className="stats-card__label">Total</span>
                            <span className="stats-card__value">{stats.total}</span>
                        </div>
                        <div className="stats-card stats-card--unread">
                            <span className="stats-card__label">Unread</span>
                            <span className="stats-card__value">{stats.unread}</span>
                        </div>
                        <div className="stats-card stats-card--new">
                            <span className="stats-card__label">New</span>
                            <span className="stats-card__value">{stats.new}</span>
                        </div>
                        <div className="stats-card stats-card--progress">
                            <span className="stats-card__label">In progress</span>
                            <span className="stats-card__value">{stats.inProgress}</span>
                        </div>
                        <div className="stats-card stats-card--resolved">
                            <span className="stats-card__label">Resolved</span>
                            <span className="stats-card__value">{stats.resolved}</span>
                        </div>
                    </div>

                    <div className="filters-section">
                        <div className="filters-section__header">
                            <h6>Filter tickets</h6>
                            <Button
                                variant="link"
                                className="clear-filters-btn"
                                onClick={() => setFilters({ status: '', userType: '', priority: '' })}
                            >
                                Reset filters
                            </Button>
                        </div>
                        <Row className="g-3">
                            <Col md={4}>
                                <Form.Select
                                    className="filter-select"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <option value="">All status</option>
                                    <option value="new">New</option>
                                    <option value="in-progress">In progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </Form.Select>
                            </Col>
                            <Col md={4}>
                                <Form.Select
                                    className="filter-select"
                                    value={filters.userType}
                                    onChange={(e) => setFilters({ ...filters, userType: e.target.value })}
                                >
                                    <option value="">All user types</option>
                                    <option value="employer">Employer</option>
                                    <option value="candidate">Candidate</option>
                                    <option value="guest">Guest</option>
                                </Form.Select>
                            </Col>
                            <Col md={4}>
                                <Form.Select
                                    className="filter-select"
                                    value={filters.priority}
                                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                                >
                                    <option value="">All priorities</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </Form.Select>
                            </Col>
                        </Row>
                    </div>

                {/* Tickets List */}
                <Row>
                    <Col>
                        <Card className="tickets-card">
                            <div className="tickets-header">
                                <div>
                                    <h5>Support Tickets ({tickets.length})</h5>
                                    <span className="tickets-header__subtitle">Track ticket lifecycle and respond with clarity.</span>
                                </div>
                            </div>
                            <Card.Body className="p-0">
                                {tickets.length === 0 ? (
                                    <div className="empty-state">
                                        <h6>No tickets yet</h6>
                                        <p>Customer support requests will appear here as soon as they are submitted.</p>
                                    </div>
                                ) : (
                                    <div className="table-container">
                                        <table className="table tickets-table">
                                            <thead>
                                                <tr>
                                                    <th>Subject</th>
                                                    <th>Requester</th>
                                                    <th>User type</th>
                                                    <th>Category</th>
                                                    <th>Priority</th>
                                                    <th>Status</th>
                                                    <th>Created</th>
                                                    <th className="text-end">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tickets.map((ticket) => (
                                                    <tr
                                                        key={ticket._id}
                                                        className={`tickets-row ${!ticket.isRead ? 'unread-ticket' : ''}`}
                                                        onClick={() => handleTicketClick(ticket)}
                                                    >
                                                        <td>
                                                            <div className="ticket-subject">
                                                                {ticket.subject}
                                                            </div>
                                                            {!ticket.isRead && <span className="new-badge">Unread</span>}
                                                        </td>
                                                        <td>
                                                            <div className="user-info">
                                                                <div className="user-name">{ticket.actualUserName || ticket.name || 'N/A'}</div>
                                                                <div className="user-email">{ticket.actualUserEmail || ticket.email || 'No email provided'}</div>
                                                            </div>
                                                        </td>
                                                        <td>{getUserTypeBadge(ticket.userType)}</td>
                                                        <td>
                                                            <span className="category-badge">{ticket.category || 'General'}</span>
                                                        </td>
                                                        <td>{getPriorityBadge(ticket.priority)}</td>
                                                        <td>{getStatusBadge(ticket.status)}</td>
                                                        <td>
                                                            <div className="ticket-date">{formatDate(ticket.createdAt)}</div>
                                                        </td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                <Button
                                                                    variant="light"
                                                                    className="view-btn"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleTicketClick(ticket);
                                                                    }}
                                                                >
                                                                    View
                                                                </Button>
                                                                <Button
                                                                    className="delete-btn"
                                                                    size="sm"
                                                                    variant="outline-danger"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTicket(ticket._id);
                                                                    }}
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
            )}

            {/* Ticket Detail Modal */}
            <div id="support-ticket-modal-container" ref={modalContainerRef}>
                <Modal 
                    id="support-ticket-modal"
                    show={showModal} 
                    onHide={handleCloseModal}
                    container={modalContainerRef.current || undefined}
                    backdrop={false}
                    enforceFocus={false}
                    size="lg"
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Ticket details</Modal.Title>
                    </Modal.Header>
                <Modal.Body>
                    {selectedTicket && (
                        <>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <div className="detail-label">Subject</div>
                                    <div>{selectedTicket.subject}</div>
                                </Col>
                                <Col md={6}>
                                    <div className="detail-label">Priority</div>
                                    <div>{getPriorityBadge(selectedTicket.priority)}</div>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <div className="detail-label">Requester</div>
                                    <div>{selectedTicket.actualUserName || selectedTicket.name || 'N/A'}</div>
                                    <small className="text-muted">{selectedTicket.actualUserEmail || selectedTicket.email || 'No email provided'}</small>
                                </Col>
                                <Col md={6}>
                                    <div className="detail-label">User type</div>
                                    <div>{getUserTypeBadge(selectedTicket.userType)}</div>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md={12}>
                                    <div className="detail-label">Category</div>
                                    <div>{selectedTicket.category || 'General'}</div>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col>
                                    <div className="detail-label">Message</div>
                                    <div className="message-box">
                                        {selectedTicket.message}
                                    </div>
                                </Col>
                            </Row>
                            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                                <Row className="mb-3">
                                    <Col>
                                        <div className="detail-label">Attachments</div>
                                        <ul className="attachment-list">
                                            {selectedTicket.attachments.map((attachment, index) => (
                                                <li key={index} className="attachment-item">
                                                    <button 
                                                        className="attachment-link"
                                                        onClick={(event) => handleAttachmentClick(event, selectedTicket._id, index, attachment.originalName)}
                                                    >
                                                        {attachment.originalName}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </Col>
                                </Row>
                            )}
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="detail-label">Status</Form.Label>
                                        <Form.Select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                                            <option value="new">New</option>
                                            <option value="in-progress">In progress</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col>
                                    <Form.Group>
                                        <Form.Label className="detail-label">Admin response</Form.Label>
                                        <Form.Control
                                            className="response-textarea"
                                            as="textarea"
                                            rows={4}
                                            value={response}
                                            onChange={(e) => setResponse(e.target.value)}
                                            placeholder="Share the latest update or resolution for this request"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        className="close-btn" 
                        onClick={handleCloseModal}
                    >
                        Close
                    </Button>
                    <Button 
                        variant="outline-primary"
                        className="update-btn" 
                        onClick={handleUpdateTicket}
                        disabled={updating}
                    >
                        {updating ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Saving
                            </>
                        ) : (
                            'Save changes'
                        )}
                    </Button>
                </Modal.Footer>
                </Modal>
            </div>
        </div>
    );
}

export default AdminSupportTickets;
