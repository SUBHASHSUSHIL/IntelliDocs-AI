export interface ChatRequest {
  question: string;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
}
