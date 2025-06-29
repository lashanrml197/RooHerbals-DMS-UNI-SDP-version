const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// Get customers for selection
const getCustomers = async (req, res) => {
  try {
    const [customers] = await db.query(
      "SELECT customer_id, name, contact_person, phone, city, area FROM customers WHERE is_active = 1 ORDER BY name"
    );

    res.json({ success: true, data: customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customers",
      error: error.message,
    });
  }
};

// Get products with available batches
const getProducts = async (req, res) => {
  try {
    // Get all active products
    const [products] = await db.query(`
      SELECT 
        p.product_id,
        p.name,
        p.description,
        p.unit_price,
        p.category_id,
        c.name as category_name,
        COALESCE(SUM(pb.current_quantity), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN product_batches pb ON p.product_id = pb.product_id AND pb.is_active = 1 AND pb.current_quantity > 0
      WHERE p.is_active = 1
      GROUP BY p.product_id
      ORDER BY p.name
    `);

    res.json({ success: true, data: products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message,
    });
  }
};

// Get batches for a specific product
const getProductBatches = async (req, res) => {
  try {
    const { productId } = req.params;

    const [batches] = await db.query(
      `
      SELECT 
        pb.batch_id,
        pb.batch_number,
        pb.manufacturing_date,
        pb.expiry_date,
        pb.selling_price,
        pb.current_quantity,
        s.name as supplier_name
      FROM product_batches pb
      LEFT JOIN suppliers s ON pb.supplier_id = s.supplier_id
      WHERE pb.product_id = ? AND pb.is_active = 1 AND pb.current_quantity > 0
      ORDER BY pb.expiry_date ASC
    `,
      [productId]
    );

    res.json({ success: true, data: batches });
  } catch (error) {
    console.error("Error fetching product batches:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product batches",
      error: error.message,
    });
  }
};

// Get customer's previous orders for returns
const getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;

    console.log("Fetching orders for customer:", customerId);
    console.log("Type of customerId:", typeof customerId);

    const [orders] = await db.query(
      `
      SELECT 
        o.order_id,
        o.order_date,
        o.total_amount,
        o.status
      FROM orders o
      WHERE o.customer_id = ? AND o.status IN ('delivered', 'processing')
      ORDER BY o.order_date DESC
      LIMIT 20
    `,
      [customerId]
    );

    console.log("Query results:", orders.length, "orders found");

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer orders",
      error: error.message,
    });
  }
};

// Get order items for return selection
const getOrderItems = async (req, res) => {
  try {
    const { orderId } = req.params;

    const [items] = await db.query(
      `
      SELECT 
        oi.order_item_id,
        oi.product_id,
        p.name as product_name,
        oi.batch_id,
        pb.batch_number,
        oi.quantity,
        oi.unit_price,
        oi.discount,
        oi.total_price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      JOIN product_batches pb ON oi.batch_id = pb.batch_id
      WHERE oi.order_id = ?
    `,
      [orderId]
    );

    res.json({ success: true, data: items });
  } catch (error) {
    console.error("Error fetching order items:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order items",
      error: error.message,
    });
  }
};

// Create new order with optional returns - Support FEFO split orders
const createOrder = async (req, res) => {
  // Start a transaction
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { customerId, orderItems, paymentType, notes, returns } = req.body;

    // Get sales rep ID from authenticated user
    // If salesRepId is provided in request and user is an owner/admin, use the provided ID
    // Otherwise, use the authenticated user's ID
    let salesRepId;

    if (req.body.salesRepId && req.userRole === "owner") {
      // Owner can create orders on behalf of other sales reps
      salesRepId = req.body.salesRepId;
    } else {
      // Default to the authenticated user's ID
      salesRepId = req.userId;

      // Validate that the user is a sales rep or owner
      if (req.userRole !== "owner" && req.userRole !== "sales_rep") {
        return res.status(403).json({
          success: false,
          message: "Only sales representatives and owners can create orders",
        });
      }
    }

    if (!salesRepId) {
      return res.status(400).json({
        success: false,
        message: "Sales representative ID is required",
      });
    }

    // Initialize order totals
    let totalAmount = 0;
    let totalDiscount = 0;

    // Create array to hold all order items after FEFO splitting
    const finalOrderItems = [];

    // Process each order item with FEFO splitting if needed
    for (const item of orderItems) {
      let remainingQuantity = item.quantity;
      const productId = item.product_id;
      const unitPrice = item.unit_price;
      const originalDiscount = item.discount || 0;

      // Get all available batches for this product in FEFO order
      const [batches] = await connection.query(
        `SELECT 
          batch_id, 
          batch_number,
          expiry_date,
          current_quantity, 
          selling_price
        FROM product_batches 
        WHERE product_id = ? AND is_active = 1 AND current_quantity > 0
        ORDER BY expiry_date ASC`,
        [productId]
      );

      // If no batches available or not enough total stock
      const totalAvailable = batches.reduce(
        (sum, batch) => sum + batch.current_quantity,
        0
      );
      if (batches.length === 0 || totalAvailable < remainingQuantity) {
        throw new Error(
          `Not enough stock available for product ID: ${productId}`
        );
      }

      // Split order across batches following FEFO
      for (const batch of batches) {
        if (remainingQuantity <= 0) break;

        // Determine quantity from this batch
        const quantityFromBatch = Math.min(
          remainingQuantity,
          batch.current_quantity
        );
        remainingQuantity -= quantityFromBatch;

        // Calculate line item totals
        // In this we need to distribute the discount proportionally across batches
        const proportionalDiscount =
          originalDiscount * (quantityFromBatch / item.quantity);
        const itemTotal = quantityFromBatch * unitPrice;
        const itemNetTotal = itemTotal - proportionalDiscount;

        // Add to total amounts
        totalAmount += itemNetTotal;
        totalDiscount += proportionalDiscount;

        // Add to final order items
        finalOrderItems.push({
          product_id: productId,
          batch_id: batch.batch_id,
          quantity: quantityFromBatch,
          unit_price: unitPrice,
          discount: proportionalDiscount,
          total_price: itemNetTotal,
        });
      }
    }

    // Calculate returns amount if any
    let totalReturnsAmount = 0;
    let returnsData = [];
    let returnItemsData = [];

    if (returns && returns.items && returns.items.length > 0) {
      // Process return items
      returnsData = {
        return_id: "R" + uuidv4().substring(0, 8).toUpperCase(),
        order_id: returns.orderId,
        processed_by: salesRepId,
        reason: returns.reason || "Items returned during new order",
        total_amount: 0, // Will calculate below
        status: "processed",
      };

      returnItemsData = returns.items.map((item) => {
        const itemTotal = item.quantity * item.unit_price;
        totalReturnsAmount += itemTotal;

        return {
          return_item_id: "RI" + uuidv4().substring(0, 8).toUpperCase(),
          return_id: returnsData.return_id,
          product_id: item.product_id,
          batch_id: item.batch_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: itemTotal,
          reason: item.reason || "unwanted",
        };
      });

      returnsData.total_amount = totalReturnsAmount;
    }

    // Calculate final amount after returns
    const finalAmount = totalAmount - totalReturnsAmount;

    // Create the order
    const orderId = "O" + uuidv4().substring(0, 8).toUpperCase();

    await connection.query(
      `
      INSERT INTO orders (
        order_id, customer_id, sales_rep_id, payment_type, 
        total_amount, discount_amount, final_amount, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `,
      [
        orderId,
        customerId,
        salesRepId,
        paymentType,
        totalAmount,
        totalDiscount,
        finalAmount,
        notes,
      ]
    );

    // Insert order items using the FEFO-split items
    for (const item of finalOrderItems) {
      const orderItemId = "OI" + uuidv4().substring(0, 8).toUpperCase();

      await connection.query(
        `
        INSERT INTO order_items (
          order_item_id, order_id, product_id, batch_id,
          quantity, unit_price, discount, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          orderItemId,
          orderId,
          item.product_id,
          item.batch_id,
          item.quantity,
          item.unit_price,
          item.discount,
          item.total_price,
        ]
      );

      // Update batch quantities
      await connection.query(
        `
        UPDATE product_batches 
        SET current_quantity = current_quantity - ? 
        WHERE batch_id = ?
      `,
        [item.quantity, item.batch_id]
      );
    }

    // Process returns if any
    if (returnsData.return_id) {
      // Insert return record
      await connection.query(
        `
        INSERT INTO returns (
          return_id, order_id, processed_by, reason, 
          total_amount, status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
        [
          returnsData.return_id,
          returnsData.order_id,
          returnsData.processed_by,
          returnsData.reason,
          returnsData.total_amount,
          returnsData.status,
        ]
      );

      // Insert return items
      for (const item of returnItemsData) {
        await connection.query(
          `
          INSERT INTO return_items (
            return_item_id, return_id, product_id, batch_id,
            quantity, unit_price, total_price, reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
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

        // Update the batch quantities for returned items (add them back)
        await connection.query(
          `
          UPDATE product_batches 
          SET current_quantity = current_quantity + ? 
          WHERE batch_id = ?
        `,
          [item.quantity, item.batch_id]
        );
      }

      // If the customer paid with credit, update their credit balance
      if (paymentType === "credit") {
        await connection.query(
          `
          UPDATE customers 
          SET credit_balance = credit_balance + ? 
          WHERE customer_id = ?
        `,
          [finalAmount, customerId]
        );
      }
    } // Commit the transaction
    await connection.commit();

    // Log successful order creation with authenticated user details
    console.log(
      `Order ${orderId} created successfully by user ID: ${salesRepId}, role: ${req.userRole}`
    );

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        order_id: orderId,
        total_amount: totalAmount,
        discount_amount: totalDiscount,
        returns_amount: totalReturnsAmount,
        final_amount: finalAmount,
        fefo_split: finalOrderItems.length > orderItems.length,
        created_by: salesRepId,
      },
    });
  } catch (error) {
    // Rollback in case of error
    await connection.rollback();

    // Determine if it's an authentication/authorization error
    if (error.message && error.message.includes("unauthorized")) {
      console.error("Authorization error creating order:", error);
      res.status(403).json({
        success: false,
        message: "You are not authorized to create orders",
        error: error.message,
      });
    } else {
      console.error("Error creating order:", error);
      res.status(500).json({
        success: false,
        message: "Error creating order",
        error: error.message,
      });
    }
  } finally {
    // Release the connection
    connection.release();
  }
};

module.exports = {
  getCustomers,
  getProducts,
  getProductBatches,
  getCustomerOrders,
  getOrderItems,
  createOrder,
};
