import React, { useEffect, useState } from "react";

const RefundProcessing = () => {
    const [refunds, setRefunds] = useState([]);

    const fetchRefunds = async () => {
        const res = await fetch(`${process.env.BACKEND_URL}/refunds`, {
            headers: { Authorization: "Bearer " + localStorage.getItem("token") }
        });
        const data = await res.json();
        setRefunds(data);
    };

    const handleAction = async (id, action) => {
        await fetch(`${process.env.BACKEND_URL}/refunds/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({ status: action })
        });
        fetchRefunds();
    };

    useEffect(() => {
        fetchRefunds();
    }, []);

    return (
        <div className="container mt-4">
            <h2>Refund Requests</h2>
            <table className="table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Product</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {refunds.map(refund => (
                        <tr key={refund.id}>
                            <td>{refund.user_id}</td>
                            <td>{refund.product_id}</td>
                            <td>{refund.reason}</td>
                            <td>{refund.status}</td>
                            <td>
                                {refund.status === "Pending" && (
                                    <>
                                        <button
                                            className="btn btn-success btn-sm me-2"
                                            onClick={() => handleAction(refund.id, "Approved")}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleAction(refund.id, "Rejected")}
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RefundProcessing;
