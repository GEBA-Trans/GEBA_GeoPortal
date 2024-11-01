export let isLassoActive = false;
let currentMode; // Add this line to keep track of the current mode

let lassoPoints = [];
let svgElement;
let addPostalCodeCallback;

export function setupLassoSelect(svg, addPostalCodeFunc) {
    svgElement = svg;
    addPostalCodeCallback = addPostalCodeFunc;
    const lassoButton = document.getElementById('lasso-button');
    lassoButton.addEventListener('click', toggleLasso);

    svgElement.addEventListener('mousedown', startLasso);
    svgElement.addEventListener('mousemove', updateLasso);
    document.addEventListener('mouseup', endLasso);
}

// Add this new function to set the current mode
export function setLassoMode(mode) {
    currentMode = mode;
}

function toggleLasso() {
    isLassoActive = !isLassoActive;
    svgElement.classList.toggle('lasso-active', isLassoActive);
    const lassoButton = document.getElementById('lasso-button');
    const lassoStatus = document.getElementById('lasso-status');
    lassoButton.innerHTML = isLassoActive ? '<i class="fas fa-times" style="color: red;"></i>' : '<i class="fas fa-draw-polygon"></i>';
    lassoButton.title = isLassoActive ? 'Cancel Lasso' : 'Lasso Select';

    lassoStatus.style.display = isLassoActive ? 'flex' : 'none';

    if (isLassoActive) {
        const paths = document.querySelectorAll('#map-container svg path');
        paths.forEach(path => {
            if (!path.classList.contains('selected')) {
                path.style.filter = 'grayscale(75%)';
            }
        });
        debugCounters.timeTaken = 0; // Reset timeTaken when activating lasso
        showDebugCounters();
    } else {
        const paths = document.querySelectorAll('#map-container svg path');
        paths.forEach(path => {
            path.style.filter = '';
        });
        hideDebugCounters();
    }
}

function startLasso(e) {
    if (!isLassoActive) return;
    e.preventDefault();
    const point = getSVGPoint(e.clientX, e.clientY);
    lassoPoints = [point];
    lassoStartTime = performance.now(); // Record the start time
    debugCounters.lassoPoints = 1;
    updateDebugCounters();
}

function updateLasso(e) {
    if (!isLassoActive || lassoPoints.length === 0) return;
    e.preventDefault();
    const point = getSVGPoint(e.clientX, e.clientY);
    lassoPoints.push(point);
    debugCounters.lassoPoints = lassoPoints.length;
    updateDebugCounters();
    drawLasso();
}

function getSVGPoint(x, y) {
    const pt = svgElement.createSVGPoint();
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(svgElement.getScreenCTM().inverse());
}

function drawLasso() {
    let existingLasso = svgElement.querySelector('#lasso');
    if (existingLasso) existingLasso.remove();

    const lasso = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    lasso.setAttribute('id', 'lasso');
    lasso.setAttribute('points', lassoPoints.map(p => `${p.x},${p.y}`).join(' '));
    lasso.setAttribute('fill', 'rgba(255, 0, 0, 0.1)'); // Red fill with 10% opacity
    lasso.setAttribute('stroke', '#ff0000'); // Bright red stroke
    lasso.setAttribute('stroke-width', '2');
    lasso.setAttribute('vector-effect', 'non-scaling-stroke');
    svgElement.appendChild(lasso);
}

function selectPathsInLasso() {
    const paths = document.querySelectorAll('#map-container svg path');
    debugCounters.pathsChecked = 0;
    debugCounters.pathsSelected = 0;
    paths.forEach(path => {
        debugCounters.pathsChecked++;
        const isInLasso = isPathInLasso(path);
        if (isInLasso) {
            debugCounters.pathsSelected++;
            const postalCode = path.id || 'Unknown';
            addToSelection(path, postalCode);
            path.classList.add('selected');
            path.style.filter = '';
        }
        updateDebugCounters();
    });
}

function isPathInLasso(path) {
    const { points } = getPathPoints(path);
    return points.some(point => isPointInPolygon(point, lassoPoints));
}

function getPathPoints(path) {
    const points = [];
    const pathLength = path.getTotalLength();
    const step = pathLength / 8; // Adjust this number to balance accuracy and performance
    console.log('Path Length:', pathLength);
    console.log('Step Size:', step);

    const svg = path.ownerSVGElement;
    const debugGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    debugGroup.setAttribute("id", "debug-points");
    svg.appendChild(debugGroup);

    for (let i = 0; i <= pathLength; i += step) {
        const point = path.getPointAtLength(i);
        if (!points.some(p => p.x === point.x && p.y === point.y)) {
            points.push(point);
            // console.log(`Point ${i}:`, point);

            // Create a visible point on the SVG for debug purposes
            // const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            // circle.setAttribute("cx", point.x);
            // circle.setAttribute("cy", point.y);
            // circle.setAttribute("r", "2");
            // circle.setAttribute("fill", "red");
            // debugGroup.appendChild(circle);
        }
    }
    console.log('Total Points Collected:', points.length);
    return { points, svg };
}

export function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function clearLasso() {
    const lasso = svgElement.querySelector('#lasso');
    if (lasso) lasso.remove();
    lassoPoints = [];
}

function endLasso(e) {
    if (!isLassoActive || lassoPoints.length === 0) return;
    e.preventDefault();
    const point = getSVGPoint(e.clientX, e.clientY);
    lassoPoints.push(point);
    drawLasso();
    
    const endTime = performance.now();
    const timeTaken = endTime - lassoStartTime;
    debugCounters.timeTaken = timeTaken.toFixed(2); // Round to 2 decimal places
    
    selectPathsInLasso();
    updateDebugCounters(); // Update counters one last time
    clearLasso();
    
    // Remove debug points after a short delay
    setTimeout(() => {
        const debugGroup = svgElement.querySelector('#debug-points');
        if (debugGroup) {
            svgElement.removeChild(debugGroup);
        }
    }, 2000);

    // Don't reset the timeTaken here
}

function debugLasso() {
    // console.log('Lasso Points:', lassoPoints);
    // console.log('SVG Element:', svgElement);
    const lasso = svgElement.querySelector('#lasso');
    // console.log('Lasso Element:', lasso);
    if (lasso) {
        // console.log('Lasso Attributes:', lasso.attributes);
    }
}

// Add these variables at the top of the file
let debugCounters = {
    lassoPoints: 0,
    pathsChecked: 0,
    pathsSelected: 0,
    timeTaken: 0
};

// Add this function to update the debug counters on screen
function updateDebugCounters() {
    let debugElement = document.getElementById('lasso-debug');
    if (!debugElement) {
        debugElement = document.createElement('div');
        debugElement.id = 'lasso-debug';
        debugElement.style.position = 'fixed';
        debugElement.style.top = '10px';
        debugElement.style.right = '10px';
        debugElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        debugElement.style.color = 'white';
        debugElement.style.padding = '10px';
        debugElement.style.borderRadius = '5px';
        debugElement.style.fontFamily = 'monospace';
        debugElement.style.zIndex = '1000';
        debugElement.style.cursor = 'pointer';
        document.body.appendChild(debugElement);
        
        // Add click event listener to hide debug counters
        debugElement.addEventListener('click', hideDebugCounters);
    }
    debugElement.innerHTML = `
        Lasso Points: ${debugCounters.lassoPoints}<br>
        Paths Checked: ${debugCounters.pathsChecked}<br>
        Paths Selected: ${debugCounters.pathsSelected}<br>
        Time Taken: ${debugCounters.timeTaken || '0.00'} ms<br>
        (Click to hide)
    `;
}

// Add this variable at the top of the file
let lassoStartTime;

function showDebugCounters() {
    const debugElement = document.getElementById('lasso-debug');
    if (debugElement) {
        debugElement.style.display = 'block';
    } else {
        updateDebugCounters();
    }
}

function hideDebugCounters() {
    const debugElement = document.getElementById('lasso-debug');
    if (debugElement) {
        debugElement.style.display = 'none';
    }
}

// New function to add to selection
function addToSelection(path, postalCode) {
    if (!path.classList.contains('selected') || !path.classList.contains(currentMode)) {
        addPostalCodeCallback(path, postalCode, currentMode, true); // Add 'true' to indicate it's from lasso
    }
}

export let isBoxSelectActive = false;
let boxStartPoint;
let boxEndPoint;

export function setupBoxSelect(svg, addPostalCodeFunc) {
    svgElement = svg;
    addPostalCodeCallback = addPostalCodeFunc;
    const boxSelectButton = document.getElementById('box-select-button');
    boxSelectButton.addEventListener('click', toggleBoxSelect);

    svgElement.addEventListener('mousedown', startBoxSelect);
    svgElement.addEventListener('mousemove', updateBoxSelect);
    document.addEventListener('mouseup', endBoxSelect);
}

function toggleBoxSelect() {
    isBoxSelectActive = !isBoxSelectActive;
    console.log('Box Select Active:', isBoxSelectActive); // Debugging line
    svgElement.classList.toggle('box-select-active', isBoxSelectActive);
    const boxSelectButton = document.getElementById('box-select-button');
    boxSelectButton.title = isBoxSelectActive ? 'Cancel Box Select' : 'Box Select';
}

function startBoxSelect(e) {
    if (!isBoxSelectActive) return;
    e.preventDefault();
    boxStartPoint = getSVGPoint(e.clientX, e.clientY);
    boxEndPoint = boxStartPoint;
    drawBoxSelect();
}

function updateBoxSelect(e) {
    if (!isBoxSelectActive || !boxStartPoint) return;
    e.preventDefault();
    boxEndPoint = getSVGPoint(e.clientX, e.clientY);
    drawBoxSelect();
}

function endBoxSelect(e) {
    if (!isBoxSelectActive || !boxStartPoint) return;
    e.preventDefault();
    boxEndPoint = getSVGPoint(e.clientX, e.clientY);
    selectPathsInBox();
    clearBoxSelect();
}

function drawBoxSelect() {
    clearBoxSelect();
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const x = Math.min(boxStartPoint.x, boxEndPoint.x);
    const y = Math.min(boxStartPoint.y, boxEndPoint.y);
    const width = Math.abs(boxStartPoint.x - boxEndPoint.x);
    const height = Math.abs(boxStartPoint.y - boxEndPoint.y);
    box.setAttribute('x', x);
    box.setAttribute('y', y);
    box.setAttribute('width', width);
    box.setAttribute('height', height);
    box.setAttribute('fill', 'rgba(0, 0, 255, 0.3)'); // Blue fill with 30% opacity
    box.setAttribute('stroke', 'blue'); // Blue stroke
    box.setAttribute('stroke-width', '2');
    svgElement.appendChild(box);
}

function clearBoxSelect() {
    const existingBox = svgElement.querySelector('rect');
    if (existingBox) existingBox.remove();
}

function selectPathsInBox() {
    const paths = document.querySelectorAll('#map-container svg path');
    paths.forEach(path => {
        const pathBBox = path.getBBox();
        const isInBox = boxStartPoint.x < pathBBox.x + pathBBox.width &&
                        boxStartPoint.x + Math.abs(boxStartPoint.x - boxEndPoint.x) > pathBBox.x &&
                        boxStartPoint.y < pathBBox.y + pathBBox.height &&
                        boxStartPoint.y + Math.abs(boxStartPoint.y - boxEndPoint.y) > pathBBox.y;

        if (isInBox) {
            const postalCode = path.id || 'Unknown';
            addToSelection(path, postalCode);
            path.classList.add('selected');
        }
    });
}
