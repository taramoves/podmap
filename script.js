// State management
let state = {
    pods: [],
    selectedElement: null,
    isEditing: false,
    isDragging: false,
    draggedElement: null,
    initialDateMapped: null,  // Track when the map was first created
    progressCheckDates: [],    // Array to store all progress check dates
    hasUnsavedChanges: false
};

// Constants
const STORAGE_KEY = 'podmap_saves';
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const AUTO_SAVE_KEY = 'podmap_autosave_';

// ============= Storage Management =============
const StorageManager = {
    getAllSavedMaps() {
        const saves = localStorage.getItem(STORAGE_KEY);
        return saves ? JSON.parse(saves) : [];
    },

    saveMap(name) {
        const saves = this.getAllSavedMaps();
        const saveData = {
            id: Date.now(),
            name: name || document.getElementById('map-name').value || 'Untitled Map',
            date: new Date().toISOString(),
            data: {
                pods: state.pods,
                mapName: document.getElementById('map-name').value,
                userName: document.getElementById('user-name').value,
                dateMapped: document.getElementById('check-date').value,
                checkDate: document.getElementById('check-date').value
            }
        };
        
        saves.push(saveData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
        state.hasUnsavedChanges = false;
        updateSaveButton();
        return saveData;
    },

    loadMap(saveId) {
        const saves = this.getAllSavedMaps();
        const save = saves.find(s => s.id === saveId);
        if (save) {
            state.pods = save.data.pods;
            
            // Keep the original date mapped
            const originalDateMapped = save.data.dateMapped;
            document.getElementById('check-date').value = originalDateMapped;
            state.initialDateMapped = originalDateMapped;
            
            // Set progress check date to current date
            const currentDate = new Date().toISOString().split('T')[0];
            document.getElementById('check-date').value = currentDate;
            
            // Add new progress check date to history
            state.progressCheckDates = save.data.progressCheckDates || [save.data.checkDate];
            if (!state.progressCheckDates.includes(currentDate)) {
                state.progressCheckDates.push(currentDate);
            }
            
            // Load other map data
            document.getElementById('map-name').value = save.data.mapName || '';
            document.getElementById('user-name').value = save.data.userName || '';
        
        render();
    }
    },

    deleteMap(saveId) {
        const saves = this.getAllSavedMaps();
        const filteredSaves = saves.filter(s => s.id !== saveId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSaves));
    },

    prepareMapData() {
        const currentDate = new Date().toISOString().split('T')[0];
        const checkDate = document.getElementById('check-date').value;
        
        // Add new progress check date if it's different from the last one
        if (!state.progressCheckDates.includes(checkDate)) {
            state.progressCheckDates.push(checkDate);
        }
        
        return {
            pods: state.pods,
            mapName: document.getElementById('map-name').value,
            userName: document.getElementById('user-name').value,
            dateMapped: state.initialDateMapped || document.getElementById('check-date').value,
            checkDates: state.progressCheckDates,
            currentCheckDate: checkDate,
            mapType: document.getElementById('map-type').value
        };
    },

    saveMap(name, category = 'personal', description = '') {
        const saves = this.getAllSavedMaps();
        const saveData = {
            id: Date.now(),
            category,
            name: name || document.getElementById('map-name').value || 'Untitled Map',
            description,
            date: new Date().toISOString(),
            lastAutoSave: null,
            data: this.prepareMapData()
        };
        
        // Remove any auto-saves for this map
        this.clearAutoSave(saveData.id);
        
        // Add new save
        saves.push(saveData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
        
        // Show success message
        this.showNotification('Map saved successfully!');
        
        // After successful save
        state.hasUnsavedChanges = false;
        updateSaveButton();
        
        return saveData;
    },

    clearAutoSave(mapId) {
        localStorage.removeItem(AUTO_SAVE_KEY + mapId);
    }
};

// ============= Dialog Management =============
const DialogManager = {
    showInstructions() {
        const dialog = document.getElementById('help-dialog');
        dialog.style.display = 'flex';
    },

    hideInstructions() {
        const dialog = document.getElementById('help-dialog');
        dialog.style.display = 'none';
    },

    showSavedMaps() {
        const dialog = document.getElementById('saved-maps-dialog');
        const listContainer = document.getElementById('saved-maps-list');
        listContainer.innerHTML = '';
        
        const saves = StorageManager.getAllSavedMaps();
        saves.forEach(save => {
            const saveItem = document.createElement('div');
            saveItem.className = 'saved-map-item';
            saveItem.innerHTML = `
                <div class="map-title">${save.name}</div>
                <div class="map-date">${new Date(save.date).toLocaleDateString()}</div>
                <div class="saved-map-actions">
                    <button onclick="DialogManager.loadSavedMap(${save.id})">Load</button>
                    <button onclick="DialogManager.deleteSavedMap(${save.id})">Delete</button>
                </div>
            `;
            listContainer.appendChild(saveItem);
        });
        
        dialog.style.display = 'flex';
    },

    hideSavedMaps() {
        const dialog = document.getElementById('saved-maps-dialog');
        dialog.style.display = 'none';
    },

    loadSavedMap(saveId) {
        StorageManager.loadMap(saveId);
        this.hideSavedMaps();
    },

    deleteSavedMap(saveId) {
        if (confirm('Are you sure you want to delete this saved map?')) {
            StorageManager.deleteMap(saveId);
            this.showSavedMaps(); // Refresh the list
        }
    }
};

// ============= Event Listeners =============
function setupEventListeners() {
    // Existing listeners
    document.getElementById('add-pod-member').addEventListener('click', () => handleAddMember());
    
    // New listeners for save/load functionality
    document.getElementById('save-map').addEventListener('click', () => StorageManager.saveMap());
    document.getElementById('load-map').addEventListener('click', () => DialogManager.showSavedMaps());
    document.getElementById('close-saved-maps').addEventListener('click', () => DialogManager.hideSavedMaps());
    
    // Instructions dialog
    document.getElementById('help-button').addEventListener('click', () => DialogManager.showInstructions());
    document.getElementById('close-help').addEventListener('click', () => DialogManager.hideInstructions());
    
    // Worksheet click handler
    document.getElementById('worksheet').addEventListener('click', (e) => {
        if (e.target.id === 'worksheet') {
            state.selectedElement = null;
            state.isEditing = false;
        render();
    }
    });
    
    // Add listener for new map button
    document.getElementById('new-map').addEventListener('click', () => {
        if (confirm('Start a new map? Any unsaved changes will be lost.')) {
            initializeNewMap();
        }
    });
    
    // Add listener for date-mapped changes to preserve initial date
    document.getElementById('check-date').addEventListener('change', (e) => {
        if (!state.initialDateMapped) {
            state.initialDateMapped = e.target.value;
        }
    });

    // Add listener for export button
    document.getElementById('export-map').addEventListener('click', () => {
        FileManager.exportMap();
    });

    updateSaveButton(); // Initialize save button state
}

// Animation frame request ID
let animationFrameId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeWorksheet();
    setupEventListeners();
    setupAutoSave();
});

function initializeWorksheet() {
    const worksheet = document.getElementById('worksheet');
    
    // Set initial dates and create initial pod structure
    initializeNewMap();
}

function createCenterPod() {
    const worksheet = document.getElementById('worksheet');
    const centerX = worksheet.clientWidth / 2;
    const centerY = worksheet.clientHeight / 2;
    
    state.pods.push({
        id: 'center',
        x: centerX,
        y: centerY,
        radius: 50, // Reduced size
        members: [],
        potentialMembers: [],
            networks: [],
        name: 'Description'
    });
}

function addInitialElements() {
    const pod = state.pods[0];
    const worksheet = document.getElementById('worksheet');
    
    // Add 6 pod members arranged in concentric circles
    for (let i = 0; i < 6; i++) {
        pod.members.push({
            id: 'member_' + Date.now() + i,
            name: '',
            x: 0,
            y: 0
        });
    }
    
    // Position the pod members
    positionPodMembers(pod);
    
    // Add 8 potential members scattered around
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8 + (Math.PI / 8); // Offset angle
        const distance = pod.radius * 5; // Further from center
        const x = pod.x + Math.cos(angle) * distance;
        const y = pod.y + Math.sin(angle) * distance;
        
        pod.potentialMembers.push({
            id: 'potential_' + Date.now() + i,
            name: '',
            x: x,
            y: y
        });
    }
    
    // Add 6 resource networks around the edges
    const margin = 100;
        const wsWidth = worksheet.clientWidth;
        const wsHeight = worksheet.clientHeight;
        
    const networkPositions = [
        { x: margin, y: margin },
        { x: wsWidth - margin, y: margin },
        { x: margin, y: wsHeight / 2 },
        { x: wsWidth - margin, y: wsHeight / 2 },
        { x: margin, y: wsHeight - margin },
        { x: wsWidth - margin, y: wsHeight - margin }
    ];
    
    networkPositions.forEach((pos, i) => {
        pod.networks.push({
            id: 'network_' + Date.now() + i,
            name: '',
            x: pos.x,
            y: pos.y,
            size: 80
        });
    });
}

function positionPodMembers(pod) {
    const memberRadius = 40; // Half of the pod member circle size
    const centerRadius = pod.radius;
    const spacing = 5; // Reduced spacing between circles
    
    const totalMembers = pod.members.length;
    if (totalMembers === 0) return;

    // Calculate base radius from center (distance from center of pod to center of member circles)
    // Adjusted to be 3/4 of the original radius (half + quarter)
    const baseRadius = centerRadius + (memberRadius * 0.75) + spacing;
    
    // For the first 6 members, arrange in a single circle
    if (totalMembers <= 6) {
        const angleStep = (2 * Math.PI) / totalMembers;
        pod.members.forEach((member, i) => {
            const angle = i * angleStep;
            member.x = pod.x + Math.cos(angle) * baseRadius;
            member.y = pod.y + Math.sin(angle) * baseRadius;
        });
            return;
        }
        
    // For more than 6 members, create multiple rings with staggered positioning
    // Each ring's radius is adjusted to maintain proportional spacing
    const ringsConfig = [
        { radius: baseRadius, maxMembers: 6 },
        { radius: baseRadius + (memberRadius * 1.25) + spacing, maxMembers: 12 },
        { radius: baseRadius + (memberRadius * 2.5) + spacing * 2, maxMembers: 18 }
    ];

    let placedMembers = 0;
    let currentRing = 0;

    while (placedMembers < totalMembers && currentRing < ringsConfig.length) {
        const ring = ringsConfig[currentRing];
        const membersInThisRing = Math.min(
            ring.maxMembers - (currentRing * 6),
            totalMembers - placedMembers
        );

        if (membersInThisRing <= 0) {
            currentRing++;
            continue;
        }

        // Calculate angles with offset for staggering
        const angleStep = (2 * Math.PI) / membersInThisRing;
        const ringOffset = (currentRing % 2) * (angleStep / 2); // Alternate ring offset

        for (let i = 0; i < membersInThisRing; i++) {
            const angle = (i * angleStep) + ringOffset;
            const member = pod.members[placedMembers + i];
            member.x = pod.x + Math.cos(angle) * ring.radius;
            member.y = pod.y + Math.sin(angle) * ring.radius;
        }

        placedMembers += membersInThisRing;
        currentRing++;
    }
}

function handleAddMember(x, y, type = 'member') {
    const pod = state.pods[0];
    let memberX = x || pod.x;
    let memberY = y || pod.y;
    
    const newElement = {
        id: `${type}_${Date.now()}`,
        name: '',
        x: memberX,
        y: memberY,
        isNew: true
    };
    
    if (type === 'network') {
        newElement.size = 80;
    }
    
    const targetArray = type === 'member' ? pod.members : 
                       type === 'potential' ? pod.potentialMembers : 
                       pod.networks;
    
    targetArray.push(newElement);
    
    // Reposition pod members if we added a new member
    if (type === 'member') {
        positionPodMembers(pod);
    }
    
    state.selectedElement = newElement.id;
    state.isEditing = true;
        
        render();
    markUnsavedChanges();
}

function handleDeleteSelected() {
    if (!state.selectedElement) return;
    
    const pod = state.pods[0];
    const type = state.selectedElement.split('_')[0];
    
    if (type === 'member') {
        pod.members = pod.members.filter(m => m.id !== state.selectedElement);
        positionPodMembers(pod); // Reposition remaining members
    } else if (type === 'potential') {
        pod.potentialMembers = pod.potentialMembers.filter(m => m.id !== state.selectedElement);
    } else if (type === 'network') {
        pod.networks = pod.networks.filter(n => n.id !== state.selectedElement);
    }
    
    state.selectedElement = null;
    state.isEditing = false;
        
        render();
    markUnsavedChanges();
}

function render() {
    const worksheet = document.getElementById('worksheet');
    worksheet.innerHTML = '';
    
    // Render each pod
    state.pods.forEach(pod => {
        // Create pod circle
        const podCircle = document.createElement('div');
        podCircle.className = 'pod-circle';
        podCircle.style.position = 'absolute';
        podCircle.style.left = `${pod.x}px`;
        podCircle.style.top = `${pod.y}px`;
        podCircle.style.width = `${pod.radius * 2}px`;
        podCircle.style.height = `${pod.radius * 2}px`;
        podCircle.style.transform = 'translate(-50%, -50%)';
        
        if (pod.id === 'center') {
            // Create a container for the text that will stay inside the circle
            const textContainer = document.createElement('div');
            textContainer.style.width = '100%';
            textContainer.style.height = '100%';
            textContainer.style.display = 'flex';
            textContainer.style.alignItems = 'center';
            textContainer.style.justifyContent = 'center';
            
            if (state.isEditing && state.selectedElement === pod.id) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'member-input';
                input.value = pod.name;
                input.placeholder = 'Description';
                input.setAttribute('autocomplete', 'off');
                input.setAttribute('data-form-type', 'other');
                
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        pod.name = input.value;
                        state.isEditing = false;
                        render();
                    }
                e.stopPropagation();
                });
                
                input.addEventListener('blur', () => {
                    pod.name = input.value;
                    state.isEditing = false;
                    render();
                });
                
                textContainer.appendChild(input);
                setTimeout(() => {
                    input.focus();
                    input.select();
                }, 0);
            } else {
                const textSpan = document.createElement('span');
                textSpan.className = 'member-text';
                textSpan.textContent = pod.name || 'Description';
                textSpan.style.color = pod.name ? '#000' : '#888';
                textContainer.appendChild(textSpan);
            }
            
            podCircle.appendChild(textContainer);
            
            // Add click handler for editing
            podCircle.addEventListener('click', (e) => {
                if (!state.isDragging) {
                    e.stopPropagation();
                    state.selectedElement = pod.id;
                    state.isEditing = true;
                    render();
                }
            });
        }
        
        worksheet.appendChild(podCircle);
        
        // Render pod members
        pod.members.forEach(member => {
            renderElement(member, 'pod-member', worksheet);
        });
        
        // Render potential members
        pod.potentialMembers.forEach(potential => {
            renderElement(potential, 'potential-member', worksheet);
        });
        
        // Render networks
        pod.networks.forEach(network => {
            renderElement(network, 'network', worksheet);
        });
    });
    
    if (!state.isDragging) {  // Don't mark as unsaved during drag operations
        markUnsavedChanges();
    }
}

function renderElement(element, className, container) {
    const elementDiv = document.createElement('div');
    elementDiv.className = className;
    elementDiv.dataset.id = element.id;
    elementDiv.style.left = `${element.x}px`;
    elementDiv.style.top = `${element.y}px`;
    
    if (element.size) {
        elementDiv.style.width = `${element.size}px`;
        elementDiv.style.height = `${element.size}px`;
    }
    
    if (element.id === state.selectedElement) {
        elementDiv.classList.add('selected');
    }
    
    // Determine placeholder text based on element type
    const getPlaceholder = (className) => {
        switch(className) {
            case 'pod-member':
                return 'Pod Member';
            case 'potential-member':
                return 'Potential Member';
            case 'network':
                return 'Resource/Network';
            case 'center-text':
                return 'Description';
            default:
                return 'Pod Member';
        }
    };
    
    // Create input or text display
    if (state.isEditing && element.id === state.selectedElement) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'member-input';
        input.value = element.name;
        input.placeholder = getPlaceholder(className);
        // Add attributes to prevent password manager interference
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('data-form-type', 'other');
        input.setAttribute('data-lpignore', 'true');
        
        // Focus the input immediately
        setTimeout(() => {
            input.focus();
            input.select();
        }, 0);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                element.name = input.value;
                state.isEditing = false;
                render();
    }
            // Prevent the input from losing focus
                e.stopPropagation();
        });
        
        input.addEventListener('blur', () => {
            // Only update if there's a change
            if (input.value !== element.name) {
                element.name = input.value;
                state.isEditing = false;
                render();
            }
        });
        
        elementDiv.appendChild(input);
    } else {
        const textSpan = document.createElement('span');
        textSpan.className = 'member-text';
        if (element.name) {
            textSpan.textContent = element.name;
            textSpan.style.color = '#000'; // Black for actual names
        } else {
            textSpan.textContent = getPlaceholder(className);
            textSpan.style.color = '#888'; // Gray for placeholder text
        }
        elementDiv.appendChild(textSpan);
    }
    
    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('type', 'button');
    deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
        state.selectedElement = element.id;
        handleDeleteSelected();
    });
    elementDiv.appendChild(deleteBtn);
    
    // Add click handler before drag handler to ensure proper event order
    elementDiv.addEventListener('click', (e) => {
        if (!state.isDragging && !e.target.classList.contains('delete-btn')) {
                    e.stopPropagation();
            state.selectedElement = element.id;
            state.isEditing = true;
                    render();
        }
    });
    
    // Add dragging functionality
    elementDiv.addEventListener('mousedown', (e) => {
        if (e.button === 0 && e.target.tagName.toLowerCase() !== 'input' && !e.target.classList.contains('delete-btn')) {
            state.isDragging = true;
            state.draggedElement = element.id;
            elementDiv.classList.add('dragging');
            
            const onMouseMove = (e) => {
                const rect = container.getBoundingClientRect();
                element.x = e.clientX - rect.left;
                element.y = e.clientY - rect.top;
                render();
            };
            
            const onMouseUp = () => {
                state.isDragging = false;
                state.draggedElement = null;
                elementDiv.classList.remove('dragging');
                markUnsavedChanges();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }
    });
    
    container.appendChild(elementDiv);
}

function setupAutoSave() {
    // Clear any existing auto-save interval
    if (window.autoSaveInterval) clearInterval(window.autoSaveInterval);
    
    window.autoSaveInterval = setInterval(() => {
        const currentMapId = state.currentMapId;
        if (currentMapId) {
            const autoSaveKey = AUTO_SAVE_KEY + currentMapId;
            localStorage.setItem(autoSaveKey, JSON.stringify({
                timestamp: Date.now(),
                data: StorageManager.prepareMapData()
            }));
        }
    }, AUTO_SAVE_INTERVAL);
}

const FileManager = {
    async exportMap() {
        // Get the entire app container instead of just the worksheet
        const appContainer = document.querySelector('.app-container');
        
        try {
            // Hide controls and dialogs temporarily for the screenshot
            const controls = document.querySelector('.controls');
            const dialogs = document.querySelectorAll('.dialog-overlay');
            controls.style.display = 'none';
            dialogs.forEach(dialog => dialog.style.display = 'none');
            
            // Create a notification that export is in progress
            const notification = document.createElement('div');
            notification.className = 'export-notification';
            notification.textContent = 'Generating image...';
            document.body.appendChild(notification);
            
            // Capture the app container as an image
            const canvas = await html2canvas(appContainer, {
                backgroundColor: 'white',
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
                removeContainer: true
            });
            
            // Restore controls and dialogs
            controls.style.display = 'flex';
            dialogs.forEach(dialog => dialog.style.display = '');
            
            // Create download link
            const link = document.createElement('a');
            const mapName = document.getElementById('map-name').value || 'podmap';
            const date = new Date().toISOString().split('T')[0];
            link.download = `${mapName}_${date}.png`;
            link.href = canvas.toDataURL('image/png');
            
            // Trigger download
            link.click();
            
            // Remove notification
            notification.remove();
            
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export map as image. Please try again.');
            
            // Ensure controls and dialogs are restored even if export fails
            const controls = document.querySelector('.controls');
            const dialogs = document.querySelectorAll('.dialog-overlay');
            controls.style.display = 'flex';
            dialogs.forEach(dialog => dialog.style.display = '');
        }
    },

    validateImport(data) {
        // Basic structure validation
        const required = ['version', 'timestamp', 'map'];
        if (!required.every(key => key in data)) {
            throw new Error('Invalid file format');
        }
        
        // Version compatibility check
        if (parseFloat(data.version) > 1.0) {
            throw new Error('This file was created with a newer version of the tool');
        }
        
        // Data validation
        if (!data.map.pods || !Array.isArray(data.map.pods)) {
            throw new Error('Invalid pod data');
        }
        
        return true;
    }
};

function getSortedMaps(saves, { sortBy = 'date', category = null, searchTerm = '' }) {
    let filtered = saves;
    
    // Filter by category if specified
    if (category) {
        filtered = filtered.filter(save => save.category === category);
    }
    
    // Filter by search term
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(save => 
            save.name.toLowerCase().includes(term) ||
            save.description.toLowerCase().includes(term)
        );
    }
    
    // Sort
    return filtered.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'date':
            default:
                return new Date(b.date) - new Date(a.date);
        }
    });
}

// Add function to initialize a new map
function initializeNewMap() {
    // Set dates first, before any other operations
    const currentDate = new Date().toISOString().split('T')[0];
    document.getElementById('date-mapped').value = currentDate;
    document.getElementById('check-date').value = currentDate;
    
    state.initialDateMapped = currentDate;
    state.progressCheckDates = [currentDate];
    
    // Initialize the rest of the state
    state.pods = [];
    state.selectedElement = null;
    state.isEditing = false;
    state.isDragging = false;
    state.draggedElement = null;
    
    // Create initial pod structure
    createCenterPod();
    addInitialElements();
    
    render();
    state.hasUnsavedChanges = true;
    updateSaveButton();
}

// Add function to mark unsaved changes
function markUnsavedChanges() {
    state.hasUnsavedChanges = true;
    updateSaveButton();
}

// Add function to update save button
function updateSaveButton() {
    const saveButton = document.getElementById('save-map');
    if (state.hasUnsavedChanges) {
        saveButton.classList.remove('saved');
        } else {
        saveButton.classList.add('saved');
    }
}