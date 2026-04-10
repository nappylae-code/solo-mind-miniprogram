import { loadDiaryFromCloud, deleteDiaryFromCloud } from '../../utils/cloudDB';
import { getUserId } from '../../utils/encryption';
import { getMoodByKey } from '../../constants/mood';

declare const wx: any;

function formatDetailDate(dateKey: string, timestamp: number): string {
  const parts = dateKey.split('-');
  const d = new Date(timestamp);
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日 ${days[d.getDay()]} ${hours}:${mins}`;
}

Page({
  data: {
    date: '',
    displayDate: '',
    content: '',
    moodLabel: '',
    moodColor: '',
    timestamp: 0,
    loading: true,
    moodImage: '',
  },

  onLoad(options: { date?: string }) {
    const date = options.date || '';
    this.setData({ date });
    wx.setNavigationBarTitle({ title: date.slice(5).replace('-', '月') + '日' });
    this.loadEntry(date);
  },

  async loadEntry(date: string) {
    const userId = getUserId();
    if (!userId) return;

    wx.showLoading({ title: '加载中...' });
    try {
      const entries = await loadDiaryFromCloud(userId);
      const entry = entries[date];
      if (!entry) {
        wx.showToast({ title: '日记不存在', icon: 'none' });
        wx.navigateBack();
        return;
      }

      const mood = getMoodByKey(entry.moodKey || '');
      this.setData({
        displayDate: formatDetailDate(date, entry.timestamp),
        content: entry.content || '',
        moodImage: mood ? mood.image : '',
        moodLabel: mood ? mood.label : '',
        moodColor: mood ? mood.color : '#9E9E9E',
        timestamp: entry.timestamp,
        loading: false,
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 跳转编辑
  onEdit() {
    wx.navigateTo({
      url: `/pages/diary/diary-edit?date=${this.data.date}&isNew=false`,
    });
  },

  // 删除
  onDelete() {
    wx.showModal({
      title: '删除日记',
      content: '确定要删除这篇日记吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#F44336',
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        const userId = getUserId();
        if (!userId) return;

        wx.showLoading({ title: '删除中...' });
        try {
          await deleteDiaryFromCloud(userId, this.data.date);
          wx.hideLoading();
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1000);
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  },
});