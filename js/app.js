document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const cameraElement = document.getElementById('camera');
    const canvasElement = document.getElementById('canvas');
    const capturedImage = document.getElementById('captured-image');
    const resultImage = document.getElementById('result-image');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const transformBtn = document.getElementById('transform-btn');
    const downloadBtn = document.getElementById('download-btn');
    const uploadInput = document.getElementById('upload-input');
    const promptInput = document.getElementById('prompt-input');
    const placeholders = document.querySelectorAll('.placeholder');
    const loadingIndicator = document.getElementById('loading');
    const statusMessageElement = document.getElementById('status-message');
    const styleButtons = document.querySelectorAll('.style-btn');
    const flashElement = document.querySelector('.flash');

    // Image Reel DOM
    const imageReelSection = document.getElementById('image-reel');
    const reelImage = document.getElementById('reel-image');
    const reelType = document.getElementById('reel-type');
    const reelPrev = document.getElementById('reel-prev');
    const reelNext = document.getElementById('reel-next');
    const reelLoading = document.getElementById('reel-loading');
    const reelEmpty = document.getElementById('reel-empty');

    // Get context for canvas
    const context = canvasElement.getContext('2d');

    // Global variables
    let stream = null;
    let currentImageData = null; // Store either captured or uploaded image data

    // Reel state
    let reelImages = [];
    let reelIndex = 0;

    // Polling interval for reel updates during transformation
    let reelPollingInterval = null;

    // Fetch images for the reel
    async function fetchReelImages() {
        try {
            reelLoading.classList.remove('hidden');
            imageReelSection.classList.remove('hidden');
            reelEmpty.classList.add('hidden');
            const res = await fetch('/api/images');
            const data = await res.json();
            reelImages = data.images || [];
            if (reelImages.length === 0) {
                reelImage.src = '';
                reelType.textContent = '';
                reelEmpty.classList.remove('hidden');
                reelLoading.classList.add('hidden');
                return;
            }
            reelIndex = 0;
            renderReelImage();
            reelLoading.classList.add('hidden');
        } catch (err) {
            reelLoading.classList.add('hidden');
            reelEmpty.classList.remove('hidden');
            reelEmpty.textContent = 'Failed to load images.';
        }
    }

    // Render current image in the reel
    function renderReelImage() {
        if (!reelImages.length) {
            reelImage.src = '';
            reelType.textContent = '';
            reelEmpty.classList.remove('hidden');
            return;
        }
        const img = reelImages[reelIndex];
        reelImage.src = img.url;
        reelType.textContent = img.type === 'original' ? 'User Photo' : 'AI Transformed';
        reelEmpty.classList.add('hidden');
    }

    // Navigation handlers
    reelPrev.addEventListener('click', () => {
        if (!reelImages.length) return;
        reelIndex = (reelIndex - 1 + reelImages.length) % reelImages.length;
        renderReelImage();
    });
    reelNext.addEventListener('click', () => {
        if (!reelImages.length) return;
        reelIndex = (reelIndex + 1) % reelImages.length;
        renderReelImage();
    });

    // Optionally, fetch on page load to show reel immediately
    // fetchReelImages();

    // Check if camera access is supported
    function checkCameraSupport() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            displayCameraError('Your browser does not support camera access. Please try a modern browser like Chrome, Firefox, or Edge.');
            return false;
        }
        return true;
    }

    // Display camera error with detailed message
    function displayCameraError(message) {
        console.error('Camera Error:', message);
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'camera-error';
        errorDiv.innerHTML = `
            <div class="error-icon">🎥❌</div>
            <h3>Camera Access Error</h3>
            <p>${message}</p>
            <p>Please ensure:</p>
            <ul>
                <li>Your camera is connected and working</li>
                <li>You've given permission to use the camera</li>
                <li>No other application is using the camera</li>
                <li>You're using a secure connection (HTTPS or localhost)</li>
            </ul>
        `;
        
        // Replace video element with error message
        const cameraContainer = document.querySelector('.camera-container');
        cameraContainer.insertBefore(errorDiv, cameraElement);
        cameraElement.classList.add('hidden'); // Use class
        
        // Disable capture button
        captureBtn.disabled = true;
    }

    // Initialize the application
    function init() {
        if (!checkCameraSupport()) {
            return;
        }
        
        // Set initial canvas size (will be updated when video loads)
        canvasElement.width = 640;
        canvasElement.height = 480;
        
        // Request camera access
        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        })
        .then(videoStream => {
            stream = videoStream;
            cameraElement.srcObject = stream;
            
            // Enable capture button once video is loaded
            cameraElement.onloadedmetadata = () => {
                cameraElement.play()
                    .then(() => {
                        // Update canvas size to match actual video dimensions
                        canvasElement.width = cameraElement.videoWidth;
                        canvasElement.height = cameraElement.videoHeight;
                        captureBtn.disabled = false;
                        console.log('Camera initialized successfully');
                    })
                    .catch(error => {
                        console.error('Error playing video:', error);
                        displayCameraError('Could not start video stream. ' + error.message);
                    });
            };
        })
        .catch(error => {
            console.error('Error accessing camera:', error);
            let errorMessage = 'Unable to access camera.';
            
            // Provide more specific error messages
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Camera permission was denied. Please allow camera access to use this app.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage = 'No camera found. Please connect a camera and refresh the page.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage = 'Camera is in use by another application. Please close other apps using the camera.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Camera constraints not satisfied. Your camera may not support the requested resolution.';
            }
            
            displayCameraError(errorMessage);
        });
    }

    // Initialize app
    init();
    
    // Helper function to add animation classes
    function showElement(element) {
        element.classList.remove('hidden');
        void element.offsetWidth; // Trigger reflow for animation reset
        element.classList.add('visible');
    }
    
    function hideElement(element) {
        element.classList.remove('visible');
        element.classList.add('hidden');
    }
    
    // Trigger camera flash effect
    function triggerFlash() {
        flashElement.classList.add('flash-animation');
        setTimeout(() => {
            flashElement.classList.remove('flash-animation');
        }, 750);
    }
    
    // Capture image from camera
    function captureImage() {
        try {
            // Check if video is ready
            if (!cameraElement.videoWidth) {
                alert('Camera not ready yet. Please wait a moment.');
                return;
            }
            
            // Trigger flash effect
            triggerFlash();
            
            // Draw current video frame onto the canvas
            context.drawImage(cameraElement, 0, 0, canvasElement.width, canvasElement.height);
            
            // Convert canvas to data URL in base64 format
            currentImageData = canvasElement.toDataURL('image/jpeg', 0.9); // Store captured data
            
            // Display captured image
            capturedImage.src = currentImageData;
            showElement(capturedImage);
            
            // Hide placeholder and show retake button
            placeholders[0].classList.add('hidden');
            showElement(retakeBtn);
            hideElement(captureBtn);
            
            // Enable transform button with subtle animation
            transformBtn.disabled = false;
            transformBtn.classList.add('pulse-once');
            setTimeout(() => transformBtn.classList.remove('pulse-once'), 1000);
            
            console.log('Image captured successfully');
            clearStatusMessage(); // Clear any previous messages
        } catch (error) {
            console.error('Error capturing image:', error);
            displayStatusMessage('Failed to capture image. Please try again.');
        }
    }
    
    // Retake photo or clear uploaded image
    function retakePhoto() {
        // Hide captured/uploaded image and reset state
        hideElement(capturedImage);
        capturedImage.src = ''; // Clear src
        placeholders[0].classList.remove('hidden');
        currentImageData = null; // Clear stored image data
        uploadInput.value = ''; // Reset file input
        
        // Show capture button, hide retake button
        showElement(captureBtn);
        hideElement(retakeBtn);
        
        // Disable transform button
        transformBtn.disabled = true;

        // Also hide result and download button if they were visible
        hideElement(resultImage);
        resultImage.src = '';
        placeholders[1].classList.remove('hidden');
        hideElement(downloadBtn);

        clearStatusMessage(); // Clear any status messages
    }

    // Handle image upload
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            
            // Show loading indicator during upload for better UX
            const tempLoadingMsg = document.createElement('div');
            tempLoadingMsg.className = 'status-message';
            tempLoadingMsg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading image...';
            statusMessageElement.parentNode.insertBefore(tempLoadingMsg, statusMessageElement.nextSibling);
            
            reader.onload = (e) => {
                currentImageData = e.target.result; // Store uploaded data
                capturedImage.src = currentImageData;
                
                // Remove temp loading message
                tempLoadingMsg.remove();
                
                // Show uploaded image with animation
                showElement(capturedImage);
                
                // Hide placeholder and show retake/clear button
                placeholders[0].classList.add('hidden');
                showElement(retakeBtn);
                hideElement(captureBtn);
                
                // Enable transform button with animation
                transformBtn.disabled = false;
                transformBtn.classList.add('pulse-once');
                setTimeout(() => transformBtn.classList.remove('pulse-once'), 1000);
                
                console.log('Image uploaded successfully');
                clearStatusMessage();
            };
            
            reader.onerror = (error) => {
                console.error('Error reading file:', error);
                tempLoadingMsg.remove();
                displayStatusMessage('Failed to read the uploaded file.');
            }
            
            reader.readAsDataURL(file);
        }
    }
    
    // Display status messages
    function displayStatusMessage(message, type = 'error') {
        statusMessageElement.innerHTML = type === 'error' ? 
            `<i class="fas fa-exclamation-circle"></i> ${message}` : 
            `<i class="fas fa-check-circle"></i> ${message}`;
        statusMessageElement.className = `status-message ${type}`;
        showElement(statusMessageElement);
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                hideElement(statusMessageElement);
            }, 5000);
        }
    }

    // Clear status messages
    function clearStatusMessage() {
        hideElement(statusMessageElement);
        setTimeout(() => {
            statusMessageElement.textContent = '';
        }, 300); // Wait for animation to finish
    }

    // Transform image using AI
    async function transformImage() {
        if (!currentImageData) {
            displayStatusMessage('Please capture or upload an image first.');
            return;
        }
        
        clearStatusMessage(); // Clear previous messages

        // Start polling the reel during transformation
        if (!reelPollingInterval) {
            reelPollingInterval = setInterval(fetchReelImages, 2000);
        }
        
        try {
            // Show loading indicator with animation
            showElement(loadingIndicator);
            transformBtn.disabled = true;
            retakeBtn.disabled = true; // Disable retake while processing
            promptInput.disabled = true; // Disable prompt input while processing
            
            // Apply subtle pulsing effect to show processing
            document.querySelector('.booth-container').classList.add('processing');
            
            // Get the prompt value
            const userPrompt = promptInput.value.trim();
            
            // Send stored image data and prompt to server
            const response = await fetch('/api/transform', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    image: currentImageData, // Use stored data
                    prompt: userPrompt // Send user's prompt
                }) 
            });

            // Check if the response was not okay (status code outside 200-299)
            if (!response.ok) {
                let errorDetails = `Server error: ${response.status} ${response.statusText}`;
                try {
                    // Try to parse the error response body for more details
                    const errorData = await response.json();
                    if (errorData && errorData.details) {
                        errorDetails = `Server error: ${errorData.details}`; // Use detailed message from server
                    }
                } catch (parseError) {
                    // Ignore error if response body is not valid JSON
                    console.warn('Could not parse error response body:', parseError);
                }
                throw new Error(errorDetails); // Throw error with details
            }

            const result = await response.json();

            // Display transformed image with animation
            resultImage.src = result.transformedImage;
            showElement(resultImage);
            placeholders[1].classList.add('hidden');
            
            // Show download button with animation
            showElement(downloadBtn);
            
            // Show success message
            displayStatusMessage('Transformation complete!', 'success');
            
            // Remove processing effect
            document.querySelector('.booth-container').classList.remove('processing');

            // Fetch and show the updated image reel
            fetchReelImages();
            
        } catch (error) {
            console.error('Error transforming image:', error);
            // Display the specific error message using the status element
            displayStatusMessage(`Transformation failed: ${error.message}. Check console for details.`);
            
            // Re-enable buttons on error (transform button remains disabled until retake/new image)
            // transformBtn.disabled = false; // Keep transform disabled until new image
            retakeBtn.disabled = false;
            promptInput.disabled = false; // Re-enable prompt input
        } finally {
            // Hide loading indicator with animation
            hideElement(loadingIndicator);
            // Re-enable retake and prompt input even on success (transform remains disabled)
            retakeBtn.disabled = false; 
            promptInput.disabled = false;

            // Stop polling the reel after transformation is done
            if (reelPollingInterval) {
                clearInterval(reelPollingInterval);
                reelPollingInterval = null;
                // Do one final fetch to ensure latest images are shown
                fetchReelImages();
            }
        }
    }
    
    // Download transformed image
    function downloadImage() {
        // Visual feedback that download is happening
        downloadBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Downloading...';
        
        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = resultImage.src;
        // Use a more descriptive filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `ai-transformed-photo-${timestamp}.png`; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Reset button after short delay
        setTimeout(() => {
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Image';
            // Show a success message that auto-hides
            displayStatusMessage('Image downloaded successfully!', 'success');
        }, 800);
    }
    
    // Event listeners
    captureBtn.addEventListener('click', captureImage);
    retakeBtn.addEventListener('click', retakePhoto);
    uploadInput.addEventListener('change', handleImageUpload); // Listener for upload
    transformBtn.addEventListener('click', transformImage);
    downloadBtn.addEventListener('click', downloadImage);

    // Add event listeners for style buttons with enhanced UI feedback
    styleButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            styleButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            const promptText = button.getAttribute('data-prompt');
            if (promptText) {
                // Animate the prompt input value change
                promptInput.classList.add('highlight');
                promptInput.value = promptText;
                
                setTimeout(() => {
                    promptInput.classList.remove('highlight');
                }, 700);
                
                // Check if an image is ready before transforming
                if (!transformBtn.disabled) { 
                    transformImage(); // Trigger the transformation
                } else {
                    displayStatusMessage('Please capture or upload an image first.', 'info');
                }
            }
        });
    });
    
    // Add pulse animation to the capture button when the camera is ready
    cameraElement.addEventListener('play', () => {
        if (!captureBtn.disabled) {
            captureBtn.classList.add('pulse-once');
            setTimeout(() => captureBtn.classList.remove('pulse-once'), 1000);
        }
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Space bar to capture/retake
        if (e.code === 'Space' && document.activeElement !== promptInput) {
            e.preventDefault(); // Prevent scrolling with space
            if (!captureBtn.classList.contains('hidden') && !captureBtn.disabled) {
                captureBtn.click();
            } else if (!retakeBtn.classList.contains('hidden')) {
                retakeBtn.click();
            }
        }
        
        // Enter to transform if transform button is enabled
        if (e.code === 'Enter' && document.activeElement !== promptInput && !transformBtn.disabled) {
            transformBtn.click();
        }
    });
});
