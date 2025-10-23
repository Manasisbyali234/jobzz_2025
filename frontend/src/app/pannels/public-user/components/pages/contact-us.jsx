import { useState } from 'react';

function ContactUsPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone is required';
        } else if (!/^[\d\s\+\-\(\)]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Phone number is invalid';
        }
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        try {
            const response = await fetch('/api/public/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                setIsSubmitted(true);
                setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
            } else {
                const data = await response.json();
                setErrors({ submit: data.message || 'Failed to submit form' });
            }
        } catch (error) {
            setErrors({ submit: 'Network error. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <>
                <div className="section-full twm-contact-one">
                    <div className="section-content">
                        <div className="container">
                            <div className="contact-one-inner">
                                <div className="row justify-content-center">
                                    <div className="col-lg-8 col-md-10">
                                        <div className="contact-form-outer text-center">
                                            <div className="section-head left wt-small-separator-outer">
                                                <h2 className="wt-title text-success">✓ Submitted Successfully!</h2>
                                                <p>Thank you for contacting us. We have received your message and will get back to you as soon as possible.</p>
                                                <button 
                                                    onClick={() => setIsSubmitted(false)} 
                                                    className="site-button mt-3"
                                                >
                                                    Send Another Message
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="section-full twm-contact-one">
                <div className="section-content">
                    <div className="container">
                        {/* CONTACT FORM*/}
                        <div className="contact-one-inner">
                            <div className="row">
                                <div className="col-lg-6 col-md-12">
                                    <div className="contact-form-outer">
                                        {/* title="" START*/}
                                        <div className="section-head left wt-small-separator-outer">
                                            <h2 className="wt-title">Send Us a Message</h2>
                                            <p>Feel free to contact us and we will get back to you as soon as we can.</p>
                                        </div>
                                        {/* title="" END*/}
                                        <form className="cons-contact-form" onSubmit={handleSubmit}>
                                            {errors.submit && (
                                                <div className="alert alert-danger mb-3">{errors.submit}</div>
                                            )}
                                            <div className="row">
                                                <div className="col-lg-6 col-md-6">
                                                    <div className="form-group mb-3">
                                                        <input 
                                                            name="name" 
                                                            type="text" 
                                                            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                            placeholder="Name" 
                                                            value={formData.name}
                                                            onChange={handleChange}
                                                        />
                                                        {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                                    </div>
                                                </div>
                                                <div className="col-lg-6 col-md-6">
                                                    <div className="form-group mb-3">
                                                        <input 
                                                            name="email" 
                                                            type="email" 
                                                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                                            placeholder="Email" 
                                                            value={formData.email}
                                                            onChange={handleChange}
                                                        />
                                                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                                                    </div>
                                                </div>
                                                <div className="col-lg-6 col-md-6">
                                                    <div className="form-group mb-3">
                                                        <input 
                                                            name="phone" 
                                                            type="tel" 
                                                            className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                                                            placeholder="Phone" 
                                                            value={formData.phone}
                                                            onChange={handleChange}
                                                        />
                                                        {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                                                    </div>
                                                </div>
                                                <div className="col-lg-6 col-md-6">
                                                    <div className="form-group mb-3">
                                                        <input 
                                                            name="subject" 
                                                            type="text" 
                                                            className="form-control" 
                                                            placeholder="Subject" 
                                                            value={formData.subject}
                                                            onChange={handleChange}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-lg-12">
                                                    <div className="form-group mb-3">
                                                        <textarea 
                                                            name="message" 
                                                            className={`form-control ${errors.message ? 'is-invalid' : ''}`}
                                                            rows={3} 
                                                            placeholder="Message" 
                                                            value={formData.message}
                                                            onChange={handleChange}
                                                        />
                                                        {errors.message && <div className="invalid-feedback">{errors.message}</div>}
                                                    </div>
                                                </div>
                                                <div className="col-md-12">
                                                    <button 
                                                        type="submit" 
                                                        className="site-button"
                                                        disabled={isSubmitting}
                                                    >
                                                        {isSubmitting ? 'Submitting...' : 'Submit Now'}
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                                <div className="col-lg-6 col-md-12">
                                    <div className="contact-info-wrap">
                                        <div className="contact-info">
                                            <div className="contact-info-section">
                                                <div className="c-info-column">
                                                    <div className="c-info-icon"><i className=" fas fa-map-marker-alt" /></div>
                                                    <h3 className="twm-title">In the bay area?</h3>
                                                    <p>#56 Sunset Blvd Sahakar Nagar, Bengaluru, 560902</p>
                                                </div>
                                                <div className="c-info-column">
                                                    <div className="c-info-icon custome-size"><i className="fas fa-mobile-alt" /></div>
                                                    <h3 className="twm-title">Feel free to contact us</h3>
                                                    <p><a href="tel:+919876543210">+91 9876543210</a></p>
                                                    <p><a href="tel:+919807623145">+91 9807623145</a></p>
                                                </div>
                                                <div className="c-info-column">
                                                    <div className="c-info-icon"><i className="fas fa-envelope" /></div>
                                                    <h3 className="twm-title">Support</h3>
                                                    <p><a href="mailto:metromindz@gmail.com" style={{color: '#1976d2 !important', textDecoration: 'underline !important', cursor: 'pointer !important', pointerEvents: 'auto !important', position: 'relative', zIndex: 999}}>metromindz@gmail.com</a></p>
                                                    <p><a href="mailto:support12@gmail.com" style={{color: '#1976d2 !important', textDecoration: 'underline !important', cursor: 'pointer !important', pointerEvents: 'auto !important', position: 'relative', zIndex: 999}}>support12@gmail.com</a></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="gmap-outline">
                <div className="google-map">
                    <div style={{ width: '100%' }}>
                        <iframe height={460} src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3304.8534521658976!2d-118.2533646842856!3d34.073270780600225!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80c2c6fd9829c6f3%3A0x6ecd11bcf4b0c23a!2s1363%20Sunset%20Blvd%2C%20Los%20Angeles%2C%20CA%2090026%2C%20USA!5e0!3m2!1sen!2sin!4v1620815366832!5m2!1sen!2sin" />
                    </div>
                </div>
            </div>
        </>
    )
}

export default ContactUsPage;
