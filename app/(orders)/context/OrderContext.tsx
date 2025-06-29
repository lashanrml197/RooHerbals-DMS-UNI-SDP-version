// app/(main)/(orders)/context/OrderContext.tsx

import React, { createContext, ReactNode, useContext, useReducer } from "react";

// Types for the data models
export interface Customer {
  customer_id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  area?: string;
  credit_limit?: number;
  credit_balance?: number;
}

export interface Product {
  product_id: string;
  name: string;
  description?: string;
  unit_price: number;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  total_stock: number;
}

export interface Batch {
  batch_id: string;
  batch_number: string;
  manufacturing_date: string;
  expiry_date: string;
  selling_price: number;
  current_quantity: number;
  supplier_name?: string;
}

export interface Order {
  order_id: string;
  order_date: string;
  total_amount: number;
  status: string;
}

export interface OrderItem {
  order_item_id: string;
  product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string;
  unit_price: number;
  quantity: number;
  discount: number;
  total_price: number;
  max_quantity: number;
  // For multi-batch FEFO orders
  is_fefo_split?: boolean;
  fefo_batches?: FefoSplitInfo[];
}

// New type to track split batch information
export interface FefoSplitInfo {
  batch_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
}

export interface ReturnItem {
  product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  reason: string;
  max_quantity: number;
}

// Enums for order stages and payment types
export enum OrderStage {
  SelectCustomer = 1,
  SelectProducts = 2,
  ReturnProducts = 3,
  ReviewOrder = 4,
}

export enum ModalType {
  None = 0,
  Batch = 1,
  Quantity = 2,
  Cart = 3,
  ReturnItems = 4,
}

export enum PaymentType {
  Cash = "cash",
  Credit = "credit",
  Cheque = "cheque",
}

// Define the order state structure
interface OrderState {
  stage: OrderStage;
  selectedCustomer: Customer | null;
  products: Product[];
  filteredProducts: Product[];
  productSearch: string;
  selectedProduct: Product | null;
  productBatches: Batch[];
  selectedBatch: Batch | null;
  cartItems: CartItem[];
  currentQuantity: number;
  currentDiscount: number;
  hasReturns: boolean;
  customerOrders: Order[];
  selectedOrderForReturn: Order | null;
  orderItems: OrderItem[];
  returnItems: ReturnItem[];
  returnReason: string;
  paymentType: PaymentType;
  orderNotes: string;
  activeModal: ModalType;
  loading: boolean;
  error: string | null;
  networkConnected: boolean;
  fefoEnabled: boolean; // FEFO flag
}

// Define all possible actions
type OrderAction =
  | { type: "SET_STAGE"; payload: OrderStage }
  | { type: "SET_CUSTOMER"; payload: Customer | null }
  | { type: "SET_PRODUCTS"; payload: Product[] }
  | { type: "SET_FILTERED_PRODUCTS"; payload: Product[] }
  | { type: "SET_PRODUCT_SEARCH"; payload: string }
  | { type: "SET_SELECTED_PRODUCT"; payload: Product | null }
  | { type: "SET_PRODUCT_BATCHES"; payload: Batch[] }
  | { type: "SET_SELECTED_BATCH"; payload: Batch | null }
  | { type: "ADD_TO_CART"; payload: CartItem }
  | { type: "REMOVE_FROM_CART"; payload: number }
  | { type: "SET_CURRENT_QUANTITY"; payload: number }
  | { type: "SET_CURRENT_DISCOUNT"; payload: number }
  | { type: "SET_HAS_RETURNS"; payload: boolean }
  | { type: "SET_CUSTOMER_ORDERS"; payload: Order[] }
  | { type: "SET_SELECTED_ORDER_FOR_RETURN"; payload: Order | null }
  | { type: "SET_ORDER_ITEMS"; payload: OrderItem[] }
  | { type: "ADD_RETURN_ITEM"; payload: ReturnItem }
  | { type: "REMOVE_RETURN_ITEM"; payload: number }
  | { type: "SET_RETURN_REASON"; payload: string }
  | { type: "SET_PAYMENT_TYPE"; payload: PaymentType }
  | { type: "SET_ORDER_NOTES"; payload: string }
  | { type: "SET_ACTIVE_MODAL"; payload: ModalType }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_NETWORK_CONNECTED"; payload: boolean }
  | { type: "TOGGLE_FEFO"; payload: boolean } // FEFO toggle action
  | { type: "RESET_ORDER" };

// Initial state
const initialState: OrderState = {
  stage: OrderStage.SelectCustomer,
  selectedCustomer: null,
  products: [],
  filteredProducts: [],
  productSearch: "",
  selectedProduct: null,
  productBatches: [],
  selectedBatch: null,
  cartItems: [],
  currentQuantity: 1,
  currentDiscount: 0,
  hasReturns: false,
  customerOrders: [],
  selectedOrderForReturn: null,
  orderItems: [],
  returnItems: [],
  returnReason: "",
  paymentType: PaymentType.Cash,
  orderNotes: "",
  activeModal: ModalType.None,
  loading: false,
  error: null,
  networkConnected: true,
  fefoEnabled: true, // FEFO is enabled by default
};

// Helper function to validate FEFO-compliant batch selection
const validateFefoSelection = (
  batch: Batch | null,
  batches: Batch[]
): boolean => {
  if (!batch || batches.length === 0) return true;

  // The first batch in the array is always the FEFO-compliant one
  // (backend sorts by expiry_date ASC)
  return batch.batch_id === batches[0].batch_id;
};

// Helper function to calculate total available quantity across all batches
const getTotalAvailableQuantity = (batches: Batch[]): number => {
  return batches.reduce((total, batch) => total + batch.current_quantity, 0);
};

// Helper function to create a FEFO-split order across multiple batches
const createFefoSplitOrder = (
  product: Product,
  batches: Batch[],
  quantity: number,
  discount: number
): { cartItem: CartItem; isSplit: boolean } => {
  let remainingQuantity = quantity;
  let isSplit = false;
  const fefoSplitInfo: FefoSplitInfo[] = [];

  // If quantity can be fulfilled by the first batch, just use that
  if (batches.length > 0 && batches[0].current_quantity >= quantity) {
    // Single batch case - use the FEFO-compliant batch (first one)
    const batch = batches[0];
    const totalPrice = batch.selling_price * quantity - discount;

    return {
      cartItem: {
        product_id: product.product_id,
        product_name: product.name,
        batch_id: batch.batch_id,
        batch_number: batch.batch_number,
        unit_price: batch.selling_price,
        quantity: quantity,
        discount: discount,
        total_price: totalPrice,
        max_quantity: batch.current_quantity,
        is_fefo_split: false,
      },
      isSplit: false,
    };
  }

  // We need to split across multiple batches following FEFO
  let totalPrice = 0;
  const firstBatch = batches[0];

  // Add all needed batches following FEFO
  for (const batch of batches) {
    if (remainingQuantity <= 0) break;

    const quantityFromBatch = Math.min(
      remainingQuantity,
      batch.current_quantity
    );
    remainingQuantity -= quantityFromBatch;

    // Calculate price contribution from this batch
    const batchPrice = batch.selling_price * quantityFromBatch;
    totalPrice += batchPrice;

    // Record this batch's contribution
    fefoSplitInfo.push({
      batch_id: batch.batch_id,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      quantity: quantityFromBatch,
    });

    // Once we need more than one batch, it's a split order
    if (fefoSplitInfo.length > 1) {
      isSplit = true;
    }
  }

  // Apply discount to total price
  totalPrice -= discount;

  // Create the cart item with FEFO split information
  return {
    cartItem: {
      product_id: product.product_id,
      product_name: product.name,
      // We use the first batch's ID and number as the primary reference
      batch_id: firstBatch.batch_id,
      batch_number: firstBatch.batch_number,
      unit_price: firstBatch.selling_price,
      quantity: quantity,
      discount: discount,
      total_price: totalPrice,
      max_quantity: getTotalAvailableQuantity(batches),
      is_fefo_split: isSplit,
      fefo_batches: fefoSplitInfo,
    },
    isSplit,
  };
};

// Reducer function to handle all state updates
function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    case "SET_STAGE":
      return { ...state, stage: action.payload };

    case "SET_CUSTOMER":
      return { ...state, selectedCustomer: action.payload };

    case "SET_PRODUCTS":
      return {
        ...state,
        products: action.payload,
        filteredProducts: action.payload,
      };

    case "SET_FILTERED_PRODUCTS":
      return { ...state, filteredProducts: action.payload };

    case "SET_PRODUCT_SEARCH":
      return { ...state, productSearch: action.payload };

    case "SET_SELECTED_PRODUCT":
      return { ...state, selectedProduct: action.payload };

    case "SET_PRODUCT_BATCHES":
      return { ...state, productBatches: action.payload };

    case "SET_SELECTED_BATCH": {
      // If FEFO is strictly enforced, validate the batch selection
      if (state.fefoEnabled && state.productBatches.length > 0) {
        const isFefoCompliant = validateFefoSelection(
          action.payload,
          state.productBatches
        );

        if (!isFefoCompliant) {
          // Force select the FEFO-compliant batch instead (auto-correction)
          return { ...state, selectedBatch: state.productBatches[0] };
        }
      }

      // Allow the selection if FEFO is compliant or disabled
      return { ...state, selectedBatch: action.payload };
    }

    case "ADD_TO_CART": {
      // Verify FEFO compliance if enabled
      if (state.fefoEnabled && state.productBatches.length > 0) {
        const fefoCompliantBatchId = state.productBatches[0].batch_id;

        // If this is not a FEFO-split item and the batch doesn't match the FEFO-compliant one
        if (
          !action.payload.is_fefo_split &&
          action.payload.batch_id !== fefoCompliantBatchId
        ) {
          console.warn(
            "FEFO policy violation: Attempted to add non-FEFO compliant batch to cart"
          );
          // Return state unchanged to prevent adding non-compliant item
          return state;
        }
      }

      const existingItemIndex = state.cartItems.findIndex(
        (item) =>
          item.product_id === action.payload.product_id &&
          item.batch_id === action.payload.batch_id
      );

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedCartItems = [...state.cartItems];
        const existingItem = updatedCartItems[existingItemIndex];

        updatedCartItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + action.payload.quantity,
          discount: existingItem.discount + action.payload.discount,
          total_price: existingItem.total_price + action.payload.total_price,
          is_fefo_split:
            existingItem.is_fefo_split || action.payload.is_fefo_split,
          fefo_batches:
            action.payload.fefo_batches || existingItem.fefo_batches,
        };

        return { ...state, cartItems: updatedCartItems };
      }

      // Add new item
      return {
        ...state,
        cartItems: [...state.cartItems, action.payload],
        selectedProduct: null,
        selectedBatch: null,
        productBatches: [],
        currentQuantity: 1,
        currentDiscount: 0,
        activeModal: ModalType.None,
      };
    }

    case "REMOVE_FROM_CART": {
      const newCartItems = [...state.cartItems];
      newCartItems.splice(action.payload, 1);
      return { ...state, cartItems: newCartItems };
    }

    case "SET_CURRENT_QUANTITY":
      return { ...state, currentQuantity: action.payload };

    case "SET_CURRENT_DISCOUNT":
      return { ...state, currentDiscount: action.payload };

    case "SET_HAS_RETURNS":
      return { ...state, hasReturns: action.payload };

    case "SET_CUSTOMER_ORDERS":
      return { ...state, customerOrders: action.payload };

    case "SET_SELECTED_ORDER_FOR_RETURN":
      return { ...state, selectedOrderForReturn: action.payload };

    case "SET_ORDER_ITEMS":
      return { ...state, orderItems: action.payload };

    case "ADD_RETURN_ITEM": {
      const existingItemIndex = state.returnItems.findIndex(
        (item) =>
          item.product_id === action.payload.product_id &&
          item.batch_id === action.payload.batch_id
      );

      if (existingItemIndex >= 0) {
        // Update existing return item
        const updatedReturnItems = [...state.returnItems];
        const existingItem = updatedReturnItems[existingItemIndex];

        updatedReturnItems[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + action.payload.quantity,
          total_price: existingItem.total_price + action.payload.total_price,
        };

        return { ...state, returnItems: updatedReturnItems };
      }

      // Add new return item
      return {
        ...state,
        returnItems: [...state.returnItems, action.payload],
      };
    }

    case "REMOVE_RETURN_ITEM": {
      const newReturnItems = [...state.returnItems];
      newReturnItems.splice(action.payload, 1);
      return { ...state, returnItems: newReturnItems };
    }

    case "SET_RETURN_REASON":
      return { ...state, returnReason: action.payload };

    case "SET_PAYMENT_TYPE":
      return { ...state, paymentType: action.payload };

    case "SET_ORDER_NOTES":
      return { ...state, orderNotes: action.payload };

    case "SET_ACTIVE_MODAL":
      return { ...state, activeModal: action.payload };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_NETWORK_CONNECTED":
      return { ...state, networkConnected: action.payload };

    case "TOGGLE_FEFO":
      return { ...state, fefoEnabled: action.payload };

    case "RESET_ORDER":
      return {
        ...initialState,
        networkConnected: state.networkConnected, // Preserve network state
        fefoEnabled: state.fefoEnabled, // Preserve FEFO enforcement setting
      };

    default:
      return state;
  }
}

// Create the context
interface OrderContextType {
  state: OrderState;
  dispatch: React.Dispatch<OrderAction>;
}

const OrderContext = createContext<OrderContextType>({
  state: initialState,
  dispatch: () => null,
});

// Provider component
export const OrderProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(orderReducer, initialState);

  // Calculate and derive values like total amount, discount, etc.
  const value = {
    state,
    dispatch,
  };

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
};

// Custom hook to use the order context
export const useOrderContext = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrderContext must be used within an OrderProvider");
  }
  return context;
};

// Helper function to get the FEFO-compliant batch (earliest expiry) from a list of batches
export const getFefoCompliantBatch = (batches: Batch[]): Batch | null => {
  if (batches.length === 0) return null;
  // The backend already sorts batches by expiry_date ASC, so the first one is FEFO compliant
  return batches[0];
};

// Helper function to calculate order summary
export const getOrderSummary = (
  cartItems: CartItem[],
  returnItems: ReturnItem[]
) => {
  const totalOrderAmount = cartItems.reduce(
    (acc, item) => acc + item.total_price,
    0
  );

  const totalDiscount = cartItems.reduce((acc, item) => acc + item.discount, 0);

  const totalReturnsAmount = returnItems.reduce(
    (acc, item) => acc + item.total_price,
    0
  );

  const finalAmount = Math.max(0, totalOrderAmount - totalReturnsAmount);

  return {
    totalOrderAmount,
    totalDiscount,
    totalReturnsAmount,
    finalAmount,
  };
};

// Helper function for currency formatting
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return "Rs. 0.00";
  }
  return `Rs. ${Number(amount).toFixed(2)}`;
};

// Helper function for date formatting
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error("Invalid date format:", error);
    return "Invalid date";
  }
};

// Helper to calculate remaining shelf life in days
export const getRemainingShelfLife = (expiryDate: string): number => {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper to check if a product is near expiry (less than 30 days)
export const isNearExpiry = (expiryDate: string): boolean => {
  return getRemainingShelfLife(expiryDate) < 30;
};

// Helper to get the total available quantity across all batches
export const getTotalStockFromBatches = (batches: Batch[]): number => {
  return batches.reduce((total, batch) => total + batch.current_quantity, 0);
};

// Helper to create and manage FEFO split orders
export const createFefoOrder = (
  product: Product | null,
  batches: Batch[],
  quantity: number,
  discount: number
): CartItem | null => {
  if (!product || batches.length === 0) return null;

  const { cartItem, isSplit } = createFefoSplitOrder(
    product,
    batches,
    quantity,
    discount
  );

  return cartItem;
};
