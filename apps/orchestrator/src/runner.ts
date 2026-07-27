/**
 * The run driver.
 *
 * Opens a session's event stream, answers the coordinator's `run_gate` calls
 * host-side, and advances the run state machine as the session progresses.
 *
 * Gates run here rather than inside the sandbox on purpose. A gate the agent
 * could edit is not a gate — keeping the validator in our process means the
 * check that decides whether a stage is complete cannot be reasoned around by
 * the thing being checked.
 */
import { isStage, runGate, type Artifacts, type GateResult, type Stage } from '@power/gates';
import {
  apply,
  canDeploy,
  isTerminal,
  PowerClient,
  type RunState,
  type SessionEvent,
} from '@power/core';

const GATE_ARTIFACTS = ['research.json', 'SPEC.md', 'verification.json'] as const;

export interface RunnerOptions {
  client: PowerClient;
  sessionId: string;
  memoryStoreId: string;
  initialState: RunState;
  /** Called after every state change so the caller can persist it. */
  onState?: (state: RunState) => void | Promise<void>;
  /** Human-readable progress, one line per meaningful event. */
  onLog?: (line: string) => void;
  /** Safety valve so a pathological run cannot stream forever. */
  maxEvents?: number;
}

export interface RunOutcome {
  state: RunState;
  gateResults: GateResult[];
  eventsSeen: number;
  /** Why the loop stopped: the session settled, or we hit the event ceiling. */
  stoppedBecause: 'session_idle' | 'session_terminated' | 'event_limit' | 'terminal_state';
}

interface CustomToolUseEvent extends SessionEvent {
  name?: string;
  input?: { stage?: string };
  session_thread_id?: string;
}

interface IdleEvent extends SessionEvent {
  stop_reason?: { type?: string };
}

/** Narrow a memory-store snapshot to the artifacts the gate layer understands. */
function toArtifacts(memories: Map<string, string>): Artifacts {
  const artifacts: Artifacts = {};
  for (const name of GATE_ARTIFACTS) {
    const content = memories.get(name);
    if (content !== undefined) artifacts[name] = content;
  }
  return artifacts;
}

export class Runner {
  private readonly gateResults: GateResult[] = [];
  private state: RunState;

  constructor(private readonly options: RunnerOptions) {
    this.state = options.initialState;
  }

  private log(line: string): void {
    this.options.onLog?.(line);
  }

  private async setState(next: RunState): Promise<void> {
    this.state = next;
    await this.options.onState?.(next);
  }

  /**
   * Evaluate a gate against the current contents of the memory store and return
   * the payload to hand back to the agent. The agent gets the full error list,
   * because a gate error that does not say exactly what to fix costs a whole
   * round trip.
   */
  private async evaluateGate(stage: Stage): Promise<GateResult> {
    const memories = await this.options.client.readMemoryStore(this.options.memoryStoreId);
    const result = runGate(stage, toArtifacts(memories));

    this.gateResults.push(result);
    await this.setState(apply(this.state, { type: 'gate_result', stage, result }));

    this.log(
      result.pass
        ? `gate ${stage}: pass`
        : `gate ${stage}: fail (${result.errors.length}) — ` +
            result.errors.map((e) => `${e.field}/${e.rule}`).join(', '),
    );

    return result;
  }

  private async handleGateCall(event: CustomToolUseEvent): Promise<void> {
    const requested = event.input?.stage;

    const body = isStage(requested)
      ? await this.evaluateGate(requested)
      : {
          pass: false,
          errors: [
            {
              artifact: '(request)',
              field: 'stage',
              rule: 'gate.unknown_stage',
              detail:
                `Unknown stage "${String(requested)}". ` +
                `Valid stages: research, spec, verification.`,
            },
          ],
        };

    await this.options.client.sendEvents(this.options.sessionId, [
      {
        type: 'user.custom_tool_result',
        custom_tool_use_id: event.id,
        ...(event.session_thread_id ? { session_thread_id: event.session_thread_id } : {}),
        content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
      },
    ]);
  }

  /**
   * Drive the session to a settled state.
   *
   * Idle is not by itself terminal — a session idles between parallel tool calls
   * and whenever it is waiting on us. The loop exits on a terminal `stop_reason`,
   * on termination, or on the event ceiling.
   */
  async run(): Promise<RunOutcome> {
    const maxEvents = this.options.maxEvents ?? 10_000;
    let eventsSeen = 0;
    let stoppedBecause: RunOutcome['stoppedBecause'] = 'event_limit';

    for await (const event of this.options.client.streamEvents(this.options.sessionId)) {
      eventsSeen++;

      switch (event.type) {
        case 'agent.custom_tool_use': {
          const call = event as CustomToolUseEvent;
          if (call.name === 'run_gate') {
            await this.handleGateCall(call);
          } else {
            this.log(`unhandled custom tool: ${String(call.name)}`);
            await this.options.client.sendEvents(this.options.sessionId, [
              {
                type: 'user.custom_tool_result',
                custom_tool_use_id: call.id,
                is_error: true,
                content: [
                  { type: 'text', text: `No handler registered for tool "${String(call.name)}".` },
                ],
              },
            ]);
          }
          break;
        }

        case 'session.thread_created':
          this.log(`thread started: ${String(event['agent_name'] ?? 'unknown')}`);
          break;

        case 'agent.thread_message_sent':
          this.log(`delegated to ${String(event['to_agent_name'] ?? 'a specialist')}`);
          break;

        case 'span.outcome_evaluation_end':
          this.log(
            `outcome iteration ${String(event['iteration'])}: ${String(event['result'])}`,
          );
          break;

        case 'session.error':
          this.log(`session error: ${JSON.stringify(event['error'])}`);
          break;

        case 'session.status_terminated':
          stoppedBecause = 'session_terminated';
          break;

        case 'session.status_idle': {
          const reason = (event as IdleEvent).stop_reason?.type;
          if (reason === 'requires_action') break; // waiting on us; keep going
          stoppedBecause = 'session_idle';
          break;
        }

        default:
          break;
      }

      if (stoppedBecause !== 'event_limit') break;
      if (isTerminal(this.state)) {
        stoppedBecause = 'terminal_state';
        break;
      }
      if (eventsSeen >= maxEvents) break;
    }

    const deploy = canDeploy(this.state);
    if (!deploy.allowed) {
      this.log(`deploy withheld: ${deploy.missing.join('; ')}`);
    }

    return {
      state: this.state,
      gateResults: this.gateResults,
      eventsSeen,
      stoppedBecause,
    };
  }
}
