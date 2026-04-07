import { MoodType } from '../../constants/mood';

Component({
  properties: {
    mood: {
      type: Object as () => MoodType,
      value: {} as MoodType
    },
    selected: {
      type: Boolean,
      value: false
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('onpress');
    }
  }
});
