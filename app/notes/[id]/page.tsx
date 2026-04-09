// app/notes/[id]/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AppShell from '@/components/AppShell';
import supabase from '@/lib/supabaseClient';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Download,
  Edit,
  FileText,
  Printer,
  Share2,
  Trash2,
  User,
  Bookmark,
  Tag,
  School,
  ChevronRight,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Image,
  Archive,
  Code,
  FileSpreadsheet,
  FileJson,
  FileType,
  FileVideo,
  FileAudio,
  type LucideIcon,
} from 'lucide-react';

// ==================== TYPES ====================
interface Note {
  id: number;
  subject_id: number;
  notes_file_url: string | null;
  notes_content: string;
  description: string | null;
  grade_id: number | null;
  created_by_id: string | null;
  school_id: string | null;
  created: string;
  updated: string;
  subject?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
  grade?: {
    id: number;
    grade_name: string;
  } | null;
  teacher?: {
    registration_id: string;
    first_name: string;
    last_name: string;
    user_id: string;
  } | null;
  school?: {
    id: string;
    school_name: string;
  } | null;
}

interface TeacherProfileRow {
  full_name: string | null;
  email: string | null;
}

// ==================== UTILITIES ====================
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const getFileIcon = (url: string | null): LucideIcon => {
  if (!url) return FileText;

  const extension = url.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
      return FileText;
    case 'ppt':
    case 'pptx':
    case 'xls':
    case 'xlsx':
    case 'csv':
      return FileSpreadsheet;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'bmp':
      return Image;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
    case 'webm':
      return FileVideo;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
    case 'flac':
      return FileAudio;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return Archive;
    case 'json':
      return FileJson;
    case 'md':
    case 'markdown':
    case 'html':
    case 'htm':
    case 'xml':
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return Code;
    default:
      return FileType;
  }
};

const getFileTypeName = (url: string | null): string => {
  if (!url) return 'Document';

  const extension = url.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'PDF Document';
    case 'doc':
    case 'docx':
      return 'Word Document';
    case 'ppt':
    case 'pptx':
      return 'PowerPoint Presentation';
    case 'jpg':
    case 'jpeg':
      return 'JPEG Image';
    case 'png':
      return 'PNG Image';
    case 'gif':
      return 'GIF Image';
    case 'webp':
      return 'WebP Image';
    case 'bmp':
      return 'Bitmap Image';
    case 'mp4':
      return 'MP4 Video';
    case 'mov':
      return 'QuickTime Video';
    case 'avi':
      return 'AVI Video';
    case 'mkv':
      return 'MKV Video';
    case 'webm':
      return 'WebM Video';
    case 'mp3':
      return 'MP3 Audio';
    case 'wav':
      return 'WAV Audio';
    case 'ogg':
      return 'OGG Audio';
    case 'm4a':
      return 'M4A Audio';
    case 'flac':
      return 'FLAC Audio';
    case 'xls':
    case 'xlsx':
      return 'Excel Spreadsheet';
    case 'csv':
      return 'CSV File';
    case 'zip':
      return 'ZIP Archive';
    case 'rar':
      return 'RAR Archive';
    case '7z':
      return '7Z Archive';
    case 'txt':
      return 'Text File';
    case 'md':
      return 'Markdown File';
    case 'json':
      return 'JSON File';
    default:
      return extension ? `${extension.toUpperCase()} File` : 'Document';
  }
};

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

// ==================== COMPONENTS ====================
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors ml-2"
    >
      {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const TableOfContents: React.FC<{ content: string }> = ({ content }) => {
  const headings = useMemo(() => {
    return (content.match(/^#{1,3}\s.+$/gm) || []).map((heading) => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const text = heading.replace(/^#+\s/, '').trim();
      return {
        level,
        text,
        id: slugify(text),
      };
    });
  }, [content]);

  if (headings.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Bookmark size={14} />
        Table of Contents
      </h3>
      <ul className="space-y-1 text-sm">
        {headings.map((heading, idx) => (
          <li key={`${heading.id}-${idx}`} style={{ marginLeft: `${(heading.level - 1) * 16}px` }}>
            <a
              href={`#${heading.id}`}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null = null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }

      if (match[2] !== undefined) {
        nodes.push(
          <strong key={`b-${match.index}`} className="font-semibold text-gray-900">
            {match[2]}
          </strong>
        );
      } else if (match[3] !== undefined) {
        nodes.push(
          <code
            key={`c-${match.index}`}
            className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 text-[0.95em]"
          >
            {match[3]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  const renderContent = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inBulletList = false;
    let inNumberedList = false;
    let bulletItems: React.ReactNode[] = [];
    let numberedItems: React.ReactNode[] = [];
    let listKey = 0;

    const flushLists = () => {
      if (inBulletList && bulletItems.length > 0) {
        elements.push(
          <ul key={`ul-${listKey++}`} className="list-disc ml-5 mb-4 space-y-1">
            {bulletItems}
          </ul>
        );
      }

      if (inNumberedList && numberedItems.length > 0) {
        elements.push(
          <ol key={`ol-${listKey++}`} className="list-decimal ml-5 mb-4 space-y-1">
            {numberedItems}
          </ol>
        );
      }

      inBulletList = false;
      inNumberedList = false;
      bulletItems = [];
      numberedItems = [];
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        flushLists();
        const textValue = trimmed.slice(2).trim();
        elements.push(
          <h1
            key={`h1-${idx}`}
            id={slugify(textValue)}
            className="text-3xl font-bold mt-8 mb-4 text-gray-900"
          >
            {renderInline(textValue)}
          </h1>
        );
        return;
      }

      if (trimmed.startsWith('## ')) {
        flushLists();
        const textValue = trimmed.slice(3).trim();
        elements.push(
          <h2
            key={`h2-${idx}`}
            id={slugify(textValue)}
            className="text-2xl font-semibold mt-6 mb-3 text-gray-800"
          >
            {renderInline(textValue)}
          </h2>
        );
        return;
      }

      if (trimmed.startsWith('### ')) {
        flushLists();
        const textValue = trimmed.slice(4).trim();
        elements.push(
          <h3
            key={`h3-${idx}`}
            id={slugify(textValue)}
            className="text-xl font-semibold mt-4 mb-2 text-gray-800"
          >
            {renderInline(textValue)}
          </h3>
        );
        return;
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (inNumberedList) {
          flushLists();
        }
        inBulletList = true;
        bulletItems.push(
          <li key={`li-b-${idx}`} className="text-gray-700">
            {renderInline(trimmed.slice(2).trim())}
          </li>
        );
        return;
      }

      if (/^\d+\.\s/.test(trimmed)) {
        if (inBulletList) {
          flushLists();
        }
        inNumberedList = true;
        numberedItems.push(
          <li key={`li-n-${idx}`} className="text-gray-700">
            {renderInline(trimmed.replace(/^\d+\.\s/, ''))}
          </li>
        );
        return;
      }

      if (trimmed === '') {
        flushLists();
        elements.push(<div key={`sp-${idx}`} className="h-2" />);
        return;
      }

      flushLists();

      elements.push(
        <p key={`p-${idx}`} className="text-gray-700 leading-relaxed mb-3">
          {renderInline(trimmed)}
        </p>
      );
    });

    flushLists();
    return elements;
  };

  return <div className="prose prose-slate max-w-none">{renderContent(content)}</div>;
};

// ==================== MAIN COMPONENT ====================
export default function NoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const noteId = params?.id as string;

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    async function fetchNote() {
      if (!noteId) return;

      try {
        setLoading(true);
        setError(null);

        const parsedId = Number(noteId);
        if (Number.isNaN(parsedId)) {
          throw new Error('Invalid note ID');
        }

        const { data: noteData, error: noteError } = await supabase
          .from('notes')
          .select(`
            *,
            subject:subject_id(id, name, code),
            grade:grade_id(id, grade_name),
            teacher:created_by_id(registration_id, first_name, last_name, user_id),
            school:school_id(id, school_name)
          `)
          .eq('id', parsedId)
          .single();

        if (noteError) throw noteError;
        if (!noteData) throw new Error('Note not found');

        const normalizedNote = noteData as Note;

        if (normalizedNote.teacher?.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', normalizedNote.teacher.user_id)
            .single<TeacherProfileRow>();

          if (profileData?.full_name && !normalizedNote.teacher.first_name) {
            const names = profileData.full_name.trim().split(/\s+/);
            normalizedNote.teacher.first_name = names[0] || '';
            normalizedNote.teacher.last_name = names.slice(1).join(' ');
          }
        }

        setNote(normalizedNote);
      } catch (err: any) {
        console.error('Error fetching note:', err);
        setError(err?.message || 'Failed to load note');
      } finally {
        setLoading(false);
      }
    }

    fetchNote();
  }, [noteId]);

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      setShowShareMenu(false);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePrint = () => {
    if (!note) return;

    const printable = `
      <html>
        <head>
          <title>${escapeHtml(note.description || 'Lesson Notes')}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #111827;
              line-height: 1.6;
            }
            h1, h2, h3 {
              color: #111827;
            }
            .meta {
              margin-bottom: 24px;
              color: #4B5563;
              font-size: 14px;
            }
            .content {
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(note.description || 'Lesson Notes')}</h1>
          <div class="meta">
            Subject: ${escapeHtml(note.subject?.name || 'N/A')}<br />
            Grade: ${escapeHtml(note.grade?.grade_name || 'N/A')}<br />
            Created: ${escapeHtml(formatDate(note.created))}
          </div>
          <div class="content">${escapeHtml(note.notes_content)}</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(printable);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadFile = () => {
    if (note?.notes_file_url) {
      window.open(note.notes_file_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleEdit = () => {
    router.push(`/notes/${noteId}/edit`);
  };

  const handleDelete = async () => {
    if (!note) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this note? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      if (note.notes_file_url) {
        const bucketName = 'notes-files';
        const marker = `/${bucketName}/`;
        const markerIndex = note.notes_file_url.indexOf(marker);

        if (markerIndex !== -1) {
          const filePath = note.notes_file_url.slice(markerIndex + marker.length);
          await supabase.storage.from(bucketName).remove([filePath]);
        }
      }

      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('id', note.id);

      if (deleteError) throw deleteError;

      router.push('/notes');
    } catch (err: any) {
      console.error('Error deleting note:', err);
      setError(err?.message || 'Failed to delete note');
    }
  };

  const FileIcon = getFileIcon(note?.notes_file_url || null);
  const teacherName = note?.teacher
    ? `${note.teacher.first_name || ''} ${note.teacher.last_name || ''}`.trim() || 'Unknown Teacher'
    : 'Unknown Teacher';
  const hasFile = Boolean(note?.notes_file_url);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1">
            <div className="mx-auto max-w-5xl p-4 md:p-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="flex flex-col items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                  <p className="mt-4 text-gray-600">Loading note...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <AppShell />
          <main className="flex-1">
            <div className="mx-auto max-w-5xl p-4 md:p-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
                <h2 className="mt-4 text-xl font-semibold text-red-800">Note Not Found</h2>
                <p className="mt-2 text-red-600">
                  {error || 'The note you are looking for does not exist.'}
                </p>
                <Link
                  href="/notes"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Notes
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <AppShell />
        <main className="flex-1">
          <div className="mx-auto max-w-5xl p-4 md:p-6">
            <nav className="mb-6 flex items-center gap-2 text-sm">
              <Link href="/notes" className="text-gray-500 hover:text-gray-700 transition-colors">
                Notes
              </Link>
              <ChevronRight size={14} className="text-gray-400" />
              <span className="text-gray-900 font-medium truncate">
                {(note.description || note.notes_content || 'Note').slice(0, 50)}...
              </span>
            </nav>

            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    {note.subject && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        <BookOpen size={12} />
                        {note.subject.name}
                      </span>
                    )}

                    {note.grade && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                        <School size={12} />
                        {note.grade.grade_name}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Calendar size={12} />
                      {formatDate(note.created)}
                    </span>
                  </div>

                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {note.description || 'Lesson Notes'}
                  </h1>

                  {note.description && (
                    <p className="text-gray-600 mt-2">{note.description}</p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowShareMenu((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Share2 size={16} />
                      Share
                    </button>

                    {showShareMenu && (
                      <div className="absolute right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg p-2 z-10 min-w-[140px]">
                        <button
                          type="button"
                          onClick={handleShare}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg w-full"
                        >
                          {copiedLink ? (
                            <CheckCircle size={16} className="text-green-600" />
                          ) : (
                            <Copy size={16} />
                          )}
                          {copiedLink ? 'Copied!' : 'Copy link'}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Printer size={16} />
                    Print
                  </button>

                  <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Edit size={16} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <TableOfContents content={note.notes_content} />

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText size={18} />
                    Notes Content
                  </h2>
                  <div className="prose prose-slate max-w-none">
                    <MarkdownContent content={note.notes_content} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User size={18} />
                    Created By
                  </h2>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{teacherName}</p>
                      <p className="text-sm text-gray-500">Teacher</p>
                    </div>
                  </div>
                </div>

                {hasFile && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Download size={18} />
                      Attached File
                    </h2>
                    <div className="rounded-xl bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        <FileIcon size={32} className="text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {note.notes_file_url?.split('/').pop() || 'Document'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {getFileTypeName(note.notes_file_url)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadFile}
                          className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 transition-colors"
                        >
                          <Download size={16} />
                        </button>
                      </div>

                      <div className="mt-3">
                        <a
                          href={note.notes_file_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink size={12} />
                          Open in new tab
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock size={18} />
                    Metadata
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-gray-500">Created</span>
                      <span className="text-gray-900">{formatDate(note.created)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-gray-500">Last Updated</span>
                      <span className="text-gray-900">{formatDate(note.updated)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-3">
                      <span className="text-gray-500">Note ID</span>
                      <span className="text-gray-900 font-mono text-xs flex items-center">
                        #{note.id}
                        <CopyButton text={note.id.toString()} />
                      </span>
                    </div>
                    {note.school && (
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-500">School</span>
                        <span className="text-gray-900 text-right">{note.school.school_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Tag size={18} />
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {note.subject && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        {note.subject.name}
                      </span>
                    )}
                    {note.grade && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        Grade {note.grade.grade_name}
                      </span>
                    )}
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                      Lesson Notes
                    </span>
                    {hasFile && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                        Has Attachment
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}