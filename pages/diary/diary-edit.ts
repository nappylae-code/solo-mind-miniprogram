import { saveDiaryToCloud, loadDiaryFromCloud, CloudDiaryEntry } from '../../utils/cloudDB';
import { getUserId } from '../../utils/encryption';
import { MOODS, getMoodByKey, MoodType } from '../../constants/mood';
import { isMember, MEMBERSHIP } from '../../constants/membership';

declare const wx: any;

Page({
  data: {
    date: '',
    isNew: true,
    content: '',
    charCount: 0,
    contentLimit: MEMBERSHIP.DIARY_CONTENT_LIMIT_FREE,
    saving: false,
    MOODS: [] as MoodType[],
    selectedMoodKey: '',
    selectedMoodObj: null as MoodType | null,
  },

  onLoad(options: { date?: string; isNew?: string }) {
    const date = options.date || '';
    const isNew = options.isNew !== 'false';
    const member = isMember();

    this.setData({
      date,
      isNew,
      MOODS,
      contentLimit: member
        ? MEMBERSHIP.DIARY_CONTENT_LIMIT_MEMBER
        : MEMBERSHIP.DIARY_CONTENT_LIMIT_FREE,
    });

    wx.setNavigationBarTitle({ title: isNew ? '新建日记' : '编辑日记' });
    this.loadExistingEntry(date);
  },

  async loadExistingEntry(date: string) {
    const userId = getUserId();
    if (!userId) return;

    try {
      const entries = await loadDiaryFromCloud(userId);
      const entry = entries[date];
      if (entry) {
        const mood = getMoodByKey(entry.moodKey || '');
        this.setData({
          content: entry.content || '',
          charCount: (entry.content || '').length,
          selectedMoodKey: entry.moodKey || '',
          selectedMoodObj: mood || null,
        });
      }
    } catch (e) {
      // 静默失败
    }
  },

  onMoodSelect(e: WechatMiniprogram.TouchEvent) {
    const key = (e.currentTarget.dataset as { key: string }).key;
    const mood = getMoodByKey(key);
    this.setData({
      selectedMoodKey: key,
      selectedMoodObj: mood || null,
    });
  },

  onContentInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value;
    const { contentLimit } = this.data;
    if (value.length > contentLimit) {
      this.setData({ content: value.slice(0, contentLimit), charCount: contentLimit });
      wx.showToast({ title: `最多${contentLimit}字`, icon: 'none' });
      return;
    }
    this.setData({ content: value, charCount: value.length });
  },

  async onSave() {
    const { date, content, saving, selectedMoodKey } = this.data;
    if (saving) return;

    if (!content.trim()) {
      wx.showToast({ title: '请写点什么再保存', icon: 'none' });
      return;
    }

    const userId = getUserId();
    if (!userId) return;

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      const success = await saveDiaryToCloud({
        userId,
        date,
        content: content.trim(),
        moodKey: selectedMoodKey,
        timestamp: Date.now(),
      } as CloudDiaryEntry);

      wx.hideLoading();

      if (success) {
        wx.showToast({ title: '已保存 ✓', icon: 'none', duration: 1500 });

        // ✅ 方案B：通过 EventChannel 把最新数据传回 detail 页
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2]; // detail 页
        if (prevPage) {
          const mood = getMoodByKey(selectedMoodKey);
          prevPage.setData({
            content: content.trim(),
            moodEmoji: mood ? mood.emoji : '📝',
            moodLabel: mood ? mood.label : '',
            moodColor: mood ? mood.color : '#9E9E9E',
          });
        }

        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        this.setData({ saving: false });
        wx.showModal({
          title: '保存失败',
          content: '请检查网络后重试',
          showCancel: false,
          confirmText: '确定',
        });
      }
    } catch (e) {
      wx.hideLoading();
      this.setData({ saving: false });
      wx.showModal({
        title: '保存失败',
        content: '请检查网络后重试',
        showCancel: false,
        confirmText: '确定',
      });
    }
  },
});