import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RagService, SourceDocument, AnswerResponse } from '../../../core/services/rag.service';

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: Date;
  sources?: SourceDocument[];
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.css']
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('chatBody') private chatBodyContainer!: ElementRef;

  isOpen = false;
  userMessage = '';
  loading = false;
  messages: ChatMessage[] = [
    {
      sender: 'bot',
      text: '¡Hola! Soy el asistente inteligente de NutriScan 🥑. ¿En qué te puedo ayudar hoy? Puedes preguntarme sobre nutrición, biotipos o la arquitectura técnica del sistema.',
      time: new Date()
    }
  ];

  constructor(private ragService: RagService) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 50);
    }
  }

  sendMessage(): void {
    if (!this.userMessage.trim() || this.loading) return;

    const messageText = this.userMessage.trim();
    this.messages.push({
      sender: 'user',
      text: messageText,
      time: new Date()
    });

    this.userMessage = '';
    this.loading = true;
    this.scrollToBottom();

    this.ragService.askQuestion(messageText).subscribe({
      next: (response: AnswerResponse) => {
        this.messages.push({
          sender: 'bot',
          text: response.answer,
          time: new Date(),
          sources: response.sources
        });
        this.loading = false;
        this.scrollToBottom();
      },
      error: (err: any) => {
        console.error('Error al consultar RAG:', err);
        this.messages.push({
          sender: 'bot',
          text: 'Lo siento, ocurrió un error al conectarse con el servidor de NutriScan RAG. Asegúrate de que el servidor esté encendido.',
          time: new Date()
        });
        this.loading = false;
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.chatBodyContainer) {
        this.chatBodyContainer.nativeElement.scrollTop = this.chatBodyContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      // Ignorar errores de scroll
    }
  }
}
