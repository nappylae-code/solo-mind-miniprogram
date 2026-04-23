import { saveDiaryToCloud, loadDiaryFromCloud, CloudDiaryEntry, saveMoodToCloud, loadMoodFromCache } from '../../utils/cloudDB';
import { getOpenId } from '../../utils/encryption';
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

    // ✅ 新增：当天是否已在 mood 页面打卡
    alreadyCheckedIn: false,
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
    const userId = getOpenId();
    if (!userId) return;

    // ✅ 第一步：检查当天是否已在 mood 页面打卡（读缓存，快速）
    const moodCache = loadMoodFromCache();
    const moodEntry = moodCache ? moodCache[date] : null;
    const alreadyCheckedIn = !!moodEntry;

    this.setData({ alreadyCheckedIn });

    // ✅ 第二步：加载已有日记内容
    try {
      const entries = await loadDiaryFromCloud(userId);
      const entry = entries[date];
      if (entry) {
        this.setData({
          content: entry.content || '',
          charCount: (entry.content || '').length,
        });
      }
    } catch (e) {
      // 静默失败
    }

    // ✅ 第三步：如果未打卡，不预填心情（让用户自己选）
    // 如果已打卡，心情选择器已隐藏，无需处理
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
    const { date, content, saving, selectedMoodKey, alreadyCheckedIn } = this.data;
    if (saving) return;

    if (!content.trim()) {
      wx.showToast({ title: '请写点什么再保存', icon: 'none' });
      return;
    }

    // ✅ 未打卡时，心情为必填
    if (!alreadyCheckedIn && !selectedMoodKey) {
      wx.showModal({
        title: '提示',
        content: '请先选择今天的心情',
        showCancel: false,
        confirmText: '确定',
      });
      return;
    }

    const userId = getOpenId();
    if (!userId) return;

    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });

    try {
      // ✅ 第一步：保存日记内容（不再存 moodKey 到 diaryEntries）
      const diarySuccess = await saveDiaryToCloud({
        userId,
        date,
        content: content.trim(),
        timestamp: Date.now(),
      } as CloudDiaryEntry);

      // ✅ 第二步：未打卡时，同时将心情存入 moodEntries
      if (!alreadyCheckedIn && selectedMoodKey) {
        await saveMoodToCloud({
          userId,
          date,
          moodKey: selectedMoodKey,
          note: '',
          timestamp: Date.now(),
        });
      }

      wx.hideLoading();

      if (diarySuccess) {
        wx.showToast({ title: '已保存 ✓', icon: 'none', duration: 1500 });

        // 回传数据给上一页（diary-detail）
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage) {
          prevPage.setData({
            content: content.trim(),
            // ✅ 心情相关字段不再从日记传回，detail 页自行从 moodEntries 读取
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