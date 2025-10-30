import JobZImage from "../../../../common/jobz-img";
import SectionEmployersCandidateSidebar from "../../sections/common/section-emp-can-sidebar";
import SectionShareProfile from "../../sections/common/section-share-profile";
import SectionOfficePhotos1 from "../../sections/common/section-office-photos1";
import SectionOfficeVideo1 from "../../sections/common/section-office-video1";
import SectionAvailableJobsList from "../../sections/employers/detail/section-available-jobs-list";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { loadScript } from "../../../../../globals/constants";

function EmployersDetail1Page() {
    const { id } = useParams();
    const [employer, setEmployer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({ averageRating: 0, reviewCount: 0 });
    const [reviewForm, setReviewForm] = useState({
        reviewerName: '',
        reviewerEmail: '',
        rating: 0,
        description: '',
        image: null
    });

    const [submittedReviews, setSubmittedReviews] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(()=>{
        loadScript("js/custom.js");
        // Check if user is logged in
        const token = localStorage.getItem('candidateToken') || localStorage.getItem('userToken');
        setIsLoggedIn(!!token);
        
        if (id) {
            fetchEmployerDetails();
            fetchReviews();
            fetchSubmittedReviews();
        }
    }, [id]);

    const fetchSubmittedReviews = async () => {
        const email = localStorage.getItem('reviewerEmail');
        if (!email) return;
        
        try {
            const response = await fetch(`http://localhost:5000/api/public/employers/${id}/submitted-reviews?email=${email}`);
            const data = await response.json();
            if (data.success) {
                setSubmittedReviews(data.reviews);
                
            }
        } catch (error) {
            
        }
    };

    const fetchEmployerDetails = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/public/employers/${id}`);
            const data = await response.json();
            
            if (data.success) {
                setEmployer(data.profile);
                
            } else {
                
            }
        } catch (error) {
            
        } finally {
            setLoading(false);
        }
    };

    const fetchReviews = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/public/employers/${id}/reviews`);
            const data = await response.json();
            if (data.success) {
                setReviews(data.reviews);
                setReviewStats({
                    averageRating: data.averageRating,
                    reviewCount: data.reviewCount
                });
            }
        } catch (error) {
            
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const response = await fetch(`http://localhost:5000/api/public/employers/${id}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reviewForm)
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('reviewerEmail', reviewForm.reviewerEmail);
                // Refresh submitted reviews from database
                await fetchSubmittedReviews();
                setReviewForm({
                    reviewerName: '',
                    reviewerEmail: '',
                    rating: 0,
                    description: '',
                    image: null
                });
                // Switch to Review Post tab
                setTimeout(() => {
                    const reviewPostTab = document.querySelector('a[href="#review-post"]');
                    if (reviewPostTab) reviewPostTab.click();
                }, 1000);
            } else {
                alert(data.message || 'Error submitting review');
            }
        } catch (error) {
            
            alert('Error submitting review');
        }
    };

    const renderStars = (rating, interactive = false, onStarClick = null) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <span
                    key={i}
                    className={`star ${i <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
                    onClick={interactive ? () => onStarClick(i) : undefined}
                    style={{
                        color: i <= rating ? '#ffc107' : '#e4e5e9',
                        fontSize: '20px',
                        cursor: interactive ? 'pointer' : 'default',
                        marginRight: '2px'
                    }}
                >
                    ★
                </span>
            );
        }
        return stars;
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setReviewForm({...reviewForm, image: event.target.result});
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) {
        return <div className="text-center p-5">Loading employer details...</div>;
    }

    if (!employer) {
        return <div className="text-center p-5">Employer not found</div>;
    }

    return (
			<>
				<div className="section-full  p-t120 p-b90 bg-white">
					<div className="container">
						<div className="section-content">
							<div className="row d-flex justify-content-center">
								<div className="col-lg-8 col-md-12">
									{/* Candidate detail START */}
									<div className="cabdidate-de-info">
										<div className="twm-employer-self-wrap">
											<div className="twm-employer-self-info">
												<div className="twm-employer-self-top">
													<div className="twm-media-bg">
														{employer.coverImage ? (
															<img src={employer.coverImage} alt="Company Cover" />
														) : (
															<JobZImage src="images/employer-bg.jpg" alt="#" />
														)}
													</div>
													<div className="twm-mid-content">
														<div className="twm-media">
															{employer.logo ? (
																<img src={employer.logo} alt="Company Logo" />
															) : (
																<JobZImage src="images/jobs-company/pic1.jpg" alt="#" />
															)}
														</div>
														<h4 className="twm-job-title">
															{employer.employerId?.companyName || employer.companyName || 'Company Name'}
														</h4>
														<p className="twm-employer-address">
															<i className="feather-map-pin" />
															{employer.corporateAddress || employer.location || 'Location not specified'}
														</p>
														{/* <a href="https://themeforest.net/user/thewebmax/portfolio" className="twm-employer-websites site-text-primary">https://thewebmax.com</a> */}
														{/* <div className="twm-employer-self-bottom">
                                                        <a href="#" className="site-button outline-primary">Add Review</a>
                                                        <a href="#" className="site-button">Follow Us</a>
                                                    </div> */}
													</div>
												</div>
											</div>
										</div>

										{/* Tabs Navigation */}
										<ul className="nav nav-tabs mt-4" role="tablist">
											<li className="nav-item">
												<a
													className="nav-link active"
													data-bs-toggle="tab"
													href="#overview"
													role="tab"
												>
													Overview
												</a>
											</li>

											<li className="nav-item">
												<a
													className="nav-link"
													data-bs-toggle="tab"
													href="#jobs"
													role="tab"
												>
													Jobs
												</a>
											</li>
											
											{isLoggedIn && (
												<li className="nav-item">
													<a
														className="nav-link"
														data-bs-toggle="tab"
														href="#reviews"
														role="tab"
													>
														ADD Reviews
													</a>
												</li>
											)}
											
											<li className="nav-item">
												<a
													className="nav-link"
													data-bs-toggle="tab"
													href="#review-post"
													role="tab"
												>
													Review Posted
												</a>
											</li>
											
											<li className="nav-item">
												<a
													className="nav-link"
													data-bs-toggle="tab"
													href="#gallery"
													role="tab"
												>
													Gallery
												</a>
											</li>
										</ul>

										{/* Tabs Content */}
										<div className="tab-content p-t20">
											<div
												className="tab-pane fade show active"
												id="overview"
												role="tabpanel"
											>
												<h4 className="twm-s-title">About Company</h4>
												<p>
													{employer.description || employer.companyDescription || 'No company description available.'}
												</p>

												<h4 className="twm-s-title">Why Join Us</h4>
												<p>
													{employer.whyJoinUs || 'No information available about why to join this company.'}
												</p>


											</div>

											<div className="tab-pane fade" id="jobs" role="tabpanel">
												<SectionAvailableJobsList employerId={id} />
											</div>
											
											<div className="tab-pane fade" id="gallery" role="tabpanel">
												<h4 className="twm-s-title">Company Gallery</h4>
												{employer.gallery && employer.gallery.length > 0 ? (
													<div className="d-flex flex-wrap gap-3">
														{employer.gallery.map((image, index) => (
															<div key={image._id || index} className="gallery-item" style={{width: '200px', height: '200px'}}>
																<img 
																	src={image.url} 
																	alt={`Gallery ${index + 1}`}
																	className="img-fluid rounded"
																	style={{
																		width: '100%', 
																		height: '100%', 
																		objectFit: 'cover',
																		cursor: 'pointer',
																		transition: 'transform 0.3s ease',
																		border: '1px solid #ddd'
																	}}
																	onClick={() => window.open(image.url, '_blank')}
																	onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
																	onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
																/>
															</div>
														))}
													</div>
												) : (
													<div className="text-center p-4">
														<p className="text-muted">No gallery images available.</p>
													</div>
												)}
											</div>
											
											{isLoggedIn && (
												<div className="tab-pane fade" id="reviews" role="tabpanel">
													<div className="row justify-content-center">
														<div className="col-md-8">
															<h4 className="twm-s-title">Add Your Review</h4>
														<form onSubmit={handleReviewSubmit} className="review-form">
															<div className="mb-3">
																<label className="form-label">Your Name *</label>
																<input
																	type="text"
																	className="form-control"
																	value={reviewForm.reviewerName}
																	onChange={(e) => setReviewForm({...reviewForm, reviewerName: e.target.value})}
																	required
																/>
															</div>
															
															<div className="mb-3">
																<label className="form-label">Your Email *</label>
																<input
																	type="email"
																	className="form-control"
																	value={reviewForm.reviewerEmail}
																	onChange={(e) => setReviewForm({...reviewForm, reviewerEmail: e.target.value})}
																	required
																/>
															</div>
															
															<div className="mb-3">
																<label className="form-label">Rating *</label>
																<div className="rating-input">
																	{renderStars(reviewForm.rating, true, (rating) => setReviewForm({...reviewForm, rating}))}
																</div>
															</div>
															
															<div className="mb-3">
																<label className="form-label">Your Review *</label>
																<textarea
																	className="form-control"
																	rows="4"
																	value={reviewForm.description}
																	onChange={(e) => setReviewForm({...reviewForm, description: e.target.value})}
																	placeholder="Share your experience with this company..."
																	required
																/>
															</div>
															
															<div className="mb-3">
																<label className="form-label">Add Image (Optional)</label>
																<input
																	type="file"
																	className="form-control"
																	accept="image/*"
																	onChange={handleImageUpload}
																/>
																{reviewForm.image && (
																	<div className="mt-2">
																		<img 
																			src={reviewForm.image} 
																			alt="Preview" 
																			style={{width: '100px', height: '100px', objectFit: 'cover'}} 
																			className="rounded"
																		/>
																	</div>
																)}
															</div>
															
															<button 
																type="submit" 
																className="btn btn-primary"
															>
																Submit Review
															</button>
														</form>
													</div>
												</div>
											</div>
											)}
											
											<div className="tab-pane fade" id="review-post" role="tabpanel">
												<h4 className="twm-s-title">Your Submitted Reviews</h4>
												{submittedReviews.length > 0 ? (
													<div className="submitted-reviews-list">
														{submittedReviews.map((review, index) => (
															<div key={review._id || index} className="card shadow-sm mb-4" style={{border: '1px solid #e3e6f0'}}>
																<div className="card-header bg-light d-flex justify-content-between align-items-center" style={{borderBottom: '1px solid #e3e6f0'}}>
																	<div className="d-flex align-items-center">
																		<div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px'}}>
																			<span className="text-white fw-bold">{review.reviewerName.charAt(0).toUpperCase()}</span>
																		</div>
																		<div>
																			<h6 className="mb-0 fw-bold">{review.reviewerName}</h6>
																			<small className="text-muted">{new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</small>
																		</div>
																	</div>
																	<span className="badge bg-success px-3 py-2" style={{fontSize: '0.75rem'}}>✓ Published</span>
																</div>
																<div className="card-body p-4">
																	{review.image && (
																		<div className="mb-3">
																			<h6 className="fw-semibold mb-2">Attached Image:</h6>
																			<img 
																				src={review.image} 
																				alt="Review" 
																				style={{width: '80px', height: '80px', objectFit: 'cover', cursor: 'pointer'}} 
																				className="rounded-circle border"
																				onClick={() => window.open(review.image, '_blank')}
																			/>
																		</div>
																	)}
																	<div className="mb-3">
																		<div className="d-flex align-items-center mb-2">
																			<span className="me-2 fw-semibold">Rating:</span>
																			{renderStars(review.rating)}
																			<span className="ms-2 text-muted">({review.rating}/5)</span>
																		</div>
																	</div>
																	<div className="mb-3">
																		<h6 className="fw-semibold mb-2">Review:</h6>
																		<p className="text-dark mb-0" style={{lineHeight: '1.6'}}>{review.description}</p>
																	</div>
																</div>
															</div>
														))}
													</div>
												) : (
													<div className="text-center p-4">
														<p className="text-muted">You haven't submitted any reviews yet.</p>
														<p>Go to the Reviews tab to submit your first review!</p>
													</div>
												)}
											</div>
										</div>

										<SectionShareProfile />

										<div className="twm-two-part-section">
											<div className="row">
												<div className="col-lg-6 col-md-6">
													{/* <SectionOfficePhotos1 /> */}
												</div>
												<div className="col-lg-6 col-md-6">
													{/* <SectionOfficeVideo1 /> */}
												</div>
											</div>
										</div>

										{/* <SectionAvailableJobsList />  */}
									</div>
								</div>

								<div className="col-lg-4 col-md-12 rightSidebar">
									<SectionEmployersCandidateSidebar type="1" employer={employer} />
								</div>
							</div>
						</div>
					</div>
				</div>
			</>
		);
}

export default EmployersDetail1Page;
