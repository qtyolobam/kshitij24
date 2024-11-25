/**
 * Converts a PDF file object to an image buffer
 * @param {Object} fileObj - The PDF file object (from multer)
 * @param {number} scale - Scale factor for the image (default: 2)
 * @returns {Promise<Object>} Modified file object with image buffer
 */
async function convertPdfToImage(fileObj, scale = 2) {
  try {
    // Dynamically import pdf-to-img
    const { pdf } = await import("pdf-to-img");

    // Convert PDF to image using the buffer directly
    const document = await pdf(fileObj.buffer, { scale });
    const imageBuffer = await document.getPage(1);

    // Return modified file object
    fileObj.buffer = imageBuffer;
    fileObj.mimetype = "image/png";
    fileObj.originalname = fileObj.originalname.replace(".pdf", ".png");
    fileObj.originalname = fileObj.originalname.replace(".PDF", ".png");
    return fileObj;
  } catch (error) {
    throw new Error(`Failed to convert PDF to image: ${error.message}`);
  }
}

module.exports = convertPdfToImage;
