

import React, { useState, useEffect } from "react";

function AdminCreditsPage() {
	const [searchTerm, setSearchTerm] = useState("");
	const [assignAllCount, setAssignAllCount] = useState(0);
	const [candidates, setCandidates] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchCandidates();
	}, []);

	const fetchCandidates = async () => {
		try {
			const token = localStorage.getItem('adminToken');
			const response = await fetch('http://localhost:5000/api/admin/candidates', {
				headers: { 'Authorization': `Bearer ${token}` }
			});
			const data = await response.json();
			if (data.success) {
				setCandidates(data.candidates.map(candidate => ({
					...candidate,
					assignCount: 0
				})));
			}
		} catch (error) {
			console.error('Error fetching candidates:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleSearchChange = (e) => {
		setSearchTerm(e.target.value);
	};

	const handleIncrement = (candidateId) => {
		setCandidates(
			candidates.map((candidate) =>
				candidate._id === candidateId
					? {
							...candidate,
							assignCount: candidate.assignCount + 1
					  }
					: candidate
			)
		);
	};

	const handleDecrement = (candidateId) => {
		setCandidates(
			candidates.map((candidate) =>
				candidate._id === candidateId && candidate.assignCount > 0
					? {
							...candidate,
							assignCount: candidate.assignCount - 1
					  }
					: candidate
			)
		);
	};

	const updateCandidateCredits = async (candidateId, creditsToAdd) => {
		try {
			const token = localStorage.getItem('adminToken');
			const response = await fetch(`http://localhost:5000/api/admin/candidates/${candidateId}/credits`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({ creditsToAdd })
			});
			const data = await response.json();
			if (data.success) {
				// Update local state
				setCandidates(candidates.map(candidate => 
					candidate._id === candidateId 
						? { ...candidate, credits: data.candidate.credits, assignCount: 0 }
						: candidate
				));
				alert(`Successfully updated credits for ${data.candidate.name}`);
			} else {
				alert(data.message || 'Failed to update credits');
			}
		} catch (error) {
			console.error('Error updating credits:', error);
			alert('Failed to update credits');
		}
	};

	const handleAssignAllChange = (e) => {
		const value = parseInt(e.target.value) || 0;
		setAssignAllCount(value);
	};

	const assignToAll = async () => {
		if (assignAllCount <= 0) {
			alert('Please enter a valid number of credits');
			return;
		}
		
		const confirmAssign = window.confirm(`Are you sure you want to assign ${assignAllCount} credits to all ${filteredCandidates.length} candidates?`);
		if (!confirmAssign) return;
		
		try {
			const token = localStorage.getItem('adminToken');
			const response = await fetch('http://localhost:5000/api/admin/candidates/credits/bulk', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({ 
					creditsToAdd: assignAllCount,
					candidateIds: filteredCandidates.map(c => c._id)
				})
			});
			const data = await response.json();
			if (data.success) {
				fetchCandidates(); // Refresh data
				setAssignAllCount(0);
				alert(`Successfully assigned ${assignAllCount} credits to ${data.updatedCount} candidates`);
			} else {
				alert(data.message || 'Failed to assign credits');
			}
		} catch (error) {
			console.error('Error assigning credits:', error);
			alert('Failed to assign credits');
		}
	};

	const filteredCandidates = candidates.filter(
		(candidate) =>
			candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (loading) {
		return (
			<div className="container py-4">
				<div className="text-center">
					<div className="spinner-border" role="status">
						<span className="visually-hidden">Loading...</span>
					</div>
					<p className="mt-2">Loading candidates...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container py-4">
			<div className="card shadow-sm border-0 mb-4">
				<div className="card-body">
					<h4 className="fw-bold mb-2">Credit Management</h4>
					<p className="text-muted mb-4">
						Assign and manage credits for candidates
					</p>

					<div className="row align-items-end mb-4">
						<div className="col-md-6 mb-2">
							<input
								type="text"
								className="form-control"
								placeholder="Search candidates..."
								value={searchTerm}
								onChange={handleSearchChange}
							/>
						</div>
						<div className="col-md-6 d-flex justify-content-end gap-2">
							<input
								type="number"
								className="form-control"
								style={{ width: "100px" }}
								value={assignAllCount}
								onChange={handleAssignAllChange}
							/>
							<button className="btn btn-dark" onClick={assignToAll}>
								+ Assign to All
							</button>
						</div>
					</div>

					{filteredCandidates.length === 0 ? (
						<p className="text-muted">No candidates found.</p>
					) : (
						<div className="list-group">
							{filteredCandidates.map((candidate) => (
								<div
									key={candidate._id}
									className="list-group-item list-group-item-light rounded mb-3 shadow-sm d-flex justify-content-between align-items-center"
								>
									<div>
										<h6 className="mb-1 fw-semibold">{candidate.name}</h6>
										<small className="text-muted">{candidate.email}</small>
										{candidate.registrationMethod === 'placement' && (
											<span className="badge bg-info ms-2">Placement</span>
										)}
									</div>
									<div className="d-flex align-items-center gap-3">
										<span className={`badge px-3 py-2 ${candidate.credits > 0 ? 'bg-success' : 'bg-danger'}`}>
											<i className="fa fa-credit-card me-1" />
											{candidate.credits || 0} credits
										</span>
										<div className="input-group" style={{ width: "140px" }}>
											<button
												className="btn btn-outline-secondary"
												onClick={() => handleDecrement(candidate._id)}
											>
												-
											</button>
											<input
												type="text"
												className="form-control text-center"
												value={candidate.assignCount}
												readOnly
											/>
											<button
												className="btn btn-outline-secondary"
												onClick={() => handleIncrement(candidate._id)}
											>
												+
											</button>
										</div>
										<button
											className="btn btn-primary btn-sm"
											onClick={() => updateCandidateCredits(candidate._id, candidate.assignCount)}
											disabled={candidate.assignCount === 0}
										>
											Update
										</button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default AdminCreditsPage;


