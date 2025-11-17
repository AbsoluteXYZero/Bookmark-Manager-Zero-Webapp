import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { BookmarkNode, BookmarkItem, FolderItem } from './types';
import { getAllBookmarks, updateBookmark, deleteBookmark, checkLinkStatus, checkLinkSafety, createFolder, deleteFolder, moveBookmarkOrFolder, createBookmark, updateFolder } from './services/bookmarkService';
import EditModal from './components/EditModal';
import SitePreview from './components/SitePreview';
import BookmarkList from './components/BookmarkList';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import ConfirmFolderDeleteModal from './components/ConfirmFolderDeleteModal';
import CreateFolderModal from './components/CreateFolderModal';
import CreateBookmarkModal from './components/CreateBookmarkModal';
import VirusTotalModal from './components/VirusTotalModal';
import DuplicateBookmarksModal from './components/DuplicateBookmarksModal';
import DuplicateWarningModal from './components/DuplicateWarningModal';
import FloatingUndoButton from './components/FloatingUndoButton';
import { SearchIcon, LoaderIcon, GridIcon, ListIcon, ZoomInIcon, ZoomOutIcon, EnhancedListIcon, FilterIcon, CheckCircleIcon, XCircleIcon, ShieldCheckIcon, ShieldAlertIcon, XIcon, MenuIcon, SunIcon, MoonIcon, ColumnsIcon, CopyIcon, AlertTriangleIcon, FolderPlusIcon, BookmarkPlusIcon } from './components/Icons';
import Logo from './components/Logo';


const gridClassMap: { [key: number]: string } = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};
const columnOptions = [2, 3, 4, 5, 6];
const listZoomLevels = 6;

type FilterType = 'live' | 'dead' | 'safe' | 'unsafe';
type VisibleField = 'url' | 'tags' | 'keyword' | 'folder' | 'dateAdded';
type Theme = 'light' | 'dark';

type DuplicateWarningState = {
  conflictingItem: BookmarkItem;
  itemBeingEdited: BookmarkItem;
  savePayload: { id: string; title: string; url: string; tags: string[]; keyword?: string };
};

type DragOverInfo = {
    parentId: string;
    index: number;
} | null;

type UndoableItem = BookmarkItem | FolderItem;

type UndoAction =
  | { type: 'delete'; payload: { items: UndoableItem[], originalIndices: Map<string, number> } }
  | { type: 'edit'; payload: { previousState: UndoableItem; currentState: UndoableItem } }
  | { type: 'move'; payload: { item: BookmarkNode; from: { parentId: string; index: number }; to: { parentId: string; index: number } } }
  | { type: 'create'; payload: { item: UndoableItem } };


// --- Pure helper functions for immutable tree manipulation ---
const findAndRemoveNode = (nodes: BookmarkNode[], nodeId: string): { tree: BookmarkNode[], foundNode: BookmarkNode | null } => {
    let foundNode: BookmarkNode | null = null;
    const recursiveFind = (currentNodes: BookmarkNode[]): BookmarkNode[] => {
        const result: BookmarkNode[] = [];
        for (const node of currentNodes) {
            if (node.id === nodeId) {
                foundNode = node;
            } else {
                if (node.type === 'folder') {
                    const { tree: newChildren, foundNode: foundInChildren } = findAndRemoveNode(node.children, nodeId);
                    if (foundInChildren) foundNode = foundInChildren;
                    result.push({ ...node, children: newChildren });
                } else {
                    result.push(node);
                }
            }
        }
        return result;
    };
    const tree = recursiveFind(nodes);
    return { tree, foundNode };
};

const pureInsertNode = (nodes: BookmarkNode[], nodeToInsert: BookmarkNode, parentId: string, index: number): BookmarkNode[] => {
    if (parentId === 'root-id') {
        const newNodes = [...nodes];
        newNodes.splice(index, 0, nodeToInsert);
        return newNodes;
    }
    return nodes.map(node => {
        if (node.type === 'folder') {
            if (node.id === parentId) {
                const newChildren = [...node.children];
                newChildren.splice(index, 0, nodeToInsert);
                return { ...node, children: newChildren };
            }
            return { ...node, children: pureInsertNode(node.children, nodeToInsert, parentId, index) };
        }
        return node;
    });
};

const findAndUpdateNode = (nodes: BookmarkNode[], nodeId: string, updater: (node: BookmarkNode) => BookmarkNode): BookmarkNode[] => {
    return nodes.map(node => {
        if (node.id === nodeId) {
            return updater(node);
        }
        if (node.type === 'folder') {
            return { ...node, children: findAndUpdateNode(node.children, nodeId, updater) };
        }
        return node;
    });
};

const reIndex = (nodes: BookmarkNode[], pId: string = 'root-id'): BookmarkNode[] => {
    return nodes.map((node, i) => {
        const newNode = { ...node, index: i, parentId: pId };
        if (newNode.type === 'folder') {
            newNode.children = reIndex(newNode.children, newNode.id);
        }
        return newNode;
    });
};


export default function App() {
  const [bookmarkTree, setBookmarkTree] = useState<BookmarkNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);
  const [deletingBookmark, setDeletingBookmark] = useState<BookmarkItem | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderItem | null>(null);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isCreateBookmarkModalOpen, setIsCreateBookmarkModalOpen] = useState(false);
  const [viewingSafetyReport, setViewingSafetyReport] = useState<BookmarkItem | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Record<string, BookmarkItem[]>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarningState | null>(null);
  const [folderMap, setFolderMap] = useState<Map<string, string>>(new Map());
  const [undoHistory, setUndoHistory] = useState<UndoAction[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<BookmarkNode | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<DragOverInfo>(null);

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'enhanced-list'>('enhanced-list');
  const [zoomIndex, setZoomIndex] = useState(2);
  const [gridColumnCount, setGridColumnCount] = useState(5);
  const [hoveredBookmark, setHoveredBookmark] = useState<{ url: string; element: HTMLElement } | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isDisplayMenuVisible, setIsDisplayMenuVisible] = useState(false);
  const [isColumnMenuVisible, setIsColumnMenuVisible] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const [visibleFields, setVisibleFields] = useState({ url: true, tags: false, keyword: false, folder: false, dateAdded: false });

  const displayMenuRef = useRef<HTMLDivElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (systemPrefersDark ? 'dark' : 'light'));
    
    const savedColumnCount = localStorage.getItem('gridColumnCount');
    if (savedColumnCount && columnOptions.includes(Number(savedColumnCount))) setGridColumnCount(Number(savedColumnCount));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
      localStorage.setItem('gridColumnCount', String(gridColumnCount));
  }, [gridColumnCount]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const findNodeById = useCallback((nodes: BookmarkNode[], id: string): BookmarkNode | null => {
      for (const node of nodes) {
          if (node.id === id) return node;
          if (node.type === 'folder') {
              const found = findNodeById(node.children, id);
              if (found) return found;
          }
      }
      return null;
  }, []);
  
  const buildFolderMap = (nodes: BookmarkNode[]): Map<string, string> => {
    const newFolderMap = new Map<string, string>();
    const traverse = (nodes: BookmarkNode[], path: string[]) => {
        nodes.forEach(node => {
            if (node.type === 'folder') {
                const currentPath = [...path, node.title].join(' / ');
                newFolderMap.set(node.id, currentPath);
                traverse(node.children, [...path, node.title]);
            }
        });
    };
    traverse(nodes, []);
    return newFolderMap;
  };

  const loadBookmarks = useCallback(async () => {
    setInitialLoading(true);
    try {
      setError(null);
      const fetchedTree = await getAllBookmarks();
      setBookmarkTree(fetchedTree);
      setFolderMap(buildFolderMap(fetchedTree));
    } catch (err) {
      console.error("Error loading bookmarks:", err);
      setError("Failed to load bookmarks.");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const reloadBookmarks = useCallback(async () => {
    setIsRefreshing(true);
    try {
      setError(null);
      const fetchedTree = await getAllBookmarks();
      setBookmarkTree(fetchedTree);
      setFolderMap(buildFolderMap(fetchedTree));
    } catch (err) {
      console.error("Error reloading bookmarks:", err);
      setError("Failed to refresh bookmarks.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    loadBookmarks().then(() => {
        setExpandedFolders(new Set()); // Start with all folders collapsed
    });
  }, [loadBookmarks]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (displayMenuRef.current && !displayMenuRef.current.contains(event.target as Node)) setIsDisplayMenuVisible(false);
      // FIX: Corrected typo from columnMenuMenuRef to columnMenuRef.
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) setIsColumnMenuVisible(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const updateNodeInTree = useCallback((nodes: BookmarkNode[], id: string, updater: (node: BookmarkItem | FolderItem) => BookmarkItem | FolderItem): BookmarkNode[] => {
    return nodes.map(node => {
      if (node.id === id) return updater(node as any);
      if (node.type === 'folder') return { ...node, children: updateNodeInTree(node.children, id, updater) };
      return node;
    });
  }, []);

  useEffect(() => {
    const bookmarksToCheck: BookmarkItem[] = [];
    const traverse = (nodes: BookmarkNode[]) => nodes.forEach(node => {
        if (node.type === 'bookmark' && node.status === 'unchecked') bookmarksToCheck.push(node);
        if (node.type === 'folder') traverse(node.children);
    });
    traverse(bookmarkTree);
    
    if (bookmarksToCheck.length > 0) {
        const checkAll = async () => {
            for (const item of bookmarksToCheck) {
                setBookmarkTree(prev => updateNodeInTree(prev, item.id, n => ({ ...n, status: 'checking', safetyStatus: 'checking' })));
                const [status, safetyStatus] = await Promise.all([checkLinkStatus(item.url), checkLinkSafety(item.url)]);
                setBookmarkTree(prev => updateNodeInTree(prev, item.id, n => ({ ...n, status, safetyStatus })));
            }
        };
        checkAll();
    }
  }, [bookmarkTree, updateNodeInTree]);

  const filteredAndSearchedTree = useMemo(() => {
    const filterPredicate = (bookmark: BookmarkItem): boolean => {
      if (!activeFilter) return true;
      switch (activeFilter) {
        case 'live': return bookmark.status === 'live';
        case 'dead': return bookmark.status === 'dead' || bookmark.status === 'parked';
        case 'safe': return bookmark.safetyStatus === 'safe';
        case 'unsafe': return bookmark.safetyStatus === 'unsafe';
        default: return true;
      }
    };
    const searchPredicate = (bookmark: BookmarkItem): boolean => {
        if (!searchTerm) return true;
        const lowercasedTerm = searchTerm.toLowerCase();
        return bookmark.title.toLowerCase().includes(lowercasedTerm) ||
               bookmark.url.toLowerCase().includes(lowercasedTerm) ||
               (bookmark.keyword && bookmark.keyword.toLowerCase().includes(lowercasedTerm)) ||
               bookmark.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm));
    };
    
    const isSearchingOrFiltering = !!searchTerm || !!activeFilter;

    const recursiveFilter = (nodes: BookmarkNode[]): BookmarkNode[] => {
      return nodes.reduce((acc, node) => {
        if (node.type === 'bookmark') {
          if (filterPredicate(node) && searchPredicate(node)) acc.push(node);
        } else if (node.type === 'folder') {
          const filteredChildren = recursiveFilter(node.children);
          if (filteredChildren.length > 0 || !isSearchingOrFiltering) {
            acc.push({ ...node, children: filteredChildren });
          }
        }
        return acc;
      }, [] as BookmarkNode[]);
    };
    return recursiveFilter(bookmarkTree);
  }, [bookmarkTree, searchTerm, activeFilter]);

  // --- OPTIMISTIC UI UPDATES ---
  const performOptimisticDelete = (items: (BookmarkItem | FolderItem)[]) => {
    setBookmarkTree(currentTree => {
      let newTree = currentTree;
      for (const item of items) {
          newTree = findAndRemoveNode(newTree, item.id).tree;
      }
      return reIndex(newTree);
    });
  };

  const performOptimisticCreate = (item: BookmarkItem | FolderItem, parentId: string, index: number) => {
    setBookmarkTree(currentTree => {
      const newTree = pureInsertNode(currentTree, item, parentId, index);
      return reIndex(newTree);
    });
  };
  
  const handleDeleteItems = useCallback(async (items: (BookmarkItem | FolderItem)[]) => {
      const itemsToDelete = JSON.parse(JSON.stringify(items));
      const originalIndices = new Map<string, number>();
      itemsToDelete.forEach(item => originalIndices.set(item.id, item.index || 0));
      
      performOptimisticDelete(itemsToDelete);
      
      setUndoHistory(prev => [...prev, { type: 'delete', payload: { items: itemsToDelete, originalIndices } }]);
      
      try {
        for (const item of itemsToDelete) {
            if (item.type === 'bookmark') await deleteBookmark(item.id);
            else await deleteFolder(item.id);
        }
      } catch (err) {
        console.error("Error deleting item(s):", err);
        setError("Failed to delete items. Please undo or reload.");
      }
  }, []);

  const handleConfirmDeleteBookmark = useCallback(async () => {
    if (!deletingBookmark) return;
    await handleDeleteItems([deletingBookmark]);
    setDeletingBookmark(null);
  }, [deletingBookmark, handleDeleteItems]);

  const handleDeleteFolder = useCallback((folder: FolderItem) => {
      if (folder.children.length > 0) {
          setDeletingFolder(folder);
      } else {
          handleDeleteItems([folder]);
      }
  }, [handleDeleteItems]);

  const handleConfirmDeleteFolder = useCallback(async () => {
      if (!deletingFolder) return;
      await handleDeleteItems([deletingFolder]);
      setDeletingFolder(null);
  }, [deletingFolder, handleDeleteItems]);
  
  const handleSave = async (id: string, title: string, url: string, tags: string[], keyword?: string) => {
    const itemBeingEdited = findNodeById(bookmarkTree, id) as BookmarkItem;
    if (!itemBeingEdited) return;

    let conflictingItem: BookmarkItem | null = null;
    const traverse = (nodes: BookmarkNode[]) => {
      for (const node of nodes) {
        if (node.type === 'bookmark' && node.url === url && node.id !== id) {
          conflictingItem = node; return;
        }
        if (node.type === 'folder' && !conflictingItem) traverse(node.children);
      }
    };
    traverse(bookmarkTree);

    if (conflictingItem) {
      setDuplicateWarning({ conflictingItem, itemBeingEdited, savePayload: { id, title, url, tags, keyword } });
      return;
    }
    
    await performSave(id, title, url, tags, keyword, itemBeingEdited);
  };
  
  const performSave = async (id: string, title: string, url: string, tags: string[], keyword: string | undefined, previousState: BookmarkItem) => {
    setEditingBookmark(null);
    setDuplicateWarning(null);

    const updatedBookmarkData = { ...previousState, title, url, tags, keyword, status: 'unchecked', safetyStatus: 'unknown' } as BookmarkItem;
    
    setBookmarkTree(currentTree => findAndUpdateNode(currentTree, id, () => updatedBookmarkData));
    setUndoHistory(prev => [...prev, { type: 'edit', payload: { previousState, currentState: updatedBookmarkData } }]);
    
    try {
        await updateBookmark(id, { title, url, tags, keyword });
        // No hard reload to preserve scroll
    } catch (err) {
        console.error("Error updating bookmark:", err);
        setError("Failed to save changes. Please undo or reload.");
    }
  };

  const handleConfirmDuplicateSave = async () => {
    if (!duplicateWarning) return;
    const { savePayload, itemBeingEdited } = duplicateWarning;
    await performSave(savePayload.id, savePayload.title, savePayload.url, savePayload.tags, savePayload.keyword, itemBeingEdited);
  };

  const handleFindDuplicates = () => {
      const urlMap: Record<string, BookmarkItem[]> = {};
      const traverse = (nodes: BookmarkNode[]) => nodes.forEach(node => {
          if (node.type === 'bookmark') {
              if (!urlMap[node.url]) urlMap[node.url] = [];
              urlMap[node.url].push(node);
          } else if (node.type === 'folder') traverse(node.children);
      });
      traverse(bookmarkTree);
      
      const foundGroups = Object.fromEntries(Object.entries(urlMap).filter(([, bms]) => bms.length > 1));
      setDuplicateGroups(foundGroups);
      setIsDuplicateModalOpen(true);
  };

  const handleCreateFolder = async (details: { title: string; parentId: string }) => {
      setIsCreateFolderModalOpen(false);
      try {
          const newFolder = await createFolder(details);
          setUndoHistory(prev => [...prev, { type: 'create', payload: { item: newFolder } }]);
          await reloadBookmarks();
      } catch (err) {
          console.error("Error creating folder:", err);
          setError("Failed to create the folder.");
      }
  };

  const handleCreateBookmark = async (details: { parentId: string, title: string, url: string, tags: string[], keyword?: string }) => {
    setIsCreateBookmarkModalOpen(false);
    try {
        const newBookmark = await createBookmark(details);
        setUndoHistory(prev => [...prev, { type: 'create', payload: { item: newBookmark } }]);
        await reloadBookmarks();
    } catch (err) {
        console.error("Error creating bookmark:", err);
        setError("Failed to create the bookmark.");
    }
  };

  const handleRenameFolder = async (folderId: string, newTitle: string) => {
    const originalFolder = findNodeById(bookmarkTree, folderId) as FolderItem;
    if (!originalFolder || originalFolder.title === newTitle) {
      return;
    }
    
    const renamedFolder = { ...originalFolder, title: newTitle };

    setBookmarkTree(currentTree => {
        const newTree = findAndUpdateNode(currentTree, folderId, () => renamedFolder);
        setFolderMap(buildFolderMap(newTree)); // Rebuild map after optimistic update
        return newTree;
    });

    setUndoHistory(prev => [...prev, { type: 'edit', payload: { previousState: originalFolder, currentState: renamedFolder } }]);
    
    try {
      await updateFolder(folderId, newTitle);
    } catch (err) {
      console.error("Error renaming folder:", err);
      setError("Failed to rename folder. Please undo or reload.");
      setBookmarkTree(currentTree => findAndUpdateNode(currentTree, folderId, () => originalFolder));
    }
  };

  const isAncestor = useCallback((draggedId: string, potentialParentId: string): boolean => {
    if (!draggedId || !potentialParentId) return false;
    let currentNode = findNodeById(bookmarkTree, potentialParentId);
    while (currentNode) {
      if (currentNode.id === draggedId) return true;
      if (!currentNode.parentId) return false;
      currentNode = findNodeById(bookmarkTree, currentNode.parentId);
    }
    return false;
  }, [bookmarkTree, findNodeById]);
  
  const handleDrop = useCallback(async () => {
    const itemToMove = draggedItem;
    const dropInfo = dragOverInfo;

    console.log('[handleDrop] Called with:', { itemToMove, dropInfo });

    setDraggedItem(null);
    setDragOverInfo(null);

    if (!itemToMove || !dropInfo) {
      console.log('[handleDrop] Early exit - no item or drop info');
      return;
    }
    if (itemToMove.type === 'folder' && (itemToMove.id === dropInfo.parentId || isAncestor(itemToMove.id, dropInfo.parentId))) {
      console.log('[handleDrop] Early exit - invalid folder drop (ancestor check)');
      return;
    }

    const originalPosition = { parentId: itemToMove.parentId || 'root-id', index: itemToMove.index || 0 };

    // Check if we're moving within the same parent
    const isSameParent = originalPosition.parentId === dropInfo.parentId;

    // Calculate adjusted drop index
    // When moving within same parent and drop index is after current position,
    // we need to subtract 1 because removing the item first will shift indices
    let adjustedDropIndex = dropInfo.index;
    if (isSameParent && dropInfo.index > (itemToMove.index || 0)) {
      adjustedDropIndex = dropInfo.index - 1;
    }

    console.log('[handleDrop] Moving:', {
      itemTitle: itemToMove.type === 'bookmark' ? itemToMove.title : itemToMove.title,
      from: originalPosition,
      to: dropInfo,
      adjustedIndex: adjustedDropIndex
    });

    // IMPORTANT: Delete first, then insert
    // This prevents index shifting issues when moving within the same parent
    performOptimisticDelete([itemToMove]);
    performOptimisticCreate(itemToMove, dropInfo.parentId, adjustedDropIndex);

    setUndoHistory(prev => [...prev, { type: 'move', payload: { item: itemToMove, from: originalPosition, to: dropInfo } }]);

    try {
        await moveBookmarkOrFolder(itemToMove.id, dropInfo.parentId, dropInfo.index);
        console.log('[handleDrop] Move successful');
    } catch(err) {
        console.error("Failed to move item:", err);
        setError("Failed to move the item. Please undo or reload.");
    }
  }, [draggedItem, dragOverInfo, isAncestor]);
  
  const handleUndo = async () => {
    const lastAction = undoHistory[undoHistory.length - 1];
    if (!lastAction) return;
    
    setUndoHistory(prev => prev.slice(0, -1));

    try {
        switch (lastAction.type) {
            case 'delete':
                const { items, originalIndices } = lastAction.payload;
                for (const item of items) {
                    performOptimisticCreate(item, item.parentId || 'root-id', originalIndices.get(item.id) || 0);
                    if (item.type === 'folder') await createFolder({ parentId: item.parentId, index: originalIndices.get(item.id), title: item.title });
                    else await createBookmark({ parentId: item.parentId!, index: originalIndices.get(item.id), title: item.title, url: item.url, tags: item.tags, keyword: item.keyword });
                }
                break;
            case 'edit': {
                const { previousState } = lastAction.payload;
                const newTreeAfterUndo = findAndUpdateNode(bookmarkTree, previousState.id, () => previousState);
                setBookmarkTree(newTreeAfterUndo);
                setFolderMap(buildFolderMap(newTreeAfterUndo));

                if (previousState.type === 'bookmark') {
                    await updateBookmark(previousState.id, { title: previousState.title, url: previousState.url, tags: previousState.tags, keyword: previousState.keyword });
                } else if (previousState.type === 'folder') {
                    await updateFolder(previousState.id, previousState.title);
                }
                break;
            }
            case 'move':
                const { item, from } = lastAction.payload;
                setBookmarkTree(currentTree => {
                    const { tree: treeWithoutNode } = findAndRemoveNode(currentTree, item.id);
                    const newTree = pureInsertNode(treeWithoutNode, item, from.parentId, from.index);
                    return reIndex(newTree);
                });
                await moveBookmarkOrFolder(item.id, from.parentId, from.index);
                break;
            case 'create':
                performOptimisticDelete([lastAction.payload.item]);
                if (lastAction.payload.item.type === 'folder') await deleteFolder(lastAction.payload.item.id);
                else await deleteBookmark(lastAction.payload.item.id);
                break;
        }
    } catch (err) {
        console.error("Undo failed:", err);
        setError("Sorry, the last action could not be undone. Reloading for consistency.");
        await reloadBookmarks();
    }
  };

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) newSet.delete(folderId);
        else newSet.add(folderId);
        return newSet;
    });
  };
  
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <Logo />
        </header>

        <div className="sticky top-0 z-20 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm py-4 mb-6">
          <div className="relative mb-4">
            <input type="text" placeholder="Search by title, url, tag, or keyword..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full py-3 pl-12 pr-4 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" /></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="relative" ref={displayMenuRef}>
                <button 
                  onClick={() => setIsDisplayMenuVisible(p => !p)} 
                  className="p-2 text-sm rounded-full flex items-center transition bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                  title="Display options"
                >
                  <MenuIcon className="w-5 h-5" />
                </button>
                {isDisplayMenuVisible && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl p-2 z-30">
                    <p className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Show Fields</p>
                    {(['url', 'tags', 'keyword', 'folder', 'dateAdded'] as VisibleField[]).map(key => (
                      <label key={key} className="flex items-center w-full px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer">
                        <input type="checkbox" checked={visibleFields[key]} onChange={() => setVisibleFields(p => ({...p, [key]: !p[key]}))} className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500" />
                        <span className="ml-3">{`Show ${key.charAt(0).toUpperCase() + key.slice(1).replace('Added', ' Added')}`}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsFilterVisible(p => !p)} 
                className={`p-2 text-sm rounded-full flex items-center transition relative ${activeFilter ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'}`}
                title="Filters"
              >
                <FilterIcon className="w-5 h-5" />
                {activeFilter && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-300 rounded-full border-2 border-slate-100 dark:border-slate-900"></span>}
              </button>
              <button 
                onClick={handleFindDuplicates} 
                className="p-2 text-sm rounded-full flex items-center transition bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                title="Find duplicates"
              >
                <CopyIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsCreateFolderModalOpen(true)} 
                className="p-2 text-sm rounded-full flex items-center transition bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                title="New folder"
              >
                <FolderPlusIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsCreateBookmarkModalOpen(true)} 
                className="p-2 text-sm rounded-full flex items-center transition bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300"
                title="New bookmark"
              >
                <BookmarkPlusIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-end space-x-2">
              <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition" title="Toggle Theme">{theme === 'light' ? <MoonIcon className="h-5 h-5" /> : <SunIcon className="h-5 h-5" />}</button>
              <span className="border-l border-slate-300 dark:border-slate-700 h-6 mx-2"></span>
              <div className="flex items-center space-x-1 p-1 bg-slate-200 dark:bg-slate-700/50 rounded-full">
                <button onClick={() => setViewMode('enhanced-list')} className={`p-2 rounded-full transition ${viewMode === 'enhanced-list' ? 'bg-blue-500 text-white shadow' : 'hover:bg-white/60 dark:hover:bg-black/20 text-slate-700 dark:text-slate-300'}`} title="Enhanced List View"><EnhancedListIcon className="h-5 h-5" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition ${viewMode === 'list' ? 'bg-blue-500 text-white shadow' : 'hover:bg-white/60 dark:hover:bg-black/20 text-slate-700 dark:text-slate-300'}`} title="List View"><ListIcon className="h-5 h-5" /></button>
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition ${viewMode === 'grid' ? 'bg-blue-500 text-white shadow' : 'hover:bg-white/60 dark:hover:bg-black/20 text-slate-700 dark:text-slate-300'}`} title="Grid View"><GridIcon className="h-5 h-5" /></button>
                <span className="border-l border-slate-300 dark:border-slate-600 h-6 mx-1"></span>
                {viewMode === 'grid' ? (
                  <div className="relative pr-1" ref={columnMenuRef}>
                    <button onClick={() => setIsColumnMenuVisible(p => !p)} className="p-2 rounded-full hover:bg-white/60 dark:hover:bg-black/20 text-slate-700 dark:text-slate-300 transition" title={`Grid columns: ${gridColumnCount}`}><ColumnsIcon className="h-5 h-5" /></button>
                    {isColumnMenuVisible && (<div className="absolute top-full right-0 mt-2 w-max bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl p-2 z-30"><p className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Columns</p><div className="flex items-center gap-1">{columnOptions.map(num => (<button key={num} onClick={() => { setGridColumnCount(num); setIsColumnMenuVisible(false); }} className={`w-8 h-8 rounded-md text-sm font-semibold transition ${gridColumnCount === num ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'}`}>{num}</button>))}</div></div>)}
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 pr-1">
                    <button onClick={() => setZoomIndex(i => Math.max(i - 1, 0))} className="p-2 rounded-full hover:bg-white/60 dark:hover:bg-black/20 text-slate-700 dark:text-slate-300 transition" title="Zoom Out" disabled={zoomIndex === 0}><ZoomOutIcon className="h-5 w-5" /></button>
                    <button onClick={() => setZoomIndex(i => Math.min(i + 1, listZoomLevels - 1))} className="p-2 rounded-full hover:bg-white/60 dark:hover:bg-black/20 text-slate-700 dark:text-slate-300 transition" title="Zoom In" disabled={zoomIndex === listZoomLevels - 1}><ZoomInIcon className="h-5 w-5" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isFilterVisible ? 'max-h-40 mt-4' : 'max-h-0'}`}>
            <div className="bg-slate-200/60 dark:bg-slate-800/60 p-3 rounded-xl flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium mr-2">Filter by:</span>
              {(['live', 'dead', 'safe', 'unsafe'] as FilterType[]).map(key => {
                  const Icon = {live: CheckCircleIcon, dead: XCircleIcon, safe: ShieldCheckIcon, unsafe: ShieldAlertIcon}[key];
                  const label = `${key.charAt(0).toUpperCase() + key.slice(1)} Links`;
                  return (<button key={key} onClick={() => setActiveFilter(p => p === key ? null : key)} className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-2 transition ${activeFilter === key ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-300/50 dark:bg-slate-700/50 hover:bg-slate-400/50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'}`} title={label}><Icon className="w-4 h-4" /><span>{label}</span></button>);
              })}
              {activeFilter && (<button onClick={() => setActiveFilter(null)} className="p-2 rounded-full bg-slate-300/50 dark:bg-slate-700/50 hover:bg-slate-400/50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300" title="Clear Filter"><XIcon className="w-4 h-4" /></button>)}
            </div>
          </div>
        </div>
      
      <div className="relative">
        {initialLoading ? (
            <div className="flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 h-64">
                <LoaderIcon className="h-12 w-12 animate-spin mb-4" />
                <p className="text-lg">Loading your bookmarks...</p>
            </div>
        ) : error ? (
            <div className="text-center p-8 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl">
                <h3 className="text-xl font-semibold">An Error Occurred</h3>
                <p>{error}</p>
            </div>
        ) : (
          <BookmarkList 
            nodes={filteredAndSearchedTree}
            viewMode={viewMode}
            zoomIndex={zoomIndex}
            gridConfig={gridClassMap[gridColumnCount]}
            visibleFields={visibleFields}
            draggedItem={draggedItem}
            dragOverInfo={dragOverInfo}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
            isAncestor={isAncestor}
            onEdit={(bm) => setEditingBookmark(bm)}
            onDelete={(id) => {
              const node = findNodeById(bookmarkTree, id);
              if (node?.type === 'bookmark') setDeletingBookmark(node);
            }}
            onDeleteFolder={handleDeleteFolder}
            onRenameFolder={handleRenameFolder}
            onViewSafetyReport={(bm) => setViewingSafetyReport(bm)}
            onHoverStart={(url, element) => setHoveredBookmark({ url, element })}
            onHoverEnd={() => setHoveredBookmark(null)}
            setDraggedItem={setDraggedItem}
            setDragOverInfo={setDragOverInfo}
            handleDrop={handleDrop}
          />
        )}
        {isRefreshing && (
          <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-30">
            <LoaderIcon className="h-8 w-8 animate-spin text-slate-500 dark:text-slate-400" />
          </div>
        )}
      </div>

      {editingBookmark && (<EditModal bookmark={editingBookmark} onClose={() => setEditingBookmark(null)} onSave={handleSave} />)}
      {deletingBookmark && (<ConfirmDeleteModal bookmark={deletingBookmark} onClose={() => setDeletingBookmark(null)} onConfirm={handleConfirmDeleteBookmark} />)}
      {deletingFolder && (<ConfirmFolderDeleteModal folder={deletingFolder} onClose={() => setDeletingFolder(null)} onConfirm={handleConfirmDeleteFolder} />)}
      {isCreateFolderModalOpen && (<CreateFolderModal onClose={() => setIsCreateFolderModalOpen(false)} onCreate={handleCreateFolder} bookmarkTree={bookmarkTree} />)}
      {isCreateBookmarkModalOpen && (<CreateBookmarkModal onClose={() => setIsCreateBookmarkModalOpen(false)} onCreate={handleCreateBookmark} bookmarkTree={bookmarkTree} />)}
      {viewingSafetyReport && (<VirusTotalModal bookmark={viewingSafetyReport} onClose={() => setViewingSafetyReport(null)} onConfirm={() => { window.open(`https://www.virustotal.com/gui/domain/${new URL(viewingSafetyReport.url).hostname}`, '_blank'); setViewingSafetyReport(null); }} />)}
      {isDuplicateModalOpen && (<DuplicateBookmarksModal isOpen={isDuplicateModalOpen} onClose={() => setIsDuplicateModalOpen(false)} duplicateGroups={duplicateGroups} folderMap={folderMap} onDelete={handleDeleteItems} />)}
      {duplicateWarning && (<DuplicateWarningModal conflictingItem={duplicateWarning.conflictingItem} folderMap={folderMap} onClose={() => setDuplicateWarning(null)} onDelete={() => { handleDeleteItems([duplicateWarning.itemBeingEdited]); setDuplicateWarning(null); setEditingBookmark(null); }} onConfirmSave={handleConfirmDuplicateSave} />)}
      
      {undoHistory.length > 0 && <FloatingUndoButton onUndo={handleUndo} />}

      {hoveredBookmark && viewMode === 'grid' && <SitePreview target={hoveredBookmark} />}
      </div>
    </div>
  );
}
