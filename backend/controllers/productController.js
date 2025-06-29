const db = require("../config/db");

/**
 * Get all products with stock information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllProducts = async (req, res) => {
  try {
    // Get query parameters for filtering
    const { category, search, sort, active } = req.query;

    // Base query with join to get current stock levels from batches
    let query = `
      SELECT 
        p.product_id,
        p.name,
        p.description,
        p.category_id,
        c.name as category_name,
        p.unit_price,
        p.reorder_level,
        p.is_company_product,
        p.is_active,
        p.created_at,
        p.updated_at,
        COALESCE(SUM(pb.current_quantity), 0) as current_stock,
        COUNT(DISTINCT pb.batch_id) as batch_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN product_batches pb ON p.product_id = pb.product_id AND pb.is_active = 1
    `;

    // Build WHERE clause based on filters
    const whereConditions = [];
    const params = [];

    // Filter by active status (default to active only)
    if (active !== "all") {
      whereConditions.push("p.is_active = 1");
    }

    // Filter by category
    if (category) {
      whereConditions.push("p.category_id = ?");
      params.push(category);
    }

    // Search by name or description
    if (search) {
      whereConditions.push("(p.name LIKE ? OR p.description LIKE ?)");
      params.push(`%${search}%`);
      params.push(`%${search}%`);
    }

    // Add WHERE clause if needed
    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    // Group by product to handle multiple batches
    query += " GROUP BY p.product_id";

    // Add sorting
    if (sort === "price_asc") {
      query += " ORDER BY p.unit_price ASC";
    } else if (sort === "price_desc") {
      query += " ORDER BY p.unit_price DESC";
    } else if (sort === "stock_asc") {
      query += " ORDER BY current_stock ASC";
    } else if (sort === "stock_desc") {
      query += " ORDER BY current_stock DESC";
    } else if (sort === "name_asc") {
      query += " ORDER BY p.name ASC";
    } else if (sort === "name_desc") {
      query += " ORDER BY p.name DESC";
    } else {
      // Default sort by name
      query += " ORDER BY p.name ASC";
    }

    // Execute the query
    const [products] = await db.query(query, params);

    // For each product, get the batch details
    for (const product of products) {
      const [batches] = await db.query(
        `SELECT 
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

      // Add batches array to the product
      product.batches = batches;

      // Get the earliest expiry date from active batches with positive quantity
      if (batches.length > 0) {
        // Find earliest non-null expiry date among batches with positive quantity
        const expiryDates = batches
          .filter((batch) => batch.current_quantity > 0 && batch.expiry_date)
          .map((batch) => batch.expiry_date);

        product.next_expiry =
          expiryDates.length > 0
            ? new Date(Math.min(...expiryDates.map((date) => new Date(date))))
                .toISOString()
                .split("T")[0]
            : null;
      } else {
        product.next_expiry = null;
      }
    }

    // Return the results
    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

/**
 * Get a single product by ID with batch information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get product details
    const [product] = await db.query(
      `SELECT 
        p.*,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.product_id = ?`,
      [id]
    );

    if (product.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Get batch information for this product
    const [batches] = await db.query(
      `SELECT 
        pb.*,
        s.name as supplier_name
      FROM product_batches pb
      LEFT JOIN suppliers s ON pb.supplier_id = s.supplier_id
      WHERE pb.product_id = ? AND pb.is_active = 1
      ORDER BY pb.expiry_date ASC`,
      [id]
    );

    // Combine product with batches
    const productData = {
      ...product[0],
      batches,
    };

    res.status(200).json({
      success: true,
      data: productData,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

/**
 * Create a new product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category_id,
      unit_price,
      reorder_level,
      is_company_product,
      initial_stock,
      supplier_id,
      batch_number,
      manufacturing_date,
      expiry_date,
      cost_price,
    } = req.body;

    // Validate required fields
    if (!name || !unit_price || !category_id) {
      return res.status(400).json({
        success: false,
        error: "Please provide name, unit price and category",
      });
    }

    // Start a transaction to ensure both product and batch are created successfully
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Generate a new product ID
      const [lastProduct] = await connection.query(
        "SELECT product_id FROM products ORDER BY product_id DESC LIMIT 1"
      );

      let newProductId = "P001";
      if (lastProduct.length > 0) {
        const lastId = lastProduct[0].product_id;
        const numericPart = parseInt(lastId.substring(1));
        newProductId = `P${String(numericPart + 1).padStart(3, "0")}`;
      }

      // Insert the new product
      const [productResult] = await connection.query(
        `INSERT INTO products (
          product_id,
          name,
          description,
          category_id,
          unit_price,
          reorder_level,
          is_company_product,
          is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newProductId,
          name,
          description || "",
          category_id,
          unit_price,
          reorder_level || 10,
          is_company_product === undefined ? 1 : is_company_product,
          1, // Active by default
        ]
      );

      // If initial stock is provided, create a batch
      if (initial_stock && initial_stock > 0 && supplier_id) {
        // Generate a new batch ID
        const [lastBatch] = await connection.query(
          "SELECT batch_id FROM product_batches ORDER BY batch_id DESC LIMIT 1"
        );

        let newBatchId = "B001";
        if (lastBatch.length > 0) {
          const lastId = lastBatch[0].batch_id;
          const numericPart = parseInt(lastId.substring(1));
          newBatchId = `B${String(numericPart + 1).padStart(3, "0")}`;
        }

        // Generate batch number if not provided
        const batchNum =
          batch_number ||
          `${newProductId}-${new Date().toISOString().split("T")[0]}`;

        // Get current date
        const currentDate = new Date().toISOString().split("T")[0];

        // Insert the new batch
        await connection.query(
          `INSERT INTO product_batches (
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
            is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newBatchId,
            newProductId,
            supplier_id,
            batchNum,
            manufacturing_date || currentDate,
            expiry_date || null,
            cost_price || unit_price * 0.7, // Default to 70% of selling price if not provided
            unit_price,
            initial_stock,
            initial_stock,
            currentDate,
            1, // Active by default
          ]
        );
      }

      // Commit the transaction
      await connection.commit();

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: {
          product_id: newProductId,
          name,
          unit_price,
        },
      });
    } catch (error) {
      // Rollback in case of error
      await connection.rollback();
      throw error;
    } finally {
      // Release the connection
      connection.release();
    }
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

/**
 * Update a product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category_id,
      unit_price,
      reorder_level,
      is_company_product,
      is_active,
    } = req.body;

    // Check if product exists
    const [existingProduct] = await db.query(
      "SELECT * FROM products WHERE product_id = ?",
      [id]
    );

    if (existingProduct.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Prepare update fields and values
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }

    if (description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(description);
    }

    if (category_id !== undefined) {
      updateFields.push("category_id = ?");
      updateValues.push(category_id);
    }

    if (unit_price !== undefined) {
      updateFields.push("unit_price = ?");
      updateValues.push(unit_price);
    }

    if (reorder_level !== undefined) {
      updateFields.push("reorder_level = ?");
      updateValues.push(reorder_level);
    }

    if (is_company_product !== undefined) {
      updateFields.push("is_company_product = ?");
      updateValues.push(is_company_product);
    }

    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      updateValues.push(is_active);
    }

    // Only update if there are fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    // Add product_id to values array
    updateValues.push(id);

    // Update product
    const [result] = await db.query(
      `UPDATE products
       SET ${updateFields.join(", ")}
       WHERE product_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        error: "Product not updated",
      });
    }

    // Get updated product
    const [updatedProduct] = await db.query(
      "SELECT * FROM products WHERE product_id = ?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: updatedProduct[0],
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

/**
 * Delete a product (soft delete by setting is_active to false)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const [existingProduct] = await db.query(
      "SELECT * FROM products WHERE product_id = ?",
      [id]
    );

    if (existingProduct.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Soft delete - set is_active to false
    const [result] = await db.query(
      "UPDATE products SET is_active = 0 WHERE product_id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        error: "Product not deleted",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

/**
 * Add a new batch for an existing product
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addProductBatch = async (req, res) => {
  try {
    const { product_id } = req.params;
    const {
      supplier_id,
      batch_number,
      manufacturing_date,
      expiry_date,
      cost_price,
      selling_price,
      initial_quantity,
      notes,
    } = req.body;

    // Validate required fields
    if (!supplier_id || !initial_quantity || initial_quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: "Please provide supplier, and a valid quantity",
      });
    }

    // Check if product exists
    const [existingProduct] = await db.query(
      "SELECT * FROM products WHERE product_id = ?",
      [product_id]
    );

    if (existingProduct.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Product not found",
      });
    }

    // Generate a new batch ID
    const [lastBatch] = await db.query(
      "SELECT batch_id FROM product_batches ORDER BY batch_id DESC LIMIT 1"
    );

    let newBatchId = "B001";
    if (lastBatch.length > 0) {
      const lastId = lastBatch[0].batch_id;
      const numericPart = parseInt(lastId.substring(1));
      newBatchId = `B${String(numericPart + 1).padStart(3, "0")}`;
    }

    // Generate batch number if not provided
    const batchNum =
      batch_number || `${product_id}-${new Date().toISOString().split("T")[0]}`;

    // Get current date
    const currentDate = new Date().toISOString().split("T")[0];

    // Insert the new batch
    const [result] = await db.query(
      `INSERT INTO product_batches (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newBatchId,
        product_id,
        supplier_id,
        batchNum,
        manufacturing_date || currentDate,
        expiry_date || null,
        cost_price || existingProduct[0].unit_price * 0.7, // Default to 70% of product price
        selling_price || existingProduct[0].unit_price,
        initial_quantity,
        initial_quantity,
        currentDate,
        notes || "",
        1, // Active by default
      ]
    );

    res.status(201).json({
      success: true,
      message: "Product batch added successfully",
      data: {
        batch_id: newBatchId,
        batch_number: batchNum,
        quantity: initial_quantity,
      },
    });
  } catch (error) {
    console.error("Error adding product batch:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

/**
 * Update a product batch
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProductBatch = async (req, res) => {
  try {
    const { batch_id } = req.params;
    const {
      manufacturing_date,
      expiry_date,
      cost_price,
      selling_price,
      current_quantity,
      notes,
      is_active,
    } = req.body;

    // Check if batch exists
    const [existingBatch] = await db.query(
      "SELECT * FROM product_batches WHERE batch_id = ?",
      [batch_id]
    );

    if (existingBatch.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Batch not found",
      });
    }

    // Prepare update fields and values
    const updateFields = [];
    const updateValues = [];

    if (manufacturing_date !== undefined) {
      updateFields.push("manufacturing_date = ?");
      updateValues.push(manufacturing_date);
    }

    if (expiry_date !== undefined) {
      updateFields.push("expiry_date = ?");
      updateValues.push(expiry_date);
    }

    if (cost_price !== undefined) {
      updateFields.push("cost_price = ?");
      updateValues.push(cost_price);
    }

    if (selling_price !== undefined) {
      updateFields.push("selling_price = ?");
      updateValues.push(selling_price);
    }

    if (current_quantity !== undefined) {
      updateFields.push("current_quantity = ?");
      updateValues.push(current_quantity);
    }

    if (notes !== undefined) {
      updateFields.push("notes = ?");
      updateValues.push(notes);
    }

    if (is_active !== undefined) {
      updateFields.push("is_active = ?");
      updateValues.push(is_active);
    }

    // Add updated_at timestamp
    updateFields.push("updated_at = CURRENT_TIMESTAMP");

    // Only update if there are fields to update
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No fields to update",
      });
    }

    // Add batch_id to values array
    updateValues.push(batch_id);

    // Update batch
    const [result] = await db.query(
      `UPDATE product_batches
       SET ${updateFields.join(", ")}
       WHERE batch_id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        error: "Batch not updated",
      });
    }

    res.status(200).json({
      success: true,
      message: "Batch updated successfully",
    });
  } catch (error) {
    console.error("Error updating batch:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

/**
 * Get all categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllCategories = async (req, res) => {
  try {
    const [categories] = await db.query(
      "SELECT * FROM categories ORDER BY name"
    );

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

/**
 * Get all suppliers (active only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllSuppliers = async (req, res) => {
  try {
    const [suppliers] = await db.query(
      "SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name"
    );

    res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers,
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

/**
 * Get low stock products (below reorder level)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getLowStockProducts = async (req, res) => {
  try {
    const [lowStockProducts] = await db.query(
      `SELECT 
        p.product_id,
        p.name,
        p.category_id,
        c.name as category_name,
        p.unit_price,
        p.reorder_level,
        p.is_company_product,
        COALESCE(SUM(pb.current_quantity), 0) as current_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN product_batches pb ON p.product_id = pb.product_id AND pb.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.product_id
      HAVING (current_stock < p.reorder_level OR current_stock = 0)
      ORDER BY current_stock ASC`
    );

    res.status(200).json({
      success: true,
      count: lowStockProducts.length,
      data: lowStockProducts,
    });
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    res.status(500).json({
      success: false,
      error: "Server Error",
      message: error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductBatch,
  updateProductBatch,
  getAllCategories,
  getAllSuppliers,
  getLowStockProducts,
};
