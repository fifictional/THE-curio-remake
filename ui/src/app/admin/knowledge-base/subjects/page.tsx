"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { ChevronRight } from "lucide-react";
import { useSubjectsAdminApi, type Subject } from "@/hooks/api/knowledge-base/use-subjects-admin.api";

export default function TopicsPage() {
  const router = useRouter();
  const { subjects, isLoading, error, fetchSubjects, createSubject, updateSubject, deleteSubject } = useSubjectsAdminApi();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    displayName: "",
    description: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const handleGoToTopics = (subjectId: string) => {
    router.push(`/admin/knowledge-base/topics?subjectId=${encodeURIComponent(subjectId)}`);
  };

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleCreate = () => {
    setEditing(null);
    setFormData({ id: "", displayName: "", description: "" });
    setIsOpen(true);
  };

  const handleEdit = (subject: Subject) => {
    setEditing(subject);
    setFormData({
      id: subject.id,
      displayName: subject.displayName,
      description: subject.description || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm(`Are you sure you want to delete "${subjectId}"? This will delete all related topics, concepts, and terms.`)) {
      return;
    }

    try {
      await deleteSubject(subjectId);
    } catch (err) {
      alert("Failed to delete subject. Check console for details.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editing) {
        await updateSubject({
          id: formData.id,
          displayName: formData.displayName,
          description: formData.description || undefined,
        });
      } else {
        await createSubject({
          id: formData.id,
          displayName: formData.displayName,
          description: formData.description || undefined,
        });
      }
      setIsOpen(false);
    } catch (err) {
      alert("Failed to save subject. Check console for details.");
    }
  };

  const filteredSubjects = subjects.filter((subject) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      subject.id.toLowerCase().includes(search) ||
      subject.displayName.toLowerCase().includes(search) ||
      (subject.description || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Subjects</h2>
        <Button onClick={handleCreate}>New Subject</Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search subjects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <span className="text-sm text-muted-foreground">
          {filteredSubjects.length} of {subjects.length} subjects
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
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{subject.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{subject.displayName}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="text-sm font-medium">
                      {subject.topicsList && subject.topicsList.length > 0 ? (
                        <Tooltip
                          content={
                            subject.topicsList.length > 0 ? (
                              <div className="max-w-xs">
                                <div className="font-semibold mb-1">Topics:</div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {subject.topicsList.map((displayName) => (
                                    <li className="text-xs">{displayName}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              "0 topics"
                            )
                          }
                        >
                          <span className="text-blue-600 cursor-help">{subject.topicsList.length}</span>
                        </Tooltip>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{subject.description || "-"}</td>
                  <td className="px-4 py-3 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(subject)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(subject.id)}
                    >
                      Delete
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto"
                      onClick={() => handleGoToTopics(subject.id)}
                      title={`View topics for ${subject.displayName}`}
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
              {editing ? "Edit Subject" : "Create Subject"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="id">ID *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., math"
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
                  placeholder="e.g., Mathematics"
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

