import React, { useState, useEffect } from "react";
import { api } from "../../../../../utils/api";

function SectionCanPersonalDetail({ profile }) {
    const [formData, setFormData] = useState({
        dateOfBirth: '',
        gender: '',
        location: '',
        fatherName: '',
        motherName: '',
        residentialAddress: '',
        permanentAddress: '',
        correspondenceAddress: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (profile) {
            setFormData({
                dateOfBirth: profile.dateOfBirth || '',
                gender: profile.gender || '',
                location: profile.location || '',
                fatherName: profile.fatherName || '',
                motherName: profile.motherName || '',
                residentialAddress: profile.residentialAddress || '',
                permanentAddress: profile.permanentAddress || '',
                correspondenceAddress: profile.correspondenceAddress || ''
            });
        }
    }, [profile]);

    const validateField = (field, value) => {
        const newErrors = { ...errors };
        
        switch (field) {
            case 'dateOfBirth':
                if (!value || !value.trim()) {
                    newErrors.dateOfBirth = 'Date of birth is required';
                } else {
                    const birthDate = new Date(value);
                    const today = new Date();
                    const age = today.getFullYear() - birthDate.getFullYear();
                    if (age < 16 || age > 65) {
                        newErrors.dateOfBirth = 'Age must be between 16 and 65 years';
                    } else {
                        delete newErrors.dateOfBirth;
                    }
                }
                break;
            
            case 'fatherName':
            case 'motherName':
                if (!value || !value.trim()) {
                    newErrors[field] = 'This field is required';
                } else if (value.length < 2 || value.length > 50) {
                    newErrors[field] = 'Name must be between 2 and 50 characters';
                } else if (!/^[a-zA-Z\s]+$/.test(value)) {
                    newErrors[field] = 'Name can only contain letters and spaces';
                } else {
                    delete newErrors[field];
                }
                break;
            
            case 'residentialAddress':
            case 'permanentAddress':
            case 'correspondenceAddress':
                if (!value || !value.trim()) {
                    newErrors[field] = 'This field is required';
                } else if (value.length > 200) {
                    newErrors[field] = 'Address cannot exceed 200 characters';
                } else {
                    delete newErrors[field];
                }
                break;
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Auto-save after a short delay
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = setTimeout(() => {
            autoSave();
        }, 1000);
    };

    const autoSave = async () => {
        try {
            const updateData = {
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                location: formData.location,
                fatherName: formData.fatherName,
                motherName: formData.motherName,
                residentialAddress: formData.residentialAddress,
                permanentAddress: formData.permanentAddress,
                correspondenceAddress: formData.correspondenceAddress
            };
            await api.updateCandidateProfile(updateData);
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const updateData = {
                dateOfBirth: formData.dateOfBirth,
                gender: formData.gender,
                location: formData.location,
                fatherName: formData.fatherName.trim(),
                motherName: formData.motherName.trim(),
                residentialAddress: formData.residentialAddress.trim(),
                permanentAddress: formData.permanentAddress.trim(),
                correspondenceAddress: formData.correspondenceAddress.trim()
            };
            
            const response = await api.updateCandidateProfile(updateData);
            if (response.success) {
                alert('Profile updated successfully!');
                window.dispatchEvent(new CustomEvent('profileUpdated'));
            }
        } catch (error) {
            alert('Failed to update profile: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="panel-heading wt-panel-heading p-a20 panel-heading-with-btn">
                <h4 className="panel-tittle m-a0">
                    <i className="fa fa-id-card site-text-primary me-2"></i>
                    Personal Details
                </h4>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
                <div className="panel panel-default">
                    <div className="panel-body wt-panel-body p-a20 m-b30">
                        <div className="row">
                            <div className="col-md-6">
                                <label><i className="fa fa-calendar me-1"></i> Date of Birth *</label>
                                <input
                                    className={`form-control ${errors.dateOfBirth ? 'is-invalid' : ''}`}
                                    type="date"
                                    value={formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : ''}
                                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                    required
                                />
                                {errors.dateOfBirth && <div className="invalid-feedback">{errors.dateOfBirth}</div>}
                            </div>

                            <div className="col-md-6">
                                <label><i className="fa fa-venus-mars me-1"></i> Gender *</label>
                                <select 
                                    className="form-control"
                                    value={formData.gender}
                                    onChange={(e) => handleInputChange('gender', e.target.value)}
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>

                            <div className="col-md-6">
                                <label><i className="fa fa-male me-1"></i> Father's / Husband's Name *</label>
                                <input
                                    className={`form-control ${errors.fatherName ? 'is-invalid' : ''}`}
                                    type="text"
                                    placeholder="Enter name"
                                    value={formData.fatherName}
                                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                                    required
                                />
                                {errors.fatherName && <div className="invalid-feedback">{errors.fatherName}</div>}
                            </div>

                            <div className="col-md-6">
                                <label><i className="fa fa-female me-1"></i> Mother's Name *</label>
                                <input
                                    className={`form-control ${errors.motherName ? 'is-invalid' : ''}`}
                                    type="text"
                                    placeholder="Enter name"
                                    value={formData.motherName}
                                    onChange={(e) => handleInputChange('motherName', e.target.value)}
                                    required
                                />
                                {errors.motherName && <div className="invalid-feedback">{errors.motherName}</div>}
                            </div>

                            <div className="col-md-12">
                                <label><i className="fa fa-home me-1"></i> Residential Address *</label>
                                <textarea
                                    className={`form-control ${errors.residentialAddress ? 'is-invalid' : ''}`}
                                    rows={2}
                                    placeholder="Enter address"
                                    value={formData.residentialAddress}
                                    onChange={(e) => handleInputChange('residentialAddress', e.target.value)}
                                    required
                                ></textarea>
                                {errors.residentialAddress && <div className="invalid-feedback">{errors.residentialAddress}</div>}
                            </div>

                            <div className="col-md-12">
                                <label><i className="fa fa-map-marker me-1"></i> Permanent Address *</label>
                                <textarea
                                    className={`form-control ${errors.permanentAddress ? 'is-invalid' : ''}`}
                                    rows={2}
                                    placeholder="Enter permanent address"
                                    value={formData.permanentAddress}
                                    onChange={(e) => handleInputChange('permanentAddress', e.target.value)}
                                    required
                                ></textarea>
                                {errors.permanentAddress && <div className="invalid-feedback">{errors.permanentAddress}</div>}
                            </div>

                            <div className="col-md-12">
                                <label><i className="fa fa-envelope me-1"></i> Correspondence Address *</label>
                                <textarea
                                    className={`form-control ${errors.correspondenceAddress ? 'is-invalid' : ''}`}
                                    rows={2}
                                    placeholder="Enter correspondence address"
                                    value={formData.correspondenceAddress}
                                    onChange={(e) => handleInputChange('correspondenceAddress', e.target.value)}
                                    required
                                ></textarea>
                                {errors.correspondenceAddress && <div className="invalid-feedback">{errors.correspondenceAddress}</div>}
                            </div>
                        </div>

                        <div className="text-left mt-4">
                            <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={loading || Object.keys(errors).length > 0}>
                                <i className="fa fa-save me-1"></i>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                            {Object.keys(errors).length > 0 && (
                                <div className="text-danger mt-2">
                                    <small><i className="fa fa-exclamation-triangle me-1"></i>Please fix the validation errors above</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}

export default SectionCanPersonalDetail;