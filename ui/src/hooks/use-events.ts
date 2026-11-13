import { Flashcard, QuizQuestion } from '@/lib/types';
import mitt from 'mitt';

type Events = {
  'session:init': string; // userId
  'core:explain': string; // text to explain
  'core:create-flashcard': string; // text to create flashcard
  'core:create-question': string; // text to create question
  'core:selection-change': string; // page key
  'core:new-flashcard': Flashcard; // new flashcard
  'core:new-flashcard-deck': any; // new flashcard deck
  'core:new-quiz': QuizQuestion; // new quiz
  'core:tab-selected': string; // tab selected
  // Add more events here as needed
  // 'session:end': void;
  // 'session:error': Error;
};

// Create a singleton emitter instance
const mittEmitter = mitt<Events>();

// Export the emitter methods directly
export const emitter = {
  emit: mittEmitter.emit.bind(mittEmitter),
  on: mittEmitter.on.bind(mittEmitter),
  off: mittEmitter.off.bind(mittEmitter),
}; 

