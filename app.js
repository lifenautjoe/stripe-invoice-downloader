const fs = require("fs");
const path = require("path");
const axios = require("axios");

require("dotenv").config();
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("Please set STRIPE_SECRET_KEY in your .env file");
  process.exit(1);
}

const stripe = require("stripe")(STRIPE_SECRET_KEY);

const yargs = require("yargs");
const mkdirp = require("mkdirp");

async function downloadInvoicePDF(invoiceId) {
  const invoice = await stripe.invoices.retrieve(invoiceId);

  if (!invoice.invoice_pdf) {
    console.log(`No PDF available for Invoice-${invoice.number}.`);
    return;
  }

  const invoiceDate = new Date(invoice.created * 1000); // Convert Unix timestamp to JavaScript date
  const year = invoiceDate.getFullYear();
  const month = String(invoiceDate.getMonth() + 1).padStart(2, "0");
  const day = String(invoiceDate.getDate()).padStart(2, "0");

  // Construct folder and filename based on given format
  const folderPath = path.join(__dirname, String(year));
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  const pdfFilename = `${folderPath}/${year}-${month}-${day}-${invoice.number}.pdf`;

  // Download and save the invoice PDF
  const pdfUrl = invoice.invoice_pdf;
  const response = await axios.get(pdfUrl, { responseType: "stream" });
  response.data.pipe(fs.createWriteStream(pdfFilename));

  return new Promise((resolve, reject) => {
    response.data.on("end", resolve);
    response.data.on("error", reject);
  });
}

const downloadAllInvoicesForYear = async (year) => {
  const folderPath = path.join(__dirname, year.toString());
  mkdirp.sync(folderPath); // Ensure the directory exists

  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    const listOptions = {
      created: {
        gte: new Date(year, 0, 1).getTime() / 1000,
        lt: new Date(year + 1, 0, 1).getTime() / 1000,
      },
      limit: 100,
    };

    if (startingAfter) {
      listOptions.starting_after = startingAfter;
    }

    const invoices = await stripe.invoices.list(listOptions);

    for (let invoice of invoices.data) {
      console.log(`Downloading Invoice-${invoice.number} ...`);
      await downloadInvoicePDF(invoice.id, folderPath);
    }

    hasMore = invoices.has_more;
    if (invoices.data.length) {
      startingAfter = invoices.data[invoices.data.length - 1].id;
    }
  }
};

// CLI setup
yargs.command({
  command: "download",
  describe: "Download invoices for a specific year",
  builder: {
    year: {
      describe: "Year to download invoices for",
      demandOption: true,
      type: "number",
    },
  },
  handler(argv) {
    if (argv.year) {
      downloadAllInvoicesForYear(argv.year)
        .then(() => {
          console.log("All invoices downloaded!");
        })
        .catch((error) => {
          console.error("Error downloading invoices:", error);
        });
    }
  },
}).argv;
