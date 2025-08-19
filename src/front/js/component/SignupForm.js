import React, { useState, useContext } from "react";
import { Context } from "../store/appContext";
import { Link, useNavigate } from "react-router-dom";
import '../../styles/SignupForm.css';

const SignupForm = () => {
    const { actions } = useContext(Context);
    const navigate = useNavigate();

    // Form State with additional fields
    const [formData, setFormData] = useState({
        // Basic Info
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        phoneNumber: "",
        dateOfBirth: "",
        
        // Profile Info
        role: "Explorer",
        artistName: "",
        stageName: "",
        bio: "",
        website: "",
        socialMedia: {
            instagram: "",
            twitter: "",
            youtube: "",
            spotify: "",
            soundcloud: ""
        },
        
        // Professional Info
        industry: "",
        experienceLevel: "",
        genres: [],
        instruments: [],
        recordLabel: "",
        manager: "",
        ownRights: "yes",
        
        // Location
        country: "",
        state: "",
        city: "",
        timezone: "",
        
        // Preferences
        marketingEmails: true,
        notifications: {
            email: true,
            push: true,
            sms: false
        },
        
        // Files
        profilePicture: null,
        sampleTrack: null,
        pressKit: null,
        
        // Legal
        termsAccepted: false,
        privacyAccepted: false,
        ageVerification: false
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Handle file uploads
    const handleFileChange = (e) => {
        const { name, files } = e.target;
        setFormData(prev => ({ ...prev, [name]: files[0] }));
    };

    // Handle array fields (genres, instruments)
    const handleArrayChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(value) 
                ? prev[field].filter(item => item !== value)
                : [...prev[field], value]
        }));
    };

    // Basic validation
    const validateForm = () => {
        const newErrors = {};

        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Valid email is required";
        }
        if (!formData.username || formData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        }
        if (!formData.password || formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
        }
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords don't match";
        }
        if (!formData.firstName) {
            newErrors.firstName = "First name is required";
        }
        if (!formData.lastName) {
            newErrors.lastName = "Last name is required";
        }
        if (!formData.dateOfBirth) {
            newErrors.dateOfBirth = "Date of birth is required";
        }
        if (!formData.termsAccepted) {
            newErrors.termsAccepted = "You must accept the terms";
        }
        if (!formData.privacyAccepted) {
            newErrors.privacyAccepted = "You must accept the privacy policy";
        }
        if (!formData.ageVerification) {
            newErrors.ageVerification = "Age verification is required";
        }

        // Role-specific validation
        if (formData.role !== "Explorer") {
            if (!formData.artistName && !formData.stageName) {
                newErrors.artistName = "Professional name is required for this role";
            }
            if (!formData.industry) {
                newErrors.industry = "Industry is required for this role";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSignup = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        
        try {
            const submitData = new FormData();

            // Add all form data
            Object.keys(formData).forEach((key) => {
                if (key === 'socialMedia' || key === 'notifications') {
                    submitData.append(key, JSON.stringify(formData[key]));
                } else if (Array.isArray(formData[key])) {
                    submitData.append(key, JSON.stringify(formData[key]));
                } else if (formData[key] && typeof formData[key] !== 'object') {
                    submitData.append(key, formData[key]);
                } else if (formData[key] instanceof File) {
                    submitData.append(key, formData[key]);
                }
            });

            const data = await actions.signup(submitData);

            if (data.message) {
                alert("Account created successfully! Please check your email for verification.");
                navigate("/login");
            } else {
                alert("Signup failed: " + (data.error || "Unknown error"));
            }
        } catch (error) {
            alert("Signup failed: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextStep = () => {
        if (currentStep < 4) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    return (
        <div className="signup-container">
            <div className="signup-header">
                <h1>Create Your StreampireX Account</h1>
                
                {/* Progress Bar */}
                <div className="progress-bar">
                    {[1, 2, 3, 4].map(step => (
                        <React.Fragment key={step}>
                            <div className="progress-step">
                                <div className={`step-circle ${currentStep >= step ? 'active' : ''}`}>
                                    {step}
                                </div>
                                <span>
                                    {step === 1 && 'Basic Info'}
                                    {step === 2 && 'Professional'}
                                    {step === 3 && 'Files & Location'}
                                    {step === 4 && 'Legal'}
                                </span>
                            </div>
                            {step < 4 && (
                                <div className={`progress-line ${currentStep > step ? 'active' : ''}`}></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSignup}>
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                    <div className="form-step">
                        <h3>Basic Information</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>First Name *</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    className={errors.firstName ? 'error' : ''}
                                    required
                                />
                                {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Last Name *</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    className={errors.lastName ? 'error' : ''}
                                    required
                                />
                                {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Email Address *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={errors.email ? 'error' : ''}
                                required
                            />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>

                        <div className="form-group">
                            <label>Username *</label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                className={errors.username ? 'error' : ''}
                                placeholder="At least 3 characters"
                                required
                            />
                            {errors.username && <span className="error-text">{errors.username}</span>}
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Password *</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className={errors.password ? 'error' : ''}
                                    placeholder="At least 8 characters"
                                    required
                                />
                                {errors.password && <span className="error-text">{errors.password}</span>}
                            </div>
                            
                            <div className="form-group">
                                <label>Confirm Password *</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className={errors.confirmPassword ? 'error' : ''}
                                    required
                                />
                                {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    placeholder="+1 (555) 123-4567"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Date of Birth *</label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                    className={errors.dateOfBirth ? 'error' : ''}
                                    required
                                />
                                {errors.dateOfBirth && <span className="error-text">{errors.dateOfBirth}</span>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Professional Information */}
                {currentStep === 2 && (
                    <div className="form-step">
                        <h3>Professional Information</h3>
                        
                        <div className="form-group">
                            <label>Role *</label>
                            <select name="role" value={formData.role} onChange={handleChange}>
                                <option value="Explorer">Explorer</option>
                                <option value="DJ">DJ</option>
                                <option value="Musician">Musician</option>
                                <option value="Producer">Producer</option>
                                <option value="Podcaster">Podcaster</option>
                                <option value="Radio Host">Radio Host</option>
                                <option value="Sound Engineer">Sound Engineer</option>
                                <option value="Music Journalist">Music Journalist</option>
                                <option value="A&R Representative">A&R Representative</option>
                                <option value="Label Executive">Label Executive</option>
                                <option value="Music Educator">Music Educator</option>
                                <option value="Audio Technician">Audio Technician</option>
                            </select>
                        </div>

                        {formData.role !== "Explorer" && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Professional Name</label>
                                        <input
                                            type="text"
                                            name="artistName"
                                            value={formData.artistName}
                                            onChange={handleChange}
                                            className={errors.artistName ? 'error' : ''}
                                            placeholder="Your professional name"
                                        />
                                        {errors.artistName && <span className="error-text">{errors.artistName}</span>}
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Industry *</label>
                                        <select 
                                            name="industry" 
                                            value={formData.industry} 
                                            onChange={handleChange}
                                            className={errors.industry ? 'error' : ''}
                                        >
                                            <option value="">Select Industry</option>
                                            <option value="Music">Music</option>
                                            <option value="Podcasting">Podcasting</option>
                                            <option value="Radio Broadcasting">Radio Broadcasting</option>
                                            <option value="Audio Production">Audio Production</option>
                                            <option value="Film & TV">Film & TV</option>
                                            <option value="Gaming">Gaming</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        {errors.industry && <span className="error-text">{errors.industry}</span>}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        placeholder="Tell us about yourself and your work..."
                                        rows="4"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Website/Portfolio</label>
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        placeholder="https://yourwebsite.com"
                                    />
                                </div>

                                {(formData.role === "Musician" || formData.role === "Producer" || formData.role === "DJ") && (
                                    <div className="form-group">
                                        <label>Do you own the rights to your music? *</label>
                                        <div className="radio-group">
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="ownRights"
                                                    value="yes"
                                                    checked={formData.ownRights === "yes"}
                                                    onChange={handleChange}
                                                />
                                                Yes, I own all rights
                                            </label>
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="ownRights"
                                                    value="partial"
                                                    checked={formData.ownRights === "partial"}
                                                    onChange={handleChange}
                                                />
                                                Partial ownership
                                            </label>
                                            <label className="radio-label">
                                                <input
                                                    type="radio"
                                                    name="ownRights"
                                                    value="no"
                                                    checked={formData.ownRights === "no"}
                                                    onChange={handleChange}
                                                />
                                                No, I don't own rights
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Step 3: Files & Location */}
                {currentStep === 3 && (
                    <div className="form-step">
                        <h3>Files & Location</h3>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label>Country</label>
                                <select name="country" value={formData.country} onChange={handleChange}>
                                    <option value="">Select Country</option>
                                    <option value="US">United States</option>
                                    <option value="CA">Canada</option>
                                    <option value="UK">United Kingdom</option>
                                    <option value="AU">Australia</option>
                                    <option value="DE">Germany</option>
                                    <option value="FR">France</option>
                                    <option value="BR">Brazil</option>
                                    <option value="MX">Mexico</option>
                                    <option value="JP">Japan</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="Your city"
                                />
                            </div>
                        </div>

                        <div className="file-uploads">
                            <div className="form-group">
                                <label>Profile Picture</label>
                                <input 
                                    type="file" 
                                    name="profilePicture" 
                                    accept="image/*" 
                                    onChange={handleFileChange}
                                />
                                <small>Recommended: 400x400px, max 5MB</small>
                            </div>

                            {(formData.role === "Musician" || formData.role === "Producer" || formData.role === "DJ") && (
                                <div className="form-group">
                                    <label>Sample Track</label>
                                    <input 
                                        type="file" 
                                        name="sampleTrack" 
                                        accept="audio/*" 
                                        onChange={handleFileChange}
                                    />
                                    <small>MP3, WAV, or FLAC, max 50MB</small>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Legal & Preferences */}
                {currentStep === 4 && (
                    <div className="form-step">
                        <h3>Preferences & Legal</h3>
                        
                        <div className="form-group">
                            <label>Communication Preferences</label>
                            <div className="checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="marketingEmails"
                                        checked={formData.marketingEmails}
                                        onChange={handleChange}
                                    />
                                    Receive marketing emails and updates
                                </label>
                            </div>
                        </div>

                        <div className="legal-section">
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="termsAccepted"
                                        checked={formData.termsAccepted}
                                        onChange={handleChange}
                                        className={errors.termsAccepted ? 'error' : ''}
                                        required
                                    />
                                    I accept the <Link to="/terms" target="_blank">Terms of Service</Link> *
                                </label>
                                {errors.termsAccepted && <span className="error-text">{errors.termsAccepted}</span>}
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="privacyAccepted"
                                        checked={formData.privacyAccepted}
                                        onChange={handleChange}
                                        className={errors.privacyAccepted ? 'error' : ''}
                                        required
                                    />
                                    I accept the <Link to="/privacy" target="_blank">Privacy Policy</Link> *
                                </label>
                                {errors.privacyAccepted && <span className="error-text">{errors.privacyAccepted}</span>}
                            </div>

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="ageVerification"
                                        checked={formData.ageVerification}
                                        onChange={handleChange}
                                        className={errors.ageVerification ? 'error' : ''}
                                        required
                                    />
                                    I confirm that I am at least 13 years old *
                                </label>
                                {errors.ageVerification && <span className="error-text">{errors.ageVerification}</span>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="form-navigation">
                    {currentStep > 1 && (
                        <button type="button" onClick={prevStep} className="btn-secondary">
                            Previous
                        </button>
                    )}
                    
                    {currentStep < 4 ? (
                        <button type="button" onClick={nextStep} className="btn-primary">
                            Next
                        </button>
                    ) : (
                        <button 
                            type="submit" 
                            className={`btn-primary submit-btn ${isSubmitting ? 'disabled' : ''}`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating Account...' : 'Create Account'}
                        </button>
                    )}
                </div>
            </form>

            <div className="login-link">
                <p>
                    Already have an account? <Link to="/login">Sign in here</Link>
                </p>
            </div>
        </div>
    );
};

export default SignupForm;