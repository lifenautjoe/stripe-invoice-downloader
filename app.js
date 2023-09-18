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

async function downloadInvoicePDF(invoiceId, downloadPath) {
  const invoice = await stripe.invoices.retrieve(invoiceId);

  if (!invoice.invoice_pdf) {
    console.log(`No PDF available for Invoice-${invoice.number}.`);
    return;
  }

  const invoiceDate = new Date(invoice.created * 1000); // Convert Unix timestamp to JavaScript date
  const year = invoiceDate.getFullYear();
  const month = String(invoiceDate.getMonth() + 1).padStart(2, "0");
  const day = String(invoiceDate.getDate()).padStart(2, "0");

  const folderPath = path.join(downloadPath, String(year));
  if (!fs.existsSync(folderPath)) {
    mkdirp.sync(folderPath);
  }

  const pdfFilename = `${folderPath}/${year}-${month}-${day}-${invoice.number}.pdf`;

  if (fs.existsSync(pdfFilename)) {
    console.log(`Invoice-${invoice.number} already exists. Skipping download.`);
    return;
  }

  const pdfUrl = invoice.invoice_pdf;
  const response = await axios.get(pdfUrl, { responseType: "stream" });
  response.data.pipe(fs.createWriteStream(pdfFilename));

  return new Promise((resolve, reject) => {
    response.data.on("end", resolve);
    response.data.on("error", reject);
  });
}

const downloadAllInvoicesForYear = async (
  year,
  downloadPath,
  parallelDownloads
) => {
  const folderPath = path.join(downloadPath, year.toString());
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
    const invoiceChunks = [];

    // Split the invoices into chunks for parallel processing
    for (let i = 0; i < invoices.data.length; i += parallelDownloads) {
      invoiceChunks.push(invoices.data.slice(i, i + parallelDownloads));
    }

    for (let chunk of invoiceChunks) {
      console.log(`Downloading a chunk of ${parallelDownloads} invoices...`);
      await Promise.all(
        chunk.map((invoice) => downloadInvoicePDF(invoice.id, downloadPath))
      );
    }

    hasMore = invoices.has_more;
    if (invoices.data.length) {
      startingAfter = invoices.data[invoices.data.length - 1].id;
    }
  }
};

yargs
  .command({
    command: "download",
    describe: "Download invoices for a specific year",
    builder: {
      year: {
        describe: "Year to download invoices for",
        demandOption: true,
        type: "number",
      },
      parallel: {
        describe: "Number of invoices to download in parallel",
        default: 10,
        type: "number",
      },
      path: {
        describe: "Path to download the invoices",
        default: path.join(__dirname, "output"), // default path can be set to a folder named "output" in the current directory
        type: "string",
      },
    },
    handler(argv) {
      if (argv.year) {
        downloadAllInvoicesForYear(argv.year, argv.path, argv.parallel)
          .then(() => {
            console.log("All invoices downloaded!");
          })
          .catch((error) => {
            console.error("Error downloading invoices:", error);
          });
      }
    },
  })
  .showHelpOnFail(true) // Show the help when command or options are missing
  .demandCommand(1, "") // At least 1 command is needed
  .help().argv;
