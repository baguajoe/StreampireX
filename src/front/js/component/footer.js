import React from "react";
import "../../styles/Footer.css";

export const Footer = () => (
  <footer className="footer mt-auto py-3 text-center">
    <div className="footer-content">
      <p>
        Made with <i className="fa fa-heart text-danger" /> by{" "}
        <a href="https://www.eyeforgestudios.com/" target="_blank" rel="noopener noreferrer">
          <strong>Eye Forge Studios</strong>
        </a>
      </p>
      <div className="footer-links">
        <a href="/terms">Terms</a> | <a href="/privacy">Privacy</a> | <a href="/support">Support</a>
      </div>
    </div>
  </footer>
);
