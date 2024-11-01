import { loadSVG } from './mapLoader.js';
import { initializeZoomPan, setupZoomControls, setupPanning } from './zoomPan.js';
import { setupPostalCodeClicks, loadSelectedPostalCodes, setMode, togglePostalCode } from './postalCodeManager.js';
import { setupModeToggle, setupLookupButton } from './uiSetup.js';
import { connectWebSocket } from './websocket.js';
import { setupLassoSelect, setupBoxSelect } from './lasso.js';

async function loadRegionOptions() {
    try {
        const response = await fetch('data/regions.json');
        const regions = await response.json();
        const selectElement = document.getElementById('regions');

        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region.value;
            option.textContent = region.text;
            selectElement.appendChild(option);
        });

        selectElement.addEventListener('change', function() {
            if (this.value) {
                window.location.href = this.value;
            }
        });
    } catch (error) {
        console.error('Error loading region options:', error);
    }
}

async function populateRegionDropdown() {
    try {
        const response = await fetch('data/regions.json');
        const regions = await response.json();
        const select = document.getElementById('regions');

        // Clear existing options
        select.innerHTML = '';

        regions.forEach(item => {
            if (item.optgroup) {
                // Create an optgroup
                const optgroup = document.createElement('optgroup');
                optgroup.label = item.optgroup;
                
                item.options.forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option.value;
                    optionElement.textContent = option.text;
                    optgroup.appendChild(optionElement);
                });
                
                select.appendChild(optgroup);
            } else {
                // Create a regular option
                const option = document.createElement('option');
                option.value = item.value;
                option.textContent = item.text;
                select.appendChild(option);
            }
        });

        // Set the initial selected option based on the current URL
        const urlParams = new URLSearchParams(window.location.search);
        const currentMap = urlParams.get('map');
        if (currentMap) {
            select.value = `/?map=${currentMap}`;
        }

        // Add event listener to handle selection change
        select.addEventListener('change', (event) => {
            window.location.href = event.target.value;
        });
    } catch (error) {
        console.error('Error populating region dropdown:', error);
    }
}

function initializeApp() {
    loadSVG()
        .then(({ svgElement, originalViewBox }) => {
            initializeZoomPan(svgElement, originalViewBox);
            // connectWebSocket();
            setupPostalCodeClicks();
            setupZoomControls();
            setupPanning();
            setupLassoSelect(svgElement, togglePostalCode);
            setupBoxSelect(svgElement, togglePostalCode);
            setupModeToggle();
            setupLookupButton();
            setMode('loading');
            return loadSelectedPostalCodes();
        })
        .then(() => {
            console.log('Postal codes loaded');
            // ensureControlsVisibility();
        })
        .catch(error => console.error('Error initializing app:', error));
}

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();

    populateRegionDropdown();
});
