const upload = document.getElementById('uploadRoom');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const sofaInfo = document.getElementById('sofaInfo');
const roomDetails = document.getElementById('roomDetails');
const changeSofaBtn = document.querySelector('button:nth-child(2)');
const roomTypeSelect = document.getElementById('roomType');
const sofaStyleSelect = document.getElementById('sofaStyle');
const initialRoomType = document.getElementById('roomType').value.toLowerCase().replace(' ', ''); // Get initial value

let sofaImage = new Image();
sofaImage.src = "/static/sofa1.png"; // default
let roomScale = { x: 1, y: 1 };
let backgroundImage = null;
let originalImageDataURL = null;
let sofaRotationDeg = 0;
let room = {
    width: 0,
    length: 0,
    height: 0,
    type: initialRoomType // Initialize with the value from the hidden input
};
let sofa = {
    realWidth: 1.8,
    realHeight: 1.0,
    realX: 0.0,
    realY: 0.0,
    pixelX: 0,
    pixelY: 0,
    pixelWidth: 0,
    pixelHeight: 0,
    dragging: false,
    offsetX: 0,
    offsetY: 0
};

// ... (rest of your JavaScript code) ...

async function applyRoomDimensions() {
    try {
        // 1. Read user input for room length and width (in meters)
        const lengthInput = document.getElementById('lengthInput').value;
        const widthInput = document.getElementById('widthInput').value;
        roomLength = parseFloat(lengthInput);
        roomWidth = parseFloat(widthInput);

        if (isNaN(roomLength) || isNaN(roomWidth)) {
            alert('Please enter valid room dimensions!');
            return;
        }

        // 2. Predict room height from uploaded room image
        const predictedHeight = await predictRoomHeight();
        console.log('Predicted Room Height:', predictedHeight);
        roomHeight = predictedHeight; // Save globally if needed

        // 3. Setup scaling: meters -> canvas pixels
        const canvasLength = canvas.width;
        const canvasHeight = canvas.height;

        roomScale.x = canvasLength / roomWidth;   // pixels per meter (X-axis)
        roomScale.y = canvasHeight / roomLength;  // pixels per meter (Y-axis)

        console.log('xScale:', roomScale.x, 'yScale:', roomScale.y);

        // Initialize real-world position at the intersection of two walls and floor (0, 0)
        sofa.realX = 0;
        sofa.realY = 0;

        // Calculate pixel position for the bottom-left of the sofa at the bottom-left origin
        sofa.pixelX = sofa.realX * roomScale.x;
        sofa.pixelY = canvas.height - sofa.pixelHeight;

        // Update sofa pixel dimensions based on scaling
        sofa.pixelWidth = sofa.realWidth * roomScale.x;
        sofa.pixelHeight = sofa.realHeight * roomScale.y;

        // 6. Enable dragging and resizing now that scaling is correct
        // enableSofaInteraction();

        // 7. Activate "Change Sofa" or other buttons now
        document.getElementById('changeSofaBtn').disabled = false;
        document.getElementById('applyRoomBtn').disabled = true;

        alert('Room setup complete! Drag or resize the sofa now.');

        redrawCanvas(); // Always redraw after positioning things

    } catch (error) {
        console.error('Error applying room dimensions:', error);
        alert('Something went wrong while setting up the room.');
    }

}
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0);
    ctx.drawImage(sofaImage, sofa.pixelX, sofa.pixelY, sofa.pixelWidth, sofa.pixelHeight);
    drawHandles();
    updateSofaInfo();
    updateRoomInfo();
    updateRemainingAreaAndSuggestions();
}
async function predictRoomHeight() {
    const formData = new FormData();
    formData.append('file', uploadedImageFile); // your uploaded image file

    const response = await fetch('/predict_height', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Height prediction failed');
    }

    const data = await response.json();
    return data.height; // Assuming Flask returns { height: value }
}


// Ensure updateStyleOptions is called when the room type dropdown changes
roomTypeSelect.addEventListener('change', () => {
    room.type = roomTypeSelect.value.toLowerCase().replace(' ', '');
    updateStyleOptions();
    generateFurnitureSuggestions(); // Re-generate suggestions on room type change
});

// Call updateStyleOptions initially to load styles based on the initial room type
updateStyleOptions();
generateFurnitureSuggestions(); // Generate initial suggestions

// ... (rest of your JavaScript code) ...
function estimateHeight(width, length) {
    const area = width * length;

    if (area < 10) return 2.4;
    if (area < 20) return 2.6;
    if (area < 30) return 2.8;
    if (area < 50) return 3.0;
    return 3.2;
}

const height = estimateHeight(room.width, room.length);


// script.js (modified sections)

// ... your existing variable declarations ...

// script.js (revised sections)

// ... your existing variable declarations ...

function updateStyleOptions() {
    const roomTypeSelect = document.getElementById('roomType');
    const sofaStyleSelect = document.getElementById('sofaStyle');
    sofaStyleSelect.innerHTML = ''; // Clear existing options
    const selectedRoomType = roomTypeSelect.value.toLowerCase().replace(' ', '');
    let styles = [];

    // Define an object to map room types to style arrays
    const styleOptions = {
        'living oom':    ['Modern', 'Minimalist', 'Scandinavian', 'Traditional', 'Mid-Century', 'Rustic'],
        'hall':      ['Modern', 'Minimalist', 'Scandinavian', 'Traditional', 'Mid-Century', 'Rustic'],
        'studyroom':     ['Modern', 'Minimalist', 'Traditional', 'Mid-Century', 'Industrial'],
        'dining':    ['Modern', 'Minimalist', 'Scandinavian', 'Traditional', 'Rustic', 'Formal'],
        'bedroom':   ['Modern', 'Minimalist', 'Scandinavian', 'Traditional', 'Bohemian', 'Coastal'],
        'kidsroom':      ['Tent bed', 'Wood Storage', 'Playful', 'Colorful'],
        'default':   ['Modern', 'Minimalist', 'Scandinavian', 'Traditional', 'Mid-Century', 'Rustic'] // Added a default
    };

    // Select styles based on room type, with a fallback
    styles = styleOptions[selectedRoomType] || styleOptions['default'];

    styles.forEach((style, index) => {
        const option = document.createElement('option');
        option.value = index + 1; // Keep numerical values for consistency
        option.textContent = style;
        sofaStyleSelect.appendChild(option);
    });

    // Call changeSofa immediately to load the initial style
    changeSofa();
}

function changeSofa() {
    const sofaStyleSelect = document.getElementById('sofaStyle');
    const selectedStyleIndex = parseInt(sofaStyleSelect.value);
    const roomType = document.getElementById('roomType').value.toLowerCase().replace(' ', '');
    let imagePath = '';
    let prefix = 'sofa'; // Default
    let imageNumber = selectedStyleIndex;

    switch (roomType) {
        case 'living':
        case 'livingroom':
            prefix = 'l';
            break;
        case 'hall':
            prefix = 'sofa';
            break;
        case 'study':
        case 'studyroom':
            prefix = 's';
            break;
        case 'dining':
        case 'diningroom':
            prefix = 'd';
            break;
        case 'bedroom':
            prefix = 'b';
            break;
        case 'kids':
        case 'kidsroom':
            prefix = 'k';
            break;
    }


    // ASSUMPTION: Study room images are named s1.png, s2.png, etc.
    let fileExtension = '.png';
    if (roomType === 'kids') {
        fileExtension = '.jpg'; // Assuming kids room is .jpg
    }

    imagePath = `/static/${prefix}${imageNumber}${fileExtension}`;

    console.log(`Attempting to load sofa image from: ${imagePath}`);
    sofaImage.src = imagePath;
    sofaImage.onload = redrawCanvas;
    sofaImage.onerror = () => {
        console.error(`Error loading image from: ${imagePath}`);
        alert(`Error loading sofa style ${selectedStyleIndex} for ${roomType}. Please check the image path.`);
        sofaImage.src = "/static/sofa1.png"; // Fallback
        sofaImage.onload = redrawCanvas;
    };
}

// Attach the updateStyleOptions function to the change event of the room type dropdown
document.getElementById('roomType').addEventListener('change', updateStyleOptions);

// Call updateStyleOptions initially
updateStyleOptions();

// ... your other functions ...
function applyRoomDimensions() {
    const type = document.getElementById('roomType').value;
    const width = parseFloat(document.getElementById('roomWidth').value);
    const length = parseFloat(document.getElementById('roomLength').value);

    if (!width || !length) {
        alert("Enter valid width and length.");
        return;
    }

    const height = estimateHeight(room.width, room.length);
    room = { width, length, height, type };

    // Set initial real-world position to bottom-left (0, 0)
    sofa.realX = 0;
    sofa.realY = 0;

    if (type === 'hall') {
        sofa.realWidth = 2.2;
        sofa.realHeight = 1.1;
    } else if (type === 'dining') {
        sofa.realWidth = 1.8;
        sofa.realHeight = 1.0;
    } else if (type === 'bedroom') {
        sofa.realWidth = 1.5;
        sofa.realHeight = 0.9;
    }

    if (backgroundImage) {
        roomScale.x = canvas.width / width;
        roomScale.y = canvas.height / length;
        const adjustedHeight = sofa.realHeight * (room.height / 2.7);
        sofa.pixelX = sofa.realX * roomScale.x;
        // Place the bottom of the sofa at the bottom of the canvas
        sofa.pixelY = canvas.height - (sofa.realY + sofa.realHeight) * roomScale.y;
        sofa.pixelWidth = sofa.realWidth * roomScale.x;
        sofa.pixelHeight = adjustedHeight * roomScale.y;
    } else {
        canvas.width = 600;
        canvas.height = 400;
        roomScale.x = canvas.width / width;
        roomScale.y = canvas.height / length;
        // Place the bottom of the sofa at the bottom of the canvas
        sofa.pixelX = sofa.realX * roomScale.x;
        sofa.pixelY = canvas.height - sofa.realHeight * roomScale.y;
        sofa.pixelWidth = sofa.realWidth * roomScale.x;
        sofa.pixelHeight = sofa.realHeight * roomScale.y;
    }

    draw();
    updateSofaInfo(); 
    updateRoomInfo();
    generateFurnitureSuggestions(); // Call it here!!!
}

upload.addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = function(event) {
        backgroundImage = new Image();
        backgroundImage.onload = () => {
            canvas.width = backgroundImage.width;
            canvas.height = backgroundImage.height;
            originalImageDataURL = event.target.result;
            draw();
            if (room.width && room.length) {
                roomScale.x = canvas.width / room.width;
                roomScale.y = canvas.height / room.length;
                applyRoomDimensions();
            }
        };
        backgroundImage.src = event.target.result;
    };
    reader.readAsDataURL(e.target.files[0]);
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0);
    ctx.drawImage(sofaImage, sofa.pixelX, sofa.pixelY, sofa.pixelWidth, sofa.pixelHeight);
    drawHandles();
}

function drawHandles() {
    ctx.fillStyle = "blue";
    const size = 10;
    const handleX = sofa.pixelX + sofa.pixelWidth - size / 2;
    const handleY = sofa.pixelY + sofa.pixelHeight - size / 2;
    ctx.fillRect(handleX, handleY, size, size);
}

function updateSofaInfo() {
    const realX = (sofa.pixelX / roomScale.x).toFixed(2);
    // Calculate realY relative to the bottom origin
    const realY = ((canvas.height - sofa.pixelY - sofa.pixelHeight) / roomScale.y).toFixed(2);
    const realW = (sofa.pixelWidth / roomScale.x).toFixed(2);
    const realH = (sofa.pixelHeight / roomScale.y).toFixed(2);
    sofaInfo.textContent = `📐 Furniture Position: (${realX}m, ${realY}m), Size: ${realW}m x ${realH}m`;
}

function updateRoomInfo() {
    roomDetails.textContent = `🏠 Room Type: ${room.type}, Width: ${room.width}m, Length: ${room.length}m, Estimated Height: ${room.height}m`;
}

// function changeSofa() {
//     const sofaId = document.getElementById('sofaStyle').value;
//     sofaImage.src = `/static/sofa${sofaId}.png`;
//     sofaImage.onload = draw;
// }
// let currentRotation = 0;
// let rotationInterval = null;

// Apply rotation to the sofa image
function applyRotation() {
    sofaImage.style.transform = `rotateY(${currentRotation}deg)`;
    sofaImage.style.transition = 'transform 0.2s linear';
}

// Rotate gradually
function rotateSofa(direction) {
    clearInterval(rotationInterval);
    rotationInterval = setInterval(() => {
        if (direction === 'left') {
            currentRotation -= 2;
        } else {
            currentRotation += 2;
        }
        applyRotation();
    }, 30); // Slow and smooth
}


// Stop rotating on mouse up or after a short time
document.addEventListener('mouseup', () => {
    clearInterval(rotationInterval);
});

function paintWall() {
    if (!originalImageDataURL) {
        alert("Please upload a room image first.");
        return;
    }
    const selectedColor = document.getElementById('wallColor').value;

    fetch(originalImageDataURL)
        .then(res => res.blob())
        .then(blob => {
            const formData = new FormData();
            formData.append('image', blob, 'original_room_image.png');
            formData.append('color', selectedColor);

            fetch('/paint_wall', {
                method: 'POST',
                body: formData
            })
            .then(response => response.blob())
            .then(imageBlob => {
                const imageUrl = URL.createObjectURL(imageBlob);
                backgroundImage.src = imageUrl;
                backgroundImage.onload = () => {
                    canvas.width = backgroundImage.width;
                    canvas.height = backgroundImage.height;
                    draw();
                };
            })
            .catch(error => {
                console.error('Error painting wall:', error);
                alert('Failed to paint wall.');
            });
        });
}




// --- Sofa Drag and Resize Events ---
let isDraggingHandle = false;

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const size = 10;
    const handleX = sofa.pixelX + sofa.pixelWidth - size / 2;
    const handleY = sofa.pixelY + sofa.pixelHeight - size / 2;

    if (
        mouseX >= handleX && mouseX <= handleX + size &&
        mouseY >= handleY && mouseY <= handleY + size
    ) {
        isDraggingHandle = true;
    } else if (
        mouseX > sofa.pixelX &&
        mouseX < sofa.pixelX + sofa.pixelWidth &&
        mouseY > sofa.pixelY &&
        mouseY < sofa.pixelY + sofa.pixelHeight
    ) {
        sofa.dragging = true;
        sofa.offsetX = mouseX - sofa.pixelX;
        sofa.offsetY = mouseY - sofa.pixelY;
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const size = 10;
    const handleX = sofa.pixelX + sofa.pixelWidth - size / 2;
    const handleY = sofa.pixelY + sofa.pixelHeight - size / 2;

    // Cursor feedback
    if (
        mouseX >= handleX && mouseX <= handleX + size &&
        mouseY >= handleY && mouseY <= handleY + size
    ) {
        canvas.style.cursor = 'nwse-resize';
    } else if (
        mouseX > sofa.pixelX &&
        mouseX < sofa.pixelX + sofa.pixelWidth &&
        mouseY > sofa.pixelY &&
        mouseY < sofa.pixelY + sofa.pixelHeight
    ) {
        canvas.style.cursor = 'move';
    } else {
        canvas.style.cursor = 'default';
    }

    if (sofa.dragging) {
        sofa.pixelX = mouseX - sofa.offsetX;
        sofa.pixelY = mouseY - sofa.offsetY;
        redrawCanvas();
        updateSofaInfo();
        update2DLayout();  // <-- ADD HERE
    } else if (isDraggingHandle) {
        sofa.pixelWidth = Math.max(20, mouseX - sofa.pixelX);
        sofa.pixelHeight = Math.max(20, mouseY - sofa.pixelY);
        redrawCanvas();
        updateSofaInfo();
        update2DLayout();  // <-- AND HERE
    }
    
});

canvas.addEventListener('mouseup', () => {
    sofa.dragging = false;
    isDraggingHandle = false;
});

canvas.addEventListener('mouseleave', () => {
    sofa.dragging = false;
    isDraggingHandle = false;
});
// This will keep the suggestions updated when the sofa is moved or resized


function generateFurnitureSuggestions() {
    if (!room.width || !room.length || !sofa.realWidth || !sofa.realHeight) return;

    // Total room area in m²
    const totalArea = room.width * room.length;

    // Sofa's area in m²
    const sofaArea = sofa.realWidth * sofa.realHeight;

    // Remaining area
    let remainingArea = totalArea - sofaArea;
    if (remainingArea <= 0) {
        document.getElementById('furnitureSuggestions').innerHTML =
            '<li>No space left after sofa placement.</li>';
        return;
    }

    const roomType = room.type;
    let furnitureCatalog = [];

    if (roomType === 'hall') {
        furnitureCatalog = [
            { name: 'TV Unit', width: 1.5, height: 0.4 },
            { name: 'Coffee Table', width: 1.0, height: 0.8 },
            { name: 'Bookshelf', width: 0.8, height: 0.3 },
            { name: 'Accent Chair', width: 0.8, height: 0.8 },
            { name: 'Side Table', width: 0.5, height: 0.5 },
            { name: 'Bean Bag', width: 0.7, height: 0.7 }
        ];
    } else if (roomType === 'diningroom') {
        furnitureCatalog = [
            { name: 'Sideboard', width: 1.5, height: 0.5 },
            { name: 'Cabinet', width: 1.2, height: 0.5 },
            { name: 'Bar Cart', width: 0.8, height: 0.4 },
            { name: 'Console Table', width: 1.2, height: 0.4 },
            { name: 'Storage Shelf', width: 1.0, height: 0.3 }
        ];
    } else if (roomType === 'bedroom') {
        furnitureCatalog = [
            { name: 'Wardrobe', width: 1.5, height: 0.6 },
            { name: 'Nightstand', width: 0.6, height: 0.4 },
            { name: 'Desk', width: 1.2, height: 0.6 },
            { name: 'Chair', width: 0.5, height: 0.5 },
            { name: 'Bookshelf', width: 0.8, height: 0.3 },
            { name: 'Dresser', width: 1.2, height: 0.5 }
        ];
    }

    // Sort from smallest area to largest
    furnitureCatalog.sort((a, b) => (a.width * a.height) - (b.width * b.height));

    const suggestions = [];

    for (let item of furnitureCatalog) {
        const itemArea = item.width * item.height;
        const count = Math.floor(remainingArea / itemArea);
        if (count > 0) {
            suggestions.push({
                name: item.name,
                width: item.width,
                height: item.height,
                count: count
            });
            remainingArea -= count * itemArea;
        }
    }

    const suggestionList = document.getElementById('furnitureSuggestions');
    suggestionList.innerHTML = '';

    if (suggestions.length === 0) {
        suggestionList.innerHTML = '<li>No other furniture fits in the remaining space.</li>';
    } else {
        suggestions.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.name} - ${item.count} × ${item.width}m x ${item.height}m`;
            suggestionList.appendChild(li);
        });
    }
}
// ... (keep your existing variable declarations here)

// Modify this function to include positions for suggested furniture
function generateFurnitureSuggestions() {
    if (!room.width || !room.length || !sofa.realWidth || !sofa.realHeight) return;

    // Total room area in m²
    const totalArea = room.width * room.length;

    // Sofa's area in m²
    const sofaArea = sofa.realWidth * sofa.realHeight;

    // Remaining area
    let remainingArea = totalArea - sofaArea;
    if (remainingArea <= 0) {
        document.getElementById('furnitureSuggestions').innerHTML =
            '<li>No space left after sofa placement.</li>';
        return;
    }

    const roomType = room.type;
    let furnitureCatalog = [];

    // Suggesting furniture based on room type
    if (roomType === 'hall') {
        furnitureCatalog = [
            { name: 'TV Unit', width: 1.5, height: 0.4 },
            { name: 'Coffee Table', width: 1.0, height: 0.8 },
            { name: 'Bookshelf', width: 0.8, height: 0.3 },
            { name: 'Accent Chair', width: 0.8, height: 0.8 },
            { name: 'Side Table', width: 0.5, height: 0.5 },
            { name: 'Bean Bag', width: 0.7, height: 0.7 }
        ];
    } else if (roomType === 'dining') {
        furnitureCatalog = [
            { name: 'Sideboard', width: 1.5, height: 0.5 },
            { name: 'Cabinet', width: 1.2, height: 0.5 },
            { name: 'Bar Cart', width: 0.8, height: 0.4 },
            { name: 'Console Table', width: 1.2, height: 0.4 },
            { name: 'Storage Shelf', width: 1.0, height: 0.3 }
        ];
    } else if (roomType === 'bedroom') {
        furnitureCatalog = [
            { name: 'Wardrobe', width: 1.5, height: 0.6 },
            { name: 'Nightstand', width: 0.6, height: 0.4 },
            { name: 'Desk', width: 1.2, height: 0.6 },
            { name: 'Chair', width: 0.5, height: 0.5 },
            { name: 'Bookshelf', width: 0.8, height: 0.3 },
            { name: 'Dresser', width: 1.2, height: 0.5 }
        ];
    }

    // Sort from smallest area to largest
    furnitureCatalog.sort((a, b) => (a.width * a.height) - (b.width * b.height));

    const suggestions = [];

    // Generate position and dimension for each suggested piece of furniture
    for (let item of furnitureCatalog) {
        const itemArea = item.width * item.height;
        const count = Math.floor(remainingArea / itemArea);
        if (count > 0) {
            const xPosition = Math.random() * (room.width - item.width); // random X position
            const yPosition = Math.random() * (room.length - item.height); // random Y position
            suggestions.push({
                name: item.name,
                width: item.width,
                height: item.height,
                count: count,
                position: { x: xPosition, y: yPosition }
            });
            remainingArea -= count * itemArea;
        }
    }

    const suggestionList = document.getElementById('furnitureSuggestions');
    suggestionList.innerHTML = '';

    if (suggestions.length === 0) {
        suggestionList.innerHTML = '<li>No odash furniture fits in the remaining space.</li>';
    } else {
        suggestions.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.name} (${item.count} × ${item.width}m x ${item.height}m), Position: (${item.position.x.toFixed(2)}m, ${item.position.y.toFixed(2)}m)`;
            suggestionList.appendChild(li);
        });
    }
}


// Modified function to update remaining area and provide furniture suggestions based on dimensions and positions
function updateRemainingAreaAndSuggestions() {
    const roomArea = room.width * room.length;
    const sofaArea = (sofa.pixelWidth / roomScale.x) * (sofa.pixelHeight / roomScale.y);
    const remainingArea = Math.max(roomArea - sofaArea, 0).toFixed(2);
    const sofaStyleSelect = document.getElementById('sofaStyle');
    const selectedStyleIndex = parseInt(sofaStyleSelect.value);
    const roomType = document.getElementById('roomType').value.toLowerCase().replace(' ', '');

    const suggestionsEl = document.getElementById('furnitureSuggestions');
    const suggestions = [];
    const display = document.getElementById('remainingArea');
    if (!display) {
        const areaDisplay = document.createElement('div');
        areaDisplay.id = 'remainingArea';
        areaDisplay.style.marginTop = '10px';
        areaDisplay.style.fontWeight = 'bold';
        document.getElementById('suggestions').prepend(areaDisplay);
    }
    document.getElementById('remainingArea').textContent = `🧮 Remaining Area: ${remainingArea} m²`;

    const threshold = 0.5;

    if (roomType === 'hall') {
        if (remainingArea >= threshold) suggestions.push('Coffee Table (1.0m x 0.8m)');
        if (remainingArea >= 1.5) suggestions.push('Bookshelf (0.8m x 0.3m)');
        if (remainingArea >= 2.0) suggestions.push('TV Unit (1.5m x 0.4m)');
        if (remainingArea >= 2.5) suggestions.push('Accent Chair (0.8m x 0.8m)');
        if (remainingArea >= 3.0) suggestions.push('Console Table (1.2m x 0.4m)');
    } else if (roomType === 'diningroom') {
        if (remainingArea >= threshold) suggestions.push('Sideboard (1.5m x 0.5m)');
        if (remainingArea >= 1.5) suggestions.push('Cabinet (1.2m x 0.5m)');
        if (remainingArea >= 2.0) suggestions.push('Bar Cart (0.8m x 0.4m)');
        if (remainingArea >= 2.5) suggestions.push('Console Table (1.2m x 0.4m)');
    } else if (roomType === 'bedroom') {
        if (remainingArea >= threshold) suggestions.push('Nightstand (0.6m x 0.4m)');
        if (remainingArea >= 1.5) suggestions.push('Dresser (1.2m x 0.5m)');
        if (remainingArea >= 2.0) suggestions.push('Wardrobe (1.5m x 0.6m)');
        if (remainingArea >= 2.5) suggestions.push('Desk (1.2m x 0.6m)');
    } else if (roomType === 'livingroom') {
        if (remainingArea >= threshold) suggestions.push('Side Table (0.5m x 0.5m)');
        if (remainingArea >= 1.5) suggestions.push('Entertainment Unit (1.8m x 0.5m)');
        if (remainingArea >= 2.0) suggestions.push('Armchair (0.8m x 0.8m)');
        if (remainingArea >= 2.5) suggestions.push('Display Shelf (1.2m x 0.4m)');
        if (remainingArea >= 3.0) suggestions.push('Ottoman (1.0m x 0.6m)');
    } else if (roomType === 'kidsroom') {
        if (remainingArea >= threshold) suggestions.push('Toy Chest (0.8m x 0.5m)');
        if (remainingArea >= 1.5) suggestions.push('Kids Bookshelf (1.0m x 0.3m)');
        if (remainingArea >= 2.0) suggestions.push('Study Table (1.2m x 0.6m)');
        if (remainingArea >= 2.5) suggestions.push('Small Wardrobe (1.0m x 0.5m)');
        if (remainingArea >= 3.0) suggestions.push('Play Tent (1.2m x 1.2m)');
    } else if (roomType === 'studyroom') {
        if (remainingArea >= threshold) suggestions.push('Work Desk (1.5m x 0.7m)');
        if (remainingArea >= 1.5) suggestions.push('Bookshelf (1.2m x 0.4m)');
        if (remainingArea >= 2.0) suggestions.push('Filing Cabinet (0.8m x 0.5m)');
        if (remainingArea >= 2.5) suggestions.push('Reading Chair (0.9m x 0.9m)');
        if (remainingArea >= 3.0) suggestions.push('Storage Shelf (1.2m x 0.4m)');
    }

    // Render suggestions with dimensions and positions
    suggestionsEl.innerHTML = '';
    if (suggestions.length === 0) {
        suggestionsEl.innerHTML = '<li>No space left for extra furniture.</li>';
    } else {
        suggestions.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            suggestionsEl.appendChild(li);
        });
    }
    // Generate furniture buttons dynamically
    const furnitureButtonsContainer = document.getElementById('furnitureButtons');
    furnitureButtonsContainer.innerHTML = '';

    suggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.textContent = suggestion;
        button.className = 'furniture-button';
        button.onclick = () => addFurnitureToLayout(suggestion);
        furnitureButtonsContainer.appendChild(button);
    });

}
// Enable finalize button after sofa placed
document.getElementById('finalizeButton').disabled = false;

function finalizeDesign() {
    sofa.isLocked = true;  // Lock the sofa
    furnitureList.forEach(item => item.isLocked = false); // Furniture remains movable
    update2DLayout();      // Draw initial 2D layout
}

const furnitureList = [];  // Store added furniture info

function addFurnitureToLayout(suggestion) {
    // Parse size from suggestion text like "Coffee Table (1.0m x 0.8m)"
    const sizeMatch = suggestion.match(/\(([\d.]+)m x ([\d.]+)m\)/);
    if (!sizeMatch) return;

    const width = parseFloat(sizeMatch[1]);
    const height = parseFloat(sizeMatch[2]);

    // Place new furniture at (x,0) just like sofa, stacking downward
    let nextY = 0;
    if (furnitureList.length > 0) {
        const lastItem = furnitureList[furnitureList.length - 1];
        nextY = lastItem.y + lastItem.height + 0.2; // Add small gap between items
    }

    furnitureList.push({
        name: suggestion.split('(')[0].trim(),
        x: 0,
        y: nextY,
        width: width,
        height: height,
        isLocked: false // Make sure suggestion furniture is initially movable
    });

    update2DLayout();  // Redraw layout
}

function update2DLayout() {
    const canvas2D = document.getElementById('layoutCanvas');
    const ctx = canvas2D.getContext('2d');
    ctx.clearRect(0, 0, canvas2D.width, canvas2D.height);

    // Calculate room scale
    const scaleX = canvas2D.width / room.length;  // length along X
    const scaleY = canvas2D.height / room.width;  // width along Y

    // Draw room boundary
    ctx.strokeStyle = '#000';
    ctx.strokeRect(0, 0, canvas2D.width, canvas2D.height);

    // Draw sofa at (x, 0)
    const sofaRealX = parseFloat((sofa.pixelX / roomScale.x).toFixed(2));
    const sofaRealWidth = parseFloat((sofa.pixelWidth / roomScale.x).toFixed(2));
    const sofaRealHeight = parseFloat((sofa.pixelHeight / roomScale.y).toFixed(2));

    const sofaX = sofaRealX * scaleX;
    const sofaY = 0;
    const sofaW = sofaRealWidth * scaleX;
    const sofaH = sofaRealHeight * scaleY;

    ctx.fillStyle = '#ff8800';
    ctx.fillRect(sofaX, sofaY, sofaW, sofaH);
    ctx.strokeText("Furniture", sofaX + sofaW/4, sofaY + sofaH/2);

    // Draw any added furniture items
    furnitureList.forEach(item => {
        const fX = item.x * scaleX;
        const fY = item.y * scaleY;
        const fW = item.width * scaleX;
        const fH = item.height * scaleY;
        ctx.fillStyle = '#0088ff';
        ctx.fillRect(fX, fY, fW, fH);
        ctx.strokeText(item.name, fX + fW/4, fY + fH/2);
    });
}
document.getElementById('finalizeButton').addEventListener('click', finalizeDesign);


// Support moving furniture (only suggestion furniture after finalize)
let selectedFurniture = null;
let offsetX = 0;
let offsetY = 0;

const canvas2D = document.getElementById('layoutCanvas');

canvas2D.addEventListener('mousedown', (e) => {
    const rect = canvas2D.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / (canvas2D.width / room.length);
    const mouseY = (e.clientY - rect.top) / (canvas2D.height / room.width);

    // Check if clicking on sofa first
    const sofaRealX = parseFloat((sofa.pixelX / roomScale.x).toFixed(2));
    const sofaRealWidth = parseFloat((sofa.pixelWidth / roomScale.x).toFixed(2));
    const sofaRealHeight = parseFloat((sofa.pixelHeight / roomScale.y).toFixed(2));

    if (!sofa.isLocked) {
        if (mouseX >= sofaRealX && mouseX <= sofaRealX + sofaRealWidth &&
            mouseY >= 0 && mouseY <= sofaRealHeight) {
            selectedFurniture = sofa;
            offsetX = mouseX - sofaRealX;
            offsetY = mouseY;
            return; // If sofa clicked, don't check others
        }
    }

    // Otherwise, check if clicking on suggestion furniture
    furnitureList.forEach(item => {
        if (!item.isLocked) {
            if (mouseX >= item.x && mouseX <= item.x + item.width &&
                mouseY >= item.y && mouseY <= item.y + item.height) {
                selectedFurniture = item;
                offsetX = mouseX - item.x;
                offsetY = mouseY - item.y;
            }
        }
    });
});

canvas2D.addEventListener('mousemove', (e) => {
    if (selectedFurniture) {
        const rect = canvas2D.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / (canvas2D.width / room.length);
        const mouseY = (e.clientY - rect.top) / (canvas2D.height / room.width);

        if (selectedFurniture === sofa) {
            sofa.pixelX = (mouseX - offsetX) * roomScale.x;
            // Only move horizontally for sofa (since it's drawn at Y=0)
        } else {
            selectedFurniture.x = mouseX - offsetX;
            selectedFurniture.y = mouseY - offsetY;
        }
        update2DLayout();
    }
});


canvas2D.addEventListener('mouseup', () => {
    selectedFurniture = null;
});

canvas2D.addEventListener('mouseleave', () => {
    selectedFurniture = null;
});

// Call `updateRemainingAreaAndSuggestions()` inside `updateSofaInfo`
function updateSofaInfo() {
    const realX = (sofa.pixelX / roomScale.x).toFixed(2);
    const realY = (sofa.pixelY / roomScale.y).toFixed(2);
    const realW = (sofa.pixelWidth / roomScale.x).toFixed(2);
    const realH = (sofa.pixelHeight / roomScale.y).toFixed(2);
    sofaInfo.textContent = `📐 Furniture Position: (${realX}m, ${realY}m), Size: ${realW}m x ${realH}m`;

    updateRemainingAreaAndSuggestions(); // added
}

function saveDesign() {
    // Check if the canvas is available
    if (!canvas) {
        alert("Canvas is not available for saving.");
        return;
    }

    // Convert the canvas content to a PNG data URL
    const canvasImage = canvas.toDataURL("image/png");

    // Create a link element to trigger the download
    const link = document.createElement('a');
    link.href = canvasImage;
    link.download = 'room_design.png'; // Set the filename for the downloaded image

    // Simulate a click on the link to start the download
    link.click();
}


    