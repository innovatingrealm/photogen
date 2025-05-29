require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises; // Use promises API
const path = require('path');
const sharp = require('sharp');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); // Import fetch at top level

const { storage } = require('./firebase'); // Import Firebase Storage

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase payload size limit for images

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use(express.static(path.join(__dirname, './'))); // Serve static files

// Helper function to decode base64 image
function decodeBase64Image(dataString) {
  const matches = dataString.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image string');
  }
  
  return {
    type: matches[1],
    data: Buffer.from(matches[2], 'base64')
  };
}

// Define image directories
const uploadsDir = path.join(__dirname, 'images', 'uploads');
const outputsDir = path.join(__dirname, 'images', 'outputs');

// Async function to ensure directories exist
async function ensureDirectoriesExist() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(outputsDir, { recursive: true });
    console.log('Uploads and outputs directories ensured.');
  } catch (error) {
    console.error('Error creating directories:', error);
    // Exit or handle critical error if directories can't be created
    process.exit(1); 
  }
}

// Helper to upload a file to Firebase Storage and get a public URL
async function uploadToFirebase(localFilePath, destFileName) {
  const bucket = storage.bucket();
  const uploadResponse = await bucket.upload(localFilePath, {
    destination: destFileName,
    public: true, // Make file public
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
  // Get public URL
  const file = uploadResponse[0];
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
}

// API endpoint for image transformation
app.post('/api/transform', async (req, res) => {
  console.log('Received /api/transform request'); // Log request start
  let uploadFilepath = null; // Keep track of the uploaded file path for cleanup
  let outputFilepath = null;

  try {
    // Get the image data and prompt from the request
    const { image: imageData, prompt: userPrompt } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }
    console.log('Image data received'); // Log data received

    // Decode base64 image
    console.log('Decoding base64 image...');
    const decodedImg = decodeBase64Image(imageData);
    console.log('Image decoded');

    // Generate unique filename
    const timestamp = new Date().getTime();
    // Save as PNG as required by the API
    uploadFilepath = path.join(uploadsDir, `upload_${timestamp}.png`); 
    // Use a generic output filename
    outputFilepath = path.join(outputsDir, `transformed_${timestamp}.png`); 

    // Convert the decoded JPEG data to PNG format using sharp
    console.log('Converting image to PNG using sharp...');
    const pngBuffer = await sharp(decodedImg.data)
      .png() // Specify PNG output
      .toBuffer(); // Get the result as a buffer
    console.log('Image converted to PNG buffer');

    // Save the converted PNG image asynchronously
    console.log(`Saving uploaded PNG to: ${uploadFilepath}`);
    await fs.writeFile(uploadFilepath, pngBuffer);
    console.log('Uploaded PNG saved');

    // Upload original image to Firebase Storage
    const firebaseOriginalName = `uploads/upload_${timestamp}.png`;
    const originalImageUrl = await uploadToFirebase(uploadFilepath, firebaseOriginalName);
    console.log('Original image uploaded to Firebase:', originalImageUrl);

    // Make API request to OpenAI for image transformation
    console.log('Calling OpenAI images.edit API...');
    
    // Create form data
    const form = new FormData();
    form.append('model', 'gpt-image-1'); 
    
    // Read the saved file asynchronously and append
    const imageFileBuffer = await fs.readFile(uploadFilepath);
    form.append('image', imageFileBuffer, {
      filename: 'input.png',
      contentType: 'image/png' // explicitly set the content type
    });
    
    // Define a default prompt
    const defaultPrompt = "Stylize this image. Enhance its features and apply an artistic touch, maintaining the original subject's likeness but presenting it in a visually interesting style.";
    
    // Use user's prompt if provided, otherwise use the default
    const finalPrompt = userPrompt && userPrompt.trim().length > 0 ? userPrompt.trim() : defaultPrompt;
    console.log(`Using prompt: "${finalPrompt}"`); // Log the prompt being used
    
    form.append('prompt', finalPrompt); 
    form.append('size', '1024x1024');
    
    // Make direct API request (like in Python)
    console.log('Sending direct API request with properly formatted form data...');
    const apiResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        // Form-Data will set its own content-type with boundary
      },
      body: form,
      timeout: 120000 // 120 seconds timeout
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`API request failed with status ${apiResponse.status}: ${errorText}`);
    }
    
    const jsonResponse = await apiResponse.json();
    console.log('Received successful response from OpenAI API');
    
    // Get base64 data from response
    const b64Data = jsonResponse.data[0].b64_json;
    
    if (!b64Data) {
      throw new Error('No base64 image data received from OpenAI API.');
    }
    
    // Save the image and send response
    console.log('Decoding transformed image base64...');
    const outputBuffer = Buffer.from(b64Data, 'base64');
    console.log('Transformed image decoded');
    
    console.log(`Saving transformed image to: ${outputFilepath}`);
    await fs.writeFile(outputFilepath, outputBuffer); // Use async write
    console.log('Transformed image saved');

    // Upload transformed image to Firebase Storage
    const firebaseTransformedName = `outputs/transformed_${timestamp}.png`;
    const transformedImageUrl = await uploadToFirebase(outputFilepath, firebaseTransformedName);
    console.log('Transformed image uploaded to Firebase:', transformedImageUrl);

    // Send response back to client (BEFORE cleanup)
    console.log('Sending success response to client');
    res.json({
      success: true,
      transformedImage: `data:image/png;base64,${b64Data}`,
      firebaseOriginalUrl: originalImageUrl,
      firebaseTransformedUrl: transformedImageUrl
    });
  } catch (error) {
    console.error('--- ERROR in /api/transform ---');
    // Log the specific error object
    console.error(error);
    // Check if it's an OpenAI API error and log details
    if (error.response) {
      console.error('OpenAI API Error Status:', error.response.status);
      console.error('OpenAI API Error Data:', error.response.data);
    }
    res.status(500).json({
      error: 'Failed to transform image',
      // Send a more specific message if available, otherwise generic
      details: error.message || 'An unknown error occurred on the server.'
    });
  } finally {
    // Cleanup: Delete the temporary uploaded file if it exists
    if (uploadFilepath) {
      try {
        console.log(`Cleaning up temporary file: ${uploadFilepath}`);
        await fs.unlink(uploadFilepath);
        console.log('Temporary file deleted successfully.');
      } catch (cleanupError) {
        console.error(`Error deleting temporary file ${uploadFilepath}:`, cleanupError);
        // Log the error but don't crash the server or overwrite the original response
      }
    }
    if (outputFilepath) {
      try {
        console.log(`Cleaning up temporary file: ${outputFilepath}`);
        await fs.unlink(outputFilepath);
        console.log('Temporary file deleted successfully.');
      } catch (cleanupError) {
        console.error(`Error deleting temporary file ${outputFilepath}:`, cleanupError);
      }
    }
  }
});

/**
 * List all images in Firebase Storage (uploads and outputs).
 * Returns an array of { url, type, name, timeCreated }
 */
app.get('/api/images', async (req, res) => {
  try {
    const bucket = storage.bucket();
    // List files in both folders
    const [files] = await bucket.getFiles({ prefix: '' }); // Get all files

    // Filter for uploads/ and outputs/ only, ignore folders
    const imageFiles = files.filter(file =>
      (file.name.startsWith('uploads/') || file.name.startsWith('outputs/')) &&
      !file.name.endsWith('/') // Exclude folder "files"
    );

    // Get metadata and public URLs
    const images = await Promise.all(imageFiles.map(async file => {
      // Public URL
      const url = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
      // Get metadata for timeCreated
      const [metadata] = await file.getMetadata();
      return {
        url,
        type: file.name.startsWith('uploads/') ? 'original' : 'transformed',
        name: file.name,
        timeCreated: metadata.timeCreated
      };
    }));

    // Sort by timeCreated (newest first)
    images.sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated));

    res.json({ images });
  } catch (error) {
    console.error('Error listing images from Firebase:', error);
    res.status(500).json({ error: 'Failed to list images', details: error.message });
  }
});

// Start server after ensuring directories exist
ensureDirectoriesExist().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Open your browser and navigate to the above URL to use the photobooth`);
  });
}).catch(error => {
  console.error("Failed to start server:", error);
});
