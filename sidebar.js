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
          type: 'bookmark'
        },
        {
          id: '3',
          title: 'Stack Overflow',
          url: 'https://stackoverflow.com',
          type: 'bookmark'
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
          type: 'bookmark'
        },
        {
          id: '6',
          title: 'CSS Tricks',
          url: 'https://css-tricks.com',
          type: 'bookmark'
        },
        {
          id: '7',
          title: 'Can I Use',
          url: 'https://caniuse.com',
          type: 'bookmark'
        },
        {
          id: '8',
          title: 'JavaScript Info',
          url: 'https://javascript.info',
          type: 'bookmark'
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
          type: 'bookmark'
        },
        {
          id: '11',
          title: 'The Verge',
          url: 'https://theverge.com',
          type: 'bookmark'
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
          type: 'bookmark'
        },
        {
          id: '14',
          title: 'Figma',
          url: 'https://figma.com',
          type: 'bookmark'
        },
        {
          id: '15',
          title: 'Material Design',
          url: 'https://material.io',
          type: 'bookmark'
        }
      ]
    },
    {
      id: '16',
      title: 'YouTube',
      url: 'https://youtube.com',
      type: 'bookmark'
    },
    {
      id: '17',
      title: 'Reddit',
      url: 'https://reddit.com',
      type: 'bookmark'
    },
    {
      id: '18',
      title: 'Twitter',
      url: 'https://twitter.com',
      type: 'bookmark'
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
      <div class="folder-icon">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
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

  // Get favicon
  const faviconUrl = getFaviconUrl(bookmark.url);

  bookmarkDiv.innerHTML = `
    <div class="status-indicators">
      <span class="status-dot status-dot-gray" title="Status unknown">●</span>
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
      <button class="action-btn danger" data-action="delete">
        <span class="icon">🗑️</span>
        <span>Delete</span>
      </button>
    </div>
  `;

  // Add click handler for bookmark (open in current tab)
  bookmarkDiv.addEventListener('click', (e) => {
    if (!e.target.closest('.bookmark-menu-btn') && !e.target.closest('.bookmark-actions')) {
      window.open(bookmark.url, '_self');
    }
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

  return bookmarkDiv;
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

  // For now, no filtering implemented
  // This is where you'd check link status, safety, etc.
  return true;
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
