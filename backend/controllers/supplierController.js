const db = require("../config/db");

// ==================== SUPPLIER MANAGEMENT ====================

/**
 * Get supplier dashboard statistics
 * Returns total suppliers, pending orders, and recent activities
 */
const getSupplierStats = async (req, res) => {
  try {
    // Get total suppliers
    const [totalSuppliers] = await db.query(
      "SELECT COUNT(*) as total FROM suppliers WHERE is_active = 1"
    );

    // Get pending orders count
    const [pendingOrders] = await db.query(
      'SELECT COUNT(*) as total FROM purchase_orders WHERE status IN ("pending", "ordered")'
    );

    // Get recent activities - order received

    const [orderReceivedActivities] = await db.query(`
      SELECT 
        'Order Received' as activity_type,
        s.name as title,
        CONCAT(COUNT(pi.po_item_id), ' items') as subtitle,
        po.updated_at as timestamp
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.supplier_id
      JOIN po_items pi ON po.po_id = pi.po_id
      WHERE po.status = 'received'
      GROUP BY po.po_id
      ORDER BY po.updated_at DESC
      LIMIT 3
    `);

    // Get recent activities - new supplier added
    const [newSupplierActivities] = await db.query(`
      SELECT 
        'New Supplier Added' as activity_type,
        name as title,
        contact_person as subtitle,
        created_at as timestamp
      FROM suppliers
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 3
    `);

    // Get recent activities - purchase order sent
    const [purchaseOrderActivities] = await db.query(`
      SELECT 
        'Purchase Order Sent' as activity_type,
        s.name as title,
        CONCAT('PO #', po.po_id) as subtitle,
        po.created_at as timestamp
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.supplier_id
      WHERE po.status = 'ordered'
      ORDER BY po.created_at DESC
      LIMIT 3
    `);

    // Get low stock alerts
    const [lowStockAlerts] = await db.query(`
      SELECT 
        p.name,
        p.product_id,
        s.name as supplier_name,
        s.supplier_id,
        p.reorder_level,
        SUM(pb.current_quantity) as current_stock
      FROM products p
      JOIN product_batches pb ON p.product_id = pb.product_id
      JOIN suppliers s ON pb.supplier_id = s.supplier_id
      WHERE pb.is_active = 1
      GROUP BY p.product_id, s.supplier_id
      HAVING current_stock < p.reorder_level AND current_stock > 0
      ORDER BY (current_stock / p.reorder_level) ASC
      LIMIT 5
    `);

    // Combine and sort all activities by timestamp
    const allActivities = [
      ...orderReceivedActivities,
      ...newSupplierActivities,
      ...purchaseOrderActivities,
    ]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5); // Get only the 5 most recent activities

    res.json({
      totalSuppliers: totalSuppliers[0].total,
      pendingOrders: pendingOrders[0].total,
      recentActivities: allActivities,
      lowStockAlerts: lowStockAlerts,
    });
  } catch (error) {
    console.error("Error fetching supplier stats:", error);
    res.status(500).json({
      message: "Error fetching supplier statistics",
      error: error.message,
    });
  }
};

/**
 * Get all suppliers
 */
const getAllSuppliers = async (req, res) => {
  try {
    const [suppliers] = await db.query(
      "SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name"
    );
    res.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({
      message: "Error fetching suppliers",
      error: error.message,
    });
  }
};

/**
 * Get supplier by ID
 */
const getSupplierById = async (req, res) => {
  try {
    const supplierId = req.params.id;

    // Get supplier details
    const [suppliers] = await db.query(
      "SELECT * FROM suppliers WHERE supplier_id = ? AND is_active = 1",
      [supplierId]
    );

    if (suppliers.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Get related products
    const [products] = await db.query(
      `
      SELECT DISTINCT 
        p.product_id, 
        p.name, 
        p.description, 
        p.unit_price,
        c.name as category_name,
        SUM(pb.current_quantity) as current_stock
      FROM products p
      JOIN product_batches pb ON p.product_id = pb.product_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE pb.supplier_id = ? AND pb.is_active = 1
      GROUP BY p.product_id
    `,
      [supplierId]
    );

    // Get purchase order history
    const [purchaseOrders] = await db.query(
      `
      SELECT 
        po.po_id, 
        po.order_date, 
        po.expected_delivery_date, 
        po.total_amount, 
        po.status,
        u.full_name as created_by_name
      FROM purchase_orders po
      LEFT JOIN users u ON po.created_by = u.user_id
      WHERE po.supplier_id = ?
      ORDER BY po.order_date DESC
      LIMIT 10
    `,
      [supplierId]
    );

    res.json({
      ...suppliers[0],
      products,
      purchaseOrders,
    });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({
      message: "Error fetching supplier details",
      error: error.message,
    });
  }
};

/**
 * Create a new supplier
 */
const createSupplier = async (req, res) => {
  try {
    const {
      name,
      contact_person,
      phone,
      email,
      address,
      supplier_type,
      payment_terms,
      is_preferred,
    } = req.body;

    // Simple validation
    if (!name || !phone || !supplier_type) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Check if supplier already exists
    const [existingSuppliers] = await db.query(
      "SELECT * FROM suppliers WHERE name = ? AND phone = ?",
      [name, phone]
    );

    if (existingSuppliers.length > 0) {
      return res.status(400).json({ message: "Supplier already exists" });
    }

    // Generate a unique supplier ID (prefix S + incremental number)
    const [lastSupplier] = await db.query(
      "SELECT supplier_id FROM suppliers ORDER BY supplier_id DESC LIMIT 1"
    );

    let newId;
    if (lastSupplier.length === 0) {
      newId = "S001";
    } else {
      const lastId = lastSupplier[0].supplier_id;
      const numericPart = parseInt(lastId.substring(1), 10);
      newId = `S${String(numericPart + 1).padStart(3, "0")}`;
    }

    // Insert new supplier
    await db.query(
      `INSERT INTO suppliers (
        supplier_id, name, contact_person, phone, email, address, 
        supplier_type, payment_terms, is_preferred, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        newId,
        name,
        contact_person,
        phone,
        email,
        address,
        supplier_type,
        payment_terms,
        is_preferred ? 1 : 0,
      ]
    );

    res.status(201).json({
      message: "Supplier created successfully",
      supplier_id: newId,
      name: name,
    });
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({
      message: "Error creating supplier",
      error: error.message,
    });
  }
};

/**
 * Update a supplier
 */
const updateSupplier = async (req, res) => {
  try {
    const supplierId = req.params.id;
    const {
      name,
      contact_person,
      phone,
      email,
      address,
      supplier_type,
      payment_terms,
      is_preferred,
    } = req.body;

    // Check if supplier exists
    const [existingSuppliers] = await db.query(
      "SELECT * FROM suppliers WHERE supplier_id = ? AND is_active = 1",
      [supplierId]
    );

    if (existingSuppliers.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Update supplier
    await db.query(
      `UPDATE suppliers SET 
        name = ?, 
        contact_person = ?, 
        phone = ?, 
        email = ?, 
        address = ?, 
        supplier_type = ?, 
        payment_terms = ?, 
        is_preferred = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE supplier_id = ?`,
      [
        name,
        contact_person,
        phone,
        email,
        address,
        supplier_type,
        payment_terms,
        is_preferred ? 1 : 0,
        supplierId,
      ]
    );

    res.json({ message: "Supplier updated successfully" });
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({
      message: "Error updating supplier",
      error: error.message,
    });
  }
};

/**
 * Deactivate a supplier (soft delete)
 */
const deactivateSupplier = async (req, res) => {
  try {
    const supplierId = req.params.id;

    // Check if supplier exists
    const [existingSuppliers] = await db.query(
      "SELECT * FROM suppliers WHERE supplier_id = ? AND is_active = 1",
      [supplierId]
    );

    if (existingSuppliers.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Check if there are active batches from this supplier
    const [activeBatches] = await db.query(
      "SELECT COUNT(*) as count FROM product_batches WHERE supplier_id = ? AND is_active = 1",
      [supplierId]
    );

    if (activeBatches[0].count > 0) {
      return res.status(400).json({
        message: "Cannot delete supplier with active product batches",
      });
    }

    // Deactivate supplier
    await db.query(
      "UPDATE suppliers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE supplier_id = ?",
      [supplierId]
    );

    res.json({ message: "Supplier deactivated successfully" });
  } catch (error) {
    console.error("Error deactivating supplier:", error);
    res.status(500).json({
      message: "Error deactivating supplier",
      error: error.message,
    });
  }
};

// ==================== INVENTORY MANAGEMENT ====================

const getInventoryStats = async (req, res) => {
  try {
    // Get total active items (regardless of stock level)
    const [totalItems] = await db.query(`
      SELECT COUNT(DISTINCT p.product_id) as total 
      FROM products p
      WHERE p.is_active = 1
    `);

    // Get low stock items (stock is above 0 but below reorder level)
    const [lowStockItems] = await db.query(`
      SELECT COUNT(DISTINCT p.product_id) as total 
      FROM products p
      JOIN (
        SELECT product_id, SUM(current_quantity) as total_quantity 
        FROM product_batches 
        WHERE is_active = 1 
        GROUP BY product_id
      ) pb ON p.product_id = pb.product_id
      WHERE pb.total_quantity < p.reorder_level 
        AND pb.total_quantity > 0 
        AND p.is_active = 1
    `);

    // Get out of stock items (stock is 0 or negative)
    const [outOfStockItems] = await db.query(`
      SELECT COUNT(DISTINCT p.product_id) as total 
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(current_quantity) as total_quantity 
        FROM product_batches 
        WHERE is_active = 1 
        GROUP BY product_id
      ) pb ON p.product_id = pb.product_id
      WHERE (pb.total_quantity <= 0 OR pb.total_quantity IS NULL) 
        AND p.is_active = 1
    `);

    // Get items expiring soon (in the next 30 days)
    const [expiringItems] = await db.query(`
      SELECT COUNT(DISTINCT p.product_id) as total 
      FROM products p
      JOIN product_batches pb ON p.product_id = pb.product_id
      WHERE pb.current_quantity > 0 
        AND pb.expiry_date IS NOT NULL 
        AND pb.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND pb.is_active = 1
        AND p.is_active = 1
    `);

    res.json({
      totalItems: totalItems[0].total,
      lowStockItems: lowStockItems[0].total,
      outOfStockItems: outOfStockItems[0].total,
      expiringItems: expiringItems[0].total,
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    res.status(500).json({
      message: "Error fetching inventory statistics",
      error: error.message,
    });
  }
};

/**
 * Get all inventory items with batches
 */
const getAllInventory = async (req, res) => {
  try {
    // Get query parameters for filtering
    const {
      category,
      status,
      search,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    let sql = `
      SELECT 
        p.product_id, 
        p.name, 
        p.description, 
        p.unit_price,
        p.reorder_level,
        c.name as category_name,
        c.category_id,
        COALESCE(SUM(pb.current_quantity), 0) as total_stock,
        MIN(pb.expiry_date) as next_expiry,
        COUNT(DISTINCT pb.batch_id) as batch_count
      FROM products p
      LEFT JOIN product_batches pb ON p.product_id = pb.product_id AND pb.is_active = 1
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = 1
    `;

    // Add filters
    const params = [];

    if (category && category !== "All Categories") {
      sql += " AND c.category_id = ?";
      params.push(category);
    }

    if (search) {
      sql += " AND (p.name LIKE ? OR p.description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Group by product to get aggregated values
    sql += " GROUP BY p.product_id";

    // Add status filter after GROUP BY since it uses the aggregated value
    if (status) {
      if (status === "Low Stock") {
        sql += " HAVING total_stock < p.reorder_level AND total_stock > 0";
      } else if (status === "Out of Stock") {
        sql += " HAVING total_stock <= 0 OR total_stock IS NULL";
      } else if (status === "Expiring Soon") {
        sql +=
          " HAVING next_expiry IS NOT NULL AND next_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
      }
    }

    // Add sorting
    sql += ` ORDER BY ${
      sortBy === "stock" ? "total_stock" : "p." + sortBy
    } ${sortOrder}`;

    // Execute the query
    const [products] = await db.query(sql, params);

    // For each product, get the batch details
    for (const product of products) {
      const [batches] = await db.query(
        `
        SELECT 
          pb.batch_id,
          pb.batch_number,
          pb.manufacturing_date,
          pb.expiry_date,
          pb.cost_price,
          pb.selling_price,
          pb.initial_quantity,
          pb.current_quantity,
          pb.received_date,
          s.name as supplier_name,
          s.supplier_id
        FROM product_batches pb
        JOIN suppliers s ON pb.supplier_id = s.supplier_id
        WHERE pb.product_id = ? AND pb.is_active = 1
        ORDER BY pb.expiry_date ASC
      `,
        [product.product_id]
      );

      product.batches = batches;
    }

    res.json(products);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({
      message: "Error fetching inventory",
      error: error.message,
    });
  }
};

/**
 * Get a specific product with its batches
 */
const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    // Get product details
    const [products] = await db.query(
      `
      SELECT 
        p.*, 
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = ? AND p.is_active = 1
    `,
      [productId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Get product batches
    const [batches] = await db.query(
      `
      SELECT 
        pb.*,
        s.name as supplier_name,
        s.contact_person as supplier_contact_person,
        s.phone as supplier_phone
      FROM product_batches pb
      JOIN suppliers s ON pb.supplier_id = s.supplier_id
      WHERE pb.product_id = ? AND pb.is_active = 1
      ORDER BY pb.expiry_date ASC
    `,
      [productId]
    );

    // Get product stats
    const [stats] = await db.query(
      `
      SELECT 
        SUM(pb.current_quantity) as total_stock,
        (
          SELECT SUM(oi.quantity)
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.order_id
          WHERE oi.product_id = ? AND o.status = 'delivered'
        ) as total_sales
      FROM product_batches pb
      WHERE pb.product_id = ? AND pb.is_active = 1
    `,
      [productId, productId]
    );

    res.json({
      ...products[0],
      batches,
      stats: stats[0],
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      message: "Error fetching product details",
      error: error.message,
    });
  }
};

/**
 * Add a new product batch
 */
const addProductBatch = async (req, res) => {
  try {
    const {
      product_id,
      supplier_id,
      batch_number,
      manufacturing_date,
      expiry_date,
      cost_price,
      selling_price,
      initial_quantity,
      received_date,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !product_id ||
      !supplier_id ||
      !batch_number ||
      !cost_price ||
      !selling_price ||
      !initial_quantity
    ) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Validate positive quantity
    if (initial_quantity <= 0) {
      return res
        .status(400)
        .json({ message: "Initial quantity must be positive" });
    }

    // Generate a unique batch ID (prefix B + incremental number)
    const [lastBatch] = await db.query(
      "SELECT batch_id FROM product_batches ORDER BY batch_id DESC LIMIT 1"
    );

    let newBatchId;
    if (lastBatch.length === 0) {
      newBatchId = "B001";
    } else {
      const lastId = lastBatch[0].batch_id;
      const numericPart = parseInt(lastId.substring(1), 10);
      newBatchId = `B${String(numericPart + 1).padStart(3, "0")}`;
    }

    // Insert the new batch
    await db.query(
      `
      INSERT INTO product_batches (
        batch_id,
        product_id,
        supplier_id,
        batch_number,
        manufacturing_date,
        expiry_date,
        cost_price,
        selling_price,
        initial_quantity,
        current_quantity,
        received_date,
        notes,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `,
      [
        newBatchId,
        product_id,
        supplier_id,
        batch_number,
        manufacturing_date || null,
        expiry_date || null,
        cost_price,
        selling_price,
        initial_quantity,
        initial_quantity,
        received_date || new Date(),
        notes,
      ]
    );

    res.status(201).json({
      message: "Product batch added successfully",
      batch_id: newBatchId,
    });
  } catch (error) {
    console.error("Error adding product batch:", error);
    res.status(500).json({
      message: "Error adding product batch",
      error: error.message,
    });
  }
};

/**
 * Adjust product batch quantity
 */
const adjustBatchQuantity = async (req, res) => {
  try {
    const batchId = req.params.id;
    const { adjustment, reason } = req.body;

    if (adjustment === undefined || adjustment === null) {
      return res.status(400).json({ message: "Adjustment value is required" });
    }

    // Get current batch details
    const [batches] = await db.query(
      "SELECT * FROM product_batches WHERE batch_id = ? AND is_active = 1",
      [batchId]
    );

    if (batches.length === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const batch = batches[0];
    const newQuantity = batch.current_quantity + parseInt(adjustment, 10);

    // Get the product details to know which product is being adjusted
    const [products] = await db.query(
      "SELECT p.* FROM products p JOIN product_batches pb ON p.product_id = pb.product_id WHERE pb.batch_id = ?",
      [batchId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: "Associated product not found" });
    }

    const product = products[0];

    // Validate the adjustment
    if (newQuantity < 0) {
      return res.status(400).json({
        message:
          "Adjustment would result in negative inventory. Please check the adjustment value.",
      });
    }

    // If adjustment causes stock to become zero or negative, flag it as potential issue
    let warningMessage = null;
    if (newQuantity === 0) {
      warningMessage = "This adjustment will set the stock level to zero.";
    }

    // Update the batch quantity
    await db.query(
      `UPDATE product_batches 
       SET current_quantity = ?,
           updated_at = CURRENT_TIMESTAMP,
           notes = CONCAT(IFNULL(notes, ''), '\n', ?)
       WHERE batch_id = ?`,
      [
        newQuantity,
        `[${new Date().toISOString()}] Quantity adjusted by ${adjustment}. Reason: ${
          reason || "Not specified"
        }`,
        batchId,
      ]
    );

    await db.query(
      `INSERT INTO inventory_adjustments (
        batch_id, 
        product_id,
        adjustment_value, 
        previous_quantity, 
        new_quantity, 
        reason, 
        adjusted_by,
        adjustment_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        batchId,
        product.product_id,
        adjustment,
        batch.current_quantity,
        newQuantity,
        reason || "Not specified",
        req.user?.user_id || "system",
      ]
    );

    res.json({
      message: "Batch quantity adjusted successfully",
      new_quantity: newQuantity,
      warning: warningMessage,
      product_name: product.name,
    });
  } catch (error) {
    console.error("Error adjusting batch quantity:", error);
    res.status(500).json({
      message: "Error adjusting batch quantity",
      error: error.message,
    });
  }
};

/**
 * Update product batch selling price
 */
const updateBatchSellingPrice = async (req, res) => {
  try {
    const batchId = req.params.id;
    const { sellingPrice, reason } = req.body;

    if (sellingPrice === undefined || sellingPrice === null) {
      return res.status(400).json({ message: "Selling price is required" });
    }

    // Validate positive price
    if (parseFloat(sellingPrice) <= 0) {
      return res.status(400).json({
        message: "Selling price must be positive",
      });
    }

    // Get current batch details
    const [batches] = await db.query(
      "SELECT * FROM product_batches WHERE batch_id = ? AND is_active = 1",
      [batchId]
    );

    if (batches.length === 0) {
      return res.status(404).json({ message: "Batch not found" });
    }

    const batch = batches[0];
    const oldPrice = batch.selling_price;

    // Get the product details
    const [products] = await db.query(
      "SELECT p.* FROM products p JOIN product_batches pb ON p.product_id = pb.product_id WHERE pb.batch_id = ?",
      [batchId]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: "Associated product not found" });
    }

    const product = products[0];

    // Update the batch selling price
    await db.query(
      `UPDATE product_batches 
       SET selling_price = ?,
           updated_at = CURRENT_TIMESTAMP,
           notes = CONCAT(IFNULL(notes, ''), '\n', ?)
       WHERE batch_id = ?`,
      [
        sellingPrice,
        `[${new Date().toISOString()}] Selling price updated from Rs. ${oldPrice} to Rs. ${sellingPrice}. Reason: ${
          reason || "Not specified"
        }`,
        batchId,
      ]
    );

    res.json({
      message: "Batch selling price updated successfully",
      product_name: product.name,
      old_price: oldPrice,
      new_price: sellingPrice,
    });
  } catch (error) {
    console.error("Error updating batch selling price:", error);
    res.status(500).json({
      message: "Error updating batch selling price",
      error: error.message,
    });
  }
};

// ==================== PURCHASE ORDERS MANAGEMENT ====================

/**
 * Get all purchase orders with filtering
 */
const getAllPurchaseOrders = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { status, supplier, fromDate, toDate, search } = req.query;

    // Only validate supplier if explicitly provided
    if (supplier && supplier.trim() !== "") {
      const [supplierExists] = await db.query(
        "SELECT supplier_id FROM suppliers WHERE supplier_id = ?",
        [supplier]
      );

      if (supplierExists.length === 0) {
        return res.status(404).json({ message: "Supplier not found" });
      }
    }

    // Build the SQL query dynamically based on filters
    let sql = `
      SELECT 
        po.po_id,
        po.order_date,
        po.expected_delivery_date,
        po.total_amount,
        po.status,
        po.notes,
        COALESCE(s.name, 'Unknown Supplier') as supplier_name,
        po.supplier_id,
        COALESCE(u.full_name, 'System') as created_by_name,
        COUNT(pi.po_item_id) as item_count,
        SUM(COALESCE(pi.received_quantity, 0)) as received_items
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
      LEFT JOIN users u ON po.created_by = u.user_id
      LEFT JOIN po_items pi ON po.po_id = pi.po_id
      WHERE 1=1
    `;

    // Add filters
    const params = [];

    if (status && status !== "all") {
      sql += " AND po.status = ?";
      params.push(status);
    }

    if (supplier) {
      sql += " AND po.supplier_id = ?";
      params.push(supplier);
    }

    if (fromDate) {
      sql += " AND po.order_date >= ?";
      params.push(fromDate);
    }

    if (toDate) {
      sql += " AND po.order_date <= ?";
      params.push(toDate);
    }

    if (search) {
      // Search by supplier name or PO ID
      sql += " AND (s.name LIKE ? OR po.po_id LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Group by purchase order
    sql += " GROUP BY po.po_id";

    // Order by date descending (newest first)
    sql += " ORDER BY po.order_date DESC";

    // Execute the query
    const [purchaseOrders] = await db.query(sql, params);

    res.json(purchaseOrders);
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    res.status(500).json({
      message: "Error fetching purchase orders",
      error: error.message,
    });
  }
};

/**
 * Get purchase order by ID
 */
const getPurchaseOrderById = async (req, res) => {
  try {
    const poId = req.params.id;

    // Get purchase order details
    const [purchaseOrders] = await db.query(
      `
      SELECT 
        po.*,
        COALESCE(s.name, 'Unknown Supplier') as supplier_name,
        s.contact_person,
        s.phone,
        s.email,
        COALESCE(u.full_name, 'System') as created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
      LEFT JOIN users u ON po.created_by = u.user_id
      WHERE po.po_id = ?
    `,
      [poId]
    );

    if (purchaseOrders.length === 0) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    // Get purchase order items
    const [poItems] = await db.query(
      `
      SELECT 
        pi.*,
        p.name as product_name,
        p.description as product_description
      FROM po_items pi
      LEFT JOIN products p ON pi.product_id = p.product_id
      WHERE pi.po_id = ?
    `,
      [poId]
    );

    res.json({
      ...purchaseOrders[0],
      items: poItems,
    });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    res.status(500).json({
      message: "Error fetching purchase order details",
      error: error.message,
    });
  }
};

/**
 * Get products by supplier for dropdown
 */
const getProductsBySupplier = async (req, res) => {
  try {
    const supplierId = req.params.id;

    // Get products that this supplier has supplied before
    const [products] = await db.query(
      `
      SELECT DISTINCT 
        p.product_id, 
        p.name, 
        p.description, 
        p.unit_price
      FROM products p
      JOIN product_batches pb ON p.product_id = pb.product_id
      WHERE pb.supplier_id = ? AND p.is_active = 1
      ORDER BY p.name
    `,
      [supplierId]
    );

    res.json(products);
  } catch (error) {
    console.error("Error fetching products by supplier:", error);
    res.status(500).json({
      message: "Error fetching products by supplier",
      error: error.message,
    });
  }
};

/**
 * Create a new purchase order
 */
const createPurchaseOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { supplier_id, expected_delivery_date, items, notes, created_by } =
      req.body;

    // Validate request
    if (!supplier_id || !items || items.length === 0 || !created_by) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Generate a unique PO ID (prefix PO + incremental number)
    const [lastPO] = await connection.query(
      "SELECT po_id FROM purchase_orders ORDER BY po_id DESC LIMIT 1"
    );

    let newPoId;
    if (lastPO.length === 0) {
      newPoId = "PO001";
    } else {
      const lastId = lastPO[0].po_id;
      const numericPart = parseInt(lastId.substring(2), 10);
      newPoId = `PO${String(numericPart + 1).padStart(3, "0")}`;
    }

    // Calculate total amount
    let totalAmount = 0;
    items.forEach((item) => {
      totalAmount += item.cost_price * item.quantity;
    });

    // Insert purchase order
    await connection.query(
      `
      INSERT INTO purchase_orders (
        po_id,
        supplier_id,
        order_date,
        expected_delivery_date,
        total_amount,
        status,
        created_by,
        notes
      ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, 'pending', ?, ?)
    `,
      [
        newPoId,
        supplier_id,
        expected_delivery_date || null,
        totalAmount,
        created_by,
        notes || "",
      ]
    );

    // Insert purchase order items
    for (const item of items) {
      // Generate a unique PO item ID
      const [lastPoItem] = await connection.query(
        "SELECT po_item_id FROM po_items ORDER BY po_item_id DESC LIMIT 1"
      );

      let newPoItemId;
      if (lastPoItem.length === 0) {
        newPoItemId = "POI001";
      } else {
        const lastId = lastPoItem[0].po_item_id;
        const numericPart = parseInt(lastId.substring(3), 10);
        newPoItemId = `POI${String(numericPart + 1).padStart(3, "0")}`;
      }

      await connection.query(
        `
        INSERT INTO po_items (
          po_item_id,
          po_id,
          product_id,
          quantity,
          cost_price,
          total_price,
          received_quantity
        ) VALUES (?, ?, ?, ?, ?, ?, 0)
      `,
        [
          newPoItemId,
          newPoId,
          item.product_id,
          item.quantity,
          item.cost_price,
          item.cost_price * item.quantity,
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: "Purchase order created successfully",
      po_id: newPoId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating purchase order:", error);
    res.status(500).json({
      message: "Error creating purchase order",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Update purchase order status
 */
const updatePurchaseOrderStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const poId = req.params.id;
    const { status, notes } = req.body;

    // Get current status
    const [currentStatus] = await connection.query(
      "SELECT status FROM purchase_orders WHERE po_id = ?",
      [poId]
    );

    if (currentStatus.length === 0) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    // Validate status transition
    const validTransitions = {
      pending: ["ordered", "cancelled"],
      ordered: ["received", "cancelled"],
      received: [],
      cancelled: [],
    };

    if (!validTransitions[currentStatus[0].status].includes(status)) {
      return res.status(400).json({
        message: `Invalid status transition from ${currentStatus[0].status} to ${status}`,
      });
    }

    // Update purchase order status
    await connection.query(
      `UPDATE purchase_orders 
       SET status = ?,
           notes = CONCAT(IFNULL(notes, ''), '\n', ?),
           updated_at = CURRENT_TIMESTAMP
       WHERE po_id = ?`,
      [
        status,
        `[${new Date().toISOString()}] Status changed to ${status}. ${
          notes || ""
        }`,
        poId,
      ]
    );

    // If status is 'received', update received_quantity in po_items
    if (status === "received") {
      const [poItems] = await connection.query(
        `SELECT pi.* FROM po_items pi WHERE pi.po_id = ?`,
        [poId]
      );

      // Update received quantity for each item
      for (const item of poItems) {
        await connection.query(
          "UPDATE po_items SET received_quantity = ? WHERE po_item_id = ?",
          [item.quantity, item.po_item_id]
        );
      }
    }

    await connection.commit();

    res.json({
      message: "Purchase order status updated successfully",
      new_status: status,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating purchase order status:", error);
    res.status(500).json({
      message: "Error updating purchase order status",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Update purchase order details
 */
const updatePurchaseOrder = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const poId = req.params.id;
    const { expected_delivery_date, notes, items } = req.body;

    // Check if purchase order exists
    const [purchaseOrders] = await connection.query(
      "SELECT * FROM purchase_orders WHERE po_id = ?",
      [poId]
    );

    if (purchaseOrders.length === 0) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const po = purchaseOrders[0];

    // Only allow updates for purchase orders in 'pending' status
    if (po.status !== "pending") {
      return res.status(400).json({
        message: "Only purchase orders in 'pending' status can be updated",
      });
    }

    // Update purchase order basic details
    await connection.query(
      `UPDATE purchase_orders 
       SET expected_delivery_date = ?,
           notes = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE po_id = ?`,
      [
        expected_delivery_date || po.expected_delivery_date,
        notes || po.notes,
        poId,
      ]
    );

    // If items are provided, update them
    if (items && items.length > 0) {
      // First delete existing items
      await connection.query("DELETE FROM po_items WHERE po_id = ?", [poId]);

      // Calculate new total amount
      let totalAmount = 0;

      // Insert new items
      for (const item of items) {
        // Generate a unique PO item ID
        const [lastPoItem] = await connection.query(
          "SELECT po_item_id FROM po_items ORDER BY po_item_id DESC LIMIT 1"
        );

        let newPoItemId;
        if (lastPoItem.length === 0) {
          newPoItemId = "POI001";
        } else {
          const lastId = lastPoItem[0].po_item_id;
          const numericPart = parseInt(lastId.substring(3), 10);
          newPoItemId = `POI${String(numericPart + 1).padStart(3, "0")}`;
        }

        const itemTotal = item.cost_price * item.quantity;
        totalAmount += itemTotal;

        await connection.query(
          `
          INSERT INTO po_items (
            po_item_id,
            po_id,
            product_id,
            quantity,
            cost_price,
            total_price,
            received_quantity
          ) VALUES (?, ?, ?, ?, ?, ?, 0)
        `,
          [
            newPoItemId,
            poId,
            item.product_id,
            item.quantity,
            item.cost_price,
            itemTotal,
          ]
        );
      }

      // Update total amount in purchase order
      await connection.query(
        "UPDATE purchase_orders SET total_amount = ? WHERE po_id = ?",
        [totalAmount, poId]
      );
    }

    await connection.commit();

    res.json({
      message: "Purchase order updated successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating purchase order:", error);
    res.status(500).json({
      message: "Error updating purchase order",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  // Supplier management
  getSupplierStats,
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deactivateSupplier,

  // Inventory management
  getInventoryStats,
  getAllInventory,
  getProductById,
  addProductBatch,
  adjustBatchQuantity,
  updateBatchSellingPrice,

  // Purchase orders management
  getAllPurchaseOrders,
  getPurchaseOrderById,
  getProductsBySupplier,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
};
