"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useTermsAdminApi, type Term } from "@/hooks/api/knowledge-base/use-terms-admin.api";
import { useConceptsAdminApi } from "@/hooks/api/knowledge-base/use-concepts-admin.api";
import { useTopicsAdminApi } from "@/hooks/api/knowledge-base/use-topics-admin.api";
import { useSubjectsAdminApi } from "@/hooks/api/knowledge-base/use-subjects-admin.api";

export default function TermsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subjectId");
  const topicId = searchParams.get("topicId");
  const conceptId = searchParams.get("conceptId");
  
  const { subjects } = useSubjectsAdminApi();
  const { topics } = useTopicsAdminApi(subjectId || undefined);
  const { concepts } = useConceptsAdminApi(topicId || undefined);
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const selectedTopic = topics.find((t) => t.id === topicId);
  const selectedConcept = concepts.find((c) => c.id === conceptId);
  
  const { terms, isLoading, error, fetchTerms, createTerm, updateTerm, deleteTerm } = useTermsAdminApi(conceptId || undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    term: "",
    definition: "",
    context: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  const handleCreate = () => {
    if (!conceptId) {
      alert("Please select a concept first");
      return;
    }
    setEditing(null);
    setFormData({ id: "", term: "", definition: "", context: "" });
    setIsOpen(true);
  };

  const handleEdit = (term: Term) => {
    setEditing(term);
    setFormData({
      id: term.id,
      term: term.term,
      definition: term.definition,
      context: term.context || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (termId: string) => {
    if (!confirm(`Are you sure you want to delete "${termId}"?`)) {
      return;
    }

    try {
      await deleteTerm(termId);
    } catch (err) {
      alert("Failed to delete term. Check console for details.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!conceptId) {
      alert("Please select a concept first");
      return;
    }
    
    try {
      if (editing) {
        await updateTerm({
          id: formData.id,
          term: formData.term,
          definition: formData.definition,
          context: formData.context || undefined,
        });
      } else {
        await createTerm({
          id: formData.id,
          term: formData.term,
          definition: formData.definition,
          context: formData.context || undefined,
          conceptId: conceptId,
        });
      }
      setIsOpen(false);
    } catch (err) {
      alert("Failed to save term. Check console for details.");
    }
  };

  const filteredTerms = terms.filter((term) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      term.id.toLowerCase().includes(search) ||
      term.term.toLowerCase().includes(search) ||
      term.definition.toLowerCase().includes(search) ||
      (term.context || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {conceptId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/admin/knowledge-base/concepts?subjectId=${encodeURIComponent(subjectId || "")}&topicId=${encodeURIComponent(topicId || "")}`)}
              title="Back to concepts"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold">Terms</h2>
            {selectedSubject && selectedTopic && selectedConcept && (
              <p className="text-sm text-muted-foreground">
                For: <span className="font-medium">{selectedSubject.displayName}</span> → <span className="font-medium">{selectedTopic.displayName}</span> → <span className="font-medium">{selectedConcept.displayName}</span>
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleCreate} disabled={!conceptId}>
          New Term
        </Button>
      </div>

      {!conceptId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          Please select a concept from the concepts page to view its terms.
        </div>
      )}

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search terms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <span className="text-sm text-muted-foreground">
          {filteredTerms.length} of {terms.length} terms
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
                <th className="px-4 py-3">Term</th>
                <th className="px-4 py-3">Definition</th>
                <th className="px-4 py-3">Context</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredTerms.map((term) => (
                <tr key={term.id} className="text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{term.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{term.term}</td>
                  <td className="px-4 py-3 text-gray-700">{term.definition}</td>
                  <td className="px-4 py-3 text-gray-700">{term.context || "-"}</td>
                  <td className="px-4 py-3 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(term)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(term.id)}
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
              {editing ? "Edit Term" : "Create Term"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="id">ID *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., solve-for-x"
                  required
                  disabled={!!editing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Unique identifier (lowercase, no spaces)
                </p>
              </div>
              <div>
                <Label htmlFor="term">Term *</Label>
                <Input
                  id="term"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  placeholder="e.g., Solve for X"
                  required
                />
              </div>
              <div>
                <Label htmlFor="definition">Definition *</Label>
                <Textarea
                  id="definition"
                  value={formData.definition}
                  onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                  placeholder="Term definition"
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="context">Context</Label>
                <Textarea
                  id="context"
                  value={formData.context}
                  onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                  placeholder="Optional context or usage example"
                  rows={2}
                />
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

