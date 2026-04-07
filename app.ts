// app.ts
App<IAppOption>({
  onLaunch() {
    console.log('SoloMind Mini Program launched');
  },

  globalData: {
    userEmail: null as string | null,
    isLoggedIn: false
  }
})

interface IAppOption {
  globalData: {
    userEmail: string | null;
    isLoggedIn: boolean;
  };
}
