export interface MoodType {
  key: string;
  emoji: string;
  label: string;
  description: string;
  color: string;
  image: string;  // ✅ 新增
}

export const MOODS: MoodType[] = [
  { key: 'GREAT', emoji: '😄', label: '极好', description: '心情极好', color: '#4CAF50', image: '/assets/moods/great.png' },
  { key: 'HAPPY', emoji: '🙂', label: '开心', description: '心情不错', color: '#8BC34A', image: '/assets/moods/happy.png' },
  { key: 'CALM', emoji: '😌', label: '平静', description: '平静安稳', color: '#2196F3', image: '/assets/moods/calm.png' },
  { key: 'SAD',   emoji: '😢', label: '难过', description: '心情难过', color: '#F44336', image: '/assets/moods/sad.png'   },
  { key: 'ANGRY', emoji: '😠', label: '生气', description: '感到愤怒', color: '#E91E63', image: '/assets/moods/angry.png' },
];

export function getMoodByKey(key: string): MoodType | undefined {
  return MOODS.find((m) => m.key === key);
}