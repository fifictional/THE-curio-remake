"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useConceptsAdminApi, type Concept } from "@/hooks/api/knowledge-base/use-concepts-admin.api";
import { useTopicsAdminApi } from "@/hooks/api/knowledge-base/use-topics-admin.api";
import { useSubjectsAdminApi } from "@/hooks/api/knowledge-base/use-subjects-admin.api";

export default function ConceptsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subjectId");
  const topicId = searchParams.get("topicId");
  
  const { subjects } = useSubjectsAdminApi();
  const { topics } = useTopicsAdminApi(subjectId || undefined);
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const selectedTopic = topics.find((t) => t.id === topicId);
  
  const { concepts, isLoading, error, fetchConcepts, createConcept, updateConcept, deleteConcept } = useConceptsAdminApi(topicId || undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Concept | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    displayName: "",
    description: "",
    difficulty: undefined as number | undefined,
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  const handleCreate = () => {
    if (!topicId) {
      alert("Please select a topic first");
      return;
    }
    setEditing(null);
    setFormData({ id: "", displayName: "", description: "", difficulty: undefined });
    setIsOpen(true);
  };

  const handleEdit = (concept: Concept) => {
    setEditing(concept);
    setFormData({
      id: concept.id,
      displayName: concept.displayName,
      description: concept.description || "",
      difficulty: concept.difficulty,
    });
    setIsOpen(true);
  };

  const handleDelete = async (conceptId: string) => {
    if (!confirm(`Are you sure you want to delete "${conceptId}"? This will delete all related terms.`)) {
      return;
    }

    try {
      await deleteConcept(conceptId);
    } catch (err) {
      alert("Failed to delete concept. Check console for details.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topicId) {
      alert("Please select a topic first");
      return;
    }
    
    try {
      if (editing) {
        await updateConcept({
          id: formData.id,
          displayName: formData.displayName,
          description: formData.description || undefined,
          difficulty: formData.difficulty !== undefined ? formData.difficulty : undefined,
        });
      } else {
        await createConcept({
          id: formData.id,
          displayName: formData.displayName,
          description: formData.description || undefined,
          difficulty: formData.difficulty || undefined,
          topicId: topicId,
        });
      }
      setIsOpen(false);
    } catch (err) {
      alert("Failed to save concept. Check console for details.");
    }
  };

  const handleGoToTerms = (conceptId: string) => {
    router.push(`/admin/knowledge-base/terms?subjectId=${encodeURIComponent(subjectId || "")}&topicId=${encodeURIComponent(topicId || "")}&conceptId=${encodeURIComponent(conceptId)}`);
  };

  const filteredConcepts = concepts.filter((concept) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      concept.id.toLowerCase().includes(search) ||
      concept.displayName.toLowerCase().includes(search) ||
      (concept.description || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {topicId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/admin/knowledge-base/topics?subjectId=${encodeURIComponent(subjectId || "")}`)}
              title="Back to topics"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold">Concepts</h2>
            {selectedSubject && selectedTopic && (
              <p className="text-sm text-muted-foreground">
                For subject: <span className="font-medium">{selectedSubject.displayName}</span> → <span className="font-medium">{selectedTopic.displayName}</span>
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleCreate} disabled={!topicId}>
          New Concept
        </Button>
      </div>

      {!topicId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          Please select a topic from the topics page to view its concepts.
        </div>
      )}

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search concepts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <span className="text-sm text-muted-foreground">
          {filteredConcepts.length} of {concepts.length} concepts
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
                <th className="px-4 py-3">Display Name</th>
                <th className="px-4 py-3">Topics</th>
                <th className="px-4 py-3">Terms</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredConcepts.map((concept) => (
                <tr key={concept.id} className="text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{concept.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{concept.displayName}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="text-sm font-medium">
                      {concept.topicsList && concept.topicsList.length > 0 ? (
                        <Tooltip
                          content={
                            concept.topicsList.length > 0 ? (
                              <div className="max-w-xs">
                                <div className="font-semibold mb-1">Topics:</div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {concept.topicsList.map((displayName) => (
                                    <li className="text-xs">{displayName}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              "0 topics"
                            )
                          }
                        >
                          <span className="text-blue-600 cursor-help">{concept.topicsList.length}</span>
                        </Tooltip>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="text-sm font-medium">
                      {concept.termsList && concept.termsList.length > 0 ? (
                        <Tooltip
                          content={
                            concept.termsList.length > 0 ? (
                              <div className="max-w-xs">
                                <div className="font-semibold mb-1">Terms:</div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {concept.termsList.map((term) => (
                                    <li className="text-xs">{term}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              "0 terms"
                            )
                          }
                        >
                          <span className="text-blue-600 cursor-help">{concept.termsList.length}</span>
                        </Tooltip>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{concept.description || "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{concept.difficulty !== undefined && concept.difficulty !== null ? concept.difficulty : "-"}</td>
                  <td className="px-4 py-3 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(concept)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(concept.id)}
                    >
                      Delete
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto"
                      onClick={() => handleGoToTerms(concept.id)}
                      title={`View terms for ${concept.displayName}`}
                    >
                      <ChevronRight className="h-4 w-4" />
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
              {editing ? "Edit Concept" : "Create Concept"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="id">ID *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., linear-equations"
                  required
                  disabled={!!editing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Unique identifier (lowercase, no spaces)
                </p>
              </div>
              <div>
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="e.g., Linear Equations"
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
              <div>
                <Label htmlFor="difficulty">Difficulty (1-10)</Label>
                <Input
                  id="difficulty"
                  type="number"
                  value={formData.difficulty !== undefined ? formData.difficulty : ""}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="1-10"
                  min="1"
                  max="10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Difficulty level on a scale of 1-10 (optional)
                </p>
              </div>
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
    </div>
  );
}

