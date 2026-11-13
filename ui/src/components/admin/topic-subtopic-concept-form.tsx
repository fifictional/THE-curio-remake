"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TopicSubtopicConceptFormType } from "@/lib/types/topic-subtopic-concept";

interface TopicSubtopicConceptFormProps {
  value: TopicSubtopicConceptFormType | null;
  onSubmit: (payload: TopicSubtopicConceptFormType) => Promise<void>;
  onCancel: () => void;
}

export function TopicSubtopicConceptForm({ value, onSubmit, onCancel }: TopicSubtopicConceptFormProps) {
  const [formData, setFormData] = useState<TopicSubtopicConceptFormType>(
    value || {
      topic: "",
      subtopic: "",
      concept: "",
      topicDisplay: "",
      subtopicDisplay: "",
      conceptDisplay: "",
      tag: "",
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Failed to submit:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!value;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">{isEditing ? "Edit Topic" : "New Topic"}</h2>

      <div className="space-y-2">
        <Label htmlFor="topic">Topic (slug)</Label>
        <Input
          id="topic"
          value={formData.topic}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          placeholder="e.g., algebra"
          required
          disabled={isEditing}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Lowercase, no spaces (use hyphens). Cannot be changed after creation.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtopic">Subtopic (slug)</Label>
        <Input
          id="subtopic"
          value={formData.subtopic}
          onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
          placeholder="e.g., linear-equations"
          required
          disabled={isEditing}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Lowercase, no spaces (use hyphens). Cannot be changed after creation.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept">Concept (slug)</Label>
        <Input
          id="concept"
          value={formData.concept}
          onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
          placeholder="e.g., solving-for-x"
          required
          disabled={isEditing}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Lowercase, no spaces (use hyphens). Cannot be changed after creation.
        </p>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h3 className="text-sm font-medium">Display Names</h3>

        <div className="space-y-2">
          <Label htmlFor="topicDisplay">Topic Display Name</Label>
          <Input
            id="topicDisplay"
            value={formData.topicDisplay}
            onChange={(e) => setFormData({ ...formData, topicDisplay: e.target.value })}
            placeholder="e.g., Algebra"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtopicDisplay">Subtopic Display Name</Label>
          <Input
            id="subtopicDisplay"
            value={formData.subtopicDisplay}
            onChange={(e) => setFormData({ ...formData, subtopicDisplay: e.target.value })}
            placeholder="e.g., Linear Equations"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="conceptDisplay">Concept Display Name</Label>
          <Input
            id="conceptDisplay"
            value={formData.conceptDisplay}
            onChange={(e) => setFormData({ ...formData, conceptDisplay: e.target.value })}
            placeholder="e.g., Solving for X"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tag">Tag (optional)</Label>
          <Input
            id="tag"
            value={formData.tag || ""}
            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
            placeholder="e.g., SAT"
          />
          <p className="text-xs text-muted-foreground">
            Use tags like "SAT" to group concepts for specific exams.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

