import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/SalesDashboard.css"

const SalesDashboard = () => {
    const navigate = useNavigate();
    const [salesData, setSalesData] = useState({
        totalRevenue: 0,
        totalProducts: 0,
        totalOrders: 0,
        platformCut: 0,
        creatorEarnings: 0
    });
    const [recentSales, setRecentSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeFilter, setTimeFilter] = useState("all"); // all, week, month, year
    const [selectedPeriod, setSelectedPeriod] = useState("this_month");

    useEffect(() => {
        fetchSalesData();
        fetchRecentSales();
        fetchMyProducts();
    }, [timeFilter]);

    const fetchSalesData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/revenue-analytics?period=${timeFilter}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSalesData({
                    totalRevenue: data.total_revenue || 0,
                    totalProducts: data.total_products || 0,
                    totalOrders: data.total_orders || 0,
                    platformCut: data.platform_cut || 0,
                    creatorEarnings: data.creator_earnings || 0
                });
            } else {
                throw new Error("Failed to fetch sales data");
            }
        } catch (err) {
            console.error("Error fetching sales data:", err);
            setError("Failed to load sales analytics");
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentSales = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/sales?limit=10`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setRecentSales(data);
            }
        } catch (err) {
            console.error("Error fetching recent sales:", err);
        }
    };

    const fetchMyProducts = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/storefront`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProducts(data);
            }
        } catch (err) {
            console.error("Error fetching products:", err);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTopPerformingProducts = () => {
        return products
            .filter(product => product.sales_count > 0)
            .sort((a, b) => (b.sales_revenue || 0) - (a.sales_revenue || 0))
            .slice(0, 5);
    };

    const getConversionRate = () => {
        if (products.length === 0) return 0;
        const productsWithSales = products.filter(p => p.sales_count > 0).length;
        return ((productsWithSales / products.length) * 100).toFixed(1);
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading your sales dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    <h4>Error Loading Dashboard</h4>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchSalesData}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const topProducts = getTopPerformingProducts();

    return (
        <div className="container mt-4">
            {/* Header */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h2>💰 Sales Dashboard</h2>
                        <div className="d-flex gap-2">
                            <button 
                                className="btn btn-success"
                                onClick={() => navigate("/storefront")}
                            >
                                🏪 Manage Store
                            </button>
                            <button 
                                className="btn btn-primary"
                                onClick={() => navigate("/storefront")}
                            >
                                ➕ Add Product
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Time Filter */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="btn-group" role="group">
                        <button
                            className={`btn ${timeFilter === "all" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setTimeFilter("all")}
                        >
                            All Time
                        </button>
                        <button
                            className={`btn ${timeFilter === "week" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setTimeFilter("week")}
                        >
                            This Week
                        </button>
                        <button
                            className={`btn ${timeFilter === "month" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setTimeFilter("month")}
                        >
                            This Month
                        </button>
                        <button
                            className={`btn ${timeFilter === "year" ? "btn-primary" : "btn-outline-primary"}`}
                            onClick={() => setTimeFilter("year")}
                        >
                            This Year
                        </button>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="row mb-4">
                <div className="col-md-3 mb-3">
                    <div className="card bg-success text-white h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="card-title">💰 Total Revenue</h6>
                                    <h3 className="card-text">{formatCurrency(salesData.totalRevenue)}</h3>
                                </div>
                                <div className="align-self-center">
                                    <i className="fas fa-dollar-sign fa-2x opacity-75"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-3 mb-3">
                    <div className="card bg-primary text-white h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="card-title">🎯 Your Earnings</h6>
                                    <h3 className="card-text">{formatCurrency(salesData.creatorEarnings)}</h3>
                                    <small className="opacity-75">After platform fee</small>
                                </div>
                                <div className="align-self-center">
                                    <i className="fas fa-wallet fa-2x opacity-75"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-3 mb-3">
                    <div className="card bg-info text-white h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="card-title">📦 Total Orders</h6>
                                    <h3 className="card-text">{salesData.totalOrders}</h3>
                                </div>
                                <div className="align-self-center">
                                    <i className="fas fa-shopping-cart fa-2x opacity-75"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-3 mb-3">
                    <div className="card bg-warning text-white h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="card-title">🛍️ Active Products</h6>
                                    <h3 className="card-text">{salesData.totalProducts}</h3>
                                    <small className="opacity-75">{getConversionRate()}% selling</small>
                                </div>
                                <div className="align-self-center">
                                    <i className="fas fa-box fa-2x opacity-75"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="row mb-4">
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">💸 Revenue Breakdown</h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Gross Revenue:</span>
                                    <span className="fw-bold">{formatCurrency(salesData.totalRevenue)}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 text-muted">
                                    <span>Platform Fee:</span>
                                    <span>-{formatCurrency(salesData.platformCut)}</span>
                                </div>
                                <hr />
                                <div className="d-flex justify-content-between fw-bold text-success">
                                    <span>Your Earnings:</span>
                                    <span>{formatCurrency(salesData.creatorEarnings)}</span>
                                </div>
                            </div>

                            {/* Progress bar showing earnings vs platform cut */}
                            <div className="mt-3">
                                <div className="mb-2">
                                    <small className="text-muted">Earnings vs Platform Fee</small>
                                </div>
                                <div className="progress" style={{ height: "25px" }}>
                                    <div 
                                        className="progress-bar bg-success" 
                                        style={{ 
                                            width: `${salesData.totalRevenue > 0 ? (salesData.creatorEarnings / salesData.totalRevenue) * 100 : 0}%` 
                                        }}
                                    >
                                        Your Share
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">📊 Quick Stats</h5>
                        </div>
                        <div className="card-body">
                            <div className="row text-center">
                                <div className="col-6 mb-3">
                                    <div className="border-end">
                                        <div className="fw-bold fs-4">
                                            {salesData.totalOrders > 0 ? formatCurrency(salesData.totalRevenue / salesData.totalOrders) : "$0"}
                                        </div>
                                        <small className="text-muted">Avg Order Value</small>
                                    </div>
                                </div>
                                <div className="col-6 mb-3">
                                    <div className="fw-bold fs-4">{getConversionRate()}%</div>
                                    <small className="text-muted">Products Selling</small>
                                </div>
                                <div className="col-6">
                                    <div className="border-end">
                                        <div className="fw-bold fs-4">
                                            {products.filter(p => p.is_digital).length}
                                        </div>
                                        <small className="text-muted">Digital Products</small>
                                    </div>
                                </div>
                                <div className="col-6">
                                    <div className="fw-bold fs-4">
                                        {products.filter(p => !p.is_digital).length}
                                    </div>
                                    <small className="text-muted">Physical Products</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Performing Products */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="mb-0">🏆 Top Performing Products</h5>
                        </div>
                        <div className="card-body">
                            {topProducts.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Type</th>
                                                <th>Sales</th>
                                                <th>Revenue</th>
                                                <th>Price</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topProducts.map((product) => (
                                                <tr key={product.id}>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <img 
                                                                src={product.image_url || "/default-product.jpg"}
                                                                alt={product.title}
                                                                className="rounded me-2"
                                                                style={{ width: "40px", height: "40px", objectFit: "cover" }}
                                                            />
                                                            <div>
                                                                <div className="fw-bold">{product.title}</div>
                                                                <small className="text-muted">#{product.id}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-primary">
                                                            {product.is_digital ? "📥 Digital" : "📦 Physical"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="fw-bold">{product.sales_count || 0}</span>
                                                    </td>
                                                    <td>
                                                        <span className="fw-bold text-success">
                                                            {formatCurrency(product.sales_revenue || 0)}
                                                        </span>
                                                    </td>
                                                    <td>{formatCurrency(product.price)}</td>
                                                    <td>
                                                        <div className="btn-group btn-group-sm">
                                                            <button 
                                                                className="btn btn-outline-primary"
                                                                onClick={() => navigate(`/product/${product.id}`)}
                                                            >
                                                                👁️ View
                                                            </button>
                                                            <button 
                                                                className="btn btn-outline-secondary"
                                                                onClick={() => navigate(`/storefront/edit/${product.id}`)}
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="mb-3">
                                        <i className="fas fa-chart-line fa-3x text-muted"></i>
                                    </div>
                                    <h5>No Sales Yet</h5>
                                    <p className="text-muted">Start selling to see your top performing products here!</p>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => navigate("/storefront")}
                                    >
                                        ➕ Add Your First Product
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Sales */}
            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0">📈 Recent Sales</h5>
                                <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => navigate("/sales-history")}
                                >
                                    View All Sales
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            {recentSales.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Product</th>
                                                <th>Customer</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentSales.map((sale) => (
                                                <tr key={sale.id}>
                                                    <td>{formatDate(sale.purchased_at)}</td>
                                                    <td>
                                                        <div className="fw-bold">{sale.product?.title}</div>
                                                        <small className="text-muted">Qty: {sale.quantity || 1}</small>
                                                    </td>
                                                    <td>
                                                        <span className="text-muted">Customer #{sale.user_id}</span>
                                                    </td>
                                                    <td>
                                                        <span className="fw-bold text-success">
                                                            {formatCurrency(sale.amount)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge bg-success">✅ Completed</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="mb-3">
                                        <i className="fas fa-clock fa-3x text-muted"></i>
                                    </div>
                                    <h5>No Recent Sales</h5>
                                    <p className="text-muted">Your recent sales will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesDashboard;