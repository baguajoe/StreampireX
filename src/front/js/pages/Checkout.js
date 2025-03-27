import React from "react";
// import { useCart } from "../context/CartContext";
import "../../styles/Checkout.css";

const Checkout = () => {
  // const { cart, clearCart } = useCart();

  const handleCheckout = () => {
    alert("Proceeding to payment...");
    // clearCart();
  };

  return (
    <div className="checkout">
      <h1>Checkout</h1>
      {/* {cart.length === 0 ? <p>No items in cart</p> : (
        <div>
          {cart.map((item, index) => (
            <div key={index}>
              <p>{item.name} - ${item.price}</p>
            </div>
          ))}
          <button onClick={handleCheckout}>Pay Now</button>
        </div>
      )} */}
    </div>
  );
};

export default Checkout;
