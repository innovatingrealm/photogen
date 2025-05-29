# AI Photobooth

A photo booth application that uses AI to transform user photos based on a provided style prompt. Take pictures directly from your camera or upload an image, provide a style description, and see the transformed result!

## Support the Project

If you find this project helpful, you can support the developer here: [http://paypal.me/professorpatterns](http://paypal.me/professorpatterns)

## Features

- Live camera feed with capture functionality
- Image transformation using OpenAI's image generation API based on a user prompt
- Upload option for existing photos
- Download option for transformed images
- GitHub integration for version control

## Installation

1. Clone this repository or download the files
2. Install dependencies:

```bash
npm install
```

## API Key Setup

This application requires an OpenAI API key to function:

1. Sign up or log in at [https://platform.openai.com/](https://platform.openai.com/)
2. Navigate to [API Keys](https://platform.openai.com/account/api-keys) and create a new secret key
3. Create a `.env` file in the project root (copy from `.env.example`):

```
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

Replace `your_openai_api_key_here` with your actual API key.

## Running the Application

Start the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

Then open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## How It Works

1. The application accesses your camera (with permission) or allows you to upload an image.
2. You provide a text prompt describing the desired style for the transformation.
3. When you click "Take Photo" (or after uploading), it captures/uses the image.
4. After clicking "Transform Image", the image and the style prompt are sent to OpenAI's API.
5. The API processes your image based on the prompt and returns a transformed version.
6. The result is displayed and can be downloaded.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- API: OpenAI API (GPT Image model)

## Notes

- The application requires camera access, so you'll need to grant permission when prompted
- Image transformation may take 5-15 seconds depending on network conditions
- All transformations consume OpenAI API credits, so monitor your usage to control costs
- The transformed images are temporarily stored in the `images/outputs` directory

## Privacy

- Images are processed locally and on OpenAI's servers
- The app does not permanently store your images on any external server beyond the transformation process
- Consider OpenAI's privacy policy regarding how they handle imagery sent to their API

## License

MIT
