import { useOptionalApp } from '../context/AppContext.jsx'
import { isRecognitionSupported } from '../core/speechRecognition.js'

// Speaking practice is offered only when the browser can listen and the profile has not switched it off.
export function useMic() {
  const currentProfile = useOptionalApp()?.currentProfile
  return isRecognitionSupported() && currentProfile?.micEnabled !== false
}
