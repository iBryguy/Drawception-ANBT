export function onCaptionSuccess(title) {
  const { options, gameInfo } = window
  if (!options.bookmarkOwnCaptions) return
  const games = window.getLocalStorageItem('gpe_gameBookmarks', {})
  games[gameInfo.gameId] = {
    time: Date.now(),
    caption: `"${title}"`,
    own: true
  }
  localStorage.setItem('gpe_gameBookmarks', JSON.stringify(games))
}


