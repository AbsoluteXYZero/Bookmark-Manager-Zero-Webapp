import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { FolderItem, BookmarkNode, BookmarkItem } from '../types';
import BookmarkList from './BookmarkList';
import { FolderIcon, ChevronRightIcon, KebabMenuIcon, DeleteIcon, EditIcon } from './Icons';

type VisibleFields = {
  url: boolean;
  tags: boolean;
  keyword: boolean;
  folder: boolean;
  dateAdded: boolean;
};

interface BookmarkFolderProps {
  folder: FolderItem;
  viewMode: 'grid' | 'list' | 'enhanced-list';
  zoomIndex: number;
  gridConfig: string;
  depth: number;
  visibleFields: VisibleFields;
  draggedItem: BookmarkNode | null;
  dragOverInfo: { parentId: string; index: number } | null;
  partingDirection: 'up' | 'down' | null;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  isAncestor: (draggedId: string, potentialParentId: string) => boolean;
  onEdit: (bookmark: BookmarkItem) => void;
  onDelete: (id: string) => void;
  onDeleteFolder: (folder: FolderItem) => void;
  onRenameFolder: (folderId: string, newTitle: string) => void;
  onViewSafetyReport: (bookmark: BookmarkItem) => void;
  onHoverStart: (url: string, element: HTMLElement) => void;
  onHoverEnd: () => void;
  onDragStart: (item: BookmarkNode) => void;
  onDragEnd: () => void;
  onDragOver: (info: { parentId: string, index: number }) => void;
  onDrop: () => void;
  setDraggedItem: (item: BookmarkNode | null) => void;
  setDragOverInfo: (info: { parentId: string; index: number } | null) => void;
  handleDrop: () => void;
}

const FolderActionsMenu: React.FC<{
  onDelete: () => void;
  onRename: () => void;
}> = ({ onDelete, onRename }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(p => !p)} className="p-1.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700" title="Folder actions">
                <KebabMenuIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl p-1 z-50">
                     <button
                        onClick={() => { onRename(); setIsOpen(false); }}
                        className="flex items-center w-full px-3 py-2 text-sm rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                    >
                        <EditIcon className="w-4 h-4 mr-3" />
                        <span>Rename Folder</span>
                    </button>
                    <button
                        onClick={() => { onDelete(); setIsOpen(false); }}
                        className="flex items-center w-full px-3 py-2 text-sm rounded-md text-red-600 dark:text-red-500 hover:bg-red-500/10"
                    >
                        <DeleteIcon className="w-4 h-4 mr-3" />
                        <span>Delete Folder</span>
                    </button>
                </div>
            )}
        </div>
    );
};


const BookmarkFolder: React.FC<BookmarkFolderProps> = (props) => {
  const { folder, viewMode, depth, onDeleteFolder, onRenameFolder, draggedItem, dragOverInfo, partingDirection, onDragStart, onDragEnd, onDragOver, onDrop, isAncestor, expandedFolders, onToggleFolder } = props;
  const folderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const indentationStyle = { paddingLeft: `${depth * 1.5}rem` };
  
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState(folder.title);

  useEffect(() => {
    if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleRename = () => {
    if (newTitle.trim() && newTitle.trim() !== folder.title) {
        onRenameFolder(folder.id, newTitle.trim());
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleRename();
    } else if (e.key === 'Escape') {
        setNewTitle(folder.title);
        setIsEditing(false);
    }
  };

  const isExpanded = expandedFolders.has(folder.id);
  const isBeingDragged = draggedItem?.id === folder.id;
  const isDropTargetIndicatorAbove = dragOverInfo?.parentId === folder.parentId && dragOverInfo?.index === folder.index;
  
  const isInvalidDropTarget = useMemo(() => {
    if (!draggedItem || draggedItem.type !== 'folder') return false;
    if (folder.id === draggedItem.id) return true;
    return isAncestor(draggedItem.id, folder.id);
  }, [draggedItem, folder.id, isAncestor]);

  const isDropTargetHighlight = dragOverInfo?.parentId === folder.id;
  
  const count = folder.children.length;
  const displayCount = count > 9999 ? '9k+' : String(count);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (folderRef.current && !isBeingDragged) {
        const rect = folderRef.current.getBoundingClientRect();
        const isTopHalf = e.clientY < rect.top + rect.height / 2;
        const newIndex = isTopHalf ? (folder.index ?? 0) : (folder.index ?? 0) + 1;
        onDragOver({ parentId: folder.parentId || 'root-id', index: newIndex });
    }
  };

  const handleDragOverInto = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isInvalidDropTarget) return;
      onDragOver({ parentId: folder.id, index: 0 }); // Drop at the beginning of the folder
  };
  
  const partingClass = partingDirection === 'up' ? '-translate-y-4' : partingDirection === 'down' ? 'translate-y-4' : '';

  const folderIconAndTitle = (
    <div className="flex items-center flex-grow cursor-pointer min-w-0" onClick={() => !isEditing && onToggleFolder(folder.id)}>
        <ChevronRightIcon className={`w-5 h-5 text-slate-500 dark:text-slate-400 mr-2 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
        <div className="relative mr-3 flex-shrink-0">
            <FolderIcon className="w-7 h-7 text-blue-500 dark:text-blue-400" />
            {count > 0 && (
                <span className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold pointer-events-none ${
                    count >= 1000 ? 'text-[8px]' : (count >= 100 ? 'text-[9px]' : 'text-[10px]')
                }`}>
                    {displayCount}
                </span>
            )}
        </div>
        {isEditing ? (
            <input
                ref={inputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="text-lg font-semibold bg-transparent text-slate-700 dark:text-slate-300 w-full border-b-2 border-blue-500 focus:outline-none"
                onClick={(e) => e.stopPropagation()}
            />
        ) : (
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300 truncate">{folder.title}</h2>
        )}
    </div>
  );

  if (viewMode === 'grid') {
      return (
        <div className="w-full col-span-full">
            <div
                draggable="true"
                onDragStart={(e) => {
                  console.log('[BookmarkFolder Grid] DragStart:', folder.title);
                  e.stopPropagation();
                  onDragStart(folder);
                }}
                onDragEnd={() => {
                  console.log('[BookmarkFolder Grid] DragEnd:', folder.title);
                  onDragEnd();
                }}
                onDrop={(e) => {
                  console.log('[BookmarkFolder Grid] Drop event:', folder.title);
                  e.preventDefault();
                  e.stopPropagation();
                  onDrop();
                }}
                onDragOver={handleDragOverInto}
                className={`transition-opacity p-2 rounded-lg ${isBeingDragged ? 'opacity-30' : 'opacity-100'} ${isDropTargetHighlight && !isInvalidDropTarget ? 'bg-blue-500/10 ring-2 ring-blue-500' : ''} ${isDropTargetHighlight && isInvalidDropTarget ? 'bg-red-500/10 ring-2 ring-red-500 cursor-not-allowed' : ''}`}
            >
                <div className={`flex items-center p-1 group transition-colors duration-150`}>
                    {folderIconAndTitle}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        {folder.parentId && folder.parentId !== 'root________' && (
                            <FolderActionsMenu onDelete={() => onDeleteFolder(folder)} onRename={() => setIsEditing(true)} />
                        )}
                    </div>
                </div>
            </div>
            {isExpanded && (
                <div className={`mt-2 pl-4 transition-all duration-300 ease-in-out`}>
                    <BookmarkList {...props} nodes={folder.children} depth={depth + 1} parentTitle={folder.title} />
                </div>
            )}
        </div>
      );
  }


  return (
    <div
      className={`relative py-2 -my-2`} // Expands the vertical drop zone
      onDragOver={handleDragOver}
      onDrop={(e) => {
        console.log('[BookmarkFolder List] Drop event:', folder.title);
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
    >
      {isDropTargetIndicatorAbove && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-full z-20 -mt-0.5"></div>}
      <div
        draggable="true"
        onDragStart={(e) => {
          console.log('[BookmarkFolder List] DragStart:', folder.title);
          e.stopPropagation();
          onDragStart(folder);
        }}
        onDragEnd={() => {
          console.log('[BookmarkFolder List] DragEnd:', folder.title);
          onDragEnd();
        }}
        className={`transition-all duration-300 cursor-grab ${partingClass} ${isBeingDragged ? 'opacity-30' : 'opacity-100'}`}
      >
        <div 
            ref={folderRef}
            className={`flex items-center p-2 rounded-lg group transition-colors duration-150`}
            style={indentationStyle}
        >
            <div 
                className={`flex items-center flex-grow p-1 rounded-md transition-all min-w-0
                  ${isDropTargetHighlight && !isInvalidDropTarget ? 'bg-blue-500/10 ring-2 ring-blue-500' : ''}
                  ${isDropTargetHighlight && isInvalidDropTarget ? 'bg-red-500/10 ring-2 ring-red-500 cursor-not-allowed' : ''}
                `}
                onDragOver={handleDragOverInto}
            >
                {folderIconAndTitle}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                {folder.parentId && folder.parentId !== 'root________' && (
                    <FolderActionsMenu onDelete={() => onDeleteFolder(folder)} onRename={() => setIsEditing(true)} />
                )}
            </div>
        </div>
      </div>
      {isExpanded && (
        <div className={`mt-2 transition-all duration-300 ease-in-out`}>
            <BookmarkList {...props} nodes={folder.children} depth={depth + 1} parentTitle={folder.title} />
        </div>
      )}
    </div>
  );
};

export default BookmarkFolder;