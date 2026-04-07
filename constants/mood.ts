export interface MoodType {
  key: string;
  emoji: string;
  label: string;
  description: string;
  color: string;
}

export const MOODS: MoodType[] = [
  { key: 'GREAT', emoji: '😃', label: '太棒了', description: '心情非常好', color: '#4CAF50' },
  { key: 'HAPPY', emoji: '😊', label: '开心', description: '心情不错', color: '#8BC34A' },
  { key: 'CALM', emoji: '😌', label: '平静', description: '平和放松', color: '#2196F3' },
  { key: 'SAD', emoji: '😞', label: '难过', description: '心情低落', color: '#F44336' },
  { key: 'ANGRY', emoji: '😡', label: '生气', description: '烦躁或愤怒', color: '#E91E63' },
];

export function getMoodByKey(key: string): MoodType | undefined {
  return MOODS.find((m) => m.key === key);
}
