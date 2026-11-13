import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Scissors, Loader2, AlertCircle, CheckCircle, Image as ImageIcon, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { ExtractedQuestion } from '@/hooks/api/question-extractor';
import { CurioMarkdown } from '@/components/core/curio-markdown';
import { QuestionReferenceImage } from '@/components/ui/question-reference-image';

interface ExamModule {
  examModuleUuid: string;
  moduleName: string;
}

interface QuestionListItemProps {
  question: ExtractedQuestion;
  examModules?: ExamModule[];
  isSelected: boolean;
  isExtracting?: boolean;
  isGenerating?: boolean;
  isGeneratingAnswer?: boolean;
  onSelect: (checked: boolean) => void;
  onVerify: () => void;
  onEdit: () => void;
  onExtractReference?: () => void;
  onGenerateReference?: () => void;
  onGenerateAnswer?: () => void;
}

export function QuestionListItem({
  question,
  examModules,
  isSelected,
  isExtracting = false,
  isGenerating = false,
  isGeneratingAnswer = false,
  onSelect,
  onVerify,
  onEdit,
  onExtractReference,
  onGenerateReference,
  onGenerateAnswer,
}: QuestionListItemProps) {
  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Find exam module name
  const examModuleName = question.examModuleUuid 
    ? examModules?.find(m => m.examModuleUuid === question.examModuleUuid)?.moduleName 
    : null;

  // Determine button type based on question source
  const isGeneratedQuestion = question.isGenerated === true;
  const needsReference = isGeneratedQuestion ? question.needsReference : (question.questionReference && question.questionReference.referenceType !== 'none');
  const canExtractOrGenerate = (!question.referenceExtractionStatus || question.referenceExtractionStatus === 'FAILED');
  
  // Check if question cannot be verified (no answer, no hint, no explanations)
  const cannotBeVerified = 
    !question.correctAnswer && 
    !question.hint && 
    (!question.answerExplanations || question.answerExplanations.length === 0 || question.answerExplanations.every(exp => !exp));
  
  // Show extract button for extracted questions
  const showExtractButton = !isGeneratedQuestion && 
    question.questionReference && 
    question.questionReference.referenceType !== 'none' && 
    canExtractOrGenerate && 
    onExtractReference;
  
  // Show generate button for generated questions
  const showGenerateButton = isGeneratedQuestion && 
    question.needsReference && 
    canExtractOrGenerate && 
    onGenerateReference;
  
  // Show generate answer button for generated questions without answers
  const showGenerateAnswerButton = isGeneratedQuestion && 
    cannotBeVerified && 
    onGenerateAnswer;
  
  // Show reference extraction status for generated questions that need references
  const showReferenceStatus = isGeneratedQuestion && question.needsReference;

  // Map reference type to accepted values for QuestionReferenceImage
  const mapReferenceType = (type?: string): 'image' | 'text' | 'table' => {
    if (type === 'table') return 'table';
    if (type === 'passage') return 'text';
    return 'image'; // Default for 'image', 'graph', 'chart', or undefined
  };

  return (
    <div 
      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />

        {/* Question Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Question Number, Module, and Type */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">M{question.moduleNumber}-Q{question.questionNumber}</span>
            <Badge variant="secondary" className="text-xs">
              {question.module}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {question.questionType === 'MULTIPLE_CHOICE' ? 'MC' : 'Text'}
            </Badge>
            
            {/* Exam Module Badge */}
            {examModuleName ? (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                📦 {examModuleName}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-300">
                ⚠️ No module
              </Badge>
            )}
            
            {/* Difficulty Badge */}
            {question.difficulty && (
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  question.difficulty === 'EASY' ? 'bg-green-50 text-green-700 border-green-300' :
                  question.difficulty === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                  'bg-red-50 text-red-700 border-red-300'
                }`}
              >
                {question.difficulty === 'EASY' ? '⭐ Easy' : 
                 question.difficulty === 'MEDIUM' ? '⭐⭐ Medium' : 
                 '⭐⭐⭐ Hard'}
              </Badge>
            )}
            
            {/* Concept Badge */}
            {question.concept && (
              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                🧠 {question.concept}
              </Badge>
            )}
            
            {/* Reference Status Badges - Show for extracted questions OR generated questions needing references */}
            {(showReferenceStatus || question.referenceExtractionStatus) && (
              <>
                {question.referenceExtractionStatus === 'EXTRACTING' && (
                  <Badge variant="default" className="text-xs bg-blue-600">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Generating Ref...
                  </Badge>
                )}
                {question.referenceExtractionStatus === 'FAILED' && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Ref Failed
                  </Badge>
                )}
                {question.referenceExtractionStatus === 'EXTRACTED' && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Ref OK
                  </Badge>
                )}
                {/* Show "Needs Ref" badge for generated questions that need references but haven't started yet */}
                {showReferenceStatus && !question.referenceExtractionStatus && (
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                    <ImageIcon className="w-3 h-3 mr-1" />
                    Needs Ref
                  </Badge>
                )}
              </>
            )}
            
            
            {/* Cannot Be Verified Warning */}
            {cannotBeVerified && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Cannot Verify
              </Badge>
            )}
            
            {/* Verified Badge */}
            {question.verified && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          {/* Question Content (truncated with markdown) */}
          <div className="text-sm text-muted-foreground line-clamp-2">
            <CurioMarkdown content={truncateContent(question.questionContent)} />
          </div>

          {/* Reference Generation Prompt - Show for generated questions that need references */}
          {question.isGenerated && question.needsReference && question.referenceGenerationPrompt && 
           (!question.questionReference?.s3Key && question.referenceExtractionStatus !== 'EXTRACTED') && (
            <div className="text-xs bg-purple-50 border border-purple-200 p-3 rounded">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-semibold text-purple-700">🎨 Reference Prompt:</span>
              </div>
              <p className="text-purple-600">{question.referenceGenerationPrompt}</p>
            </div>
          )}

          {/* Error Message if any */}
          {question.referenceExtractionError && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              <strong>Reference Error:</strong> {question.referenceExtractionError}
            </div>
          )}

          {/* Reference Preview */}
          {question.questionReference && 
           question.questionReference.referenceType !== 'none' && 
           (question.questionReference.s3Key || question.questionReference.text) && (
            <div className="mt-2">
              <div className="border rounded p-2 bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-600 capitalize">
                    {question.questionReference.referenceType} Reference
                    {!question.questionReference.s3Key && question.questionReference.text && (
                      <span className="ml-1 text-purple-600">(Generated)</span>
                    )}
                  </span>
                </div>
                <div className="max-h-32 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <QuestionReferenceImage
                    reference={{
                      page: question.questionReference.page,
                      referenceType: mapReferenceType(question.questionReference.referenceType),
                      externalKey: question.questionReference.s3Key,
                      boundingBox: question.questionReference.boundingBox || [],
                      text: question.questionReference.text,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Extract Reference Button (for extracted questions) */}
          {showExtractButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={onExtractReference}
              disabled={isExtracting || question.referenceExtractionStatus === 'EXTRACTING'}
            >
              {isExtracting || question.referenceExtractionStatus === 'EXTRACTING' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Extracting
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4 mr-1" />
                  {question.referenceExtractionStatus === 'FAILED' ? 'Retry Extract' : 'Extract Ref'}
                </>
              )}
            </Button>
          )}
          
          {/* Generate Reference Button (for generated questions) */}
          {showGenerateButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerateReference}
              disabled={isGenerating || question.referenceExtractionStatus === 'EXTRACTING'}
            >
              {isGenerating || question.referenceExtractionStatus === 'EXTRACTING' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-1" />
                  {question.referenceExtractionStatus === 'FAILED' ? 'Retry Generate' : 'Generate Ref'}
                </>
              )}
            </Button>
          )}
          
          {/* Generate Answer Button (for generated questions without answers) */}
          {showGenerateAnswerButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerateAnswer}
              disabled={isGeneratingAnswer}
              className="bg-blue-50 hover:bg-blue-100 border-blue-300"
            >
              {isGeneratingAnswer ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Generate Answer
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant={question.verified ? "default" : "outline"}
            onClick={onVerify}
            className={question.verified ? "bg-emerald-600 hover:bg-emerald-700" : ""}
          >
            {question.verified ? (
              <>
                <ShieldCheck className="w-4 h-4 mr-1" />
                Unverify
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-1" />
                Verify
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={onEdit}
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

