import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';

const CartContext = createContext(null);

const STORAGE_KEY = 'strathmore_university_cart';

const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save to sessionStorage whenever cart changes
  useEffect(() => {
    if (isLoaded) {
      try {
        if (cart) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error saving cart:', error);
      }
    }
  }, [cart, isLoaded]);

  /**
   * addToCart now supports multiple ticket types for the same event.
   * Each call adds or updates a ticket type in the cart's items array.
   * If the cart is for a different event, it resets.
   */
  const addToCart = useCallback((item) => {
    setCart(prev => {
      // If cart is for a different event, start fresh
      if (prev && prev.eventSlug !== item.eventSlug) {
        return buildCart(item.eventSlug, item.eventTitle, item.themeColor, item.accentColor, [item], null, 0, null, {});
      }

      // Existing cart for same event â€” merge items
      const existingItems = prev ? [...prev.items] : [];
      const idx = existingItems.findIndex(i => i.ticketTypeId === item.ticketTypeId);

      if (idx >= 0) {
        // Update existing ticket type
        existingItems[idx] = { ...existingItems[idx], ...item };
      } else {
        // Add new ticket type
        existingItems.push(item);
      }

      return buildCart(
        item.eventSlug,
        item.eventTitle,
        item.themeColor || prev?.themeColor,
        item.accentColor || prev?.accentColor,
        existingItems,
        prev?.promoCode,
        prev?.promoDiscountValue ?? 0,
        prev?.promoDiscountType ?? null,
        { registration: prev?.registration || null }
      );
    });
  }, []);

  /**
   * addMultipleToCart replaces all items at once (used by the new TicketBox).
   */
  const addMultipleToCart = useCallback((eventSlug, eventTitle, themeColor, accentColor, items, meta = {}) => {
    setCart(buildCart(eventSlug, eventTitle, themeColor, accentColor, items, null, 0, null, meta));
  }, []);

  const clearCart = useCallback(() => {
    setCart(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  }, []);

  const applyPromo = useCallback((code, discountValue, discountType) => {
    setCart(prev => {
      if (!prev) return null;
      // Store the promo parameters so buildCart can recalculate on quantity changes
      return buildCart(
        prev.eventSlug, prev.eventTitle, prev.themeColor, prev.accentColor,
        prev.items, code, discountValue, discountType, { registration: prev.registration || null }
      );
    });
  }, []);

  const removePromo = useCallback(() => {
    setCart(prev => {
      if (!prev) return null;
      return buildCart(
        prev.eventSlug, prev.eventTitle, prev.themeColor, prev.accentColor,
        prev.items, null, 0, null, { registration: prev.registration || null }
      );
    });
  }, []);

  const removeItem = useCallback((ticketTypeId) => {
    setCart(prev => {
      if (!prev) return null;
      const newItems = prev.items.filter(i => i.ticketTypeId !== ticketTypeId);
      if (newItems.length === 0) return null;
      return buildCart(
        prev.eventSlug, prev.eventTitle, prev.themeColor, prev.accentColor,
        newItems, prev.promoCode, prev.promoDiscountValue ?? 0, prev.promoDiscountType ?? null, { registration: prev.registration || null }
      );
    });
  }, []);

  const updateQuantity = useCallback((ticketTypeId, quantity) => {
    setCart(prev => {
      if (!prev) return null;
      const newItems = prev.items.map(i =>
        i.ticketTypeId === ticketTypeId ? { ...i, quantity } : i
      );
      return buildCart(
        prev.eventSlug, prev.eventTitle, prev.themeColor, prev.accentColor,
        newItems, prev.promoCode, prev.promoDiscountValue ?? 0, prev.promoDiscountType ?? null, { registration: prev.registration || null }
      );
    });
  }, []);

  // â”€â”€ Backward compatibility â”€â”€
  // Many components still expect cart.ticketTypeId, cart.quantity, cart.unitPrice, cart.ticketType
  // We provide these as computed values from the first item for backward compat
  const compatCart = cart ? {
    ...cart,
    // Legacy single-item fields (from first item)
    ticketTypeId: cart.items?.[0]?.ticketTypeId,
    ticketType: cart.items?.[0]?.ticketType,
    quantity: cart.items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
    unitPrice: cart.items?.[0]?.unitPrice || 0,
  } : null;

  const value = {
    cart: compatCart,
    isLoaded,
    hasItems: !!cart && cart.items?.length > 0,
    addToCart,
    addMultipleToCart,
    clearCart,
    applyPromo,
    removePromo,
    removeItem,
    updateQuantity,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

/**
 * Build a normalized cart object from items array.
 */
function buildCart(eventSlug, eventTitle, themeColor, accentColor, items, promoCode = null, promoDiscountValue = 0, promoDiscountType = null, meta = {}) {
  const subtotalCents = items.reduce((sum, i) => sum + toCents(i.unitPrice) * i.quantity, 0);

  // Recalculate discount from original promo parameters (not a stale flat amount)
  let discountCents = 0;
  if (promoCode && promoDiscountValue) {
    discountCents = promoDiscountType === 'percent'
      ? Math.round(subtotalCents * (promoDiscountValue / 100))
      : toCents(promoDiscountValue);
  }

  const serviceFeeCents = Math.round((subtotalCents - discountCents) * 0.03);
  const totalCents = subtotalCents - discountCents + serviceFeeCents;

  return {
    eventSlug,
    eventTitle,
    themeColor,
    accentColor,
    items, // Array of { ticketTypeId, ticketType, quantity, unitPrice }
    registration: meta.registration || null,
    promoCode,
    promoDiscountValue,   // Store original value so recalculation works on quantity change
    promoDiscountType,    // 'percent' | 'fixed' | null
    discount: fromCents(discountCents),
    serviceFee: fromCents(serviceFeeCents),
    total: fromCents(totalCents),
  };
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
