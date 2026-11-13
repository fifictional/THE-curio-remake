'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAmplifyApiClient, useAmplifyUserApiClient } from '@/providers';
import { Loader2, ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useConceptsAdminApi, type Concept } from '@/hooks/api/knowledge-base/use-concepts-admin.api';

interface ConceptWithHierarchy {
  conceptId: string;
  conceptDisplayName: string;
  masteryLevel: number;
}

function MasteryBadge({ mastery }: { mastery: number }) {
  const getColor = (level: number) => {
    if (level >= 80) return 'bg-green-100 text-green-800';
    if (level >= 60) return 'bg-yellow-100 text-yellow-800';
    if (level >= 40) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        getColor(mastery)
      )}
    >
      {mastery}%
    </span>
  );
}

export default function UserKnowledgeGraphPage() {
  const [userUuid, setUserUuid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [concepts, setConcepts] = useState<ConceptWithHierarchy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const client = useAmplifyApiClient();
  
  // Debug section state
  const [selectedConceptId, setSelectedConceptId] = useState('');
  const [masteryLevel, setMasteryLevel] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  // Fetch all concepts for selection
  const { concepts: allConcepts, fetchConcepts } = useConceptsAdminApi();
  
  useEffect(() => {
    fetchConcepts();
  }, [fetchConcepts]);

  const fetchUserKnowledgeGraph = useCallback(async () => {
    if (!userUuid.trim()) {
      setError('Please enter a user UUID');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await client.queries.learningProfileQuery({
        actionType: 'getUserConceptsMastery',
        userUuid: userUuid.trim(),
      });

      console.log('result', result);

      if (result.data?.success && result.data.conceptsMastery) {
        const conceptsData = Array.isArray(result.data.conceptsMastery) 
          ? result.data.conceptsMastery 
          : [];
        setConcepts(conceptsData as ConceptWithHierarchy[]);
      } else {
        setConcepts([]);
        setError('No concepts found for this user');
      }
    } catch (err) {
      console.error('Failed to fetch user knowledge graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user knowledge graph');
      setConcepts([]);
    } finally {
      setIsLoading(false);
    }
  }, [userUuid, client]);

  // Calculate average mastery level
  const averageMastery = useMemo(() => {
    if (concepts.length === 0) return 0;
    const totalMastery = concepts.reduce((sum, c) => sum + c.masteryLevel, 0);
    return Math.round(totalMastery / concepts.length);
  }, [concepts]);

  const handleDeleteUserKnowledge = useCallback(async () => {
    if (!userUuid.trim()) {
      setError('Please enter a user UUID first');
      return;
    }

    if (!confirm(`Are you sure you want to delete all knowledge for user ${userUuid}? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await client.mutations.learningProfileMutation({
        actionType: 'deleteUserKnowledge',
        userUuid: userUuid.trim(),
      });
      
      // Clear the concepts list
      setConcepts([]);
      setError(null);
      
      alert('User knowledge deleted successfully');
    } catch (err) {
      console.error('Failed to delete user knowledge:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user knowledge');
    } finally {
      setIsLoading(false);
    }
  }, [userUuid, client]);

  const handleUpdateMastery = useCallback(async () => {
    if (!userUuid.trim()) {
      setUpdateError('Please enter a user UUID first');
      return;
    }
    
    if (!selectedConceptId.trim()) {
      setUpdateError('Please select or enter a concept ID');
      return;
    }
    
    if (masteryLevel < 0 || masteryLevel > 100) {
      setUpdateError('Mastery level must be between 0 and 100');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);
    
    try {
      await client.mutations.learningProfileMutation({
        actionType: 'createOrUpdateConceptMastery',
        userUuid: userUuid.trim(),
        concept: selectedConceptId.trim(),
        masteryLevel,
      });
      
      setUpdateSuccess(true);
      setSelectedConceptId('');
      setMasteryLevel(0);
      
      // Refresh the knowledge graph
      await fetchUserKnowledgeGraph();
      
      // Clear success message after 3 seconds
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update mastery:', err);
      setUpdateError(err instanceof Error ? err.message : 'Failed to update mastery');
    } finally {
      setIsUpdating(false);
    }
  }, [userUuid, selectedConceptId, masteryLevel, client, fetchUserKnowledgeGraph]);

  return (
    <div className="container p-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">User Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground">
            View user's knowledge graph with mastery levels for concepts, topics, and subjects
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Label htmlFor="userUuid">User UUID</Label>
            <Input
              id="userUuid"
              value={userUuid}
              onChange={(e) => setUserUuid(e.target.value)}
              placeholder="Enter user UUID"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchUserKnowledgeGraph();
                }
              }}
            />
          </div>
          <Button onClick={fetchUserKnowledgeGraph} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load Graph'
            )}
          </Button>
          {concepts.length > 0 && (
            <Button 
              onClick={handleDeleteUserKnowledge} 
              disabled={isLoading}
              variant="outline"
            >
              Delete User Knowledge
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {concepts.length === 0 && !isLoading && !error && userUuid && (
          <div className="rounded-md bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              No concepts found. Enter a user UUID and click "Load Graph" to view their knowledge graph.
            </p>
          </div>
        )}

        {/* Debug Section: Update Mastery */}
        {userUuid && (
          <div className="border rounded-lg p-6 bg-muted/50">
            <h2 className="text-lg font-semibold mb-4">Debug: Update User Knowledge Graph</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="conceptSelect">Concept</Label>
                  <select
                    id="conceptSelect"
                    value={selectedConceptId}
                    onChange={(e) => setSelectedConceptId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select a concept...</option>
                    {allConcepts.map((concept) => (
                      <option key={concept.id} value={concept.id}>
                        {concept.displayName} ({concept.id})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Or enter concept ID manually below
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="conceptIdInput">Concept ID (manual entry)</Label>
                  <Input
                    id="conceptIdInput"
                    value={selectedConceptId}
                    onChange={(e) => setSelectedConceptId(e.target.value)}
                    placeholder="Enter concept ID"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="masteryLevel">Mastery Level (0-100)</Label>
                <Input
                  id="masteryLevel"
                  type="number"
                  min="0"
                  max="100"
                  value={masteryLevel}
                  onChange={(e) => setMasteryLevel(parseInt(e.target.value) || 0)}
                  placeholder="0-100"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleUpdateMastery} 
                  disabled={isUpdating || !selectedConceptId || !userUuid}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Mastery'
                  )}
                </Button>
                
                {updateSuccess && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm">Mastery updated successfully!</span>
                  </div>
                )}
                
                {updateError && (
                  <div className="flex items-center gap-2 text-red-600">
                    <X className="h-4 w-4" />
                    <span className="text-sm">{updateError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {concepts.length > 0 && (
          <div className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Concepts</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Average Mastery:</span>
                <MasteryBadge mastery={averageMastery} />
              </div>
            </div>

            <div className="space-y-2">
              {concepts.map((concept) => (
                <div
                  key={concept.conceptId}
                  className="flex items-center justify-between py-2 border-b border-muted last:border-0"
                >
                  <div>
                    <p className="font-medium">{concept.conceptDisplayName}</p>
                    <p className="text-xs text-muted-foreground">{concept.conceptId}</p>
                  </div>
                  <MasteryBadge mastery={concept.masteryLevel} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

