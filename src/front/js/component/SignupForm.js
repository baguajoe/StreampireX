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
        
        // Profile Type (maps to backend User.profile_type)
        profile_type: "regular",       // "regular" | "artist" | "gamer" | "multiple"
        is_artist: false,
        is_gamer: false,

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

    // Handle profile type change (keeps booleans in sync)
    const handleProfileTypeChange = (e) => {
        const val = e.target.value; // "regular" | "artist" | "gamer" | "multiple"
        setFormData(prev => ({
            ...prev,
            profile_type: val,
            is_artist: val === "artist" || val === "multiple",
            is_gamer:  val === "gamer"  || val === "multiple"
        }));
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

    // ✅ FIXED VALIDATION - Based on profile_type not role
    const validateForm = () => {
        const newErrors = {};

        // Basic validation (ALWAYS required for all profile types)
        if (!formData.email) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Email is invalid";
        }

        if (!formData.username) {
            newErrors.username = "Username is required";
        } else if (formData.username.length < 3) {
            newErrors.username = "Username must be at least 3 characters";
        }

        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
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
            newErrors.termsAccepted = "You must accept the terms and conditions";
        }

        if (!formData.privacyAccepted) {
            newErrors.privacyAccepted = "You must accept the privacy policy";
        }

        if (!formData.ageVerification) {
            newErrors.ageVerification = "Age verification is required";
        }

        // ✅ FIXED: Profile-specific validation based on profile_type
        if (formData.profile_type === "artist" || formData.profile_type === "multiple") {
            // Artist fields required
            if (!formData.artistName && !formData.stageName) {
                newErrors.artistName = "Artist name or stage name is required for artist profiles";
            }
            if (!formData.industry) {
                newErrors.industry = "Industry is required for artist profiles";
            }
        }

        if (formData.profile_type === "gamer" || formData.profile_type === "multiple") {
            // Gamer fields validation (optional, currently no required fields)
        }

        // Regular profile has no additional required fields

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

            // Add all form data (ensure booleans always included)
            Object.keys(formData).forEach((key) => {
                const val = formData[key];

                // Always include booleans (even if false)
                if (typeof val === "boolean") {
                    submitData.append(key, String(val));
                    return;
                }

                // JSON for objects that aren't Files
                if (key === "socialMedia" || key === "notifications") {
                    submitData.append(key, JSON.stringify(val));
                    return;
                }

                // Arrays as JSON
                if (Array.isArray(val)) {
                    submitData.append(key, JSON.stringify(val));
                    return;
                }

                // Files
                if (val instanceof File) {
                    submitData.append(key, val);
                    return;
                }

                // Primitives (strings, numbers) that are set
                if (val !== null && val !== undefined && val !== "") {
                    submitData.append(key, val);
                }
            });

            // Explicitly set canonical fields used by backend
            submitData.append("profile_type", formData.profile_type);
            submitData.append("is_artist", String(formData.is_artist));
            submitData.append("is_gamer", String(formData.is_gamer));

            const data = await actions.signup(submitData);

            if (data.message) {
                alert("Account created successfully! Please check your email for verification.");
                navigate("/login");
            } else {
                setErrors({ submit: data.error || "Signup failed" });
            }
        } catch (error) {
            console.error("Signup error:", error);
            setErrors({ submit: "An error occurred during signup" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step navigation
    const nextStep = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className="signup-container">
            <div className="signup-header">
                <h2>Create Your StreampireX Account</h2>
                <div className="step-indicator">
                    <span className={currentStep >= 1 ? 'active' : ''}>1</span>
                    <span className={currentStep >= 2 ? 'active' : ''}>2</span>
                    <span className={currentStep >= 3 ? 'active' : ''}>3</span>
                    <span className={currentStep >= 4 ? 'active' : ''}>4</span>
                </div>
            </div>

            <form onSubmit={handleSignup} className="signup-form">
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
                                    placeholder="At least 6 characters"
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
                )}

                {/* Step 2: Profile Type & Professional Info */}
                {currentStep === 2 && (
                    <div className="form-step">
                        <h3>Choose Your Profile Type</h3>

                        <div className="form-group">
                            <label>Profile Type *</label>
                            <div className="radio-group">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="profile_type"
                                        value="regular"
                                        checked={formData.profile_type === "regular"}
                                        onChange={handleProfileTypeChange}
                                    />
                                    Regular User (Listener/Fan)
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="profile_type"
                                        value="artist"
                                        checked={formData.profile_type === "artist"}
                                        onChange={handleProfileTypeChange}
                                    />
                                    Artist / Creator
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="profile_type"
                                        value="gamer"
                                        checked={formData.profile_type === "gamer"}
                                        onChange={handleProfileTypeChange}
                                    />
                                    Gamer
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="profile_type"
                                        value="multiple"
                                        checked={formData.profile_type === "multiple"}
                                        onChange={handleProfileTypeChange}
                                    />
                                    Both (Artist + Gamer)
                                </label>
                            </div>
                            <small className="help-text">
                                Don't worry - you can upgrade your profile type later!
                            </small>
                        </div>

                        {/* Conditional Artist Fields */}
                        {(formData.profile_type === "artist" || formData.profile_type === "multiple") && (
                            <div className="conditional-fields">
                                <h4>Artist Information</h4>
                                
                                <div className="form-group">
                                    <label>Artist Name / Stage Name *</label>
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
                                    <label>Industry / Genre *</label>
                                    <select
                                        name="industry"
                                        value={formData.industry}
                                        onChange={handleChange}
                                        className={errors.industry ? 'error' : ''}
                                    >
                                        <option value="">Select your industry</option>
                                        <option value="music">Music</option>
                                        <option value="podcasting">Podcasting</option>
                                        <option value="radio">Radio</option>
                                        <option value="content-creator">Content Creator</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {errors.industry && <span className="error-text">{errors.industry}</span>}
                                </div>

                                <div className="form-group">
                                    <label>Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleChange}
                                        placeholder="Tell us about yourself..."
                                        rows="4"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Conditional Gamer Fields */}
                        {(formData.profile_type === "gamer" || formData.profile_type === "multiple") && (
                            <div className="conditional-fields">
                                <h4>Gamer Information</h4>
                                <p className="help-text">These fields are optional - complete your gamer profile later!</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Additional Info */}
                {currentStep === 3 && (
                    <div className="form-step">
                        <h3>Additional Information (Optional)</h3>
                        
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Country</label>
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Website</label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                placeholder="https://yourwebsite.com"
                            />
                        </div>
                    </div>
                )}

                {/* Step 4: Legal & Agreements */}
                {currentStep === 4 && (
                    <div className="form-step">
                        <h3>Terms & Agreements</h3>
                        
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
                                    I accept the <Link to="/terms" target="_blank">Terms and Conditions</Link> *
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

                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="marketingEmails"
                                        checked={formData.marketingEmails}
                                        onChange={handleChange}
                                    />
                                    I want to receive marketing emails and updates
                                </label>
                            </div>
                        </div>

                        {errors.submit && (
                            <div className="error-message">
                                {errors.submit}
                            </div>
                        )}
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