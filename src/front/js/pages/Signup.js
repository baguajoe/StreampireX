import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import SignupForm from "../component/SignupForm.js";


export const Signup = () => {
    // const { store, actions } = useContext(Context);
    // const navigate = useNavigate();

    return (
        <div className="signup-container">
            <div className="signup-card">
                <SignupForm />
            </div>
        </div>
        );


};