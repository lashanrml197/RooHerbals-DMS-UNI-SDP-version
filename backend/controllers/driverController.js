const db = require("../config/db");
const bcrypt = require("bcrypt");

/**
 * Get dashboard statistics for lorry driver management
 */
const getDriverDashboardStats = async (req, res) => {
  try {
    // Get counts of scheduled and in-progress deliveries
    const currentDate = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

    const [todayDeliveries] = await db.query(
      `SELECT COUNT(*) as count FROM deliveries 
       WHERE scheduled_date = ? AND status IN ('scheduled', 'in_progress')`,
      [currentDate]
    );

    // Get count of vehicles currently on route
    const [vehiclesOnRoute] = await db.query(
      `SELECT COUNT(*) as count FROM vehicles 
       WHERE status = 'on_route'`
    );

    // Get today's deliveries with driver and vehicle info
    const [deliveries] = await db.query(
      `SELECT d.delivery_id, d.order_id, d.scheduled_date, d.status,
              u.full_name as driver_name, v.name as vehicle_name, 
              v.registration_number, o.customer_id, o.total_amount,
              c.name as customer_name, c.city, c.address
       FROM deliveries d
       JOIN users u ON d.driver_id = u.user_id
       JOIN vehicles v ON d.vehicle_id = v.vehicle_id
       JOIN orders o ON d.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE d.scheduled_date = ? 
       ORDER BY d.status ASC
       LIMIT 5`,
      [currentDate]
    );

    // Format the deliveries for display
    const formattedDeliveries = deliveries.map((delivery) => ({
      delivery_id: delivery.delivery_id,
      order_id: delivery.order_id,
      customer_name: delivery.customer_name,
      driver_name: delivery.driver_name,
      vehicle_name: delivery.vehicle_name,
      status: delivery.status,
      scheduled_date: delivery.scheduled_date,
      amount: delivery.total_amount,
      location: `${delivery.city}, ${delivery.address}`,
    }));

    // Get active vehicles
    const [vehicles] = await db.query(
      `SELECT vehicle_id, name, registration_number, vehicle_type, 
              capacity, status
       FROM vehicles
       ORDER BY status DESC, name ASC
       LIMIT 5`
    );

    res.json({
      todayDeliveriesCount: todayDeliveries[0].count,
      activeVehiclesCount: vehiclesOnRoute[0].count,
      deliveries: formattedDeliveries,
      vehicles: vehicles,
    });
  } catch (error) {
    console.error("Error fetching driver dashboard stats:", error);
    res.status(500).json({
      message: "Error fetching driver dashboard stats",
      error: error.message,
    });
  }
};

/**
 * Get all drivers (lorry drivers)
 */
const getAllDrivers = async (req, res) => {
  try {
    const [drivers] = await db.query(
      `SELECT user_id, username, full_name, email, phone, address, 
              area, is_active, created_at, updated_at
       FROM users 
       WHERE role = 'lorry_driver' 
       ORDER BY full_name`
    );

    // Get current assignments for each driver
    for (const driver of drivers) {
      const currentDate = new Date().toISOString().split("T")[0];

      const [currentDeliveries] = await db.query(
        `SELECT COUNT(*) as count FROM deliveries 
         WHERE driver_id = ? AND scheduled_date = ? 
         AND status IN ('scheduled', 'in_progress')`,
        [driver.user_id, currentDate]
      );

      driver.current_deliveries = currentDeliveries[0].count;
    }

    res.json(drivers);
  } catch (error) {
    console.error("Error fetching all drivers:", error);
    res.status(500).json({
      message: "Error fetching drivers",
      error: error.message,
    });
  }
};

/**
 * Get a specific driver by ID
 */
const getDriverById = async (req, res) => {
  try {
    const driverId = req.params.id;

    const [drivers] = await db.query(
      `SELECT user_id, username, full_name, email, phone, address, 
              area, is_active, created_at, updated_at
       FROM users 
       WHERE user_id = ? AND role = 'lorry_driver'`,
      [driverId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driver = drivers[0];

    // Get driver's recent deliveries
    const [recentDeliveries] = await db.query(
      `SELECT d.delivery_id, d.order_id, d.scheduled_date, d.delivery_date, 
              d.status, v.name as vehicle_name, v.registration_number,
              c.name as customer_name, c.city, o.total_amount
       FROM deliveries d
       JOIN vehicles v ON d.vehicle_id = v.vehicle_id
       JOIN orders o ON d.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE d.driver_id = ?
       ORDER BY d.scheduled_date DESC
       LIMIT 10`,
      [driverId]
    );

    // Get stats for the driver
    const [totalDeliveries] = await db.query(
      "SELECT COUNT(*) as count FROM deliveries WHERE driver_id = ?",
      [driverId]
    );

    const [completedDeliveries] = await db.query(
      "SELECT COUNT(*) as count FROM deliveries WHERE driver_id = ? AND status = 'delivered'",
      [driverId]
    );

    const [failedDeliveries] = await db.query(
      "SELECT COUNT(*) as count FROM deliveries WHERE driver_id = ? AND status = 'failed'",
      [driverId]
    );

    driver.stats = {
      total_deliveries: totalDeliveries[0].count,
      completed_deliveries: completedDeliveries[0].count,
      failed_deliveries: failedDeliveries[0].count,
      completion_rate:
        totalDeliveries[0].count > 0
          ? (
              (completedDeliveries[0].count / totalDeliveries[0].count) *
              100
            ).toFixed(1)
          : 0,
    };

    driver.recent_deliveries = recentDeliveries;

    res.json(driver);
  } catch (error) {
    console.error("Error fetching driver details:", error);
    res.status(500).json({
      message: "Error fetching driver details",
      error: error.message,
    });
  }
};

/**
 * Add a new driver
 */
const addDriver = async (req, res) => {
  try {
    const { username, password, full_name, email, phone, address, area } =
      req.body;

    // Validate required fields
    if (!username || !password || !full_name) {
      return res.status(400).json({
        message: "Username, password, and full name are required",
      });
    }

    // Check if username already exists
    const [existingUsers] = await db.query(
      "SELECT user_id FROM users WHERE username = ?",
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Generate a new user_id
    const [lastUser] = await db.query(
      "SELECT user_id FROM users ORDER BY CAST(SUBSTRING(user_id, 2) AS UNSIGNED) DESC LIMIT 1"
    );

    let newUserId;
    if (lastUser.length > 0 && lastUser[0].user_id.startsWith("U")) {
      // Extract the numeric part and increment
      const lastId = parseInt(lastUser[0].user_id.substring(1));
      newUserId = `U${String(lastId + 1).padStart(3, "0")}`;
    } else {
      // Start with U001 if no existing users or different format
      newUserId = "U001";
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new driver with the generated ID
    const [result] = await db.query(
      `INSERT INTO users (
         user_id, username, password, full_name, role, email, phone, address, area, is_active
       ) VALUES (?, ?, ?, ?, 'lorry_driver', ?, ?, ?, ?, 1)`,
      [
        newUserId,
        username,
        hashedPassword,
        full_name,
        email || null,
        phone || null,
        address || null,
        area || null,
      ]
    );

    res.status(201).json({
      message: "Driver added successfully",
      user_id: newUserId,
    });
  } catch (error) {
    console.error("Error adding new driver:", error);
    res.status(500).json({
      message: "Error adding driver",
      error: error.message,
    });
  }
};

/**
 * Update driver details
 */
const updateDriver = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { full_name, email, phone, address, area, is_active } = req.body;

    // Validate required fields
    if (!full_name) {
      return res.status(400).json({
        message: "Full name is required",
      });
    }

    // Check if driver exists
    const [existingDrivers] = await db.query(
      `SELECT user_id FROM users WHERE user_id = ? AND role = 'lorry_driver'`,
      [driverId]
    );

    if (existingDrivers.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Update driver details
    await db.query(
      `UPDATE users 
       SET full_name = ?, email = ?, phone = ?, address = ?, area = ?, 
           is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        full_name,
        email || null,
        phone || null,
        address || null,
        area || null,
        is_active !== undefined ? is_active : 1,
        driverId,
      ]
    );

    res.json({ message: "Driver updated successfully" });
  } catch (error) {
    console.error("Error updating driver:", error);
    res.status(500).json({
      message: "Error updating driver",
      error: error.message,
    });
  }
};

/**
 * Get all vehicles
 */
const getAllVehicles = async (req, res) => {
  try {
    const [vehicles] = await db.query(
      `SELECT vehicle_id, name, registration_number, vehicle_type, 
              capacity, status, created_at, updated_at
       FROM vehicles
       ORDER BY name`
    );

    // For each vehicle, get its current assignment if any
    for (const vehicle of vehicles) {
      if (vehicle.status === "on_route") {
        const [currentDelivery] = await db.query(
          `SELECT d.delivery_id, u.full_name as driver_name 
           FROM deliveries d
           JOIN users u ON d.driver_id = u.user_id
           WHERE d.vehicle_id = ? AND d.status IN ('scheduled', 'in_progress')
           ORDER BY d.scheduled_date ASC
           LIMIT 1`,
          [vehicle.vehicle_id]
        );

        if (currentDelivery.length > 0) {
          vehicle.current_assignment = {
            delivery_id: currentDelivery[0].delivery_id,
            driver_name: currentDelivery[0].driver_name,
          };
        }
      }
    }

    res.json(vehicles);
  } catch (error) {
    console.error("Error fetching all vehicles:", error);
    res.status(500).json({
      message: "Error fetching vehicles",
      error: error.message,
    });
  }
};

/**
 * Get vehicle by ID
 */
const getVehicleById = async (req, res) => {
  try {
    const vehicleId = req.params.id;

    const [vehicles] = await db.query(
      `SELECT vehicle_id, name, registration_number, vehicle_type, 
              capacity, status, created_at, updated_at
       FROM vehicles
       WHERE vehicle_id = ?`,
      [vehicleId]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const vehicle = vehicles[0];

    // Get recent deliveries for this vehicle
    const [recentDeliveries] = await db.query(
      `SELECT d.delivery_id, d.order_id, d.scheduled_date, d.delivery_date, 
              d.status, u.full_name as driver_name,
              c.name as customer_name, c.city, o.total_amount
       FROM deliveries d
       JOIN users u ON d.driver_id = u.user_id
       JOIN orders o ON d.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE d.vehicle_id = ?
       ORDER BY d.scheduled_date DESC
       LIMIT 10`,
      [vehicleId]
    );

    vehicle.recent_deliveries = recentDeliveries;

    res.json(vehicle);
  } catch (error) {
    console.error("Error fetching vehicle details:", error);
    res.status(500).json({
      message: "Error fetching vehicle details",
      error: error.message,
    });
  }
};

/**
 * Add a new vehicle
 */
const addVehicle = async (req, res) => {
  try {
    const { name, registration_number, vehicle_type, capacity } = req.body;

    // Validate required fields
    if (!name || !registration_number) {
      return res.status(400).json({
        message: "Vehicle name and registration number are required",
      });
    }

    // Check if registration number already exists
    const [existingVehicles] = await db.query(
      "SELECT vehicle_id FROM vehicles WHERE registration_number = ?",
      [registration_number]
    );

    if (existingVehicles.length > 0) {
      return res
        .status(400)
        .json({ message: "Registration number already exists" });
    }

    // Generate a new vehicle_id
    const [lastVehicle] = await db.query(
      "SELECT vehicle_id FROM vehicles ORDER BY CAST(SUBSTRING(vehicle_id, 2) AS UNSIGNED) DESC LIMIT 1"
    );

    let newVehicleId;
    if (lastVehicle.length > 0 && lastVehicle[0].vehicle_id.startsWith("V")) {
      // Extract the numeric part and increment
      const lastId = parseInt(lastVehicle[0].vehicle_id.substring(1));
      newVehicleId = `V${String(lastId + 1).padStart(3, "0")}`;
    } else {
      // Start with V001 if no existing vehicles or different format
      newVehicleId = "V001";
    }

    // Insert new vehicle with generated ID
    const [result] = await db.query(
      `INSERT INTO vehicles (
         vehicle_id, name, registration_number, vehicle_type, capacity, status
       ) VALUES (?, ?, ?, ?, ?, 'available')`,
      [
        newVehicleId,
        name,
        registration_number,
        vehicle_type || null,
        capacity || null,
      ]
    );

    res.status(201).json({
      message: "Vehicle added successfully",
      vehicle_id: newVehicleId,
    });
  } catch (error) {
    console.error("Error adding new vehicle:", error);
    res.status(500).json({
      message: "Error adding vehicle",
      error: error.message,
    });
  }
};

/**
 * Update vehicle details
 */
const updateVehicle = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const { name, vehicle_type, capacity, status } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        message: "Vehicle name is required",
      });
    }

    // Check if vehicle exists
    const [existingVehicles] = await db.query(
      "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?",
      [vehicleId]
    );

    if (existingVehicles.length === 0) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Update vehicle details
    await db.query(
      `UPDATE vehicles 
       SET name = ?, vehicle_type = ?, capacity = ?, 
           status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE vehicle_id = ?`,
      [
        name,
        vehicle_type || null,
        capacity || null,
        status || "available",
        vehicleId,
      ]
    );

    res.json({ message: "Vehicle updated successfully" });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({
      message: "Error updating vehicle",
      error: error.message,
    });
  }
};

/**
 * Toggle driver active status
 */
const toggleDriverStatus = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({
        message: "Active status is required",
      });
    }

    // Check if driver exists
    const [existingDrivers] = await db.query(
      `SELECT user_id, is_active FROM users WHERE user_id = ? AND role = 'lorry_driver'`,
      [driverId]
    );

    if (existingDrivers.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Toggle active status
    await db.query(
      `UPDATE users 
       SET is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [is_active ? 1 : 0, driverId]
    );

    const statusMessage = is_active ? "activated" : "deactivated";
    res.json({ message: `Driver ${statusMessage} successfully` });
  } catch (error) {
    console.error("Error toggling driver status:", error);
    res.status(500).json({
      message: "Error updating driver status",
      error: error.message,
    });
  }
};

/**
 * Get all deliveries with filters
 */
const getDeliveries = async (req, res) => {
  try {
    // Parse query parameters
    const { date, status, driver_id, vehicle_id } = req.query;

    // Build the query with potential filters
    let query = `
      SELECT d.delivery_id, d.order_id, d.driver_id, d.vehicle_id, 
             d.scheduled_date, d.delivery_date, d.status, d.notes,
             u.full_name as driver_name, v.name as vehicle_name, 
             v.registration_number, o.customer_id, c.name as customer_name,
             c.city, o.total_amount
      FROM deliveries d
      JOIN users u ON d.driver_id = u.user_id
      JOIN vehicles v ON d.vehicle_id = v.vehicle_id
      JOIN orders o ON d.order_id = o.order_id
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE 1=1
    `;

    const queryParams = [];

    // Add filters if provided
    if (date) {
      query += " AND d.scheduled_date = ?";
      queryParams.push(date);
    }

    if (status) {
      query += " AND d.status = ?";
      queryParams.push(status);
    }

    if (driver_id) {
      query += " AND d.driver_id = ?";
      queryParams.push(driver_id);
    }

    if (vehicle_id) {
      query += " AND d.vehicle_id = ?";
      queryParams.push(vehicle_id);
    }

    // Add order by
    query += " ORDER BY d.scheduled_date DESC, d.status ASC";

    const [deliveries] = await db.query(query, queryParams);

    res.json(deliveries);
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    res.status(500).json({
      message: "Error fetching deliveries",
      error: error.message,
    });
  }
};

/**
 * Get delivery by ID
 */
const getDeliveryById = async (req, res) => {
  try {
    const deliveryId = req.params.id;

    const [deliveries] = await db.query(
      `SELECT d.delivery_id, d.order_id, d.driver_id, d.vehicle_id, 
              d.scheduled_date, d.delivery_date, d.status, d.notes,
              u.full_name as driver_name, u.phone as driver_phone,
              v.name as vehicle_name, v.registration_number,
              o.customer_id, o.total_amount, o.discount_amount, o.final_amount,
              o.payment_type, o.payment_status,
              c.name as customer_name, c.contact_person, c.phone as customer_phone,
              c.address, c.city
       FROM deliveries d
       JOIN users u ON d.driver_id = u.user_id
       JOIN vehicles v ON d.vehicle_id = v.vehicle_id
       JOIN orders o ON d.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE d.delivery_id = ?`,
      [deliveryId]
    );

    if (deliveries.length === 0) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    const delivery = deliveries[0];

    // Get order items
    const [orderItems] = await db.query(
      `SELECT oi.order_item_id, oi.product_id, oi.batch_id, 
              oi.quantity, oi.unit_price, oi.discount, oi.total_price,
              p.name as product_name, pb.batch_number
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       JOIN product_batches pb ON oi.batch_id = pb.batch_id
       WHERE oi.order_id = ?`,
      [delivery.order_id]
    );

    delivery.order_items = orderItems;

    res.json(delivery);
  } catch (error) {
    console.error("Error fetching delivery details:", error);
    res.status(500).json({
      message: "Error fetching delivery details",
      error: error.message,
    });
  }
};

/**
 * Create a new delivery
 */
const createDelivery = async (req, res) => {
  try {
    const { order_id, driver_id, vehicle_id, scheduled_date, notes } = req.body;

    // Validate required fields
    if (!order_id || !driver_id || !vehicle_id || !scheduled_date) {
      return res.status(400).json({
        message:
          "Order ID, driver ID, vehicle ID, and scheduled date are required",
      });
    }

    // Check if order exists
    const [existingOrders] = await db.query(
      "SELECT order_id FROM orders WHERE order_id = ?",
      [order_id]
    );

    if (existingOrders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if order already has a delivery
    const [existingDeliveries] = await db.query(
      "SELECT delivery_id FROM deliveries WHERE order_id = ?",
      [order_id]
    );

    if (existingDeliveries.length > 0) {
      return res.status(400).json({
        message: "Order already has a delivery scheduled",
      });
    }

    // Check if driver exists and is active
    const [existingDrivers] = await db.query(
      "SELECT user_id FROM users WHERE user_id = ? AND role = 'lorry_driver' AND is_active = 1",
      [driver_id]
    );

    if (existingDrivers.length === 0) {
      return res.status(404).json({ message: "Active driver not found" });
    }

    // Check if vehicle exists and is available
    const [existingVehicles] = await db.query(
      "SELECT vehicle_id FROM vehicles WHERE vehicle_id = ? AND status = 'available'",
      [vehicle_id]
    );

    if (existingVehicles.length === 0) {
      return res.status(400).json({
        message: "Vehicle not available for delivery",
      });
    }

    // Start a transaction
    await db.query("START TRANSACTION");

    try {
      // Insert new delivery
      const [result] = await db.query(
        `INSERT INTO deliveries (
          order_id, driver_id, vehicle_id, scheduled_date, status, notes
        ) VALUES (?, ?, ?, ?, 'scheduled', ?)`,
        [order_id, driver_id, vehicle_id, scheduled_date, notes || null]
      );

      // Update vehicle status to 'on_route'
      await db.query(
        "UPDATE vehicles SET status = 'on_route' WHERE vehicle_id = ?",
        [vehicle_id]
      );

      // Update order status to 'processing'
      await db.query(
        "UPDATE orders SET status = 'processing' WHERE order_id = ?",
        [order_id]
      );

      // Commit the transaction
      await db.query("COMMIT");

      res.status(201).json({
        message: "Delivery created successfully",
        delivery_id: result.insertId,
      });
    } catch (error) {
      // Rollback on error
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error creating delivery:", error);
    res.status(500).json({
      message: "Error creating delivery",
      error: error.message,
    });
  }
};

/**
 * Update delivery status
 */
const updateDeliveryStatus = async (req, res) => {
  try {
    const deliveryId = req.params.id;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ["scheduled", "in_progress", "delivered", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Invalid status. Must be one of: scheduled, in_progress, delivered, failed",
      });
    }

    // Check if delivery exists
    const [existingDeliveries] = await db.query(
      "SELECT delivery_id, vehicle_id, order_id FROM deliveries WHERE delivery_id = ?",
      [deliveryId]
    );

    if (existingDeliveries.length === 0) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    const vehicleId = existingDeliveries[0].vehicle_id;
    const orderId = existingDeliveries[0].order_id;

    // Start a transaction
    await db.query("START TRANSACTION");

    try {
      // Update the delivery
      const updateQuery =
        status === "delivered" || status === "failed"
          ? `UPDATE deliveries 
           SET status = ?, notes = ?, delivery_date = CURRENT_DATE, 
               updated_at = CURRENT_TIMESTAMP
           WHERE delivery_id = ?`
          : `UPDATE deliveries 
           SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE delivery_id = ?`;

      await db.query(updateQuery, [status, notes || null, deliveryId]);

      // If delivery is completed or failed, check if all deliveries for this vehicle are complete
      if (status === "delivered" || status === "failed") {
        // Check if there are any more active deliveries for this vehicle
        const [activeDeliveries] = await db.query(
          `SELECT COUNT(*) as count FROM deliveries 
           WHERE vehicle_id = ? AND status IN ('scheduled', 'in_progress')`,
          [vehicleId]
        );

        // If no more active deliveries, set vehicle status back to available
        if (activeDeliveries[0].count === 0) {
          await db.query(
            "UPDATE vehicles SET status = 'available' WHERE vehicle_id = ?",
            [vehicleId]
          );
        }

        // Update order status
        const orderStatus = status === "delivered" ? "delivered" : "cancelled";
        await db.query("UPDATE orders SET status = ? WHERE order_id = ?", [
          orderStatus,
          orderId,
        ]);
      }

      // Commit the transaction
      await db.query("COMMIT");

      res.json({ message: "Delivery status updated successfully" });
    } catch (error) {
      // Rollback on error
      await db.query("ROLLBACK");
      throw error;
    }
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({
      message: "Error updating delivery status",
      error: error.message,
    });
  }
};

/**
 * Get scheduled deliveries for a driver
 */
const getDriverSchedule = async (req, res) => {
  try {
    const driverId = req.params.id;
    const { date } = req.query;

    // Set default date to today if not provided
    const deliveryDate = date || new Date().toISOString().split("T")[0];

    // Check if driver exists
    const [existingDrivers] = await db.query(
      "SELECT user_id FROM users WHERE user_id = ? AND role = 'lorry_driver'",
      [driverId]
    );

    if (existingDrivers.length === 0) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Get scheduled deliveries for the driver on the specified date
    const [deliveries] = await db.query(
      `SELECT d.delivery_id, d.order_id, d.scheduled_date, d.status,
              v.name as vehicle_name, v.registration_number,
              o.total_amount, o.discount_amount, o.final_amount,
              c.name as customer_name, c.contact_person, c.phone, c.address, c.city
       FROM deliveries d
       JOIN vehicles v ON d.vehicle_id = v.vehicle_id
       JOIN orders o ON d.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE d.driver_id = ? AND d.scheduled_date = ?
       ORDER BY d.status ASC`,
      [driverId, deliveryDate]
    );

    // Get items for each delivery
    for (const delivery of deliveries) {
      const [items] = await db.query(
        `SELECT oi.product_id, oi.quantity, p.name as product_name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.product_id
         WHERE oi.order_id = ?`,
        [delivery.order_id]
      );

      delivery.items = items;
    }

    res.json({
      driver_id: driverId,
      date: deliveryDate,
      deliveries: deliveries,
    });
  } catch (error) {
    console.error("Error fetching driver schedule:", error);
    res.status(500).json({
      message: "Error fetching driver schedule",
      error: error.message,
    });
  }
};

/**
 * Get maintenance alerts (basic placeholder)
 * Note: In a real application, this would be stored in the database
 */
const getMaintenanceAlerts = async (req, res) => {
  try {
    // Since we don't have actual maintenance data, we'll return an empty array
    // In a production app, this would connect to a maintenance table
    res.json([]);
  } catch (error) {
    console.error("Error fetching maintenance alerts:", error);
    res.status(500).json({
      message: "Error fetching maintenance alerts",
      error: error.message,
    });
  }
};

module.exports = {
  getDriverDashboardStats,
  getAllDrivers,
  getDriverById,
  addDriver,
  updateDriver,
  toggleDriverStatus,
  getAllVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  getDeliveries,
  getDeliveryById,
  createDelivery,
  updateDeliveryStatus,
  getDriverSchedule,
  getMaintenanceAlerts,
};
