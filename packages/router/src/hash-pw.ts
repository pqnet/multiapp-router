/** @format */
import { createHash } from './password.js';

async function main() {
  // Get command line arguments (excluding 'node' and script name)
  const args = process.argv.slice(2);

  // Check if there is exactly 1 argument
  if (args.length !== 1) {
    if (args.length < 1 || args.length > 2) {
      console.log('Usage: hash-pw <password> [iterations] >> credentials.txt');
      process.exit(1);
    }
    process.exit(1);
  }

  // Get the password from command line
  const password = args[0];
  let iterations: number | undefined = parseInt(args[1], 10);
  if (isNaN(iterations)) {
    iterations = undefined;
  }

  try {
    // Hash the password
    const hashedPassword = await createHash(password, iterations);
    console.log(hashedPassword);
  } catch (error) {
    console.error('Error hashing password:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
