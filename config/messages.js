module.exports = {
  CART: {
    PRODUCT_NOT_AVAILABLE: 'Product not available',
    ITEM_NOT_FOUND: 'Item not found in cart',
    ITEM_REMOVED: 'Item removed from cart successfully',
    CART_UPDATED: 'Cart updated successfully',
    INVALID_ACTION: 'Invalid action. Use "increase" or "decrease"',
    MIN_QTY_WARNING: 'Minimum quantity is 1. Use remove button to delete item.',
    STOCK_LIMIT: 'Cannot add more items than available in stock'
  },
  CHECKOUT: {
    CART_EMPTY: "Your cart is empty.",
    INVALID_ADDRESS: "Invalid address selected.",
    ALL_FIELDS_REQUIRED: "All fields are required.",
    COD_LIMIT_EXCEEDED: "Orders above ₹1000 are not allowed for Cash on Delivery.",
    ORDER_SUCCESS: "Order placed successfully.",
    ORDER_FAILED: "Order failed. Please try again."
  },
  PRODUCT: {
    OUT_OF_STOCK: "Insufficient stock for a product.",
    NOT_FOUND: "Product not found!",
    SERVER_ERROR: "Server error while fetching product details."
  },
  COUPON: {
    INVALID: "Invalid coupon code!",
    EXPIRED: "Coupon expired!",
    CART_EMPTY: "Cart is empty!",
    MIN_CART_AMOUNT: min => `Minimum cart amount should be ₹${min}`,
    USAGE_LIMIT: "Coupon usage limit reached!",
    APPLIED: "Coupon applied successfully!",
    REMOVED: "Coupon removed successfully."
  },
  ORDER:{
    ORDER_NOT_FOUND: 'Order not found',
    ITEM_NOT_FOUND: 'Item not found in this order.',
    ALREADY_CANCELLED: 'This item is already cancelled.',
    ALREADY_RETURNED: 'This item is already Returned.',
    RETURN_SUCCESS: 'Return request submitted successfully',
    CANCEL_SUCCESS: 'Product cancelled successfully.',
  },
  ORDERS:{
    NOT_FOUND: 'Order not found',
    INVALID_FOR_RETURN: 'Invalid order for return',
    ITEM_NOT_FOUND: 'Item not found in this order.',
    ALREADY_RETURNED: 'This item is already Returned.',
    ALREADY_CANCELLED: 'This item is already cancelled.',
    CANCEL_SUCCESS: 'Product cancelled successfully.',
    CANCEL_ORDER_SUCCESS: 'Order cancelled and amount refunded (if applicable)',
    RETURN_SUCCESS: 'Return request submitted successfully'
  },
  PASSWORD: {
    CURRENT_WRONG: 'Current password is incorrect',
    MISMATCH: 'New passwords do not match',
    SUCCESS: 'Password changed successfully'
  },
  ADDRESS: {
    NOT_FOUND: 'Address not found',
    REQUIRED: 'All fields are required'
  },
  OTP: {
    INVALID: 'Invalid or expired OTP. Please try again.'
  },
  SIGNUP: {
    NAME_REQUIRED: "Name is required",
    NAME_MIN: "Name must be at least 2 characters long",
    EMAIL_REQUIRED: "Email is required",
    EMAIL_INVALID: "Please provide a valid email address",
    EMAIL_EXISTS: "Email already exists",
    PHONE_REQUIRED: "Phone number is required",
    PHONE_INVALID: "Please provide a valid 10-digit phone number",
    PHONE_EXISTS: "Phone number already exists",
    PASSWORD_REQUIRED: "Password is required",
    PASSWORD_MIN: "Password must be at least 8 characters long",
    PASSWORD_MISMATCH: "Passwords do not match",
    OTP_REQUIRED: "OTP is required.",
    OTP_INVALID: "Invalid OTP. Please try again.",
    OTP_EXPIRED: "OTP has expired. Please request a new one.",
    SESSION_EXPIRED: "Session expired. Please start over.",
    SUCCESS: "Signup successful!",
  },
   LOGIN: {
    EMAIL_REQUIRED: "Email is required",
    PASSWORD_REQUIRED: "Password is required",
    INVALID_CREDENTIALS: "Invalid email or password",
    BLOCKED: "Your account has been blocked by the admin.",
  },
  PASSWORD: {
    RESET_EMAIL_SENT: "Password reset link sent to your email",
    RESET_SUCCESS: "Password reset successfully",
    RESET_EXPIRED: "Invalid or expired token",
    RESET_MISMATCH: "Passwords do not match",
    RESET_MIN: "Password must be at least 6 characters",
  },
  WALLET: {
    USER_NOT_FOUND: 'User not found',
    SERVER_ERROR: 'Server error while fetching transactions'
  },
  WISHLIST: {
    USER_NOT_FOUND: "User not found.",
    REMOVED: "Removed from wishlist",
    ADDED: "Added to wishlist",
    MOVED_TO_CART: "Moved to cart"
  },
  ADMIN: {
    EMAIL_REQUIRED: "Email is required",
    PASSWORD_REQUIRED: "Password is required",
    EMAIL_INVALID: "Please enter a valid email address",
    PASSWORD_MIN: "Password must be at least 6 characters long",
    PASSWORD_MAX: "Password is too long",
    EMAIL_TOO_LONG: "Email address is too long",
    INVALID_EMAIL_PASSWORD: "Invalid email or password",
    LOGIN_SUCCESS: "Login successful",
    SERVER_ERROR: "An error occurred during login. Please try again."
  },
  CATEGORY: {
    NOT_FOUND: "Category not found",
    CREATED: "Category created successfully",
    UPDATED: "Category updated successfully",
    BLOCK_STATUS_UPDATED: "Category block status updated",
    FETCH_SUCCESS: "Categories fetched successfully"
  },
  COUPON: {
    NOT_FOUND: "Coupon not found",
    CREATED: "Coupon created successfully",
    UPDATED: "Coupon updated successfully",
    DELETED: "Coupon deleted successfully",
    CODE_EXISTS: "This coupon code already exists",
    INVALID_CODE: "Coupon code must be at least 3 characters and contain only uppercase letters/numbers",
    INVALID_TYPE: "Please select a valid discount type (Flat or Percentage)",
    INVALID_AMOUNT: "Discount amount must be greater than 0",
    INVALID_PERCENTAGE: "Percentage discount cannot exceed 100%",
    INVALID_FLAT: "Flat discount cannot exceed ₹50,000",
    INVALID_MAX_DISCOUNT: "Maximum discount must be positive and less than minimum cart amount",
    INVALID_MIN_CART: "Minimum cart amount must be non-negative and greater than discount",
    INVALID_USAGE: "Usage limit must be between 1 and 5",
    INVALID_EXPIRY: "Expiry date must be a valid future date",
    INVALID_ID: "Invalid coupon ID format"
  },
  INVENTORY: {
    FETCHED: "Inventory fetched successfully",
    UPDATED: "Stock updated successfully",
    STATUS_UPDATED: "Product status updated successfully",
    INVALID_STATUS: "Invalid product status",
    NEGATIVE_QUANTITY: "Quantity cannot be negative"
  },
};