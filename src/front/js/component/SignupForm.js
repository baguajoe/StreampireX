import React, { useState, useContext } from "react";
import { Context } from "../store/appContext";
import { Link, useNavigate } from "react-router-dom";

const SignupForm = () => {
    const { actions } = useContext(Context);
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        email: "",
        username: "",
        password: "",
        role: "Listener", // Default role
        artistName: "",
        industry: "",
        ownRights: "yes",
        profilePicture: null,
        sampleTrack: null
    });

    // Handle input change
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle file upload
    const handleFileChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    };

    // Handle Form Submit
    const handleSignup = async (e) => {
        e.preventDefault();
        const submitData = new FormData();

        Object.keys(formData).forEach((key) => {
            if (formData[key]) {
                submitData.append(key, formData[key]);
            }
        });

        const data = await actions.signup(submitData);

        if (data.message) {
            alert(data.message);
            navigate("/login");
        } else {
            alert("Signup failed: " + data.error);
        }
    };

    return (
        <div>
            <h1>Signup</h1>
            <form onSubmit={handleSignup} encType="multipart/form-data">
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />

                <input
                    type="text"
                    name="username"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                />

                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />

                <label>Role:</label>
                <select name="role" value={formData.role} onChange={handleChange}>
                    <option value="Listener">Listener</option>
                    <option value="Indie Artist">Indie Artist</option>
                    <option value="Radio DJ">Radio DJ</option>
                    <option value="Podcaster">Podcaster</option>
                    <option value="Radio DJ and Podcaster">Radio DJ and Podcaster</option>
                </select>

                {formData.role === "Indie Artist" && (
                    <>
                        <input
                            type="text"
                            name="artistName"
                            placeholder="Artist Name"
                            value={formData.artistName}
                            onChange={handleChange}
                        />

                        <input
                            type="text"
                            name="industry"
                            placeholder="Industry (Music, Podcasting, Film, etc.)"
                            value={formData.industry}
                            onChange={handleChange}
                        />

                        <label>Do you own the rights to your music?</label>
                        <select name="ownRights" value={formData.ownRights} onChange={handleChange}>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>

                        <label>Upload Profile Picture:</label>
                        <input type="file" name="profilePicture" accept="image/*" onChange={handleFileChange} />

                        <label>Upload Sample Track (MP3, WAV):</label>
                        <input type="file" name="sampleTrack" accept="audio/*" onChange={handleFileChange} />
                    </>
                )}

                <button type="submit">Signup</button>
            </form>

            <p>
                Already have an account? Click <Link to="/login">here</Link> to login.
            </p>
        </div>
    );
};

export default SignupForm;
