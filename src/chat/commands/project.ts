import { OnCommandEvent, OnSayEvent } from '../../types'
import { BotEvents } from '../../botEvents'
import { ShouldThrottle } from '../../shouldThrottle'
import { EventBus } from '../../events'

let projectValue = "We're doing that voodoo that we do. Like and subscribe!"

/**
 * Sends a message to chat with details about the project we're working on or
 * sets the value of the project we're working on.
 * @param onCommandEvent 
 */
export function project(onCommandEvent: OnCommandEvent): void {

  const cooldownSeconds = 300

  // The broadcaster is allowed to bypass throttling. Otherwise,
  // only proceed if the command hasn't been used within the cooldown.
  if (!onCommandEvent.flags.broadcaster &&
    ShouldThrottle(onCommandEvent.extra.sinceLastCommand, cooldownSeconds, true)) {
    return
  }

  const incomingMessage = onCommandEvent.message

  const message = incomingMessage.trim()

  if (message.length > 0 && (
    onCommandEvent.flags.broadcaster || onCommandEvent.flags.mod
  )) {
    // Set the project value
    projectValue = message
  }
  else {
    // Send the message to Twitch chat
    EventBus.eventEmitter.emit(BotEvents.OnSay, new OnSayEvent(projectValue))
  }
 
}