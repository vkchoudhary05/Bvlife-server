import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function isMysqlConfigured(): boolean {
  return !!(
    process.env.MYSQL_HOST &&
    process.env.MYSQL_USER &&
    process.env.MYSQL_DATABASE
  );
}

export function getMysqlConfig() {
  return {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: Number(process.env.MYSQL_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

export async function initMysqlPool(): Promise<mysql.Pool | null> {
  if (!isMysqlConfigured()) {
    return null;
  }
  if (pool) {
    return pool;
  }

  const config = getMysqlConfig();
  console.log(`Connecting to MySQL database "${config.database}" at ${config.host}:${config.port}...`);
  try {
    pool = mysql.createPool(config);
    // Test the connection
    const conn = await pool.getConnection();
    console.log('Successfully connected to MySQL database!');
    conn.release();
    return pool;
  } catch (error) {
    console.error('Failed to establish connection to MySQL database:', error);
    pool = null;
    return null;
  }
}

export async function query(sql: string, params?: any[]): Promise<any> {
  const currentPool = await initMysqlPool();
  if (!currentPool) {
    throw new Error('MySQL is not initialized or configured.');
  }
  const [rows] = await currentPool.execute(sql, params);
  return rows;
}

export async function initTables(): Promise<void> {
  if (!isMysqlConfigured()) return;

  console.log('Initializing MySQL Database Tables (DDL)...');
  try {
    // 1. Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) PRIMARY KEY,
        fullName VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(50),
        addresses TEXT,
        password VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Products Table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        originalPrice DECIMAL(10,2) NOT NULL,
        stock INT NOT NULL,
        category VARCHAR(255) NOT NULL,
        subcategory VARCHAR(255),
        brand VARCHAR(255) NOT NULL,
        description TEXT,
        mainImage TEXT,
        images TEXT,
        ingredients TEXT,
        benefits TEXT,
        dosage TEXT,
        usageInstructions TEXT,
        faqs TEXT,
        rating DECIMAL(3,2) NOT NULL,
        featured TINYINT(1) DEFAULT 0,
        bestSeller TINYINT(1) DEFAULT 0,
        lowStockAlertLimit INT NOT NULL,
        createdDate VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Orders Table
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        userEmail VARCHAR(255) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        shippingAddress TEXT NOT NULL,
        items TEXT NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL,
        shippingCharge DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) NOT NULL,
        finalTotal DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        paymentMethod VARCHAR(100) NOT NULL,
        paymentStatus VARCHAR(50) NOT NULL,
        orderDate VARCHAR(100) NOT NULL,
        trackingNumber VARCHAR(100),
        trackingUpdates TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Reviews Table
    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(255) PRIMARY KEY,
        productId VARCHAR(255) NOT NULL,
        productName VARCHAR(255) NOT NULL,
        userName VARCHAR(255) NOT NULL,
        userEmail VARCHAR(255) NOT NULL,
        rating INT NOT NULL,
        comment TEXT,
        isApproved TINYINT(1) DEFAULT 1,
        date VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Blogs Table
    await query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        summary TEXT,
        content TEXT,
        image TEXT,
        author VARCHAR(255) NOT NULL,
        date VARCHAR(50) NOT NULL,
        categories TEXT,
        readTime VARCHAR(50) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. FAQs Table
    await query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id VARCHAR(255) PRIMARY KEY,
        category VARCHAR(255) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Coupons Table
    await query(`
      CREATE TABLE IF NOT EXISTS coupons (
        code VARCHAR(100) PRIMARY KEY,
        discountType VARCHAR(50) NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        minOrderValue DECIMAL(10,2) NOT NULL,
        maxDiscount DECIMAL(10,2),
        expiryDate VARCHAR(50) NOT NULL,
        active TINYINT(1) DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Settings Table
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(50) PRIMARY KEY,
        logoName VARCHAR(255) NOT NULL,
        logoUrl MEDIUMTEXT,
        contactEmail VARCHAR(255) NOT NULL,
        contactPhone VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        facebook VARCHAR(255),
        instagram VARCHAR(255),
        twitter VARCHAR(255),
        defaultTaxPercentage DECIMAL(5,2) NOT NULL,
        baseShippingCharge DECIMAL(10,2) NOT NULL,
        freeShippingThreshold DECIMAL(10,2) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure the column logoUrl is MEDIUMTEXT even if the table was created previously with a smaller length
    try {
      const columns = await query("SHOW COLUMNS FROM settings LIKE 'logoUrl'");
      if (columns && columns.length > 0) {
        await query("ALTER TABLE settings MODIFY COLUMN logoUrl MEDIUMTEXT");
        console.log("MySQL settings.logoUrl column altered to MEDIUMTEXT successfully.");
      } else {
        await query("ALTER TABLE settings ADD COLUMN logoUrl MEDIUMTEXT AFTER logoName");
        console.log("MySQL settings.logoUrl column added as MEDIUMTEXT successfully.");
      }
    } catch (colErr) {
      console.warn("Failed to dynamically alter/add settings.logoUrl column (will rely on default schema):", colErr);
    }

    // 9. Activity Logs Table
    await query(`
      CREATE TABLE IF NOT EXISTS activityLogs (
        id VARCHAR(255) PRIMARY KEY,
        timestamp VARCHAR(100) NOT NULL,
        userEmail VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        details TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Payments Table
    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        orderId VARCHAR(255) NOT NULL,
        userEmail VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        paymentMethod VARCHAR(100) NOT NULL,
        transactionReference VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        createdAt VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('MySQL Database Tables verified/created successfully!');
  } catch (error) {
    console.error('Error during MySQL tables DDL setup:', error);
  }
}
