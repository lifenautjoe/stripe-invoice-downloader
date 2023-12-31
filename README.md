# Stripe Invoice Downloader

This utility is designed to help you automatically download your invoices from Stripe for a specified year. Using this command-line utility, you can define where the invoices are saved and how many files to download in parallel to make the process efficient.

## Features:
- Download all invoices for a specified year.
- Optimize download speed by defining the number of parallel downloads.
- Set custom directory for storing downloaded invoices.

## Prerequisites:
- Node.js
- A Stripe account with a secret key.
- Properly set up .env file with the Stripe secret key.

## Setup:

1. **Install Dependencies:**

   After cloning the repository, navigate to the project directory and run:

   ```bash
   npm install
   ```

2. **Environment Variables:**

   Rename the `.env.example` file to `.env` and update the `STRIPE_SECRET_KEY` with your Stripe secret key.

   ```dotenv
   STRIPE_SECRET_KEY=your_stripe_secret_key_here
   ```

## Usage:

To download invoices:

```bash
node app.js download --years=2023,2022
```

**Available options:**

- `--years`: Define the years you want to download invoices for. (Required)
  
- `--parallel`: Number of invoices to download in parallel. Default is 10.

  ```bash
  node app.js download --years=2023,2022 --parallel=5
  ```

- `--path`: Define the directory path where you want to save the invoices. By default, it will save in the current directory.

  ```bash
  node app.js download --years=2023,2022 --path=/path/to/directory
  ```

## Troubleshooting:

If you run into any issues:

1. Ensure you have a valid Stripe secret key set in the `.env` file.
2. Ensure that you have the required permissions on the directory you're trying to save the invoices to.
3. Verify that you have a stable internet connection.

## Contributing:

Contributions are welcome! If you find a bug or think of a new feature, please open an issue or submit a pull request.

## License:

Creative Commons Attribution (CC BY)