"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Edit2, Save, X, FileText } from "lucide-react";
import type { Note } from "@/types/note";

interface NotesPanelProps {
  paperId: string;
  currentPage?: number;
}

export function NotesPanel({ paperId, currentPage }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [editNote, setEditNote] = useState({ title: "", content: "" });

  // Fetch notes on mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`/api/notes?paperId=${paperId}`);
        if (response.ok) {
          const data = await response.json();
          setNotes(data.notes || []);
        }
      } catch (error) {
        console.error("Error fetching notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [paperId]);

  // Create a new note
  const handleCreate = async () => {
    if (!newNote.content.trim()) return;

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId,
          title: newNote.title.trim() || undefined,
          content: newNote.content.trim(),
          pageNumber: currentPage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes((prev) => [data.note, ...prev]);
        setNewNote({ title: "", content: "" });
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  // Start editing a note
  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditNote({ title: note.title || "", content: note.content });
  };

  // Save edited note
  const handleSaveEdit = async () => {
    if (!editingId || !editNote.content.trim()) return;

    try {
      const response = await fetch(`/api/notes?id=${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editNote.title.trim() || undefined,
          content: editNote.content.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNotes((prev) =>
          prev.map((n) => (n.id === editingId ? data.note : n)),
        );
        setEditingId(null);
        setEditNote({ title: "", content: "" });
      }
    } catch (error) {
      console.error("Error updating note:", error);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNote({ title: "", content: "" });
  };

  // Delete a note
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notes?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Chargement...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Create new note */}
          {isCreating ? (
            <div className="p-3 rounded-lg border border-border bg-card space-y-3">
              <Input
                value={newNote.title}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Titre (optionnel)"
                className="text-sm"
              />
              <Textarea
                value={newNote.content}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Contenu de la note..."
                className="min-h-[100px] text-sm"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewNote({ title: "", content: "" });
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newNote.content.trim()}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Sauvegarder
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle note
            </Button>
          )}

          {/* Notes list */}
          {notes.length === 0 && !isCreating ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">Aucune note pour ce paper.</p>
              <p className="text-xs mt-1">
                Cliquez sur &quot;Nouvelle note&quot; pour commencer.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg border border-border bg-card"
              >
                {editingId === note.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editNote.title}
                      onChange={(e) =>
                        setEditNote((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Titre (optionnel)"
                      className="text-sm"
                    />
                    <Textarea
                      value={editNote.content}
                      onChange={(e) =>
                        setEditNote((prev) => ({
                          ...prev,
                          content: e.target.value,
                        }))
                      }
                      className="min-h-[100px] text-sm"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Annuler
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={!editNote.content.trim()}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Sauvegarder
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        {note.title && (
                          <h3 className="font-medium text-sm">{note.title}</h3>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(note.createdAt)}
                          {note.pageNumber && ` | Page ${note.pageNumber}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleStartEdit(note)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
