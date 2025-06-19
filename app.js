// Basketball Shot Form Analyzer - Main Application Logic

// DOM Elements
const uploadContainer = document.getElementById('upload-container');
const uploadPrompt = document.getElementById('upload-prompt');
const uploadProgress = document.getElementById('upload-progress');
const uploadError = document.getElementById('upload-error');
const errorMessage = document.getElementById('error-message');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.getElementById('progress-text');
const browseBtn = document.getElementById('browse-btn');
const fileInput = document.getElementById('file-input');
const retryBtn = document.getElementById('retry-btn');
const videoContainer = document.getElementById('video-container');
const videoPlayer = document.getElementById('video-player');
const analyzeBtn = document.getElementById('analyze-btn');
const clearBtn = document.getElementById('clear-btn');
const resultsEmpty = document.getElementById('results-empty');
const analyzingSpinner = document.getElementById('analyzing-spinner');
const resultsContent = document.getElementById('results-content');
const visualizationCanvas = document.getElementById('visualization-canvas');
const overallScore = document.getElementById('overall-score');
const scoreDescription = document.getElementById('score-description');
const tipsList = document.getElementById('tips-list');

// Metric Elements
const metrics = {
    elbowAngle: {
        value: document.getElementById('elbow-angle-value'),
        bar: document.getElementById('elbow-angle-bar'),
        feedback: document.getElementById('elbow-angle-feedback')
    },
    releasePoint: {
        value: document.getElementById('release-point-value'),
        bar: document.getElementById('release-point-bar'),
        feedback: document.getElementById('release-point-feedback')
    },
    kneeBend: {
        value: document.getElementById('knee-bend-value'),
        bar: document.getElementById('knee-bend-bar'),
        feedback: document.getElementById('knee-bend-feedback')
    },
    alignment: {
        value: document.getElementById('alignment-value'),
        bar: document.getElementById('alignment-bar'),
        feedback: document.getElementById('alignment-feedback')
    }
};

// Application State
const state = {
    videoFile: null,
    videoUrl: null,
    poseModel: null,
    frameData: [],
    analysisResults: null,
    isAnalyzing: false,
    analysisComplete: false
};

// Initialize the application
async function init() {
    // Set up event listeners
    setupEventListeners();
    
    // Preload PoseNet model in the background
    try {
        console.log('Loading PoseNet model...');
        state.poseModel = await posenet.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            inputResolution: { width: 640, height: 480 },
            multiplier: 0.75
        });
        console.log('PoseNet model loaded successfully');
    } catch (error) {
        console.error('Failed to load PoseNet model:', error);
    }
}

// Set up all event listeners
function setupEventListeners() {
    // File Upload - Drag and Drop
    uploadContainer.addEventListener('dragover', e => {
        e.preventDefault();
        uploadContainer.classList.add('highlight');
    });
    
    uploadContainer.addEventListener('dragleave', e => {
        e.preventDefault();
        uploadContainer.classList.remove('highlight');
    });
    
    uploadContainer.addEventListener('drop', e => {
        e.preventDefault();
        uploadContainer.classList.remove('highlight');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });
    
    // File Upload - Click to Browse
    uploadContainer.addEventListener('click', () => {
        fileInput.click();
    });
    
    browseBtn.addEventListener('click', e => {
        e.stopPropagation();
        fileInput.click();
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFileSelection(fileInput.files[0]);
        }
    });
    
    // Retry Button
    retryBtn.addEventListener('click', () => {
        resetUploadArea();
    });
    
    // Analyze Button
    analyzeBtn.addEventListener('click', startAnalysis);
    
    // Clear Button
    clearBtn.addEventListener('click', clearVideo);
}

// Handle file selection and validation
function handleFileSelection(file) {
    // Reset previous errors
    resetUploadArea();
    
    // Check if a video file is selected
    if (!file.type.startsWith('video/')) {
        showUploadError('Please select a valid video file (MP4, MOV, or WEBM).');
        return;
    }
    
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
        showUploadError('File size exceeds the 50MB limit. Please select a smaller file.');
        return;
    }
    
    // Show upload progress (simulated for this demo)
    showUploadProgress();
    
    // Store file and create object URL
    state.videoFile = file;
    state.videoUrl = URL.createObjectURL(file);
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        updateUploadProgress(progress);
        
        if (progress >= 100) {
            clearInterval(interval);
            finishUpload();
        }
    }, 100);
}

// Show upload progress UI
function showUploadProgress() {
    uploadPrompt.classList.add('hidden');
    uploadError.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading: 0%';
}

// Update upload progress bar
function updateUploadProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `Uploading: ${percent}%`;
}

// Complete the upload process
function finishUpload() {
    // Hide upload container and show video player
    uploadProgress.classList.add('hidden');
    videoContainer.classList.remove('hidden');
    
    // Set video source and load
    videoPlayer.src = state.videoUrl;
    videoPlayer.load();
    videoPlayer.addEventListener('loadedmetadata', () => {
        // If video is too long (over 15 seconds), show warning
        if (videoPlayer.duration > 15) {
            showMessage('Warning: Videos longer than 15 seconds may result in slower analysis.', 'warning');
        }
    });
}

// Show upload error message
function showUploadError(message) {
    uploadPrompt.classList.add('hidden');
    uploadProgress.classList.add('hidden');
    uploadError.classList.remove('hidden');
    errorMessage.textContent = message;
}

// Reset upload area to initial state
function resetUploadArea() {
    uploadPrompt.classList.remove('hidden');
    uploadProgress.classList.add('hidden');
    uploadError.classList.add('hidden');
    uploadContainer.classList.remove('highlight');
    fileInput.value = '';
}

// Clear video and reset the form
function clearVideo() {
    // Revoke object URL to free memory
    if (state.videoUrl) {
        URL.revokeObjectURL(state.videoUrl);
    }
    
    // Reset state
    state.videoFile = null;
    state.videoUrl = null;
    state.frameData = [];
    state.analysisResults = null;
    state.analysisComplete = false;
    
    // Reset UI
    videoContainer.classList.add('hidden');
    videoPlayer.src = '';
    resetUploadArea();
    
    // Reset results
    resultsEmpty.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    analyzingSpinner.classList.add('hidden');
}

// Start the shot analysis process
async function startAnalysis() {
    if (state.isAnalyzing) return;
    
    if (!state.videoFile || !state.videoUrl) {
        showMessage('Please upload a video before analyzing.', 'error');
        return;
    }
    
    if (!state.poseModel) {
        showMessage('PoseNet model is still loading. Please try again in a few seconds.', 'error');
        return;
    }
    
    state.isAnalyzing = true;
    state.frameData = [];
    
    // Update UI
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    resultsEmpty.classList.add('hidden');
    analyzingSpinner.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    
    try {
        // Extract frames from video
        await extractFrames();
        
        // Analyze pose data
        const results = analyzeShootingForm();
        
        // Display results
        displayResults(results);
        
        state.analysisComplete = true;
    } catch (error) {
        console.error('Error during analysis:', error);
        showMessage('An error occurred during analysis. Please try again.', 'error');
        
        // Reset UI
        resultsEmpty.classList.remove('hidden');
        analyzingSpinner.classList.add('hidden');
    } finally {
        state.isAnalyzing = false;
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Shot';
    }
}

// Extract frames from the video for analysis
async function extractFrames() {
    return new Promise((resolve, reject) => {
        try {
            const video = videoPlayer;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Reset video to beginning
            video.currentTime = 0;
            
            // Sample frames at regular intervals
            const frameSampleRate = 6; // Frames per second to sample
            const frameDuration = 1 / frameSampleRate;
            let currentTime = 0;
            
            video.addEventListener('seeked', async function frameExtractor() {
                // Draw current frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Process frame with PoseNet
                try {
                    const pose = await state.poseModel.estimateSinglePose(canvas, {
                        flipHorizontal: false
                    });
                    
                    // Store frame data with timestamp
                    state.frameData.push({
                        time: currentTime,
                        pose: pose
                    });
                    
                    // Update progress in UI
                    const progressPercent = Math.min(100, Math.round((currentTime / video.duration) * 100));
                    progressText.textContent = `Analyzing: ${progressPercent}%`;
                    
                    // Move to next frame or complete
                    currentTime += frameDuration;
                    if (currentTime < video.duration) {
                        video.currentTime = currentTime;
                    } else {
                        // We're done extracting frames
                        video.removeEventListener('seeked', frameExtractor);
                        resolve();
                    }
                } catch (error) {
                    video.removeEventListener('seeked', frameExtractor);
                    reject(error);
                }
            });
            
            // Start the process
            video.currentTime = currentTime;
        } catch (error) {
            reject(error);
        }
    });
}

// Analyze the shooting form based on collected frame data
function analyzeShootingForm() {
    if (state.frameData.length === 0) {
        throw new Error('No frame data available for analysis');
    }
    
    // Initialize metrics
    const results = {
        elbowAngle: {
            value: 0,
            score: 0,
            feedback: ''
        },
        releasePoint: {
            value: 0,
            score: 0,
            feedback: ''
        },
        kneeBend: {
            value: 0,
            score: 0,
            feedback: ''
        },
        alignment: {
            value: 0,
            score: 0,
            feedback: ''
        },
        overallScore: 0,
        tips: []
    };
    
    // Calculate elbow angle (from shooting arm)
    results.elbowAngle = analyzeElbowAngle();
    
    // Calculate release point timing
    results.releasePoint = analyzeReleasePoint();
    
    // Calculate knee bend
    results.kneeBend = analyzeKneeBend();
    
    // Calculate body alignment
    results.alignment = analyzeAlignment();
    
    // Calculate overall score (weighted average)
    results.overallScore = Math.round(
        (results.elbowAngle.score * 0.3) +
        (results.releasePoint.score * 0.3) +
        (results.kneeBend.score * 0.2) +
        (results.alignment.score * 0.2)
    );
    
    // Generate personalized tips
    results.tips = generateTips(results);
    
    // Store results in state
    state.analysisResults = results;
    
    return results;
}

// Analyze elbow angle of shooting arm
function analyzeElbowAngle() {
    // In a real implementation, this would use the shoulder, elbow, and wrist keypoints
    // to calculate the actual angle. For this demo, we'll simulate the analysis.
    
    // Simulated result (random value for demo purposes)
    const angle = Math.floor(70 + Math.random() * 40); // Between 70 and 110 degrees
    
    // Score based on how close to 90 degrees (ideal elbow angle)
    const score = Math.max(0, 100 - Math.abs(angle - 90) * 2.5);
    
    // Generate feedback
    let feedback;
    if (angle < 80) {
        feedback = 'Your elbow angle is too acute. Try to maintain a 90° angle for better shooting mechanics.';
    } else if (angle > 100) {
        feedback = 'Your elbow angle is too obtuse. Bend your elbow closer to 90° for optimal shooting form.';
    } else {
        feedback = 'Good elbow angle! You\'re maintaining close to the ideal 90° bend.';
    }
    
    return { value: angle, score, feedback };
}

// Analyze release point timing
function analyzeReleasePoint() {
    // In a real implementation, this would track the ball release point relative to the jump apex
    // For this demo, we'll simulate the analysis
    
    // Simulated result - percentage timing relative to ideal (0-100)
    const timing = Math.floor(50 + Math.random() * 50); // Between 50-100%
    
    // Score based on timing
    const score = timing;
    
    // Generate feedback
    let feedback;
    if (timing < 70) {
        feedback = 'You\'re releasing the ball too early. Try to release at the peak of your jump for better accuracy.';
    } else if (timing < 85) {
        feedback = 'Your release timing is good, but could be slightly improved by releasing closer to the apex of your jump.';
    } else {
        feedback = 'Excellent release timing! You\'re releasing the ball at the optimal point in your shooting motion.';
    }
    
    return { value: timing, score, feedback };
}

// Analyze knee bend
function analyzeKneeBend() {
    // In a real implementation, this would analyze the angle of knee flexion
    // For this demo, we'll simulate the analysis
    
    // Simulated result - percentage of ideal knee bend (0-100)
    const bend = Math.floor(60 + Math.random() * 40); // Between 60-100%
    
    // Score based on bend percentage
    const score = bend;
    
    // Generate feedback
    let feedback;
    if (bend < 75) {
        feedback = 'Your knee bend is insufficient. Deeper knee bend provides more power for your shot.';
    } else if (bend < 90) {
        feedback = 'Good knee bend, but you could benefit from slightly more flexion for optimal power transfer.';
    } else {
        feedback = 'Excellent knee bend! You\'re getting great power from your legs into your shot.';
    }
    
    return { value: bend, score, feedback };
}

// Analyze body alignment
function analyzeAlignment() {
    // In a real implementation, this would analyze vertical alignment of body parts
    // For this demo, we'll simulate the analysis
    
    // Simulated result - percentage of ideal alignment (0-100)
    const alignment = Math.floor(70 + Math.random() * 30); // Between 70-100%
    
    // Score based on alignment percentage
    const score = alignment;
    
    // Generate feedback
    let feedback;
    if (alignment < 80) {
        feedback = 'Your body alignment could be improved. Try to keep your shoulders, hips, and feet aligned vertically.';
    } else if (alignment < 90) {
        feedback = 'Good alignment, with minor improvements possible in your vertical stack position.';
    } else {
        feedback = 'Excellent body alignment! Your vertical stacking is providing great stability for your shot.';
    }
    
    return { value: alignment, score, feedback };
}

// Generate personalized tips based on analysis results
function generateTips(results) {
    const tips = [];
    
    // Add tips based on the lowest scores
    const metrics = [
        { name: 'elbowAngle', label: 'Elbow Angle', threshold: 80 },
        { name: 'releasePoint', label: 'Release Timing', threshold: 80 },
        { name: 'kneeBend', label: 'Knee Bend', threshold: 80 },
        { name: 'alignment', label: 'Body Alignment', threshold: 80 }
    ];
    
    // Sort metrics by score (lowest first)
    metrics.sort((a, b) => results[a.name].score - results[b.name].score);
    
    // Add specific tips based on the 2 lowest scoring areas
    for (let i = 0; i < Math.min(2, metrics.length); i++) {
        const metric = metrics[i];
        if (results[metric.name].score < metric.threshold) {
            tips.push(results[metric.name].feedback);
        }
    }
    
    // Add general tips
    if (results.overallScore < 70) {
        tips.push('Consider recording your shot from multiple angles to identify additional areas for improvement.');
        tips.push('Focus on consistent repetition of proper mechanics to build muscle memory.');
    } else if (results.overallScore < 85) {
        tips.push('Your shot mechanics are solid. Focus on consistency and minor refinements.');
    } else {
        tips.push('You have excellent shooting mechanics! Continue to maintain this form.');
    }
    
    // Ensure we have at least 3 tips
    if (tips.length < 3) {
        tips.push('Remember to follow through with your shot, holding your form until the ball reaches the basket.');
    }
    
    return tips;
}

// Display analysis results in the UI
function displayResults(results) {
    // Hide spinner and show results content
    analyzingSpinner.classList.add('hidden');
    resultsContent.classList.remove('hidden');
    
    // Draw visualization on canvas
    drawVisualization(state.frameData);
    
    // Update overall score
    overallScore.textContent = `${results.overallScore}%`;
    updateScoreStyle(overallScore, results.overallScore);
    
    // Update score description
    if (results.overallScore >= 90) {
        scoreDescription.textContent = 'Excellent form! Professional quality shooting mechanics.';
    } else if (results.overallScore >= 80) {
        scoreDescription.textContent = 'Very good form. Minor adjustments can perfect your technique.';
    } else if (results.overallScore >= 70) {
        scoreDescription.textContent = 'Good form with some areas for improvement.';
    } else {
        scoreDescription.textContent = 'Your form needs work. Focus on the suggested improvements.';
    }
    
    // Update individual metrics
    updateMetricDisplay('elbowAngle', results.elbowAngle, '°');
    updateMetricDisplay('releasePoint', results.releasePoint, '%');
    updateMetricDisplay('kneeBend', results.kneeBend, '%');
    updateMetricDisplay('alignment', results.alignment, '%');
    
    // Update tips
    tipsList.innerHTML = '';
    results.tips.forEach(tip => {
        const li = document.createElement('li');
        li.textContent = tip;
        li.classList.add('fade-in');
        tipsList.appendChild(li);
    });
}

// Update display for an individual metric
function updateMetricDisplay(metricName, metricData, unit) {
    const metric = metrics[metricName];
    
    // Update value
    metric.value.textContent = `${metricData.value}${unit}`;
    updateScoreStyle(metric.value, metricData.score);
    
    // Update progress bar
    metric.bar.style.width = `${metricData.score}%`;
    updateBarStyle(metric.bar, metricData.score);
    
    // Update feedback text
    metric.feedback.textContent = metricData.feedback;
}

// Update text color based on score
function updateScoreStyle(element, score) {
    // Remove all previous score classes
    element.classList.remove('score-excellent', 'score-good', 'score-average', 'score-poor');
    
    // Add appropriate class based on score
    if (score >= 90) {
        element.classList.add('score-excellent');
    } else if (score >= 75) {
        element.classList.add('score-good');
    } else if (score >= 60) {
        element.classList.add('score-average');
    } else {
        element.classList.add('score-poor');
    }
}

// Update progress bar color based on score
function updateBarStyle(element, score) {
    // Remove all previous bar classes
    element.classList.remove('bar-excellent', 'bar-good', 'bar-average', 'bar-poor');
    
    // Add appropriate class based on score
    if (score >= 90) {
        element.classList.add('bar-excellent');
    } else if (score >= 75) {
        element.classList.add('bar-good');
    } else if (score >= 60) {
        element.classList.add('bar-average');
    } else {
        element.classList.add('bar-poor');
    }
}

// Draw pose visualization on canvas
function drawVisualization(frameData) {
    if (!frameData || frameData.length === 0) return;
    
    const canvas = visualizationCanvas;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Find frame with highest confidence (usually the clearest pose)
    let bestFrame = frameData[0];
    frameData.forEach(frame => {
        if (frame.pose.score > bestFrame.pose.score) {
            bestFrame = frame;
        }
    });
    
    const pose = bestFrame.pose;
    
    // Scale pose to fit canvas
    const scaleX = canvas.width * 0.8;
    const scaleY = canvas.height * 0.8;
    const offsetX = canvas.width * 0.1;
    const offsetY = canvas.height * 0.1;
    
    // Draw connections between keypoints
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    
    // Define skeleton connections (pairs of keypoints)
    const skeleton = [
        ['leftShoulder', 'leftElbow'],
        ['leftElbow', 'leftWrist'],
        ['rightShoulder', 'rightElbow'],
        ['rightElbow', 'rightWrist'],
        ['leftShoulder', 'rightShoulder'],
        ['leftShoulder', 'leftHip'],
        ['rightShoulder', 'rightHip'],
        ['leftHip', 'rightHip'],
        ['leftHip', 'leftKnee'],
        ['leftKnee', 'leftAnkle'],
        ['rightHip', 'rightKnee'],
        ['rightKnee', 'rightAnkle']
    ];
    
    // Draw skeleton
    skeleton.forEach(([p1Name, p2Name]) => {
        const p1 = pose.keypoints.find(kp => kp.part === p1Name);
        const p2 = pose.keypoints.find(kp => kp.part === p2Name);
        
        if (p1 && p2 && p1.score > 0.5 && p2.score > 0.5) {
            ctx.beginPath();
            ctx.moveTo(p1.position.x * scaleX / 640 + offsetX, p1.position.y * scaleY / 480 + offsetY);
            ctx.lineTo(p2.position.x * scaleX / 640 + offsetX, p2.position.y * scaleY / 480 + offsetY);
            ctx.stroke();
        }
    });
    
    // Draw keypoints
    pose.keypoints.forEach(keypoint => {
        if (keypoint.score > 0.5) {
            ctx.fillStyle = keypoint.part.includes('Wrist') || keypoint.part.includes('Ankle') ? 
                '#f59e0b' : '#2563eb';
                
            ctx.beginPath();
            ctx.arc(
                keypoint.position.x * scaleX / 640 + offsetX, 
                keypoint.position.y * scaleY / 480 + offsetY, 
                5, 0, 2 * Math.PI
            );
            ctx.fill();
        }
    });
    
    // Add labels for key joints
    ctx.fillStyle = '#1f2937';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    const importantJoints = ['leftShoulder', 'leftElbow', 'leftWrist', 'rightShoulder', 'rightElbow', 'rightWrist'];
    importantJoints.forEach(jointName => {
        const joint = pose.keypoints.find(kp => kp.part === jointName);
        if (joint && joint.score > 0.5) {
            const x = joint.position.x * scaleX / 640 + offsetX;
            const y = joint.position.y * scaleY / 480 + offsetY - 10;
            ctx.fillText(jointName.replace('left', 'L').replace('right', 'R'), x, y);
        }
    });
}

// Show a message to the user
function showMessage(text, type = 'info') {
    // Create message element if it doesn't exist
    let messageEl = document.querySelector('.message-popup');
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.className = 'message-popup fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        document.body.appendChild(messageEl);
    }
    
    // Set message style based on type
    switch (type) {
        case 'error':
            messageEl.className = messageEl.className.replace(/bg-\w+-\d+/g, '') + ' bg-red-500 text-white';
            break;
        case 'warning':
            messageEl.className = messageEl.className.replace(/bg-\w+-\d+/g, '') + ' bg-yellow-500 text-white';
            break;
        case 'success':
            messageEl.className = messageEl.className.replace(/bg-\w+-\d+/g, '') + ' bg-green-500 text-white';
            break;
        default:
            messageEl.className = messageEl.className.replace(/bg-\w+-\d+/g, '') + ' bg-blue-500 text-white';
    }
    
    // Set message text
    messageEl.textContent = text;
    
    // Show the message
    messageEl.style.opacity = '1';
    
    // Hide after 4 seconds
    setTimeout(() => {
        messageEl.style.opacity = '0';
        setTimeout(() => {
            messageEl.remove();
        }, 300);
    }, 4000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);