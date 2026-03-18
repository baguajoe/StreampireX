import React, { useState, useRef } from "react";

export const Knob = ({ value=0, min=0, max=100, onChange, color="#00ffc8", size=50 }) => {
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);
    const startValue = useRef(0);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        startY.current = e.clientY;
        startValue.current = value;
        const onMouseMove = (me) => {
            const range = max - min;
            const delta = (startY.current - me.clientY) / 200;
            const newValue = Math.min(max, Math.max(min, startValue.current + delta * range));
            if (onChange) onChange(newValue);
        };
        const onMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const rotation = ((value - min) / (max - min)) * 270 - 135;

    return (
        <div onMouseDown={handleMouseDown} style={{
            width: `${size}px`, height: `${size}px`, borderRadius: "50%",
            background: "#161b22", border: `2px solid ${isDragging ? color : "#30363d"}`,
            position: "relative", cursor: "ns-resize", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
            <div style={{
                position: "absolute", width: "2px", height: "30%", background: color,
                top: "10%", transformOrigin: `50% ${size * 0.4}px`, transform: `rotate(${rotation}deg)`,
                boxShadow: `0 0 5px ${color}`
            }} />
        </div>
    );
};
