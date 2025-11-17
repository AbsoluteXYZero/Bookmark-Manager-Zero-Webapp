import React, { useState, useRef, useEffect } from 'react';
import type { BookmarkItem, Bookmark, BookmarkNode } from '../types';
import { EditIcon, DeleteIcon, LinkIcon, LoaderIcon, ShieldIcon, KebabMenuIcon, TextOnlyIcon, PdfIcon } from './Icons';
import Tooltip from './Tooltip';

type VisibleFields = {
  url: boolean;
  tags: boolean;
  keyword: boolean;
  folder: boolean;
  dateAdded: boolean;
};

interface BookmarkCardProps {
  bookmark: BookmarkItem;
  viewMode: 'grid' | 'list' | 'enhanced-list';
  zoomIndex: number;
  depth: number;
  parentTitle?: string;
  visibleFields: VisibleFields;
  draggedItem: BookmarkNode | null;
  dragOverInfo: { parentId: string; index: number } | null;
  partingDirection: 'up' | 'down' | null;
  onEdit: () => void;
  onDelete: () => void;
  onViewSafetyReport: () => void;
  onHoverStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  onHoverEnd: () => void;
  onDragStart: (item: BookmarkNode) => void;
  onDragEnd: () => void;
  onDragOver: (info: { parentId: string, index: number }) => void;
  onDrop: () => void;
}

const getStatusInfo = (status: Bookmark['status']) => {
  switch (status) {
    case 'live':
      return { className: 'bg-green-500', text: 'Link is live', pulse: false };
    case 'dead':
      return { className: 'bg-red-500', text: 'Link is dead or unreachable', pulse: false };
    case 'parked':
      return { className: 'bg-red-500', text: 'Domain may be for sale', pulse: false };
    case 'checking':
      return { className: 'bg-slate-500', text: 'Checking link status...', pulse: true };
    default:
      return { className: 'bg-slate-400 dark:bg-slate-600', text: 'Link status unchecked', pulse: false };
  }
};

const getSafetyInfo = (status: Bookmark['safetyStatus']) => {
    switch (status) {
        case 'safe':
            return { className: 'text-green-500', text: 'Link is considered safe', pulse: false };
        case 'unsafe':
            return { className: 'text-red-500', text: 'Link is potentially unsafe', pulse: false };
        case 'checking':
            return { className: 'text-slate-500', text: 'Checking link safety...', pulse: true };
        default:
            return { className: 'text-slate-500 dark:text-slate-600', text: 'Link safety unknown', pulse: false };
    }
};

const StatusIndicator: React.FC<{ status: Bookmark['status'] }> = ({ status }) => {
  const { className, pulse } = getStatusInfo(status);
  const baseClasses = "w-2.5 h-2.5 rounded-full flex-shrink-0";
  return <div className={`${baseClasses} ${className} ${pulse ? 'animate-pulse' : ''}`}></div>;
};

const SafetyIndicator: React.FC<{ status: Bookmark['safetyStatus'] }> = ({ status }) => {
  const { className, pulse } = getSafetyInfo(status);
  const baseClasses = "w-4 h-4 flex-shrink-0";
  return <ShieldIcon className={`${baseClasses} ${className} ${pulse ? 'animate-pulse' : ''}`} />;
};


// New component for the inline preview in list view
const InlineSitePreview: React.FC<{ url: string }> = ({ url }) => {
  const [isImgLoading, setIsImgLoading] = useState(true);
  const imageUrl = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=320&h=180`;

  return (
    <div className="w-full h-full bg-slate-200 dark:bg-slate-700/50 relative flex items-center justify-center overflow-hidden">
      {isImgLoading && (
        <div className="text-slate-500 dark:text-slate-400">
          <LoaderIcon className="h-6 w-6 animate-spin" />
        </div>
      )}
      <img
        src={imageUrl}
        alt={`Preview of ${url}`}
        className={`w-full h-full object-cover absolute top-0 left-0 transition-opacity duration-300 ${isImgLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsImgLoading(false)}
        onError={() => setIsImgLoading(false)}
      />
    </div>
  );
};

const ActionsMenu: React.FC<{
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenAsTextOnly: () => void;
  onDownloadAsPdf: () => void;
}> = ({ isOpen, onToggle, onClose, onEdit, onDelete, onOpenAsTextOnly, onDownloadAsPdf }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);


    const menuItems = [
        { label: 'Edit', icon: EditIcon, action: onEdit },
        { label: 'Open as Text-Only', icon: TextOnlyIcon, action: onOpenAsTextOnly },
        { label: 'Download as PDF', icon: PdfIcon, action: onDownloadAsPdf },
        { label: 'Delete', icon: DeleteIcon, action: onDelete, isDestructive: true },
    ];

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={onToggle}
                className="p-1.5 rounded-full bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300" 
                title="Actions"
            >
                <KebabMenuIcon className="h-4 w-4" />
            </button>
            {isOpen && (
                 <div
                    className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl p-1 z-50 animate-fade-in-up"
                >
                    {menuItems.map(({ label, icon: Icon, action, isDestructive }) => (
                         <button 
                            key={label}
                            onClick={() => { action(); onClose(); }}
                            className={`flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors ${isDestructive ? 'text-red-600 dark:text-red-500 hover:bg-red-500/10' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'}`}
                         >
                            <Icon className="w-4 h-4 mr-3" />
                            <span>{label}</span>
                        </button>
                    ))}
                    <style>{`
                      @keyframes fade-in-up {
                        from { opacity: 0; transform: translateY(-0.5rem); }
                        to { opacity: 1; transform: translateY(0); }
                      }
                      .animate-fade-in-up { animation: fade-in-up 0.1s ease-out forwards; }
                    `}</style>
                </div>
            )}
        </div>
    );
};


const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, viewMode, zoomIndex, depth, parentTitle, visibleFields, draggedItem, dragOverInfo, partingDirection, onEdit, onDelete, onViewSafetyReport, onHoverStart, onHoverEnd, onDragStart, onDragEnd, onDragOver, onDrop }) => {
  const domain = new URL(bookmark.url).hostname;
  const faviconUrl = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${bookmark.url}&size=64`;
  const [isListHovered, setIsListHovered] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const isBeingDragged = draggedItem?.id === bookmark.id;
  const isDropTargetAbove = dragOverInfo?.parentId === bookmark.parentId && dragOverInfo?.index === bookmark.index;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cardRef.current && !isBeingDragged) {
        const rect = cardRef.current.getBoundingClientRect();
        const isTopHalf = e.clientY < rect.top + rect.height / 2;
        const newIndex = isTopHalf ? (bookmark.index ?? 0) : (bookmark.index ?? 0) + 1;
        console.log('[BookmarkCard] DragOver:', { bookmarkTitle: bookmark.title, parentId: bookmark.parentId || 'root-id', newIndex });
        onDragOver({ parentId: bookmark.parentId || 'root-id', index: newIndex });
    }
  };

  useEffect(() => {
    if (cardRef.current) {
        cardRef.current.setAttribute('data-menu-open', String(isActionsMenuOpen));
    }
  }, [isActionsMenuOpen]);
  
  const indentationStyle = { paddingLeft: `${depth * 1.5}rem` };
  const formattedDate = bookmark.dateAdded ? new Date(bookmark.dateAdded).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  const handleEditAction = () => { onEdit(); setIsActionsMenuOpen(false); };
  const handleDeleteAction = () => { onDelete(); setIsActionsMenuOpen(false); };
  
  const handleOpenAsTextOnly = () => {
    const browser = (window as any).browser;
    if (browser && browser.runtime && browser.runtime.sendMessage) {
        browser.runtime.sendMessage({
            action: "openReaderView",
            url: bookmark.url
        });
    } else {
        console.error("Browser APIs not available. Using fallback window.open(). Note: This will only work correctly inside a real extension environment.");
        window.open(`reader.html?url=${encodeURIComponent(bookmark.url)}`, '_blank');
    }
    setIsActionsMenuOpen(false);
  };

  const handleDownloadAsPdf = () => {
    const browser = (window as any).browser;
    if (browser && browser.runtime && browser.runtime.sendMessage) {
        browser.runtime.sendMessage({
            action: "openPrintView",
            url: bookmark.url
        });
    } else {
        console.warn("Browser APIs not available. PDF download is only available in a real extension environment.");
        alert("PDF download is only available when running as a real extension.");
    }
    setIsActionsMenuOpen(false);
  };

  const handleHoverStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActionsMenuOpen) {
        onHoverStart(e);
    }
  };

  const toggleActionsMenu = () => {
    const willOpen = !isActionsMenuOpen;
    if (willOpen) {
        onHoverEnd();
    }
    setIsActionsMenuOpen(willOpen);
  };


  if (viewMode === 'list' || viewMode === 'enhanced-list') {
    const isEnhanced = viewMode === 'enhanced-list';
    const listZoomStyles = [
      { height: 'h-9', hoverHeight: 'h-32', title: 'text-[11px]', meta: 'text-[10px]' },
      { height: 'h-10', hoverHeight: 'h-36', title: 'text-xs', meta: 'text-[11px]' },
      { height: 'h-12', hoverHeight: 'h-40', title: 'text-xs', meta: 'text-xs' }, 
      { height: 'h-14', hoverHeight: 'h-48', title: 'text-sm', meta: 'text-xs' },
      { height: 'h-16', hoverHeight: 'h-56', title: 'text-base', meta: 'text-sm' }, 
      { height: 'h-20', hoverHeight: 'h-64', title: 'text-lg', meta: 'text-sm' },
    ];
    const enhancedListZoomStyles = [
      { minHeight: 'min-h-20', hoverHeight: 'h-32', padding: 'p-2', title: 'text-[11px]', url: 'text-[10px]', meta: 'text-[9px]' },
      { minHeight: 'min-h-24', hoverHeight: 'h-36', padding: 'p-2', title: 'text-xs', url: 'text-[11px]', meta: 'text-[10px]' },
      { minHeight: 'min-h-28', hoverHeight: 'h-40', padding: 'p-3', title: 'text-sm', url: 'text-xs', meta: 'text-xs' },
      { minHeight: 'min-h-32', hoverHeight: 'h-48', padding: 'p-4', title: 'text-base', url: 'text-xs', meta: 'text-xs' },
      { minHeight: 'min-h-36', hoverHeight: 'h-56', padding: 'p-4', title: 'text-lg', url: 'text-sm', meta: 'text-sm' },
      { minHeight: 'min-h-40', hoverHeight: 'h-64', padding: 'p-5', title: 'text-xl', url: 'text-base', meta: 'text-base' },
    ];
    
    const currentStyle = isEnhanced ? enhancedListZoomStyles[zoomIndex] : listZoomStyles[zoomIndex];
    const heightClass = isListHovered ? currentStyle.hoverHeight : ('minHeight' in currentStyle ? currentStyle.minHeight : currentStyle.height);
    const partingClass = partingDirection === 'up' ? '-translate-y-4' : partingDirection === 'down' ? 'translate-y-4' : '';

    return (
        <div
          className="relative py-2 -my-2" // Expands the vertical drop zone
          onDragOver={handleDragOver}
          onDrop={(e) => {
            console.log('[BookmarkCard List] Drop event:', bookmark.title);
            e.preventDefault();
            e.stopPropagation();
            onDrop();
          }}
        >
            {isDropTargetAbove && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-full z-20 -mt-0.5"></div>}
            <div
                draggable="true"
                onDragStart={(e) => {
                  console.log('[BookmarkCard] DragStart:', bookmark.title);
                  e.stopPropagation();
                  onDragStart(bookmark);
                }}
                onDragEnd={() => {
                  console.log('[BookmarkCard] DragEnd:', bookmark.title);
                  onDragEnd();
                }}
                className={`group relative flex items-center transition-all duration-300 cursor-grab ${partingClass} ${isBeingDragged ? 'opacity-30' : 'opacity-100'}`}
                style={indentationStyle}
                data-menu-open={isActionsMenuOpen}
            >
                <div
                ref={cardRef}
                className={`flex-grow min-w-0 flex items-stretch bg-white dark:bg-slate-800 border border-transparent hover:border-blue-500/50 rounded-lg shadow-md dark:shadow-lg transition-all duration-300 ease-in-out overflow-hidden ${heightClass}`}
                onMouseEnter={(e) => {
                    setIsListHovered(true);
                    if (isEnhanced && !isActionsMenuOpen) {
                        onHoverStart(e);
                    }
                }}
                onMouseLeave={() => {
                    setIsListHovered(false);
                    onHoverEnd();
                }}
                >
                {'minHeight' in currentStyle ? (
                    <div className={`flex-grow min-w-0 flex items-center ${currentStyle.padding}`}>
                    <div className="flex-grow min-w-0 flex items-start">
                        <div className="flex items-center flex-shrink-0 pt-1.5 space-x-3">
                            <Tooltip content={getStatusInfo(bookmark.status).text}>
                            <StatusIndicator status={bookmark.status} />
                            </Tooltip>
                            <Tooltip content={getSafetyInfo(bookmark.safetyStatus).text}>
                            <button onClick={onViewSafetyReport} className="cursor-pointer">
                                <SafetyIndicator status={bookmark.safetyStatus} />
                            </button>
                            </Tooltip>
                        </div>
                        <div className="flex-grow min-w-0 ml-4">
                            <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                            <h3 className={`${currentStyle.title} font-semibold text-slate-800 dark:text-slate-100`} title={bookmark.title}>
                                {bookmark.title}
                            </h3>
                            </a>
                            {visibleFields.url && (
                            <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className={`${currentStyle.url} text-slate-500 dark:text-slate-400 truncate block mt-1`} title={bookmark.url}>
                                {bookmark.url}
                            </a>
                            )}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
                            {visibleFields.dateAdded && formattedDate && ( <p className={`${currentStyle.meta} text-slate-600 dark:text-slate-500`} title="Date Added"><span className="font-semibold text-slate-700 dark:text-slate-400">Added:</span> {formattedDate}</p> )}
                            {visibleFields.keyword && bookmark.keyword && ( <p className={`${currentStyle.meta} text-slate-600 dark:text-slate-500 flex items-center`} title="Keyword"><span className="font-semibold text-slate-700 dark:text-slate-400">Keyword:</span> <span className="ml-1.5 bg-slate-200 dark:bg-slate-700/50 px-2 py-0.5 rounded">{bookmark.keyword}</span></p> )}
                            {visibleFields.folder && parentTitle && ( <p className={`${currentStyle.meta} text-slate-600 dark:text-slate-500`} title="Parent Folder"><span className="font-semibold text-slate-700 dark:text-slate-400">Folder:</span> <span className="truncate">{parentTitle}</span></p> )}
                            </div>
                            {visibleFields.tags && bookmark.tags.length > 0 && ( <div className="flex flex-wrap gap-1.5 mt-3">{bookmark.tags.map(tag => ( <span key={tag} className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">{tag}</span>))}</div> )}
                        </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 flex-grow min-w-0 p-3 pr-0 transition-all duration-300">
                    <Tooltip content={getStatusInfo(bookmark.status).text}>
                        <StatusIndicator status={bookmark.status} />
                    </Tooltip>
                    <Tooltip content={getSafetyInfo(bookmark.safetyStatus).text}>
                        <button onClick={onViewSafetyReport} className="cursor-pointer">
                        <SafetyIndicator status={bookmark.safetyStatus} />
                        </button>
                    </Tooltip>
                    <img src={faviconUrl} alt="" className="w-5 h-5 rounded-sm object-contain flex-shrink-0" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="truncate flex-grow">
                        <h3 className={`${currentStyle.title} font-semibold text-slate-800 dark:text-slate-100 truncate`} title={bookmark.title}>
                        {bookmark.title}
                        </h3>
                    </a>
                    {visibleFields.tags && bookmark.tags.length > 0 && ( <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">{bookmark.tags.slice(0, 1).map(tag => ( <span key={tag} className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">{tag}</span>))}</div>)}
                    <div className="flex-shrink-0 hidden md:flex items-center gap-3 ml-4">
                        {visibleFields.dateAdded && formattedDate && <span className={`${currentStyle.meta} text-slate-500 dark:text-slate-500`}>{formattedDate}</span>}
                        {visibleFields.url && ( <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className={`${currentStyle.meta} text-slate-500 dark:text-slate-400 truncate`} title={bookmark.url}>{domain}</a> )}
                    </div>
                    </div>
                )}
                <div className={`flex-shrink-0 transition-all duration-300 ease-in-out ${isListHovered ? 'w-56' : 'w-0'}`}>
                    {(isListHovered && (viewMode === 'list' || (isEnhanced && !isActionsMenuOpen))) && <InlineSitePreview url={bookmark.url} />}
                </div>
                </div>
                <div className="flex-shrink-0 flex items-center p-2">
                    <ActionsMenu 
                        isOpen={isActionsMenuOpen}
                        onToggle={toggleActionsMenu}
                        onClose={() => setIsActionsMenuOpen(false)}
                        onEdit={handleEditAction}
                        onDelete={handleDeleteAction}
                        onOpenAsTextOnly={handleOpenAsTextOnly}
                        onDownloadAsPdf={handleDownloadAsPdf}
                    />
                </div>
            </div>
        </div>
    );
  }

  // Grid View
  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDrop={(e) => {
        console.log('[BookmarkCard Grid] Drop event:', bookmark.title);
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
    >
      {isDropTargetAbove && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-full z-10 -mt-0.5"></div>}
      <div
        ref={cardRef}
        draggable="true"
        onDragStart={(e) => {
          console.log('[BookmarkCard Grid] DragStart:', bookmark.title);
          e.stopPropagation();
          onDragStart(bookmark);
        }}
        onDragEnd={() => {
          console.log('[BookmarkCard Grid] DragEnd:', bookmark.title);
          onDragEnd();
        }}
        className={`group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-md dark:shadow-lg transition-all duration-300 hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:border-blue-500/50 flex flex-col ${isActionsMenuOpen ? 'z-20 overflow-visible' : 'overflow-hidden'} ${isBeingDragged ? 'opacity-30' : 'opacity-100'}`}
        onMouseLeave={onHoverEnd}
        data-menu-open={isActionsMenuOpen}
      >
        <div 
          className="p-4 flex-grow flex flex-col"
          onMouseEnter={handleHoverStart}
        >
          <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="block flex-grow">
            <div className="flex items-start mb-3">
              <img 
                src={faviconUrl} 
                alt=""
                className="w-6 h-6 mr-3 mt-0.5 rounded-sm object-contain flex-shrink-0"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight" title={bookmark.title}>
                {bookmark.title}
              </h3>
            </div>
          </a>
          
          {visibleFields.tags && bookmark.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
              {bookmark.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div 
            className="mt-auto pt-2 space-y-2"
          >
              <div className="flex items-center gap-2">
                <Tooltip content={getStatusInfo(bookmark.status).text}>
                  <StatusIndicator status={bookmark.status} />
                </Tooltip>
                <Tooltip content={getSafetyInfo(bookmark.safetyStatus).text}>
                  <button onClick={onViewSafetyReport} className="cursor-pointer">
                    <SafetyIndicator status={bookmark.safetyStatus} />
                  </button>
                </Tooltip>
                {visibleFields.url && (
                  <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-slate-500 dark:text-slate-400 min-w-0">
                    <LinkIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                    <span className="truncate" title={bookmark.url}>{domain}</span>
                  </a>
                )}
              </div>
              {visibleFields.dateAdded && formattedDate && (
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                      Added: {formattedDate}
                  </p>
              )}
          </div>
        </div>

        <div 
          className="absolute top-2 right-2"
          onMouseEnter={onHoverEnd}
        >
          <ActionsMenu
              isOpen={isActionsMenuOpen}
              onToggle={toggleActionsMenu}
              onClose={() => setIsActionsMenuOpen(false)}
              onEdit={handleEditAction}
              onDelete={handleDeleteAction}
              onOpenAsTextOnly={handleOpenAsTextOnly}
              onDownloadAsPdf={handleDownloadAsPdf}
          />
        </div>
      </div>
    </div>
  );
};

export default BookmarkCard;