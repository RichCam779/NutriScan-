import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SourceDocument {
  source: string;
  page: number | null;
  content_preview: string;
}

export interface AnswerResponse {
  question: string;
  answer: string;
  sources: SourceDocument[];
  processing_time_seconds: number;
}

@Injectable({
  providedIn: 'root'
})
export class RagService {
  private apiUrl = 'https://nutriscan-production-fea8.up.railway.app/ask';

  constructor(private http: HttpClient) {}

  askQuestion(question: string): Observable<AnswerResponse> {
    return this.http.post<AnswerResponse>(this.apiUrl, { question });
  }
}
