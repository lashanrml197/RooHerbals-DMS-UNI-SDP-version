const db = require("../config/db");

// Get customer dashboard stats
const getCustomerStats = async (req, res) => {
  try {
    // Get total customers
    const [totalCustomers] = await db.query(
      "SELECT COUNT(*) as total FROM customers WHERE is_active = 1"
    );

    // Get new customers this month
    const currentDate = new Date();
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const formattedFirstDay = firstDayOfMonth.toISOString().split("T")[0];

    const [newCustomers] = await db.query(
      "SELECT COUNT(*) as total FROM customers WHERE created_at >= ? AND is_active = 1",
      [formattedFirstDay]
    );

    // Get recent activities (limited to last 5)
    // New customers
    const [recentCustomers] = await db.query(
      `SELECT 
        'New Customer Added' as activity_type,
        name as title,
        contact_person as subtitle,
        created_at as timestamp
      FROM customers
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 3`
    );

    // Recent payments
    const [recentPayments] = await db.query(
      `SELECT 
        'Payment Received' as activity_type,
        CONCAT('Rs. ', amount) as title,
        (SELECT name FROM customers WHERE customer_id = 
          (SELECT customer_id FROM orders WHERE order_id = payments.order_id)) as subtitle,
        payment_date as timestamp
      FROM payments
      ORDER BY payment_date DESC
      LIMIT 3`
    );

    // Recent credit sales
    const [recentCredits] = await db.query(
      `SELECT 
        'Credit Sale Updated' as activity_type,
        CONCAT('Rs. ', total_amount) as title,
        (SELECT name FROM customers WHERE customer_id = orders.customer_id) as subtitle,
        order_date as timestamp
      FROM orders
      WHERE payment_type = 'credit' AND status != 'cancelled'
      ORDER BY order_date DESC
      LIMIT 3`
    );

    // Combine and sort all activities by timestamp
    const allActivities = [
      ...recentCustomers,
      ...recentPayments,
      ...recentCredits,
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5); // Get only the most recent 5 activities

    res.json({
      totalCustomers: totalCustomers[0].total,
      newCustomersThisMonth: newCustomers[0].total,
      recentActivities: allActivities,
    });
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    res
      .status(500)
      .json({ message: "Error fetching customer stats", error: error.message });
  }
};

// Get all customers with enhanced information
const getAllCustomers = async (req, res) => {
  try {
    // Query to fetch all active customers with additional information
    const [customers] = await db.query(`
      SELECT
        c.customer_id as id,
        c.name,
        c.contact_person,
        c.phone,
        c.email,
        c.address,
        c.city,
        c.area,
        c.credit_limit,
        c.credit_balance,
        c.is_active,
        (
          SELECT order_date 
          FROM orders 
          WHERE customer_id = c.customer_id 
          ORDER BY order_date DESC 
          LIMIT 1
        ) as last_order_date,
        (
          SELECT SUM(total_amount) 
          FROM orders 
          WHERE customer_id = c.customer_id
        ) as total_spent,
        CASE
          WHEN c.credit_balance = 0 THEN 'good'
          WHEN c.credit_balance > 0 AND c.credit_balance <= c.credit_limit * 0.5 THEN 'pending'
          ELSE 'overdue'
        END as credit_status
      FROM customers c
      WHERE c.is_active = 1
      ORDER BY c.name
    `);

    // Format the data for frontend
    const formattedCustomers = customers.map((customer) => {
      // Calculate how long ago the last order was made
      let lastOrderText = "No orders yet";

      if (customer.last_order_date) {
        const lastOrderDate = new Date(customer.last_order_date);
        const now = new Date();
        const diffTime = Math.abs(now - lastOrderDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          lastOrderText = "Today";
        } else if (diffDays === 1) {
          lastOrderText = "Yesterday";
        } else if (diffDays < 7) {
          lastOrderText = `${diffDays} days ago`;
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7);
          lastOrderText = `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
        } else {
          const months = Math.floor(diffDays / 30);
          lastOrderText = `${months} ${months === 1 ? "month" : "months"} ago`;
        }
      }

      return {
        id: customer.id,
        name: customer.name,
        address: `${customer.address}${
          customer.city ? ", " + customer.city : ""
        }`,
        phone: customer.phone,
        lastOrder: lastOrderText,
        totalSpent: customer.total_spent || 0,
        creditStatus: customer.credit_status,
        contactPerson: customer.contact_person,
        email: customer.email,
        area: customer.area,
      };
    });

    // Get customer statistics
    const totalCustomers = formattedCustomers.length;
    const paidCustomers = formattedCustomers.filter(
      (c) => c.creditStatus === "good"
    ).length;
    const creditCustomers = formattedCustomers.filter(
      (c) => c.creditStatus !== "good"
    ).length;

    res.json({
      customers: formattedCustomers,
      stats: {
        total: totalCustomers,
        paid: paidCustomers,
        credits: creditCustomers,
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res
      .status(500)
      .json({ message: "Error fetching customers", error: error.message });
  }
};

// Get customer by ID with enhanced information
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching details for customer ID: ${id}`);

    // Get customer basic details
    const [customers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ? AND is_active = 1",
      [id]
    );

    if (customers.length === 0) {
      console.log(`Customer with ID ${id} not found`);
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get total orders count
    const [orderCount] = await db.query(
      "SELECT COUNT(*) as total FROM orders WHERE customer_id = ?",
      [id]
    );

    // Get total sales amount
    const [totalSales] = await db.query(
      "SELECT SUM(total_amount) as total FROM orders WHERE customer_id = ?",
      [id]
    );

    // Get last order date
    const [lastOrder] = await db.query(
      "SELECT order_date FROM orders WHERE customer_id = ? ORDER BY order_date DESC LIMIT 1",
      [id]
    );

    // Get pending and overdue payments
    const [pendingPayment] = await db.query(
      `
      SELECT SUM(o.total_amount - COALESCE(
        (SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.order_id), 0
      )) as pending
      FROM orders o
      WHERE o.customer_id = ? AND o.payment_status != 'paid'
    `,
      [id]
    );

    // Get overdue payments (orders older than 30 days with pending payment)
    const [overduePayment] = await db.query(
      `
      SELECT SUM(o.total_amount - COALESCE(
        (SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.order_id), 0
      )) as overdue
      FROM orders o
      WHERE o.customer_id = ? 
      AND o.payment_status != 'paid'
      AND DATEDIFF(CURRENT_DATE, o.order_date) > 30
    `,
      [id]
    );

    // Calculate credit status
    let creditStatus = "good";
    if (parseFloat(overduePayment[0].overdue || 0) > 0) {
      creditStatus = "overdue";
    } else if (parseFloat(pendingPayment[0].pending || 0) > 0) {
      creditStatus = "pending";
    }

    // Format last order date
    let lastOrderText = "No orders yet";
    if (lastOrder && lastOrder.length > 0 && lastOrder[0].order_date) {
      const lastOrderDate = new Date(lastOrder[0].order_date);
      const now = new Date();
      const diffTime = Math.abs(now - lastOrderDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        lastOrderText = "Today";
      } else if (diffDays === 1) {
        lastOrderText = "Yesterday";
      } else if (diffDays < 7) {
        lastOrderText = `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        lastOrderText = `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
      } else {
        const months = Math.floor(diffDays / 30);
        lastOrderText = `${months} ${months === 1 ? "month" : "months"} ago`;
      }
    }

    // Format customer since date
    const customerSince = new Date(customers[0].created_at);
    const customerSinceText = customerSince.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Handle potential null values safely
    const pendingAmount =
      pendingPayment[0].pending !== null
        ? parseFloat(pendingPayment[0].pending)
        : 0;
    const overdueAmount =
      overduePayment[0].overdue !== null
        ? parseFloat(overduePayment[0].overdue)
        : 0;
    const totalSpentAmount =
      totalSales[0].total !== null ? parseFloat(totalSales[0].total) : 0;

    // Create the response object
    const customerDetails = {
      ...customers[0],
      totalOrders: parseInt(orderCount[0].total) || 0,
      totalSpent: totalSpentAmount,
      lastOrder: lastOrderText,
      creditStatus: creditStatus,
      paymentStatus: {
        pending: pendingAmount,
        overdue: overdueAmount,
      },
      joinedDate: customerSinceText,
    };

    console.log(`Successfully retrieved details for customer ID: ${id}`);
    res.json(customerDetails);
  } catch (error) {
    console.error("Error fetching customer details:", error);
    res.status(500).json({
      message: "Error fetching customer details",
      error: error.message,
    });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    const {
      name,
      contact_person,
      phone,
      email,
      address,
      city,
      area,
      credit_limit = 0,
    } = req.body;

    // Validate required fields
    if (!name || !phone || !address) {
      return res
        .status(400)
        .json({ message: "Name, phone, and address are required" });
    } // Get user ID from request body or fallback to token
    const registered_by =
      req.body.registered_by || (req.user ? req.user.user_id : null);
    console.log(
      "Customer creation - registered_by from request body:",
      req.body.registered_by
    );
    console.log(
      "Customer creation - final registered_by value:",
      registered_by
    );

    // Generate a new customer ID
    const [lastCustomer] = await db.query(
      "SELECT customer_id FROM customers ORDER BY customer_id DESC LIMIT 1"
    );

    let newCustomerId = "C001";
    if (lastCustomer && lastCustomer.length > 0) {
      const lastId = lastCustomer[0].customer_id;
      const numericPart = parseInt(lastId.substring(1), 10);
      newCustomerId = `C${String(numericPart + 1).padStart(3, "0")}`;
    }

    // Insert the new customer
    await db.query(
      `INSERT INTO customers (
        customer_id,
        name, 
        contact_person, 
        phone, 
        email, 
        address, 
        city, 
        area, 
        credit_limit,
        credit_balance,
        registered_by,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1)`,
      [
        newCustomerId,
        name,
        contact_person,
        phone,
        email,
        address,
        city,
        area,
        credit_limit,
        registered_by,
      ]
    );

    // Get the newly created customer
    const [customers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [newCustomerId]
    );

    res.status(201).json({
      message: "Customer created successfully",
      customer: customers[0],
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    res
      .status(500)
      .json({ message: "Error creating customer", error: error.message });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      contact_person,
      phone,
      email,
      address,
      city,
      area,
      credit_limit,
      is_active,
    } = req.body;

    // Check if customer exists
    const [existingCustomers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [id]
    );

    if (existingCustomers.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    } // Update the customer
    await db.query(
      `UPDATE customers SET
        name = ?,
        contact_person = ?,
        phone = ?,
        email = ?,
        address = ?,
        city = ?,
        area = ?,
        credit_limit = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE customer_id = ?`,
      [
        name || existingCustomers[0].name,
        contact_person || existingCustomers[0].contact_person,
        phone || existingCustomers[0].phone,
        email || existingCustomers[0].email,
        address || existingCustomers[0].address,
        city || existingCustomers[0].city,
        area || existingCustomers[0].area,
        credit_limit || existingCustomers[0].credit_limit,
        is_active !== undefined ? is_active : existingCustomers[0].is_active,
        id,
      ]
    );

    // Get the updated customer
    const [updatedCustomers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [id]
    );

    res.json({
      message: "Customer updated successfully",
      customer: updatedCustomers[0],
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    res
      .status(500)
      .json({ message: "Error updating customer", error: error.message });
  }
};

// Delete customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const [existingCustomers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [id]
    );

    if (existingCustomers.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Soft delete the customer
    await db.query(
      "UPDATE customers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?",
      [id]
    );

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res
      .status(500)
      .json({ message: "Error deleting customer", error: error.message });
  }
};

// Get customer orders
const getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const [customers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ? AND is_active = 1",
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get customer orders with details
    const [orders] = await db.query(
      `SELECT 
        o.order_id, 
        o.order_date, 
        o.delivery_date, 
        o.payment_type, 
        o.payment_status, 
        o.total_amount, 
        o.discount_amount, 
        o.status,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.order_id) as items_count
       FROM orders o
       WHERE o.customer_id = ?
       ORDER BY o.order_date DESC`,
      [id]
    );

    // For each order, get its items and payments
    for (let i = 0; i < orders.length; i++) {
      // Get order items
      const [items] = await db.query(
        `SELECT 
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
         WHERE oi.order_id = ?`,
        [orders[i].order_id]
      );

      orders[i].items = items;

      // Get payment information for the order
      const [payments] = await db.query(
        `SELECT payment_id, order_id, payment_date, amount, payment_method, reference_number, notes
         FROM payments
         WHERE order_id = ?
         ORDER BY payment_date`,
        [orders[i].order_id]
      );

      orders[i].payments = payments;

      // Calculate remaining amount
      const totalPaid = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
      orders[i].total_paid = totalPaid;
      orders[i].remaining_amount = orders[i].total_amount - totalPaid;
    }

    res.json({
      customer: customers[0],
      orders,
    });
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({
      message: "Error fetching customer orders",
      error: error.message,
    });
  }
};

// Get customer payments
const getCustomerPayments = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const [customers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ? AND is_active = 1",
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get customer payments with order details
    const [payments] = await db.query(
      `SELECT 
        p.payment_id, 
        p.order_id,
        o.order_date,
        p.payment_date, 
        p.amount, 
        p.payment_method, 
        p.reference_number,
        u.full_name as received_by_name
       FROM payments p
       JOIN orders o ON p.order_id = o.order_id
       LEFT JOIN users u ON p.received_by = u.user_id
       WHERE o.customer_id = ?
       ORDER BY p.payment_date DESC`,
      [id]
    );

    res.json({
      customer: customers[0],
      payments,
    });
  } catch (error) {
    console.error("Error fetching customer payments:", error);
    res.status(500).json({
      message: "Error fetching customer payments",
      error: error.message,
    });
  }
};

// Record payment for customer
const recordPayment = async (req, res) => {
  try {
    const {
      order_id,
      amount,
      payment_method,
      reference_number = null,
      notes = null,
      received_by,
    } = req.body;

    // Validate required fields
    if (!order_id || !amount || !payment_method) {
      return res.status(400).json({
        message: "Order ID, amount, and payment method are required",
      });
    }

    // Get the order to check if it exists and belongs to the customer
    const [orders] = await db.query("SELECT * FROM orders WHERE order_id = ?", [
      order_id,
    ]);

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    } // Get the current total paid for this order
    const [currentPayments] = await db.query(
      "SELECT SUM(amount) as total_paid FROM payments WHERE order_id = ?",
      [order_id]
    );

    const totalPaid = (currentPayments[0].total_paid || 0) + parseFloat(amount);
    const orderTotal = orders[0].total_amount;

    // Update payment status in the order
    let paymentStatus = "pending";
    // Allow a small tolerance (0.01) for rounding errors
    if (Math.abs(totalPaid - orderTotal) <= 0.01) {
      paymentStatus = "paid";
    } else if (totalPaid > orderTotal) {
      // Payment exceeds total amount - still mark as paid but log as overpaid
      paymentStatus = "paid";
      console.log(
        `Warning: Order ${order_id} has been overpaid. Total order: ${orderTotal}, Total paid: ${totalPaid}`
      );
    } else if (totalPaid > 0) {
      paymentStatus = "partial";
    } // Get user ID from request body first, fallback to token user
    // req.body.received_by comes from the client-side user context
    // but if it's not provided, use the authenticated user from the token
    const receivedById =
      req.body.received_by || (req.user ? req.user.user_id : null);
    console.log("Payment received by user ID:", receivedById);

    // Generate a new payment ID (assuming P### format)
    const [lastPayment] = await db.query(
      "SELECT payment_id FROM payments ORDER BY payment_id DESC LIMIT 1"
    );

    let newPaymentId = "P001";
    if (lastPayment && lastPayment.length > 0) {
      const lastId = lastPayment[0].payment_id;
      const numericPart = parseInt(lastId.substring(1), 10);
      newPaymentId = `P${String(numericPart + 1).padStart(3, "0")}`;
    }

    // Insert the new payment
    await db.query(
      `INSERT INTO payments (
        payment_id,
        order_id,
        payment_date,
        amount,
        payment_method,
        reference_number,
        received_by,
        notes
      ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)`,
      [
        newPaymentId,
        order_id,
        amount,
        payment_method,
        reference_number,
        receivedById,
        notes,
      ]
    );

    // Update the order's payment status
    await db.query(
      "UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?",
      [paymentStatus, order_id]
    );

    // Update customer credit balance if it was a credit payment
    if (orders[0].payment_type === "credit") {
      await db.query(
        `UPDATE customers 
        SET credit_balance = GREATEST(credit_balance - ?, 0), 
            updated_at = CURRENT_TIMESTAMP 
        WHERE customer_id = ?`,
        [amount, orders[0].customer_id]
      );
    } // Get the inserted payment with order details
    const [payments] = await db.query(
      `SELECT 
        p.*,
        o.customer_id,
        c.name as customer_name,
        u.full_name as received_by_name,
        u.user_id as received_by_id
      FROM payments p
      JOIN orders o ON p.order_id = o.order_id
      JOIN customers c ON o.customer_id = c.customer_id
      LEFT JOIN users u ON p.received_by = u.user_id
      WHERE p.payment_id = ?`,
      [newPaymentId]
    );

    // Log payment details for debugging
    console.log("Payment recorded with ID:", newPaymentId);
    console.log(
      "Payment received by user:",
      payments[0]?.received_by_name || "Unknown",
      "(ID:",
      payments[0]?.received_by || "None",
      ")"
    );

    res.status(201).json({
      message: "Payment recorded successfully",
      payment: payments[0],
      newStatus: paymentStatus,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({
      message: "Error recording payment",
      error: error.message,
    });
  }
};

// Get customer credit details
const getCustomerCredits = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const [customers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ? AND is_active = 1",
      [id]
    );

    if (customers.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Get all credit orders
    const [creditOrders] = await db.query(
      `SELECT 
        o.order_id,
        o.order_date,
        o.total_amount,
        o.payment_status,
        COALESCE((SELECT SUM(amount) FROM payments WHERE order_id = o.order_id), 0) as paid_amount,
        (o.total_amount - COALESCE((SELECT SUM(amount) FROM payments WHERE order_id = o.order_id), 0)) as remaining_amount,
        DATEDIFF(CURRENT_DATE, o.order_date) as days_outstanding
      FROM orders o
      WHERE o.customer_id = ? AND o.payment_type = 'credit' AND o.payment_status != 'paid'
      ORDER BY o.order_date DESC`,
      [id]
    );

    // Get credit summary
    const [creditSummary] = await db.query(
      `SELECT 
        credit_limit,
        credit_balance,
        (credit_limit - credit_balance) as available_credit
      FROM customers
      WHERE customer_id = ?`,
      [id]
    );

    res.json({
      customer: customers[0],
      creditOrders,
      creditSummary: creditSummary[0],
    });
  } catch (error) {
    console.error("Error fetching customer credits:", error);
    res.status(500).json({
      message: "Error fetching customer credits",
      error: error.message,
    });
  }
};

// Update customer credit limit
const updateCustomerCredit = async (req, res) => {
  try {
    const { id } = req.params;
    const { credit_limit } = req.body;

    if (!credit_limit && credit_limit !== 0) {
      return res.status(400).json({ message: "Credit limit is required" });
    }

    // Check if customer exists
    const [existingCustomers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [id]
    );

    if (existingCustomers.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Update the customer's credit limit
    await db.query(
      `UPDATE customers SET
        credit_limit = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE customer_id = ?`,
      [credit_limit, id]
    );

    // Get the updated customer
    const [updatedCustomers] = await db.query(
      "SELECT * FROM customers WHERE customer_id = ?",
      [id]
    );

    res.json({
      message: "Customer credit limit updated successfully",
      customer: updatedCustomers[0],
    });
  } catch (error) {
    console.error("Error updating customer credit:", error);
    res.status(500).json({
      message: "Error updating customer credit",
      error: error.message,
    });
  }
};

// Search customers
const searchCustomers = async (req, res) => {
  try {
    const { query, area } = req.query;

    let searchQuery = `
      SELECT 
        c.customer_id as id,
        c.name,
        c.contact_person,
        c.phone,
        c.address,
        c.city,
        c.area
      FROM customers c
      WHERE c.is_active = 1
    `;

    const params = [];

    // Add search conditions
    if (query) {
      searchQuery += ` AND (c.name LIKE ? OR c.contact_person LIKE ? OR c.phone LIKE ?)`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Filter by area if provided
    if (area) {
      searchQuery += ` AND c.area = ?`;
      params.push(area);
    }

    // Add ordering
    searchQuery += ` ORDER BY c.name`;

    // Execute the query
    const [customers] = await db.query(searchQuery, params);

    res.json({
      customers,
      count: customers.length,
    });
  } catch (error) {
    console.error("Error searching customers:", error);
    res.status(500).json({
      message: "Error searching customers",
      error: error.message,
    });
  }
};

// Get customer areas (for filtering)
const getCustomerAreas = async (req, res) => {
  try {
    const [areas] = await db.query(`
      SELECT DISTINCT area
      FROM customers
      WHERE area IS NOT NULL AND area != '' AND is_active = 1
      ORDER BY area
    `);

    res.json(areas.map((a) => a.area));
  } catch (error) {
    console.error("Error fetching customer areas:", error);
    res.status(500).json({
      message: "Error fetching customer areas",
      error: error.message,
    });
  }
};

module.exports = {
  getCustomerStats,
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerOrders,
  getCustomerPayments,
  recordPayment,
  getCustomerCredits,
  updateCustomerCredit,
  searchCustomers,
  getCustomerAreas,
};
