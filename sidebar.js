// Bookmark Manager Zero - Sidebar Script
// Connects to Firefox native bookmarks API

// Check if running in preview mode (no browser API available)
const isPreviewMode = typeof browser === 'undefined';

// State
let bookmarkTree = [];
let searchTerm = '';
let activeFilter = null;
let expandedFolders = new Set();
let theme = 'dark';

// DOM Elements
const bookmarkList = document.getElementById('bookmarkList');
const searchInput = document.getElementById('searchInput');
const filterToggle = document.getElementById('filterToggle');
const filterBar = document.getElementById('filterBar');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const settingsBtn = document.getElementById('settingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const switchSideBtn = document.getElementById('switchSideBtn');

// Initialize
async function init() {
  loadTheme();
  await loadBookmarks();
  setupEventListeners();
  renderBookmarks();
}

// Load theme preference
function loadTheme() {
  if (isPreviewMode) {
    theme = 'dark';
    applyTheme();
    return;
  }

  browser.storage.local.get('theme').then(result => {
    theme = result.theme || 'dark';
    applyTheme();
  });
}

// Apply theme
function applyTheme() {
  if (theme === 'dark') {
    document.body.classList.add('dark');
    themeIcon.textContent = '☀️';
  } else {
    document.body.classList.remove('dark');
    themeIcon.textContent = '🌙';
  }
}

// Toggle theme
function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  applyTheme();
  if (!isPreviewMode) {
    browser.storage.local.set({ theme });
  }
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
}

// Recursively render bookmark nodes
function renderNodes(nodes, container) {
  nodes.forEach(node => {
    if (node.type === 'folder') {
      container.appendChild(createFolderElement(node));
    } else if (node.url) {
      container.appendChild(createBookmarkElement(node));
    }
  });
}

// Get status dot HTML based on link status
function getStatusDotHtml(linkStatus) {
  const statusMap = {
    'live': { class: 'status-dot-green', title: 'Link is live and accessible' },
    'dead': { class: 'status-dot-red', title: 'Link is dead or unreachable' },
    'parked': { class: 'status-dot-yellow', title: 'Domain is parked' },
    'checking': { class: 'status-dot-gray', title: 'Checking link status...' },
    'unknown': { class: 'status-dot-gray', title: 'Status unknown' }
  };

  const status = statusMap[linkStatus] || statusMap['unknown'];
  return `<span class="status-dot ${status.class}" title="${status.title}">●</span>`;
}

// Get shield indicator HTML based on safety status
function getShieldHtml(safetyStatus) {
  const shieldSvgs = {
    'safe': `
      <span class="shield-indicator shield-safe" title="Safe - No threats detected by VirusTotal">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.18L16.59,7.59L18,9L10,17Z"/>
        </svg>
      </span>
    `,
    'warning': `
      <span class="shield-indicator shield-warning" title="Suspicious - Some security vendors flagged this URL">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M13,7H11V13H13V7M13,17H11V15H13V17Z"/>
        </svg>
      </span>
    `,
    'unsafe': `
      <span class="shield-indicator shield-unsafe" title="Malicious - Multiple threats detected! DO NOT VISIT">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.1,7 14,7.9 14,9V10.5L15.5,10.5C16.3,10.5 17,11.2 17,12V16C17,16.8 16.3,17.5 15.5,17.5H8.5C7.7,17.5 7,16.8 7,16V12C7,11.2 7.7,10.5 8.5,10.5H10V9C10,7.9 10.9,7 12,7M12,8.2C11.2,8.2 10.8,8.7 10.8,9V10.5H13.2V9C13.2,8.7 12.8,8.2 12,8.2Z"/>
        </svg>
      </span>
    `,
    'checking': `
      <span class="shield-indicator shield-scanning" title="Scanning with VirusTotal...">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z"/>
        </svg>
      </span>
    `,
    'unknown': `
      <span class="shield-indicator shield-unknown" title="Unable to scan - Link unreachable or not yet checked">
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

  const isExpanded = expandedFolders.has(folder.id);
  const childCount = countBookmarks(folder);

  folderDiv.innerHTML = `
    <div class="folder-header">
      <div class="folder-toggle ${isExpanded ? 'expanded' : ''}">▶</div>
      <div class="folder-icon-container">
        <svg class="folder-icon-outline" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"/>
        </svg>
        <div class="folder-count">${childCount}</div>
      </div>
      <div class="folder-title">${escapeHtml(folder.title || 'Unnamed Folder')}</div>
    </div>
    <div class="folder-children ${isExpanded ? 'show' : ''}"></div>
  `;

  // Add click handler for folder toggle
  const header = folderDiv.querySelector('.folder-header');
  header.addEventListener('click', () => toggleFolder(folder.id, folderDiv));

  // Render children if expanded
  if (isExpanded && folder.children) {
    const childContainer = folderDiv.querySelector('.folder-children');
    renderNodes(folder.children, childContainer);
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
  const shieldHtml = getShieldHtml(safetyStatus);

  bookmarkDiv.innerHTML = `
    <div class="status-indicators">
      ${statusDotHtml}
      ${shieldHtml}
    </div>
    <div class="bookmark-info">
      <div class="bookmark-title">${escapeHtml(bookmark.title || bookmark.url)}</div>
      <div class="bookmark-url">${escapeHtml(new URL(bookmark.url).hostname)}</div>
    </div>
    <button class="bookmark-menu-btn">⋮</button>
    <div class="bookmark-actions">
      <button class="action-btn" data-action="open">
        <span class="icon">🔗</span>
        <span>Open</span>
      </button>
      <button class="action-btn" data-action="open-new-tab">
        <span class="icon">⧉</span>
        <span>Open in New Tab</span>
      </button>
      <button class="action-btn" data-action="edit">
        <span class="icon">✏️</span>
        <span>Edit</span>
      </button>
      <button class="action-btn" data-action="recheck">
        <span class="icon">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </span>
        <span>Recheck Status</span>
      </button>
      <button class="action-btn danger" data-action="delete">
        <span class="icon">🗑️</span>
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
    // Don't open if clicking on menu, actions, or preview
    if (e.target.closest('.bookmark-menu-btn') ||
        e.target.closest('.bookmark-actions') ||
        e.target.closest('.bookmark-preview-container')) {
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
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bookmark.id);
    bookmarkDiv.style.opacity = '0.5';
  });

  bookmarkDiv.addEventListener('dragend', () => {
    bookmarkDiv.style.opacity = '1';
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
        previewImage.onload = () => {
          previewLoading.style.display = 'none';
          previewImage.classList.add('loaded');
          previewLoaded = true;
        };

        previewImage.onerror = () => {
          previewLoading.textContent = 'No preview';
          previewLoaded = true; // Don't try again
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

// Close all open menus
function closeAllMenus() {
  document.querySelectorAll('.bookmark-actions.show').forEach(menu => {
    menu.classList.remove('show');
  });
  settingsMenu.classList.remove('show');
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

// Edit bookmark
async function editBookmark(bookmark) {
  const newTitle = prompt('Edit title:', bookmark.title);
  if (newTitle !== null && newTitle !== bookmark.title) {
    if (isPreviewMode) {
      alert('✓ In preview mode. In the real extension, this would update the bookmark.');
      return;
    }

    try {
      await browser.bookmarks.update(bookmark.id, { title: newTitle });
      await loadBookmarks();
      renderBookmarks();
    } catch (error) {
      console.error('Error updating bookmark:', error);
      alert('Failed to update bookmark');
    }
  }
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

// Create new bookmark
async function createNewBookmark() {
  const url = prompt('Enter URL:');
  if (!url) return;

  const title = prompt('Enter title (optional):') || url;

  if (isPreviewMode) {
    alert('✓ In preview mode. In the real extension, this would create a new bookmark.');
    return;
  }

  try {
    await browser.bookmarks.create({
      title,
      url
    });
    await loadBookmarks();
    renderBookmarks();
  } catch (error) {
    console.error('Error creating bookmark:', error);
    alert('Failed to create bookmark');
  }
}

// Create new folder
async function createNewFolder() {
  const title = prompt('Enter folder name:');
  if (!title) return;

  if (isPreviewMode) {
    alert('✓ In preview mode. In the real extension, this would create a new folder.');
    return;
  }

  try {
    await browser.bookmarks.create({
      title,
      type: 'folder'
    });
    await loadBookmarks();
    renderBookmarks();
  } catch (error) {
    console.error('Error creating folder:', error);
    alert('Failed to create folder');
  }
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
    case 'dead':
      return linkStatus === 'dead' || linkStatus === 'parked';
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

  // Theme toggle
  themeToggle.addEventListener('click', toggleTheme);

  // Settings menu
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsMenu.classList.toggle('show');
  });

  // Switch sidebar side
  switchSideBtn.addEventListener('click', () => {
    switchSidebarSide();
    closeAllMenus();
  });

  // New bookmark
  document.getElementById('newBookmarkBtn').addEventListener('click', createNewBookmark);

  // New folder
  document.getElementById('newFolderBtn').addEventListener('click', createNewFolder);

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.bookmark-actions') && !e.target.closest('.bookmark-menu-btn') &&
        !e.target.closest('.settings-menu') && !e.target.closest('#settingsBtn')) {
      closeAllMenus();
    }
  });

  // Listen for bookmark changes (only in extension mode)
  if (!isPreviewMode) {
    browser.bookmarks.onCreated.addListener(() => {
      loadBookmarks().then(renderBookmarks);
    });

    browser.bookmarks.onRemoved.addListener(() => {
      loadBookmarks().then(renderBookmarks);
    });

    browser.bookmarks.onChanged.addListener(() => {
      loadBookmarks().then(renderBookmarks);
    });

    browser.bookmarks.onMoved.addListener(() => {
      loadBookmarks().then(renderBookmarks);
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
