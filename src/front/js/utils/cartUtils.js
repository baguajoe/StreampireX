// src/front/js/utils/cartUtils.js
// Cart utility functions to manage cart state and trigger navbar updates

export const CartUtils = {
  // Get cart from localStorage
  getCart: () => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (error) {
      console.error('Error parsing cart data:', error);
      return [];
    }
  },

  // Save cart to localStorage and trigger update event
  saveCart: (cart) => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
      // Dispatch custom event to update navbar cart count
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (error) {
      console.error('Error saving cart data:', error);
    }
  },

  // Add item to cart
  addToCart: (product, quantity = 1) => {
    const cart = CartUtils.getCart();
    const existingItemIndex = cart.findIndex(item => item.id === product.id);

    if (existingItemIndex > -1) {
      // Update quantity if item already exists
      cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: quantity
      });
    }

    CartUtils.saveCart(cart);
    return cart;
  },

  // Remove item from cart
  removeFromCart: (productId) => {
    const cart = CartUtils.getCart();
    const updatedCart = cart.filter(item => item.id !== productId);
    CartUtils.saveCart(updatedCart);
    return updatedCart;
  },

  // Update item quantity
  updateQuantity: (productId, quantity) => {
    const cart = CartUtils.getCart();
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or less
        cart.splice(itemIndex, 1);
      } else {
        cart[itemIndex].quantity = quantity;
      }
    }

    CartUtils.saveCart(cart);
    return cart;
  },

  // Clear entire cart
  clearCart: () => {
    CartUtils.saveCart([]);
    return [];
  },

  // Get cart total count
  getCartCount: () => {
    const cart = CartUtils.getCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
  },

  // Get cart total price
  getCartTotal: () => {
    const cart = CartUtils.getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  },

  // Get cart subtotal (before taxes/shipping)
  getCartSubtotal: () => {
    return CartUtils.getCartTotal();
  },

  // Calculate tax (you can customize this based on your tax logic)
  calculateTax: (subtotal, taxRate = 0.08) => {
    return subtotal * taxRate;
  },

  // Calculate shipping (you can customize this based on your shipping logic)
  calculateShipping: (subtotal, freeShippingThreshold = 50) => {
    return subtotal >= freeShippingThreshold ? 0 : 9.99;
  },

  // Get formatted price
  formatPrice: (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }
};

// Hook for React components to use cart functionality
export const useCart = () => {
  const [cart, setCart] = React.useState(CartUtils.getCart());
  const [cartCount, setCartCount] = React.useState(CartUtils.getCartCount());

  React.useEffect(() => {
    const handleCartUpdate = () => {
      const updatedCart = CartUtils.getCart();
      setCart(updatedCart);
      setCartCount(CartUtils.getCartCount());
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  return {
    cart,
    cartCount,
    addToCart: CartUtils.addToCart,
    removeFromCart: CartUtils.removeFromCart,
    updateQuantity: CartUtils.updateQuantity,
    clearCart: CartUtils.clearCart,
    getCartTotal: CartUtils.getCartTotal,
    formatPrice: CartUtils.formatPrice
  };
};