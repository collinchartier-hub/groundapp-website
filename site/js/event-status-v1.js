/* Owner-maintained event record. No date has been confirmed for this preview.
   Change state to waiting/live/ended only when the host confirms it. No daily clock guesses. */
(function () {
  var event = { state: 'unscheduled', startsAt: null, endsAt: null };
  var title = document.getElementById('eventStatus');
  var detail = document.getElementById('eventDetail');
  if (!title || !detail) return;
  var states = {
    unscheduled: ['No event time is posted here', "Check the host's invitation for the date, time and joining link."],
    waiting: ['The room is waiting', "Use the joining details in the host's invitation. This page does not join a call."],
    live: ['The host has marked the event live', "Join through the host's invitation, not through this waiting-room page."],
    ended: ['This event has ended', 'Thank you for being here. Ask the host about any recording or future session.']
  };
  function render() {
    var state = event.state;
    var start = event.startsAt && Date.parse(event.startsAt);
    var end = event.endsAt && Date.parse(event.endsAt);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      state = Date.now() < start ? 'waiting' : Date.now() < end ? 'live' : 'ended';
    }
    var text = states[state] || states.unscheduled;
    title.textContent = text[0];
    detail.textContent = text[1];
    if (state === 'waiting' && Number.isFinite(start)) {
      detail.textContent += ' Scheduled: ' + new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(start)) + ' (your local time).';
    }
  }
  render();
  setInterval(render, 30000);
})();
