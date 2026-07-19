export class IntegrationPipeline {
  constructor(state) {
    this.state = state;
    this.state.events ||= {};
  }

  execute(action, input) {
    const eventId = String(input.eventId || "evt_sample").slice(0, 80);
    if (!/^evt_[a-z0-9_-]+$/i.test(eventId)) {
      throw new Error("Invalid event identifier");
    }

    if (action === "process" && this.state.events[eventId]) {
      return {
        id: eventId,
        status: "duplicate",
        idempotent: true,
        effectApplied: false
      };
    }

    const previous = this.state.events[eventId];
    const result = {
      id: eventId,
      status: "processed",
      idempotent: true,
      effectApplied: action === "process" ? !previous : false,
      action,
      attempts: (previous?.attempts || 0) + 1
    };
    this.state.events[eventId] = result;
    return result;
  }
}
