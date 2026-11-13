'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import { useDocumentSubjectsApi } from "@/hooks/api/document-subjects/use-document-subjects.api";
import { useSubscribedUserIds } from "@/hooks/api/subscriptions/use-subscribed-user-ids.api";
import { useMemo, useState } from "react";
import { subDays, format, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Checkbox } from "@/components/ui/checkbox";

type TimeRange = 'last-7-days' | 'last-30-days' | 'current-month' | 'custom';

interface SubjectData {
  subjectId: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

interface DocumentTypeData {
  documentType: string;
  count: number;
  percentage: number;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#f43f5e', '#0ea5e9',
];

export default function DocumentSubjectsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('last-7-days');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [filterBySubscribed, setFilterBySubscribed] = useState(false);

  const { subscribedUserIds, isLoading: isLoadingSubscriptions, error: subscriptionsError } = useSubscribedUserIds();

  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (timeRange) {
      case 'last-7-days':
        start = subDays(now, 7);
        end = endOfDay(now);
        break;
      case 'last-30-days':
        start = subDays(now, 30);
        end = endOfDay(now);
        break;
      case 'current-month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'custom':
        start = startDate;
        end = endDate;
        break;
    }

    return { start, end };
  }, [timeRange, startDate, endDate]);

  const {
    data: documents,
    isLoading,
  } = useDocumentSubjectsApi({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  // Filter documents by subscribed users if checkbox is checked
  const filteredDocuments = useMemo(() => {
    if (!filterBySubscribed || subscriptionsError) {
      return documents;
    }
    return documents.filter(doc => subscribedUserIds.has(doc.userUuid));
  }, [documents, filterBySubscribed, subscribedUserIds, subscriptionsError]);

  // Group documents by subjectId
  const subjectData = useMemo(() => {
    const subjectMap = new Map<string, number>();
    
    filteredDocuments.forEach(doc => {
      const key = doc.subjectId || 'Uncategorized';
      subjectMap.set(key, (subjectMap.get(key) || 0) + 1);
    });

    const total = filteredDocuments.length;
    const data: SubjectData[] = Array.from(subjectMap.entries())
      .map(([subjectId, count]) => ({
        subjectId,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return data;
  }, [filteredDocuments]);

  // Get document types for selected subject
  const documentTypeData = useMemo(() => {
    if (!selectedSubjectId) return null;

    const filteredDocs = filteredDocuments.filter(doc => {
      const docSubjectId = doc.subjectId || 'Uncategorized';
      return docSubjectId === selectedSubjectId;
    });

    const typeMap = new Map<string, number>();
    
    filteredDocs.forEach(doc => {
      const key = doc.documentType || 'Unknown';
      typeMap.set(key, (typeMap.get(key) || 0) + 1);
    });

    const total = filteredDocs.length;
    const data: DocumentTypeData[] = Array.from(typeMap.entries())
      .map(([documentType, count]) => ({
        documentType,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return data;
  }, [filteredDocuments, selectedSubjectId]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    if (range !== 'custom') {
      const now = new Date();
      switch (range) {
        case 'last-7-days':
          setStartDate(subDays(now, 7));
          setEndDate(endOfDay(now));
          break;
        case 'last-30-days':
          setStartDate(subDays(now, 30));
          setEndDate(endOfDay(now));
          break;
        case 'current-month':
          setStartDate(startOfMonth(now));
          setEndDate(endOfMonth(now));
          break;
      }
    }
  };

  const handlePieClick = (data: any) => {
    if (data && data.subjectId) {
      setSelectedSubjectId(data.subjectId);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded shadow-lg p-3">
          <p className="font-medium">{data.subjectId}</p>
          <p className="text-sm text-muted-foreground">
            {data.count} documents ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Escape CSV values that contain commas or quotes
  const escapeCSV = (value: string | number): string => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Generate CSV export data: rows = subjects, columns = document types
  const handleExportCSV = () => {
    // Get all unique document types
    const documentTypes = Array.from(new Set(filteredDocuments.map(doc => doc.documentType || 'Unknown')));
    documentTypes.sort();

    // Get all unique subjects
    const subjects = Array.from(new Set(filteredDocuments.map(doc => doc.subjectId || 'Uncategorized')));
    subjects.sort();

    // Build pivot table: subject -> document type -> count
    const pivotMap = new Map<string, Map<string, number>>();
    
    filteredDocuments.forEach(doc => {
      const subject = doc.subjectId || 'Uncategorized';
      const docType = doc.documentType || 'Unknown';
      
      if (!pivotMap.has(subject)) {
        pivotMap.set(subject, new Map());
      }
      const subjectMap = pivotMap.get(subject)!;
      subjectMap.set(docType, (subjectMap.get(docType) || 0) + 1);
    });

    // Build CSV rows
    const csvRows: string[] = [];
    
    // Header row: Subject, Document Type 1, Document Type 2, ..., Total
    const header = ['Subject', ...documentTypes, 'Total'].map(escapeCSV);
    csvRows.push(header.join(','));

    // Data rows
    subjects.forEach(subject => {
      const row: string[] = [escapeCSV(subject)];
      let rowTotal = 0;
      
      documentTypes.forEach(docType => {
        const count = pivotMap.get(subject)?.get(docType) || 0;
        row.push(String(count));
        rowTotal += count;
      });
      
      row.push(String(rowTotal));
      csvRows.push(row.join(','));
    });

    // Total row
    const totalRow: string[] = [escapeCSV('Total')];
    let grandTotal = 0;
    documentTypes.forEach(docType => {
      let colTotal = 0;
      subjects.forEach(subject => {
        colTotal += pivotMap.get(subject)?.get(docType) || 0;
      });
      totalRow.push(String(colTotal));
      grandTotal += colTotal;
    });
    totalRow.push(String(grandTotal));
    csvRows.push(totalRow.join(','));

    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `document-subjects-${format(dateRange.start, 'yyyy-MM-dd')}-to-${format(dateRange.end, 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/statistics">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Document Subjects Breakdown</h1>
            <p className="text-sm text-muted-foreground">Distribution of documents by subject and type</p>
          </div>
        </div>
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={timeRange === 'last-7-days' ? 'default' : 'outline'}
              onClick={() => handleTimeRangeChange('last-7-days')}
              size="sm"
            >
              Last 7 Days
            </Button>
            <Button
              variant={timeRange === 'last-30-days' ? 'default' : 'outline'}
              onClick={() => handleTimeRangeChange('last-30-days')}
              size="sm"
            >
              Last 30 Days
            </Button>
            <Button
              variant={timeRange === 'current-month' ? 'default' : 'outline'}
              onClick={() => handleTimeRangeChange('current-month')}
              size="sm"
            >
              Current Month
            </Button>
            <Button
              variant={timeRange === 'custom' ? 'default' : 'outline'}
              onClick={() => handleTimeRangeChange('custom')}
              size="sm"
            >
              Custom Range
            </Button>
          </div>
          
          {timeRange === 'custom' && (
            <div className="flex gap-4 items-center">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={format(startDate, 'yyyy-MM-dd')}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  onChange={(e) => setEndDate(endOfDay(new Date(e.target.value)))}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')} • {filteredDocuments.length} documents
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-subscribed"
                checked={filterBySubscribed}
                onCheckedChange={(checked) => {
                  if (checked && subscriptionsError) {
                    // Don't enable if there's an error
                    return;
                  }
                  setFilterBySubscribed(checked === true);
                }}
                disabled={isLoadingSubscriptions || !!subscriptionsError}
              />
              <label
                htmlFor="filter-subscribed"
                className="text-sm font-medium cursor-pointer select-none"
              >
                Filter by subscribed users
              </label>
            </div>
          </div>
          {isLoadingSubscriptions && (
            <div className="text-xs text-muted-foreground">Loading subscription data...</div>
          )}
          {subscriptionsError && (
            <div className="text-xs text-red-600">
              Error loading subscription data: {subscriptionsError.message || 'Unknown error'}
            </div>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading data...</div>
      ) : (
        <div className="space-y-6">
          {/* Pie Chart */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Subject Distribution</h2>
            {subjectData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No documents found in this date range</div>
            ) : (
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => {
                        // Only show label if percentage is >= 5% to avoid clutter
                        const entry = props as SubjectData;
                        if (entry.percentage >= 5) {
                          return `${entry.subjectId}: ${entry.percentage}%`;
                        }
                        return '';
                      }}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="count"
                      onClick={handlePieClick}
                    >
                      {subjectData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Document Types Breakdown */}
          {selectedSubjectId && documentTypeData && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Document Types for: {selectedSubjectId}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubjectId(null)}
                >
                  Clear Selection
                </Button>
              </div>
              <div className="space-y-2">
                {documentTypeData.map((item, index) => (
                  <div
                    key={item.documentType}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{item.documentType}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {item.count} documents
                      </span>
                      <span className="text-sm font-medium">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
