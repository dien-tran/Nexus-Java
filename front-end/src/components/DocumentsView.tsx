import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Trash2,
  List,
  Grid,
  Upload,
  Calendar,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  File,
  Check,
  FileText
} from 'lucide-react';
import { DocumentFile } from '../types';

interface DocumentsViewProps {
  userSession: { name: string; email: string } | null;
}

// Initial mock data as planned, reflecting the design screenshots
const INITIAL_DOCUMENTS: DocumentFile[] = [
  {
    id: 'doc-1',
    originalFilename: 'Q4_Strategy_Final.pdf',
    contentType: 'application/pdf',
    sizeBytes: 4404019, // 4.2 MB
    status: 'READY',
    createdAt: '2023-10-24T10:00:00Z',
    updatedAt: '2023-10-24T10:00:00Z'
  },
  {
    id: 'doc-2',
    originalFilename: 'Interview_Notes_v2.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 131072, // 128 KB
    status: 'READY',
    createdAt: '2023-10-22T14:30:00Z',
    updatedAt: '2023-10-22T14:30:00Z'
  },
  {
    id: 'doc-3',
    originalFilename: 'Hero_Illustration_Raw.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 13107200, // 12.5 MB
    status: 'READY',
    createdAt: '2023-10-19T09:15:00Z',
    updatedAt: '2023-10-19T09:15:00Z'
  },
  {
    id: 'doc-4',
    originalFilename: 'Product_Roadmap_2026.pdf',
    contentType: 'application/pdf',
    sizeBytes: 2202009, // 2.1 MB
    status: 'READY',
    createdAt: '2026-05-15T08:00:00Z',
    updatedAt: '2026-05-15T08:00:00Z'
  },
  {
    id: 'doc-5',
    originalFilename: 'User_Feedback_Summary.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 870400, // 850 KB
    status: 'READY',
    createdAt: '2026-05-10T16:45:00Z',
    updatedAt: '2026-05-10T16:45:00Z'
  },
  {
    id: 'doc-6',
    originalFilename: 'Brand_Guidelines_v1.pdf',
    contentType: 'application/pdf',
    sizeBytes: 19293798, // 18.4 MB
    status: 'READY',
    createdAt: '2026-04-30T11:20:00Z',
    updatedAt: '2026-04-30T11:20:00Z'
  },
  {
    id: 'doc-7',
    originalFilename: 'Competitor_Analysis.pptx',
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sizeBytes: 7025459, // 6.7 MB
    status: 'READY',
    createdAt: '2026-04-12T13:10:00Z',
    updatedAt: '2026-04-12T13:10:00Z'
  },
  {
    id: 'doc-8',
    originalFilename: 'Logo_Vector_Files.zip',
    contentType: 'application/zip',
    sizeBytes: 15728640, // 15 MB
    status: 'READY',
    createdAt: '2026-04-05T09:00:00Z',
    updatedAt: '2026-04-05T09:00:00Z'
  },
  {
    id: 'doc-9',
    originalFilename: 'Landing_Page_Copy.txt',
    contentType: 'text/plain',
    sizeBytes: 12288, // 12 KB
    status: 'READY',
    createdAt: '2026-03-20T15:30:00Z',
    updatedAt: '2026-03-20T15:30:00Z'
  },
  {
    id: 'doc-10',
    originalFilename: 'System_Architecture_v2.png',
    contentType: 'image/png',
    sizeBytes: 3145728, // 3 MB
    status: 'READY',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z'
  },
  {
    id: 'doc-11',
    originalFilename: 'Database_Schema.sql',
    contentType: 'text/plain',
    sizeBytes: 45056, // 44 KB
    status: 'READY',
    createdAt: '2026-02-28T14:00:00Z',
    updatedAt: '2026-02-28T14:00:00Z'
  }
];

// Helper to format byte sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper to format date matching the screenshot e.g., "Oct 24, 2023"
function formatUploadDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Custom components to draw high-fidelity mockups inside the Grid View Cards
function PDFPreviewGraphic() {
  return (
    <div className="w-full h-full bg-[#d17a5e] flex items-center justify-center relative overflow-hidden">
      {/* Abstract Pie Chart vector mimicking the screenshot */}
      <svg className="w-20 h-20 drop-shadow-md" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="#e2d2c8" />
        {/* Grey segment */}
        <path d="M 50 50 L 50 12 A 38 38 0 0 1 83 68 Z" fill="#8c8580" />
        {/* White segment */}
        <path d="M 50 50 L 83 68 A 38 38 0 0 1 18 68 Z" fill="#ffffff" />
        {/* Coral/Orange base segment */}
        <path d="M 50 50 L 18 68 A 38 38 0 0 1 50 12 Z" fill="#d17a5e" />
        {/* Separation lines */}
        <line x1="50" y1="50" x2="50" y2="12" stroke="#d17a5e" strokeWidth="2" />
        <line x1="50" y1="50" x2="83" y2="68" stroke="#d17a5e" strokeWidth="2" />
        <line x1="50" y1="50" x2="18" y2="68" stroke="#d17a5e" strokeWidth="2" />
      </svg>
    </div>
  );
}

function DocxPreviewGraphic() {
  return (
    <div className="w-full h-full bg-[#f4ece1] flex items-center justify-center p-4">
      {/* Mock Document Page sheet */}
      <div className="w-28 h-36 bg-white border border-[#e6dfd8] rounded-xs shadow-xs p-3 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Header line */}
          <div className="w-1/3 h-1.5 bg-[#cc785c]/30 rounded-xs"></div>
          {/* Small circle avatar placeholder in document page */}
          <div className="w-4 h-4 bg-[#8f482f]/20 rounded-full"></div>
          {/* Paragraph lines */}
          <div className="space-y-1 pt-1">
            <div className="w-full h-1 bg-[#efe9de] rounded-xs"></div>
            <div className="w-full h-1 bg-[#efe9de] rounded-xs"></div>
            <div className="w-5/6 h-1 bg-[#efe9de] rounded-xs"></div>
          </div>
        </div>
        <div className="w-1/2 h-1 bg-[#cc785c]/20 rounded-xs self-end"></div>
      </div>
    </div>
  );
}

function ImagePreviewGraphic({ url, filename }: { url?: string; filename: string }) {
  if (url) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden">
        <img src={url} alt={filename} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-full h-full bg-[#fcfbf9] flex items-center justify-center p-4">
      {/* Mock computer monitor vector with layout */}
      <div className="relative w-36 flex flex-col items-center">
        {/* Monitor Screen */}
        <div className="w-full h-24 bg-[#181715] rounded-t-md p-1 flex flex-col justify-between border border-[#252320]">
          {/* Mock web page */}
          <div className="w-full h-full bg-white rounded-xs p-1 flex flex-col gap-1 overflow-hidden">
            <div className="flex justify-between items-center border-b border-[#efe9de] pb-0.5">
              <div className="w-6 h-1 bg-[#cc785c] rounded-xs"></div>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-[#efe9de] rounded-full"></div>
                <div className="w-1 h-1 bg-[#efe9de] rounded-full"></div>
              </div>
            </div>
            {/* Grid display layout */}
            <div className="grid grid-cols-3 gap-0.5 flex-grow">
              <div className="bg-[#efe9de] rounded-xs"></div>
              <div className="bg-[#efe9de] rounded-xs col-span-2 flex flex-col gap-0.5 p-0.5">
                <div className="w-full h-1 bg-[#cc785c]/40 rounded-xs"></div>
                <div className="w-4/5 h-1 bg-[#cc785c]/20 rounded-xs"></div>
              </div>
            </div>
          </div>
        </div>
        {/* Monitor Neck */}
        <div className="w-4 h-3 bg-[#c8c0b5] border-x border-[#efe9de]"></div>
        {/* Monitor Base */}
        <div className="w-14 h-1.5 bg-[#b2a99e] rounded-t-sm"></div>
      </div>
    </div>
  );
}

function DefaultPreviewGraphic() {
  return (
    <div className="w-full h-full bg-[#efe9de] flex items-center justify-center">
      <File size={36} className="text-[#8f482f] stroke-[1.5px]" />
    </div>
  );
}

// Icon mapper for List View rows
function FileTypeIcon({ contentType }: { contentType: string }) {
  if (contentType === 'application/pdf') {
    return (
      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shrink-0">
        <span className="font-mono text-[9px] font-bold">PDF</span>
      </div>
    );
  }
  if (contentType.includes('word') || contentType.includes('officedocument.wordprocessingml')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
        <span className="font-mono text-[9px] font-bold">DOC</span>
      </div>
    );
  }
  if (contentType.startsWith('image/')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
        <span className="font-mono text-[9px] font-bold">IMG</span>
      </div>
    );
  }
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-700 border border-green-100 shrink-0">
        <span className="font-mono text-[9px] font-bold">XLS</span>
      </div>
    );
  }
  if (contentType.includes('zip') || contentType.includes('compressed')) {
    return (
      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shrink-0">
        <span className="font-mono text-[9px] font-bold">ZIP</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center text-stone-600 border border-stone-100 shrink-0">
      <FileText size={14} className="stroke-[2px]" />
    </div>
  );
}

export default function DocumentsView({ userSession }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>(INITIAL_DOCUMENTS);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'upload_time' | 'alphabet'>('upload_time');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close sorting dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset pagination when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, viewMode]);

  // Handle uploading files into React memory state
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: DocumentFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Basic type representation
      let mimeType = file.type || 'application/octet-stream';
      // If extension matches common ones and type is empty
      if (!file.type) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'docx' || ext === 'doc') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (ext === 'zip') mimeType = 'application/zip';
      }

      // If it is an image, let's create a local object URL to display as preview
      let imageUrl: string | undefined = undefined;
      if (mimeType.startsWith('image/')) {
        imageUrl = URL.createObjectURL(file);
      }

      const newDoc: DocumentFile = {
        id: `doc-${Date.now()}-${i}`,
        originalFilename: file.name,
        contentType: mimeType,
        sizeBytes: file.size,
        status: 'READY',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Stash the temporary object URL inside our custom entity extension
        r2Key: imageUrl // reuse the key for local preview urls in UI-only mode
      };
      newDocs.push(newDoc);
    }

    setDocuments(prev => [...newDocs, ...prev]);
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle deleting files from state
  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  // Filter documents based on search query
  const filteredDocs = documents.filter(doc =>
    doc.originalFilename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort documents based on selection
  const sortedDocs = [...filteredDocs].sort((a, b) => {
    if (sortBy === 'upload_time') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return a.originalFilename.localeCompare(b.originalFilename);
    }
  });

  // Pagination rules: 5 per page in list view, 6 per page in grid view
  const pageSize = viewMode === 'list' ? 5 : 6;
  const totalPages = Math.max(1, Math.ceil(sortedDocs.length / pageSize));
  
  // Safe bounds guard for current page
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedDocs.length);
  const paginatedDocs = sortedDocs.slice(startIndex, endIndex);

  return (
    <div className="h-full flex flex-col justify-between overflow-hidden">
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border-hairline shrink-0">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl font-medium text-ink">Document Library</h2>
          <p className="text-xs text-ink-muted">Manage and organize your editorial assets and reference materials with ease.</p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-98"
          >
            <Upload size={14} /> Upload
          </button>
        </div>
      </header>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 py-4 shrink-0">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2 bg-[#efe9de]/40 border border-border-hairline rounded-lg text-xs leading-none text-ink placeholder:text-ink-muted/50 focus:outline-hidden focus:ring-2 focus:ring-primary/10 transition-all"
          />
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        </div>

        {/* Layout Toggle and Sort Dropdown */}
        <div className="flex items-center justify-between sm:justify-end gap-6">
          {/* Toggle buttons */}
          <div className="bg-[#efe9de] border border-[#e6dfd8] rounded-lg p-1 flex items-center gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer select-none ${
                viewMode === 'list'
                  ? 'bg-canvas text-ink border border-border-hairline shadow-2xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <List size={13} /> List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer select-none ${
                viewMode === 'grid'
                  ? 'bg-canvas text-ink border border-border-hairline shadow-2xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Grid size={13} /> Grid
            </button>
          </div>

          {/* Sort Selector */}
          <div className="relative flex items-center gap-2" ref={sortDropdownRef}>
            <span className="text-xs text-ink-muted font-medium select-none">Sort by:</span>
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent text-xs font-bold text-ink border-b border-transparent hover:border-ink-muted/40 transition-all cursor-pointer"
            >
              {sortBy === 'upload_time' ? 'Upload Time' : 'Alphabet'}
              <ChevronDown size={12} className={`transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-canvas border border-border-hairline rounded-lg shadow-lg z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={() => {
                    setSortBy('upload_time');
                    setIsSortDropdownOpen(false);
                  }}
                  className="w-full px-4 py-1.5 text-left text-xs font-semibold text-ink hover:bg-[#efe9de]/50 flex items-center justify-between cursor-pointer"
                >
                  Upload Time
                  {sortBy === 'upload_time' && <Check size={11} className="text-primary" />}
                </button>
                <button
                  onClick={() => {
                    setSortBy('alphabet');
                    setIsSortDropdownOpen(false);
                  }}
                  className="w-full px-4 py-1.5 text-left text-xs font-semibold text-ink hover:bg-[#efe9de]/50 flex items-center justify-between cursor-pointer"
                >
                  Alphabet
                  {sortBy === 'alphabet' && <Check size={11} className="text-primary" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area (Scroll-disabled wrapper) */}
      <div className="flex-grow overflow-hidden flex flex-col justify-start">
        {paginatedDocs.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-border-hairline rounded-xl p-12 text-center bg-canvas">
            <File size={40} className="text-ink-muted/30 mb-3 stroke-[1.5px]" />
            <h3 className="font-serif text-base font-semibold text-ink mb-1">No documents found</h3>
            <p className="text-xs text-ink-muted max-w-xs">
              {searchQuery ? "No matches found for your search query. Try typing something else." : "Get started by uploading your first document to the library."}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View Layout */
          <div className="border border-border-hairline rounded-xl overflow-hidden bg-canvas flex flex-col shrink-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3.5 bg-[#efe9de] border-b border-border-hairline text-[10px] font-mono font-bold uppercase tracking-wider text-ink-muted">
              <div className="col-span-6 md:col-span-7">File Name</div>
              <div className="col-span-3 md:col-span-2">Upload Date</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Table Rows (Max 5 items) */}
            <div className="divide-y divide-border-hairline">
              {paginatedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-[#efe9de]/30 transition-colors"
                >
                  <div className="col-span-6 md:col-span-7 flex items-center gap-3 min-w-0">
                    <FileTypeIcon contentType={doc.contentType} />
                    <span className="font-sans font-semibold text-xs md:text-sm text-ink truncate select-all" title={doc.originalFilename}>
                      {doc.originalFilename}
                    </span>
                  </div>
                  <div className="col-span-3 md:col-span-2 font-mono text-[11px] text-ink-muted">
                    {formatUploadDate(doc.createdAt)}
                  </div>
                  <div className="col-span-2 font-mono text-[11px] text-ink-muted">
                    {formatFileSize(doc.sizeBytes)}
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 text-ink-muted hover:text-red-500 rounded-md transition-colors cursor-pointer select-none"
                      title="Delete document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Pad empty rows if we have less than 5 items to keep height constant and stationary */}
              {paginatedDocs.length < 5 && (
                Array.from({ length: 5 - paginatedDocs.length }).map((_, idx) => (
                  <div
                    key={`pad-${idx}`}
                    className="grid grid-cols-12 gap-4 px-6 py-[27px] items-center border-t border-border-hairline"
                  >
                    <div className="col-span-12"></div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Grid View Layout */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-2 shrink-0">
            {paginatedDocs.map((doc) => {
              // Renders preview graphics
              let preview = <DefaultPreviewGraphic />;
              if (doc.contentType === 'application/pdf') {
                preview = <PDFPreviewGraphic />;
              } else if (
                doc.contentType.includes('word') ||
                doc.contentType.includes('officedocument.wordprocessingml')
              ) {
                preview = <DocxPreviewGraphic />;
              } else if (doc.contentType.startsWith('image/')) {
                // If r2Key holds the temporary object URL, pass it
                preview = <ImagePreviewGraphic url={doc.r2Key} filename={doc.originalFilename} />;
              }

              return (
                <div
                  key={doc.id}
                  className="group bg-canvas border border-border-hairline rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-xs transition-all duration-200 relative flex flex-col h-[184px]"
                >
                  {/* Floating Delete button (visible on hover) */}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-canvas/90 hover:bg-red-50 text-ink-muted hover:text-red-500 rounded-full border border-border-hairline flex items-center justify-center shadow-xs transition-all duration-200 opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
                    title="Delete document"
                  >
                    <Trash2 size={11} />
                  </button>

                  {/* Image/Mockup Header Preview */}
                  <div className="h-[120px] w-full border-b border-border-hairline overflow-hidden shrink-0">
                    {preview}
                  </div>

                  {/* Bottom details box */}
                  <div className="p-3 flex items-center justify-between gap-2 bg-[#faf9f5] flex-grow">
                    <div className="min-w-0 flex flex-col justify-center">
                      <h4
                        className="font-sans font-semibold text-xs text-ink truncate select-all"
                        title={doc.originalFilename}
                      >
                        {doc.originalFilename}
                      </h4>
                      <div className="flex items-center gap-1 text-[10px] text-ink-muted font-sans mt-0.5">
                        <Calendar size={10} className="shrink-0" />
                        <span className="truncate">Edited {formatUploadDate(doc.createdAt)}</span>
                      </div>
                    </div>

                    {/* Small tag/indicator at bottom right */}
                    <div className="shrink-0">
                      {doc.contentType === 'application/pdf' ? (
                        /* Matches screenshot 1's avatar or colored tag */
                        <img
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop"
                          alt="Alex Rivera"
                          className="w-5 h-5 rounded-full object-cover border border-border-hairline"
                          title={userSession?.name || 'Alex Rivera'}
                        />
                      ) : doc.contentType.includes('word') || doc.contentType.includes('wordprocessingml') ? (
                        /* Red dot/badge tag matching screenshot 2 */
                        <div className="w-5 h-5 rounded-full bg-red-100 border border-red-200 flex items-center justify-center">
                          <span className="font-sans text-[8px] font-bold text-red-600">W</span>
                        </div>
                      ) : (
                        /* Teal tag matching screenshot 3 */
                        <div className="w-5 h-5 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center">
                          <span className="font-sans text-[8px] font-bold text-teal-600">T</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pad empty cards if we have less than 6 cards to keep grid height constant */}
            {paginatedDocs.length < 6 && (
              Array.from({ length: 6 - paginatedDocs.length }).map((_, idx) => (
                <div
                  key={`pad-grid-${idx}`}
                  className="border border-dashed border-border-hairline/40 rounded-xl h-[184px] flex items-center justify-center bg-transparent"
                ></div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Pagination Footer (Sticky at bottom, fixed height) */}
      <footer className="flex items-center justify-between border-t border-border-hairline pt-4 mt-2 shrink-0 h-12">
        <span className="text-[11px] font-sans text-ink-muted">
          Showing <strong className="text-ink font-medium">{startIndex + 1}</strong>-
          <strong className="text-ink font-medium">{Math.min(endIndex, sortedDocs.length)}</strong> of{' '}
          <strong className="text-ink font-medium">{sortedDocs.length}</strong> documents
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={activePage === 1}
            className="px-3 py-1.5 bg-canvas border border-border-hairline hover:bg-[#efe9de]/30 text-ink-muted disabled:opacity-40 disabled:hover:bg-canvas rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer select-none disabled:cursor-not-allowed"
          >
            <ArrowLeft size={12} /> Previous
          </button>
          
          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const isActive = activePage === pageNum;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-primary text-white shadow-2xs'
                    : 'bg-canvas border border-border-hairline hover:bg-[#efe9de]/30 text-ink-muted'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={activePage === totalPages}
            className="px-3 py-1.5 bg-canvas border border-border-hairline hover:bg-[#efe9de]/30 text-ink-muted disabled:opacity-40 disabled:hover:bg-canvas rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer select-none disabled:cursor-not-allowed"
          >
            Next <ArrowRight size={12} />
          </button>
        </div>
      </footer>
    </div>
  );
}
