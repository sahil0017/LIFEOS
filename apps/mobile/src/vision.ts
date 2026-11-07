export interface VisionCapture {
  id: string;
  imageUri: string | null;
  question: string;
  answer: string | null;
  createdAt: string;
}
