// Bookmark Manager Zero - Sidebar Script
// Connects to Firefox native bookmarks API

// Check if running in preview mode (no browser API available)
const isPreviewMode = typeof browser === 'undefined';

// State
let bookmarkTree = [];
let searchTerm = '';
let activeFilter = null;
let expandedFolders = new Set();
let theme = 'blue-dark';
let viewMode = 'list';
let displayOptions = {
  title: true,
  url: true
};
let currentEditItem = null;
let zoomLevel = 100;

// DOM Elements
const bookmarkList = document.getElementById('bookmarkList');
const searchInput = document.getElementById('searchInput');
const filterToggle = document.getElementById('filterToggle');
const filterBar = document.getElementById('filterBar');
const displayToggle = document.getElementById('displayToggle');
const displayBar = document.getElementById('displayBar');
const themeBtn = document.getElementById('themeBtn');
const themeMenu = document.getElementById('themeMenu');
const viewBtn = document.getElementById('viewBtn');
const viewMenu = document.getElementById('viewMenu');
const zoomBtn = document.getElementById('zoomBtn');
const zoomMenu = document.getElementById('zoomMenu');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const openInTabBtn = document.getElementById('openInTabBtn');
const switchSideBtn = document.getElementById('switchSideBtn');
const closeExtensionBtn = document.getElementById('closeExtensionBtn');

// Initialize
async function init() {
  // Force update logo title to bypass cache
  const logoTitle = document.querySelector('.logo-title');
  const logoSubtitle = document.querySelector('.logo-subtitle');
  if (logoTitle) logoTitle.textContent = 'Bookmark Manager Zero';
  if (logoSubtitle) logoSubtitle.textContent = 'A modern interface for your native bookmarks';

  // Force update filter button icon
  const filterToggle = document.getElementById('filterToggle');
  if (filterToggle) {
    filterToggle.innerHTML = `
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4.25,5.61C6.27,8.2,10,13,10,13v6c0,0.55,0.45,1,1,1h2c0.55,0,1-0.45,1-1v-6c0,0,3.72-4.8,5.74-7.39 C20.25,4.95,19.78,4,18.95,4H5.04C4.21,4,3.74,4.95,4.25,5.61z"/>
      </svg>
    `;
    filterToggle.title = 'Filters';
  }

  loadTheme();
  loadView();
  loadZoom();
  await loadBookmarks();
  setupEventListeners();
  renderBookmarks();
}

// Load theme preference
function loadTheme() {
  if (isPreviewMode) {
    theme = 'blue-dark';
    applyTheme();
    return;
  }

  browser.storage.local.get('theme').then(result => {
    theme = result.theme || 'blue-dark';
    applyTheme();
  });
}

// Apply theme
function applyTheme() {
  // Remove all theme classes
  document.body.classList.remove('dark', 'light', 'blue-dark');

  // Add current theme class
  document.body.classList.add(theme);
}

// Set theme
function setTheme(newTheme) {
  theme = newTheme;
  applyTheme();
  if (!isPreviewMode) {
    browser.storage.local.set({ theme });
  }
}

// Load view preference
function loadView() {
  if (isPreviewMode) {
    viewMode = 'list';
    applyView();
    return;
  }

  browser.storage.local.get('viewMode').then(result => {
    viewMode = result.viewMode || 'list';
    applyView();
  });
}

// Apply view
function applyView() {
  // Remove all view classes
  bookmarkList.classList.remove('grid-view', 'grid-2', 'grid-3', 'grid-4', 'grid-5', 'grid-6');

  // Add current view classes
  if (viewMode !== 'list') {
    bookmarkList.classList.add('grid-view', viewMode);
  }
}

// Set view
function setView(newView) {
  viewMode = newView;
  applyView();
  if (!isPreviewMode) {
    browser.storage.local.set({ viewMode });
  }
}

// Load zoom preference
function loadZoom() {
  if (isPreviewMode) {
    zoomLevel = 100;
    applyZoom();
    return;
  }

  browser.storage.local.get('zoomLevel').then(result => {
    zoomLevel = result.zoomLevel || 100;
    applyZoom();
    updateZoomDisplay();
  });
}

// Apply zoom
function applyZoom() {
  const zoomFactor = zoomLevel / 100;
  bookmarkList.style.transform = `scale(${zoomFactor})`;
  bookmarkList.style.transformOrigin = 'top left';

  // Adjust container to account for scaling
  // When scaled down, the content takes less visual space
  // When scaled up, it takes more visual space
  bookmarkList.style.width = `${100 / zoomFactor}%`;
  bookmarkList.style.height = `${100 / zoomFactor}%`;
}

// Set zoom
function setZoom(newZoom) {
  zoomLevel = newZoom;
  applyZoom();
  updateZoomDisplay();
  if (!isPreviewMode) {
    browser.storage.local.set({ zoomLevel });
  }
}

// Update zoom display
function updateZoomDisplay() {
  if (zoomSlider) zoomSlider.value = zoomLevel;
  if (zoomValue) zoomValue.textContent = `${zoomLevel}%`;
}

// Load bookmarks from Firefox API
async function loadBookmarks() {
  if (isPreviewMode) {
    // Use mock data for preview
    bookmarkTree = getMockBookmarks();
    console.log('Preview mode: Using mock bookmarks');
    return;
  }

  try {
    const tree = await browser.bookmarks.getTree();
    // Firefox returns root with children, we want the actual bookmark folders
    bookmarkTree = tree[0].children || [];
    console.log('Loaded bookmarks:', bookmarkTree);
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    showError('Failed to load bookmarks');
  }
}

// Mock bookmark data for preview mode
function getMockBookmarks() {
  return [
    {
      id: '1',
      title: 'Bookmarks Toolbar',
      type: 'folder',
      children: [
        {
          id: '2',
          title: 'GitHub',
          url: 'https://github.com',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        },
        {
          id: '3',
          title: 'Stack Overflow',
          url: 'https://stackoverflow.com',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        }
      ]
    },
    {
      id: '4',
      title: 'Development',
      type: 'folder',
      children: [
        {
          id: '5',
          title: 'MDN Web Docs',
          url: 'https://developer.mozilla.org',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        },
        {
          id: '6',
          title: 'CSS Tricks',
          url: 'https://css-tricks.com',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        },
        {
          id: '7',
          title: 'Can I Use',
          url: 'https://caniuse.com',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        },
        {
          id: '8',
          title: 'JavaScript Info',
          url: 'https://javascript.info',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        }
      ]
    },
    {
      id: '9',
      title: 'News & Media',
      type: 'folder',
      children: [
        {
          id: '10',
          title: 'Hacker News',
          url: 'https://news.ycombinator.com',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        },
        {
          id: '11',
          title: 'The Verge',
          url: 'https://theverge.com',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        }
      ]
    },
    {
      id: '12',
      title: 'Design Resources',
      type: 'folder',
      children: [
        {
          id: '13',
          title: 'Dribbble',
          url: 'https://dribbble.com',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        },
        {
          id: '14',
          title: 'Figma',
          url: 'https://figma.com',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        },
        {
          id: '15',
          title: 'Material Design',
          url: 'https://material.io',
          type: 'bookmark',
          linkStatus: 'live',
          safetyStatus: 'safe'
        }
      ]
    },
    {
      id: '16',
      title: 'Suspicious Site Example',
      url: 'https://suspicious-example.com',
      type: 'bookmark',
      linkStatus: 'live',
      safetyStatus: 'warning'
    },
    {
      id: '17',
      title: 'Dead Link Example',
      url: 'https://dead-link-example-404.com',
      type: 'bookmark',
      linkStatus: 'dead',
      safetyStatus: 'unknown'
    },
    {
      id: '18',
      title: 'Parked Domain Example',
      url: 'https://parked-domain-example.com',
      type: 'bookmark',
      linkStatus: 'parked',
      safetyStatus: 'unknown'
    },
    {
      id: '19',
      title: 'Malicious Site Example',
      url: 'https://dangerous-example.com',
      type: 'bookmark',
      linkStatus: 'live',
      safetyStatus: 'unsafe'
    }
  ];
}

// Render bookmarks
function renderBookmarks() {
  const filtered = filterAndSearchBookmarks(bookmarkTree);

  if (filtered.length === 0) {
    bookmarkList.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--md-sys-color-on-surface-variant);">
        <div style="font-size: 48px; margin-bottom: 12px; opacity: 0.5;">🔍</div>
        <div style="font-size: 14px;">No bookmarks found</div>
      </div>
    `;
    return;
  }

  bookmarkList.innerHTML = '';
  renderNodes(filtered, bookmarkList);

  // Add a drop zone at the end of the root to allow dropping items there
  const dropZone = document.createElement('div');
  dropZone.className = 'root-drop-zone';
  dropZone.dataset.id = 'root-end';
  dropZone.style.minHeight = '40px';
  dropZone.style.marginTop = '12px';

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dropZone.classList.add('drop-active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-active');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drop-active');

    const draggedId = e.dataTransfer.getData('text/plain');
    await handleDropToRoot(draggedId);
  });

  bookmarkList.appendChild(dropZone);
}

// Create a drop zone element that fills the gap between items
function createDropZone(parentId, targetIndex) {
  const dropZone = document.createElement('div');
  dropZone.className = 'inter-item-drop-zone';
  dropZone.dataset.parentId = parentId;
  dropZone.dataset.targetIndex = targetIndex;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    dropZone.classList.add('drop-zone-active');
    console.log('[DropZone] Dragover at index', targetIndex, 'in parent', parentId);
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-zone-active');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drop-zone-active');

    const draggedId = e.dataTransfer.getData('text/plain');
    console.log('[DropZone] Drop at index', targetIndex, 'in parent', parentId);
    await handleDropToPosition(draggedId, parentId, targetIndex);
  });

  return dropZone;
}

// Recursively render bookmark nodes with drop zones between them
function renderNodes(nodes, container, parentId = 'root________') {
  const isRootLevel = (parentId === 'root________');

  nodes.forEach((node, index) => {
    // Add the actual item
    if (node.type === 'folder') {
      container.appendChild(createFolderElement(node));
    } else if (node.url) {
      container.appendChild(createBookmarkElement(node));
    }

    // Add a drop zone after this item
    // For root level: Don't add after the last item (root-drop-zone handles that)
    // For folders: Always add drop zone after each item for consistent spacing
    const isLastItem = (index === nodes.length - 1);
    if (!isLastItem || !isRootLevel) {
      const dropZone = createDropZone(parentId, index + 1);
      container.appendChild(dropZone);
    }
  });
}

// Get status icon HTML based on link status
function getStatusDotHtml(linkStatus) {
  const statusIcons = {
    'live': `
      <span class="status-icon status-live" title="Link is live and accessible
Returns successful HTTP response">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>
        </svg>
      </span>
    `,
    'dead': `
      <span class="status-icon status-dead" title="Link is dead or unreachable
Error, timeout, or connection failed">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>
        </svg>
      </span>
    `,
    'parked': `
      <span class="status-icon status-parked" title="Domain is parked
Redirects to domain parking service">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <g fill="currentColor">
            <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>
          </g>
          <g fill="#ef4444">
            <circle cx="18" cy="6" r="5"/>
            <text x="18" y="9.5" text-anchor="middle" font-size="10" font-weight="bold" fill="white">!</text>
          </g>
        </svg>
      </span>
    `,
    'checking': `
      <span class="status-icon status-checking" title="Checking link status...">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>
        </svg>
      </span>
    `,
    'unknown': `
      <span class="status-icon status-unknown" title="Status unknown">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>
        </svg>
      </span>
    `
  };

  return statusIcons[linkStatus] || statusIcons['unknown'];
}

// Get shield indicator HTML based on safety status
function getShieldHtml(safetyStatus, url) {
  const encodedUrl = encodeURIComponent(url);
  const shieldSvgs = {
    'safe': `
      <span class="shield-indicator shield-safe shield-clickable" data-url="${encodedUrl}" title="VirusTotal URL Scan:
Safe - No threats detected by VirusTotal
Click to view full report">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.18L16.59,7.59L18,9L10,17Z"/>
        </svg>
      </span>
    `,
    'warning': `
      <span class="shield-indicator shield-warning shield-clickable" data-url="${encodedUrl}" title="VirusTotal URL Scan:
Suspicious - Some security vendors flagged this URL
Click to view full report">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M13,7H11V13H13V7M13,17H11V15H13V17Z"/>
        </svg>
      </span>
    `,
    'unsafe': `
      <span class="shield-indicator shield-unsafe shield-clickable" data-url="${encodedUrl}" title="VirusTotal URL Scan:
Malicious - Multiple threats detected! DO NOT VISIT
Click to view full report">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.1,7 14,7.9 14,9V10.5L15.5,10.5C16.3,10.5 17,11.2 17,12V16C17,16.8 16.3,17.5 15.5,17.5H8.5C7.7,17.5 7,16.8 7,16V12C7,11.2 7.7,10.5 8.5,10.5H10V9C10,7.9 10.9,7 12,7M12,8.2C11.2,8.2 10.8,8.7 10.8,9V10.5H13.2V9C13.2,8.7 12.8,8.2 12,8.2Z"/>
        </svg>
      </span>
    `,
    'checking': `
      <span class="shield-indicator shield-scanning shield-clickable" data-url="${encodedUrl}" title="VirusTotal URL Scan:
Scanning with VirusTotal...
Click to view report">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z"/>
        </svg>
      </span>
    `,
    'unknown': `
      <span class="shield-indicator shield-unknown shield-clickable" data-url="${encodedUrl}" title="VirusTotal URL Scan:
Unable to scan - Link unreachable or not yet checked
Click to check on VirusTotal">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12.5,7V12.5H11V7H12.5M12.5,14V15.5H11V14H12.5Z"/>
        </svg>
      </span>
    `
  };

  return shieldSvgs[safetyStatus] || shieldSvgs['unknown'];
}

// Create folder element
function createFolderElement(folder) {
  const folderDiv = document.createElement('div');
  folderDiv.className = 'folder-item';
  folderDiv.dataset.id = folder.id;
  // Don't make the entire folderDiv draggable - only the header will be draggable

  const isExpanded = expandedFolders.has(folder.id);
  const childCount = countBookmarks(folder);

  folderDiv.innerHTML = `
    <div class="folder-header" draggable="true">
      <div class="folder-toggle ${isExpanded ? 'expanded' : ''}">▶</div>
      <div class="folder-icon-container">
        <svg class="folder-icon-outline" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"/>
        </svg>
        <div class="folder-count">${childCount}</div>
      </div>
      <div class="folder-title">${escapeHtml(folder.title || 'Unnamed Folder')}</div>
      <button class="bookmark-menu-btn folder-menu-btn">⋮</button>
      <div class="bookmark-actions">
        <button class="action-btn" data-action="rename">
          <span class="icon">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
            </svg>
          </span>
          <span>Rename</span>
        </button>
        <button class="action-btn danger" data-action="delete">
          <span class="icon">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
            </svg>
          </span>
          <span>Delete</span>
        </button>
      </div>
    </div>
    <div class="folder-children ${isExpanded ? 'show' : ''}" style="border-left: 2px solid #818cf8 !important;"></div>
  `;

  // Add click handler for folder toggle
  const header = folderDiv.querySelector('.folder-header');
  const menuBtn = header.querySelector('.folder-menu-btn');
  const actionsMenu = header.querySelector('.bookmark-actions');

  header.addEventListener('click', (e) => {
    // Don't toggle if clicking menu button or menu items
    if (e.target.closest('.folder-menu-btn') || e.target.closest('.bookmark-actions')) {
      return;
    }
    toggleFolder(folder.id, folderDiv);
  });

  // Add menu button handler
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFolderMenu(folderDiv);
  });

  // Add action button handlers
  actionsMenu.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      await handleFolderAction(action, folder);
      closeAllMenus();
    });
  });

  // Drag and drop handlers for folders (attach to header, not entire folderDiv)
  header.addEventListener('dragstart', (e) => {
    e.stopPropagation(); // Prevent event from bubbling to parent folders
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', folder.id);
    e.dataTransfer.setData('itemType', 'folder');
    folderDiv.style.opacity = '0.5';
  });

  header.addEventListener('dragend', () => {
    folderDiv.style.opacity = '1';
    removeAllDropIndicators();
  });

  // Attach dragover/drop to header only, not entire folderDiv
  // This prevents intercepting drag events for bookmarks/subfolders within this folder
  header.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation(); // Don't let this bubble to parent folders
    e.dataTransfer.dropEffect = 'move';
    handleDragOver(e, folderDiv);
  });

  header.addEventListener('dragleave', (e) => {
    if (!header.contains(e.relatedTarget)) {
      removeDropIndicator(folderDiv);
    }
  });

  header.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Read drop state BEFORE clearing indicators
    const dropBefore = folderDiv.classList.contains('drop-before');
    const dropAfter = folderDiv.classList.contains('drop-after');
    const dropInto = folderDiv.classList.contains('drop-into');

    removeAllDropIndicators();

    const draggedId = e.dataTransfer.getData('text/plain');
    await handleDrop(draggedId, folder.id, folderDiv, { dropBefore, dropAfter, dropInto });
  });

  // Render children if expanded
  if (isExpanded && folder.children) {
    const childContainer = folderDiv.querySelector('.folder-children');
    renderNodes(folder.children, childContainer, folder.id);
  }

  return folderDiv;
}

// Create bookmark element
function createBookmarkElement(bookmark) {
  const bookmarkDiv = document.createElement('div');
  bookmarkDiv.className = 'bookmark-item';
  bookmarkDiv.dataset.id = bookmark.id;
  bookmarkDiv.draggable = true;

  // Get link status (default to unknown)
  const linkStatus = bookmark.linkStatus || 'unknown';
  const safetyStatus = bookmark.safetyStatus || 'unknown';

  // Build status indicators HTML
  const statusDotHtml = getStatusDotHtml(linkStatus);
  const shieldHtml = getShieldHtml(safetyStatus, bookmark.url);

  // Build bookmark info HTML based on display options
  let bookmarkInfoHtml = '';
  if (displayOptions.title) {
    bookmarkInfoHtml += `<div class="bookmark-title">${escapeHtml(bookmark.title || bookmark.url)}</div>`;
  }
  if (displayOptions.url) {
    bookmarkInfoHtml += `<div class="bookmark-url">${escapeHtml(new URL(bookmark.url).hostname)}</div>`;
  }

  bookmarkDiv.innerHTML = `
    <div class="status-indicators">
      ${statusDotHtml}
      ${shieldHtml}
    </div>
    <div class="bookmark-info">
      ${bookmarkInfoHtml}
    </div>
    <button class="bookmark-menu-btn">⋮</button>
    <div class="bookmark-actions">
      <button class="action-btn" data-action="open">
        <span class="icon">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z"/>
          </svg>
        </span>
        <span>Open</span>
      </button>
      <button class="action-btn" data-action="open-new-tab">
        <span class="icon">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
          </svg>
        </span>
        <span>Open in New Tab</span>
      </button>
      <button class="action-btn" data-action="reader-view">
        <span class="icon">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M3,19V6H11V19H3M21,19H13V6H21V19M14,9.5H20V11H14V9.5M14,12H20V13.5H14V12M14,14.5H20V16H14V14.5Z"/>
          </svg>
        </span>
        <span>Open with Textise</span>
      </button>
      <button class="action-btn" data-action="save-pdf">
        <span class="icon">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.1,11.4C10.08,11.44 9.81,13.16 8,16.09C8,16.09 4.5,17.91 5.33,19.27C6,20.35 7.65,19.23 9.07,16.59C9.07,16.59 10.89,15.95 13.31,15.77C13.31,15.77 17.17,17.5 17.7,15.66C18.22,13.8 14.64,14.22 14,14.41C14,14.41 12,13.06 11.5,11.2C11.5,11.2 12.64,7.25 10.89,7.3C9.14,7.35 9.8,10.43 10.1,11.4M10.91,12.44C10.94,12.45 11.38,13.65 12.8,14.9C12.8,14.9 10.47,15.36 9.41,15.8C9.41,15.8 10.41,14.07 10.91,12.44M14.84,15.16C15.42,15 17,14.91 16.88,15.45C16.78,15.97 14.88,15.23 14.84,15.16M10.58,10.34C10.58,10.34 9.7,8.24 10.38,8.23C11.07,8.22 10.88,10.05 10.58,10.34Z"/>
          </svg>
        </span>
        <span>Save Page as PDF</span>
      </button>
      <button class="action-btn" data-action="edit">
        <span class="icon">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
          </svg>
        </span>
        <span>Edit</span>
      </button>
      <button class="action-btn" data-action="recheck">
        <span class="icon">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </span>
        <span>Recheck with VirusTotal</span>
      </button>
      <button class="action-btn danger" data-action="delete">
        <span class="icon">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
          </svg>
        </span>
        <span>Delete</span>
      </button>
    </div>
    <div class="bookmark-preview-container">
      <div class="preview-loading">Loading...</div>
      <img class="preview-image" alt="Preview" data-url="${escapeHtml(bookmark.url)}" />
    </div>
  `;

  // Add click handler for bookmark (open in current tab)
  bookmarkDiv.addEventListener('click', (e) => {
    // Don't open if clicking on menu, actions, preview, or status indicators
    if (e.target.closest('.bookmark-menu-btn') ||
        e.target.closest('.bookmark-actions') ||
        e.target.closest('.bookmark-preview-container') ||
        e.target.closest('.status-indicators')) {
      return;
    }
    window.open(bookmark.url, '_self');
  });

  // Add menu toggle handler
  const menuBtn = bookmarkDiv.querySelector('.bookmark-menu-btn');
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleBookmarkMenu(bookmarkDiv);
  });

  // Add action handlers
  const actions = bookmarkDiv.querySelectorAll('.action-btn');
  actions.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleBookmarkAction(btn.dataset.action, bookmark);
      closeAllMenus();
    });
  });

  // Drag and drop handlers
  bookmarkDiv.addEventListener('dragstart', (e) => {
    e.stopPropagation(); // Prevent event from bubbling to parent folders
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bookmark.id);
    e.dataTransfer.setData('itemType', 'bookmark');
    bookmarkDiv.style.opacity = '0.5';
  });

  bookmarkDiv.addEventListener('dragend', () => {
    bookmarkDiv.style.opacity = '1';
    removeAllDropIndicators();
  });

  bookmarkDiv.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation(); // Don't let this bubble to parent folder header
    e.dataTransfer.dropEffect = 'move';
    handleDragOver(e, bookmarkDiv);
  });

  bookmarkDiv.addEventListener('dragleave', (e) => {
    if (!bookmarkDiv.contains(e.relatedTarget)) {
      removeDropIndicator(bookmarkDiv);
    }
  });

  bookmarkDiv.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Read drop state BEFORE clearing indicators
    const dropBefore = bookmarkDiv.classList.contains('drop-before');
    const dropAfter = bookmarkDiv.classList.contains('drop-after');

    removeAllDropIndicators();

    const draggedId = e.dataTransfer.getData('text/plain');
    await handleDrop(draggedId, bookmark.id, bookmarkDiv, { dropBefore, dropAfter, dropInto: false });
  });

  // Preview hover handler - load image on first hover
  const previewContainer = bookmarkDiv.querySelector('.bookmark-preview-container');
  const previewImage = bookmarkDiv.querySelector('.preview-image');
  const previewLoading = bookmarkDiv.querySelector('.preview-loading');
  let previewLoaded = false;

  // Prevent all interactions with preview (clicks, drags, context menu)
  previewContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  previewContainer.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  previewContainer.addEventListener('contextmenu', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  previewImage.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });

  bookmarkDiv.addEventListener('mouseenter', () => {
    if (!previewLoaded && bookmark.url) {
      const previewUrl = getPreviewUrl(bookmark.url);

      if (previewUrl) {
        previewLoading.style.display = 'flex';
        previewLoading.textContent = 'Loading...';

        previewImage.onload = () => {
          previewLoading.style.display = 'none';
          previewImage.classList.add('loaded');
          previewLoaded = true;
        };

        previewImage.onerror = () => {
          previewLoading.textContent = 'No preview';
          previewLoaded = true;
        };

        previewImage.src = previewUrl;
      } else {
        previewLoading.textContent = 'No preview';
      }
    }
  });

  return bookmarkDiv;
}

// Get preview URL for a bookmark
function getPreviewUrl(url) {
  // Using WordPress mshots service (same as React webapp)
  try {
    const encodedUrl = encodeURIComponent(url);
    return `https://s.wordpress.com/mshots/v1/${encodedUrl}?w=320&h=180`;
  } catch (error) {
    console.error('Error generating preview URL:', error);
    return '';
  }
}

// Drag and drop helper functions
function handleDragOver(e, targetElement) {
  const rect = targetElement.getBoundingClientRect();
  const height = rect.height;
  const y = e.clientY - rect.top;

  // For folders, support dropping INTO them (middle third) or before/after (top/bottom thirds)
  const isFolderItem = targetElement.classList.contains('folder-item');

  removeAllDropIndicators();

  if (isFolderItem) {
    // Divide folder into three zones: top 20%, middle 60%, bottom 20%
    // Smaller before/after zones make drop-into more prominent
    if (y < height * 0.2) {
      targetElement.classList.add('drop-before');
    } else if (y > height * 0.8) {
      targetElement.classList.add('drop-after');
    } else {
      // Middle zone - drop INTO the folder
      targetElement.classList.add('drop-into');
    }
  } else {
    // For bookmarks, use 50/50 split for equal drop zones
    // Top half = drop before, bottom half = drop after
    if (y < height * 0.5) {
      targetElement.classList.add('drop-before');
    } else {
      targetElement.classList.add('drop-after');
    }
  }
}

function removeDropIndicator(element) {
  element.classList.remove('drop-before', 'drop-after', 'drop-into');
}

function removeAllDropIndicators() {
  document.querySelectorAll('.drop-before, .drop-after, .drop-into').forEach(el => {
    el.classList.remove('drop-before', 'drop-after', 'drop-into');
  });
}

async function handleDropToRoot(draggedId) {
  // Drop at the end of root (after all root items)
  const draggedItem = findBookmarkById(bookmarkTree, draggedId);
  if (!draggedItem) {
    console.error('Could not find dragged item');
    return;
  }

  if (isPreviewMode) {
    console.log(`Preview mode: Moving ${draggedId} to end of root`);

    // Get dragged item's current position
    const draggedParent = findParentById(bookmarkTree, draggedId);

    // Remove item from its current location
    if (draggedParent) {
      draggedParent.children = draggedParent.children.filter(child => child.id !== draggedId);
    } else {
      bookmarkTree = bookmarkTree.filter(item => item.id !== draggedId);
    }

    // Add to end of root
    bookmarkTree.push(draggedItem);

    // Re-render to show the changes
    renderBookmarks();
    return;
  }

  try {
    // Move to root at the last position
    await browser.bookmarks.move(draggedId, {
      parentId: undefined,
      index: bookmarkTree.length
    });

    await loadBookmarks();
    renderBookmarks();
  } catch (error) {
    console.error('Error moving to root:', error);
    alert('Failed to move item');
  }
}

async function handleDropToPosition(draggedId, targetParentId, targetIndex) {
  const draggedItem = findBookmarkById(bookmarkTree, draggedId);
  if (!draggedItem) {
    console.error('Could not find dragged item');
    return;
  }

  if (isPreviewMode) {
    console.log(`Preview mode: Moving ${draggedId} to index ${targetIndex} in parent ${targetParentId}`);

    // Get dragged item's current position
    const draggedParent = findParentById(bookmarkTree, draggedId);
    let draggedIndex = -1;

    // Remove item from its current location
    if (draggedParent) {
      draggedIndex = draggedParent.children.findIndex(child => child.id === draggedId);
      draggedParent.children = draggedParent.children.filter(child => child.id !== draggedId);
    } else {
      draggedIndex = bookmarkTree.findIndex(item => item.id === draggedId);
      bookmarkTree = bookmarkTree.filter(item => item.id !== draggedId);
    }

    // Adjust target index if moving within same parent and from earlier position
    let adjustedIndex = targetIndex;
    const isSameParent = (draggedParent?.id || 'root________') === targetParentId;
    if (isSameParent && draggedIndex < targetIndex) {
      adjustedIndex = targetIndex - 1;
    }

    // Insert item at the new location
    if (targetParentId === 'root________') {
      bookmarkTree.splice(adjustedIndex, 0, draggedItem);
    } else {
      const targetParent = findBookmarkById(bookmarkTree, targetParentId);
      if (targetParent && targetParent.children) {
        targetParent.children.splice(adjustedIndex, 0, draggedItem);
      }
    }

    // Re-render to show the changes
    renderBookmarks();
    return;
  }

  try {
    await browser.bookmarks.move(draggedId, {
      parentId: targetParentId === 'root________' ? undefined : targetParentId,
      index: targetIndex
    });

    await loadBookmarks();
    renderBookmarks();
  } catch (error) {
    console.error('Error moving to position:', error);
    alert('Failed to move item');
  }
}

async function handleDrop(draggedId, targetId, targetElement, dropState) {
  if (draggedId === targetId) return; // Can't drop on itself

  try {
    // Get the position to drop (before, after, or into target)
    const dropBefore = dropState.dropBefore;
    const dropInto = dropState.dropInto;

    // Find the dragged and target items in the tree
    const draggedItem = findBookmarkById(bookmarkTree, draggedId);
    const targetItem = findBookmarkById(bookmarkTree, targetId);

    if (!draggedItem || !targetItem) {
      console.error('Could not find dragged or target item');
      return;
    }

    // Determine the parent and index based on drop type
    let targetParentId;
    let targetIndex;

    if (dropInto && targetItem.type === 'folder') {
      // Dropping INTO a folder - item becomes child at index 0
      targetParentId = targetItem.id;
      targetIndex = 0;
    } else {
      // Dropping BEFORE or AFTER - item goes next to target in target's parent
      const targetParent = findParentById(bookmarkTree, targetId);
      targetParentId = targetParent ? targetParent.id : undefined;

      // Get target's index in its parent
      if (targetParent) {
        targetIndex = targetParent.children.findIndex(child => child.id === targetId);
      } else {
        targetIndex = bookmarkTree.findIndex(item => item.id === targetId);
      }

      // Calculate new index based on drop position
      targetIndex = dropBefore ? targetIndex : targetIndex + 1;
    }

    // Check if dropping a folder into itself or its descendants (prevent invalid moves)
    if (draggedItem.type === 'folder' && targetParentId) {
      let currentParent = findBookmarkById(bookmarkTree, targetParentId);
      while (currentParent) {
        if (currentParent.id === draggedId) {
          console.log('Cannot drop folder into itself or its descendants');
          return;
        }
        currentParent = findParentById(bookmarkTree, currentParent.id);
      }
    }

    const newIndex = targetIndex;

    if (isPreviewMode) {
      // In preview mode, actually move the item in the mock tree
      const dropType = dropInto ? 'into' : (dropBefore ? 'before' : 'after');
      console.log(`Preview mode: Moving ${draggedId} ${dropType} ${targetId}`);

      // Get dragged item's current position
      const draggedParent = findParentById(bookmarkTree, draggedId);
      const draggedParentId = draggedParent ? draggedParent.id : undefined;

      let draggedIndex;
      if (draggedParent) {
        draggedIndex = draggedParent.children.findIndex(child => child.id === draggedId);
      } else {
        draggedIndex = bookmarkTree.findIndex(item => item.id === draggedId);
      }

      // Check if moving within same parent
      const isSameParent = draggedParentId === targetParentId;

      // Adjust newIndex if moving within same parent and moving forward
      let adjustedIndex = newIndex;
      if (isSameParent && !dropInto && newIndex > draggedIndex) {
        adjustedIndex = newIndex - 1;
        console.log(`Preview mode: Adjusted index from ${newIndex} to ${adjustedIndex} (same parent move)`);
      }

      // Remove item from its current location
      if (draggedParent) {
        draggedParent.children = draggedParent.children.filter(child => child.id !== draggedId);
      } else {
        bookmarkTree = bookmarkTree.filter(item => item.id !== draggedId);
      }

      // Insert item at new location
      const newParent = targetParentId ? findBookmarkById(bookmarkTree, targetParentId) : null;
      if (newParent) {
        if (!newParent.children) newParent.children = [];
        newParent.children.splice(adjustedIndex, 0, draggedItem);
      } else {
        bookmarkTree.splice(adjustedIndex, 0, draggedItem);
      }

      // Re-render to show the changes
      renderBookmarks();
      return;
    }

    // Move the bookmark using Firefox API
    await browser.bookmarks.move(draggedId, {
      parentId: targetParentId,
      index: newIndex
    });

    // Reload and re-render
    await loadBookmarks();
    renderBookmarks();
  } catch (error) {
    console.error('Error moving bookmark:', error);
    alert('Failed to move item');
  }
}

// Helper function to find bookmark by ID in tree
function findBookmarkById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findBookmarkById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to find parent of bookmark by ID
function findParentById(nodes, childId, parent = null) {
  for (const node of nodes) {
    if (node.id === childId) return parent;
    if (node.children) {
      const found = findParentById(node.children, childId, node);
      if (found) return found;
    }
  }
  return null;
}

// Toggle folder expanded state
function toggleFolder(folderId, folderElement) {
  const isExpanded = expandedFolders.has(folderId);

  if (isExpanded) {
    expandedFolders.delete(folderId);
  } else {
    expandedFolders.add(folderId);
  }

  // Re-render to reflect changes
  renderBookmarks();
}

// Toggle bookmark menu
function toggleBookmarkMenu(bookmarkDiv) {
  const menu = bookmarkDiv.querySelector('.bookmark-actions');
  const isOpen = menu.classList.contains('show');

  // Close all other menus
  closeAllMenus();

  // Toggle this menu
  if (!isOpen) {
    menu.classList.add('show');
  }
}

// Toggle folder menu
function toggleFolderMenu(folderDiv) {
  const menu = folderDiv.querySelector('.bookmark-actions');
  const isOpen = menu.classList.contains('show');

  // Close all other menus
  closeAllMenus();

  // Toggle this menu
  if (!isOpen) {
    menu.classList.add('show');
  }
}

// Handle folder actions
async function handleFolderAction(action, folder) {
  switch (action) {
    case 'rename':
      openEditModal(folder, true);
      break;

    case 'delete':
      // SAFETY: Enhanced confirmation showing number of items to be deleted
      const itemCount = await countFolderItems(folder.id);
      const warningMessage = itemCount > 0
        ? `⚠ Delete folder "${folder.title}" and ALL ${itemCount} item(s) inside?\n\nThis action cannot be undone!`
        : `Delete empty folder "${folder.title}"?`;

      if (confirm(warningMessage)) {
        await deleteFolder(folder.id);
      }
      break;
  }
}

// SAFETY: Count total items in a folder (recursive)
async function countFolderItems(folderId) {
  if (isPreviewMode) {
    // Count items in mock data
    const folder = findFolderById(folderId, bookmarkTree);
    if (!folder || !folder.children) return 0;

    let count = 0;
    const countRecursive = (items) => {
      for (const item of items) {
        count++;
        if (item.children) {
          countRecursive(item.children);
        }
      }
    };
    countRecursive(folder.children);
    return count;
  }

  try {
    const subtree = await browser.bookmarks.getSubTree(folderId);
    if (!subtree[0] || !subtree[0].children) return 0;

    let count = 0;
    const countRecursive = (items) => {
      for (const item of items) {
        count++;
        if (item.children) {
          countRecursive(item.children);
        }
      }
    };
    countRecursive(subtree[0].children);
    return count;
  } catch (error) {
    console.error('Error counting folder items:', error);
    return 0;
  }
}

// Helper to find folder by ID in mock data
function findFolderById(id, items) {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findFolderById(id, item.children);
      if (found) return found;
    }
  }
  return null;
}

// Delete folder
async function deleteFolder(id) {
  if (isPreviewMode) {
    alert('✓ In preview mode. In the real extension, this would delete the folder.');
    return;
  }

  // SAFETY: Prevent deletion of Firefox's built-in bookmark folders
  const protectedFolderIds = ['menu________', 'toolbar_____', 'unfiled_____', 'mobile______'];
  if (protectedFolderIds.includes(id)) {
    alert('⚠ Cannot delete built-in Firefox bookmark folders (Bookmarks Menu, Bookmarks Toolbar, Other Bookmarks, Mobile Bookmarks).\n\nThis is a safety feature to protect your bookmark structure.');
    return;
  }

  try {
    await browser.bookmarks.removeTree(id);
    await loadBookmarks();
    renderBookmarks();
  } catch (error) {
    console.error('Error deleting folder:', error);
    alert('Failed to delete folder');
  }
}

// Adjust dropdown position to prevent overflow
function adjustDropdownPosition(dropdown) {
  if (!dropdown) return;

  // Reset any previous adjustments
  dropdown.style.left = '';
  dropdown.style.right = '';
  dropdown.style.transform = '';

  // Wait for next frame to ensure menu is visible and has dimensions
  requestAnimationFrame(() => {
    const rect = dropdown.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Check horizontal overflow
    if (rect.right > viewportWidth) {
      // Menu extends beyond right edge
      const overflow = rect.right - viewportWidth;
      dropdown.style.right = '0';
      dropdown.style.transform = `translateX(-${overflow + 8}px)`;
    } else if (rect.left < 0) {
      // Menu extends beyond left edge
      dropdown.style.left = '0';
      dropdown.style.right = 'auto';
    }

    // Check vertical overflow
    if (rect.bottom > viewportHeight) {
      // Menu extends beyond bottom edge - show above button instead
      dropdown.style.top = 'auto';
      dropdown.style.bottom = '100%';
      dropdown.style.marginBottom = '4px';
      dropdown.style.marginTop = '0';
    }
  });
}

// Close all open menus
function closeAllMenus() {
  document.querySelectorAll('.bookmark-actions.show').forEach(menu => {
    menu.classList.remove('show');
  });
  settingsMenu.classList.remove('show');
  themeMenu.classList.remove('show');
  viewMenu.classList.remove('show');
  zoomMenu.classList.remove('show');
}

// Check link status using background script
async function checkLinkStatus(url) {
  if (isPreviewMode) {
    // Simulate checking in preview mode
    return new Promise(resolve => {
      setTimeout(() => {
        // Random status for demo
        const statuses = ['live', 'live', 'live', 'dead'];
        resolve(statuses[Math.floor(Math.random() * statuses.length)]);
      }, 500);
    });
  }

  try {
    const response = await browser.runtime.sendMessage({
      action: 'checkLinkStatus',
      url: url
    });
    return response.status || 'unknown';
  } catch (error) {
    console.error('Error checking link status:', error);
    return 'unknown';
  }
}

// Check URL safety with VirusTotal (placeholder - requires API key configuration)
async function checkSafetyStatus(url) {
  if (isPreviewMode) {
    // Simulate checking in preview mode
    return new Promise(resolve => {
      setTimeout(() => {
        // Mostly safe, some warnings, rare unsafe for demo
        const statuses = ['safe', 'safe', 'safe', 'safe', 'warning', 'unsafe'];
        resolve(statuses[Math.floor(Math.random() * statuses.length)]);
      }, 800);
    });
  }

  // In real extension, this would call VirusTotal API via background script
  // For now, return unknown until VirusTotal API key is configured
  return 'unknown';
}

// Recheck bookmark status (link + safety)
async function recheckBookmarkStatus(bookmarkId) {
  // Find the bookmark in the tree
  const bookmark = findBookmarkById(bookmarkTree, bookmarkId);
  if (!bookmark || !bookmark.url) return;

  if (isPreviewMode) {
    alert('🔄 Rechecking bookmark status...\n\nIn the real extension, this would check:\n• Link status (live/dead/parked)\n• VirusTotal safety scan');
  }

  // Update bookmark to show checking status
  updateBookmarkInTree(bookmarkId, {
    linkStatus: 'checking',
    safetyStatus: 'checking'
  });
  renderBookmarks();

  // Perform checks
  const [linkStatus, safetyStatus] = await Promise.all([
    checkLinkStatus(bookmark.url),
    checkSafetyStatus(bookmark.url)
  ]);

  // Update bookmark with results
  updateBookmarkInTree(bookmarkId, {
    linkStatus,
    safetyStatus
  });
  renderBookmarks();
}

// Find bookmark by ID in tree
function findBookmarkById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.type === 'folder' && node.children) {
      const found = findBookmarkById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Update bookmark in tree
function updateBookmarkInTree(bookmarkId, updates) {
  const updateNode = (nodes) => {
    return nodes.map(node => {
      if (node.id === bookmarkId) {
        return { ...node, ...updates };
      }
      if (node.type === 'folder' && node.children) {
        return { ...node, children: updateNode(node.children) };
      }
      return node;
    });
  };
  bookmarkTree = updateNode(bookmarkTree);
}

// Handle bookmark actions
async function handleBookmarkAction(action, bookmark) {
  switch (action) {
    case 'open':
      window.open(bookmark.url, '_self');
      break;

    case 'open-new-tab':
      window.open(bookmark.url, '_blank');
      break;

    case 'reader-view':
      // Open in text-only view using Textise
      const textiseUrl = `https://www.textise.net/showText.aspx?strURL=${encodeURIComponent(bookmark.url)}`;
      if (isPreviewMode) {
        window.open(textiseUrl, '_blank');
      } else {
        browser.tabs.create({ url: textiseUrl });
      }
      break;

    case 'save-pdf':
      // Save page as PDF
      if (isPreviewMode) {
        // In preview mode, open the page and show instructions
        window.open(bookmark.url, '_blank');
        setTimeout(() => {
          alert('Page opened in a new tab. To save as PDF:\n\n1. Wait for the page to load\n2. Press Ctrl+P (or Cmd+P on Mac)\n3. Select "Save as PDF" as the destination\n4. Click "Save"');
        }, 500);
      } else {
        // Open the page in a new tab and save as PDF
        const tab = await browser.tabs.create({ url: bookmark.url });

        // Wait for the page to load before saving as PDF
        const listener = (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            browser.tabs.onUpdated.removeListener(listener);
            // Trigger the save as PDF action
            browser.tabs.saveAsPDF(tab.id).then(() => {
              console.log('PDF save initiated');
            }).catch(err => {
              console.error('Failed to save PDF:', err);
              alert('Failed to save page as PDF. Please try using the browser\'s built-in print-to-PDF feature.');
            });
          }
        };
        browser.tabs.onUpdated.addListener(listener);
      }
      break;

    case 'edit':
      editBookmark(bookmark);
      break;

    case 'recheck':
      await recheckBookmarkStatus(bookmark.id);
      break;

    case 'delete':
      if (confirm(`Delete "${bookmark.title}"?`)) {
        await deleteBookmark(bookmark.id);
      }
      break;
  }
}

// Open edit modal
function openEditModal(item, isFolder = false) {
  currentEditItem = item;

  const modal = document.getElementById('editModal');
  const modalTitle = document.getElementById('editModalTitle');
  const editTitle = document.getElementById('editTitle');
  const editUrl = document.getElementById('editUrl');
  const editUrlGroup = document.getElementById('editUrlGroup');

  // Set modal title
  modalTitle.textContent = isFolder ? 'Rename Folder' : 'Edit Bookmark';

  // Populate fields
  editTitle.value = item.title || '';

  if (isFolder) {
    // Hide URL field for folders
    editUrlGroup.style.display = 'none';
  } else {
    // Show URL field for bookmarks
    editUrlGroup.style.display = 'block';
    editUrl.value = item.url || '';
  }

  modal.classList.remove('hidden');
  editTitle.focus();
}

// Close edit modal
function closeEditModal() {
  const modal = document.getElementById('editModal');
  modal.classList.add('hidden');
  currentEditItem = null;
}

// Save edit modal
async function saveEditModal() {
  if (!currentEditItem) return;

  const editTitle = document.getElementById('editTitle');
  const editUrl = document.getElementById('editUrl');

  const isFolder = !currentEditItem.url;
  const updates = { title: editTitle.value };

  if (!isFolder) {
    updates.url = editUrl.value;
  }

  if (isPreviewMode) {
    alert('✓ In preview mode. In the real extension, this would update the ' + (isFolder ? 'folder' : 'bookmark') + '.');
    closeEditModal();
    return;
  }

  try {
    await browser.bookmarks.update(currentEditItem.id, updates);
    await loadBookmarks();
    renderBookmarks();
    closeEditModal();
  } catch (error) {
    console.error('Error updating:', error);
    alert('Failed to update ' + (isFolder ? 'folder' : 'bookmark'));
  }
}

// Edit bookmark (legacy wrapper)
async function editBookmark(bookmark) {
  openEditModal(bookmark, false);
}

// Delete bookmark
async function deleteBookmark(id) {
  if (isPreviewMode) {
    alert('✓ In preview mode. In the real extension, this would delete the bookmark.');
    return;
  }

  try {
    await browser.bookmarks.remove(id);
    await loadBookmarks();
    renderBookmarks();
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    alert('Failed to delete bookmark');
  }
}

// Build folder list for dropdowns
function buildFolderList(nodes, indent = 0) {
  const folders = [];
  for (const node of nodes) {
    if (node.type === 'folder') {
      folders.push({
        id: node.id,
        title: '  '.repeat(indent) + (node.title || 'Unnamed Folder'),
        indent
      });
      if (node.children) {
        folders.push(...buildFolderList(node.children, indent + 1));
      }
    }
  }
  return folders;
}

// Populate folder dropdown
function populateFolderDropdown(selectElement) {
  const folders = buildFolderList(bookmarkTree);
  selectElement.innerHTML = '<option value="">Root</option>';
  folders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.title;
    selectElement.appendChild(option);
  });
}

// Open add bookmark modal
async function openAddBookmarkModal() {
  const modal = document.getElementById('addBookmarkModal');
  const titleInput = document.getElementById('newBookmarkTitle');
  const urlInput = document.getElementById('newBookmarkUrl');
  const folderSelect = document.getElementById('newBookmarkFolder');

  // Try to get the current active tab to pre-populate fields
  if (!isPreviewMode) {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        const currentTab = tabs[0];
        titleInput.value = currentTab.title || '';
        urlInput.value = currentTab.url || '';
      } else {
        titleInput.value = '';
        urlInput.value = '';
      }
    } catch (error) {
      console.error('Error getting current tab:', error);
      titleInput.value = '';
      urlInput.value = '';
    }
  } else {
    // Preview mode: show example data
    titleInput.value = 'Current Tab Title';
    urlInput.value = 'https://example.com/current-page';
  }

  populateFolderDropdown(folderSelect);

  modal.classList.remove('hidden');
  titleInput.focus();
  // Select all text in title for easy editing
  titleInput.select();
}

// Close add bookmark modal
function closeAddBookmarkModal() {
  const modal = document.getElementById('addBookmarkModal');
  modal.classList.add('hidden');
}

// Save new bookmark
async function saveNewBookmark() {
  const title = document.getElementById('newBookmarkTitle').value;
  const url = document.getElementById('newBookmarkUrl').value;
  const parentId = document.getElementById('newBookmarkFolder').value || undefined;

  if (!url) {
    alert('Please enter a URL');
    return;
  }

  if (isPreviewMode) {
    alert('✓ In preview mode. In the real extension, this would create a new bookmark.');
    closeAddBookmarkModal();
    return;
  }

  try {
    // SAFETY: Check for duplicate bookmarks to prevent accidental duplication
    const existingBookmarks = await browser.bookmarks.search({ url });
    if (existingBookmarks.length > 0) {
      const duplicateInfo = existingBookmarks.map(b => `  • "${b.title}" in folder ${b.parentId}`).join('\n');
      const confirmed = confirm(
        `⚠ Warning: This URL already exists in your bookmarks:\n\n${duplicateInfo}\n\nDo you want to create a duplicate bookmark anyway?`
      );
      if (!confirmed) {
        closeAddBookmarkModal();
        return;
      }
    }

    await browser.bookmarks.create({
      title: title || url,
      url,
      parentId
    });
    await loadBookmarks();
    renderBookmarks();
    closeAddBookmarkModal();
  } catch (error) {
    console.error('Error creating bookmark:', error);
    alert('Failed to create bookmark');
  }
}

// Open add folder modal
function openAddFolderModal() {
  const modal = document.getElementById('addFolderModal');
  const nameInput = document.getElementById('newFolderName');
  const parentSelect = document.getElementById('newFolderParent');

  nameInput.value = '';
  populateFolderDropdown(parentSelect);

  modal.classList.remove('hidden');
  nameInput.focus();
}

// Close add folder modal
function closeAddFolderModal() {
  const modal = document.getElementById('addFolderModal');
  modal.classList.add('hidden');
}

// Save new folder
async function saveNewFolder() {
  const title = document.getElementById('newFolderName').value;
  const parentId = document.getElementById('newFolderParent').value || undefined;

  if (!title) {
    alert('Please enter a folder name');
    return;
  }

  if (isPreviewMode) {
    alert('✓ In preview mode. In the real extension, this would create a new folder.');
    closeAddFolderModal();
    return;
  }

  try {
    await browser.bookmarks.create({
      title,
      type: 'folder',
      parentId
    });
    await loadBookmarks();
    renderBookmarks();
    closeAddFolderModal();
  } catch (error) {
    console.error('Error creating folder:', error);
    alert('Failed to create folder');
  }
}

// Legacy function wrappers for compatibility
async function createNewBookmark() {
  openAddBookmarkModal();
}

async function createNewFolder() {
  openAddFolderModal();
}

// Filter and search bookmarks
function filterAndSearchBookmarks(nodes) {
  return nodes.reduce((acc, node) => {
    if (node.type === 'folder') {
      const filteredChildren = filterAndSearchBookmarks(node.children || []);
      if (filteredChildren.length > 0 || (!searchTerm && !activeFilter)) {
        acc.push({
          ...node,
          children: filteredChildren
        });
      }
    } else if (node.url) {
      if (matchesSearch(node) && matchesFilter(node)) {
        acc.push(node);
      }
    }
    return acc;
  }, []);
}

// Check if bookmark matches search
function matchesSearch(bookmark) {
  if (!searchTerm) return true;

  const term = searchTerm.toLowerCase();
  return (
    (bookmark.title && bookmark.title.toLowerCase().includes(term)) ||
    (bookmark.url && bookmark.url.toLowerCase().includes(term))
  );
}

// Check if bookmark matches filter
function matchesFilter(bookmark) {
  if (!activeFilter) return true;

  const linkStatus = bookmark.linkStatus || 'unknown';
  const safetyStatus = bookmark.safetyStatus || 'unknown';

  switch (activeFilter) {
    case 'live':
      return linkStatus === 'live';
    case 'parked':
      return linkStatus === 'parked';
    case 'dead':
      return linkStatus === 'dead';
    case 'safe':
      return safetyStatus === 'safe';
    case 'suspicious':
      return safetyStatus === 'warning';
    case 'unsafe':
      return safetyStatus === 'unsafe';
    default:
      return true;
  }
}

// Count bookmarks in folder
function countBookmarks(folder) {
  if (!folder.children) return 0;

  return folder.children.reduce((count, child) => {
    if (child.type === 'folder') {
      return count + countBookmarks(child);
    } else if (child.url) {
      return count + 1;
    }
    return count;
  }, 0);
}

// Get favicon URL
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '';
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show error message
function showError(message) {
  bookmarkList.innerHTML = `
    <div style="text-align: center; padding: 40px 20px; color: var(--md-sys-color-error);">
      <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
      <div style="font-size: 14px;">${escapeHtml(message)}</div>
    </div>
  `;
}

// Open extension in new tab
async function openInNewTab() {
  if (isPreviewMode) {
    alert('🗗 In the Firefox extension, this would open Bookmark Manager Zero in a new tab for a full-page view.');
    return;
  }

  try {
    // Get the extension's URL for the sidebar page
    const extensionUrl = browser.runtime.getURL('sidebar.html');
    // Open it in a new tab
    await browser.tabs.create({ url: extensionUrl });
  } catch (error) {
    console.error('Error opening in new tab:', error);
    alert('Failed to open in new tab');
  }
}

// Switch sidebar side
async function switchSidebarSide() {
  if (isPreviewMode) {
    alert('📍 In the Firefox extension, you can move the sidebar:\n\n1. Right-click the sidebar\n2. Select "Move Sidebar to Right/Left"\n\nOr use: View → Sidebar → Move Sidebar');
    return;
  }

  try {
    // Get current window
    const currentWindow = await browser.windows.getCurrent();

    // Firefox doesn't have a direct API to switch sidebar sides
    // We'll store a preference and inform the user
    const result = await browser.storage.local.get('sidebarSide');
    const currentSide = result.sidebarSide || 'left';
    const newSide = currentSide === 'left' ? 'right' : 'left';

    await browser.storage.local.set({ sidebarSide: newSide });

    alert(`Sidebar side preference saved!\n\nTo change the sidebar position in Firefox:\n1. Right-click the sidebar\n2. Select "Move Sidebar to ${newSide === 'right' ? 'Right' : 'Left'}"\n\nOr use View > Sidebar > Move Sidebar`);

  } catch (error) {
    console.error('Error switching sidebar:', error);
    alert('To move the sidebar:\n1. Right-click the sidebar\n2. Select "Move Sidebar to Right/Left"\n\nOr use: View > Sidebar > Move Sidebar');
  }
}

// SAFETY: Export bookmarks as JSON backup
async function exportBookmarks() {
  try {
    let data;

    if (isPreviewMode) {
      // Export mock data in preview mode
      data = bookmarkTree;
    } else {
      // Export actual bookmarks
      const tree = await browser.bookmarks.getTree();
      data = tree;
    }

    // Create JSON file
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Generate filename with timestamp
    const date = new Date().toISOString().split('T')[0];
    const filename = `bookmarks-backup-${date}.json`;

    // Create download link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`✓ Bookmarks exported successfully!\n\nFile: ${filename}\n\nThis backup can be imported back into Firefox via:\nBookmarks → Manage Bookmarks → Import and Backup → Restore → Choose File`);
  } catch (error) {
    console.error('Error exporting bookmarks:', error);
    alert('Failed to export bookmarks. Please try again.');
  }
}

// DUPLICATE DETECTION: Find and manage duplicate bookmarks
async function findDuplicates() {
  try {
    let allBookmarks = [];

    if (isPreviewMode) {
      // Use mock data in preview mode
      allBookmarks = getAllBookmarksFlat(bookmarkTree);
    } else {
      // Get all bookmarks from Firefox
      const tree = await browser.bookmarks.getTree();
      allBookmarks = getAllBookmarksFlat(tree);
    }

    // Group bookmarks by URL
    const urlMap = new Map();
    for (const bookmark of allBookmarks) {
      if (bookmark.url) { // Only process bookmarks (not folders)
        if (!urlMap.has(bookmark.url)) {
          urlMap.set(bookmark.url, []);
        }
        urlMap.get(bookmark.url).push(bookmark);
      }
    }

    // Find duplicates (URLs with more than one bookmark)
    const duplicates = [];
    for (const [url, bookmarks] of urlMap.entries()) {
      if (bookmarks.length > 1) {
        duplicates.push({ url, bookmarks });
      }
    }

    if (duplicates.length === 0) {
      alert('✓ No duplicate bookmarks found!\n\nAll your bookmarks have unique URLs.');
      return;
    }

    // Show duplicates modal
    showDuplicatesModal(duplicates);

  } catch (error) {
    console.error('Error finding duplicates:', error);
    alert('Failed to scan for duplicates. Please try again.');
  }
}

// Helper: Get all bookmarks from tree (recursive, flattened)
function getAllBookmarksFlat(tree, parentPath = '') {
  let bookmarks = [];

  const processNode = (node, path) => {
    if (node.url) {
      // It's a bookmark
      bookmarks.push({
        ...node,
        parentPath: path
      });
    }
    if (node.children) {
      // It's a folder - process children
      const newPath = path ? `${path} > ${node.title || 'Untitled'}` : node.title || 'Root';
      for (const child of node.children) {
        processNode(child, newPath);
      }
    }
  };

  if (Array.isArray(tree)) {
    for (const node of tree) {
      processNode(node, parentPath);
    }
  } else {
    processNode(tree, parentPath);
  }

  return bookmarks;
}

// Show duplicates modal
function showDuplicatesModal(duplicates) {
  const modal = document.getElementById('duplicatesModal');
  const content = document.getElementById('duplicatesContent');

  // Build HTML for duplicates
  let html = `
    <div style="margin-bottom: 1rem;">
      <p><strong>Found ${duplicates.length} URL(s) with duplicates (${duplicates.reduce((sum, d) => sum + d.bookmarks.length, 0)} total bookmarks)</strong></p>
      <p style="color: #666; font-size: 0.9rem;">Select the bookmarks you want to delete:</p>
    </div>
  `;

  for (const duplicate of duplicates) {
    html += `
      <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.05); border-radius: 6px; border: 1px solid rgba(59, 130, 246, 0.2);">
        <div style="margin-bottom: 0.75rem;">
          <strong style="color: #1e40af;">URL:</strong>
          <a href="${duplicate.url}" target="_blank" style="color: #2563eb; text-decoration: none; word-break: break-all;">${duplicate.url}</a>
        </div>
        <div style="margin-left: 1rem;">
    `;

    for (const bookmark of duplicate.bookmarks) {
      html += `
        <div style="margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
          <input type="checkbox"
                 id="dup-${bookmark.id}"
                 data-bookmark-id="${bookmark.id}"
                 class="duplicate-checkbox"
                 style="cursor: pointer;">
          <label for="dup-${bookmark.id}" style="cursor: pointer; flex: 1;">
            <span style="font-weight: 500;">${bookmark.title || 'Untitled'}</span>
            <span style="color: #666; font-size: 0.85rem;"> - in ${bookmark.parentPath || 'Root'}</span>
          </label>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;
  }

  content.innerHTML = html;
  modal.classList.remove('hidden');
}

// Close duplicates modal
function closeDuplicatesModal() {
  const modal = document.getElementById('duplicatesModal');
  modal.classList.add('hidden');
}

// Delete selected duplicates
async function deleteSelectedDuplicates() {
  const checkboxes = document.querySelectorAll('.duplicate-checkbox:checked');

  if (checkboxes.length === 0) {
    alert('Please select at least one bookmark to delete.');
    return;
  }

  const confirmed = confirm(`⚠ Delete ${checkboxes.length} selected bookmark(s)?\n\nThis action cannot be undone!`);
  if (!confirmed) return;

  if (isPreviewMode) {
    alert(`✓ In preview mode. In the real extension, this would delete ${checkboxes.length} bookmarks.`);
    closeDuplicatesModal();
    return;
  }

  try {
    let successCount = 0;
    let failCount = 0;

    for (const checkbox of checkboxes) {
      const bookmarkId = checkbox.dataset.bookmarkId;
      try {
        await browser.bookmarks.remove(bookmarkId);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete bookmark ${bookmarkId}:`, error);
        failCount++;
      }
    }

    // Reload bookmarks
    await loadBookmarks();
    renderBookmarks();

    // Close modal and show result
    closeDuplicatesModal();

    if (failCount === 0) {
      alert(`✓ Successfully deleted ${successCount} bookmark(s)!`);
    } else {
      alert(`⚠ Deleted ${successCount} bookmark(s).\n${failCount} failed to delete.`);
    }

  } catch (error) {
    console.error('Error deleting duplicates:', error);
    alert('An error occurred while deleting bookmarks.');
  }
}

// Close extension
async function closeExtension() {
  if (isPreviewMode) {
    alert('✕ In the Firefox extension, this would close the sidebar or tab.');
    return;
  }

  try {
    // Check if we're running in a sidebar or a tab
    const currentTab = await browser.tabs.getCurrent();

    if (currentTab && currentTab.id) {
      // We're in a tab, so close the tab
      await browser.tabs.remove(currentTab.id);
    } else {
      // We're in a sidebar, use sidebarAction to close it
      // Note: Firefox doesn't have a direct API to close sidebar programmatically
      // We'll try to close the window, which works for sidebar panels
      window.close();
    }
  } catch (error) {
    console.error('Error closing extension:', error);
    // Fallback: just try to close the window
    window.close();
  }
}

// Open VirusTotal report in new tab
async function openVirusTotalReport(url) {
  try {
    // Extract domain from URL for VirusTotal lookup
    let domain;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch (e) {
      // If URL parsing fails, try using the URL as-is
      domain = url.replace(/^https?:\/\//, '').split('/')[0];
    }

    // Create VirusTotal domain lookup URL
    const vtUrl = `https://www.virustotal.com/gui/domain/${domain}/detection`;

    if (isPreviewMode) {
      // In preview mode, use window.open since browser.tabs is not available
      window.open(vtUrl, '_blank');
    } else {
      // In extension mode, use browser.tabs.create for proper tab management
      await browser.tabs.create({ url: vtUrl });
    }
  } catch (error) {
    console.error('Error opening VirusTotal report:', error);
    alert('Failed to open VirusTotal report');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Search
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderBookmarks();
  });

  // Filter toggle
  filterToggle.addEventListener('click', () => {
    filterBar.classList.toggle('hidden');
  });

  // Display toggle
  displayToggle.addEventListener('click', () => {
    displayBar.classList.toggle('hidden');
  });

  // Display option toggles
  const displayTitle = document.getElementById('displayTitle');
  const displayUrl = document.getElementById('displayUrl');

  displayTitle.addEventListener('change', (e) => {
    // Ensure at least Title or URL is checked
    if (!e.target.checked && !displayUrl.checked) {
      e.target.checked = true;
      return;
    }
    displayOptions.title = e.target.checked;
    renderBookmarks();
  });

  displayUrl.addEventListener('change', (e) => {
    // Ensure at least Title or URL is checked
    if (!e.target.checked && !displayTitle.checked) {
      e.target.checked = true;
      return;
    }
    displayOptions.url = e.target.checked;
    renderBookmarks();
  });

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;

      if (activeFilter === filter) {
        activeFilter = null;
        chip.classList.remove('active');
      } else {
        // Remove active from all chips
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        activeFilter = filter;
        chip.classList.add('active');
      }

      renderBookmarks();
    });
  });

  // Theme menu
  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themeMenu.classList.toggle('show');
    if (themeMenu.classList.contains('show')) {
      adjustDropdownPosition(themeMenu);
    }
  });

  // Theme selection
  themeMenu.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.dataset.theme;
      setTheme(selectedTheme);
      closeAllMenus();
    });
  });

  // View menu
  viewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    viewMenu.classList.toggle('show');
    if (viewMenu.classList.contains('show')) {
      adjustDropdownPosition(viewMenu);
    }
  });

  // View selection
  viewMenu.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedView = btn.dataset.view;
      setView(selectedView);
      closeAllMenus();
    });
  });

  // Zoom menu
  zoomBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomMenu.classList.toggle('show');
    if (zoomMenu.classList.contains('show')) {
      adjustDropdownPosition(zoomMenu);
    }
  });

  // Zoom slider
  zoomSlider.addEventListener('input', (e) => {
    const newZoom = parseInt(e.target.value);
    setZoom(newZoom);
  });

  // Settings menu
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle('show');
    if (settingsMenu.classList.contains('show')) {
      adjustDropdownPosition(settingsMenu);
    }
  });

  // Open in new tab
  openInTabBtn.addEventListener('click', () => {
    openInNewTab();
    closeAllMenus();
  });

  // Switch sidebar side
  switchSideBtn.addEventListener('click', () => {
    switchSidebarSide();
    closeAllMenus();
  });

  // Export bookmarks (backup)
  exportBookmarksBtn.addEventListener('click', () => {
    exportBookmarks();
    closeAllMenus();
  });

  // Close extension
  closeExtensionBtn.addEventListener('click', () => {
    closeExtension();
    closeAllMenus();
  });

  // New bookmark
  document.getElementById('newBookmarkBtn').addEventListener('click', createNewBookmark);

  // New folder
  document.getElementById('newFolderBtn').addEventListener('click', createNewFolder);

  // Find duplicates
  document.getElementById('findDuplicatesBtn').addEventListener('click', findDuplicates);

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.bookmark-actions') && !e.target.closest('.bookmark-menu-btn') &&
        !e.target.closest('.settings-menu') && !e.target.closest('#settingsBtn')) {
      closeAllMenus();
    }
  });

  // Shield indicator click handler (open VirusTotal report)
  document.addEventListener('click', (e) => {
    const shield = e.target.closest('.shield-clickable');
    if (shield) {
      e.stopPropagation();
      const url = decodeURIComponent(shield.dataset.url);
      openVirusTotalReport(url);
    }
  });

  // Edit modal event listeners
  const editModal = document.getElementById('editModal');
  const editModalClose = document.getElementById('editModalClose');
  const editModalCancel = document.getElementById('editModalCancel');
  const editModalSave = document.getElementById('editModalSave');
  const editModalOverlay = editModal.querySelector('.modal-overlay');

  editModalClose.addEventListener('click', closeEditModal);
  editModalCancel.addEventListener('click', closeEditModal);
  editModalSave.addEventListener('click', saveEditModal);
  editModalOverlay.addEventListener('click', closeEditModal);

  // Allow Enter key to save in modal
  editModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEditModal();
    } else if (e.key === 'Escape') {
      closeEditModal();
    }
  });

  // Add Bookmark modal event listeners
  const addBookmarkModal = document.getElementById('addBookmarkModal');
  const addBookmarkModalClose = document.getElementById('addBookmarkModalClose');
  const addBookmarkModalCancel = document.getElementById('addBookmarkModalCancel');
  const addBookmarkModalSave = document.getElementById('addBookmarkModalSave');
  const addBookmarkModalOverlay = addBookmarkModal.querySelector('.modal-overlay');

  addBookmarkModalClose.addEventListener('click', closeAddBookmarkModal);
  addBookmarkModalCancel.addEventListener('click', closeAddBookmarkModal);
  addBookmarkModalSave.addEventListener('click', saveNewBookmark);
  addBookmarkModalOverlay.addEventListener('click', closeAddBookmarkModal);

  addBookmarkModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveNewBookmark();
    } else if (e.key === 'Escape') {
      closeAddBookmarkModal();
    }
  });

  // Add Folder modal event listeners
  const addFolderModal = document.getElementById('addFolderModal');
  const addFolderModalClose = document.getElementById('addFolderModalClose');
  const addFolderModalCancel = document.getElementById('addFolderModalCancel');
  const addFolderModalSave = document.getElementById('addFolderModalSave');
  const addFolderModalOverlay = addFolderModal.querySelector('.modal-overlay');

  addFolderModalClose.addEventListener('click', closeAddFolderModal);
  addFolderModalCancel.addEventListener('click', closeAddFolderModal);
  addFolderModalSave.addEventListener('click', saveNewFolder);
  addFolderModalOverlay.addEventListener('click', closeAddFolderModal);

  addFolderModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveNewFolder();
    } else if (e.key === 'Escape') {
      closeAddFolderModal();
    }
  });

  // Duplicates modal event listeners
  const duplicatesModal = document.getElementById('duplicatesModal');
  const duplicatesModalClose = document.getElementById('duplicatesModalClose');
  const duplicatesModalCancel = document.getElementById('duplicatesModalCancel');
  const duplicatesModalDelete = document.getElementById('duplicatesModalDelete');
  const duplicatesModalOverlay = duplicatesModal.querySelector('.modal-overlay');

  duplicatesModalClose.addEventListener('click', closeDuplicatesModal);
  duplicatesModalCancel.addEventListener('click', closeDuplicatesModal);
  duplicatesModalDelete.addEventListener('click', deleteSelectedDuplicates);
  duplicatesModalOverlay.addEventListener('click', closeDuplicatesModal);

  duplicatesModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDuplicatesModal();
    }
  });

  // BIDIRECTIONAL SYNC: Listen for bookmark changes (only in extension mode)
  // This ensures the extension automatically updates when bookmarks change in Firefox
  if (!isPreviewMode) {
    let syncTimeout = null;

    // Debounced sync function to prevent excessive reloads
    const syncBookmarks = (eventType) => {
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(async () => {
        try {
          console.log(`[Bookmark Sync] ${eventType} - Syncing bookmarks from Firefox...`);
          await loadBookmarks();
          renderBookmarks();
          console.log('[Bookmark Sync] ✓ Sync complete');
        } catch (error) {
          console.error('[Bookmark Sync] Failed to sync:', error);
        }
      }, 100); // 100ms debounce
    };

    browser.bookmarks.onCreated.addListener((id, bookmark) => {
      console.log('[Bookmark Sync] Bookmark created:', bookmark.title || bookmark.url);
      syncBookmarks('onCreated');
    });

    browser.bookmarks.onRemoved.addListener((id, removeInfo) => {
      console.log('[Bookmark Sync] Bookmark removed:', id);
      syncBookmarks('onRemoved');
    });

    browser.bookmarks.onChanged.addListener((id, changeInfo) => {
      console.log('[Bookmark Sync] Bookmark changed:', changeInfo);
      syncBookmarks('onChanged');
    });

    browser.bookmarks.onMoved.addListener((id, moveInfo) => {
      console.log('[Bookmark Sync] Bookmark moved:', id);
      syncBookmarks('onMoved');
    });

    console.log('[Bookmark Sync] ✓ Real-time bidirectional sync enabled');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
