const db = require("../config/db");

/**
 * Get all orders with pagination, sorting, and filtering options
 * @param {Object} req - Request object with query parameters
 * @param {Object} res - Response object
 */
const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = "order_date",
      order = "DESC",
      status,
      payment_status,
      customer_id,
      sales_rep_id,
      start_date,
      end_date,
      search,
    } = req.query;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build base query
    let query = `
      SELECT o.*, c.name as customer_name, u.full_name as sales_rep_name 
      FROM orders o 
      JOIN customers c ON o.customer_id = c.customer_id 
      JOIN users u ON o.sales_rep_id = u.user_id 
      WHERE 1=1
    `;

    // Build params array
    const params = [];

    // Add filters to query if provided
    if (status) {
      query += " AND o.status = ?";
      params.push(status);
    }

    if (payment_status) {
      query += " AND o.payment_status = ?";
      params.push(payment_status);
    }

    if (customer_id) {
      query += " AND o.customer_id = ?";
      params.push(customer_id);
    }

    if (sales_rep_id) {
      query += " AND o.sales_rep_id = ?";
      params.push(sales_rep_id);
    }

    if (start_date) {
      query += " AND o.order_date >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND o.order_date <= ?";
      params.push(end_date);
    }

    if (search) {
      query += " AND (o.order_id LIKE ? OR c.name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add sorting
    query += ` ORDER BY o.${sort} ${order}`;

    // Add pagination
    query += " LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    // Execute query
    const [orders] = await db.query(query, params);

    // Get total count for pagination
    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM orders o WHERE 1=1" +
        (status ? " AND o.status = ?" : "") +
        (payment_status ? " AND o.payment_status = ?" : "") +
        (customer_id ? " AND o.customer_id = ?" : "") +
        (sales_rep_id ? " AND o.sales_rep_id = ?" : "") +
        (start_date ? " AND o.order_date >= ?" : "") +
        (end_date ? " AND o.order_date <= ?" : "") +
        (search
          ? " AND (o.order_id LIKE ? OR o.customer_id IN (SELECT customer_id FROM customers WHERE name LIKE ?))"
          : ""),
      params.slice(0, -2) // Remove limit and offset params
    );

    // Return paginated results
    res.json({
      data: orders,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
};

/**
 * Get order details by ID including order items and related information
 * @param {Object} req - Request object with order ID parameter
 * @param {Object} res - Response object
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get order details
    const [orders] = await db.query(
      `SELECT o.*, c.name as customer_name, c.contact_person, c.phone, c.address, 
              u.full_name as sales_rep_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       JOIN users u ON o.sales_rep_id = u.user_id
       WHERE o.order_id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[0];

    // Get order items with product details and batch information
    // Removed image_url from the query
    const [orderItems] = await db.query(
      `SELECT oi.*, p.name as product_name, pb.batch_number, 
              pb.expiry_date, pb.manufacturing_date
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       JOIN product_batches pb ON oi.batch_id = pb.batch_id
       WHERE oi.order_id = ?`,
      [id]
    );

    // Get delivery information if available
    const [deliveries] = await db.query(
      `SELECT d.*, u.full_name as driver_name, v.name as vehicle_name, 
              v.registration_number
       FROM deliveries d
       LEFT JOIN users u ON d.driver_id = u.user_id
       LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id
       WHERE d.order_id = ?`,
      [id]
    );

    // Get payment information
    const [payments] = await db.query(
      `SELECT p.*, u.full_name as received_by_name
       FROM payments p
       LEFT JOIN users u ON p.received_by = u.user_id
       WHERE p.order_id = ?`,
      [id]
    );

    // Get return information if available
    const [returns] = await db.query(
      `SELECT r.*, u.full_name as processed_by_name
       FROM returns r
       JOIN users u ON r.processed_by = u.user_id
       WHERE r.order_id = ?`,
      [id]
    );

    // Get return items if there are any returns
    let returnItems = [];
    if (returns.length > 0) {
      [returnItems] = await db.query(
        `SELECT ri.*, p.name as product_name, pb.batch_number
         FROM return_items ri
         JOIN products p ON ri.product_id = p.product_id
         JOIN product_batches pb ON ri.batch_id = pb.batch_id
         WHERE ri.return_id = ?`,
        [returns[0].return_id]
      );
    }

    // Compile complete order data
    const orderData = {
      ...order,
      items: orderItems,
      delivery: deliveries.length > 0 ? deliveries[0] : null,
      payments: payments,
      return:
        returns.length > 0
          ? {
              ...returns[0],
              items: returnItems,
            }
          : null,
    };

    res.json(orderData);
  } catch (error) {
    console.error("Error fetching order details:", error);
    res
      .status(500)
      .json({ message: "Error fetching order details", error: error.message });
  }
};

/**
 * Create a new order
 * @param {Object} req - Request object with order data
 * @param {Object} res - Response object
 */
const createOrder = async (req, res) => {
  let connection;
  try {
    // Get order data from request body
    const {
      customer_id,
      sales_rep_id,
      delivery_date,
      payment_type,
      notes,
      items,
    } = req.body;

    // Validate required fields
    if (
      !customer_id ||
      !sales_rep_id ||
      !payment_type ||
      !items ||
      !items.length
    ) {
      return res.status(400).json({
        message: "Missing required fields",
        required: "customer_id, sales_rep_id, payment_type, items",
      });
    }

    // Start transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Initialize order totals
    let total_amount = 0;
    let discount_amount = 0;

    // Generate new order ID
    const [lastOrderResult] = await connection.query(
      "SELECT order_id FROM orders ORDER BY created_at DESC LIMIT 1"
    );

    let order_id;
    if (lastOrderResult.length > 0) {
      // Extract number from last order ID
      const lastNumber = parseInt(lastOrderResult[0].order_id.substring(1));
      order_id = `O${lastNumber + 1}`;
    } else {
      order_id = "O1001"; // Start with 1001 if no orders exist
    }

    // Process each order item
    const processedItems = [];
    for (const item of items) {
      // Validate item data
      if (
        !item.product_id ||
        !item.batch_id ||
        !item.quantity ||
        !item.unit_price
      ) {
        await connection.rollback();
        return res.status(400).json({
          message: "Invalid item data",
          required: "product_id, batch_id, quantity, unit_price for each item",
        });
      }

      // Check if batch has enough stock
      const [batchResult] = await connection.query(
        "SELECT current_quantity FROM product_batches WHERE batch_id = ?",
        [item.batch_id]
      );

      if (batchResult.length === 0) {
        await connection.rollback();
        return res
          .status(404)
          .json({ message: `Batch ${item.batch_id} not found` });
      }

      if (batchResult[0].current_quantity < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          message: `Insufficient stock for batch ${item.batch_id}`,
          available: batchResult[0].current_quantity,
          requested: item.quantity,
        });
      }

      // Calculate item total
      const discount = item.discount || 0;
      const itemTotal = item.quantity * item.unit_price - discount;

      // Add to order totals
      total_amount += itemTotal;
      discount_amount += discount;

      // Update batch quantity
      await connection.query(
        "UPDATE product_batches SET current_quantity = current_quantity - ? WHERE batch_id = ?",
        [item.quantity, item.batch_id]
      );

      // Generate order item ID
      const [lastItemResult] = await connection.query(
        "SELECT order_item_id FROM order_items ORDER BY order_item_id DESC LIMIT 1"
      );

      let order_item_id;
      if (lastItemResult.length > 0) {
        const lastNumber = parseInt(
          lastItemResult[0].order_item_id.substring(2)
        );
        order_item_id = `OI${lastNumber + 1}`;
      } else {
        order_item_id = "OI1001";
      }

      // Add to processed items
      processedItems.push({
        order_item_id,
        order_id,
        product_id: item.product_id,
        batch_id: item.batch_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: discount,
        total_price: itemTotal,
      });
    }

    // Create the order
    await connection.query(
      `INSERT INTO orders 
       (order_id, customer_id, sales_rep_id, order_date, delivery_date, 
        payment_type, payment_status, total_amount, final_amount, discount_amount, notes, status) 
       VALUES (?, ?, ?, NOW(), ?, ?, 'pending', ?, ?, ?, ?, 'pending')`,
      [
        order_id,
        customer_id,
        sales_rep_id,
        delivery_date || null,
        payment_type,
        total_amount,
        total_amount,
        discount_amount,
        notes || null,
      ]
    );

    // Insert all order items
    for (const item of processedItems) {
      await connection.query(
        `INSERT INTO order_items 
         (order_item_id, order_id, product_id, batch_id, quantity, unit_price, discount, total_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.order_item_id,
          item.order_id,
          item.product_id,
          item.batch_id,
          item.quantity,
          item.unit_price,
          item.discount,
          item.total_price,
        ]
      );
    }

    // Update customer credit balance if payment type is 'credit'
    if (payment_type === "credit") {
      await connection.query(
        "UPDATE customers SET credit_balance = credit_balance + ? WHERE customer_id = ?",
        [total_amount, customer_id]
      );
    }

    // Commit transaction
    await connection.commit();

    // Return success response
    res.status(201).json({
      message: "Order created successfully",
      order_id,
      total_amount,
      discount_amount,
      items: processedItems,
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error creating order:", error);
    res
      .status(500)
      .json({ message: "Error creating order", error: error.message });
  } finally {
    // Release connection
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Update an existing order status
 * @param {Object} req - Request object with order ID parameter and update data
 * @param {Object} res - Response object
 */
const updateOrderStatus = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["pending", "processing", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
        valid_statuses: validStatuses,
      });
    }

    // Get a connection and start transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if order exists and get its current status
    const [orderResult] = await connection.query(
      "SELECT * FROM orders WHERE order_id = ?",
      [id]
    );

    if (orderResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult[0];
    const previousStatus = order.status;

    // If cancelling an order that was not previously cancelled
    if (status === "cancelled" && previousStatus !== "cancelled") {
      console.log(`Cancelling order ${id}. Restoring inventory...`);

      // Get all order items to restore inventory
      const [orderItems] = await connection.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [id]
      );

      // Restore inventory for each item
      for (const item of orderItems) {
        // Update batch quantity - add the items back to inventory
        await connection.query(
          "UPDATE product_batches SET current_quantity = current_quantity + ? WHERE batch_id = ?",
          [item.quantity, item.batch_id]
        );

        console.log(
          `Restored ${item.quantity} units to batch ${item.batch_id}`
        );
      }

      // If the order was on credit, update customer's credit balance
      if (order.payment_type === "credit" && order.payment_status !== "paid") {
        await connection.query(
          "UPDATE customers SET credit_balance = credit_balance - ? WHERE customer_id = ?",
          [order.total_amount, order.customer_id]
        );

        console.log(
          `Reduced credit balance for customer ${order.customer_id} by ${order.total_amount}`
        );
      }

      // Log any payments made and keep record (don't refund automatically)
      const [payments] = await connection.query(
        "SELECT * FROM payments WHERE order_id = ?",
        [id]
      );

      if (payments.length > 0) {
        console.log(
          `Order has ${payments.length} payments recorded. These will need manual processing for refunds.`
        );

        // Add a note to the order about payments
        const paymentsNote = `Order cancelled with ${payments.length} payments recorded. Manual refund processing required.`;
        await connection.query(
          "UPDATE orders SET notes = CONCAT(IFNULL(notes, ''), ?) WHERE order_id = ?",
          [`\n${paymentsNote}`, id]
        );
      }
    }

    // If marking as delivered, update delivery status if there is one
    if (status === "delivered" && previousStatus !== "delivered") {
      // Check if there's a delivery record
      const [deliveryResult] = await connection.query(
        "SELECT * FROM deliveries WHERE order_id = ?",
        [id]
      );

      if (deliveryResult.length > 0) {
        const delivery = deliveryResult[0];

        // Update delivery status and date
        await connection.query(
          "UPDATE deliveries SET status = 'delivered', delivery_date = CURDATE() WHERE delivery_id = ?",
          [delivery.delivery_id]
        );

        // Update vehicle status to available
        await connection.query(
          "UPDATE vehicles SET status = 'available' WHERE vehicle_id = ?",
          [delivery.vehicle_id]
        );

        console.log(
          `Updated delivery status for delivery ${delivery.delivery_id} to delivered`
        );
      }
    }

    // Update order status
    await connection.query(
      "UPDATE orders SET status = ?, updated_at = NOW() WHERE order_id = ?",
      [status, id]
    );

    // Commit transaction
    await connection.commit();

    res.json({
      message: "Order status updated successfully",
      order_id: id,
      status,
      inventory_restored:
        status === "cancelled" && previousStatus !== "cancelled",
      previous_status: previousStatus,
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({ message: "Error updating order status", error: error.message });
  } finally {
    // Release connection
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Update order payment status
 * @param {Object} req - Request object with order ID parameter and payment data
 * @param {Object} res - Response object
 */
const updatePaymentStatus = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const {
      payment_status,
      amount,
      payment_method,
      reference_number,
      received_by,
      notes,
    } = req.body;

    // Validate payment status
    const validPaymentStatuses = ["pending", "partial", "paid"];
    if (!validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({
        message: "Invalid payment status",
        valid_statuses: validPaymentStatuses,
      });
    }

    // Start transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if order exists and get details
    const [orderResult] = await connection.query(
      "SELECT * FROM orders WHERE order_id = ?",
      [id]
    );

    if (orderResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult[0];

    // For partial or paid status, check if payment details are provided
    if (
      (payment_status === "partial" || payment_status === "paid") &&
      (!amount || !payment_method)
    ) {
      await connection.rollback();
      return res.status(400).json({
        message: "Payment details required",
        required: "amount, payment_method",
      });
    }

    // Update order payment status
    await connection.query(
      "UPDATE orders SET payment_status = ?, updated_at = NOW() WHERE order_id = ?",
      [payment_status, id]
    );

    // If payment amount is provided, record the payment
    if (amount && payment_method) {
      // Generate payment ID
      const [lastPaymentResult] = await connection.query(
        "SELECT payment_id FROM payments ORDER BY created_at DESC LIMIT 1"
      );

      let payment_id;
      if (lastPaymentResult.length > 0) {
        const lastNumber = parseInt(
          lastPaymentResult[0].payment_id.substring(1)
        );
        payment_id = `P${lastNumber + 1}`;
      } else {
        payment_id = "P1001";
      }

      // Record payment
      await connection.query(
        `INSERT INTO payments 
         (payment_id, order_id, payment_date, amount, payment_method, 
          reference_number, received_by, notes)
         VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
        [
          payment_id,
          id,
          amount,
          payment_method,
          reference_number || null,
          received_by || null,
          notes || null,
        ]
      ); // If order was on credit, update customer's credit balance
      if (order.payment_type === "credit") {
        // Get current payments total to determine how much to adjust
        const [paymentsResult] = await connection.query(
          "SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ?",
          [id]
        );

        // The total_paid now includes the payment we just recorded
        const totalPaid = paymentsResult[0].total_paid || 0;

        // Adjust credit balance based on payment status
        if (payment_status === "paid") {
          // Calculate the remaining amount that needed to be paid before this payment
          const previouslyPaidAmount = totalPaid - amount;
          const remainingBeforeThisPayment =
            order.total_amount - previouslyPaidAmount;

          // Only reduce the credit balance by the actual amount needed to complete the payment
          // This prevents over-reducing the credit balance if payment exceeds order amount
          const amountToAdjust = Math.min(amount, remainingBeforeThisPayment);

          await connection.query(
            "UPDATE customers SET credit_balance = credit_balance - ? WHERE customer_id = ?",
            [amountToAdjust, order.customer_id]
          );

          // Log if there's an overpayment
          if (amount > remainingBeforeThisPayment) {
            console.log(
              `Warning: Overpayment for order ${id}. Credit balance adjusted only by ${amountToAdjust}, not full payment of ${amount}`
            );
          }
        } else {
          // For partial payments, just reduce by the current payment amount
          await connection.query(
            "UPDATE customers SET credit_balance = credit_balance - ? WHERE customer_id = ?",
            [amount, order.customer_id]
          );
        }
      }
    }

    // Commit transaction
    await connection.commit();

    res.json({
      message: "Order payment status updated successfully",
      order_id: id,
      payment_status,
      amount: amount || 0,
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error updating payment status:", error);
    res
      .status(500)
      .json({ message: "Error updating payment status", error: error.message });
  } finally {
    // Release connection
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Get order statistics for dashboard
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getOrderStats = async (req, res) => {
  try {
    // Get total orders count
    const [totalOrders] = await db.query(
      "SELECT COUNT(*) as count FROM orders"
    );

    // Get pending delivery count
    const [pendingDeliveries] = await db.query(
      "SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'processing')"
    );

    // Get orders by status
    const [ordersByStatus] = await db.query(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    );

    // Get orders by payment status
    const [ordersByPaymentStatus] = await db.query(
      `SELECT payment_status, COUNT(*) as count FROM orders GROUP BY payment_status`
    );

    // Get recent orders (last 5)
    const [recentOrders] = await db.query(
      `SELECT o.order_id, o.order_date, o.total_amount, o.status, 
              c.name as customer_name
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       ORDER BY o.order_date DESC
       LIMIT 5`
    );

    // Get this month's order total
    const [monthlyTotal] = await db.query(
      `SELECT SUM(total_amount) as total 
       FROM orders 
       WHERE MONTH(order_date) = MONTH(CURRENT_DATE()) 
       AND YEAR(order_date) = YEAR(CURRENT_DATE())
       AND status != 'cancelled'`
    );

    // Get last month's order total for comparison
    const [lastMonthTotal] = await db.query(
      `SELECT SUM(total_amount) as total 
       FROM orders 
       WHERE MONTH(order_date) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) 
       AND YEAR(order_date) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
       AND status != 'cancelled'`
    );

    // Calculate monthly growth
    const currentMonthTotal = monthlyTotal[0].total || 0;
    const previousMonthTotal = lastMonthTotal[0].total || 0;
    const growth =
      previousMonthTotal > 0
        ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
        : 0;

    // Get low stock products (for notifications)
    const [lowStockProducts] = await db.query(
      `SELECT 
        p.product_id, 
        p.name, 
        SUM(pb.current_quantity) as total_stock,
        p.reorder_level
      FROM products p
      JOIN product_batches pb ON p.product_id = pb.product_id
      WHERE pb.is_active = 1
      GROUP BY p.product_id
      HAVING SUM(pb.current_quantity) <= p.reorder_level
      ORDER BY (SUM(pb.current_quantity) / p.reorder_level) ASC
      LIMIT 5`
    );

    res.json({
      total_orders: totalOrders[0].count,
      pending_deliveries: pendingDeliveries[0].count,
      orders_by_status: ordersByStatus,
      orders_by_payment_status: ordersByPaymentStatus,
      recent_orders: recentOrders,
      monthly_total: currentMonthTotal,
      monthly_growth: growth.toFixed(2),
      low_stock_products: lowStockProducts,
    });
  } catch (error) {
    console.error("Error fetching order statistics:", error);
    res.status(500).json({
      message: "Error fetching order statistics",
      error: error.message,
    });
  }
};

/**
 * Process product returns for an order
 * @param {Object} req - Request object with order ID parameter and return data
 * @param {Object} res - Response object
 */
const processReturn = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { processed_by, reason, items } = req.body;

    // Validate required fields
    if (!processed_by || !reason || !items || !items.length) {
      return res.status(400).json({
        message: "Missing required fields",
        required: "processed_by, reason, items",
      });
    }

    // Start transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if order exists
    const [orderResult] = await connection.query(
      "SELECT * FROM orders WHERE order_id = ?",
      [id]
    );

    if (orderResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult[0];

    // Check if order can have returns processed (should be delivered)
    if (order.status !== "delivered") {
      await connection.rollback();
      return res.status(400).json({
        message: `Cannot process returns for an order with status '${order.status}'. Order must be 'delivered'`,
      });
    }

    // Check if there's already a return for this order
    const [existingReturns] = await connection.query(
      "SELECT * FROM returns WHERE order_id = ?",
      [id]
    );

    if (existingReturns.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "A return has already been processed for this order",
        return_id: existingReturns[0].return_id,
      });
    }

    // Generate return ID
    const [lastReturnResult] = await connection.query(
      "SELECT return_id FROM returns ORDER BY created_at DESC LIMIT 1"
    );

    let return_id;
    if (lastReturnResult.length > 0) {
      const lastNumber = parseInt(lastReturnResult[0].return_id.substring(1));
      return_id = `R${lastNumber + 1}`;
    } else {
      return_id = "R1001";
    }

    // Process return items and calculate total amount
    let total_return_amount = 0;
    const processedItems = [];

    for (const item of items) {
      // Validate item data
      if (
        !item.product_id ||
        !item.batch_id ||
        !item.quantity ||
        !item.unit_price ||
        !item.reason
      ) {
        await connection.rollback();
        return res.status(400).json({
          message: "Invalid return item data",
          required:
            "product_id, batch_id, quantity, unit_price, reason for each item",
        });
      }

      // Validate return reason
      const validReasons = ["damaged", "expired", "unwanted", "wrong_item"];
      if (!validReasons.includes(item.reason)) {
        await connection.rollback();
        return res.status(400).json({
          message: "Invalid return reason",
          valid_reasons: validReasons,
        });
      }

      // Check if the item was part of the original order
      const [orderItemResult] = await connection.query(
        `SELECT * FROM order_items 
         WHERE order_id = ? AND product_id = ? AND batch_id = ?`,
        [id, item.product_id, item.batch_id]
      );

      if (orderItemResult.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          message: `Product ${item.product_id} from batch ${item.batch_id} was not part of the original order`,
        });
      }

      const orderItem = orderItemResult[0];

      // Check if return quantity is valid
      if (item.quantity > orderItem.quantity) {
        await connection.rollback();
        return res.status(400).json({
          message: `Return quantity exceeds ordered quantity for product ${item.product_id}`,
          ordered: orderItem.quantity,
          attempting_to_return: item.quantity,
        });
      }

      // Calculate item total
      const itemTotal = item.quantity * item.unit_price;
      total_return_amount += itemTotal;

      // Update inventory
      await connection.query(
        "UPDATE product_batches SET current_quantity = current_quantity + ? WHERE batch_id = ?",
        [item.quantity, item.batch_id]
      );

      // Generate return item ID
      const [lastReturnItemResult] = await connection.query(
        "SELECT return_item_id FROM return_items ORDER BY return_item_id DESC LIMIT 1"
      );

      let return_item_id;
      if (lastReturnItemResult.length > 0) {
        const lastNumber = parseInt(
          lastReturnItemResult[0].return_item_id.substring(2)
        );
        return_item_id = `RI${lastNumber + 1}`;
      } else {
        return_item_id = "RI1001";
      }

      // Add to processed items
      processedItems.push({
        return_item_id,
        return_id,
        product_id: item.product_id,
        batch_id: item.batch_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: itemTotal,
        reason: item.reason,
      });
    }

    // Create the return record
    await connection.query(
      `INSERT INTO returns 
       (return_id, order_id, return_date, processed_by, reason, total_amount, status)
       VALUES (?, ?, NOW(), ?, ?, ?, 'processed')`,
      [return_id, id, processed_by, reason, total_return_amount]
    );

    // Insert all return items
    for (const item of processedItems) {
      await connection.query(
        `INSERT INTO return_items 
         (return_item_id, return_id, product_id, batch_id, quantity, unit_price, total_price, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.return_item_id,
          item.return_id,
          item.product_id,
          item.batch_id,
          item.quantity,
          item.unit_price,
          item.total_price,
          item.reason,
        ]
      );
    }

    // Calculate final amount after returns and update order
    const final_amount = order.total_amount - total_return_amount;

    // Update order final amount
    await connection.query(
      "UPDATE orders SET final_amount = ? WHERE order_id = ?",
      [final_amount, id]
    );

    // If the order was on credit, update customer's credit balance
    if (order.payment_type === "credit" && order.payment_status !== "paid") {
      await connection.query(
        "UPDATE customers SET credit_balance = credit_balance - ? WHERE customer_id = ?",
        [total_return_amount, order.customer_id]
      );
    }

    // Commit transaction
    await connection.commit();

    res.status(201).json({
      message: "Return processed successfully",
      return_id,
      order_id: id,
      total_return_amount,
      final_amount,
      items: processedItems,
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error processing return:", error);
    res
      .status(500)
      .json({ message: "Error processing return", error: error.message });
  } finally {
    // Release connection
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Get order history for a specific customer
 * @param {Object} req - Request object with customer ID parameter
 * @param {Object} res - Response object
 */
const getCustomerOrderHistory = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Check if customer exists
    const [customerResult] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [customerId]
    );

    if (customerResult.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get customer orders
    const [orders] = await db.query(
      `SELECT o.*, u.full_name as sales_rep_name,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as item_count
       FROM orders o
       JOIN users u ON o.sales_rep_id = u.user_id
       WHERE o.customer_id = ?
       ORDER BY o.order_date DESC`,
      [customerId]
    );

    // Get order summary stats
    const [summary] = await db.query(
      `SELECT 
         COUNT(*) as total_orders,
         SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END) as total_spent,
         COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
         SUM(CASE WHEN payment_status = 'pending' THEN total_amount 
              WHEN payment_status = 'partial' THEN 
                (total_amount - IFNULL((SELECT SUM(amount) FROM payments WHERE order_id = o.order_id), 0))
              ELSE 0 END) as outstanding_amount
       FROM orders o
       WHERE customer_id = ?`,
      [customerId]
    );

    res.json({
      customer: customerResult[0],
      orders: orders,
      summary: summary[0],
    });
  } catch (error) {
    console.error("Error fetching customer order history:", error);
    res.status(500).json({
      message: "Error fetching customer order history",
      error: error.message,
    });
  }
};

/**
 * Assign a delivery to an order
 * @param {Object} req - Request object with order ID parameter and delivery data
 * @param {Object} res - Response object
 */
const assignDelivery = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { driver_id, vehicle_id, scheduled_date, notes } = req.body;

    // Validate required fields
    if (!driver_id || !vehicle_id || !scheduled_date) {
      return res.status(400).json({
        message: "Missing required fields",
        required: "driver_id, vehicle_id, scheduled_date",
      });
    }

    // Start transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if order exists
    const [orderResult] = await connection.query(
      "SELECT * FROM orders WHERE order_id = ?",
      [id]
    );

    if (orderResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if order is in appropriate status
    if (
      orderResult[0].status !== "pending" &&
      orderResult[0].status !== "processing"
    ) {
      await connection.rollback();
      return res.status(400).json({
        message: `Cannot assign delivery for an order with status '${orderResult[0].status}'. Order must be 'pending' or 'processing'`,
      });
    }

    // Check if driver exists and is a lorry driver
    const [driverResult] = await connection.query(
      "SELECT * FROM users WHERE user_id = ? AND role = 'lorry_driver'",
      [driver_id]
    );

    if (driverResult.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "Driver not found or not authorized" });
    }

    // Check if vehicle exists and is available
    const [vehicleResult] = await connection.query(
      "SELECT * FROM vehicles WHERE vehicle_id = ? AND status = 'available'",
      [vehicle_id]
    );

    if (vehicleResult.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "Vehicle not found or not available" });
    }

    // Check if delivery already exists for this order
    const [existingDelivery] = await connection.query(
      "SELECT * FROM deliveries WHERE order_id = ?",
      [id]
    );

    if (existingDelivery.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "A delivery is already assigned to this order",
        delivery_id: existingDelivery[0].delivery_id,
      });
    }

    // Generate delivery ID
    const [lastDeliveryResult] = await connection.query(
      "SELECT delivery_id FROM deliveries ORDER BY created_at DESC LIMIT 1"
    );

    let delivery_id;
    if (lastDeliveryResult.length > 0) {
      const lastNumber = parseInt(
        lastDeliveryResult[0].delivery_id.substring(1)
      );
      delivery_id = `D${lastNumber + 1}`;
    } else {
      delivery_id = "D1001";
    }

    // Create delivery record
    await connection.query(
      `INSERT INTO deliveries 
       (delivery_id, order_id, driver_id, vehicle_id, scheduled_date, status, notes)
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`,
      [delivery_id, id, driver_id, vehicle_id, scheduled_date, notes || null]
    );

    // Update order status to processing if it's not already
    if (orderResult[0].status === "pending") {
      await connection.query(
        "UPDATE orders SET status = 'processing' WHERE order_id = ?",
        [id]
      );
    }

    // Update vehicle status to on_route
    await connection.query(
      "UPDATE vehicles SET status = 'on_route' WHERE vehicle_id = ?",
      [vehicle_id]
    );

    // Commit transaction
    await connection.commit();

    res.status(201).json({
      message: "Delivery assigned successfully",
      delivery_id,
      order_id: id,
      driver_id,
      vehicle_id,
      scheduled_date,
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error assigning delivery:", error);
    res
      .status(500)
      .json({ message: "Error assigning delivery", error: error.message });
  } finally {
    // Release connection
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Update delivery status
 * @param {Object} req - Request object with delivery ID parameter and status data
 * @param {Object} res - Response object
 */
const updateDeliveryStatus = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ["scheduled", "in_progress", "delivered", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
        valid_statuses: validStatuses,
      });
    }

    // Start transaction
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if delivery exists
    const [deliveryResult] = await connection.query(
      "SELECT d.*, o.order_id FROM deliveries d JOIN orders o ON d.order_id = o.order_id WHERE d.delivery_id = ?",
      [id]
    );

    if (deliveryResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Delivery not found" });
    }

    const delivery = deliveryResult[0];

    // Update delivery status
    await connection.query(
      'UPDATE deliveries SET status = ?, notes = CONCAT(IFNULL(notes, ""), ?), updated_at = NOW() WHERE delivery_id = ?',
      [status, notes ? `\n${notes}` : "", id]
    );

    // If status is 'delivered', update order status and set delivery date
    if (status === "delivered") {
      await connection.query(
        "UPDATE orders SET status = 'delivered' WHERE order_id = ?",
        [delivery.order_id]
      );

      await connection.query(
        "UPDATE deliveries SET delivery_date = CURDATE() WHERE delivery_id = ?",
        [id]
      );

      // Make vehicle available again
      await connection.query(
        "UPDATE vehicles SET status = 'available' WHERE vehicle_id = ?",
        [delivery.vehicle_id]
      );
    } // If status is 'failed', reset vehicle status and set order back to processing
    if (status === "failed") {
      await connection.query(
        "UPDATE vehicles SET status = 'available' WHERE vehicle_id = ?",
        [delivery.vehicle_id]
      );

      // Set order back to processing status as delivery failed
      await connection.query(
        "UPDATE orders SET status = 'processing' WHERE order_id = ?",
        [delivery.order_id]
      );
    }

    // If status is 'in_progress', update order status if needed
    if (status === "in_progress") {
      // Get current order status
      const [orderResult] = await connection.query(
        "SELECT status FROM orders WHERE order_id = ?",
        [delivery.order_id]
      );

      if (orderResult.length > 0 && orderResult[0].status === "pending") {
        await connection.query(
          "UPDATE orders SET status = 'processing' WHERE order_id = ?",
          [delivery.order_id]
        );
      }
    }

    // Commit transaction
    await connection.commit();

    res.json({
      message: "Delivery status updated successfully",
      delivery_id: id,
      status,
    });
  } catch (error) {
    // Rollback transaction in case of error
    if (connection) {
      await connection.rollback();
    }
    console.error("Error updating delivery status:", error);
    res.status(500).json({
      message: "Error updating delivery status",
      error: error.message,
    });
  } finally {
    // Release connection
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Add notes to an order
 * @param {Object} req - Request object with order ID parameter and notes data
 * @param {Object} res - Response object
 */
const addOrderNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Validate notes
    if (!notes || notes.trim() === "") {
      return res.status(400).json({
        message: "Notes content is required",
      });
    }

    // Check if order exists
    const [orderResult] = await db.query(
      "SELECT * FROM orders WHERE order_id = ?",
      [id]
    );

    if (orderResult.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderResult[0];

    // Format timestamp for the new note
    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);

    // Prepare new note with timestamp
    const formattedNote = `[${timestamp}] ${notes}`;

    // Update order notes (append to existing notes if any)
    await db.query(
      "UPDATE orders SET notes = CONCAT(IFNULL(notes, ''), ?) WHERE order_id = ?",
      [order.notes ? `\n\n${formattedNote}` : formattedNote, id]
    );

    res.json({
      message: "Order notes added successfully",
      order_id: id,
    });
  } catch (error) {
    console.error("Error adding order notes:", error);
    res
      .status(500)
      .json({ message: "Error adding order notes", error: error.message });
  }
};

/**
 * Get driver's deliveries
 * @param {Object} req - Request object with driver ID parameter
 * @param {Object} res - Response object
 */
const getDriverDeliveries = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.query;

    // Check if driver exists
    const [driverResult] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND role = 'lorry_driver'",
      [driverId]
    );

    if (driverResult.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Build query based on status filter
    let query = `
      SELECT d.*, o.order_id, o.customer_id, c.name as customer_name, 
             c.address, c.phone, o.total_amount, o.status as order_status,
             v.name as vehicle_name, v.registration_number
      FROM deliveries d
      JOIN orders o ON d.order_id = o.order_id
      JOIN customers c ON o.customer_id = c.customer_id
      JOIN vehicles v ON d.vehicle_id = v.vehicle_id
      WHERE d.driver_id = ?
    `;

    const params = [driverId];

    if (status) {
      query += " AND d.status = ?";
      params.push(status);
    }

    query += " ORDER BY d.scheduled_date ASC";

    // Execute query
    const [deliveries] = await db.query(query, params);

    // Get delivery stats
    const [stats] = await db.query(
      `SELECT 
         COUNT(*) as total_deliveries,
         COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
         COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
         COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
       FROM deliveries
       WHERE driver_id = ?`,
      [driverId]
    );

    res.json({
      data: deliveries,
      stats: stats[0],
    });
  } catch (error) {
    console.error("Error fetching driver deliveries:", error);
    res.status(500).json({
      message: "Error fetching driver deliveries",
      error: error.message,
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getOrderStats,
  processReturn,
  getCustomerOrderHistory,
  assignDelivery,
  updateDeliveryStatus,
  addOrderNotes,
  getDriverDeliveries,
};
