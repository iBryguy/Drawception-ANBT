import { globals } from '../../globals'
import { lock } from '../anbt/lock'
import { ID } from '../idSelector'
import { updateTimer } from '../updateTimer'
import { exitToSandbox } from './exitToSandbox'
import { getParametersFromPlay } from './getParametersFromPlay'

export function timerCallback(seconds) {
  const { gameInfo } = window
  if (seconds < 1) {
    document.title = "[TIME'S UP!] Playing Drawception"
    if (gameInfo.image || window.timesUp) {
      // If pressed submit before timer expired, let it process or retry in case of error
      if (!window.submitting) {
        if (gameInfo.image) {
          getParametersFromPlay()
        } else {
          // Allow to save the drawing after time's up
          exitToSandbox()
        }
      }
    } else {
      ID('newcanvasyo').classList.add('locked')
      lock()
      globals.timerStart += 15000 // 15 seconds to submit
      updateTimer()
      window.timesUp = true
    }
  } else {
    document.title = `[${`0${Math.floor(seconds / 60)}`.slice(
      -2
    )}:${`0${Math.floor(seconds % 60)}`.slice(-2)}] Playing Drawception`
  }
  if (
    window.alarm &&
    !window.playedWarningSound &&
    seconds <= (gameInfo.blitz ? 5 : 61) &&
    seconds > 0
  ) {
    window.alarm.play()
    window.playedWarningSound = true
  }
}
