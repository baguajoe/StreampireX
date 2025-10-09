import React, { useEffect, useState } from "react";

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [newRole, setNewRole] = useState("");

    useEffect(() => {
        fetch(process.env.REACT_APP_BACKEND_URL + "/api/roles", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then((res) => res.json())
            .then((data) => setRoles(data))
            .catch((err) => console.error("Error fetching roles:", err));
    }, []);

    const addRole = () => {
        fetch(process.env.REACT_APP_BACKEND_URL + "/api/roles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ name: newRole })
        })
            .then((res) => res.json())
            .then((data) => {
                setRoles([...roles, data.role]);
                setNewRole("");
            })
            .catch((err) => console.error("Error adding role:", err));
    };

    const deleteRole = (roleId) => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/roles/${roleId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then(() => setRoles(roles.filter((role) => role.id !== roleId)))
            .catch((err) => console.error("Error deleting role:", err));
    };

    return (
        <div className="role-management">
            <h1>⚙️ Role Management</h1>

            <section>
                <h2>Existing Roles</h2>
                <ul>
                    {roles.map((role) => (
                        <li key={role.id}>
                            {role.name}
                            <button onClick={() => deleteRole(role.id)}>❌ Remove</button>
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h2>➕ Add a New Role</h2>
                <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="Enter role name"
                />
                <button onClick={addRole}>Add Role</button>
            </section>
        </div>
    );
};

export default RoleManagement;
