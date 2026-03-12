import React, { useState } from "react";

export const MerchProductBuilder = () => {

    const [step, setStep] = useState(1)

    const [product, setProduct] = useState({
        title: "",
        description: "",
        artworkUrl: "",
        productType: "tshirt",
        color: "black",
        price: 25,
        cost: 12,
        sizes: {
            S: true,
            M: true,
            L: true,
            XL: true
        }
    })

    const profit = product.price - product.cost

    const handleChange = (field, value) => {
        setProduct(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const toggleSize = (size) => {
        setProduct(prev => ({
            ...prev,
            sizes: {
                ...prev.sizes,
                [size]: !prev.sizes[size]
            }
        }))
    }

    const publishProduct = () => {
        console.log("Publishing product:", product)

        alert("Product published to your store!")
    }

    return (
        <div className="card bg-dark text-white p-4">

            {/* STEP INDICATOR */}
            <div className="mb-4">
                <strong>Step {step} of 3</strong>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
                <div>

                    <h3 className="mb-3">Step 1: Product Details</h3>

                    <div className="mb-3">
                        <label>Product Title</label>
                        <input
                            className="form-control"
                            value={product.title}
                            onChange={(e)=>handleChange("title", e.target.value)}
                            placeholder="Example: StreampireX Classic Tee"
                        />
                    </div>

                    <div className="mb-3">
                        <label>Description</label>
                        <textarea
                            className="form-control"
                            rows="3"
                            value={product.description}
                            onChange={(e)=>handleChange("description", e.target.value)}
                            placeholder="Describe your merch..."
                        />
                    </div>

                    <div className="mb-3">
                        <label>Product Type</label>
                        <select
                            className="form-control"
                            value={product.productType}
                            onChange={(e)=>handleChange("productType", e.target.value)}
                        >
                            <option value="tshirt">T-Shirt</option>
                            <option value="hoodie">Hoodie</option>
                            <option value="hat">Hat</option>
                            <option value="poster">Poster</option>
                            <option value="mug">Mug</option>
                        </select>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => setStep(2)}
                    >
                        Next
                    </button>

                </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
                <div>

                    <h3 className="mb-3">Step 2: Upload Artwork</h3>

                    <input
                        type="text"
                        className="form-control mb-3"
                        placeholder="Paste Artwork URL (PNG/JPG)"
                        value={product.artworkUrl}
                        onChange={(e)=>handleChange("artworkUrl", e.target.value)}
                    />

                    {product.artworkUrl && (
                        <div className="text-center mb-3">

                            <p>Artwork Preview</p>

                            <img
                                src={product.artworkUrl}
                                alt="preview"
                                style={{ width: "150px" }}
                            />

                        </div>
                    )}

                    <div className="mb-3">
                        <label>Color</label>

                        <select
                            className="form-control"
                            value={product.color}
                            onChange={(e)=>handleChange("color", e.target.value)}
                        >
                            <option>black</option>
                            <option>white</option>
                            <option>red</option>
                            <option>blue</option>
                        </select>
                    </div>

                    <div className="d-flex gap-2">

                        <button
                            className="btn btn-secondary"
                            onClick={() => setStep(1)}
                        >
                            Back
                        </button>

                        <button
                            className="btn btn-primary"
                            onClick={() => setStep(3)}
                        >
                            Next
                        </button>

                    </div>

                </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
                <div>

                    <h3 className="mb-3">Step 3: Pricing & Sizes</h3>

                    <div className="mb-3">
                        <label>Retail Price ($)</label>

                        <input
                            type="number"
                            className="form-control"
                            value={product.price}
                            onChange={(e)=>handleChange("price", Number(e.target.value))}
                        />
                    </div>

                    <div className="mb-3">
                        <label>Production Cost ($)</label>

                        <input
                            type="number"
                            className="form-control"
                            value={product.cost}
                            onChange={(e)=>handleChange("cost", Number(e.target.value))}
                        />
                    </div>

                    <div className="alert alert-info">

                        <strong>Your Profit:</strong> ${profit}

                    </div>

                    <div className="mb-3">

                        <label>Available Sizes</label>

                        <div className="d-flex gap-3 mt-2">

                            {Object.keys(product.sizes).map(size => (
                                <label key={size}>
                                    <input
                                        type="checkbox"
                                        checked={product.sizes[size]}
                                        onChange={()=>toggleSize(size)}
                                    />
                                    {" "} {size}
                                </label>
                            ))}

                        </div>

                    </div>

                    <div className="d-flex gap-2">

                        <button
                            className="btn btn-secondary"
                            onClick={() => setStep(2)}
                        >
                            Back
                        </button>

                        <button
                            className="btn btn-success"
                            onClick={publishProduct}
                        >
                            Publish to My Store
                        </button>

                    </div>

                </div>
            )}

        </div>
    )
}