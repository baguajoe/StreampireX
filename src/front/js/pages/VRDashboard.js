// src/pages/VRDashboard.js

import React from 'react';
import VRUserDashboard from '../component/VRUserDashboard';  // Import the VRUserDashboard component
import VREventList from '../component/VREventList';  // Import the VREventList component
import VREventManagement from '../component/VREventManagement';  // Import the VREventManagement component

const VRDashboard = () => {
  return (
    <div className="page">
      <h1>Your VR Dashboard</h1>
      
      {/* Use all the components within the VR Dashboard */}
      <VRUserDashboard />  {/* User's VR Dashboard */}
      <VREventList />      {/* List of all VR events */}
      <VREventManagement />{/* Management of VR events */}
    </div>
  );
};

export default VRDashboard;
