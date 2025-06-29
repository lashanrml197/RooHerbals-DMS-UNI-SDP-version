/**
 * Password testing utility
 */
const bcrypt = require("bcrypt");

async function testBcryptHash() {
  console.log("\n--- BCRYPT PASSWORD HASHING TEST UTILITY ---\n");

  // Test password
  const plainPassword = "password123";
  console.log(`Plain text password: ${plainPassword}`);

  // Generate hash
  console.log("\nGenerating hash...");
  const hash = await bcrypt.hash(plainPassword, 10);
  console.log(`Generated hash: ${hash}`);

  // Verify password against hash
  console.log("\nVerifying password against hash...");
  const match = await bcrypt.compare(plainPassword, hash);
  console.log(`Password verified: ${match}`);

  // Test incorrect password
  console.log("\nTesting incorrect password...");
  const incorrectMatch = await bcrypt.compare("wrongpassword", hash);
  console.log(`Incorrect password verified: ${incorrectMatch}`);

  if (process.argv.length > 2) {
    const dbHash = process.argv[2];
    console.log(`\nTesting against database hash: ${dbHash}`);
    const dbMatch = await bcrypt.compare(plainPassword, dbHash);
    console.log(`Database hash verified with '${plainPassword}': ${dbMatch}`);
  }

  console.log("\n--- TEST COMPLETE ---\n");
}

testBcryptHash()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
