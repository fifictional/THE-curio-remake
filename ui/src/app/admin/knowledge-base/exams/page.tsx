"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useExamsAdminApi, type Exam } from "@/hooks/api/knowledge-base/use-exams-admin.api";
import { SelectConceptsDialog } from "@/components/admin/select-concepts-dialog";
import type { Concept } from "@/hooks/api/knowledge-base/use-concepts-admin.api";

export default function ExamsPage() {
  const { exams, isLoading, error, fetchExams, createExam, updateExam, deleteExam, fetchConceptsByExam, linkConceptToExam, unlinkConceptFromExam } = useExamsAdminApi();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isConceptsDialogOpen, setIsConceptsDialogOpen] = useState(false);
  const [linkedConcepts, setLinkedConcepts] = useState<Map<string, Concept[]>>(new Map());
  const [conceptCounts, setConceptCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    // Fetch concept counts for all exams
    const fetchConceptCounts = async () => {
      const counts = new Map<string, number>();
      for (const exam of exams) {
        try {
          const concepts = await fetchConceptsByExam(exam.id);
          counts.set(exam.id, concepts.length);
          setLinkedConcepts((prev) => {
            const newMap = new Map(prev);
            newMap.set(exam.id, concepts);
            return newMap;
          });
        } catch (err) {
          console.error(`Failed to fetch concepts for exam ${exam.id}:`, err);
          counts.set(exam.id, 0);
        }
      }
      setConceptCounts(counts);
    };

    if (exams.length > 0) {
      fetchConceptCounts();
    }
  }, [exams, fetchConceptsByExam]);

  const handleCreate = () => {
    setEditing(null);
    setFormData({ id: "", name: "", description: "" });
    setIsOpen(true);
  };

  const handleEdit = async (exam: Exam) => {
    setEditing(exam);
    setFormData({
      id: exam.id,
      name: exam.name,
      description: exam.description || "",
    });
    setIsOpen(true);
    
    // Load concepts for this exam if not already loaded
    if (!linkedConcepts.has(exam.id)) {
      try {
        const concepts = await fetchConceptsByExam(exam.id);
        setLinkedConcepts((prev) => {
          const newMap = new Map(prev);
          newMap.set(exam.id, concepts);
          return newMap;
        });
        setConceptCounts((prev) => {
          const newMap = new Map(prev);
          newMap.set(exam.id, concepts.length);
          return newMap;
        });
      } catch (err) {
        console.error(`Failed to fetch concepts for exam ${exam.id}:`, err);
      }
    }
  };

  const handleSelectConcepts = () => {
    if (editing) {
      setIsConceptsDialogOpen(true);
    }
  };

  const handleSaveConcepts = async (conceptIds: string[]) => {
    if (!editing) return;

    try {
      // Get current linked concepts
      const currentConcepts = linkedConcepts.get(editing.id) || [];
      const currentIds = new Set(currentConcepts.map((c) => c.id));
      const newIds = new Set(conceptIds);

      // Find concepts to link (in newIds but not in currentIds)
      const toLink = conceptIds.filter((id) => !currentIds.has(id));
      // Find concepts to unlink (in currentIds but not in newIds)
      const toUnlink = Array.from(currentIds).filter((id) => !newIds.has(id));

      // Perform link/unlink operations
      await Promise.all([
        ...toLink.map((id) => linkConceptToExam(id, editing.id)),
        ...toUnlink.map((id) => unlinkConceptFromExam(id, editing.id)),
      ]);

      // Refresh concept counts
      const updatedConcepts = await fetchConceptsByExam(editing.id);
      setLinkedConcepts((prev) => {
        const newMap = new Map(prev);
        newMap.set(editing.id, updatedConcepts);
        return newMap;
      });
      setConceptCounts((prev) => {
        const newMap = new Map(prev);
        newMap.set(editing.id, updatedConcepts.length);
        return newMap;
      });
    } catch (err) {
      console.error("Failed to save concept links:", err);
      throw err;
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm(`Are you sure you want to delete "${examId}"? This will remove all links to concepts.`)) {
      return;
    }

    try {
      await deleteExam(examId);
    } catch (err) {
      alert("Failed to delete exam. Check console for details.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editing) {
        await updateExam({
          id: formData.id,
          name: formData.name,
          description: formData.description || undefined,
        });
      } else {
        await createExam({
          id: formData.id,
          name: formData.name,
          description: formData.description || undefined,
        });
      }
      setIsOpen(false);
    } catch (err) {
      alert("Failed to save exam. Check console for details.");
    }
  };

  const filteredExams = exams.filter((exam) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      exam.id.toLowerCase().includes(search) ||
      exam.name.toLowerCase().includes(search) ||
      (exam.description || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Exams</h2>
        <Button onClick={handleCreate}>New Exam</Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search exams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <span className="text-sm text-muted-foreground">
          {filteredExams.length} of {exams.length} exams
        </span>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Concepts</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredExams.map((exam) => (
                <tr key={exam.id} className="text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{exam.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{exam.name}</td>
                  <td className="px-4 py-3 text-gray-700">{exam.description || "-"}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {conceptCounts.get(exam.id) ?? "..."}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(exam)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(exam.id)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editing ? "Edit Exam" : "Create Exam"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="id">ID *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., SAT"
                  required
                  disabled={!!editing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Unique identifier (uppercase, e.g., SAT, AP, GCSE)
                </p>
              </div>
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., SAT"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              {editing && (
                <div>
                  <Label>Linked Concepts</Label>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSelectConcepts}
                    >
                      Select Concepts
                    </Button>
                    <span className="ml-3 text-sm text-gray-600">
                      {conceptCounts.get(editing.id) ?? 0} concepts linked
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConceptsDialogOpen && editing && (
        <SelectConceptsDialog
          isOpen={isConceptsDialogOpen}
          onClose={() => setIsConceptsDialogOpen(false)}
          examId={editing.id}
          selectedConceptIds={(linkedConcepts.get(editing.id) || []).map((c) => c.id)}
          onSave={handleSaveConcepts}
        />
      )}
    </div>
  );
}

