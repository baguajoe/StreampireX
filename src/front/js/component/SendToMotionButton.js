import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../store/appContext";
import { sendToMotion } from "../utils/motionHelpers";

export default function SendToMotionButton({
  url,
  type = "audio",
  name = "Imported Media",
  className = "",
  style = {}
}) {
  const { actions } = useContext(Context);
  const navigate = useNavigate();

  const handleSend = () => {
    if (!url) return;
    sendToMotion(actions, navigate, { type, url, name });
  };

  return (
    <button
      onClick={handleSend}
      disabled={!url}
      className={className}
      style={{
        marginTop: 10,
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #00ffc8",
        background: "rgba(0,255,200,0.08)",
        color: "#00ffc8",
        cursor: url ? "pointer" : "not-allowed",
        opacity: url ? 1 : 0.5,
        ...style
      }}
      title={url ? "Send this media to Motion Studio" : "No media available yet"}
    >
      Send to Motion Studio 🎬
    </button>
  );
}
