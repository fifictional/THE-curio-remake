"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Upload, GitMerge } from "lucide-react";

export default function MergeDuplicateUsersPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedJson, setParsedJson] = useState<object | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [limit, setLimit] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setParseError(null);
    setParsedJson(null);
    setFileName(file?.name ?? null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const data = JSON.parse(text) as object;
        setParsedJson(data);
      } catch {
        setParseError("Could not parse JSON. Use the slim shape: { duplicateEmails: [{ email, accounts: [...] }] }");
      }
    };
    reader.readAsText(file);
  }, []);

  const runMerge = async () => {
    if (!parsedJson) {
      setError("Upload a valid JSON file first.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const limitNum = limit.trim() ? Number(limit) : undefined;
      const body = {
        ...parsedJson,
        dryRun,
        ...(limitNum !== undefined && Number.isFinite(limitNum) && limitNum > 0
          ? { limit: limitNum }
          : {}),
      };
      const response = await fetch("/api/admin/merge-duplicate-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "Request failed");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container p-8 max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/tools">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <GitMerge className="h-7 w-7" />
            Merge duplicate users
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload the same slim JSON as the CLI (
            <code className="text-xs bg-muted px-1 rounded">duplicateEmails</code> with Cognito{" "}
            <code className="text-xs bg-muted px-1 rounded">accounts</code>). Canonical account is chosen by latest{" "}
            <code className="text-xs bg-muted px-1 rounded">UserProfile.lastLoginAt</code>.
          </p>
        </div>
      </div>

      <div className="space-y-6 border rounded-lg p-6 bg-card">
        <div>
          <Label htmlFor="json-file">JSON file</Label>
          <div className="mt-2 flex items-center gap-2">
            <Input
              id="json-file"
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="cursor-pointer"
            />
            {fileName && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">{fileName}</span>
            )}
          </div>
          {parseError && (
            <p className="text-sm text-destructive mt-2">{parseError}</p>
          )}
          {parsedJson && !parseError && (
            <p className="text-sm text-green-700 dark:text-green-400 mt-2">JSON loaded.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="dry-run"
            checked={dryRun}
            onCheckedChange={(v) => setDryRun(v === true)}
          />
          <Label htmlFor="dry-run" className="font-normal cursor-pointer">
            Dry run (no writes — recommended first)
          </Label>
        </div>

        <div>
          <Label htmlFor="limit">Max duplicate-email groups (optional)</Label>
          <Input
            id="limit"
            type="number"
            min={1}
            placeholder="e.g. 5 — leave empty for all"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="mt-1 max-w-xs"
          />
        </div>

        <Button onClick={runMerge} disabled={isLoading || !parsedJson || !!parseError}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {dryRun ? "Run dry run" : "Apply merges"}
            </>
          )}
        </Button>

        {!dryRun && (
          <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            Apply will invoke the merge Lambda for each secondary account, re-point data to the canonical sub, and delete the
            secondary Cognito user. This cannot be undone from this UI.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
          <div className="font-semibold text-red-800 dark:text-red-200 mb-1">Error</div>
          <div className="text-sm text-red-700 dark:text-red-300 font-mono">{error}</div>
        </div>
      )}

      {result !== null && (
        <div className="mt-6">
          <div className="font-medium mb-2">Response</div>
          <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[480px] border">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
