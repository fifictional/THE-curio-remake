"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "@/components/ui/tooltip";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useTopicsAdminApi, type Topic } from "@/hooks/api/knowledge-base/use-topics-admin.api";
import { useSubjectsAdminApi } from "@/hooks/api/knowledge-base/use-subjects-admin.api";

export default function SubtopicsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("subjectId");
  
  const { subjects } = useSubjectsAdminApi();
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  
  const { topics, isLoading, error, fetchTopics, createTopic, updateTopic, deleteTopic } = useTopicsAdminApi(subjectId || undefined);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    displayName: "",
    description: "",
    order: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleCreate = () => {
    if (!subjectId) {
      alert("Please select a subject first");
      return;
    }
    setEditing(null);
    setFormData({ id: "", displayName: "", description: "", order: 0 });
    setIsOpen(true);
  };

  const handleEdit = (topic: Topic) => {
    setEditing(topic);
    setFormData({
      id: topic.id,
      displayName: topic.displayName,
      description: topic.description || "",
      order: topic.order || 0,
    });
    setIsOpen(true);
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm(`Are you sure you want to delete "${topicId}"? This will delete all related concepts and terms.`)) {
      return;
    }

    try {
      await deleteTopic(topicId);
    } catch (err) {
      alert("Failed to delete topic. Check console for details.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subjectId) {
      alert("Please select a subject first");
      return;
    }
    
    try {
      if (editing) {
        await updateTopic({
          id: formData.id,
          displayName: formData.displayName,
          description: formData.description || undefined,
          order: formData.order || undefined,
        });
      } else {
        await createTopic({
          id: formData.id,
          displayName: formData.displayName,
          description: formData.description || undefined,
          order: formData.order || undefined,
          subjectId: subjectId,
        });
      }
      setIsOpen(false);
    } catch (err) {
      alert("Failed to save topic. Check console for details.");
    }
  };

  const handleGoToConcepts = (topicId: string) => {
    router.push(`/admin/knowledge-base/concepts?subjectId=${encodeURIComponent(subjectId || "")}&topicId=${encodeURIComponent(topicId)}`);
  };

  const filteredTopics = topics.filter((topic) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      topic.id.toLowerCase().includes(search) ||
      topic.displayName.toLowerCase().includes(search) ||
      (topic.description || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {subjectId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/knowledge-base/subjects")}
              title="Back to subjects"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h2 className="text-xl font-semibold">Topics</h2>
            {selectedSubject && (
              <p className="text-sm text-muted-foreground">
                For subject: <span className="font-medium">{selectedSubject.displayName}</span>
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleCreate} disabled={!subjectId}>
          New Topic
        </Button>
      </div>

      {!subjectId && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          Please select a subject from the subjects page to view its topics.
        </div>
      )}

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <span className="text-sm text-muted-foreground">
          {filteredTopics.length} of {topics.length} topics
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
                <th className="px-4 py-3">Subjects</th>
                <th className="px-4 py-3">Concepts</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredTopics.map((topic) => (
                <tr key={topic.id} className="text-sm">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{topic.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{topic.displayName}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {topic.subjectsList && topic.subjectsList.length > 0 ? (
                      <Tooltip
                        content={
                          topic.subjectsList.length > 0 ? (
                            <div className="max-w-xs">
                              <div className="font-semibold mb-1">Subjects:</div>
                              <ul className="list-disc list-inside space-y-0.5">
                                {topic.subjectsList.map((displayName) => (
                                  <li className="text-xs">{displayName}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            "0 subjects"
                          )
                        }
                      >
                        <span className="text-xs text-blue-600 cursor-help">{topic.subjectsList.length}</span>
                      </Tooltip>
                    ) : (
                      <span className="text-xs text-yellow-600 italic">Not linked</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="text-sm font-medium">
                      {topic.conceptsList && topic.conceptsList.length > 0 ? (
                        <Tooltip
                          content={
                            topic.conceptsList.length > 0 ? (
                              <div className="max-w-xs">
                                <div className="font-semibold mb-1">Concepts:</div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {topic.conceptsList.map((displayName) => (
                                    <li className="text-xs">{displayName}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              "0 concepts"
                            )
                          }
                        >
                          <span className="text-blue-600 cursor-help">{topic.conceptsList.length}</span>
                        </Tooltip>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{topic.description || "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{topic.order || 0}</td>
                  <td className="px-4 py-3 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(topic)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(topic.id)}
                    >
                      Delete
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto"
                      onClick={() => handleGoToConcepts(topic.id)}
                      title={`View concepts for ${topic.displayName}`}
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
              {editing ? "Edit Topic" : "Create Topic"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="id">ID *</Label>
                <Input
                  id="id"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="e.g., algebra"
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
                  placeholder="e.g., Algebra"
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
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Order within the parent topic (lower numbers appear first)
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

